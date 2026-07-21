import { supabase } from "./supabase";

export async function approveRequest(
  requestId,
  remarks
) {
  try {
    // Logged in approver
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not logged in.");
    }

    // Get approver profile
    const { data: approver } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!approver) {
      throw new Error("Approver not found.");
    }

    // Update ALL pending steps for this approver
    const { error } = await supabase
      .from("clearance_steps")
      .update({
        status: "Approved",
        remarks,
        approver_id: approver.id,
        reviewed_at: new Date(),
      })
      .eq("clearance_request_id", requestId)
      .eq("status", "Pending");

    if (error) throw error;

    return {
      success: true,
    };

  } catch (err) {

    console.error(err);

    return {
      success: false,
      error: err.message,
    };

  }
}

export async function rejectRequest(
  requestId,
  remarks
) {
  try {

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: approver } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    const { error } = await supabase
      .from("clearance_steps")
      .update({
        status: "Rejected",
        remarks,
        approver_id: approver.id,
        reviewed_at: new Date(),
      })
      .eq("clearance_request_id", requestId)
      .eq("status", "Pending");

    if (error) throw error;

    return {
      success: true,
    };

  } catch (err) {

    return {
      success: false,
      error: err.message,
    };

  }
}