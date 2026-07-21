import { supabase } from "./supabase";

export async function getPendingRequests() {
  try {
    // Get all pending clearance requests
    const { data: requests, error } = await supabase
      .from("clearance_requests")
      .select("*")
      .eq("status", "Pending")
      .order("requested_at", { ascending: false });

    if (error) throw error;

    const finalData = [];

    for (const request of requests) {
      // Get student information
      const { data: student } = await supabase
        .from("users")
        .select(`
          id,
          student_id,
          full_name,
          course,
          year_level
        `)
        .eq("id", request.student_id)
        .single();

      finalData.push({
        ...request,
        student,
      });
    }

    return {
      success: true,
      data: finalData,
    };

  } catch (error) {
    console.error(error);

    return {
      success: false,
      error: error.message,
    };
  }
}