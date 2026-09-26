begin;


-- ============================================================
-- 009F
-- CLASSROOM DESIRED STATE + SAFE RECONCILIATION
--
-- Goals:
--   1. Use configured operational-calendar dates for students.
--   2. Allow flexible Classroom grouping within a course/year.
--   3. Preserve desired vs observed roster architecture.
--   4. Revalidate queued roster actions before Google executes.
--   5. Never change observed state merely because an operation
--      failed.
-- ============================================================


-- ============================================================
-- 1. REMOVE ONE-CLASSROOM-GROUP-PER-COURSE/YEAR RESTRICTION
--
-- Multiple offerings may intentionally share one classroom_group.
-- A course/year may also have multiple classroom_groups.
-- ============================================================

alter table public.classroom_groups
drop constraint if exists classroom_group_course_year_unique;


-- Keep a normal lookup index now that the unique constraint is gone.

create index if not exists classroom_groups_course_year_idx
  on public.classroom_groups (
    course_id,
    school_year_id
  );


-- ============================================================
-- 2. UPDATE LEGACY CLASSROOM ROSTER DATE HELPER
--
-- Preserve the existing function signature for compatibility,
-- but stop deriving the date from starts_on - N days.
--
-- p_days_before remains only so existing callers do not break.
-- The configured operational calendar is now authoritative.
-- ============================================================

create or replace function public.classroom_student_roster_opens_at(
  p_class_offering_id uuid,
  p_days_before integer default 7
)
returns timestamptz
language sql
stable
set search_path = public
as $function$

  select
    (
      public.get_classroom_provisioning_date(
        co.school_year_id,
        co.program,
        co.offering_period
      )::timestamp
      at time zone 'America/New_York'
    )

  from public.class_offerings co

  where co.id = p_class_offering_id;

$function$;


comment on function public.classroom_student_roster_opens_at(
  uuid,
  integer
) is
'Returns the admin-configured Classroom student provisioning date for an offering. p_days_before is retained only for backwards compatibility and is no longer used.';


-- ============================================================
-- 3. DESIRED CLASSROOM STUDENTS
--
-- A student becomes desired only when:
--
--   - enrollment is active
--   - offering has a Classroom group
--   - offering itself is active
--   - Google Classroom has been provisioned/mapped
--   - student has an active Workspace account
--   - enrollment is financially cleared
--   - configured Classroom provisioning date has arrived
--   - Classroom synchronization is enabled
--
-- This replaces the old starts_on - N days calculation.
-- ============================================================

create or replace view public.desired_classroom_students
as

select distinct
  co.classroom_group_id,
  e.student_person_id as person_id,
  'student'::text as role

from public.enrollments e

join public.class_offerings co
  on co.id =
     e.class_offering_id

join public.google_classrooms gc
  on gc.classroom_group_id =
     co.classroom_group_id

join public.workspace_accounts wa
  on wa.person_id =
     e.student_person_id

left join public.google_sync_settings gss
  on gss.school_year_id =
     co.school_year_id

where e.status =
      'enrolled'

  and co.classroom_group_id is not null

  and co.status not in (
    'cancelled',
    'archived'
  )

  and wa.workspace_status =
      'active'

  and public.is_enrollment_financially_cleared(
        e.id
      ) = true

  and public.classroom_period_is_ready(
        co.school_year_id,
        co.program,
        co.offering_period,
        current_date
      ) = true

  and coalesce(
        gss.classroom_sync_enabled,
        true
      ) = true;


-- ============================================================
-- 4. DESIRED CLASSROOM TEACHERS
--
-- Preserve the existing instructor-derived teachers for now.
--
-- Organizational teacher accounts such as:
--
--   Youth  -> lutools@latterup.org
--   Junior -> juniors@latterup.org
--
-- should NOT be faked into people/person_id rows here.
--
-- Those are Google operational accounts and will be modeled
-- explicitly in the provisioning/integration layer.
-- ============================================================

create or replace view public.desired_classroom_teachers
as

select distinct
  co.classroom_group_id,
  ci.person_id,
  'teacher'::text as role

from public.class_instructors ci

join public.class_offerings co
  on co.id =
     ci.class_offering_id

join public.google_classrooms gc
  on gc.classroom_group_id =
     co.classroom_group_id

where co.classroom_group_id is not null

  and ci.role in (
    'primary_teacher',
    'co_teacher',
    'assistant'
  )

  and co.status not in (
    'cancelled',
    'archived'
  );


-- ============================================================
-- 5. DESIRED MEMBERSHIPS
-- ============================================================

create or replace view public.desired_classroom_memberships
as

select
  classroom_group_id,
  person_id,
  role

from public.desired_classroom_teachers

union

select
  classroom_group_id,
  person_id,
  role

from public.desired_classroom_students;


-- ============================================================
-- 6. SYNC PLAN
--
-- Preserve the desired-vs-observed model.
-- ============================================================

create or replace view public.classroom_membership_sync_plan
as

with desired as (

  select
    dcm.classroom_group_id,
    dcm.person_id,
    dcm.role,
    true as desired_present

  from public.desired_classroom_memberships dcm

),

actual as (

  select
    cms.classroom_group_id,
    cms.person_id,
    cms.role,
    cms.actual_present

  from public.classroom_membership_sync_state cms

)

select

  coalesce(
    d.classroom_group_id,
    a.classroom_group_id
  ) as classroom_group_id,

  coalesce(
    d.person_id,
    a.person_id
  ) as person_id,

  coalesce(
    d.role,
    a.role
  ) as role,

  coalesce(
    d.desired_present,
    false
  ) as desired_present,

  coalesce(
    a.actual_present,
    false
  ) as actual_present,

  case

    when coalesce(
           d.desired_present,
           false
         ) =
         coalesce(
           a.actual_present,
           false
         )
      then 'none'::text

    when coalesce(
           d.desired_present,
           false
         )
      then 'add'::text

    else 'remove'::text

  end as required_action

from desired d

full join actual a

  on a.classroom_group_id =
     d.classroom_group_id

 and a.person_id =
     d.person_id

 and a.role =
     d.role;


-- ============================================================
-- 7. CURRENT REQUIRED ACTION HELPER
--
-- This is deliberately evaluated from CURRENT desired/actual
-- state rather than trusting a previously queued request.
-- ============================================================

create or replace function public.get_current_classroom_roster_action(
  p_classroom_group_id uuid,
  p_person_id uuid,
  p_role text
)
returns text
language sql
stable
security definer
set search_path = public
as $function$

  select coalesce(
    (
      select p.required_action

      from public.classroom_membership_sync_plan p

      where p.classroom_group_id =
            p_classroom_group_id

        and p.person_id =
            p_person_id

        and p.role =
            p_role

      limit 1
    ),
    'none'
  );

$function$;


-- ============================================================
-- 8. SAFE WORKER CLAIM
--
-- THIS is the stale-request protection.
--
-- A worker must call this BEFORE performing the Google API
-- operation.
--
-- The function locks the request, recomputes CURRENT required
-- action, and:
--
--   - returns the request if it is still valid;
--   - cancels it if it is stale.
--
-- The Google worker must execute only requests returned with
-- should_execute = true.
-- ============================================================

create or replace function public.claim_classroom_roster_sync(
  p_request_id uuid
)
returns table (
  request_id uuid,
  classroom_group_id uuid,
  person_id uuid,
  role text,
  action text,
  should_execute boolean,
  status text
)
language plpgsql
security definer
set search_path = public
as $function$

declare
  v_request public.classroom_roster_sync_requests%rowtype;
  v_required_action text;

begin

  select *
  into v_request

  from public.classroom_roster_sync_requests

  where id =
        p_request_id

  for update;


  if not found then

    raise exception
      'Classroom roster request % does not exist.',
      p_request_id;

  end if;


  -- Only pending requests can be claimed.

  if v_request.status <> 'pending' then

    return query
    select
      v_request.id,
      v_request.classroom_group_id,
      v_request.person_id,
      v_request.role,
      v_request.action,
      false,
      v_request.status;

    return;

  end if;


  v_required_action :=
    public.get_current_classroom_roster_action(
      v_request.classroom_group_id,
      v_request.person_id,
      v_request.role
    );


  -- The desired/actual state changed after this request was
  -- queued. Do not touch Google.

  if v_required_action <>
     v_request.action then

    update public.classroom_roster_sync_requests

    set
      status = 'cancelled',
      completed_at = now(),
      error_message =
        'Cancelled because current desired/observed state no longer requires this action.'

    where id =
          p_request_id;


    return query
    select
      v_request.id,
      v_request.classroom_group_id,
      v_request.person_id,
      v_request.role,
      v_request.action,
      false,
      'cancelled'::text;

    return;

  end if;


  -- Still valid. Claim it for execution.

  update public.classroom_roster_sync_requests

  set
    status = 'processing',
    processing_started_at = now(),
    error_message = null

  where id =
        p_request_id;


  return query
  select
    v_request.id,
    v_request.classroom_group_id,
    v_request.person_id,
    v_request.role,
    v_request.action,
    true,
    'processing'::text;

end;

$function$;


-- ============================================================
-- 9. SAFE COMPLETION
--
-- Completion represents a Google operation that the worker says
-- actually succeeded.
--
-- Only a PROCESSING request may be completed.
-- ============================================================

create or replace function public.complete_classroom_roster_sync(
  p_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $function$

declare
  v_request public.classroom_roster_sync_requests%rowtype;
  v_actual_present boolean;

begin

  select *
  into v_request

  from public.classroom_roster_sync_requests

  where id =
        p_request_id

  for update;


  if not found then

    raise exception
      'Classroom roster request % does not exist.',
      p_request_id;

  end if;


  if v_request.status <> 'processing' then

    raise exception
      'Classroom roster request % cannot be completed from status %.',
      p_request_id,
      v_request.status;

  end if;


  v_actual_present :=
    (v_request.action = 'add');


  insert into public.classroom_membership_sync_state (
    classroom_group_id,
    person_id,
    role,
    actual_present,
    sync_status,
    last_checked_at,
    last_synced_at,
    error_message
  )

  values (
    v_request.classroom_group_id,
    v_request.person_id,
    v_request.role,
    v_actual_present,
    'synced',
    now(),
    now(),
    null
  )

  on conflict (
    classroom_group_id,
    person_id,
    role
  )

  do update set

    actual_present =
      excluded.actual_present,

    sync_status =
      'synced',

    last_checked_at =
      now(),

    last_synced_at =
      now(),

    error_message =
      null;


  update public.classroom_roster_sync_requests

  set
    status = 'completed',
    completed_at = now(),
    error_message = null

  where id =
        p_request_id;

end;

$function$;


-- ============================================================
-- 10. SAFE FAILURE
--
-- A failed Google operation tells us that synchronization failed.
--
-- It does NOT tell us that the member is absent or present.
-- Therefore existing observed state is preserved.
--
-- If no observed-state row exists yet, create one as pending/
-- unknown-ish false state, but importantly do not overwrite an
-- existing actual_present value.
-- ============================================================

create or replace function public.fail_classroom_roster_sync(
  p_request_id uuid,
  p_error_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $function$

declare
  v_request public.classroom_roster_sync_requests%rowtype;

begin

  select *
  into v_request

  from public.classroom_roster_sync_requests

  where id =
        p_request_id

  for update;


  if not found then

    raise exception
      'Classroom roster request % does not exist.',
      p_request_id;

  end if;


  if v_request.status <> 'processing' then

    raise exception
      'Classroom roster request % cannot fail from status %.',
      p_request_id,
      v_request.status;

  end if;


  update public.classroom_roster_sync_requests

  set
    status = 'error',
    attempts = attempts + 1,
    completed_at = now(),
    error_message =
      p_error_message

  where id =
        p_request_id;


  insert into public.classroom_membership_sync_state (
    classroom_group_id,
    person_id,
    role,
    actual_present,
    sync_status,
    last_checked_at,
    error_message
  )

  values (
    v_request.classroom_group_id,
    v_request.person_id,
    v_request.role,
    false,
    'error',
    now(),
    p_error_message
  )

  on conflict (
    classroom_group_id,
    person_id,
    role
  )

  do update set

    -- Deliberately preserve actual_present.

    sync_status =
      'error',

    last_checked_at =
      now(),

    error_message =
      excluded.error_message;

end;

$function$;


-- ============================================================
-- 11. QUEUE CURRENT RECONCILIATION
--
-- Preserve existing behavior. The partial unique index already
-- prevents duplicate active requests for the same action.
--
-- Safety no longer depends on the queue remaining current:
-- claim_classroom_roster_sync() revalidates it before execution.
-- ============================================================

create or replace function public.queue_classroom_reconciliation()
returns integer
language plpgsql
security definer
set search_path = public
as $function$

declare
  v_row record;
  v_count integer := 0;

begin

  for v_row in

    select *
    from public.classroom_membership_sync_plan

    where required_action in (
      'add',
      'remove'
    )

  loop

    insert into public.classroom_roster_sync_requests (
      classroom_group_id,
      person_id,
      role,
      action,
      status
    )

    values (
      v_row.classroom_group_id,
      v_row.person_id,
      v_row.role,
      v_row.required_action,
      'pending'
    )

    on conflict do nothing;


    if found then
      v_count := v_count + 1;
    end if;

  end loop;


  return v_count;

end;

$function$;


-- ============================================================
-- 12. PERMISSIONS
--
-- Queue/claim/complete/fail are backend integration operations.
-- Ordinary authenticated browser sessions should not execute
-- them directly.
-- ============================================================

revoke all
on function public.get_current_classroom_roster_action(
  uuid,
  uuid,
  text
)
from public, anon, authenticated;


revoke all
on function public.claim_classroom_roster_sync(
  uuid
)
from public, anon, authenticated;


revoke all
on function public.complete_classroom_roster_sync(
  uuid
)
from public, anon, authenticated;


revoke all
on function public.fail_classroom_roster_sync(
  uuid,
  text
)
from public, anon, authenticated;


revoke all
on function public.queue_classroom_reconciliation()
from public, anon, authenticated;


grant execute
on function public.get_current_classroom_roster_action(
  uuid,
  uuid,
  text
)
to service_role;


grant execute
on function public.claim_classroom_roster_sync(
  uuid
)
to service_role;


grant execute
on function public.complete_classroom_roster_sync(
  uuid
)
to service_role;


grant execute
on function public.fail_classroom_roster_sync(
  uuid,
  text
)
to service_role;


grant execute
on function public.queue_classroom_reconciliation()
to service_role;


-- ============================================================
-- 13. DOCUMENTATION
-- ============================================================

comment on function public.claim_classroom_roster_sync(uuid) is
'Claims a pending Classroom roster request only if its queued action still matches the current desired-vs-observed reconciliation action. Stale requests are cancelled and must not be sent to Google.';


comment on function public.fail_classroom_roster_sync(uuid, text) is
'Records a failed Google Classroom roster operation without changing previously observed actual membership state.';


commit;