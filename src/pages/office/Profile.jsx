import { useState } from "react";
import {
  FaBuilding,
  FaCamera,
  FaCheckCircle,
  FaEnvelope,
  FaIdBadge,
  FaInfoCircle,
  FaLock,
  FaSave,
  FaShieldAlt,
  FaUser,
  FaUserTie,
} from "react-icons/fa";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";

function Profile() {
  // =========================================================
  // MOCK PROFILE
  // Later:
  // auth user -> public.users -> approver_assignments -> offices
  // =========================================================

  const [profile, setProfile] = useState({
    fullName: "Office Staff",
    employeeId: "LIB-001",
    email: "library.staff@example.com",
    role: "Office Staff",
    office: "Library",
    officeCode: "LIB",
    accountStatus: "Active",
  });

  const [originalProfile, setOriginalProfile] =
    useState(profile);

  const [saving, setSaving] = useState(false);

  const [passwordForm, setPasswordForm] =
    useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [changingPassword, setChangingPassword] =
    useState(false);

  // =========================================================
  // PROFILE
  // =========================================================

  const handleProfileChange = (event) => {
    const { name, value } = event.target;

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const hasProfileChanges =
    profile.fullName !==
      originalProfile.fullName ||
    profile.email !== originalProfile.email;

  const saveProfile = async (event) => {
    event.preventDefault();

    if (!profile.fullName.trim()) {
      window.alert(
        "Please enter your full name."
      );
      return;
    }

    if (!profile.email.trim()) {
      window.alert(
        "Please enter your email address."
      );
      return;
    }

    setSaving(true);

    try {
      // Frontend prototype only.
      // Later: update public.users through Supabase.

      await new Promise((resolve) =>
        setTimeout(resolve, 500)
      );

      setOriginalProfile(profile);

      window.alert(
        "Profile changes saved for the UI prototype."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // PASSWORD
  // =========================================================

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;

    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const updatePassword = async (event) => {
    event.preventDefault();

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      window.alert(
        "Please complete all password fields."
      );
      return;
    }

    if (
      passwordForm.newPassword.length < 8
    ) {
      window.alert(
        "New password must contain at least 8 characters."
      );
      return;
    }

    if (
      passwordForm.newPassword !==
      passwordForm.confirmPassword
    ) {
      window.alert(
        "New password and confirmation do not match."
      );
      return;
    }

    setChangingPassword(true);

    try {
      // Frontend prototype only.
      // Later: Supabase Auth password update.

      await new Promise((resolve) =>
        setTimeout(resolve, 500)
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      window.alert(
        "Password update simulated successfully."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1300px] space-y-6">
        {/* HEADER */}

        <section>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              {profile.officeCode}
            </span>

            <span className="text-xs font-bold text-slate-400">
              Office Staff Account
            </span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Profile
          </h1>

          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
            View your office assignment and
            manage your personal account
            information.
          </p>
        </section>

        {/* PROFILE HERO */}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative overflow-hidden p-6 sm:p-7">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl dark:bg-blue-500/10" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-950 text-2xl font-black text-white shadow-xl dark:bg-blue-600">
                  {getInitials(
                    profile.fullName
                  )}
                </div>

                <button
                  type="button"
                  title="Profile picture"
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-xl border-2 border-white bg-blue-600 text-xs text-white shadow-md transition hover:bg-blue-700 dark:border-slate-900"
                >
                  <FaCamera />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                    {profile.fullName}
                  </h2>

                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <FaCheckCircle />
                    {profile.accountStatus}
                  </span>
                </div>

                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {profile.employeeId} •{" "}
                  {profile.office}
                </p>

                <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <FaBuilding className="text-blue-500" />
                  {profile.office} Office
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          {/* LEFT */}

          <div className="space-y-6">
            {/* PERSONAL INFORMATION */}

            <form
              onSubmit={saveProfile}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FaUser className="text-blue-600 dark:text-blue-400" />

                  <h2 className="text-base font-black text-slate-950 dark:text-white">
                    Personal Information
                  </h2>
                </div>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Update your basic account
                  information.
                </p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      Full Name
                    </label>

                    <div className="relative">
                      <FaUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

                      <input
                        type="text"
                        name="fullName"
                        value={
                          profile.fullName
                        }
                        onChange={
                          handleProfileChange
                        }
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Email Address
                    </label>

                    <div className="relative">
                      <FaEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

                      <input
                        type="email"
                        name="email"
                        value={profile.email}
                        onChange={
                          handleProfileChange
                        }
                        className={`${inputClass} pl-10`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <ReadOnlyField
                    icon={FaIdBadge}
                    label="Employee ID"
                    value={
                      profile.employeeId
                    }
                  />

                  <ReadOnlyField
                    icon={FaUserTie}
                    label="System Role"
                    value={profile.role}
                  />
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={
                      saving ||
                      !hasProfileChanges
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaSave />

                    {saving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>

            {/* PASSWORD */}

            <form
              onSubmit={updatePassword}
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FaLock className="text-violet-600 dark:text-violet-400" />

                  <h2 className="text-base font-black text-slate-950 dark:text-white">
                    Change Password
                  </h2>
                </div>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Update the password used to
                  access your account.
                </p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label className={labelClass}>
                    Current Password
                  </label>

                  <input
                    type="password"
                    name="currentPassword"
                    value={
                      passwordForm.currentPassword
                    }
                    onChange={
                      handlePasswordChange
                    }
                    placeholder="Enter current password"
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      New Password
                    </label>

                    <input
                      type="password"
                      name="newPassword"
                      value={
                        passwordForm.newPassword
                      }
                      onChange={
                        handlePasswordChange
                      }
                      placeholder="Minimum 8 characters"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>
                      Confirm New Password
                    </label>

                    <input
                      type="password"
                      name="confirmPassword"
                      value={
                        passwordForm.confirmPassword
                      }
                      onChange={
                        handlePasswordChange
                      }
                      placeholder="Repeat new password"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-blue-600"
                  >
                    <FaLock />

                    {changingPassword
                      ? "Updating..."
                      : "Update Password"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* RIGHT */}

          <aside className="space-y-6">
            {/* OFFICE ASSIGNMENT */}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <FaBuilding className="text-blue-600 dark:text-blue-400" />

                <h2 className="text-base font-black text-slate-950 dark:text-white">
                  Office Assignment
                </h2>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Assigned Office
                </p>

                <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                  {profile.office}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-500">
                  Office Code:{" "}
                  {profile.officeCode}
                </p>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 dark:border-blue-500/20 dark:bg-blue-500/5">
                <FaInfoCircle className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />

                <p className="text-xs font-medium leading-5 text-blue-700 dark:text-blue-300">
                  Office assignments are
                  controlled by the Administrator
                  and cannot be changed from this
                  profile.
                </p>
              </div>
            </div>

            {/* ACCESS */}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <FaShieldAlt className="text-emerald-600 dark:text-emerald-400" />

                <h2 className="text-base font-black text-slate-950 dark:text-white">
                  Account Access
                </h2>
              </div>

              <div className="mt-5 space-y-3">
                <AccessItem
                  label="Account Status"
                  value={
                    profile.accountStatus
                  }
                  active
                />

                <AccessItem
                  label="Portal"
                  value="Office Staff"
                />

                <AccessItem
                  label="Clearance Office"
                  value={profile.office}
                />
              </div>
            </div>

            {/* SECURITY NOTE */}

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-start gap-3">
                <FaShieldAlt className="mt-0.5 shrink-0 text-slate-400" />

                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                    Account Security
                  </p>

                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                    Clearance actions will be
                    associated with the authenticated
                    staff account and its active
                    office assignment.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </OfficeStaffLayout>
  );
}

// ===========================================================
// STYLES
// ===========================================================

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

const labelClass =
  "mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400";

// ===========================================================
// COMPONENTS
// ===========================================================

function ReadOnlyField({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
      </label>

      <div className="flex min-h-[42px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
        <Icon className="shrink-0 text-slate-400" />

        <span className="truncate text-sm font-bold text-slate-600 dark:text-slate-300">
          {value}
        </span>
      </div>
    </div>
  );
}

function AccessItem({
  label,
  value,
  active = false,
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3.5 py-3 dark:bg-slate-800/60">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <span
        className={`inline-flex items-center gap-1.5 text-xs font-black ${
          active
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-slate-800 dark:text-slate-200"
        }`}
      >
        {active && (
          <FaCheckCircle className="text-[10px]" />
        )}

        {value}
      </span>
    </div>
  );
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default Profile;