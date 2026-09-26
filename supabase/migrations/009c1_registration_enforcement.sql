begin;


-- ============================================================
-- 009C1
-- REGISTRATION ENFORCEMENT
--
-- Combines:
--   * explicit/legacy guardian authorization
--   * annual reenrollment eligibility
--   * contribution-based Junior limits
--   * Youth contribution eligibility
--   * age eligibility / approved exceptions
--   * capacity + waitlist
--   * schedule conflict warnings
--   * enrollment fee charge creation
--
-- Also corrects the teacher roster waitlist statuses from 009C.
-- ============================================================


-- ============================================================
-- 1. SHARED STUDENT REGISTRATION AUTHORIZATION
--
-- During migration we support BOTH:
--
--   A. explicit student_guardian_access
--   B. legacy can_manage_household
--
-- This prevents existing families from being locked out while
-- child-specific permissions are populated and reviewed.
-- ============================================================

create or replace function public.person_can_register_student(
  p_person_id uuid,
  p_student_person_id uuid,
  p_household_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$

  select

    -- Student must currently belong to the supplied household.
    exists (
      select 1
      from public.household_members student_hm
      where student_hm.household_id = p_household_id
        and student_hm.person_id = p_student_person_id
        and (
          student_hm.starts_at is null
          or student_hm.starts_at <= current_date
        )
        and (
          student_hm.ends_at is null
          or student_hm.ends_at >= current_date
        )
    )

    and

    (
      -- ------------------------------------------------------
      -- Preferred explicit child-specific authorization
      -- ------------------------------------------------------
      exists (
        select 1
        from public.student_guardian_access sga
        where sga.household_id = p_household_id
          and sga.adult_person_id = p_person_id
          and sga.student_person_id = p_student_person_id
          and sga.can_register_student = true
          and (
            sga.starts_at is null
            or sga.starts_at <= current_date
          )
          and (
            sga.ends_at is null
            or sga.ends_at >= current_date
          )
      )

      or

      -- ------------------------------------------------------
      -- TEMPORARY legacy compatibility
      -- ------------------------------------------------------
      exists (
        select 1
        from public.household_members manager_hm
        where manager_hm.household_id = p_household_id
          and manager_hm.person_id = p_person_id
          and manager_hm.can_manage_household = true
          and (
            manager_hm.starts_at is null
            or manager_hm.starts_at <= current_date
          )
          and (
            manager_hm.ends_at is null
            or manager_hm.ends_at >= current_date
          )
      )
    );

$function$;


-- ============================================================
-- 2. FIND A HOUSEHOLD THROUGH WHICH CURRENT USER MAY REGISTER
--    THIS STUDENT
-- ============================================================

create or replace function public.get_registration_household_for_student(
  p_person_id uuid,
  p_student_person_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = public
as $function$

  select hm.household_id

  from public.household_members hm

  where hm.person_id = p_student_person_id

    and (
      hm.starts_at is null
      or hm.starts_at <= current_date
    )

    and (
      hm.ends_at is null
      or hm.ends_at >= current_date
    )

    and public.person_can_register_student(
      p_person_id,
      p_student_person_id,
      hm.household_id
    )

  order by hm.created_at

  limit 1;

$function$;


-- ============================================================
-- 3. FIX 009C TEACHER ROSTER WAITLIST STATUSES
--
-- Actual waitlist states used by registration are:
--   waiting
--   offered
-- ============================================================

create or replace view public.teacher_class_roster_items
with (security_invoker = true)
as

  -- ENROLLED
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


  -- WAITLIST
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

  where w.status in (
    'waiting',
    'offered'
  )


union all


  -- ELIGIBILITY EXCEPTION
  select
    cer.class_offering_id,
    cer.student_person_id,
    p.preferred_name,
    p.first_name,
    p.last_name,
    'exception_request'::text as item_type,
    cer.status::text as item_status,
    cer.created_at as occurred_at,
    cer.reason as request_reason,
    cer.review_notes

  from public.class_eligibility_exception_requests cer

  join public.people p
    on p.id = cer.student_person_id

  where cer.status <> 'withdrawn';


-- ============================================================
-- 4. REGISTRATION PREVIEW
--
-- This now represents FINAL registration eligibility for the
-- selected student + offering, not merely household eligibility.
-- ============================================================

create or replace function public.get_my_registration_preview(
  p_student_person_id uuid,
  p_class_offering_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $function$

declare

  v_viewer_id uuid;
  v_household_id uuid;

  v_student public.people%rowtype;
  v_offering public.class_offerings%rowtype;

  v_registration record;

  v_enrolled_count integer := 0;
  v_student_junior_count integer := 0;

  v_already_enrolled boolean := false;
  v_already_waitlisted boolean := false;

  v_normal_age_eligible boolean := false;
  v_approved_exception boolean := false;
  v_age_eligible boolean := false;
  v_student_age integer;

  v_final_eligible boolean := false;
  v_blocking_reason text;

  v_conflicts jsonb := '[]'::jsonb;

begin

  v_viewer_id :=
    private.current_person_id();


  if v_viewer_id is null then
    raise exception
      'Authenticated member is not linked to a person.';
  end if;


  select p.*
  into v_student
  from public.people p
  where p.id = p_student_person_id;


  if not found then
    raise exception 'Student does not exist.';
  end if;


  select co.*
  into v_offering
  from public.class_offerings co
  where co.id = p_class_offering_id;


  if not found then
    raise exception 'Class offering does not exist.';
  end if;


  v_household_id :=
    public.get_registration_household_for_student(
      v_viewer_id,
      p_student_person_id
    );


  if v_household_id is null then
    raise exception
      'You may not register this student.';
  end if;


  -- ----------------------------------------------------------
  -- HOUSEHOLD REGISTRATION STATUS
  -- ----------------------------------------------------------

  select *
  into v_registration

  from public.get_household_registration_status(
    v_household_id,
    v_offering.school_year_id,
    v_offering.program,
    now()
  );


  -- ----------------------------------------------------------
  -- CURRENT ENROLLMENT / WAITLIST STATE
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_enrolled_count

  from public.enrollments e

  where e.class_offering_id =
        p_class_offering_id

    and e.status = 'enrolled';


  select exists (
    select 1
    from public.enrollments e
    where e.student_person_id =
          p_student_person_id
      and e.class_offering_id =
          p_class_offering_id
      and e.status = 'enrolled'
  )
  into v_already_enrolled;


  select exists (
    select 1
    from public.waitlist_entries we
    where we.student_person_id =
          p_student_person_id
      and we.class_offering_id =
          p_class_offering_id
      and we.status in (
        'waiting',
        'offered'
      )
  )
  into v_already_waitlisted;


  -- ----------------------------------------------------------
  -- JUNIOR CURRENT CLASS COUNT
  -- ----------------------------------------------------------

  if v_offering.program = 'junior' then

    v_student_junior_count :=
      public.count_student_junior_enrollments(
        p_student_person_id,
        v_offering.school_year_id
      );

  end if;


  -- ----------------------------------------------------------
  -- AGE / EXCEPTION
  -- ----------------------------------------------------------

  v_student_age :=
    public.student_age_for_offering(
      p_student_person_id,
      p_class_offering_id
    );


  v_normal_age_eligible :=
    public.student_meets_offering_age_requirement(
      p_student_person_id,
      p_class_offering_id
    );


  v_approved_exception :=
    public.student_has_approved_class_exception(
      p_student_person_id,
      p_class_offering_id
    );


  v_age_eligible :=
    v_normal_age_eligible
    or v_approved_exception;


  -- ----------------------------------------------------------
  -- FINAL ELIGIBILITY
  -- ----------------------------------------------------------

  v_final_eligible := true;
  v_blocking_reason := null;


  if v_student.member_type <>
     v_offering.program then

    v_final_eligible := false;

    v_blocking_reason :=
      'This class is not offered for this student''s member type.';


  elsif v_offering.status not in (
    'published',
    'registration_open'
  ) then

    v_final_eligible := false;

    v_blocking_reason :=
      'This class is not available for registration.';


  elsif not v_registration.eligible then

    v_final_eligible := false;

    v_blocking_reason :=
      v_registration.blocking_reason;


  elsif not v_age_eligible then

    v_final_eligible := false;

    v_blocking_reason :=
      'This student does not meet the age requirement for this class. An eligibility exception may be requested.';


  elsif
    v_offering.program = 'junior'
    and not v_registration.unlimited_classes
    and v_registration.effective_class_limit is not null
    and v_student_junior_count >=
        v_registration.effective_class_limit
  then

    v_final_eligible := false;

    v_blocking_reason :=
      format(
        'This Junior student has reached the class limit of % for this school year.',
        v_registration.effective_class_limit
      );

  end if;


  -- ----------------------------------------------------------
  -- SCHEDULE CONFLICTS
  -- ----------------------------------------------------------

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'enrollment_id',
          c.conflicting_enrollment_id,

        'class_offering_id',
          c.conflicting_class_offering_id,

        'course_title',
          c.conflicting_course_title,

        'day_of_week',
          c.day_of_week,

        'proposed_start_time',
          c.proposed_start_time,

        'proposed_duration_minutes',
          c.proposed_duration_minutes,

        'conflicting_start_time',
          c.conflicting_start_time,

        'conflicting_duration_minutes',
          c.conflicting_duration_minutes
      )
    ),
    '[]'::jsonb
  )
  into v_conflicts

  from public.get_registration_schedule_conflicts(
    p_student_person_id,
    p_class_offering_id
  ) c;


  -- ----------------------------------------------------------
  -- RESULT
  -- ----------------------------------------------------------

  return jsonb_build_object(

    'eligible',
      v_final_eligible,

    'blocking_reason',
      v_blocking_reason,

    'household_id',
      v_household_id,

    'program',
      v_offering.program,

    'already_enrolled',
      v_already_enrolled,

    'already_waitlisted',
      v_already_waitlisted,

    'max_enrollment',
      v_offering.max_enrollment,

    'enrolled_count',
      v_enrolled_count,

    'is_full',
      (
        v_offering.max_enrollment is not null
        and
        v_enrolled_count >=
          v_offering.max_enrollment
      ),

    'unlimited_classes',
      v_registration.unlimited_classes,

    'class_limit',
      v_registration.effective_class_limit,

    'current_junior_class_count',
      v_student_junior_count,

    'student_age',
      v_student_age,

    'normal_age_eligible',
      v_normal_age_eligible,

    'approved_age_exception',
      v_approved_exception,

    'age_eligible',
      v_age_eligible,

    'minimum_age',
      v_offering.minimum_age,

    'maximum_age',
      v_offering.maximum_age,

    'schedule_conflicts',
      v_conflicts,

    'fee',
      v_offering.fee

  );

end;

$function$;


-- ============================================================
-- 5. CORE REGISTRATION FUNCTION
-- ============================================================

create or replace function public.register_student_for_offering(
  p_student_person_id uuid,
  p_class_offering_id uuid,
  p_household_id uuid,
  p_registered_by_person_id uuid,
  p_join_waitlist_if_full boolean default false
)
returns table(
  result text,
  enrollment_id uuid,
  waitlist_entry_id uuid,
  waitlist_position integer,
  fee_amount numeric,
  schedule_conflicts jsonb,
  message text
)
language plpgsql
security definer
set search_path = public
as $function$

declare

  v_student public.people%rowtype;
  v_offering public.class_offerings%rowtype;

  v_registration_status record;

  v_current_enrollment_count integer := 0;
  v_student_program_count integer := 0;

  v_enrollment_id uuid;
  v_waitlist_id uuid;
  v_waitlist_position integer;

  v_conflicts jsonb := '[]'::jsonb;

begin

  -- ----------------------------------------------------------
  -- LOCK OFFERING
  -- Prevent concurrent registrations from overselling a seat.
  -- ----------------------------------------------------------

  select *
  into v_offering

  from public.class_offerings

  where id =
        p_class_offering_id

  for update;


  if not found then

    raise exception
      'Class offering % does not exist.',
      p_class_offering_id;

  end if;


  if v_offering.status not in (
    'published',
    'registration_open'
  ) then

    raise exception
      'Class offering is not available for registration.';

  end if;


  -- ----------------------------------------------------------
  -- STUDENT
  -- ----------------------------------------------------------

  select *
  into v_student

  from public.people

  where id =
        p_student_person_id;


  if not found then

    raise exception
      'Student % does not exist.',
      p_student_person_id;

  end if;


  if v_student.member_type not in (
    'junior',
    'youth'
  ) then

    raise exception
      'Only Junior or Youth members may be registered for classes.';

  end if;


  if v_student.member_type <>
     v_offering.program then

    raise exception
      'Student member type % does not match offering program %.',
      v_student.member_type,
      v_offering.program;

  end if;


  -- ----------------------------------------------------------
  -- STUDENT-SPECIFIC REGISTRATION AUTHORIZATION
  -- ----------------------------------------------------------

  if not public.person_can_register_student(
    p_registered_by_person_id,
    p_student_person_id,
    p_household_id
  ) then

    raise exception
      'Registering person may not register this student.';

  end if;


  -- ----------------------------------------------------------
  -- DUPLICATE / RETRY SAFETY
  -- ----------------------------------------------------------

  select e.id
  into v_enrollment_id

  from public.enrollments e

  where e.student_person_id =
        p_student_person_id

    and e.class_offering_id =
        p_class_offering_id

    and e.status =
        'enrolled'

  limit 1;


  if v_enrollment_id is not null then

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'enrollment_id',
            c.conflicting_enrollment_id,

          'class_offering_id',
            c.conflicting_class_offering_id,

          'course_title',
            c.conflicting_course_title,

          'day_of_week',
            c.day_of_week,

          'proposed_start_time',
            c.proposed_start_time,

          'conflicting_start_time',
            c.conflicting_start_time
        )
      ),
      '[]'::jsonb
    )

    into v_conflicts

    from public.get_registration_schedule_conflicts(
      p_student_person_id,
      p_class_offering_id
    ) c;


    return query

    select
      'already_enrolled'::text,
      v_enrollment_id,
      null::uuid,
      null::integer,
      v_offering.fee,
      v_conflicts,
      'Student is already enrolled in this class.'::text;

    return;

  end if;


  -- ----------------------------------------------------------
  -- HOUSEHOLD / CONTRIBUTION / REENROLLMENT ELIGIBILITY
  -- ----------------------------------------------------------

  select *
  into v_registration_status

  from public.get_household_registration_status(
    p_household_id,
    v_offering.school_year_id,
    v_offering.program,
    now()
  );


  if not v_registration_status.eligible then

    raise exception
      '%',
      coalesce(
        v_registration_status.blocking_reason,
        'Household is not eligible to register.'
      );

  end if;


  -- ----------------------------------------------------------
  -- AGE ELIGIBILITY
  --
  -- An approved exception bypasses ONLY the normal age rule.
  -- ----------------------------------------------------------

  if not public.student_is_age_eligible_for_offering(
    p_student_person_id,
    p_class_offering_id
  ) then

    raise exception
      'Student does not meet the age requirement for this class and does not have an approved exception.';

  end if;


  -- ----------------------------------------------------------
  -- JUNIOR CLASS LIMIT
  --
  -- Effective limit now comes from 009B:
  --
  --   no qualifying contribution = household not eligible
  --   approved Youth contribution = 2 per Junior child
  --   full Junior coverage        = unlimited
  -- ----------------------------------------------------------

  if v_offering.program = 'junior'
     and not v_registration_status.unlimited_classes
  then

    v_student_program_count :=
      public.count_student_junior_enrollments(
        p_student_person_id,
        v_offering.school_year_id
      );


    if
      v_registration_status.effective_class_limit
        is not null

      and v_student_program_count >=
          v_registration_status.effective_class_limit
    then

      raise exception
        'Junior student has reached the class limit of % for this school year.',
        v_registration_status.effective_class_limit;

    end if;

  end if;


  -- ----------------------------------------------------------
  -- CAPACITY
  -- ----------------------------------------------------------

  select count(*)::integer
  into v_current_enrollment_count

  from public.enrollments e

  where e.class_offering_id =
        p_class_offering_id

    and e.status =
        'enrolled';


  if
    v_offering.max_enrollment is not null
    and
    v_current_enrollment_count >=
      v_offering.max_enrollment
  then

    if p_join_waitlist_if_full then

      select
        w.waitlist_entry_id,
        w.waitlist_position

      into
        v_waitlist_id,
        v_waitlist_position

      from public.join_class_waitlist(
        p_student_person_id,
        p_class_offering_id,
        p_household_id,
        p_registered_by_person_id
      ) w;


      return query

      select
        'waitlisted'::text,
        null::uuid,
        v_waitlist_id,
        v_waitlist_position,
        null::numeric,
        '[]'::jsonb,
        'Class is full. Student was added to the waitlist.'::text;

      return;


    else

      return query

      select
        'full'::text,
        null::uuid,
        null::uuid,
        null::integer,
        null::numeric,
        '[]'::jsonb,
        'Class is full. Offer the user the option to join the waitlist.'::text;

      return;

    end if;

  end if;


  -- ----------------------------------------------------------
  -- CREATE ENROLLMENT
  --
  -- Seat is secured immediately.
  -- ----------------------------------------------------------

  insert into public.enrollments (
    student_person_id,
    class_offering_id,
    household_id,
    registered_by_person_id,
    status,
    fee_amount_snapshot
  )
  values (
    p_student_person_id,
    p_class_offering_id,
    p_household_id,
    p_registered_by_person_id,
    'enrolled',
    v_offering.fee
  )

  returning id
  into v_enrollment_id;


  -- ----------------------------------------------------------
  -- PROMOTE/REMOVE ACTIVE WAITLIST STATE
  -- ----------------------------------------------------------

  update public.waitlist_entries

  set
    status = 'promoted',
    promoted_at = now()

  where student_person_id =
        p_student_person_id

    and class_offering_id =
        p_class_offering_id

    and status in (
      'waiting',
      'offered'
    );


  -- ----------------------------------------------------------
  -- SCHEDULE CONFLICT WARNING
  --
  -- Conflict does NOT block registration.
  -- ----------------------------------------------------------

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'enrollment_id',
          c.conflicting_enrollment_id,

        'class_offering_id',
          c.conflicting_class_offering_id,

        'course_title',
          c.conflicting_course_title,

        'day_of_week',
          c.day_of_week,

        'proposed_start_time',
          c.proposed_start_time,

        'proposed_duration_minutes',
          c.proposed_duration_minutes,

        'conflicting_start_time',
          c.conflicting_start_time,

        'conflicting_duration_minutes',
          c.conflicting_duration_minutes
      )
    ),
    '[]'::jsonb
  )

  into v_conflicts

  from public.get_registration_schedule_conflicts(
    p_student_person_id,
    p_class_offering_id
  ) c;


  return query

  select
    'enrolled'::text,
    v_enrollment_id,
    null::uuid,
    null::integer,
    v_offering.fee,
    v_conflicts,

    case

      when jsonb_array_length(v_conflicts) > 0
      then
        'Enrollment secured. Student has one or more schedule conflicts.'

      else
        'Enrollment secured.'

    end;

end;

$function$;


-- ============================================================
-- 6. MEMBER-FACING REGISTRATION WRAPPER
--
-- Only the authenticated user's linked person identity is passed
-- to the core function.
--
-- A charge is created ONLY after successful enrollment.
-- Waitlisting creates no charge.
-- ============================================================

create or replace function public.register_my_student_for_offering(
  p_student_person_id uuid,
  p_class_offering_id uuid,
  p_join_waitlist_if_full boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $function$

declare

  v_viewer_id uuid;
  v_household_id uuid;

  v_result record;
  v_charge_id uuid;

begin

  v_viewer_id :=
    private.current_person_id();


  if v_viewer_id is null then

    raise exception
      'Authenticated member is not linked to a person.';

  end if;


  v_household_id :=
    public.get_registration_household_for_student(
      v_viewer_id,
      p_student_person_id
    );


  if v_household_id is null then

    raise exception
      'You may not register this student.';

  end if;


  select *
  into v_result

  from public.register_student_for_offering(
    p_student_person_id,
    p_class_offering_id,
    v_household_id,
    v_viewer_id,
    p_join_waitlist_if_full
  );


  -- ----------------------------------------------------------
  -- BILL ONLY A NEW SUCCESSFUL ENROLLMENT
  -- ----------------------------------------------------------

  if v_result.result = 'enrolled'
     and v_result.enrollment_id is not null
  then

    v_charge_id :=
      public.create_enrollment_charge(
        v_result.enrollment_id
      );

  end if;


  return jsonb_build_object(

    'result',
      v_result.result,

    'enrollment_id',
      v_result.enrollment_id,

    'waitlist_entry_id',
      v_result.waitlist_entry_id,

    'waitlist_position',
      v_result.waitlist_position,

    'charge_id',
      v_charge_id,

    'fee_amount',
      v_result.fee_amount,

    'schedule_conflicts',
      coalesce(
        v_result.schedule_conflicts,
        '[]'::jsonb
      ),

    'message',
      v_result.message

  );

end;

$function$;


-- ============================================================
-- 7. FUNCTION PERMISSIONS
--
-- The low-level registration function accepts an explicit
-- registered_by_person_id. It should therefore NOT be callable
-- directly by a browser user.
--
-- Browser users call register_my_student_for_offering(), which
-- derives their person ID from the authenticated session.
-- ============================================================

revoke all
on function public.register_student_for_offering(
  uuid,
  uuid,
  uuid,
  uuid,
  boolean
)
from public, anon, authenticated;


grant execute
on function public.register_student_for_offering(
  uuid,
  uuid,
  uuid,
  uuid,
  boolean
)
to service_role;


grant execute
on function public.register_my_student_for_offering(
  uuid,
  uuid,
  boolean
)
to authenticated;


grant execute
on function public.get_my_registration_preview(
  uuid,
  uuid
)
to authenticated;


grant execute
on function public.person_can_register_student(
  uuid,
  uuid,
  uuid
)
to authenticated;


grant execute
on function public.get_registration_household_for_student(
  uuid,
  uuid
)
to authenticated;


commit;