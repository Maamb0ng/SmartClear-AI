import { supabase } from "./supabase";

// Existing admin dashboard statistics - preserved.
export async function getDashboardStats() {
  try {
    const count = async (table, roleOrStatus) => {
      let query = supabase.from(table).select("*", { count: "exact", head: true });
      if (roleOrStatus) query = query.eq(roleOrStatus[0], roleOrStatus[1]);
      const { count: total, error } = await query;
      if (error) throw error;
      return total || 0;
    };
    const [totalUsers, totalStudents, totalApprovers, totalAdmins, totalOffices, totalSubjects, totalRequests, pendingRequests, approvedRequests, rejectedRequests] = await Promise.all([
      count("users"), count("users", ["role", "Student"]),
      count("users", ["role", "Approver"]), count("users", ["role", "Administrator"]),
      count("offices"), count("subjects"), count("clearance_requests"),
      count("clearance_requests", ["status", "Pending"]),
      count("clearance_requests", ["status", "Approved"]),
      count("clearance_requests", ["status", "Rejected"]),
    ]);
    return { totalUsers, totalStudents, totalApprovers, totalAdmins, totalOffices, totalSubjects, totalRequests, pendingRequests, approvedRequests, rejectedRequests };
  } catch (error) {
    console.error(error);
    return null;
  }
}

// Student-facing financial summary. Reads only the Treasurer batch record
// associated with a Treasurer clearance step in the current request.
// This requires a Supabase SELECT RLS policy permitting the student to read
// their own treasurer_batch_students record. No write privileges are added.
export async function getStudentTreasurerFinancialSummary({ studentId, clearanceSteps = [] }) {
  if (!studentId) throw new Error("Student ID is required.");

  const treasurerStepIds = clearanceSteps
    .filter((step) => {
      const code = String(step.offices?.office_code || "").trim().toLowerCase();
      const name = String(step.offices?.office_name || "").trim().toLowerCase();
      return Boolean(step.office_id) && (code === "fin" || name.includes("treasurer") || name.includes("finance"));
    })
    .map((step) => step.id);

  if (!treasurerStepIds.length) return null;

  const { data, error } = await supabase
    .from("treasurer_batch_students")
    .select("id, clearance_step_id, financial_status, balance_amount, treasurer_remarks, reviewed_at, created_at")
    .eq("student_id", studentId)
    .in("clearance_step_id", treasurerStepIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data || !data.reviewed_at) return null;

  const step = clearanceSteps.find((item) => item.id === data.clearance_step_id);
  const rawStatus = data.financial_status;
  const balance = data.balance_amount === null || data.balance_amount === undefined
    ? null : Number(data.balance_amount);
  const isConditional = rawStatus === "With Balance" && step?.status === "Approved" && balance > 0;
  const promisedMatch = String(data.treasurer_remarks || "").match(/Promised payment date:\s*(\d{4}-\d{2}-\d{2})/i);

  let status = "Awaiting Treasurer Assessment";
  let message = "Please coordinate with the Treasurer for your financial assessment.";
  if (isConditional) {
    status = "Conditional Approval";
    message = "Your Treasurer clearance was approved conditionally. Your outstanding balance is still payable.";
  } else if (rawStatus === "Cleared" && balance === 0) {
    status = "Fully Paid";
    message = "The Treasurer has confirmed that you have no outstanding balance.";
  } else if (rawStatus === "With Balance") {
    status = "With Balance";
    message = "You have an outstanding balance. Please coordinate with the Treasurer for settlement.";
  } else if (rawStatus === "Needs Action") {
    status = "Needs Settlement";
    message = "Please follow the Treasurer's instructions before your financial clearance can be approved.";
  }

  return {
    status, balance, message,
    remarks: data.treasurer_remarks || "",
    promisedPaymentDate: promisedMatch?.[1] || null,
    reviewedAt: data.reviewed_at,
  };
}
