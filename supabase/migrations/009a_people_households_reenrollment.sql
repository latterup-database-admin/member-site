-- ============================================================
-- PATCH 009A
-- People / household access / reenrollment foundation
-- ============================================================

begin;


-- ============================================================
-- 1. PERSON TYPE
--
-- Replace "parent" as the core adult identity with "adult".
-- Parent/guardian status belongs to relationships/access,
-- not the person's fundamental type.
-- ============================================================

alter table public.people
  drop constraint if exists people_member_type_check;


update public.people
set member_type = 'adult'
where member_type = 'parent';


alter table public.people
  add constraint people_member_type_check
  check (
    member_type = any (
      array[
        'adult'::text,
        'junior'::text,
        'youth'::text
      ]
    )
  );


-- ============================================================
-- 2. EXPLICIT STUDENT ACCESS
--
-- Household membership alone must not imply that an adult may
-- view/manage every child in the household.
--
-- This table represents explicit adult -> student permissions.
-- ============================================================

create table if not exists public.student_guardian_access (
  id uuid primary key default gen_random_uuid(),

  household_id uuid not null
    references public.households(id)
    on delete cascade,

  adult_person_id uuid not null
    references public.people(id)
    on delete cascade,

  student_person_id uuid not null
    references public.people(id)
    on delete cascade,

  relationship_type text,

  is_guardian boolean not null default false,

  can_view_student boolean not null default true,

  can_manage_student boolean not null default false,

  can_register_student boolean not null default false,

  receives_student_communications boolean not null default false,

  starts_at date,
  ends_at date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint student_guardian_access_unique
    unique (
      household_id,
      adult_person_id,
      student_person_id
    ),

  constraint student_guardian_access_not_self
    check (
      adult_person_id <> student_person_id
    ),

  constraint student_guardian_access_dates_valid
    check (
      starts_at is null
      or ends_at is null
      or ends_at >= starts_at
    )
);


-- ============================================================
-- 3. HOUSEHOLD MEMBERSHIP REMAINS GENERAL
--
-- Existing household_members continues to describe whether a
-- person belongs to a household.
--
-- Its current is_guardian/can_manage_household fields can remain
-- during migration for compatibility, but student-specific access
-- should increasingly use student_guardian_access.
-- ============================================================


-- ============================================================
-- 4. REENROLLMENT MEETING / MATERIAL ACKNOWLEDGMENT
--
-- Reenrollment now requires:
--   1. meeting/material acknowledgment
--   2. dues paid
--   3. contribution declared
--   4. contribution approved
--
-- Contribution declaration/approval remain sourced from the
-- contribution tables; this table stores the reenrollment-specific
-- meeting requirement.
-- ============================================================

alter table public.household_membership_years
  add column if not exists
    reenrollment_material_acknowledged_at timestamptz;

alter table public.household_membership_years
  add column if not exists
    reenrollment_material_acknowledged_by_person_id uuid
      references public.people(id)
      on delete set null;


-- Optional operational metadata describing HOW it was satisfied.
alter table public.household_membership_years
  add column if not exists
    reenrollment_material_method text;


alter table public.household_membership_years
  drop constraint if exists
    household_membership_years_reenrollment_material_method_check;


alter table public.household_membership_years
  add constraint
    household_membership_years_reenrollment_material_method_check
  check (
    reenrollment_material_method is null
    or reenrollment_material_method = any (
      array[
        'meeting'::text,
        'watched_material'::text,
        'admin_override'::text
      ]
    )
  );


-- ============================================================
-- 5. DO NOT TREAT REENROLLED_AT AS THE SOURCE OF TRUTH
--
-- Keep the existing column for history/backward compatibility.
-- Future eligibility will calculate completion from the actual
-- component requirements.
-- ============================================================

comment on column
  public.household_membership_years.reenrolled_at
is
  'Historical/completion timestamp. Reenrollment eligibility must be calculated from individual requirements rather than inferred solely from this field.';


comment on column
  public.household_membership_years.reenrollment_material_acknowledged_at
is
  'Timestamp when the household satisfied the annual reenrollment meeting/material requirement.';


-- ============================================================
-- 6. HOUSEHOLD/PERSON IDENTITIES ARE PERSISTENT
--
-- No schema rewrite is required here:
--
-- households.id is already persistent
-- people.id is already persistent
-- household_membership_years provides the annual layer
--
-- Add comments to make the design intent explicit.
-- ============================================================

comment on table public.households
is
  'Persistent household identity. Annual membership status belongs in household_membership_years; households are not recreated when a family skips a year or becomes inactive.';


comment on table public.people
is
  'Persistent person identity. A person retains this record through inactive periods and later return.';


comment on table public.household_membership_years
is
  'One annual household membership record per school year. Stores annual status and reenrollment requirement state without replacing the persistent household.';


-- ============================================================
-- 7. INDEXES FOR STUDENT ACCESS LOOKUPS
-- ============================================================

create index if not exists
  idx_student_guardian_access_adult
on public.student_guardian_access (
  adult_person_id,
  household_id
);


create index if not exists
  idx_student_guardian_access_student
on public.student_guardian_access (
  student_person_id,
  household_id
);


commit;