import { supabase } from "./supabase";

/*
=====================================
GET ALL SUBJECTS
=====================================
*/

export async function getSubjects() {
  const { data, error } = await supabase
    .from("subjects")
    .select(`
      *,
      offices (
        office_name
      )
    `)
    .order("subject_code");

  if (error) throw error;

  return data;
}

/*
=====================================
GET SUBJECT
=====================================
*/

export async function getSubject(id) {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return data;
}

/*
=====================================
ADD SUBJECT
=====================================
*/

export async function addSubject(subject) {
  const { error } = await supabase
    .from("subjects")
    .insert({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      program: subject.program,
      year_level: subject.year_level,
      semester: subject.semester,
      units: subject.units,
      assigned_office: subject.assigned_office || null,
      is_active: subject.is_active,
    });

  if (error) throw error;
}

/*
=====================================
UPDATE SUBJECT
=====================================
*/

export async function updateSubject(id, subject) {
  const { error } = await supabase
    .from("subjects")
    .update({
      subject_code: subject.subject_code,
      subject_name: subject.subject_name,
      program: subject.program,
      year_level: subject.year_level,
      semester: subject.semester,
      units: subject.units,
      assigned_office: subject.assigned_office || null,
      is_active: subject.is_active,
    })
    .eq("id", id);

  if (error) throw error;
}

/*
=====================================
DELETE SUBJECT
=====================================
*/

export async function deleteSubject(id) {
  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id);

  if (error) throw error;
}