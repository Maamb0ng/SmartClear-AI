import { supabase } from "./supabase";

/*
=====================================
GET ALL STUDENTS
=====================================
*/

export async function getStudents() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "Student")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

/*
=====================================
GET ALL SUBJECTS
=====================================
*/

export async function getSubjects() {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("is_active", true)
    .order("subject_code");

  if (error) throw error;

  return data;
}

/*
=====================================
GET ALL ADVISERS
=====================================
*/

export async function getAdvisers() {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "Approver")
    .order("full_name");

  if (error) throw error;

  return data;
}

/*
=====================================
UPDATE STUDENT PROFILE
=====================================
*/

export async function updateStudent(id, updates) {
  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

/*
=====================================
GET STUDENT SUBJECTS
=====================================
*/

export async function getStudentSubjects(studentId) {
  const { data, error } = await supabase
    .from("student_subjects")
    .select("subject_id")
    .eq("student_id", studentId);

  if (error) throw error;

  return data.map((item) => item.subject_id);
}

/*
=====================================
SAVE STUDENT SUBJECTS
=====================================
*/

export async function saveStudentSubjects(studentId, subjects) {
  await supabase
    .from("student_subjects")
    .delete()
    .eq("student_id", studentId);

  if (subjects.length === 0) return;

  const rows = subjects.map((subjectId) => ({
    student_id: studentId,
    subject_id: subjectId,
  }));

  const { error } = await supabase
    .from("student_subjects")
    .insert(rows);

  if (error) throw error;
}

/*
=====================================
GET STUDENT ADVISER
=====================================
*/

export async function getStudentAdviser(studentId) {
  const { data, error } = await supabase
    .from("student_advisers")
    .select("adviser_id")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) throw error;

  return data?.adviser_id || "";
}

/*
=====================================
SAVE STUDENT ADVISER
=====================================
*/

export async function saveStudentAdviser(
  studentId,
  adviserId
) {
  await supabase
    .from("student_advisers")
    .delete()
    .eq("student_id", studentId);

  if (!adviserId) return;

  const { error } = await supabase
    .from("student_advisers")
    .insert({
      student_id: studentId,
      adviser_id: adviserId,
    });

  if (error) throw error;
}