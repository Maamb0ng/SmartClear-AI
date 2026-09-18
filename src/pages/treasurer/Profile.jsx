import { useEffect, useState } from "react";
import Swal from "sweetalert2";

import TreasurerLayout from "../../layouts/TreasurerLayout";
import { supabase } from "../../services/supabase";

import {
  FaUser,
  FaEnvelope,
  FaIdCard,
  FaBuilding,
  FaSave,
} from "react-icons/fa";

function Profile() {
  const [profile, setProfile] = useState({
    id: "",
    full_name: "",
    employee_id: "",
    email: "",
    department: "",
    office: "",
    role: "",
    status: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!authUser) {
        throw new Error("You are not logged in.");
      }

      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          full_name,
          employee_id,
          email,
          department,
          office,
          role,
          status
        `)
        .eq("auth_id", authUser.id)
        .single();

      if (error) {
        throw error;
      }

      setProfile({
        id: data.id,
        full_name: data.full_name || "",
        employee_id: data.employee_id || "",
        email: data.email || "",
        department: data.department || "",
        office: data.office || "",
        role: data.role || "",
        status: data.status || "",
      });
    } catch (error) {
      console.error(
        "Treasurer profile load error:",
        error
      );

      Swal.fire({
        icon: "error",
        title: "Unable to Load Profile",
        text:
          error?.message ||
          "Unable to load the Treasurer profile.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((previousProfile) => ({
      ...previousProfile,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!profile.full_name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Full Name Required",
        text: "Please enter your full name.",
      });

      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("users")
        .update({
          full_name: profile.full_name.trim(),
          department:
            profile.department.trim() || null,
          office:
            profile.office.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) {
        throw error;
      }

      await Swal.fire({
        icon: "success",
        title: "Profile Updated",
        text:
          "Your Treasurer profile information has been saved.",
        timer: 1400,
        showConfirmButton: false,
      });

      await loadProfile();
    } catch (error) {
      console.error(
        "Treasurer profile update error:",
        error
      );

      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text:
          error?.message ||
          "Unable to update your profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <TreasurerLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-blue-700 border-t-transparent" />

            <p className="mt-5 font-semibold text-slate-600">
              Loading Treasurer profile...
            </p>
          </div>
        </div>
      </TreasurerLayout>
    );
  }

  return (
    <TreasurerLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800">
          Treasurer Profile
        </h1>

        <p className="mt-2 text-slate-500">
          View and update your SmartClear AI account
          information.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Profile Summary */}
        <div className="rounded-3xl bg-gradient-to-br from-blue-700 to-blue-900 p-8 text-white shadow-lg">
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white/20">
            <FaUser className="text-5xl" />
          </div>

          <div className="mt-6 text-center">
            <h2 className="text-2xl font-bold">
              {profile.full_name || "Treasurer"}
            </h2>

            <p className="mt-2 text-blue-100">
              {profile.employee_id ||
                "No Employee ID"}
            </p>

            <p className="mt-2 text-sm text-blue-200">
              {profile.office ||
                "Treasurer / Cashier"}
            </p>

            <span className="mt-5 inline-block rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
              {profile.status || "Active"}
            </span>
          </div>
        </div>

        {/* Account Information */}
        <div className="rounded-3xl bg-white p-8 shadow-lg lg:col-span-2">
          <h2 className="mb-7 text-2xl font-bold text-slate-800">
            Account Information
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Full Name */}
            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Full Name
              </label>

              <div className="relative">
                <FaUser className="absolute left-4 top-4 text-slate-400" />

                <input
                  name="full_name"
                  value={profile.full_name}
                  onChange={handleChange}
                  className="w-full rounded-xl border py-3 pl-12 pr-4 outline-none focus:border-blue-700"
                />
              </div>
            </div>

            {/* Employee ID */}
            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Employee ID
              </label>

              <div className="relative">
                <FaIdCard className="absolute left-4 top-4 text-slate-400" />

                <input
                  value={profile.employee_id}
                  disabled
                  className="w-full rounded-xl border bg-slate-100 py-3 pl-12 pr-4 text-slate-500"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Email Address
              </label>

              <div className="relative">
                <FaEnvelope className="absolute left-4 top-4 text-slate-400" />

                <input
                  value={profile.email}
                  disabled
                  className="w-full rounded-xl border bg-slate-100 py-3 pl-12 pr-4 text-slate-500"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                System Role
              </label>

              <input
                value={profile.role}
                disabled
                className="w-full rounded-xl border bg-slate-100 p-3 text-slate-500"
              />

              <p className="mt-1 text-xs text-slate-400">
                Financial assignment is managed by the
                Administrator.
              </p>
            </div>

            {/* Department */}
            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Department
              </label>

              <div className="relative">
                <FaBuilding className="absolute left-4 top-4 text-slate-400" />

                <input
                  name="department"
                  value={profile.department}
                  onChange={handleChange}
                  placeholder="Enter your department"
                  className="w-full rounded-xl border py-3 pl-12 pr-4 outline-none focus:border-blue-700"
                />
              </div>
            </div>

            {/* Office */}
            <div>
              <label className="mb-2 block font-semibold text-slate-700">
                Office
              </label>

              <div className="relative">
                <FaBuilding className="absolute left-4 top-4 text-slate-400" />

                <input
                  name="office"
                  value={profile.office}
                  onChange={handleChange}
                  placeholder="Treasurer / Cashier"
                  className="w-full rounded-xl border py-3 pl-12 pr-4 outline-none focus:border-blue-700"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-3 rounded-xl bg-blue-700 px-7 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSave />

              {saving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </TreasurerLayout>
  );
}

export default Profile;