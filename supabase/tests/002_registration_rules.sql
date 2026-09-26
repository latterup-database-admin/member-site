begin;

-- ============================================================
-- TEST 002
-- Corrected registration rules
--
-- Tests:
--   1. Junior with no qualifying contribution -> 0 classes
--   2. Approved Youth contribution -> 2 Junior classes
--   3. Third Junior class blocked
--   4. Full Junior contribution coverage -> unlimited
--   5. Age restriction blocks student
--   6. Approved age exception allows registration
--
-- EVERYTHING IS ROLLED BACK AT THE END.
-- ============================================================

do $test$

declare
  v_year_id uuid;

  v_household_id uuid;
  v_parent_id uuid;
  v_junior_id uuid;

  v_youth_opp_id uuid;
  v_junior_opp_id uuid;

  v_youth_app_id uuid;
  v_junior_app_id uuid;

  v_course_id uuid;

  v_offering_1 uuid;
  v_offering_2 uuid;
  v_offering_3 uuid;
  v_offering_4 uuid;
  v_age_offering uuid;

  v_result record;
  v_status record;

begin

  -- ----------------------------------------------------------
  -- SCHOOL YEAR
  -- ----------------------------------------------------------

  select id
  into v_year_id
  from public.school_years
  where name = '2026-2027';

  if v_year_id is null then
    raise exception 'TEST FAILED: 2026-2027 school year missing.';
  end if;


  -- ----------------------------------------------------------
  -- TEST HOUSEHOLD + PEOPLE
  -- ----------------------------------------------------------

  insert into public.households (
    family_name,
    status
  )
  values (
    '__TEST 009C1 FAMILY__',
    'active'
  )
  returning id into v_household_id;


  insert into public.people (
    first_name,
    last_name,
    member_type,
    status
  )
  values (
    'Test',
    'Adult',
    'adult',
    'active'
  )
  returning id into v_parent_id;


  insert into public.people (
    first_name,
    last_name,
    birth_date,
    member_type,
    status
  )
  values (
    'Test',
    'Junior',
    '2016-01-01',
    'junior',
    'active'
  )
  returning id into v_junior_id;


  insert into public.household_members (
    household_id,
    person_id,
    relationship_type,
    is_guardian,
    can_manage_household
  )
  values
    (
      v_household_id,
      v_parent_id,
      'adult',
      true,
      true
    ),
    (
      v_household_id,
      v_junior_id,
      'child',
      false,
      false
    );


  -- Explicit new child-specific authorization.

  insert into public.student_guardian_access (
    household_id,
    adult_person_id,
    student_person_id,
    relationship_type,
    is_guardian,
    can_view_student,
    can_manage_student,
    can_register_student
  )
  values (
    v_household_id,
    v_parent_id,
    v_junior_id,
    'parent',
    true,
    true,
    true,
    true
  );


  -- ----------------------------------------------------------
  -- COMPLETE THE NON-CONTRIBUTION REENROLLMENT REQUIREMENTS
  -- ----------------------------------------------------------

  insert into public.household_membership_years (
    household_id,
    school_year_id,
    status,
    dues_status,
    reenrollment_material_acknowledged_at,
    reenrollment_material_acknowledged_by_person_id,
    reenrollment_material_method
  )
  values (
    v_household_id,
    v_year_id,
    'active',
    'paid',
    now(),
    v_parent_id,
    'meeting'
  );


  -- ----------------------------------------------------------
  -- REGISTRATION WINDOWS
  --
  -- Make both programs open for the duration of this test.
  -- ----------------------------------------------------------

  insert into public.registration_windows (
    school_year_id,
    program,
    opens_at,
    closes_at
  )
  values
    (
      v_year_id,
      'junior',
      now() - interval '1 day',
      now() + interval '1 day'
    ),
    (
      v_year_id,
      'youth',
      now() - interval '1 day',
      now() + interval '1 day'
    );


  -- ----------------------------------------------------------
  -- TEST 1:
  -- No contribution -> Junior should NOT be eligible.
  -- ----------------------------------------------------------

  select *
  into v_status
  from public.get_household_registration_status(
    v_household_id,
    v_year_id,
    'junior',
    now()
  );


  if v_status.eligible then
    raise exception
      'TEST FAILED: Junior household was eligible without contribution.';
  end if;


  if v_status.effective_class_limit <> 0 then
    raise exception
      'TEST FAILED: Expected Junior class limit 0, got %.',
      v_status.effective_class_limit;
  end if;


  raise notice
    'PASS 1: No contribution = no Junior registration.';


  -- ----------------------------------------------------------
  -- YOUTH CONTRIBUTION OPPORTUNITY
  -- ----------------------------------------------------------

  insert into public.contribution_opportunities (
  school_year_id,
  title,
  contribution_type,
  status
)
  values (
    v_year_id,
    '__TEST YOUTH CONTRIBUTION__',
    'youth',
    'open'
  )
  returning id into v_youth_opp_id;


  insert into public.contribution_registration_benefits (
    contribution_opportunity_id,
    program,
    benefit_type
  )
  values (
    v_youth_opp_id,
    'youth',
    'unlock_registration'
  );


  insert into public.contribution_applications (
    household_id,
    school_year_id,
    contribution_opportunity_id,
    submitted_by_person_id,
    status
  )
  values (
    v_household_id,
    v_year_id,
    v_youth_opp_id,
    v_parent_id,
    'approved'
  )
  returning id into v_youth_app_id;


  insert into public.contribution_assignments (
    household_id,
    school_year_id,
    contribution_opportunity_id,
    contribution_application_id,
    person_id,
    status
  )
  values (
    v_household_id,
    v_year_id,
    v_youth_opp_id,
    v_youth_app_id,
    v_parent_id,
    'approved'
  );


  -- ----------------------------------------------------------
  -- TEST 2:
  -- Youth contribution -> exactly 2 Junior classes.
  -- ----------------------------------------------------------

  select *
  into v_status
  from public.get_household_registration_status(
    v_household_id,
    v_year_id,
    'junior',
    now()
  );


  if not v_status.eligible then
    raise exception
      'TEST FAILED: Youth contribution did not unlock Junior registration: %',
      v_status.blocking_reason;
  end if;


  if v_status.unlimited_classes then
    raise exception
      'TEST FAILED: Youth contribution incorrectly granted unlimited Junior registration.';
  end if;


  if v_status.effective_class_limit <> 2 then
    raise exception
      'TEST FAILED: Expected Junior limit 2, got %.',
      v_status.effective_class_limit;
  end if;


  raise notice
    'PASS 2: Approved Youth contribution = 2 Junior classes.';


  -- ----------------------------------------------------------
  -- CREATE TEST COURSE + FOUR NORMAL JUNIOR OFFERINGS
  -- ----------------------------------------------------------

  insert into public.courses (
    title,
    program,
    status
  )
  values (
    '__TEST JUNIOR COURSE__',
    'junior',
    'active'
  )
  returning id into v_course_id;


  insert into public.class_offerings (
    course_id,
    school_year_id,
    program,
    offering_period,
    starts_on,
    ends_on,
    max_enrollment,
    fee,
    minimum_age,
    maximum_age,
    status,
    catalog_published_at
  )
  values (
    v_course_id,
    v_year_id,
    'junior',
    'fall_session_1',
    '2026-08-24',
    '2026-10-01',
    20,
    0,
    5,
    18,
    'registration_open',
    now()
  )
  returning id into v_offering_1;


  insert into public.class_offerings (
    course_id, school_year_id, program, offering_period,
    starts_on, ends_on, max_enrollment, fee,
    minimum_age, maximum_age, status, catalog_published_at
  )
  values (
    v_course_id, v_year_id, 'junior', 'fall_session_2',
    '2026-10-05', '2026-11-12', 20, 0,
    5, 18, 'registration_open', now()
  )
  returning id into v_offering_2;


  insert into public.class_offerings (
    course_id, school_year_id, program, offering_period,
    starts_on, ends_on, max_enrollment, fee,
    minimum_age, maximum_age, status, catalog_published_at
  )
  values (
    v_course_id, v_year_id, 'junior', 'spring_session_1',
    '2027-01-04', '2027-02-11', 20, 0,
    5, 18, 'registration_open', now()
  )
  returning id into v_offering_3;


  insert into public.class_offerings (
    course_id, school_year_id, program, offering_period,
    starts_on, ends_on, max_enrollment, fee,
    minimum_age, maximum_age, status, catalog_published_at
  )
  values (
    v_course_id, v_year_id, 'junior', 'spring_session_2',
    '2027-02-15', '2027-04-22', 20, 0,
    5, 18, 'registration_open', now()
  )
  returning id into v_offering_4;


  -- ----------------------------------------------------------
  -- REGISTER FIRST TWO
  -- ----------------------------------------------------------

  select *
  into v_result
  from public.register_student_for_offering(
    v_junior_id,
    v_offering_1,
    v_household_id,
    v_parent_id,
    false
  );

  if v_result.result <> 'enrolled' then
    raise exception 'TEST FAILED: First Junior registration failed.';
  end if;


  select *
  into v_result
  from public.register_student_for_offering(
    v_junior_id,
    v_offering_2,
    v_household_id,
    v_parent_id,
    false
  );

  if v_result.result <> 'enrolled' then
    raise exception 'TEST FAILED: Second Junior registration failed.';
  end if;


  raise notice
    'PASS 3: First two Junior registrations succeeded.';


  -- ----------------------------------------------------------
  -- TEST 3:
  -- THIRD CLASS MUST BE BLOCKED
  -- ----------------------------------------------------------

  begin

    perform *
    from public.register_student_for_offering(
      v_junior_id,
      v_offering_3,
      v_household_id,
      v_parent_id,
      false
    );

    raise exception
      'TEST FAILED: Third Junior registration incorrectly succeeded.';

  exception

    when others then

      if sqlerrm like
        'Junior student has reached the class limit%'
      then

        raise notice
          'PASS 4: Third Junior class correctly blocked.';

      else

        raise;

      end if;

  end;


  -- ----------------------------------------------------------
  -- CREATE JUNIOR CONTRIBUTION WITH ALL FOUR SESSION COVERAGES
  -- ----------------------------------------------------------

  insert into public.contribution_opportunities (
  school_year_id,
  title,
  contribution_type,
  status
)
  values (
    v_year_id,
    '__TEST JUNIOR CONTRIBUTION__',
    'junior',
    'open'
  )
  returning id into v_junior_opp_id;


  insert into public.contribution_junior_session_coverage (
    contribution_opportunity_id,
    session
  )
  values
    (v_junior_opp_id, 'fall_session_1'),
    (v_junior_opp_id, 'fall_session_2'),
    (v_junior_opp_id, 'spring_session_1'),
    (v_junior_opp_id, 'spring_session_2');


  insert into public.contribution_applications (
    household_id,
    school_year_id,
    contribution_opportunity_id,
    submitted_by_person_id,
    status
  )
  values (
    v_household_id,
    v_year_id,
    v_junior_opp_id,
    v_parent_id,
    'approved'
  )
  returning id into v_junior_app_id;


  insert into public.contribution_assignments (
    household_id,
    school_year_id,
    contribution_opportunity_id,
    contribution_application_id,
    person_id,
    status
  )
  values (
    v_household_id,
    v_year_id,
    v_junior_opp_id,
    v_junior_app_id,
    v_parent_id,
    'approved'
  );


  select *
  into v_status
  from public.get_household_registration_status(
    v_household_id,
    v_year_id,
    'junior',
    now()
  );


  if not v_status.unlimited_classes then
    raise exception
      'TEST FAILED: Four-session Junior coverage did not grant unlimited registration.';
  end if;


  if v_status.effective_class_limit is not null then
    raise exception
      'TEST FAILED: Unlimited Junior registration should have NULL effective limit.';
  end if;


  -- Third class should now work.

  select *
  into v_result
  from public.register_student_for_offering(
    v_junior_id,
    v_offering_3,
    v_household_id,
    v_parent_id,
    false
  );


  if v_result.result <> 'enrolled' then
    raise exception
      'TEST FAILED: Third Junior registration did not succeed after unlimited benefit.';
  end if;


  raise notice
    'PASS 5: Full four-session Junior coverage = unlimited.';


  -- ----------------------------------------------------------
  -- AGE-RESTRICTED OFFERING
  --
  -- Test Junior is about 10. Require age 15+.
  -- ----------------------------------------------------------

  insert into public.class_offerings (
    course_id,
    school_year_id,
    program,
    offering_period,
    starts_on,
    ends_on,
    max_enrollment,
    fee,
    minimum_age,
    maximum_age,
    status,
    catalog_published_at
  )
  values (
    v_course_id,
    v_year_id,
    'junior',
    'spring_session_2',
    '2027-02-15',
    '2027-04-22',
    20,
    0,
    15,
    18,
    'registration_open',
    now()
  )
  returning id into v_age_offering;


  if public.student_is_age_eligible_for_offering(
    v_junior_id,
    v_age_offering
  ) then

    raise exception
      'TEST FAILED: Under-age student incorrectly passed normal age eligibility.';

  end if;


  raise notice
    'PASS 6: Age restriction correctly blocks student.';


  -- ----------------------------------------------------------
  -- APPROVE AN EXCEPTION DIRECTLY FOR DATABASE TESTING
  --
  -- The browser-facing request/review RPCs require an actual
  -- authenticated Supabase user, so those are tested separately
  -- in the app.
  -- ----------------------------------------------------------

  insert into public.class_eligibility_exception_requests (
    class_offering_id,
    student_person_id,
    household_id,
    requested_by_person_id,
    reason,
    status,
    reviewed_by_person_id,
    reviewed_at,
    review_notes
  )
  values (
    v_age_offering,
    v_junior_id,
    v_household_id,
    v_parent_id,
    'Transactional test exception.',
    'approved',
    v_parent_id,
    now(),
    'Approved only inside rolled-back test.'
  );


  if not public.student_is_age_eligible_for_offering(
    v_junior_id,
    v_age_offering
  ) then

    raise exception
      'TEST FAILED: Approved age exception did not grant age eligibility.';

  end if;


  select *
  into v_result
  from public.register_student_for_offering(
    v_junior_id,
    v_age_offering,
    v_household_id,
    v_parent_id,
    false
  );


  if v_result.result <> 'enrolled' then

    raise exception
      'TEST FAILED: Registration failed despite approved age exception.';

  end if;


  raise notice
    'PASS 7: Approved age exception allows registration without bypassing other registration gates.';


  raise notice
    '==============================================';

  raise notice
    'ALL 009C1 REGISTRATION TESTS PASSED';

  raise notice
    '==============================================';

end;

$test$;


-- IMPORTANT:
-- Delete all fake test records created above.
rollback;