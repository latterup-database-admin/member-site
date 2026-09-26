begin;


-- ============================================================
-- 009G
-- GOOGLE CLASSROOM PROVISIONING MODEL
--
-- The system manages:
--   - Classroom shell creation
--   - Classroom naming
--   - organizational teacher account
--   - assigned teacher roster
--   - eventual student roster
--
-- Teachers manage:
--   - assignments
--   - materials
--   - announcements
--   - topics
--   - instructional content
--
-- No Classroom content/template automation is implemented here.
-- ============================================================


-- ============================================================
-- 1. SYSTEM / ORGANIZATIONAL TEACHER ACCOUNTS
--
-- These are operational Google identities, not member people.
-- ============================================================

create table if not exists
  public.classroom_system_teacher_accounts (

    id uuid primary key
      default gen_random_uuid(),

    program text not null,

    email text not null,

    is_active boolean not null
      default true,

    created_at timestamptz not null
      default now(),

    updated_at timestamptz not null
      default now(),

    constraint classroom_system_teacher_program_check
      check (
        program in (
          'junior',
          'youth'
        )
      ),

    constraint classroom_system_teacher_program_unique
      unique (program),

    constraint classroom_system_teacher_email_unique
      unique (email)
  );


create trigger
  set_classroom_system_teacher_accounts_updated_at
before update
on public.classroom_system_teacher_accounts
for each row
execute function public.set_updated_at();


alter table public.classroom_system_teacher_accounts
enable row level security;


revoke all
on public.classroom_system_teacher_accounts
from anon, authenticated;


-- Seed current organizational teacher accounts.

insert into public.classroom_system_teacher_accounts (
  program,
  email,
  is_active
)
values

  (
    'youth',
    'lutools@latterup.org',
    true
  ),

  (
    'junior',
    'juniors@latterup.org',
    true
  )

on conflict (program)

do update set
  email =
    excluded.email,

  is_active =
    excluded.is_active,

  updated_at =
    now();


-- ============================================================
-- 2. CLASSROOM GROUP DESIRED STATE
--
-- The Classroom group becomes the configuration/source-of-truth
-- record describing what Supabase WANTS Google Classroom to do.
-- ============================================================

alter table public.classroom_groups
  add column if not exists
    desired_google_state text
    not null
    default 'not_provisioned';


alter table public.classroom_groups
  add column if not exists
    provisioning_requested_at timestamptz;


alter table public.classroom_groups
  add column if not exists
    provisioning_requested_by_person_id uuid
      references public.people(id)
      on delete set null;


alter table public.classroom_groups
  drop constraint if exists
    classroom_groups_desired_google_state_check;


alter table public.classroom_groups
  add constraint
    classroom_groups_desired_google_state_check
  check (
    desired_google_state in (
      'not_provisioned',
      'active',
      'archived'
    )
  );


comment on column
  public.classroom_groups.desired_google_state
is
  'Supabase desired state for the Google Classroom represented by this Classroom group.';


-- ============================================================
-- 3. PRESERVE THE ACTUAL GOOGLE CLASSROOM NAME + SYSTEM TEACHER
--
-- Store snapshots of what was used when the actual Classroom
-- was provisioned.
-- ============================================================

alter table public.google_classrooms
  add column if not exists
    display_name text;


alter table public.google_classrooms
  add column if not exists
    system_teacher_email text;


comment on column
  public.google_classrooms.display_name
is
  'Google Classroom display name last recorded by the integration.';


comment on column
  public.google_classrooms.system_teacher_email
is
  'Organizational teacher account expected to be added when this Classroom is provisioned.';


-- ============================================================
-- 4. PROVISIONING SPEC
--
-- Gives the worker everything it needs to create the shell.
--
-- Naming rule:
--
-- classroom_groups.name wins when explicitly configured.
--
-- Otherwise:
--   Course Title — School Year
--
-- The name can therefore be explicitly controlled by Admin
-- without requiring a code change.
-- ============================================================

create or replace function
  public.get_classroom_provisioning_spec(
    p_classroom_group_id uuid
  )
returns table (

  classroom_group_id uuid,

  course_id uuid,

  school_year_id uuid,

  program text,

  classroom_name text,

  system_teacher_email text,

  desired_google_state text,

  existing_google_course_id text,

  existing_course_state text
)
language sql
stable
security definer
set search_path = public
as $function$

  select

    cg.id,

    cg.course_id,

    cg.school_year_id,

    c.program,

    coalesce(
      nullif(trim(cg.name), ''),
      c.title || ' — ' || sy.name
    ) as classroom_name,

    csta.email,

    cg.desired_google_state,

    gc.google_course_id,

    gc.course_state

  from public.classroom_groups cg

  join public.courses c
    on c.id =
       cg.course_id

  join public.school_years sy
    on sy.id =
       cg.school_year_id

  left join public.classroom_system_teacher_accounts csta
    on csta.program =
       c.program

   and csta.is_active =
       true

  left join public.google_classrooms gc
    on gc.classroom_group_id =
       cg.id

  where cg.id =
        p_classroom_group_id;

$function$;


-- ============================================================
-- 5. CURRENT REQUIRED PROVISIONING ACTION
--
-- Determine what Google operation is actually needed NOW.
--
-- This lets us protect the provisioning queue against the same
-- stale-request problem we fixed for roster synchronization.
-- ============================================================

create or replace function
  public.get_current_classroom_provisioning_action(
    p_classroom_group_id uuid
  )
returns text
language plpgsql
stable
security definer
set search_path = public
as $function$

declare

  v_spec record;

begin

  select *
  into v_spec

  from public.get_classroom_provisioning_spec(
    p_classroom_group_id
  );


  if not found then

    raise exception
      'Classroom group % does not exist.',
      p_classroom_group_id;

  end if;


  -- ----------------------------------------------------------
  -- DESIRED ACTIVE
  -- ----------------------------------------------------------

  if v_spec.desired_google_state = 'active' then

    if v_spec.existing_google_course_id is null then
      return 'create';
    end if;


    if v_spec.existing_course_state = 'ARCHIVED' then
      return 'update';
    end if;


    return 'none';

  end if;


  -- ----------------------------------------------------------
  -- DESIRED ARCHIVED
  -- ----------------------------------------------------------

  if v_spec.desired_google_state = 'archived' then

    if v_spec.existing_google_course_id is null then
      return 'none';
    end if;


    if v_spec.existing_course_state = 'ARCHIVED' then
      return 'none';
    end if;


    return 'archive';

  end if;


  -- ----------------------------------------------------------
  -- NOT PROVISIONED
  -- ----------------------------------------------------------

  return 'none';

end;

$function$;


-- ============================================================
-- 6. ACTIVE REQUEST UNIQUENESS
--
-- One active create/update/archive request per Classroom group
-- at a time.
-- ============================================================

create unique index if not exists
  classroom_provisioning_one_active_request

on public.classroom_provisioning_requests (
  classroom_group_id
)

where status in (
  'pending',
  'processing'
);


-- ============================================================
-- 7. REQUEST CLASSROOM PROVISIONING
--
-- Backend/admin-safe primitive.
--
-- This does not call Google.
--
-- It:
--   - sets desired state to active
--   - queues the currently required action
--
-- Later we'll wrap this with an authenticated Admin/teacher RPC.
-- ============================================================

create or replace function
  public.request_classroom_provisioning(
    p_classroom_group_id uuid,
    p_requested_by_person_id uuid default null
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $function$

declare

  v_action text;
  v_request_id uuid;
  v_system_teacher text;

begin

  -- Classroom must have a configured organizational teacher.

  select spec.system_teacher_email
  into v_system_teacher

  from public.get_classroom_provisioning_spec(
    p_classroom_group_id
  ) spec;


  if not found then

    raise exception
      'Classroom group % does not exist.',
      p_classroom_group_id;

  end if;


  if v_system_teacher is null then

    raise exception
      'No active organizational teacher account is configured for this Classroom program.';

  end if;


  update public.classroom_groups

  set
    desired_google_state =
      'active',

    provisioning_requested_at =
      now(),

    provisioning_requested_by_person_id =
      p_requested_by_person_id,

    updated_at =
      now()

  where id =
        p_classroom_group_id;


  v_action :=
    public.get_current_classroom_provisioning_action(
      p_classroom_group_id
    );


  if v_action = 'none' then

    return null;

  end if;


  -- Cancel any stale pending request first.

  update public.classroom_provisioning_requests

  set
    status = 'cancelled',

    completed_at = now(),

    error_message =
      'Cancelled because a newer provisioning request superseded this request.'

  where classroom_group_id =
        p_classroom_group_id

    and status =
        'pending';


  insert into public.classroom_provisioning_requests (
    classroom_group_id,
    action,
    status
  )

  values (
    p_classroom_group_id,
    v_action,
    'pending'
  )

  returning id
  into v_request_id;


  return v_request_id;

end;

$function$;


-- ============================================================
-- 8. REQUEST CLASSROOM ARCHIVE
-- ============================================================

create or replace function
  public.request_classroom_archive(
    p_classroom_group_id uuid
  )
returns uuid
language plpgsql
security definer
set search_path = public
as $function$

declare

  v_action text;
  v_request_id uuid;

begin

  update public.classroom_groups

  set
    desired_google_state =
      'archived',

    updated_at =
      now()

  where id =
        p_classroom_group_id;


  if not found then

    raise exception
      'Classroom group % does not exist.',
      p_classroom_group_id;

  end if;


  v_action :=
    public.get_current_classroom_provisioning_action(
      p_classroom_group_id
    );


  if v_action = 'none' then
    return null;
  end if;


  update public.classroom_provisioning_requests

  set
    status =
      'cancelled',

    completed_at =
      now(),

    error_message =
      'Cancelled because a newer provisioning request superseded this request.'

  where classroom_group_id =
        p_classroom_group_id

    and status =
        'pending';


  insert into public.classroom_provisioning_requests (
    classroom_group_id,
    action,
    status
  )

  values (
    p_classroom_group_id,
    v_action,
    'pending'
  )

  returning id
  into v_request_id;


  return v_request_id;

end;

$function$;


-- ============================================================
-- 9. SAFE PROVISIONING CLAIM
--
-- Worker MUST claim before touching Google.
--
-- Returns all information required for the Google operation.
-- ============================================================

create or replace function
  public.claim_classroom_provisioning(
    p_request_id uuid
  )
returns table (

  request_id uuid,

  classroom_group_id uuid,

  action text,

  should_execute boolean,

  status text,

  classroom_name text,

  program text,

  system_teacher_email text,

  google_course_id text
)
language plpgsql
security definer
set search_path = public
as $function$

declare

  v_request
    public.classroom_provisioning_requests%rowtype;

  v_spec record;

  v_current_action text;

begin

  select *
  into v_request

  from public.classroom_provisioning_requests

  where id =
        p_request_id

  for update;


  if not found then

    raise exception
      'Classroom provisioning request % does not exist.',
      p_request_id;

  end if;


  select *
  into v_spec

  from public.get_classroom_provisioning_spec(
    v_request.classroom_group_id
  );


  if v_request.status <> 'pending' then

    return query

    select
      v_request.id,
      v_request.classroom_group_id,
      v_request.action,
      false,
      v_request.status,
      v_spec.classroom_name,
      v_spec.program,
      v_spec.system_teacher_email,
      v_spec.existing_google_course_id;

    return;

  end if;


  v_current_action :=
    public.get_current_classroom_provisioning_action(
      v_request.classroom_group_id
    );


  -- ----------------------------------------------------------
  -- STALE REQUEST
  -- ----------------------------------------------------------

  if v_current_action <>
     v_request.action
  then

    update public.classroom_provisioning_requests

    set
      status =
        'cancelled',

      completed_at =
        now(),

      error_message =
        'Cancelled because the requested Google Classroom action is no longer required.'

    where id =
          p_request_id;


    return query

    select
      v_request.id,
      v_request.classroom_group_id,
      v_request.action,
      false,
      'cancelled'::text,
      v_spec.classroom_name,
      v_spec.program,
      v_spec.system_teacher_email,
      v_spec.existing_google_course_id;

    return;

  end if;


  -- ----------------------------------------------------------
  -- CLAIM
  -- ----------------------------------------------------------

  update public.classroom_provisioning_requests

  set
    status =
      'processing',

    processing_started_at =
      now(),

    error_message =
      null

  where id =
        p_request_id;


  return query

  select
    v_request.id,
    v_request.classroom_group_id,
    v_request.action,
    true,
    'processing'::text,
    v_spec.classroom_name,
    v_spec.program,
    v_spec.system_teacher_email,
    v_spec.existing_google_course_id;

end;

$function$;


-- ============================================================
-- 10. COMPLETE CLASSROOM CREATION / UPDATE
--
-- The worker calls this ONLY AFTER:
--
--   1. Google Classroom shell exists
--   2. correct Classroom name has been applied
--   3. organizational teacher has successfully been added
--
-- Once recorded, ordinary roster reconciliation can add the
-- assigned human instructors and eligible students.
-- ============================================================

create or replace function
  public.complete_classroom_provisioning(
    p_request_id uuid,
    p_google_course_id text,
    p_classroom_url text,
    p_course_state text default 'ACTIVE'
  )
returns void
language plpgsql
security definer
set search_path = public
as $function$

declare

  v_request
    public.classroom_provisioning_requests%rowtype;

  v_spec record;

begin

  select *
  into v_request

  from public.classroom_provisioning_requests

  where id =
        p_request_id

  for update;


  if not found then

    raise exception
      'Classroom provisioning request % does not exist.',
      p_request_id;

  end if;


  if v_request.status <>
     'processing'
  then

    raise exception
      'Classroom provisioning request % cannot be completed from status %.',
      p_request_id,
      v_request.status;

  end if;


  select *
  into v_spec

  from public.get_classroom_provisioning_spec(
    v_request.classroom_group_id
  );


  if v_request.action not in (
    'create',
    'update'
  ) then

    raise exception
      'Provisioning completion with Google Classroom details is not valid for action %.',
      v_request.action;

  end if;


  if nullif(
       trim(p_google_course_id),
       ''
     ) is null
  then

    raise exception
      'Google course ID is required.';

  end if;


  insert into public.google_classrooms (
    classroom_group_id,
    google_course_id,
    classroom_url,
    course_state,
    display_name,
    system_teacher_email,
    created_in_google_at,
    last_synced_at
  )

  values (
    v_request.classroom_group_id,
    trim(p_google_course_id),
    nullif(trim(p_classroom_url), ''),
    p_course_state,
    v_spec.classroom_name,
    v_spec.system_teacher_email,
    now(),
    now()
  )

  on conflict (
    classroom_group_id
  )

  do update set

    google_course_id =
      excluded.google_course_id,

    classroom_url =
      excluded.classroom_url,

    course_state =
      excluded.course_state,

    display_name =
      excluded.display_name,

    system_teacher_email =
      excluded.system_teacher_email,

    last_synced_at =
      now(),

    updated_at =
      now();


  update public.classroom_provisioning_requests

  set
    status =
      'completed',

    completed_at =
      now(),

    error_message =
      null

  where id =
        p_request_id;


  -- ----------------------------------------------------------
  -- GOOGLE CLASSROOM NOW EXISTS.
  --
  -- This causes assigned instructors to become part of
  -- desired_classroom_teachers.
  --
  -- Students will become desired only when their configured
  -- provisioning date and other readiness requirements are met.
  -- ----------------------------------------------------------

  perform public.queue_classroom_reconciliation();

end;

$function$;


-- ============================================================
-- 11. COMPLETE ARCHIVE
-- ============================================================

create or replace function
  public.complete_classroom_archive(
    p_request_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $function$

declare

  v_request
    public.classroom_provisioning_requests%rowtype;

begin

  select *
  into v_request

  from public.classroom_provisioning_requests

  where id =
        p_request_id

  for update;


  if not found then

    raise exception
      'Classroom provisioning request % does not exist.',
      p_request_id;

  end if;


  if v_request.status <>
     'processing'
  then

    raise exception
      'Classroom provisioning request % cannot be archived from status %.',
      p_request_id,
      v_request.status;

  end if;


  if v_request.action <>
     'archive'
  then

    raise exception
      'Classroom provisioning request % is not an archive request.',
      p_request_id;

  end if;


  update public.google_classrooms

  set
    course_state =
      'ARCHIVED',

    last_synced_at =
      now(),

    updated_at =
      now()

  where classroom_group_id =
        v_request.classroom_group_id;


  update public.classroom_provisioning_requests

  set
    status =
      'completed',

    completed_at =
      now(),

    error_message =
      null

  where id =
        p_request_id;

end;

$function$;


-- ============================================================
-- 12. FAILED PROVISIONING
--
-- Failure does NOT invent a new observed Google state.
-- ============================================================

create or replace function
  public.fail_classroom_provisioning(
    p_request_id uuid,
    p_error_message text
  )
returns void
language plpgsql
security definer
set search_path = public
as $function$

declare

  v_request
    public.classroom_provisioning_requests%rowtype;

begin

  select *
  into v_request

  from public.classroom_provisioning_requests

  where id =
        p_request_id

  for update;


  if not found then

    raise exception
      'Classroom provisioning request % does not exist.',
      p_request_id;

  end if;


  if v_request.status <>
     'processing'
  then

    raise exception
      'Classroom provisioning request % cannot fail from status %.',
      p_request_id,
      v_request.status;

  end if;


  update public.classroom_provisioning_requests

  set
    status =
      'error',

    attempts =
      attempts + 1,

    completed_at =
      now(),

    error_message =
      p_error_message

  where id =
        p_request_id;

end;

$function$;


-- ============================================================
-- 13. ASSIGNED TEACHERS MUST HAVE ACTIVE WORKSPACE ACCOUNTS
--
-- The worker ultimately needs a real Google identity.
--
-- Previously desired_classroom_teachers did not verify this.
-- ============================================================

create or replace view
  public.desired_classroom_teachers
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

join public.workspace_accounts wa
  on wa.person_id =
     ci.person_id

where co.classroom_group_id
      is not null

  and ci.role in (
    'primary_teacher',
    'co_teacher',
    'assistant'
  )

  and co.status not in (
    'cancelled',
    'archived'
  )

  and wa.workspace_status =
      'active';


-- Rebuild dependent combined desired-membership view.

create or replace view
  public.desired_classroom_memberships
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
-- 14. PERMISSIONS
--
-- Provisioning operations are integration/admin backend actions.
-- Ordinary authenticated clients cannot call these primitives.
-- ============================================================

revoke all
on function public.request_classroom_provisioning(
  uuid,
  uuid
)
from public, anon, authenticated;


revoke all
on function public.request_classroom_archive(
  uuid
)
from public, anon, authenticated;


revoke all
on function public.claim_classroom_provisioning(
  uuid
)
from public, anon, authenticated;


revoke all
on function public.complete_classroom_provisioning(
  uuid,
  text,
  text,
  text
)
from public, anon, authenticated;


revoke all
on function public.complete_classroom_archive(
  uuid
)
from public, anon, authenticated;


revoke all
on function public.fail_classroom_provisioning(
  uuid,
  text
)
from public, anon, authenticated;


revoke all
on function public.get_current_classroom_provisioning_action(
  uuid
)
from public, anon, authenticated;


grant execute
on function public.request_classroom_provisioning(
  uuid,
  uuid
)
to service_role;


grant execute
on function public.request_classroom_archive(
  uuid
)
to service_role;


grant execute
on function public.claim_classroom_provisioning(
  uuid
)
to service_role;


grant execute
on function public.complete_classroom_provisioning(
  uuid,
  text,
  text,
  text
)
to service_role;


grant execute
on function public.complete_classroom_archive(
  uuid
)
to service_role;


grant execute
on function public.fail_classroom_provisioning(
  uuid,
  text
)
to service_role;


grant execute
on function public.get_current_classroom_provisioning_action(
  uuid
)
to service_role;


grant execute
on function public.get_classroom_provisioning_spec(
  uuid
)
to service_role;


-- ============================================================
-- 15. DOCUMENT CONTENT OWNERSHIP
-- ============================================================

comment on table public.classroom_groups is
'Logical Google Classroom grouping. Supabase manages Classroom provisioning and roster membership; instructors manage instructional Classroom content.';


comment on function public.complete_classroom_provisioning(
  uuid,
  text,
  text,
  text
) is
'Records successful Google Classroom shell provisioning after the integration has created/named the Classroom and added the required organizational teacher. Assigned instructors and eligible students are then handled through roster reconciliation.';


commit;