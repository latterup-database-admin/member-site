-- ============================================================
-- PATCH 009B
-- Contribution / reenrollment / Junior registration rules
--
-- Implements:
--
-- 1. Annual reenrollment requires:
--      meeting/material acknowledged
--      dues satisfied
--      contribution declared
--      contribution approved
--
-- 2. Youth:
--      approved Youth contribution unlocks Youth registration
--
-- 3. Junior:
--      approved Youth contribution = 2 Junior classes
--      PER Junior child
--
--      approved Junior contribution coverage across:
--        fall_session_1
--        fall_session_2
--        spring_session_1
--        spring_session_2
--      = unlimited Junior registration
--
--      otherwise = no Junior registration
--
-- ============================================================

begin;


-- ============================================================
-- 1. JUNIOR CONTRIBUTION SESSION COVERAGE
--
-- A contribution opportunity may cover one or more Junior
-- sessions.
--
-- Coverage belongs to the opportunity itself, not its title.
-- ============================================================

create table if not exists
  public.contribution_junior_session_coverage (

    id uuid primary key default gen_random_uuid(),

    contribution_opportunity_id uuid not null
      references public.contribution_opportunities(id)
      on delete cascade,

    session text not null,

    created_at timestamptz not null default now(),

    constraint contribution_junior_session_coverage_session_check
      check (
        session = any (
          array[
            'fall_session_1'::text,
            'fall_session_2'::text,
            'spring_session_1'::text,
            'spring_session_2'::text
          ]
        )
      ),

    constraint contribution_junior_session_coverage_unique
      unique (
        contribution_opportunity_id,
        session
      )
  );


create index if not exists
  idx_contribution_junior_session_coverage_opportunity
on public.contribution_junior_session_coverage (
  contribution_opportunity_id
);


comment on table
  public.contribution_junior_session_coverage
is
  'Explicit Junior session coverage supplied by a contribution opportunity. Full coverage of all four Junior sessions grants unlimited Junior registration.';


-- ============================================================
-- 2. HELPER:
--    DOES HOUSEHOLD HAVE AN APPROVED YOUTH CONTRIBUTION?
--
-- An approved/active/completed assignment counts.
--
-- The opportunity must explicitly provide the Youth
-- unlock_registration benefit.
-- ============================================================

create or replace function
  public.household_has_approved_youth_contribution(
    p_household_id uuid,
    p_school_year_id uuid
  )
returns boolean
language sql
stable
set search_path = public
as $function$

  select exists (

    select 1

    from public.contribution_assignments ca

    join public.contribution_registration_benefits crb
      on crb.contribution_opportunity_id =
         ca.contribution_opportunity_id

    where ca.household_id = p_household_id

      and ca.school_year_id =
          p_school_year_id

      and ca.status in (
        'approved',
        'active',
        'completed'
      )

      and crb.program = 'youth'

      and crb.benefit_type =
          'unlock_registration'
  );

$function$;


-- ============================================================
-- 3. HELPER:
--    WHICH JUNIOR SESSIONS DOES THIS HOUSEHOLD COVER?
-- ============================================================

create or replace function
  public.get_household_junior_session_coverage(
    p_household_id uuid,
    p_school_year_id uuid
  )
returns table (
  session text
)
language sql
stable
set search_path = public
as $function$

  select distinct
    cjsc.session

  from public.contribution_assignments ca

  join public.contribution_junior_session_coverage cjsc
    on cjsc.contribution_opportunity_id =
       ca.contribution_opportunity_id

  where ca.household_id =
        p_household_id

    and ca.school_year_id =
        p_school_year_id

    and ca.status in (
      'approved',
      'active',
      'completed'
    );

$function$;


-- ============================================================
-- 4. HELPER:
--    DOES HOUSEHOLD COVER ALL FOUR JUNIOR SESSIONS?
-- ============================================================

create or replace function
  public.household_has_full_junior_coverage(
    p_household_id uuid,
    p_school_year_id uuid
  )
returns boolean
language sql
stable
set search_path = public
as $function$

  select
    count(distinct coverage.session) = 4

  from public.get_household_junior_session_coverage(
    p_household_id,
    p_school_year_id
  ) coverage

  where coverage.session in (
    'fall_session_1',
    'fall_session_2',
    'spring_session_1',
    'spring_session_2'
  );

$function$;


-- ============================================================
-- 5. CONTRIBUTION DECLARATION
--
-- A contribution is considered declared once the household has
-- actually submitted it.
--
-- Drafts do NOT satisfy reenrollment.
-- Denied/withdrawn applications do NOT satisfy it.
-- ============================================================

create or replace function
  public.household_has_declared_contribution(
    p_household_id uuid,
    p_school_year_id uuid
  )
returns boolean
language sql
stable
set search_path = public
as $function$

  select exists (

    select 1

    from public.contribution_applications ca

    where ca.household_id =
          p_household_id

      and ca.school_year_id =
          p_school_year_id

      and ca.status in (
        'submitted',
        'under_review',
        'approved'
      )
  );

$function$;


-- ============================================================
-- 6. CONTRIBUTION APPROVAL
--
-- Approval may be represented by the approved application or
-- the resulting approved/active/completed assignment.
-- ============================================================

create or replace function
  public.household_has_approved_contribution(
    p_household_id uuid,
    p_school_year_id uuid
  )
returns boolean
language sql
stable
set search_path = public
as $function$

  select

    exists (
      select 1
      from public.contribution_applications ca
      where ca.household_id =
            p_household_id

        and ca.school_year_id =
            p_school_year_id

        and ca.status = 'approved'
    )

    or

    exists (
      select 1
      from public.contribution_assignments ca
      where ca.household_id =
            p_household_id

        and ca.school_year_id =
            p_school_year_id

        and ca.status in (
          'approved',
          'active',
          'completed'
        )
    );

$function$;


-- ============================================================
-- 7. ANNUAL REENROLLMENT STATUS
--
-- Return each requirement independently so the portal can tell
-- the family exactly what remains.
-- ============================================================

create or replace function
  public.get_household_reenrollment_status(
    p_household_id uuid,
    p_school_year_id uuid
  )
returns table (

  household_id uuid,
  school_year_id uuid,

  meeting_acknowledged boolean,
  dues_satisfied boolean,
  contribution_declared boolean,
  contribution_approved boolean,

  reenrollment_complete boolean
)
language plpgsql
stable
set search_path = public
as $function$

declare

  v_membership
    public.household_membership_years%rowtype;

  v_meeting boolean := false;
  v_dues boolean := false;
  v_declared boolean := false;
  v_approved boolean := false;

begin

  select hmy.*
  into v_membership

  from public.household_membership_years hmy

  where hmy.household_id =
        p_household_id

    and hmy.school_year_id =
        p_school_year_id;


  if found then

    v_meeting :=
      v_membership
        .reenrollment_material_acknowledged_at
      is not null;


    v_dues :=
      v_membership.dues_status in (
        'paid',
        'waived'
      );

  end if;


  v_declared :=
    public.household_has_declared_contribution(
      p_household_id,
      p_school_year_id
    );


  v_approved :=
    public.household_has_approved_contribution(
      p_household_id,
      p_school_year_id
    );


  return query

  select

    p_household_id,
    p_school_year_id,

    v_meeting,
    v_dues,
    v_declared,
    v_approved,

    (
      v_meeting
      and v_dues
      and v_declared
      and v_approved
    );

end;

$function$;


-- ============================================================
-- 8. REMOVE THE OLD BLANKET JUNIOR BASE LIMIT
--
-- The previous seeded rule gave Juniors a base allowance of 2.
--
-- That is no longer correct.
--
-- The two-class allowance is earned through an approved Youth
-- contribution and is calculated dynamically below.
-- ============================================================

update public.registration_program_rules

set
  base_class_limit = 0,
  requires_contribution_to_register = true,
  updated_at = now()

where program = 'junior';


-- ============================================================
-- 9. REPLACE HOUSEHOLD REGISTRATION STATUS
--
-- Keep the existing return signature so current portal code
-- continues to work.
--
-- Interpretation:
--
-- Junior:
--   full Junior coverage -> unlimited
--   Youth contribution   -> limit 2
--   neither              -> limit 0 / ineligible
--
-- Youth:
--   approved Youth contribution -> registration unlocked
-- ============================================================

create or replace function
  public.get_household_registration_status(
    p_household_id uuid,
    p_school_year_id uuid,
    p_program text,
    p_at timestamptz default now()
  )
returns table (

  household_id uuid,
  school_year_id uuid,
  program text,

  membership_current boolean,
  dues_satisfied boolean,

  registration_window_open boolean,

  contribution_required boolean,
  contribution_satisfied boolean,

  unlimited_classes boolean,

  base_class_limit integer,
  effective_class_limit integer,

  eligible boolean,
  blocking_reason text
)
language plpgsql
stable
set search_path = public
as $function$

declare

  v_membership
    public.household_membership_years%rowtype;

  v_rule
    public.registration_program_rules%rowtype;

  v_reenrollment record;

  v_window_open boolean := false;

  v_membership_current boolean := false;
  v_dues_satisfied boolean := false;

  v_contribution_satisfied boolean := false;

  v_youth_contribution boolean := false;
  v_full_junior_coverage boolean := false;

  v_unlimited boolean := false;

  v_effective_limit integer := 0;

  v_eligible boolean := false;
  v_blocking_reason text;

begin


  if p_program not in (
    'junior',
    'youth'
  ) then

    raise exception
      'Invalid registration program: %',
      p_program;

  end if;


  -- ----------------------------------------------------------
  -- MEMBERSHIP RECORD
  -- ----------------------------------------------------------

  select hmy.*
  into v_membership

  from public.household_membership_years hmy

  where hmy.household_id =
        p_household_id

    and hmy.school_year_id =
        p_school_year_id;


  -- ----------------------------------------------------------
  -- REENROLLMENT COMPONENTS
  -- ----------------------------------------------------------

  select *
  into v_reenrollment

  from public.get_household_reenrollment_status(
    p_household_id,
    p_school_year_id
  );


  if found then

    v_membership_current :=
      v_reenrollment.reenrollment_complete;

    v_dues_satisfied :=
      v_reenrollment.dues_satisfied;

  end if;


  -- ----------------------------------------------------------
  -- PROGRAM RULE
  -- ----------------------------------------------------------

  select rpr.*
  into v_rule

  from public.registration_program_rules rpr

  where rpr.school_year_id =
        p_school_year_id

    and rpr.program =
        p_program;


  if not found then

    raise exception
      'No registration rule exists for program % and school year %.',
      p_program,
      p_school_year_id;

  end if;


  -- ----------------------------------------------------------
  -- REGISTRATION WINDOW
  -- ----------------------------------------------------------

  v_window_open :=
    public.is_registration_window_open(
      p_school_year_id,
      p_program,
      p_at
    );


  -- ----------------------------------------------------------
  -- CONTRIBUTION BENEFITS
  -- ----------------------------------------------------------

  v_youth_contribution :=
    public.household_has_approved_youth_contribution(
      p_household_id,
      p_school_year_id
    );


  v_full_junior_coverage :=
    public.household_has_full_junior_coverage(
      p_household_id,
      p_school_year_id
    );


  -- ----------------------------------------------------------
  -- PROGRAM-SPECIFIC ACCESS
  -- ----------------------------------------------------------

  if p_program = 'youth' then

    v_contribution_satisfied :=
      v_youth_contribution;

    v_unlimited := false;

    -- Youth registration is not class-count limited by this
    -- rule. The contribution is the access gate.
    v_effective_limit := null;


  elsif p_program = 'junior' then

    if v_full_junior_coverage then

      v_contribution_satisfied := true;

      v_unlimited := true;

      v_effective_limit := null;


    elsif v_youth_contribution then

      v_contribution_satisfied := true;

      v_unlimited := false;

      v_effective_limit := 2;


    else

      v_contribution_satisfied := false;

      v_unlimited := false;

      v_effective_limit := 0;

    end if;

  end if;


  -- ----------------------------------------------------------
  -- ELIGIBILITY
  -- ----------------------------------------------------------

  if v_membership.id is null then

    v_eligible := false;

    v_blocking_reason :=
      'Household does not have a membership record for this school year.';


  elsif not
    v_reenrollment.meeting_acknowledged
  then

    v_eligible := false;

    v_blocking_reason :=
      'The annual reenrollment meeting or required material has not been acknowledged.';


  elsif not
    v_reenrollment.dues_satisfied
  then

    v_eligible := false;

    v_blocking_reason :=
      'Annual membership dues have not been paid.';


  elsif not
    v_reenrollment.contribution_declared
  then

    v_eligible := false;

    v_blocking_reason :=
      'The household has not declared its contribution for this school year.';


  elsif not
    v_reenrollment.contribution_approved
  then

    v_eligible := false;

    v_blocking_reason :=
      'The household contribution has not yet been approved.';


  elsif not v_window_open then

    v_eligible := false;

    v_blocking_reason :=
      'Registration is not currently open.';


  elsif not v_contribution_satisfied then

    v_eligible := false;

    if p_program = 'junior' then

      v_blocking_reason :=
        'Junior registration requires either an approved Youth contribution for the two-class allowance or approved Junior contribution coverage for all four Junior sessions.';

    else

      v_blocking_reason :=
        'An approved Youth contribution is required for Youth registration.';

    end if;


  else

    v_eligible := true;
    v_blocking_reason := null;

  end if;


  -- ----------------------------------------------------------
  -- RESULT
  -- ----------------------------------------------------------

  return query

  select

    p_household_id,
    p_school_year_id,
    p_program,

    v_membership_current,
    v_dues_satisfied,

    v_window_open,

    v_rule.requires_contribution_to_register,
    v_contribution_satisfied,

    v_unlimited,

    v_rule.base_class_limit,
    v_effective_limit,

    v_eligible,
    v_blocking_reason;

end;

$function$;


-- ============================================================
-- 10. DOCUMENT OLD PROGRAM-RULE COLUMN
--
-- base_class_limit remains for compatibility/configuration,
-- but Junior's actual effective limit is calculated from
-- contribution status.
-- ============================================================

comment on column
  public.registration_program_rules.base_class_limit
is
  'Default program configuration only. Junior effective class limits are dynamically derived from approved contribution benefits: 0, 2 per Junior child, or unlimited.';


commit;