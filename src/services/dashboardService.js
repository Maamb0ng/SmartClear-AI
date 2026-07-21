import { supabase } from "./supabase";

export async function getDashboardStats() {
  try {
    // Total Users
    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    // Students
    const { count: totalStudents } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "Student");

    // Approvers
    const { count: totalApprovers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "Approver");

    // Administrators
    const { count: totalAdmins } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .eq("role", "Administrator");

    // Offices
    const { count: totalOffices } = await supabase
      .from("offices")
      .select("*", { count: "exact", head: true });

    // Subjects
    const { count: totalSubjects } = await supabase
      .from("subjects")
      .select("*", { count: "exact", head: true });

    // Clearance Requests
    const { count: totalRequests } = await supabase
      .from("clearance_requests")
      .select("*", { count: "exact", head: true });

    // Pending
    const { count: pendingRequests } = await supabase
      .from("clearance_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "Pending");

    // Approved
    const { count: approvedRequests } = await supabase
      .from("clearance_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "Approved");

    // Rejected
    const { count: rejectedRequests } = await supabase
      .from("clearance_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "Rejected");

    return {
      totalUsers: totalUsers || 0,
      totalStudents: totalStudents || 0,
      totalApprovers: totalApprovers || 0,
      totalAdmins: totalAdmins || 0,
      totalOffices: totalOffices || 0,
      totalSubjects: totalSubjects || 0,
      totalRequests: totalRequests || 0,
      pendingRequests: pendingRequests || 0,
      approvedRequests: approvedRequests || 0,
      rejectedRequests: rejectedRequests || 0,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}