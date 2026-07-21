import { supabase } from "./supabase";

/*
=====================================
GET ALL OFFICES
=====================================
*/

export async function getOffices() {
  const { data, error } = await supabase
    .from("offices")
    .select("*")
    .order("office_name");

  if (error) throw error;

  return data;
}

/*
=====================================
ADD OFFICE
=====================================
*/

export async function addOffice(office) {
  const { error } = await supabase
    .from("offices")
    .insert({
      office_name: office.office_name,
      office_code: office.office_code,
      description: office.description,
      is_active: office.is_active,
    });

  if (error) throw error;
}

/*
=====================================
UPDATE OFFICE
=====================================
*/

export async function updateOffice(id, office) {
  const { error } = await supabase
    .from("offices")
    .update({
      office_name: office.office_name,
      office_code: office.office_code,
      description: office.description,
      is_active: office.is_active,
    })
    .eq("id", id);

  if (error) throw error;
}

/*
=====================================
DELETE OFFICE
=====================================
*/

export async function deleteOffice(id) {
  const { error } = await supabase
    .from("offices")
    .delete()
    .eq("id", id);

  if (error) throw error;
}