import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import Swal from "sweetalert2";

import DashboardLayout from "../../layouts/DashboardLayout";

import {
  supabase,
} from "../../services/supabase";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaEdit,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaGraduationCap,
  FaIdCard,
  FaLayerGroup,
  FaLock,
  FaMapMarkerAlt,
  FaPhone,
  FaSave,
  FaShieldAlt,
  FaSyncAlt,
  FaTimes,
  FaUserGraduate,
} from "react-icons/fa";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

const createEditForm = () => ({
  full_name: "",
  email: "",
  contact_number: "",
  address: "",
});

const createPasswordForm = () => ({
  new_password: "",
  confirm_password: "",
});

const getFirstAvailable = (
  values,
  fallback = "Not provided"
) => {
  const value = values.find(
    (item) =>
      item !== null &&
      item !== undefined &&
      String(item).trim() !== ""
  );

  return value !== undefined
    ? String(value)
    : fallback;
};

function Profile() {
  const [
    authUser,
    setAuthUser,
  ] = useState(null);

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    section,
    setSection,
  ] = useState(null);

  const [
    course,
    setCourse,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const [
    showEditModal,
    setShowEditModal,
  ] = useState(false);

  const [
    showPasswordModal,
    setShowPasswordModal,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    editForm,
    setEditForm,
  ] = useState(
    createEditForm
  );

  const [
    passwordForm,
    setPasswordForm,
  ] = useState(
    createPasswordForm
  );

  const loadProfile =
    useCallback(
      async (
        isRefresh = false
      ) => {
        try {
          if (
            isRefresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          const {
            data: {
              user,
            },
            error:
              authError,
          } =
            await supabase.auth.getUser();

          if (
            authError
          ) {
            throw authError;
          }

          if (!user) {
            throw new Error(
              "Your session has expired. Please sign in again."
            );
          }

          setAuthUser(
            user
          );

          const {
            data:
              profileData,
            error:
              profileError,
          } = await supabase
            .from("users")
            .select("*")
            .eq(
              "auth_id",
              user.id
            )
            .single();

          if (
            profileError
          ) {
            throw profileError;
          }

          if (
            profileData.role !==
            "Student"
          ) {
            throw new Error(
              "This page is only available to Student accounts."
            );
          }

          setProfile(
            profileData
          );

          setEditForm({
            full_name:
              profileData.full_name ||
              user.user_metadata
                ?.full_name ||
              "",
            email:
              profileData.email ||
              user.email ||
              "",
            contact_number:
              profileData.contact_number ||
              profileData.phone ||
              profileData.mobile_number ||
              user.user_metadata
                ?.contact_number ||
              "",
            address:
              profileData.address ||
              profileData.home_address ||
              user.user_metadata
                ?.address ||
              "",
          });

          let sectionData =
            null;

          if (
            profileData.section_id
          ) {
            const {
              data,
              error,
            } = await supabase
              .from("sections")
              .select("*")
              .eq(
                "id",
                profileData.section_id
              )
              .maybeSingle();

            if (error) {
              console.warn(
                "Unable to load section details:",
                error
              );
            } else {
              sectionData =
                data;
            }
          }

          setSection(
            sectionData
          );

          const courseId =
            profileData.course_id ||
            sectionData?.course_id ||
            null;

          let courseData =
            null;

          if (courseId) {
            const {
              data,
              error,
            } = await supabase
              .from("courses")
              .select("*")
              .eq(
                "id",
                courseId
              )
              .maybeSingle();

            if (error) {
              console.warn(
                "Unable to load course details:",
                error
              );
            } else {
              courseData =
                data;
            }
          }

          setCourse(
            courseData
          );
        } catch (
          error
        ) {
          console.error(
            "Load student profile error:",
            error
          );

          await Swal.fire({
            icon: "error",
            title:
              "Unable to Load Profile",
            text:
              error?.message ||
              "An unexpected error occurred while loading your profile.",
            confirmButtonColor:
              "#2563eb",
          });
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    loadProfile();
  }, [
    loadProfile,
  ]);

  useEffect(() => {
    if (
      !profile?.id
    ) {
      return undefined;
    }

    const channel =
      supabase
        .channel(
          `student-profile-${profile.id}`
        )
        .on(
          "postgres_changes",
          {
            event:
              "UPDATE",
            schema:
              "public",
            table:
              "users",
            filter:
              `id=eq.${profile.id}`,
          },
          () => {
            loadProfile(
              true
            );
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    profile?.id,
    loadProfile,
  ]);

  const displayName =
    getFirstAvailable(
      [
        profile?.full_name,
        authUser
          ?.user_metadata
          ?.full_name,
        authUser?.email
          ?.split("@")[0],
      ],
      "Student"
    );

  const initials =
    useMemo(() => {
      const words =
        displayName
          .trim()
          .split(/\s+/)
          .filter(
            Boolean
          );

      if (
        words.length ===
        0
      ) {
        return "ST";
      }

      if (
        words.length ===
        1
      ) {
        return words[0]
          .slice(0, 2)
          .toUpperCase();
      }

      return `${words[0][0]}${
        words[
          words.length - 1
        ][0]
      }`.toUpperCase();
    }, [
      displayName,
    ]);

  const studentNumber =
    getFirstAvailable(
      [
        profile?.student_id,
        profile?.student_number,
      ],
      "Not assigned"
    );

  const courseName =
    getFirstAvailable(
      [
        course?.course_name,
        course?.name,
        course?.program_name,
        profile?.course_name,
        profile?.course,
      ],
      "Not assigned"
    );

  const courseCode =
    getFirstAvailable(
      [
        course?.course_code,
        course?.code,
        profile?.course_code,
      ],
      ""
    );

  const programDisplay =
    courseCode
      ? `${courseCode} — ${courseName}`
      : courseName;

  const yearLevel =
    getFirstAvailable(
      [
        section?.year_level,
        profile?.year_level,
      ],
      "Not assigned"
    );

  const sectionName =
    getFirstAvailable(
      [
        section?.section_name,
        section?.block_name,
        section?.name,
        profile?.section,
        profile?.block,
      ],
      "Not assigned"
    );

  const semester =
    getFirstAvailable(
      [
        profile?.semester,
      ],
      "Not assigned"
    );

  const schoolYear =
    getFirstAvailable(
      [
        profile?.school_year,
      ],
      "Not assigned"
    );

  const email =
    getFirstAvailable(
      [
        profile?.email,
        authUser?.email,
      ]
    );

  const phone =
    getFirstAvailable(
      [
        profile?.contact_number,
        profile?.phone,
        profile?.mobile_number,
        authUser
          ?.user_metadata
          ?.contact_number,
      ]
    );

  const address =
    getFirstAvailable(
      [
        profile?.address,
        profile?.home_address,
        authUser
          ?.user_metadata
          ?.address,
      ]
    );

  const status =
    getFirstAvailable(
      [
        profile?.status,
      ],
      "Unknown"
    );

  const handleEditChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } = event.target;

      setEditForm(
        (
          current
        ) => ({
          ...current,
          [name]: value,
        })
      );
    };

  const handlePasswordChange =
    (
      event
    ) => {
      const {
        name,
        value,
      } = event.target;

      setPasswordForm(
        (
          current
        ) => ({
          ...current,
          [name]: value,
        })
      );
    };

  const openEditModal =
    () => {
      setEditForm({
        full_name:
          displayName,
        email,
        contact_number:
          phone === "Not provided"
            ? ""
            : phone,
        address:
          address === "Not provided"
            ? ""
            : address,
      });

      setShowEditModal(
        true
      );
    };

  const closeEditModal =
    () => {
      if (
        savingProfile
      ) {
        return;
      }

      setShowEditModal(
        false
      );
    };

  const closePasswordModal =
    () => {
      if (
        changingPassword
      ) {
        return;
      }

      setShowPasswordModal(
        false
      );

      setPasswordForm(
        createPasswordForm()
      );

      setShowNewPassword(
        false
      );

      setShowConfirmPassword(
        false
      );
    };

  const saveProfile =
    async (
      event
    ) => {
      event.preventDefault();

      const fullName =
        editForm.full_name.trim();

      const normalizedEmail =
        editForm.email
          .trim()
          .toLowerCase();

      const contactNumber =
        editForm.contact_number
          .trim();

      const homeAddress =
        editForm.address
          .trim();

      if (!fullName) {
        await Swal.fire({
          icon:
            "warning",
          title:
            "Full Name Required",
          text:
            "Please enter your full name.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      if (!normalizedEmail) {
        await Swal.fire({
          icon:
            "warning",
          title:
            "Email Required",
          text:
            "Please enter your email address.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      try {
        setSavingProfile(
          true
        );

        const authUpdates = {
          data: {
            full_name:
              fullName,
            contact_number:
              contactNumber ||
              null,
            address:
              homeAddress ||
              null,
          },
        };

        if (
          normalizedEmail !==
          authUser?.email
        ) {
          authUpdates.email =
            normalizedEmail;
        }

        const {
          error:
            authUpdateError,
        } =
          await supabase.auth.updateUser(
            authUpdates
          );

        if (
          authUpdateError
        ) {
          throw authUpdateError;
        }

        const profileUpdatePayload = {
          full_name:
            fullName,
          email:
            normalizedEmail,
        };

        const contactColumn = [
          "contact_number",
          "phone",
          "mobile_number",
        ].find((column) =>
          Object.prototype.hasOwnProperty.call(
            profile,
            column
          )
        );

        const addressColumn = [
          "address",
          "home_address",
        ].find((column) =>
          Object.prototype.hasOwnProperty.call(
            profile,
            column
          )
        );

        if (contactColumn) {
          profileUpdatePayload[
            contactColumn
          ] =
            contactNumber ||
            null;
        }

        if (addressColumn) {
          profileUpdatePayload[
            addressColumn
          ] =
            homeAddress ||
            null;
        }

        const {
          error:
            profileUpdateError,
        } = await supabase
          .from("users")
          .update(
            profileUpdatePayload
          )
          .eq(
            "id",
            profile.id
          );

        if (
          profileUpdateError
        ) {
          throw profileUpdateError;
        }

        setShowEditModal(
          false
        );

        await loadProfile(
          true
        );

        await Swal.fire({
          icon:
            "success",
          title:
            "Profile Updated",
          text:
            normalizedEmail !==
            authUser?.email
              ? "Your profile was updated. Supabase may require verification before the new email becomes active."
              : "Your personal account information was updated successfully.",
          timer: 2200,
          showConfirmButton:
            false,
        });
      } catch (
        error
      ) {
        console.error(
          "Update student profile error:",
          error
        );

        await Swal.fire({
          icon:
            "error",
          title:
            "Update Failed",
          text:
            error?.message ||
            "Unable to update your profile.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setSavingProfile(
          false
        );
      }
    };

  const changePassword =
    async (
      event
    ) => {
      event.preventDefault();

      if (
        passwordForm
          .new_password
          .length < 8
      ) {
        await Swal.fire({
          icon:
            "warning",
          title:
            "Password Too Short",
          text:
            "Use at least eight characters for your new password.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      if (
        passwordForm
          .new_password !==
        passwordForm
          .confirm_password
      ) {
        await Swal.fire({
          icon:
            "warning",
          title:
            "Passwords Do Not Match",
          text:
            "The password confirmation does not match.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      try {
        setChangingPassword(
          true
        );

        const {
          error,
        } =
          await supabase.auth.updateUser({
            password:
              passwordForm.new_password,
          });

        if (error) {
          throw error;
        }

        closePasswordModal();

        await Swal.fire({
          icon:
            "success",
          title:
            "Password Updated",
          text:
            "Your SmartClear account password was changed successfully.",
          timer: 1900,
          showConfirmButton:
            false,
        });
      } catch (
        error
      ) {
        console.error(
          "Change student password error:",
          error
        );

        await Swal.fire({
          icon:
            "error",
          title:
            "Password Update Failed",
          text:
            error?.message ||
            "Unable to update your password.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setChangingPassword(
          false
        );
      }
    };

  const informationCards = [
    {
      label:
        "Student Number",
      value:
        studentNumber,
      icon:
        FaIdCard,
      iconClass:
        "bg-blue-100 text-blue-700",
    },
    {
      label:
        "Program",
      value:
        programDisplay,
      icon:
        FaGraduationCap,
      iconClass:
        "bg-emerald-100 text-emerald-700",
    },
    {
      label:
        "Year & Block",
      value:
        `${yearLevel} • ${sectionName}`,
      icon:
        FaLayerGroup,
      iconClass:
        "bg-violet-100 text-violet-700",
    },
    {
      label:
        "Academic Term",
      value:
        `${semester} • ${schoolYear}`,
      icon:
        FaCalendarAlt,
      iconClass:
        "bg-amber-100 text-amber-700",
    },
    {
      label:
        "Email Address",
      value:
        email,
      icon:
        FaEnvelope,
      iconClass:
        "bg-rose-100 text-rose-700",
    },
    {
      label:
        "Contact Number",
      value:
        phone,
      icon:
        FaPhone,
      iconClass:
        "bg-cyan-100 text-cyan-700",
    },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-100 border-t-blue-700" />

              <FaUserGraduate className="text-2xl text-blue-700" />
            </div>

            <p className="mt-5 font-bold text-slate-700">
              Loading student profile...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
          duration:
            0.55,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
        className="relative space-y-6 overflow-hidden pb-10"
      >
        <div className="pointer-events-none absolute -right-44 top-36 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

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
              duration:
                10,
              repeat:
                Infinity,
              ease:
                "easeInOut",
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
                  <FaUserGraduate className="text-cyan-300" />
                  Student Account
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Student Profile
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
                  Review your SmartClear account, verified academic information,
                  and account security settings.
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{
                y: -2,
              }}
              whileTap={{
                scale:
                  0.98,
              }}
              type="button"
              onClick={() =>
                loadProfile(
                  true
                )
              }
              disabled={
                refreshing
              }
              className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-50 lg:self-center"
            >
              <FaSyncAlt
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh Profile"}
            </motion.button>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          {/* Profile summary */}

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
              delay:
                0.08,
              duration:
                0.5,
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
                duration:
                  8,
                repeat:
                  Infinity,
                ease:
                  "easeInOut",
              }}
              className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-cyan-300/15 blur-3xl"
            />

            <div className="relative z-10 text-center">
              <motion.div
                whileHover={{
                  scale:
                    1.04,
                }}
                className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/15 bg-white/10 text-4xl font-black text-cyan-300 shadow-xl backdrop-blur"
              >
                {
                  initials
                }

                <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-[#082a70] bg-emerald-400" />
              </motion.div>

              <h2 className="mt-5 text-2xl font-black">
                {
                  displayName
                }
              </h2>

              <p className="mt-1 text-sm text-blue-100/65">
                {
                  programDisplay
                }
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-bold text-cyan-200">
                <FaShieldAlt />
                {status} Student
              </div>

              <div className="mt-6 space-y-3 text-left">
                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/45">
                    Official Section
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {yearLevel} • {sectionName}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-100/45">
                    Current Term
                  </p>

                  <p className="mt-1 text-sm font-black">
                    {semester} • {schoolYear}
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale:
                    0.98,
                }}
                type="button"
                onClick={
                  openEditModal
                }
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#082a70] shadow-lg transition hover:bg-blue-50"
              >
                <FaEdit />
                Edit Account Information
              </motion.button>
            </div>
          </motion.aside>

          {/* Details */}

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
              delay:
                0.12,
              duration:
                0.5,
            }}
            className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.09)]"
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                Verified Information
              </p>

              <h2 className="mt-1 text-2xl font-black text-slate-900">
                Personal & Academic Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Academic assignments are managed and verified by the
                Administrator.
              </p>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2 sm:p-6">
              {informationCards.map(
                (
                  item,
                  index
                ) => {
                  const Icon =
                    item.icon;

                  return (
                    <motion.article
                      key={
                        item.label
                      }
                      initial={{
                        opacity: 0,
                        y: 12,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      transition={{
                        delay:
                          0.16 +
                          index *
                            0.05,
                      }}
                      whileHover={{
                        y: -3,
                      }}
                      className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.iconClass}`}
                      >
                        <Icon />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                          {
                            item.label
                          }
                        </p>

                        <p className="mt-1 break-words text-sm font-black text-slate-800">
                          {
                            item.value
                          }
                        </p>
                      </div>
                    </motion.article>
                  );
                }
              )}

              <motion.article
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay:
                    0.48,
                }}
                whileHover={{
                  y: -3,
                }}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)] md:col-span-2"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <FaMapMarkerAlt />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                    Address
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-800">
                    {
                      address
                    }
                  </p>
                </div>
              </motion.article>

              {/* Security */}

              <div className="mt-2 border-t border-slate-100 pt-6 md:col-span-2">
                <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#071b4b] text-xl text-cyan-300">
                      <FaLock />
                    </div>

                    <div>
                      <h3 className="font-black text-slate-900">
                        Account Security
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Use a strong password and update it whenever you suspect
                        unauthorized access.
                      </p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{
                      y: -2,
                    }}
                    whileTap={{
                      scale:
                        0.98,
                    }}
                    type="button"
                    onClick={() =>
                      setShowPasswordModal(
                        true
                      )
                    }
                    className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#071b4b] px-5 text-sm font-black text-white transition hover:bg-[#082a70]"
                  >
                    <FaLock />
                    Change Password
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.section>
        </div>

        {/* Edit modal */}

        <AnimatePresence>
          {showEditModal && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
              onClick={
                closeEditModal
              }
            >
              <motion.div
                initial={{
                  opacity: 0,
                  y: 24,
                  scale:
                    0.97,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 18,
                  scale:
                    0.97,
                }}
                onClick={(
                  event
                ) =>
                  event.stopPropagation()
                }
                className="w-full max-w-lg overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4 bg-[#061b51] p-5 text-white sm:p-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/70">
                      Student Account
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      Edit Profile
                    </h2>

                    <p className="mt-1 text-xs text-blue-100/60">
                      Academic information can only be changed by the
                      Administrator.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeEditModal
                    }
                    disabled={
                      savingProfile
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-blue-100 transition hover:bg-white/15"
                  >
                    <FaTimes />
                  </button>
                </div>

                <form
                  onSubmit={
                    saveProfile
                  }
                  className="space-y-5 p-5 sm:p-6"
                >
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Full Name
                    </span>

                    <input
                      type="text"
                      name="full_name"
                      value={
                        editForm.full_name
                      }
                      onChange={
                        handleEditChange
                      }
                      className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Email Address
                    </span>

                    <input
                      type="email"
                      name="email"
                      value={
                        editForm.email
                      }
                      onChange={
                        handleEditChange
                      }
                      className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Contact Number
                    </span>

                    <input
                      type="tel"
                      name="contact_number"
                      value={
                        editForm.contact_number
                      }
                      onChange={
                        handleEditChange
                      }
                      placeholder="Example: 09XX XXX XXXX"
                      autoComplete="tel"
                      className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Home Address
                    </span>

                    <textarea
                      name="address"
                      value={
                        editForm.address
                      }
                      onChange={
                        handleEditChange
                      }
                      placeholder="Enter your current home address"
                      rows="3"
                      autoComplete="street-address"
                      className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>

                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-700">
                    You may edit your name, email, contact number, and
                    address. Student number, course, year level, block,
                    semester, and school year are verified academic records
                    and can only be changed by the Administrator.
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={
                        closeEditModal
                      }
                      disabled={
                        savingProfile
                      }
                      className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <motion.button
                      whileHover={{
                        y:
                          savingProfile
                            ? 0
                            : -2,
                      }}
                      whileTap={{
                        scale:
                          savingProfile
                            ? 1
                            : 0.98,
                      }}
                      type="submit"
                      disabled={
                        savingProfile
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FaSave />

                      {savingProfile
                        ? "Saving..."
                        : "Save Changes"}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Password modal */}

        <AnimatePresence>
          {showPasswordModal && (
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
              onClick={
                closePasswordModal
              }
            >
              <motion.div
                initial={{
                  opacity: 0,
                  y: 24,
                  scale:
                    0.97,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 18,
                  scale:
                    0.97,
                }}
                onClick={(
                  event
                ) =>
                  event.stopPropagation()
                }
                className="w-full max-w-lg overflow-hidden rounded-[1.75rem] bg-white shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4 bg-[#061b51] p-5 text-white sm:p-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/70">
                      Account Security
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      Change Password
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closePasswordModal
                    }
                    disabled={
                      changingPassword
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-blue-100 transition hover:bg-white/15"
                  >
                    <FaTimes />
                  </button>
                </div>

                <form
                  onSubmit={
                    changePassword
                  }
                  className="space-y-5 p-5 sm:p-6"
                >
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      New Password
                    </span>

                    <div className="relative">
                      <input
                        type={
                          showNewPassword
                            ? "text"
                            : "password"
                        }
                        name="new_password"
                        value={
                          passwordForm.new_password
                        }
                        onChange={
                          handlePasswordChange
                        }
                        placeholder="At least 8 characters"
                        className="h-12 w-full rounded-xl border border-slate-300 px-4 pr-12 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        required
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowNewPassword(
                            (
                              current
                            ) =>
                              !current
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-700"
                      >
                        {showNewPassword ? (
                          <FaEyeSlash />
                        ) : (
                          <FaEye />
                        )}
                      </button>
                    </div>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Confirm Password
                    </span>

                    <div className="relative">
                      <input
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        name="confirm_password"
                        value={
                          passwordForm.confirm_password
                        }
                        onChange={
                          handlePasswordChange
                        }
                        placeholder="Repeat your new password"
                        className="h-12 w-full rounded-xl border border-slate-300 px-4 pr-12 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        required
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
                      >
                        {showConfirmPassword ? (
                          <FaEyeSlash />
                        ) : (
                          <FaEye />
                        )}
                      </button>
                    </div>
                  </label>

                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-700">
                    After changing your password, use the new password the next
                    time you sign in to SmartClear AI.
                  </div>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={
                        closePasswordModal
                      }
                      disabled={
                        changingPassword
                      }
                      className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <motion.button
                      whileHover={{
                        y:
                          changingPassword
                            ? 0
                            : -2,
                      }}
                      whileTap={{
                        scale:
                          changingPassword
                            ? 1
                            : 0.98,
                      }}
                      type="submit"
                      disabled={
                        changingPassword
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 text-sm font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FaLock />

                      {changingPassword
                        ? "Updating..."
                        : "Update Password"}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </DashboardLayout>
  );
}

export default Profile;