import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import ApproverLayout from "../../layouts/ApproverLayout";
import { supabase } from "../../services/supabase";

import {
  FaCheckCircle,
  FaSearch,
  FaEye,
  FaBookOpen,
  FaBuilding,
  FaUsers,
  FaFilter,
  FaSortAmountDown,
} from "react-icons/fa";

function ApprovedRequests() {
  const navigate = useNavigate();

  const [approvedItems, setApprovedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [courseFilter, setCourseFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    loadApprovedRequests();
  }, []);

  const loadApprovedRequests = async () => {
    try {
      setLoading(true);

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authUser) {
        throw new Error("You are not logged in.");
      }

      const { data: approver, error: approverError } = await supabase
        .from("users")
        .select(`
          id,
          auth_id,
          full_name,
          employee_id,
          role,
          status
        `)
        .eq("auth_id", authUser.id)
        .single();

      if (approverError) throw approverError;

      if (
        String(approver?.role || "").toLowerCase() !== "approver"
      ) {
        throw new Error(
          "Only approver accounts can access this page."
        );
      }

      const { data: approvedSteps, error: stepsError } =
        await supabase
          .from("clearance_steps")
          .select(`
            id,
            clearance_request_id,
            class_offering_id,
            office_id,
            subject_id,
            approver_id,
            status,
            remarks,
            reviewed_at,
            offices (
              id,
              office_name,
              office_code
            ),
            subjects (
              id,
              subject_name,
              subject_code
            )
          `)
          .eq("approver_id", approver.id)
          .eq("status", "Approved")
          .order("reviewed_at", { ascending: false });

      if (stepsError) throw stepsError;

      const safeSteps = approvedSteps || [];

      if (safeSteps.length === 0) {
        setApprovedItems([]);
        return;
      }

      const requestIds = [
        ...new Set(
          safeSteps
            .map((step) => step.clearance_request_id)
            .filter(Boolean)
        ),
      ];

      const offeringIds = [
        ...new Set(
          safeSteps
            .map((step) => step.class_offering_id)
            .filter(Boolean)
        ),
      ];

      const { data: requests, error: requestsError } =
        await supabase
          .from("clearance_requests")
          .select(`
            id,
            student_id,
            school_year,
            semester,
            status,
            requested_at,
            updated_at
          `)
          .in("id", requestIds);

      if (requestsError) throw requestsError;

      const requestMap = new Map(
        (requests || []).map((request) => [
          request.id,
          request,
        ])
      );

      const studentIds = [
        ...new Set(
          (requests || [])
            .map((request) => request.student_id)
            .filter(Boolean)
        ),
      ];

      let students = [];

      if (studentIds.length > 0) {
        const { data, error } = await supabase
          .from("users")
          .select(`
            id,
            student_id,
            full_name,
            email,
            course,
            year_level,
            section,
            section_id
          `)
          .in("id", studentIds);

        if (error) throw error;

        students = data || [];
      }

      const studentMap = new Map(
        students.map((student) => [
          student.id,
          student,
        ])
      );

      let offeringMap = new Map();

      if (offeringIds.length > 0) {
        const { data: offerings, error: offeringsError } =
          await supabase
            .from("class_offerings")
            .select(`
              id,
              section_id,
              subject_id,
              teacher_id,
              school_year,
              semester,
              sections (
                id,
                course,
                year_level,
                block_code,
                school_year,
                semester
              )
            `)
            .in("id", offeringIds);

        if (offeringsError) {
          console.warn(
            "Unable to load class offering details:",
            offeringsError
          );
        } else {
          offeringMap = new Map(
            (offerings || []).map((offering) => [
              offering.id,
              offering,
            ])
          );
        }
      }

      const items = safeSteps
        .map((step) => {
          const request = requestMap.get(
            step.clearance_request_id
          );

          if (!request) return null;

          const student = studentMap.get(
            request.student_id
          );

          const classOffering = step.class_offering_id
            ? offeringMap.get(step.class_offering_id)
            : null;

          const section = classOffering?.sections || null;

          const isSubject = Boolean(step.subject_id);
          const isOffice = Boolean(step.office_id);

          const assignmentName = isSubject
            ? step.subjects?.subject_name ||
              step.subjects?.subject_code ||
              "Subject Clearance"
            : step.offices?.office_name ||
              step.offices?.office_code ||
              "Office Clearance";

          const assignmentCode = isSubject
            ? step.subjects?.subject_code || ""
            : step.offices?.office_code || "";

          const course =
            section?.course ||
            student?.course ||
            "Not assigned";

          const yearLevel =
            section?.year_level ||
            student?.year_level ||
            "Not assigned";

          const block =
            section?.block_code ||
            student?.section ||
            "No Block";

          return {
            stepId: step.id,
            requestId: request.id,
            student,
            request,
            classOffering,
            section,
            type: isSubject
              ? "Subject"
              : isOffice
              ? "Office"
              : "Other",
            assignmentName,
            assignmentCode,
            course,
            yearLevel,
            block,
            semester:
              classOffering?.semester ||
              request.semester ||
              "",
            schoolYear:
              classOffering?.school_year ||
              request.school_year ||
              "",
            reviewedAt: step.reviewed_at,
            remarks: step.remarks,
            classOfferingId: step.class_offering_id || null,
            subjectId: step.subject_id || null,
            officeId: step.office_id || null,
          };
        })
        .filter(Boolean);

      setApprovedItems(items);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Unable to Load Approved Requests",
        text:
          error?.message ||
          "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  const normalizeText = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase();

  const normalizeYear = (value) => {
    const raw = String(value ?? "").trim();

    if (!raw) return "Not assigned";

    if (/year/i.test(raw)) {
      return raw;
    }

    const match = raw.match(/\d+/);

    if (match) {
      const number = Number(match[0]);

      if (number === 1) return "1st Year";
      if (number === 2) return "2nd Year";
      if (number === 3) return "3rd Year";
      if (number === 4) return "4th Year";
    }

    return raw;
  };

  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleString(
      "en-PH",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  const courseOptions = useMemo(() => {
    return [
      ...new Set(
        approvedItems
          .map((item) => item.course)
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [approvedItems]);

  const yearOptions = useMemo(() => {
    return [
      ...new Set(
        approvedItems
          .map((item) =>
            normalizeYear(item.yearLevel)
          )
          .filter(Boolean)
      ),
    ].sort((a, b) =>
      String(a).localeCompare(String(b))
    );
  }, [approvedItems]);

  const filteredItems = useMemo(() => {
    const keyword = normalizeText(search);

    const filtered = approvedItems.filter((item) => {
      const matchesSearch =
        !keyword ||
        normalizeText(
          item.student?.full_name
        ).includes(keyword) ||
        normalizeText(
          item.student?.student_id
        ).includes(keyword) ||
        normalizeText(item.course).includes(keyword) ||
        normalizeText(item.assignmentName).includes(keyword) ||
        normalizeText(item.assignmentCode).includes(keyword) ||
        normalizeText(item.block).includes(keyword) ||
        normalizeText(item.semester).includes(keyword);

      const matchesType =
        typeFilter === "All" ||
        item.type === typeFilter;

      const matchesCourse =
        courseFilter === "All" ||
        String(item.course) === courseFilter;

      const matchesYear =
        yearFilter === "All" ||
        normalizeYear(item.yearLevel) ===
          yearFilter;

      return (
        matchesSearch &&
        matchesType &&
        matchesCourse &&
        matchesYear
      );
    });

    const getTime = (item) => {
      const value =
        item.reviewedAt ||
        item.request?.updated_at ||
        item.request?.requested_at;

      const timestamp = value
        ? new Date(value).getTime()
        : 0;

      return Number.isFinite(timestamp)
        ? timestamp
        : 0;
    };

    return [...filtered].sort((a, b) => {
      if (sortOrder === "oldest") {
        return getTime(a) - getTime(b);
      }

      if (sortOrder === "name-asc") {
        return String(
          a.student?.full_name || ""
        ).localeCompare(
          String(b.student?.full_name || "")
        );
      }

      if (sortOrder === "name-desc") {
        return String(
          b.student?.full_name || ""
        ).localeCompare(
          String(a.student?.full_name || "")
        );
      }

      return getTime(b) - getTime(a);
    });
  }, [
    approvedItems,
    search,
    typeFilter,
    courseFilter,
    yearFilter,
    sortOrder,
  ]);

  const teachingGroups = useMemo(() => {
    const groups = new Map();

    filteredItems
      .filter((item) => item.type === "Subject")
      .forEach((item) => {
        const exactKey =
          item.classOfferingId ||
          [
            item.subjectId || item.assignmentName,
            item.course,
            normalizeYear(item.yearLevel),
            item.block,
            item.semester,
            item.schoolYear,
          ].join("|");

        if (!groups.has(exactKey)) {
          groups.set(exactKey, {
            key: exactKey,
            assignmentName: item.assignmentName,
            assignmentCode: item.assignmentCode,
            course: item.course,
            yearLevel: normalizeYear(item.yearLevel),
            block: item.block,
            semester: item.semester,
            schoolYear: item.schoolYear,
            items: [],
          });
        }

        groups.get(exactKey).items.push(item);
      });

    return [...groups.values()].sort((a, b) => {
      const courseCompare = String(a.course).localeCompare(
        String(b.course)
      );

      if (courseCompare !== 0) return courseCompare;

      const yearCompare = String(
        a.yearLevel
      ).localeCompare(String(b.yearLevel));

      if (yearCompare !== 0) return yearCompare;

      const blockCompare = String(
        a.block
      ).localeCompare(String(b.block));

      if (blockCompare !== 0) return blockCompare;

      return String(
        a.assignmentName
      ).localeCompare(String(b.assignmentName));
    });
  }, [filteredItems]);

  const officeGroups = useMemo(() => {
    const groups = new Map();

    filteredItems
      .filter((item) => item.type === "Office")
      .forEach((item) => {
        const key =
          item.officeId ||
          item.assignmentName;

        if (!groups.has(key)) {
          groups.set(key, {
            key,
            assignmentName: item.assignmentName,
            assignmentCode: item.assignmentCode,
            items: [],
          });
        }

        groups.get(key).items.push(item);
      });

    return [...groups.values()].sort((a, b) =>
      String(a.assignmentName).localeCompare(
        String(b.assignmentName)
      )
    );
  }, [filteredItems]);

  const uniqueStudents = useMemo(() => {
    return new Set(
      approvedItems
        .map((item) => item.student?.id)
        .filter(Boolean)
    ).size;
  }, [approvedItems]);

  const subjectApprovedCount = useMemo(
    () =>
      approvedItems.filter(
        (item) => item.type === "Subject"
      ).length,
    [approvedItems]
  );

  const officeApprovedCount = useMemo(
    () =>
      approvedItems.filter(
        (item) => item.type === "Office"
      ).length,
    [approvedItems]
  );

  const resetFilters = () => {
    setSearch("");
    setTypeFilter("All");
    setCourseFilter("All");
    setYearFilter("All");
    setSortOrder("newest");
  };

  const openDetails = (item) => {
    navigate("/approver/student-details", {
      state: {
        requestId: item.requestId,
        student: item.student,
        readOnly: true,
      },
    });
  };

  const StudentRow = ({ item }) => (
    <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-800">
            {item.student?.full_name || "No Name"}
          </p>

          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <FaCheckCircle className="text-[11px]" />
            Approved
          </span>
        </div>

        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          <span>
            Student No:{" "}
            {item.student?.student_id || "N/A"}
          </span>

          <span>
            Approved: {formatDate(item.reviewedAt)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => openDetails(item)}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
      >
        <FaEye />
        View Details
      </button>
    </div>
  );

  return (
    <ApproverLayout>
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-7">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">
                <FaCheckCircle />
                Clearance History
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Approved Clearances
              </h1>

              <p className="mt-2 max-w-2xl text-slate-500">
                Review your approved subject and office
                clearances in a cleaner, class-based view.
              </p>
            </div>

            <button
              type="button"
              onClick={loadApprovedRequests}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Approved Students
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {uniqueStudents}
                </p>
              </div>

              <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                <FaUsers className="text-xl" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Approved Steps
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {approvedItems.length}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <FaCheckCircle className="text-xl" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Subject Clearances
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {subjectApprovedCount}
                </p>
              </div>

              <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                <FaBookOpen className="text-xl" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Office Clearances
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {officeApprovedCount}
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 p-3 text-amber-700">
                <FaBuilding className="text-xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FaFilter className="text-blue-700" />
            <h2 className="font-bold text-slate-800">
              Filter Approved Records
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative xl:col-span-2">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search student, subject, office, block..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="All">
                All Clearance Types
              </option>
              <option value="Subject">
                Subject Clearance
              </option>
              <option value="Office">
                Office Clearance
              </option>
            </select>

            <select
              value={courseFilter}
              onChange={(event) =>
                setCourseFilter(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="All">All Courses</option>

              {courseOptions.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(event) =>
                setYearFilter(event.target.value)
              }
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="All">
                All Year Levels
              </option>

              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <div className="relative">
              <FaSortAmountDown className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <select
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="newest">
                  Newest Approved
                </option>
                <option value="oldest">
                  Oldest Approved
                </option>
                <option value="name-asc">
                  Student A-Z
                </option>
                <option value="name-desc">
                  Student Z-A
                </option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-800">
                {filteredItems.length}
              </span>{" "}
              approved clearance step
              {filteredItems.length !== 1 ? "s" : ""}.
            </p>

            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-semibold text-blue-700 transition hover:text-blue-900"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
            <p className="font-medium text-slate-600">
              Loading approved clearances...
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FaSearch className="text-xl" />
            </div>

            <h3 className="text-lg font-bold text-slate-800">
              No approved records found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {(typeFilter === "All" ||
              typeFilter === "Subject") &&
              teachingGroups.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
                          <FaBookOpen />
                        </div>

                        <div>
                          <h2 className="text-xl font-bold text-slate-900">
                            Teaching Classes
                          </h2>
                          <p className="text-sm text-slate-500">
                            Approved students grouped by
                            exact subject and class.
                          </p>
                        </div>
                      </div>
                    </div>

                    <span className="rounded-full bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700">
                      {teachingGroups.length} class
                      {teachingGroups.length !== 1
                        ? "es"
                        : ""}
                    </span>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    {teachingGroups.map((group) => (
                      <div
                        key={group.key}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                      >
                        <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white px-5 py-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-slate-900">
                                  {group.assignmentName}
                                </h3>

                                {group.assignmentCode && (
                                  <span className="rounded-md bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                                    {group.assignmentCode}
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-sm text-slate-600">
                                {group.course} •{" "}
                                {group.yearLevel} • Block{" "}
                                {group.block}
                              </p>

                              {(group.semester ||
                                group.schoolYear) && (
                                <p className="mt-1 text-xs text-slate-400">
                                  {group.semester || ""}
                                  {group.semester &&
                                  group.schoolYear
                                    ? " • "
                                    : ""}
                                  {group.schoolYear || ""}
                                </p>
                              )}
                            </div>

                            <span className="w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                              {group.items.length} Approved
                            </span>
                          </div>
                        </div>

                        <div>
                          {group.items.map((item) => (
                            <StudentRow
                              key={item.stepId}
                              item={item}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            {(typeFilter === "All" ||
              typeFilter === "Office") &&
              officeGroups.length > 0 && (
                <section>
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                        <FaBuilding />
                      </div>

                      <div>
                        <h2 className="text-xl font-bold text-slate-900">
                          Office Clearances
                        </h2>
                        <p className="text-sm text-slate-500">
                          Approved students grouped by
                          office assignment.
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
                      {officeGroups.length} office
                      {officeGroups.length !== 1
                        ? "s"
                        : ""}
                    </span>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-2">
                    {officeGroups.map((group) => (
                      <div
                        key={group.key}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                      >
                        <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white px-5 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-slate-900">
                                  {group.assignmentName}
                                </h3>

                                {group.assignmentCode && (
                                  <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                    {group.assignmentCode}
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-sm text-slate-500">
                                Office clearance records
                              </p>
                            </div>

                            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                              {group.items.length} Approved
                            </span>
                          </div>
                        </div>

                        <div>
                          {group.items.map((item) => (
                            <StudentRow
                              key={item.stepId}
                              item={item}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
          </div>
        )}
      </div>
    </ApproverLayout>
  );
}

export default ApprovedRequests;
