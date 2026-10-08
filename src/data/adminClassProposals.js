import { supabase } from "../lib/supabase";

export async function loadAdminClassProposals() {
  const { data, error } = await supabase.rpc(
    "get_admin_class_proposals",
  );

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function approveAdminClassProposal(
  classProposalId,
  reviewNotes = "",
) {
  const { data, error } = await supabase.rpc(
    "approve_class_proposal",
    {
      p_class_proposal_id: classProposalId,
      p_review_notes: reviewNotes?.trim() || null,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}
