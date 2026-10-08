import { supabase } from "../lib/supabase";

export async function loadMemberDirectory() {
  const { data, error } = await supabase.rpc("get_member_directory");

  if (error) {
    throw error;
  }

  return {
    households: (data?.households ?? []).map(normalizeHousehold),
  };
}

function normalizeHousehold(row) {
  const members = (row.members ?? []).map(normalizeMember);

  return {
    id: row.id,
    familyName: row.family_name ?? "Latter UP Family",

    location: {
      city: row.location?.city ?? "",
      state: row.location?.state ?? "",
    },

    address: row.address
      ? {
          streetAddress: row.address.street_address ?? "",
          addressLine2: row.address.address_line_2 ?? "",
          city: row.address.city ?? "",
          state: row.address.state ?? "",
          postalCode: row.address.postal_code ?? "",
        }
      : null,

    members,

    adults: members.filter((member) => member.memberType === "adult"),

    youth: members.filter((member) => member.memberType === "youth"),

    juniors: members.filter((member) => member.memberType === "junior"),
  };
}

function normalizeMember(row) {
  return {
    id: row.id,

    firstName: row.first_name ?? "",
    preferredName: row.preferred_name ?? "",
    lastName: row.last_name ?? "",

    displayName:
      row.display_name ||
      [row.preferred_name || row.first_name, row.last_name]
        .filter(Boolean)
        .join(" "),

    memberType: row.member_type ?? null,

    workspaceEmail: row.workspace_email ?? null,
    phone: row.phone ?? null,
    profilePhotoUrl: row.profile_photo_url ?? null,

    relationshipType: row.relationship_type ?? null,
    isGuardian: Boolean(row.is_guardian),

    teaching: (row.teaching ?? []).map((item) => ({
      courseId: item.course_id,
      title: item.title,
      program: item.program,
      role: item.role,
    })),

    servicePositions: (row.service_positions ?? []).map((item) => ({
      id: item.id,
      title: item.title,
    })),

    isBringAFriend: Boolean(row.is_bring_a_friend),
  };
}

export function householdAudience(household) {
  const hasJunior = household.juniors.length > 0;
  const hasYouth = household.youth.length > 0;

  if (hasJunior && hasYouth) return "both";
  if (hasJunior) return "junior";
  if (hasYouth) return "youth";

  return "adult";
}

export function locationLabel(location) {
  return [location?.city, location?.state].filter(Boolean).join(", ");
}

export function formatPhone(value) {
  if (!value) return "";

  const digits = String(value).replace(/\D/g, "");

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return value;
}
