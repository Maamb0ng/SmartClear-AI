import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  motion,
} from "framer-motion";

import Swal from "sweetalert2";

import AdminLayout from "../../layouts/AdminLayout";

import {
  supabase,
} from "../../services/supabase";

import {
  FaCheckCircle,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaIdBadge,
  FaKey,
  FaRobot,
  FaSave,
  FaShieldAlt,
  FaSyncAlt,
  FaUserCircle,
} from "react-icons/fa";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

const initialForm = {
  full_name: "",
  email: "",
  role: "Administrator",
  employee_id: "",
  status: "",
  new_password: "",
  confirm_password: "",
};

function Profile() {
  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    formData,
    setFormData,
  ] = useState(initialForm);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const loadProfile =
    async () => {
      try {
        setLoading(true);

        const {
          data: {
            user: authUser,
          },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!authUser) {
          throw new Error(
            "Please sign in before opening your profile."
          );
        }

        const {
          data,
          error,
        } = await supabase
          .from("users")
          .select(
            "id, auth_id, full_name, email, employee_id, role, status, created_at"
          )
          .eq(
            "auth_id",
            authUser.id
          )
          .single();

        if (error) {
          throw error;
        }

        if (
          data?.role !==
          "Administrator"
        ) {
          throw new Error(
            "This profile page is only available to Administrator accounts."
          );
        }

        setProfile(data);

        setFormData({
          full_name:
            data.full_name || "",
          email:
            data.email ||
            authUser.email ||
            "",
          role:
            data.role ||
            "Administrator",
          employee_id:
            data.employee_id ||
            "",
          status:
            data.status ||
            "",
          new_password: "",
          confirm_password: "",
        });
      } catch (error) {
        console.error(
          "Load admin profile error:",
          error
        );

        await Swal.fire({
          icon: "error",
          title:
            "Unable to Load Profile",
          text:
            error?.message ||
            "An unexpected error occurred while loading the administrator profile.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadProfile();
  }, []);

  const profileInitial =
    useMemo(() => {
      return (
        formData.full_name
          ?.trim()
          .charAt(0)
          .toUpperCase() ||
        "A"
      );
    }, [
      formData.full_name,
    ]);

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (
        previousData
      ) => ({
        ...previousData,
        [name]: value,
      })
    );
  };

  const validateForm = () => {
    if (
      !formData.full_name.trim()
    ) {
      return "Full name is required.";
    }

    if (
      !formData.email.trim()
    ) {
      return "Email address is required.";
    }

    if (
      formData.new_password &&
      formData.new_password.length <
        8
    ) {
      return "The new password must contain at least 8 characters.";
    }

    if (
      formData.new_password !==
      formData.confirm_password
    ) {
      return "The password confirmation does not match.";
    }

    return null;
  };

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      const validationError =
        validateForm();

      if (
        validationError
      ) {
        await Swal.fire({
          icon: "warning",
          title:
            "Check Your Information",
          text:
            validationError,
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      try {
        setSaving(true);

        const normalizedEmail =
          formData.email
            .trim()
            .toLowerCase();

        const {
          data: {
            user: authUser,
          },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!authUser) {
          throw new Error(
            "Your session has expired. Please sign in again."
          );
        }

        const authUpdates = {
          data: {
            full_name:
              formData.full_name.trim(),
          },
        };

        if (
          normalizedEmail !==
          authUser.email
        ) {
          authUpdates.email =
            normalizedEmail;
        }

        if (
          formData.new_password
        ) {
          authUpdates.password =
            formData.new_password;
        }

        const {
          error:
            updateAuthError,
        } =
          await supabase.auth.updateUser(
            authUpdates
          );

        if (
          updateAuthError
        ) {
          throw updateAuthError;
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
              formData.full_name.trim(),
            email:
              normalizedEmail,
          })
          .eq(
            "id",
            profile.id
          )
          .select(
            "id, auth_id, full_name, email, employee_id, role, status, created_at"
          )
          .single();

        if (
          profileError
        ) {
          throw profileError;
        }

        setProfile(
          updatedProfile
        );

        setFormData(
          (
            previousData
          ) => ({
            ...previousData,
            full_name:
              updatedProfile.full_name ||
              previousData.full_name,
            email:
              updatedProfile.email ||
              normalizedEmail,
            new_password: "",
            confirm_password:
              "",
          })
        );

        await Swal.fire({
          icon: "success",
          title:
            "Profile Updated",
          text:
            normalizedEmail !==
            authUser.email
              ? "Your profile was saved. Supabase may require email verification before the new email becomes active."
              : "Your administrator profile was updated successfully.",
          timer: 2200,
          showConfirmButton:
            false,
        });
      } catch (error) {
        console.error(
          "Update admin profile error:",
          error
        );

        await Swal.fire({
          icon: "error",
          title:
            "Update Failed",
          text:
            error?.message ||
            "Unable to update the administrator profile.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />

              <FaUserCircle className="text-2xl text-blue-700" />
            </div>

            <p className="mt-5 font-bold text-slate-700">
              Loading administrator profile...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.main
        initial={{
          opacity: 0,
          y: 16,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.55,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
        className="relative space-y-6 overflow-hidden pb-10"
      >
        <div className="pointer-events-none absolute -right-44 top-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

        {/* Header */}

        <section className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061b51] text-white shadow-[0_24px_60px_rgba(2,12,40,0.24)]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{
              backgroundImage:
                `url(${campusImage})`,
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#03143f]/98 via-[#082a70]/94 to-[#0b4f92]/82" />

          <motion.div
            animate={{
              x: [
                0,
                24,
                0,
              ],
              y: [
                0,
                -14,
                0,
              ],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
          />

          <div className="relative z-10 flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <motion.div
                whileHover={{
                  rotate: 4,
                  scale: 1.04,
                }}
                className="hidden h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white p-1 shadow-xl sm:block"
              >
                <img
                  src={
                    schoolLogo
                  }
                  alt="Consolatrix College seal"
                  className="h-full w-full rounded-full object-cover"
                />
              </motion.div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-100">
                  <FaShieldAlt className="text-cyan-300" />
                  Account Settings
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Administrator Profile
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
                  Review your administrator information, update your account
                  details, and keep your SmartClear access secure.
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{
                y: -2,
              }}
              whileTap={{
                scale: 0.98,
              }}
              type="button"
              onClick={
                loadProfile
              }
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 lg:self-center"
            >
              <FaSyncAlt />
              Refresh Profile
            </motion.button>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          {/* Profile Summary */}

          <motion.aside
            initial={{
              opacity: 0,
              x: -20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              delay: 0.08,
              duration: 0.5,
            }}
            className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#061b51] via-[#082a70] to-[#0b4f92] p-6 text-white shadow-[0_20px_50px_rgba(2,12,40,0.2)]"
          >
            <motion.div
              animate={{
                x: [
                  0,
                  18,
                  0,
                ],
                y: [
                  0,
                  -10,
                  0,
                ],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-cyan-300/15 blur-3xl"
            />

            <div className="relative z-10">
              <motion.div
                whileHover={{
                  scale: 1.04,
                }}
                className="mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/15 bg-white/10 text-5xl font-black text-cyan-300 shadow-xl backdrop-blur"
              >
                {
                  profileInitial
                }
              </motion.div>

              <div className="mt-5 text-center">
                <h2 className="text-2xl font-black">
                  {formData.full_name ||
                    "Administrator"}
                </h2>

                <p className="mt-1 text-sm text-blue-100/65">
                  {
                    formData.email
                  }
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-bold text-cyan-200">
                  <FaShieldAlt />
                  {
                    formData.role
                  }
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3">
                  <FaIdBadge className="text-cyan-300" />

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-blue-100/45">
                      Employee ID
                    </p>

                    <p className="mt-0.5 text-sm font-bold">
                      {formData.employee_id ||
                        "Not assigned"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3">
                  <FaCheckCircle className="text-emerald-300" />

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-blue-100/45">
                      Account Status
                    </p>

                    <p className="mt-0.5 text-sm font-bold">
                      {formData.status ||
                        "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3">
                  <FaRobot className="text-violet-300" />

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-blue-100/45">
                      Portal Access
                    </p>

                    <p className="mt-0.5 text-sm font-bold">
                      SmartClear Administration
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>

          {/* Profile Form */}

          <motion.section
            initial={{
              opacity: 0,
              x: 20,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            transition={{
              delay: 0.12,
              duration: 0.5,
            }}
            className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.09)]"
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                Profile Information
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900">
                Update Account Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Leave the password fields empty when you do not need to change
                your password.
              </p>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-6 p-5 sm:p-6"
            >
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="admin-full-name"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Full Name
                  </label>

                  <div className="relative">
                    <FaUserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      id="admin-full-name"
                      type="text"
                      name="full_name"
                      value={
                        formData.full_name
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Enter administrator name"
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="admin-email"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      id="admin-email"
                      type="email"
                      name="email"
                      value={
                        formData.email
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Enter administrator email"
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admin-role"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Role
                  </label>

                  <div className="relative">
                    <FaShieldAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      id="admin-role"
                      type="text"
                      value={
                        formData.role
                      }
                      readOnly
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-100 pl-12 pr-4 text-sm font-semibold text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admin-employee-id"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    Employee ID
                  </label>

                  <div className="relative">
                    <FaIdBadge className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input
                      id="admin-employee-id"
                      type="text"
                      value={
                        formData.employee_id ||
                        "Not assigned"
                      }
                      readOnly
                      className="h-12 w-full rounded-xl border border-slate-200 bg-slate-100 pl-12 pr-4 text-sm font-semibold text-slate-600"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="mb-4">
                  <p className="text-sm font-black text-slate-900">
                    Change Password
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Use at least eight characters for a stronger password.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="admin-new-password"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      New Password
                    </label>

                    <div className="relative">
                      <FaKey className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                      <input
                        id="admin-new-password"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        name="new_password"
                        value={
                          formData.new_password
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Enter new password"
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(
                            (
                              current
                            ) =>
                              !current
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-700"
                        aria-label="Toggle new password visibility"
                      >
                        {showPassword ? (
                          <FaEyeSlash />
                        ) : (
                          <FaEye />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="admin-confirm-password"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Confirm Password
                    </label>

                    <div className="relative">
                      <FaKey className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

                      <input
                        id="admin-confirm-password"
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        name="confirm_password"
                        value={
                          formData.confirm_password
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Confirm new password"
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (
                              current
                            ) =>
                              !current
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-700"
                        aria-label="Toggle confirm password visibility"
                      >
                        {showConfirmPassword ? (
                          <FaEyeSlash />
                        ) : (
                          <FaEye />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale: 0.985,
                }}
                type="submit"
                disabled={
                  saving
                }
                className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] transition hover:shadow-[0_18px_34px_rgba(37,99,235,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaSave />

                {saving
                  ? "Saving Changes..."
                  : "Save Changes"}
              </motion.button>
            </form>
          </motion.section>
        </div>
      </motion.main>
    </AdminLayout>
  );
}

export default Profile;