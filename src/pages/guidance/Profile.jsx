import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

import {
  FaBriefcase,
  FaBuilding,
  FaCheckCircle,
  FaEnvelope,
  FaIdBadge,
  FaRedo,
  FaShieldAlt,
  FaSpinner,
  FaUser,
  FaUserCircle,
} from "react-icons/fa";

import GuidanceLayout from "../../layouts/GuidanceLayout";
import { supabase } from "../../services/supabase";

const GUIDANCE_OFFICE_CODE = "GUI";

const normalizeValue = (value) =>
  String(value || "").trim().toLowerCase();

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

function Profile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [profile, setProfile] = useState(null);
  const [guidanceOffice, setGuidanceOffice] = useState(null);
  const [assignment, setAssignment] = useState(null);

  // =========================================================
  // LOAD PROFILE
  // =========================================================

  const loadProfile = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        // =====================================================
        // AUTH USER
        // =====================================================

        const {
          data: authData,
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const authUser = authData?.user;

        if (!authUser) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        // =====================================================
        // USER PROFILE
        // =====================================================

        const {
          data: userProfile,
          error: profileError,
        } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", authUser.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!userProfile) {
          throw new Error(
            "Guidance account profile was not found."
          );
        }

        if (
          normalizeValue(userProfile.role) !== "approver"
        ) {
          throw new Error(
            "This account is not authorized to access the Guidance portal."
          );
        }

        if (
          normalizeValue(userProfile.status) !== "active"
        ) {
          throw new Error(
            "Your Guidance account is not active."
          );
        }

        // =====================================================
        // GUIDANCE ASSIGNMENT
        // =====================================================

        const {
          data: assignments,
          error: assignmentError,
        } = await supabase
          .from("approver_assignments")
          .select(`
            id,
            approver_id,
            office_id,
            is_active,
            created_at,
            offices!inner (
              id,
              office_name,
              office_code,
              is_active
            )
          `)
          .eq("approver_id", userProfile.id)
          .eq("is_active", true)
          .eq("offices.is_active", true);

        if (assignmentError) {
          throw assignmentError;
        }

        const guidanceAssignment = (
          assignments || []
        ).find((item) => {
          const office = item.offices;

          const officeCode = String(
            office?.office_code || ""
          )
            .trim()
            .toUpperCase();

          const officeName = normalizeValue(
            office?.office_name
          );

          return (
            officeCode === GUIDANCE_OFFICE_CODE ||
            officeName.includes("guidance")
          );
        });

        if (!guidanceAssignment) {
          throw new Error(
            "This account is not assigned to the Guidance office."
          );
        }

        setProfile(userProfile);
        setAssignment(guidanceAssignment);
        setGuidanceOffice(
          guidanceAssignment.offices
        );
      } catch (error) {
        console.error(
          "Unable to load Guidance profile:",
          error
        );

        await Swal.fire({
          icon: "error",
          title: "Unable to Load Profile",
          text:
            error?.message ||
            "Something went wrong while loading your Guidance profile.",
          confirmButtonColor: "#2563eb",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // =========================================================
  // REFRESH
  // =========================================================

  const handleRefresh = async () => {
    setRefreshing(true);

    await loadProfile({
      silent: true,
    });
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <GuidanceLayout>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <FaSpinner className="animate-spin text-2xl text-blue-600" />
            </div>

            <p className="mt-4 text-sm font-bold text-slate-800">
              Loading profile...
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Retrieving your Guidance account.
            </p>
          </div>
        </div>
      </GuidanceLayout>
    );
  }

  // =========================================================
  // PROFILE NOT AVAILABLE
  // =========================================================

  if (!profile) {
    return (
      <GuidanceLayout>
        <div className="flex min-h-[70vh] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <FaUserCircle className="text-4xl text-slate-400" />
            </div>

            <h2 className="mt-4 text-xl font-black text-slate-900">
              Profile Unavailable
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your Guidance profile could not be loaded.
            </p>

            <button
              type="button"
              onClick={() => loadProfile()}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <FaRedo />
              Try Again
            </button>
          </div>
        </div>
      </GuidanceLayout>
    );
  }

  // =========================================================
  // PROFILE DISPLAY DATA
  // =========================================================

  const initials = String(
    profile.full_name ||
      profile.email ||
      "G"
  )
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0).toUpperCase()
    )
    .join("");

  const displayName =
    profile.full_name || "Guidance Counselor";

  const officeName =
    guidanceOffice?.office_name ||
    "Guidance Office";

  const officeCode =
    guidanceOffice?.office_code ||
    GUIDANCE_OFFICE_CODE;

  // =========================================================
  // UI
  // =========================================================

  return (
    <GuidanceLayout>
      <div className="mx-auto max-w-[1450px] space-y-5">
        {/* ===================================================
            PAGE HEADER
        =================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: -10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.3,
          }}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-900 px-6 py-6 sm:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                {/* AVATAR */}

                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-xl font-black text-white shadow-sm">
                  {initials || "G"}
                </div>

                {/* NAME */}

                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-100">
                      <FaShieldAlt />
                      Guidance Portal
                    </span>

                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-200">
                      <FaCheckCircle />
                      Active
                    </span>
                  </div>

                  <h1 className="truncate text-2xl font-black tracking-tight text-white sm:text-[28px]">
                    {displayName}
                  </h1>

                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-300">
                    <FaBuilding className="text-blue-300" />
                    {officeName}
                  </p>
                </div>
              </div>

              {/* REFRESH */}

              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaRedo
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                {refreshing
                  ? "Refreshing..."
                  : "Refresh Profile"}
              </button>
            </div>
          </div>

          {/* QUICK INFORMATION */}

          <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <FaCheckCircle />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Account Status
                </p>

                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {profile.status || "Active"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FaBuilding />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Assigned Office
                </p>

                <p className="mt-0.5 truncate text-sm font-bold text-slate-900">
                  {officeName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FaBriefcase />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Portal Access
                </p>

                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  Guidance Personnel
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ===================================================
            MAIN CONTENT
        =================================================== */}

        <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
          {/* =================================================
              ACCOUNT INFORMATION
          ================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.06,
              duration: 0.3,
            }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FaUser />
              </div>

              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Account Information
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Your registered SmartClear account details.
                </p>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              {/* FULL NAME */}

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                    <FaUser />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Full Name
                    </p>

                    <p className="mt-1 break-words text-sm font-bold text-slate-900">
                      {profile.full_name ||
                        "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* EMPLOYEE ID */}

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                    <FaIdBadge />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Employee ID
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {profile.employee_id ||
                        "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* EMAIL */}

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                    <FaEnvelope />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Email Address
                    </p>

                    <p className="mt-1 break-all text-sm font-bold text-slate-900">
                      {profile.email ||
                        "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* ROLE */}

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                    <FaShieldAlt />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      System Role
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-900">
                      Guidance Personnel
                    </p>

                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Database role:{" "}
                      {profile.role || "Approver"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* =================================================
              OFFICE ASSIGNMENT
          ================================================= */}

          <motion.section
            initial={{
              opacity: 0,
              y: 12,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.1,
              duration: 0.3,
            }}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FaBuilding />
              </div>

              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Office Assignment
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Current clearance workspace.
                </p>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-sm">
                    <FaBuilding />
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                    <FaCheckCircle />
                    Active
                  </span>
                </div>

                <p className="mt-5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Assigned Office
                </p>

                <h3 className="mt-1 text-lg font-black text-slate-900">
                  {officeName}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Office Code:{" "}
                  <span className="font-bold text-slate-700">
                    {officeCode}
                  </span>
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Assignment Status
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        assignment?.is_active
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      }`}
                    />

                    <p className="text-sm font-bold text-slate-800">
                      {assignment?.is_active
                        ? "Active"
                        : "Inactive"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Assigned Since
                  </p>

                  <p className="mt-2 text-sm font-bold text-slate-800">
                    {formatDate(
                      assignment?.created_at
                    )}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>
        </div>

        {/* ===================================================
            SECURITY / ADMIN NOTE
        =================================================== */}

        <motion.section
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.15,
            duration: 0.3,
          }}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
              <FaShieldAlt />
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-800">
                Account Management
              </h3>

              <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500">
                Your employee ID, system role, account status,
                and office assignment are managed by the
                SmartClear Administrator to keep Guidance
                clearance access controlled and accurate.
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </GuidanceLayout>
  );
}

export default Profile;