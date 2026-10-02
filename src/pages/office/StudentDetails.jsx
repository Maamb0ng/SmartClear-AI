import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  FaArrowLeft,
  FaBuilding,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaClipboardCheck,
  FaClipboardList,
  FaClock,
  FaExclamationTriangle,
  FaIdCard,
  FaInfoCircle,
  FaQuestionCircle,
  FaSave,
  FaTimes,
  FaUserGraduate,
} from "react-icons/fa";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";

function StudentDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  // =========================================================
  // MOCK OFFICE
  // Later: logged-in office assignment from Supabase.
  // =========================================================

  const office = {
    name: "Library",
    code: "LIB",
  };

  // =========================================================
  // MOCK STUDENT
  // Later: exact clearance_step + student + batch.
  // =========================================================

  const student = {
    id: id || "student-001",
    name: "Juan Dela Cruz",
    studentId: "2023-00125",
    course: "BSIT",
    yearLevel: "4th Year",
    section: "4-D",
    semester: "1st Semester",
    schoolYear: "2026-2027",

    clearanceStatus: "Scheduled",

    batch: {
      name: "Library Clearance - Batch 1",
      date: "October 1, 2026",
      time: "9:00 AM - 11:00 AM",
      note:
        "Please resolve any borrowed, lost, or unpaid library material before clearance approval.",
    },
  };

  // =========================================================
  // MOCK CONFIGURABLE OFFICE REQUIREMENTS
  //
  // These are NOT permanently hardcoded Library rules.
  // Later the office itself will create/manage these.
  // =========================================================

  const initialRequirements = [
    {
      id: "requirement-001",
      type: "Requirement",
      title: "No outstanding borrowed books",
      description:
        "Verify that the student has returned all borrowed library materials.",
      responseType: "check",
      checked: false,
    },
    {
      id: "requirement-002",
      type: "Requirement",
      title: "No unpaid or lost books",
      description:
        "Verify that the student has no unresolved lost or unpaid library material.",
      responseType: "check",
      checked: false,
    },
    {
      id: "question-001",
      type: "Question",
      title: "Does the student have an unresolved library obligation?",
      description:
        "Optional office verification question.",
      responseType: "yes-no",
      answer: "",
    },
  ];

  const [requirements, setRequirements] =
    useState(initialRequirements);

  const [remarks, setRemarks] = useState("");

  const [decision, setDecision] = useState(null);

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  // =========================================================
  // REQUIREMENT HANDLERS
  // =========================================================

  const toggleRequirement = (requirementId) => {
    setRequirements((current) =>
      current.map((requirement) =>
        requirement.id === requirementId
          ? {
              ...requirement,
              checked: !requirement.checked,
            }
          : requirement
      )
    );
  };

  const setQuestionAnswer = (
    requirementId,
    answer
  ) => {
    setRequirements((current) =>
      current.map((requirement) =>
        requirement.id === requirementId
          ? {
              ...requirement,
              answer,
            }
          : requirement
      )
    );
  };

  // =========================================================
  // REVIEW SUMMARY
  // =========================================================

  const reviewSummary = useMemo(() => {
    const checkRequirements = requirements.filter(
      (item) => item.responseType === "check"
    );

    const questions = requirements.filter(
      (item) => item.responseType === "yes-no"
    );

    const completedChecks =
      checkRequirements.filter(
        (item) => item.checked
      ).length;

    const answeredQuestions = questions.filter(
      (item) => item.answer
    ).length;

    return {
      checks: checkRequirements.length,
      completedChecks,
      questions: questions.length,
      answeredQuestions,
    };
  }, [requirements]);

  // =========================================================
  // DECISION
  // =========================================================

  const requestDecision = (nextDecision) => {
    if (
      nextDecision === "Needs Action" &&
      !remarks.trim()
    ) {
      window.alert(
        "Please add a remark explaining what the student needs to resolve."
      );
      return;
    }

    setDecision(nextDecision);
    setShowConfirmation(true);
  };

  const confirmDecision = () => {
    // Frontend-only for now.
    // Later this will update the exact clearance_step.

    console.log({
      studentId: student.id,
      office: office.name,
      decision,
      remarks,
      requirements,
    });

    setShowConfirmation(false);

    window.alert(
      decision === "Approved"
        ? "Student clearance approved."
        : "Student marked as Needs Action."
    );

    navigate("/office/students");
  };

  // =========================================================
  // SAVE DRAFT
  // =========================================================

  const saveDraft = () => {
    // Frontend only.
    // Later we can persist review progress.

    window.alert(
      "Review draft saved locally for the current UI demonstration."
    );
  };

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1450px] space-y-6">
        {/* ===================================================
            BACK + HEADER
        =================================================== */}

        <section>
          <button
            type="button"
            onClick={() =>
              navigate("/office/students")
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            <FaArrowLeft />
            Back to Student Queue
          </button>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="relative p-5 sm:p-6 lg:p-7">
              <div className="absolute -right-20 -top-24 h-60 w-60 rounded-full bg-blue-100/70 blur-3xl dark:bg-blue-500/10" />

              <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-black text-white shadow-lg dark:bg-blue-600">
                    {getInitials(student.name)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                        {office.code}
                      </span>

                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                        {student.clearanceStatus}
                      </span>
                    </div>

                    <h1 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                      {student.name}
                    </h1>

                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {student.studentId} •{" "}
                      {student.course} •{" "}
                      {student.yearLevel} • Block{" "}
                      {student.section}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Reviewing Office
                  </p>

                  <p className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                    <FaBuilding className="text-blue-500" />
                    {office.name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================
            CONTENT
        =================================================== */}

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          {/* LEFT */}

          <div className="space-y-6">
            {/* ===============================================
                STUDENT INFORMATION
            =============================================== */}

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FaUserGraduate className="text-blue-600 dark:text-blue-400" />

                  <h2 className="text-base font-black text-slate-950 dark:text-white">
                    Student Information
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                <InfoItem
                  icon={FaIdCard}
                  label="Student ID"
                  value={student.studentId}
                />

                <InfoItem
                  icon={FaUserGraduate}
                  label="Course"
                  value={student.course}
                />

                <InfoItem
                  icon={FaUserGraduate}
                  label="Year & Block"
                  value={`${student.yearLevel} • ${student.section}`}
                />

                <InfoItem
                  icon={FaCalendarAlt}
                  label="Semester"
                  value={student.semester}
                />

                <InfoItem
                  icon={FaCalendarAlt}
                  label="School Year"
                  value={student.schoolYear}
                />
              </div>
            </div>

            {/* ===============================================
                SCHEDULE
            =============================================== */}

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />

                  <h2 className="text-base font-black text-slate-950 dark:text-white">
                    Clearance Schedule
                  </h2>
                </div>
              </div>

              <div className="p-5">
                {student.batch ? (
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {student.batch.name}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-2">
                        <FaCalendarAlt />
                        {student.batch.date}
                      </span>

                      <span className="flex items-center gap-2">
                        <FaClock />
                        {student.batch.time}
                      </span>
                    </div>

                    {student.batch.note && (
                      <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Student Instructions
                        </p>

                        <p className="mt-1.5 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                          {student.batch.note}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-400">
                    This student has not yet been
                    assigned to a clearance batch.
                  </div>
                )}
              </div>
            </div>

            {/* ===============================================
                REQUIREMENTS / QUESTIONS
            =============================================== */}

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FaClipboardList className="text-violet-600 dark:text-violet-400" />

                    <h2 className="text-base font-black text-slate-950 dark:text-white">
                      Office Review Checklist
                    </h2>
                  </div>

                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Optional requirements and
                    questions configured by this
                    office.
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {requirements.length} items
                </span>
              </div>

              <div className="space-y-4 p-5">
                {requirements.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">
                    <FaClipboardCheck className="mx-auto mb-3 text-2xl text-slate-300" />

                    <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                      No office requirements
                    </p>

                    <p className="mt-1 text-xs font-medium text-slate-500">
                      The student may be reviewed
                      directly.
                    </p>
                  </div>
                ) : (
                  requirements.map(
                    (requirement, index) => (
                      <RequirementCard
                        key={requirement.id}
                        number={index + 1}
                        requirement={requirement}
                        onToggle={() =>
                          toggleRequirement(
                            requirement.id
                          )
                        }
                        onAnswer={(answer) =>
                          setQuestionAnswer(
                            requirement.id,
                            answer
                          )
                        }
                      />
                    )
                  )
                )}
              </div>
            </div>

            {/* ===============================================
                REMARKS
            =============================================== */}

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h2 className="text-base font-black text-slate-950 dark:text-white">
                  Office Remarks
                </h2>

                <p className="mt-1 text-xs font-medium text-slate-500">
                  Add a short instruction or reason
                  when the student needs to resolve
                  an obligation.
                </p>
              </div>

              <div className="p-5">
                <textarea
                  value={remarks}
                  onChange={(event) =>
                    setRemarks(event.target.value)
                  }
                  rows="5"
                  placeholder="Example: Please return the borrowed book before requesting another review."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />

                <p className="mt-2 text-xs font-medium text-slate-400">
                  Keep remarks limited to information
                  necessary for the clearance process.
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              RIGHT REVIEW PANEL
          ================================================= */}

          <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <FaClipboardCheck className="text-blue-600 dark:text-blue-400" />

                <h2 className="text-base font-black text-slate-950 dark:text-white">
                  Review Summary
                </h2>
              </div>

              <div className="mt-5 space-y-3">
                <SummaryRow
                  label="Requirements checked"
                  value={`${reviewSummary.completedChecks}/${reviewSummary.checks}`}
                />

                <SummaryRow
                  label="Questions answered"
                  value={`${reviewSummary.answeredQuestions}/${reviewSummary.questions}`}
                />

                <SummaryRow
                  label="Office"
                  value={office.name}
                />
              </div>

              <div className="mt-5 rounded-2xl bg-blue-50 p-4 dark:bg-blue-500/5">
                <div className="flex items-start gap-2">
                  <FaInfoCircle className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />

                  <p className="text-xs font-medium leading-5 text-blue-700 dark:text-blue-300">
                    Approving this student will
                    clear only the{" "}
                    <strong>{office.name}</strong>{" "}
                    clearance step. Other signatories
                    remain separate.
                  </p>
                </div>
              </div>
            </div>

            {/* ACTIONS */}

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-black text-slate-900 dark:text-white">
                Clearance Decision
              </h2>

              <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                Review the student's office
                obligations before signing.
              </p>

              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  onClick={() =>
                    requestDecision("Approved")
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  <FaCheckCircle />
                  Sign & Approve
                </button>

                <button
                  type="button"
                  onClick={() =>
                    requestDecision(
                      "Needs Action"
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-600"
                >
                  <FaExclamationTriangle />
                  Needs Action
                </button>

                <button
                  type="button"
                  onClick={saveDraft}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <FaSave />
                  Save Review Draft
                </button>
              </div>
            </div>
          </aside>
        </section>

        {/* ===================================================
            CONFIRMATION MODAL
        =================================================== */}

        {showConfirmation && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <button
              type="button"
              aria-label="Close confirmation"
              onClick={() =>
                setShowConfirmation(false)
              }
              className="absolute inset-0"
            />

            <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  decision === "Approved"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                }`}
              >
                {decision === "Approved" ? (
                  <FaCheckCircle />
                ) : (
                  <FaExclamationTriangle />
                )}
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">
                {decision === "Approved"
                  ? "Approve Clearance?"
                  : "Mark as Needs Action?"}
              </h2>

              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
                {decision === "Approved"
                  ? `This will sign and approve ${student.name}'s ${office.name} clearance step.`
                  : `${student.name} will be informed that an office obligation must be resolved before approval.`}
              </p>

              {remarks.trim() && (
                <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Remarks
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    {remarks}
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmation(false)
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <FaTimes />
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDecision}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white ${
                    decision === "Approved"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-500 hover:bg-amber-600"
                  }`}
                >
                  <FaCheck />
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </OfficeStaffLayout>
  );
}

// ===========================================================
// REQUIREMENT CARD
// ===========================================================

function RequirementCard({
  number,
  requirement,
  onToggle,
  onAnswer,
}) {
  const isQuestion =
    requirement.responseType === "yes-no";

  return (
    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isQuestion
              ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
              : "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
          }`}
        >
          {isQuestion ? (
            <FaQuestionCircle />
          ) : (
            <FaClipboardList />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              {requirement.type} {number}
            </span>

            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              Optional
            </span>
          </div>

          <h3 className="mt-1 text-sm font-black text-slate-900 dark:text-white">
            {requirement.title}
          </h3>

          {requirement.description && (
            <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
              {requirement.description}
            </p>
          )}

          {!isQuestion ? (
            <button
              type="button"
              onClick={onToggle}
              className={`mt-4 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
                requirement.checked
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md ${
                  requirement.checked
                    ? "bg-emerald-600 text-white"
                    : "border border-slate-300 dark:border-slate-600"
                }`}
              >
                {requirement.checked && (
                  <FaCheck className="text-[9px]" />
                )}
              </span>

              {requirement.checked
                ? "Verified"
                : "Mark as Verified"}
            </button>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  onAnswer("Yes")
                }
                className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                  requirement.answer === "Yes"
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                Yes
              </button>

              <button
                type="button"
                onClick={() =>
                  onAnswer("No")
                }
                className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                  requirement.answer === "No"
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================================
// SMALL COMPONENTS
// ===========================================================

function InfoItem({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/60">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
        <Icon />
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </p>

        <p className="mt-1 truncate text-xs font-bold text-slate-800 dark:text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </span>

      <span className="text-xs font-black text-slate-900 dark:text-white">
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

export default StudentDetails;