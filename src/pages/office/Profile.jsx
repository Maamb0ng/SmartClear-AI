import {
  useEffect,
  useState,
} from "react";

import {
  FaBuilding,
  FaCheckCircle,
  FaEnvelope,
  FaExclamationTriangle,
  FaIdBadge,
  FaInfoCircle,
  FaLock,
  FaSave,
  FaShieldAlt,
  FaSpinner,
  FaUser,
  FaUserTie,
} from "react-icons/fa";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";

import { supabase } from "../../services/supabase";

import {
  getOfficeStaffContext,
} from "../../services/officeStaffService";

function Profile() {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [context, setContext] =
    useState(null);

  const [profile, setProfile] =
    useState({
      id: "",
      authId: "",
      fullName: "",
      employeeId: "",
      email: "",
      role: "Office Staff",
      office: "",
      officeCode: "",
      accountStatus: "",
      approverType: "",
    });

  const [
    originalProfile,
    setOriginalProfile,
  ] = useState(null);

  const [saving, setSaving] =
    useState(false);

  const [
    passwordForm,
    setPasswordForm,
  ] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const loadProfile =
    async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const contextData =
          await getOfficeStaffContext();

        const user =
          contextData?.profile;

        const office =
          contextData?.office ||
          contextData?.offices?.[0];

        if (!user?.id) {
          throw new Error(
            "Office Staff profile not found."
          );
        }

        if (!office?.id) {
          throw new Error(
            "No active office assignment was found for this account."
          );
        }

        const mapped =
          mapProfile(
            user,
            office
          );

        setContext(
          contextData
        );

        setProfile(
          mapped
        );

        setOriginalProfile(
          mapped
        );
      } catch (err) {
        console.error(
          "Failed to load Office Staff profile:",
          err
        );

        setError(
          err?.message ||
            "Unable to load your profile."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleProfileChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setSuccess("");

      setProfile(
        (current) => ({
          ...current,
          [name]: value,
        })
      );
    };

  const hasProfileChanges =
    originalProfile
      ? profile.fullName.trim() !==
          originalProfile.fullName.trim() ||
        profile.email.trim() !==
          originalProfile.email.trim()
      : false;

  const saveProfile =
    async (event) => {
      event.preventDefault();

      const fullName =
        profile.fullName.trim();

      const email =
        profile.email
          .trim()
          .toLowerCase();

      if (!fullName) {
        setError(
          "Please enter your full name."
        );
        return;
      }

      if (!email) {
        setError(
          "Please enter your email address."
        );
        return;
      }

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        const {
          data: authData,
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const authUser =
          authData?.user;

        if (!authUser?.id) {
          throw new Error(
            "Your authenticated session could not be verified."
          );
        }

        const {
          data:
            updatedProfile,
          error:
            profileError,
        } = await supabase
          .from("users")
          .update({
            full_name:
              fullName,
            email,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            profile.id
          )
          .eq(
            "auth_id",
            authUser.id
          )
          .select(`
            id,
            auth_id,
            full_name,
            employee_id,
            email,
            role,
            status,
            approver_type
          `)
          .single();

        if (profileError) {
          throw profileError;
        }

        /*
         * Keep Supabase Auth email synchronized with public.users.
         * Depending on the project's Supabase Auth configuration,
         * changing the email may require confirmation before the
         * Auth email itself changes.
         */
        if (
          email !==
          String(
            authUser.email ||
              ""
          ).toLowerCase()
        ) {
          const {
            error:
              authUpdateError,
          } =
            await supabase.auth.updateUser({
              email,
            });

          if (
            authUpdateError
          ) {
            /*
             * The public.users update already succeeded.
             * Restore it so the two account records do not silently
             * drift apart when Auth rejects the email change.
             */
            const {
              error:
                rollbackError,
            } = await supabase
              .from("users")
              .update({
                full_name:
                  originalProfile.fullName,
                email:
                  originalProfile.email,
                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                profile.id
              )
              .eq(
                "auth_id",
                authUser.id
              );

            if (
              rollbackError
            ) {
              console.error(
                "Profile rollback failed:",
                rollbackError
              );
            }

            throw authUpdateError;
          }
        }

        const office =
          context?.office ||
          context?.offices?.[0];

        const mapped =
          mapProfile(
            updatedProfile,
            office
          );

        setProfile(
          mapped
        );

        setOriginalProfile(
          mapped
        );

        setSuccess(
          email !==
            String(
              authUser.email ||
                ""
            ).toLowerCase()
            ? "Profile saved. If email confirmation is enabled, confirm the new email address before using it to sign in."
            : "Profile changes saved successfully."
        );
      } catch (err) {
        console.error(
          "Failed to save Office Staff profile:",
          err
        );

        setError(
          err?.message ||
            "Unable to save your profile."
        );
      } finally {
        setSaving(false);
      }
    };

  const handlePasswordChange =
    (event) => {
      const {
        name,
        value,
      } = event.target;

      setSuccess("");

      setPasswordForm(
        (current) => ({
          ...current,
          [name]: value,
        })
      );
    };

  const updatePassword =
    async (event) => {
      event.preventDefault();

      if (
        !passwordForm.currentPassword ||
        !passwordForm.newPassword ||
        !passwordForm.confirmPassword
      ) {
        setError(
          "Please complete all password fields."
        );
        return;
      }

      if (
        passwordForm.newPassword.length <
        8
      ) {
        setError(
          "New password must contain at least 8 characters."
        );
        return;
      }

      if (
        passwordForm.newPassword !==
        passwordForm.confirmPassword
      ) {
        setError(
          "New password and confirmation do not match."
        );
        return;
      }

      if (
        passwordForm.currentPassword ===
        passwordForm.newPassword
      ) {
        setError(
          "Your new password must be different from your current password."
        );
        return;
      }

      try {
        setChangingPassword(
          true
        );
        setError("");
        setSuccess("");

        const {
          data: authData,
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const authUser =
          authData?.user;

        if (
          !authUser?.id ||
          !authUser?.email
        ) {
          throw new Error(
            "Your authenticated account could not be verified."
          );
        }

        /*
         * Verify the current password without replacing the active
         * browser session. A temporary Supabase client is not needed:
         * signInWithPassword refreshes the same authenticated user,
         * then updateUser changes only that verified account.
         */
        const {
          error:
            verificationError,
        } =
          await supabase.auth.signInWithPassword({
            email:
              authUser.email,
            password:
              passwordForm.currentPassword,
          });

        if (
          verificationError
        ) {
          throw new Error(
            "Current password is incorrect."
          );
        }

        const {
          error:
            passwordError,
        } =
          await supabase.auth.updateUser({
            password:
              passwordForm.newPassword,
          });

        if (
          passwordError
        ) {
          throw passwordError;
        }

        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });

        setSuccess(
          "Password updated successfully."
        );
      } catch (err) {
        console.error(
          "Failed to update password:",
          err
        );

        setError(
          err?.message ||
            "Unable to update your password."
        );
      } finally {
        setChangingPassword(
          false
        );
      }
    };

  if (loading) {
    return (
      <OfficeStaffLayout>
        <div className="mx-auto flex min-h-[65vh] w-full max-w-[1300px] items-center justify-center">
          <div className="text-center">
            <FaSpinner className="mx-auto animate-spin text-3xl text-blue-600 dark:text-blue-400" />

            <p className="mt-4 text-sm font-black text-slate-800 dark:text-slate-200">
              Loading Profile
            </p>

            <p className="mt-1 text-xs font-medium text-slate-500">
              Retrieving your account and office assignment.
            </p>
          </div>
        </div>
      </OfficeStaffLayout>
    );
  }

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1300px] space-y-6">
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
            View your office assignment and manage your personal account information.
          </p>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            <FaExclamationTriangle className="mt-0.5 shrink-0" />

            <div>
              <p className="text-sm font-black">
                Account Error
              </p>

              <p className="mt-1 text-xs font-medium leading-5">
                {error}
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <FaCheckCircle className="mt-0.5 shrink-0" />

            <div>
              <p className="text-sm font-black">
                Success
              </p>

              <p className="mt-1 text-xs font-medium leading-5">
                {success}
              </p>
            </div>
          </div>
        )}

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative overflow-hidden p-6 sm:p-7">
            <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl dark:bg-blue-500/10" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-950 text-2xl font-black text-white shadow-xl dark:bg-blue-600">
                {getInitials(
                  profile.fullName
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                    {profile.fullName}
                  </h2>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${
                      String(
                        profile.accountStatus
                      ).toLowerCase() ===
                      "active"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    }`}
                  >
                    <FaCheckCircle />
                    {profile.accountStatus ||
                      "Unknown"}
                  </span>
                </div>

                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {profile.employeeId ||
                    "No Employee ID"}{" "}
                  • {profile.office}
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
          <div className="space-y-6">
            <form
              onSubmit={
                saveProfile
              }
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
                  Update your basic account information.
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
                        value={
                          profile.email
                        }
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
                      profile.employeeId ||
                      "—"
                    }
                  />

                  <ReadOnlyField
                    icon={FaUserTie}
                    label="System Role"
                    value={
                      profile.role
                    }
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
                    {saving ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaSave />
                    )}

                    {saving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>

            <form
              onSubmit={
                updatePassword
              }
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
                  Update the password used to access your account.
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
                    autoComplete="current-password"
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
                      autoComplete="new-password"
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
                      autoComplete="new-password"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-5 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={
                      changingPassword
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-blue-600"
                  >
                    {changingPassword ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaLock />
                    )}

                    {changingPassword
                      ? "Updating..."
                      : "Update Password"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <aside className="space-y-6">
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
                  Office assignments are controlled by the Administrator and cannot be changed from this profile.
                </p>
              </div>
            </div>

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
                    profile.accountStatus ||
                    "Unknown"
                  }
                  active={
                    String(
                      profile.accountStatus
                    ).toLowerCase() ===
                    "active"
                  }
                />

                <AccessItem
                  label="Portal"
                  value="Office Staff"
                />

                <AccessItem
                  label="Clearance Office"
                  value={
                    profile.office
                  }
                />

                <AccessItem
                  label="Approver Type"
                  value={
                    profile.approverType ||
                    "Office"
                  }
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-start gap-3">
                <FaShieldAlt className="mt-0.5 shrink-0 text-slate-400" />

                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                    Account Security
                  </p>

                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
                    Clearance actions are associated with your authenticated staff account and its active office assignment.
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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

const labelClass =
  "mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400";

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

function mapProfile(
  user,
  office
) {
  return {
    id: user?.id || "",
    authId:
      user?.auth_id || "",
    fullName:
      user?.full_name ||
      "Office Staff",
    employeeId:
      user?.employee_id ||
      "",
    email:
      user?.email || "",
    role: "Office Staff",
    office:
      office?.office_name ||
      office?.name ||
      "Office",
    officeCode:
      office?.office_code ||
      office?.code ||
      "OFFICE",
    accountStatus:
      user?.status ||
      "Unknown",
    approverType:
      user?.approver_type ||
      "Office",
  };
}

function getInitials(name) {
  return String(
    name || "Office Staff"
  )
    .split(" ")
    .filter(Boolean)
    .map(
      (part) => part[0]
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default Profile;
