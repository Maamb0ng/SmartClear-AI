import { supabase } from "./supabase";

/*
=====================================
GET ASSIGNMENTS
=====================================
*/

export async function getAssignments() {
  const { data, error } = await supabase
    .from("approver_assignments")
    .select(`
      *,
      users!approver_assignments_approver_id_fkey(
        id,
        full_name,
        email
      ),
      subjects(
        id,
        subject_code,
        subject_name
      ),
      offices(
        id,
        office_name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

/*
=====================================
GET APPROVERS
=====================================
*/

export async function getApprovers() {
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, email")
    .eq("role", "Approver")
    .eq("status", "Active")
    .order("full_name");

  if (error) throw error;

  return data;
}

/*
=====================================
ADD ASSIGNMENT
=====================================
*/

export async function addAssignment(assignment) {
  const { error } = await supabase
    .from("approver_assignments")
    .insert({
      approver_id: assignment.approver_id,
      subject_id: assignment.subject_id || null,
      office_id: assignment.office_id || null,
      is_active: true,
    });

  if (error) throw error;
}

/*
=====================================
UPDATE ASSIGNMENT
=====================================
*/

export async function updateAssignment(id, assignment) {
  const { error } = await supabase
    .from("approver_assignments")
    .update({
      approver_id: assignment.approver_id,
      subject_id: assignment.subject_id || null,
      office_id: assignment.office_id || null,
      is_active: assignment.is_active,
    })
    .eq("id", id);

  if (error) throw error;
}

/*
=====================================
DELETE ASSIGNMENT
=====================================
*/

export async function deleteAssignment(id) {
  const { error } = await supabase
    .from("approver_assignments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}