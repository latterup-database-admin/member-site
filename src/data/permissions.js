import { supabase } from "../lib/supabase";

export async function loadMyPermissions() {
  const { data, error } = await supabase.rpc(
    "get_my_permissions",
  );

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    key: row.permission_key,
    name: row.permission_name,
  }));
}