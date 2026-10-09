import { supabase } from "../lib/supabase";

export async function loadAdminClassProposals() {
  const { data, error } = await supabase.rpc(
    "get_admin_class_proposals",
  );

  if (error) throw error;
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

  if (error) throw error;
  return data;
}

export async function reviewAdminClassProposal(
  classProposalId,
  action,
  reviewNotes = "",
) {
  const { data, error } = await supabase.rpc(
    "review_admin_class_proposal",
    {
      p_class_proposal_id: classProposalId,
      p_action: action,
      p_review_notes: reviewNotes?.trim() || null,
    },
  );

  if (error) throw error;
  return data;
}

export async function loadClassProposalReviewHistory(classProposalId) {
  const { data, error } = await supabase.rpc(
    "get_class_proposal_review_history",
    { p_class_proposal_id: classProposalId },
  );

  if (error) throw error;
  return data ?? [];
}
