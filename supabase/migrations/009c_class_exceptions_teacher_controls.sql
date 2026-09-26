begin;


-- ============================================================
-- 1. CLASS ELIGIBILITY EXCEPTION REQUESTS
--
-- An exception belongs to:
--   one student
--   one specific class offering
--
-- Approval allows that student to bypass the offering's normal
-- age bounds. It does NOT:
--   reserve a seat
--   bypass registration eligibility
--   bypass capacity
--   bypass payment
--   bypass registration windows
-- ============================================================

create table public.class_eligibility_exception_requests (

  id uuid primary key default gen_random_uuid(),

  class_offering_id uuid not null
    references public.class_offerings(id)
    on delete cascade,

  student_person_id uuid not null
    references public.people(id)
    on delete cascade,

  household_id uuid not null
    references public.households(id)
    on delete cascade,

  requested_by_person_id uuid not null
    references public.people(id)
    on delete restrict,

  reason text not null,

  status text not null default 'pending',

  reviewed_by_person_id uuid
    references public.people(id)
    on delete set null,

  reviewed_at timestamptz,

  review_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint class_exception_status_check
    check (
      status in (
        'pending',
        'approved',
        'denied',
        'withdrawn'
      )
    ),

  constraint class_exception_reason_not_blank
    check (length(trim(reason)) > 0),

  constraint class_exception_unique
    unique (
      class_offering_id,
      student_person_id
    )
);


create index
  idx_class_exception_offering_status
on public.class_eligibility_exception_requests (
  class_offering_id,
  status
);


create index
  idx_class_exception_student
on public.class_eligibility_exception_requests (
  student_person_id
);


create trigger
  set_class_eligibility_exception_updated_at
before update
on public.class_eligibility_exception_requests
for each row
execute function public.set_updated_at();


alter table public.class_eligibility_exception_requests
  enable row level security;


comment on table
  public.class_eligibility_exception_requests
is
  'Student-specific requests to bypass an offering age restriction. Approval does not reserve capacity or guarantee enrollment.';


-- ============================================================
-- 2. AGE HELPER
--
-- Age is evaluated as of the offering start date when present.
-- If the offering does not yet have a start date, use the
-- school-year start date.
--
-- This keeps age evaluation deterministic rather than changing
-- every day during registration.
-- ============================================================

create or replace function public.student_age_for_offering(
  p_student_person_id uuid,
  p_class_offering_id uuid
)
returns integer
language sql
stable
set search_path = public
as $function$

  select
    case
      when p.birth_date is null then null

      else
        extract(
          year from age(
            coalesce(
              co.starts_on,
              sy.starts_on
            ),
            p.birth_date
          )
        )::integer
    end

  from public.people p

  cross join public.class_offerings co

  join public.school_years sy
    on sy.id = co.school_year_id

  where p.id = p_student_person_id
    and co.id = p_class_offering_id;

$function$;


-- ============================================================
-- 3. NORMAL AGE ELIGIBILITY
-- ============================================================

create or replace function public.student_meets_offering_age_requirement(
  p_student_person_id uuid,
  p_class_offering_id uuid
)
returns boolean
language plpgsql
stable
set search_path = public
as $function$

declare

  v_age integer;
  v_minimum_age integer;
  v_maximum_age integer;

begin

  select
    public.student_age_for_offering(
      p_student_person_id,
      p_class_offering_id
    ),
    co.minimum_age,
    co.maximum_age

  into
    v_age,
    v_minimum_age,
    v_maximum_age

  from public.class_offerings co

  where co.id = p_class_offering_id;


  if not found then
    return false;
  end if;


  -- No age restriction.
  if v_minimum_age is null
     and v_maximum_age is null then

    return true;

  end if;


  -- If the offering has an age restriction but the student's
  -- birth date is unknown, normal age eligibility cannot be
  -- established. An explicit exception may still be approved.
  if v_age is null then
    return false;
  end if;


  return
    (v_minimum_age is null or v_age >= v_minimum_age)
    and
    (v_maximum_age is null or v_age <= v_maximum_age);

end;

$function$;


-- ============================================================
-- 4. APPROVED EXCEPTION HELPER
-- ============================================================

create or replace function public.student_has_approved_class_exception(
  p_student_person_id uuid,
  p_class_offering_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $function$

  select exists (

    select 1

    from public.class_eligibility_exception_requests cer

    where cer.student_person_id =
          p_student_person_id

      and cer.class_offering_id =
          p_class_offering_id

      and cer.status = 'approved'
  );

$function$;


-- ============================================================
-- 5. FINAL AGE ELIGIBILITY
--
-- This is the function registration should ultimately use.
-- ============================================================

create or replace function public.student_is_age_eligible_for_offering(
  p_student_person_id uuid,
  p_class_offering_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $function$

  select
    public.student_meets_offering_age_requirement(
      p_student_person_id,
      p_class_offering_id
    )
    or
    public.student_has_approved_class_exception(
      p_student_person_id,
      p_class_offering_id
    );

$function$;


-- ============================================================
-- 6. REQUEST AN EXCEPTION
--
-- Browser-safe RPC.
--
-- For the moment this accepts:
--   explicit student_guardian_access
-- OR
--   the existing household can_manage_household relationship
--
-- The second path is temporary compatibility while we migrate
-- real families into student_guardian_access.
-- ============================================================

create or replace function public.request_class_eligibility_exception(
  p_student_person_id uuid,
  p_class_offering_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$

declare

  v_requester uuid;
  v_household_id uuid;
  v_request_id uuid;

begin

  v_requester :=
    private.current_person_id();


  if v_requester is null then
    raise exception 'You must be signed in.';
  end if;


  if nullif(trim(p_reason), '') is null then
    raise exception 'Please provide a reason for the exception request.';
  end if;


  -- ----------------------------------------------------------
  -- Find a household where:
  --   student belongs to household
  -- AND requester has explicit student access
  -- OR legacy household management access.
  -- ----------------------------------------------------------

  select student_hm.household_id
  into v_household_id

  from public.household_members student_hm

  where student_hm.person_id =
        p_student_person_id

    and (
      exists (
        select 1

        from public.student_guardian_access sga

        where sga.household_id =
              student_hm.household_id

          and sga.adult_person_id =
              v_requester

          and sga.student_person_id =
              p_student_person_id

          and (
            sga.can_manage_student
            or sga.can_register_student
          )

          and sga.starts_at <= current_date

          and (
            sga.ends_at is null
            or sga.ends_at >= current_date
          )
      )

      or

      exists (
        select 1

        from public.household_members requester_hm

        where requester_hm.household_id =
              student_hm.household_id

          and requester_hm.person_id =
              v_requester

          and requester_hm.can_manage_household = true
      )
    )

  limit 1;


  if v_household_id is null then

    raise exception
      'You do not have permission to request an exception for this student.';

  end if;


  if not exists (
    select 1
    from public.class_offerings co
    where co.id = p_class_offering_id
      and co.status not in (
        'cancelled',
        'completed',
        'archived'
      )
  ) then

    raise exception
      'This class offering is not available for exception requests.';

  end if;


  -- If the student already meets the age requirement there is
  -- no reason to create an exception.

  if public.student_meets_offering_age_requirement(
    p_student_person_id,
    p_class_offering_id
  ) then

    raise exception
      'This student already meets the age requirement for this class.';

  end if;


  insert into public.class_eligibility_exception_requests (
    class_offering_id,
    student_person_id,
    household_id,
    requested_by_person_id,
    reason,
    status
  )
  values (
    p_class_offering_id,
    p_student_person_id,
    v_household_id,
    v_requester,
    trim(p_reason),
    'pending'
  )

  on conflict (
    class_offering_id,
    student_person_id
  )

  do update set
    household_id =
      excluded.household_id,

    requested_by_person_id =
      excluded.requested_by_person_id,

    reason =
      excluded.reason,

    status =
      'pending',

    reviewed_by_person_id =
      null,

    reviewed_at =
      null,

    review_notes =
      null,

    updated_at =
      now()

  returning id
  into v_request_id;


  return v_request_id;

end;

$function$;


-- ============================================================
-- 7. TEACHER AUTHORIZATION HELPER
-- ============================================================

create or replace function public.current_person_teaches_offering(
  p_class_offering_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$

  select exists (

    select 1

    from public.class_instructors ci

    where ci.class_offering_id =
          p_class_offering_id

      and ci.person_id =
          private.current_person_id()

      and ci.role in (
        'primary_teacher',
        'co_teacher'
      )
  );

$function$;


-- ============================================================
-- 8. TEACHER REVIEWS EXCEPTION
--
-- Only primary/co-teachers for that offering may approve or
-- deny through this member-facing RPC.
--
-- Admin workflows can be added separately.
-- ============================================================

create or replace function public.review_class_eligibility_exception(
  p_exception_request_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$

declare

  v_reviewer uuid;
  v_offering_id uuid;

begin

  if p_decision not in (
    'approved',
    'denied'
  ) then

    raise exception
      'Decision must be approved or denied.';

  end if;


  v_reviewer :=
    private.current_person_id();


  if v_reviewer is null then
    raise exception 'You must be signed in.';
  end if;


  select cer.class_offering_id
  into v_offering_id

  from public.class_eligibility_exception_requests cer

  where cer.id =
        p_exception_request_id

  for update;


  if v_offering_id is null then
    raise exception 'Exception request not found.';
  end if;


  if not public.current_person_teaches_offering(
    v_offering_id
  ) then

    raise exception
      'Only a teacher for this class may review this request.';

  end if;


  update public.class_eligibility_exception_requests

  set
    status =
      p_decision,

    reviewed_by_person_id =
      v_reviewer,

    reviewed_at =
      now(),

    review_notes =
      nullif(trim(p_review_notes), ''),

    updated_at =
      now()

  where id =
        p_exception_request_id;

end;

$function$;


-- ============================================================
-- 9. WITHDRAW OWN EXCEPTION REQUEST
-- ============================================================

create or replace function public.withdraw_class_eligibility_exception(
  p_exception_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $function$

declare

  v_person_id uuid;

begin

  v_person_id :=
    private.current_person_id();


  update public.class_eligibility_exception_requests cer

  set
    status = 'withdrawn',
    updated_at = now()

  where cer.id =
        p_exception_request_id

    and cer.requested_by_person_id =
        v_person_id

    and cer.status = 'pending';


  if not found then

    raise exception
      'Pending exception request not found or you do not have permission to withdraw it.';

  end if;

end;

$function$;


-- ============================================================
-- 10. TEACHER ROSTER VIEW
--
-- One normalized view for:
--   enrolled
--   waitlisted
--   exception requests
--
-- We intentionally do NOT expose this view directly to the
-- browser yet. A scoped RPC follows below.
-- ============================================================

create or replace view public.teacher_class_roster_items
with (security_invoker = true)
as

  -- ----------------------------------------------------------
  -- ENROLLED
  -- ----------------------------------------------------------

  select

    e.class_offering_id,
    e.student_person_id,

    p.preferred_name,
    p.first_name,
    p.last_name,

    'enrollment'::text as item_type,
    e.status::text as item_status,

    e.created_at as occurred_at,

    null::text as request_reason,
    null::text as review_notes

  from public.enrollments e

  join public.people p
    on p.id = e.student_person_id

  where e.status = 'enrolled'


union all


  -- ----------------------------------------------------------
  -- WAITLIST
  -- ----------------------------------------------------------

  select

    w.class_offering_id,
    w.student_person_id,

    p.preferred_name,
    p.first_name,
    p.last_name,

    'waitlist'::text as item_type,
    w.status::text as item_status,

    w.created_at as occurred_at,

    null::text as request_reason,
    null::text as review_notes

  from public.waitlist_entries w

  join public.people p
    on p.id = w.student_person_id

  where w.status = 'active'


union all


  -- ----------------------------------------------------------
  -- EXCEPTION REQUEST
  -- ----------------------------------------------------------

  select

    cer.class_offering_id,
    cer.student_person_id,

    p.preferred_name,
    p.first_name,
    p.last_name,

    'exception_request'::text
      as item_type,

    cer.status::text
      as item_status,

    cer.created_at
      as occurred_at,

    cer.reason
      as request_reason,

    cer.review_notes

  from public.class_eligibility_exception_requests cer

  join public.people p
    on p.id = cer.student_person_id

  where cer.status <> 'withdrawn';


-- ============================================================
-- 11. TEACHER ROSTER RPC
--
-- Returns roster information only if the current user is a
-- primary/co-teacher for this offering.
-- ============================================================

create or replace function public.get_my_teacher_class_roster(
  p_class_offering_id uuid
)
returns table (

  student_person_id uuid,

  preferred_name text,
  first_name text,
  last_name text,

  item_type text,
  item_status text,

  occurred_at timestamptz,

  request_reason text,
  review_notes text
)
language plpgsql
stable
security definer
set search_path = public
as $function$

begin

  if not public.current_person_teaches_offering(
    p_class_offering_id
  ) then

    raise exception
      'You do not have permission to view this class roster.';

  end if;


  return query

  select
    t.student_person_id,
    t.preferred_name,
    t.first_name,
    t.last_name,
    t.item_type,
    t.item_status,
    t.occurred_at,
    t.request_reason,
    t.review_notes

  from public.teacher_class_roster_items t

  where t.class_offering_id =
        p_class_offering_id

  order by
    t.item_type,
    t.occurred_at,
    t.last_name,
    t.first_name;

end;

$function$;


-- ============================================================
-- 12. TEACHER-EDITABLE COURSE CONTENT
--
-- Narrow RPC rather than granting UPDATE directly on courses.
--
-- A teacher may edit descriptive/catalog content for a course
-- only when they teach one of that course's offerings.
--
-- Structural fields such as:
--   program
--   school year
--   capacity
--   fee
--   dates
--   publication status
-- are intentionally NOT editable here.
-- ============================================================

create or replace function public.update_my_course_content(
  p_course_id uuid,
  p_title text,
  p_description text default null,
  p_syllabus_url text default null,
  p_intro_video_url text default null,
  p_prerequisites text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $function$

declare

  v_person_id uuid;

begin

  v_person_id :=
    private.current_person_id();


  if v_person_id is null then
    raise exception 'You must be signed in.';
  end if;


  if nullif(trim(p_title), '') is null then
    raise exception 'Class title is required.';
  end if;


  if not exists (

    select 1

    from public.class_offerings co

    join public.class_instructors ci
      on ci.class_offering_id = co.id

    where co.course_id =
          p_course_id

      and ci.person_id =
          v_person_id

      and ci.role in (
        'primary_teacher',
        'co_teacher'
      )

  ) then

    raise exception
      'You do not have permission to edit this class.';

  end if;


  update public.courses

  set
    title =
      trim(p_title),

    description =
      nullif(trim(p_description), ''),

    syllabus_url =
      nullif(trim(p_syllabus_url), ''),

    intro_video_url =
      nullif(trim(p_intro_video_url), ''),

    prerequisites =
      nullif(trim(p_prerequisites), ''),

    updated_at =
      now()

  where id =
        p_course_id;


  if not found then
    raise exception 'Course not found.';
  end if;

end;

$function$;


-- ============================================================
-- 13. PROPOSAL / CATALOG SEMANTICS
--
-- Existing schema already supports the distinction:
--
-- class_proposals.status
--   = contribution/review workflow
--
-- class_offerings.status + catalog_published_at
--   = actual catalog/publication workflow
--
-- Document this explicitly rather than adding another status
-- column that duplicates existing data.
-- ============================================================

comment on column public.class_proposals.status
is
  'Review state for the proposal itself. For contribution-linked teaching proposals, approval represents contribution/class proposal approval. Proposal approval is not the same thing as catalog publication.';


comment on column public.class_offerings.status
is
  'Operational offering state. Catalog visibility and registration state belong to the offering and are independent of class proposal review status.';


comment on column public.class_offerings.catalog_published_at
is
  'Timestamp when the offering was published to the catalog. Catalog publication is independent of whether a source proposal required contribution review.';


-- ============================================================
-- 14. RPC PERMISSIONS
--
-- Keep direct table access protected by RLS and expose only the
-- narrow operations above.
-- ============================================================

revoke all
on public.class_eligibility_exception_requests
from anon, authenticated;


grant execute
on function public.student_age_for_offering(uuid, uuid)
to authenticated;

grant execute
on function public.student_meets_offering_age_requirement(uuid, uuid)
to authenticated;

grant execute
on function public.student_has_approved_class_exception(uuid, uuid)
to authenticated;

grant execute
on function public.student_is_age_eligible_for_offering(uuid, uuid)
to authenticated;

grant execute
on function public.request_class_eligibility_exception(uuid, uuid, text)
to authenticated;

grant execute
on function public.current_person_teaches_offering(uuid)
to authenticated;

grant execute
on function public.review_class_eligibility_exception(uuid, text, text)
to authenticated;

grant execute
on function public.withdraw_class_eligibility_exception(uuid)
to authenticated;

grant execute
on function public.get_my_teacher_class_roster(uuid)
to authenticated;

grant execute
on function public.update_my_course_content(
  uuid,
  text,
  text,
  text,
  text,
  text
)
to authenticated;


commit;