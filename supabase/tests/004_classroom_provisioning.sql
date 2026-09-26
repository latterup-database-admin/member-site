begin;

do $test$

declare
  v_year_id uuid;
  v_course_id uuid;
  v_group_id uuid;

  v_request_id uuid;
  v_archive_request_id uuid;
  v_stale_request_id uuid;

  v_should_execute boolean;
  v_claim_status text;
  v_claim_action text;

  v_name text;
  v_program text;
  v_system_teacher text;

  v_google_course_id text;
  v_course_state text;
  v_desired_state text;

begin

  -- ==========================================================
  -- FIXTURE
  -- ==========================================================

  select id
  into v_year_id
  from public.school_years
  where name = '2026-2027';

  if v_year_id is null then
    raise exception
      'TEST SETUP FAILED: 2026-2027 school year missing.';
  end if;


  insert into public.courses (
    title,
    program,
    status
  )
  values (
    '__TEST CLASSROOM PROVISIONING__',
    'junior',
    'active'
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
    '__TEST JUNIOR CLASSROOM__'
  )
  returning id into v_group_id;


  -- ==========================================================
  -- TEST 1
  -- Provisioning spec chooses the correct program,
  -- configured name, and Junior organizational teacher.
  -- ==========================================================

  select
    spec.classroom_name,
    spec.program,
    spec.system_teacher_email,
    spec.desired_google_state

  into
    v_name,
    v_program,
    v_system_teacher,
    v_desired_state

  from public.get_classroom_provisioning_spec(
    v_group_id
  ) spec;


  if v_name <> '__TEST JUNIOR CLASSROOM__' then
    raise exception
      'TEST 1 FAILED: unexpected Classroom name: %',
      v_name;
  end if;


  if v_program <> 'junior' then
    raise exception
      'TEST 1 FAILED: expected junior program, got %.',
      v_program;
  end if;


  if v_system_teacher <>
     'juniors@latterup.org'
  then
    raise exception
      'TEST 1 FAILED: expected juniors@latterup.org, got %.',
      v_system_teacher;
  end if;


  if v_desired_state <>
     'not_provisioned'
  then
    raise exception
      'TEST 1 FAILED: new group should begin not_provisioned.';
  end if;


  raise notice
    'PASS 1: Junior Classroom provisioning spec is correct.';


  -- ==========================================================
  -- TEST 2
  -- Requesting provisioning should:
  --   desired state -> active
  --   queue CREATE
  -- ==========================================================

  v_request_id :=
    public.request_classroom_provisioning(
      v_group_id,
      null
    );


  if v_request_id is null then
    raise exception
      'TEST 2 FAILED: provisioning did not queue a request.';
  end if;


  select desired_google_state
  into v_desired_state
  from public.classroom_groups
  where id = v_group_id;


  if v_desired_state <> 'active' then
    raise exception
      'TEST 2 FAILED: desired state was not set to active.';
  end if;


  if public.get_current_classroom_provisioning_action(
       v_group_id
     ) <> 'create'
  then
    raise exception
      'TEST 2 FAILED: current required action should be CREATE.';
  end if;


  raise notice
    'PASS 2: provisioning request correctly queues CREATE.';


  -- ==========================================================
  -- TEST 3
  -- Valid CREATE request can be claimed.
  -- ==========================================================

  select
    c.should_execute,
    c.status,
    c.action,
    c.classroom_name,
    c.program,
    c.system_teacher_email

  into
    v_should_execute,
    v_claim_status,
    v_claim_action,
    v_name,
    v_program,
    v_system_teacher

  from public.claim_classroom_provisioning(
    v_request_id
  ) c;


  if v_should_execute is distinct from true then
    raise exception
      'TEST 3 FAILED: valid CREATE was not executable.';
  end if;


  if v_claim_status <> 'processing' then
    raise exception
      'TEST 3 FAILED: claimed request did not enter processing.';
  end if;


  if v_claim_action <> 'create' then
    raise exception
      'TEST 3 FAILED: expected create action, got %.',
      v_claim_action;
  end if;


  if v_system_teacher <>
     'juniors@latterup.org'
  then
    raise exception
      'TEST 3 FAILED: claimed request has wrong system teacher.';
  end if;


  raise notice
    'PASS 3: valid CREATE request is safely claimed.';


  -- ==========================================================
  -- TEST 4
  -- Simulate successful Google Classroom creation.
  --
  -- The real worker will do:
  --   create Classroom
  --   add juniors@latterup.org
  --   then call this completion function.
  -- ==========================================================

  perform public.complete_classroom_provisioning(
    v_request_id,
    '__TEST_GOOGLE_COURSE_001__',
    'https://classroom.google.com/c/__TEST__',
    'ACTIVE'
  );


  select
    gc.google_course_id,
    gc.course_state,
    gc.display_name,
    gc.system_teacher_email

  into
    v_google_course_id,
    v_course_state,
    v_name,
    v_system_teacher

  from public.google_classrooms gc

  where gc.classroom_group_id =
        v_group_id;


  if v_google_course_id <>
     '__TEST_GOOGLE_COURSE_001__'
  then
    raise exception
      'TEST 4 FAILED: Google course ID was not recorded.';
  end if;


  if v_course_state <> 'ACTIVE' then
    raise exception
      'TEST 4 FAILED: expected ACTIVE Classroom.';
  end if;


  if v_name <>
     '__TEST JUNIOR CLASSROOM__'
  then
    raise exception
      'TEST 4 FAILED: Classroom display name snapshot is wrong.';
  end if;


  if v_system_teacher <>
     'juniors@latterup.org'
  then
    raise exception
      'TEST 4 FAILED: system teacher snapshot is wrong.';
  end if;


  if public.get_current_classroom_provisioning_action(
       v_group_id
     ) <> 'none'
  then
    raise exception
      'TEST 4 FAILED: successfully provisioned Classroom should require no action.';
  end if;


  raise notice
    'PASS 4: successful Classroom creation is recorded correctly.';


  -- ==========================================================
  -- TEST 5
  -- Requesting archive should queue ARCHIVE.
  -- ==========================================================

  v_archive_request_id :=
    public.request_classroom_archive(
      v_group_id
    );


  if v_archive_request_id is null then
    raise exception
      'TEST 5 FAILED: archive request was not queued.';
  end if;


  if public.get_current_classroom_provisioning_action(
       v_group_id
     ) <> 'archive'
  then
    raise exception
      'TEST 5 FAILED: expected ARCHIVE action.';
  end if;


  select
    c.should_execute,
    c.status,
    c.action

  into
    v_should_execute,
    v_claim_status,
    v_claim_action

  from public.claim_classroom_provisioning(
    v_archive_request_id
  ) c;


  if v_should_execute is distinct from true
     or v_claim_status <> 'processing'
     or v_claim_action <> 'archive'
  then
    raise exception
      'TEST 5 FAILED: valid ARCHIVE request was not claimed correctly.';
  end if;


  raise notice
    'PASS 5: valid ARCHIVE request is safely claimed.';


  -- ==========================================================
  -- TEST 6
  -- Successful archive changes observed Google state.
  -- ==========================================================

  perform public.complete_classroom_archive(
    v_archive_request_id
  );


  select course_state
  into v_course_state
  from public.google_classrooms
  where classroom_group_id =
        v_group_id;


  if v_course_state <> 'ARCHIVED' then
    raise exception
      'TEST 6 FAILED: Google Classroom state was not archived.';
  end if;


  if public.get_current_classroom_provisioning_action(
       v_group_id
     ) <> 'none'
  then
    raise exception
      'TEST 6 FAILED: archived desired/actual state should require no action.';
  end if;


  raise notice
    'PASS 6: successful archive is recorded correctly.';


  -- ==========================================================
  -- TEST 7
  -- Request ACTIVE again against archived Classroom.
  --
  -- Current model uses UPDATE for reactivation.
  -- ==========================================================

  v_request_id :=
    public.request_classroom_provisioning(
      v_group_id,
      null
    );


  if v_request_id is null then
    raise exception
      'TEST 7 FAILED: archived Classroom did not queue reactivation.';
  end if;


  if public.get_current_classroom_provisioning_action(
       v_group_id
     ) <> 'update'
  then
    raise exception
      'TEST 7 FAILED: archived Classroom should require UPDATE when desired active.';
  end if;


  raise notice
    'PASS 7: archived Classroom can be requested active again.';


  -- ==========================================================
  -- TEST 8
  -- STALE PROVISIONING REQUEST
  --
  -- We currently have a pending UPDATE.
  -- Change desired state back to archived BEFORE claim.
  --
  -- Worker must NOT execute stale UPDATE.
  -- ==========================================================

  v_stale_request_id :=
    v_request_id;


  update public.classroom_groups
  set
    desired_google_state = 'archived',
    updated_at = now()
  where id = v_group_id;


  select
    c.should_execute,
    c.status

  into
    v_should_execute,
    v_claim_status

  from public.claim_classroom_provisioning(
    v_stale_request_id
  ) c;


  if v_should_execute is distinct from false
     or v_claim_status <> 'cancelled'
  then
    raise exception
      'TEST 8 FAILED: stale provisioning request was not cancelled.';
  end if;


  raise notice
    'PASS 8: stale provisioning action is cancelled before Google execution.';


  -- ==========================================================
  -- COMPLETE
  -- ==========================================================

  raise notice
    '==============================================';

  raise notice
    'ALL 009G CLASSROOM PROVISIONING TESTS PASSED';

  raise notice
    '==============================================';

end;

$test$;


rollback;