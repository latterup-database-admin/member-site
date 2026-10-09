import { supabase } from "../lib/supabase";

const REGISTRATION_TIME_ZONE = "America/New_York";

export async function loadAdminRegistrationOverview() {
  const { data, error } = await supabase.rpc(
    "get_admin_registration_overview",
  );

  if (error) throw error;
  return data ?? {
    school_year: null,
    program_rules: [],
    registration_windows: [],
    exception_counts: {
      pending: 0,
      approved: 0,
      denied: 0,
      withdrawn: 0,
    },
  };
}

export async function loadAdminRegistrationExceptions() {
  const { data, error } = await supabase.rpc(
    "get_admin_registration_exceptions",
  );

  if (error) throw error;
  return data ?? [];
}



export async function loadAdminRegistrationWaitlists() {
  const { data, error } = await supabase.rpc(
    "get_admin_registration_waitlists",
  );

  if (error) throw error;
  return data ?? [];
}

export async function admitAdminWaitlistedStudent({
  waitlistEntryId,
  allowOverCapacity = false,
  reason = "",
}) {
  const { data, error } = await supabase.rpc(
    "admit_waitlisted_student",
    {
      p_waitlist_entry_id: waitlistEntryId,
      p_allow_over_capacity: Boolean(allowOverCapacity),
      p_reason: reason?.trim() || null,
    },
  );

  if (error) throw error;
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

export async function reviewAdminRegistrationException(
  exceptionRequestId,
  decision,
  reviewNotes = "",
) {
  const { error } = await supabase.rpc(
    "review_class_eligibility_exception",
    {
      p_exception_request_id: exceptionRequestId,
      p_decision: decision,
      p_review_notes: reviewNotes?.trim() || null,
    },
  );

  if (error) throw error;
}

export async function createAdminRegistrationWindow(values) {
  const { data, error } = await supabase.rpc(
    "create_admin_registration_window",
    {
      p_program: "junior",
      p_opens_at: easternWallTimeToIso(values.opens_at),
      p_closes_at: values.closes_at
        ? easternWallTimeToIso(values.closes_at)
        : null,
      p_label: values.label?.trim() || null,
    },
  );

  if (error) throw error;
  return data;
}

export async function updateAdminRegistrationWindow(id, values) {
  const { data, error } = await supabase.rpc(
    "update_admin_registration_window",
    {
      p_registration_window_id: id,
      p_program: "junior",
      p_opens_at: easternWallTimeToIso(values.opens_at),
      p_closes_at: values.closes_at
        ? easternWallTimeToIso(values.closes_at)
        : null,
      p_label: values.label?.trim() || null,
    },
  );

  if (error) throw error;
  return data;
}

export async function deleteAdminRegistrationWindow(id) {
  const { error } = await supabase.rpc(
    "delete_admin_registration_window",
    {
      p_registration_window_id: id,
    },
  );

  if (error) throw error;
}

export function easternWallTimeToIso(value) {
  if (!value) return null;

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
  );

  if (!match) {
    throw new Error("Please enter a valid Eastern date and time.");
  }

  const [, year, month, day, hour, minute] = match;
  const wallUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
  );

  // Find the Eastern UTC offset for this date, including DST.
  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: REGISTRATION_TIME_ZONE,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = offsetFormatter.formatToParts(new Date(wallUtc));
  const zonePart = parts.find((part) => part.type === "timeZoneName")?.value;
  const offsetMatch = zonePart?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);

  if (!offsetMatch) {
    throw new Error("Unable to determine the Eastern Time offset.");
  }

  const sign = offsetMatch[1] === "+" ? 1 : -1;
  const offsetMinutes =
    sign *
    (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3] || 0));

  return new Date(wallUtc - offsetMinutes * 60_000).toISOString();
}
