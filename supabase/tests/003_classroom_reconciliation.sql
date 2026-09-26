begin;

do $test$
declare
  v_year_id uuid;
  v_course_id uuid;
  v_group_id uuid;
  v_person_id uuid;
  v_request_id uuid;

  v_should_execute boolean;
  v_claim_status text;
  v_request_status text;
  v_actual_present boolean;
begin

  -- ==========================================================
  -- FIXTURE
  -- ==========================================================

  select id
  into v_year_id
  from public.school_years
  where name = '2026-2027';

  if v_year_id is null then
    raise exception 'TEST SETUP FAILED: 2026-2027 school year missing.';
  end if;


  insert into public.people (
    first_name,
    last_name,
    member_type
  )
  values (
    '__TEST__',
    'Classroom Reconciliation',
    'adult'
  )
  returning id into v_person_id;


  insert into public.courses (
    program,
    title
  )
  values (
    'junior',
    '__TEST CLASSROOM RECONCILIATION__'
  )
  returning id into v_course_id;


  insert into public.classroom_groups (
    course_id,
    school_year_id,
    name
  )
  values (
    v_course_id,
    v_year_id,
    '__TEST CLASSROOM GROUP__'
  )
  returning id into v_group_id;


  -- ==========================================================
  -- TEST 1
  --
  -- Observed absent + desired absent = no action.
  -- ==========================================================

  insert into public.classroom_membership_sync_state (
    classroom_group_id,
    person_id,
    role,
    actual_present,
    sync_status
  )
  values (
    v_group_id,
    v_person_id,
    'student',
    false,
    'synced'
  );


  if public.get_current_classroom_roster_action(
       v_group_id,
       v_person_id,
       'student'
     ) <> 'none'
  then
    raise exception
      'TEST 1 FAILED: absent/absent should require no action.';
  end if;

  raise notice 'PASS 1: matching absent state requires no action.';


  -- ==========================================================
  -- TEST 2
  --
  -- Simulate a queued ADD that has become stale.
  --
  -- Current desired state is still absent, so claim() must
  -- cancel the request rather than allowing Google execution.
  -- ==========================================================

  insert into public.classroom_roster_sync_requests (
    classroom_group_id,
    person_id,
    role,
    action,
    status
  )
  values (
    v_group_id,
    v_person_id,
    'student',
    'add',
    'pending'
  )
  returning id into v_request_id;


  select
    c.should_execute,
    c.status
  into
    v_should_execute,
    v_claim_status

  from public.claim_classroom_roster_sync(
    v_request_id
  ) c;


  if v_should_execute is distinct from false
     or v_claim_status <> 'cancelled'
  then
    raise exception
      'TEST 2 FAILED: stale ADD was not cancelled.';
  end if;


  select status
  into v_request_status
  from public.classroom_roster_sync_requests
  where id = v_request_id;


  if v_request_status <> 'cancelled' then
    raise exception
      'TEST 2 FAILED: request row was not marked cancelled.';
  end if;

  raise notice 'PASS 2: stale ADD is cancelled before Google execution.';


  -- ==========================================================
  -- TEST 3
  --
  -- Simulate observed PRESENT while desired is absent.
  -- Current required action must therefore be REMOVE.
  -- ==========================================================

  update public.classroom_membership_sync_state
  set
    actual_present = true,
    sync_status = 'synced'
  where classroom_group_id = v_group_id
    and person_id = v_person_id
    and role = 'student';


  if public.get_current_classroom_roster_action(
       v_group_id,
       v_person_id,
       'student'
     ) <> 'remove'
  then
    raise exception
      'TEST 3 FAILED: desired absent / actual present should require REMOVE.';
  end if;

  raise notice 'PASS 3: actual-present/desired-absent requires REMOVE.';


  -- ==========================================================
  -- TEST 4
  --
  -- A currently valid REMOVE should successfully claim.
  -- ==========================================================

  insert into public.classroom_roster_sync_requests (
    classroom_group_id,
    person_id,
    role,
    action,
    status
  )
  values (
    v_group_id,
    v_person_id,
    'student',
    'remove',
    'pending'
  )
  returning id into v_request_id;


  select
    c.should_execute,
    c.status
  into
    v_should_execute,
    v_claim_status

  from public.claim_classroom_roster_sync(
    v_request_id
  ) c;


  if v_should_execute is distinct from true
     or v_claim_status <> 'processing'
  then
    raise exception
      'TEST 4 FAILED: valid REMOVE was not claimed.';
  end if;

  raise notice 'PASS 4: valid REMOVE is claimed for execution.';


  -- ==========================================================
  -- TEST 5
  --
  -- A failed REMOVE must preserve our last observed state.
  --
  -- We currently believe the student IS present. A Google
  -- removal failure cannot change that belief to absent.
  -- ==========================================================

  perform public.fail_classroom_roster_sync(
    v_request_id,
    '__TEST GOOGLE FAILURE__'
  );


  select actual_present
  into v_actual_present
  from public.classroom_membership_sync_state
  where classroom_group_id = v_group_id
    and person_id = v_person_id
    and role = 'student';


  if v_actual_present is distinct from true then
    raise exception
      'TEST 5 FAILED: failed REMOVE incorrectly changed observed state.';
  end if;


  select status
  into v_request_status
  from public.classroom_roster_sync_requests
  where id = v_request_id;


  if v_request_status <> 'error' then
    raise exception
      'TEST 5 FAILED: failed request was not marked error.';
  end if;

  raise notice 'PASS 5: failed REMOVE preserves observed membership.';


  -- ==========================================================
  -- TEST 6
  --
  -- Successful REMOVE updates observed state to absent.
  -- ==========================================================

  insert into public.classroom_roster_sync_requests (
    classroom_group_id,
    person_id,
    role,
    action,
    status
  )
  values (
    v_group_id,
    v_person_id,
    'student',
    'remove',
    'pending'
  )
  returning id into v_request_id;


  select
    c.should_execute,
    c.status
  into
    v_should_execute,
    v_claim_status

  from public.claim_classroom_roster_sync(
    v_request_id
  ) c;


  if v_should_execute is distinct from true then
    raise exception
      'TEST 6 FAILED: valid REMOVE could not be claimed.';
  end if;


  perform public.complete_classroom_roster_sync(
    v_request_id
  );


  select actual_present
  into v_actual_present
  from public.classroom_membership_sync_state
  where classroom_group_id = v_group_id
    and person_id = v_person_id
    and role = 'student';


  if v_actual_present is distinct from false then
    raise exception
      'TEST 6 FAILED: successful REMOVE did not update observed state.';
  end if;

  raise notice 'PASS 6: successful REMOVE updates observed state.';


  -- ==========================================================
  -- TEST 7
  --
  -- A completed request cannot accidentally be completed again.
  -- ==========================================================

  begin

    perform public.complete_classroom_roster_sync(
      v_request_id
    );

    raise exception
      'TEST 7 FAILED: completed request was allowed to complete twice.';

  exception
    when others then

      if sqlerrm like
         'Classroom roster request % cannot be completed from status completed.%'
      then
        raise notice
          'PASS 7: completed request cannot be completed twice.';
      else
        raise;
      end if;

  end;


  raise notice 'ALL 009F RECONCILIATION TESTS PASSED.';

end;
$test$;

rollback;