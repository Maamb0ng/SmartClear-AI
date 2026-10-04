import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaEdit,
  FaExclamationTriangle,
  FaLayerGroup,
  FaPlus,
  FaRedo,
  FaSearch,
  FaTimes,
  FaTrashAlt,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";

import Swal from "sweetalert2";

import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";

import {
  assignOfficeStudentsToBatch,
  createOfficeBatch,
  getAvailableOfficeBatchStudents,
  getOfficeBatches,
  getOfficeBatchStudents,
  removeOfficeStudentFromBatch,
  updateOfficeBatch,
} from "../../services/officeStaffService";

function ScheduleBatches() {
  // =========================================================
  // STATE
  // =========================================================

  const [office, setOffice] = useState({
    id: null,
    name: "Office",
    code: "OFFICE",
  });

  const [batches, setBatches] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [showForm, setShowForm] =
    useState(false);

  const [editingBatch, setEditingBatch] =
    useState(null);

  const [savingBatch, setSavingBatch] =
    useState(false);

  const [
    showStudentsModal,
    setShowStudentsModal,
  ] = useState(false);

  const [
    selectedBatch,
    setSelectedBatch,
  ] = useState(null);

  const [
    batchStudents,
    setBatchStudents,
  ] = useState([]);

  const [
    availableStudents,
    setAvailableStudents,
  ] = useState([]);

  const [
    selectedStudentSteps,
    setSelectedStudentSteps,
  ] = useState([]);

  const [
    studentSearch,
    setStudentSearch,
  ] = useState("");

  const [
    loadingStudents,
    setLoadingStudents,
  ] = useState(false);

  const [
    assigningStudents,
    setAssigningStudents,
  ] = useState(false);

  const [
    removingStudentId,
    setRemovingStudentId,
  ] = useState(null);

  const emptyForm = {
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    note: "",
    capacity: 20,
    status: "Open",
  };

  const [formData, setFormData] =
    useState(emptyForm);

  // =========================================================
  // HELPERS
  // =========================================================

  const formatDate = (value) => {
    if (!value) {
      return "No date";
    }

    return new Date(
      `${value}T00:00:00`
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) {
      return "";
    }

    const normalized =
      String(value).slice(0, 5);

    const [hour, minute] =
      normalized.split(":");

    const date = new Date();

    date.setHours(
      Number(hour),
      Number(minute),
      0,
      0
    );

    return date.toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  const getStatusClass = (status) => {
    if (status === "Open") {
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
    }

    if (status === "Closed") {
      return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
    }

    if (status === "Completed") {
      return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
    }

    if (status === "Cancelled") {
      return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    }

    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  };

  const getStudentStatusClass = (
    status
  ) => {
    if (status === "Approved") {
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
    }

    if (status === "Needs Action") {
      return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
    }

    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  };

  const mapBatch = (batch) => ({
    ...batch,

    name:
      batch.name ||
      batch.batchName ||
      batch.batch_name ||
      "Office Clearance Batch",

    date:
      batch.date ||
      batch.scheduleDate ||
      batch.schedule_date ||
      "",

    startTime:
      String(
        batch.startTime ||
          batch.start_time ||
          ""
      ).slice(0, 5),

    endTime:
      String(
        batch.endTime ||
          batch.end_time ||
          ""
      ).slice(0, 5),

    note:
      batch.note || "",

    capacity:
      Number(
        batch.capacity || 0
      ),

    assigned:
      Number(
        batch.assignedCount ??
          batch.studentCount ??
          batch.assigned ??
          0
      ),

    reviewed:
      Number(
        batch.reviewedCount ??
          batch.reviewed ??
          0
      ),

    status:
      batch.status || "Open",
  });

  // =========================================================
  // LOAD BATCHES
  // =========================================================

  const loadBatches = useCallback(
    async ({
      silent = false,
    } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const result =
          await getOfficeBatches();

        const primaryOffice =
          result?.primaryOffice ||
          result?.offices?.[0] ||
          null;

        if (primaryOffice) {
          setOffice({
            id: primaryOffice.id,

            name:
              primaryOffice.office_name ||
              primaryOffice.name ||
              "Office",

            code:
              primaryOffice.office_code ||
              primaryOffice.code ||
              "OFFICE",
          });
        }

        setBatches(
          (result?.batches || []).map(
            mapBatch
          )
        );
      } catch (loadError) {
        console.error(
          "Failed to load office batches:",
          loadError
        );

        setError(
          loadError?.message ||
            "Unable to load office batches."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // =========================================================
  // FILTERS + STATS
  // =========================================================

  const filteredBatches = useMemo(
    () => {
      const query =
        search.trim().toLowerCase();

      return batches.filter(
        (batch) => {
          const matchesSearch =
            !query ||
            batch.name
              .toLowerCase()
              .includes(query) ||
            String(batch.note || "")
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter === "All" ||
            batch.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    },
    [
      batches,
      search,
      statusFilter,
    ]
  );

  const stats = useMemo(() => {
    return {
      total: batches.length,

      open: batches.filter(
        (batch) =>
          batch.status === "Open"
      ).length,

      students: batches.reduce(
        (total, batch) =>
          total +
          Number(
            batch.assigned || 0
          ),
        0
      ),

      reviewed: batches.reduce(
        (total, batch) =>
          total +
          Number(
            batch.reviewed || 0
          ),
        0
      ),
    };
  }, [batches]);

  // =========================================================
  // CREATE / EDIT FORM
  // =========================================================

  const openCreateForm = () => {
    setEditingBatch(null);

    setFormData({
      ...emptyForm,

      name: `${
        office.name
      } Clearance - Batch ${
        batches.length + 1
      }`,
    });

    setShowForm(true);
  };

  const openEditForm = (batch) => {
    setEditingBatch(batch);

    setFormData({
      name: batch.name,
      date: batch.date,
      startTime: batch.startTime,
      endTime: batch.endTime,
      note: batch.note || "",
      capacity: batch.capacity,
      status: batch.status,
    });

    setShowForm(true);
  };

  const closeForm = () => {
    if (savingBatch) {
      return;
    }

    setShowForm(false);
    setEditingBatch(null);
    setFormData(emptyForm);
  };

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((current) => ({
      ...current,

      [name]:
        name === "capacity"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.date ||
      !formData.startTime ||
      !formData.endTime
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Incomplete batch",
        text: "Please complete the batch name, date, start time, and end time.",
        confirmButtonColor:
          "#2563eb",
      });

      return;
    }

    if (
      formData.endTime <=
      formData.startTime
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Invalid time",
        text: "End time must be later than the start time.",
        confirmButtonColor:
          "#2563eb",
      });

      return;
    }

    if (
      Number(formData.capacity) < 1
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Invalid capacity",
        text: "Batch capacity must be at least 1.",
        confirmButtonColor:
          "#2563eb",
      });

      return;
    }

    if (
      editingBatch &&
      Number(formData.capacity) <
        Number(
          editingBatch.assigned || 0
        )
    ) {
      await Swal.fire({
        icon: "warning",
        title: "Capacity too small",
        text: `Capacity cannot be lower than the ${editingBatch.assigned} student(s) already assigned to this batch.`,
        confirmButtonColor:
          "#2563eb",
      });

      return;
    }

    try {
      setSavingBatch(true);

      if (editingBatch) {
        await updateOfficeBatch({
          batchId:
            editingBatch.id,

          batchName:
            formData.name,

          scheduleDate:
            formData.date,

          startTime:
            formData.startTime,

          endTime:
            formData.endTime,

          note:
            formData.note,

          capacity:
            Number(
              formData.capacity
            ),

          status:
            formData.status,
        });
      } else {
        await createOfficeBatch({
          officeId:
            office.id,

          batchName:
            formData.name,

          scheduleDate:
            formData.date,

          startTime:
            formData.startTime,

          endTime:
            formData.endTime,

          note:
            formData.note,

          capacity:
            Number(
              formData.capacity
            ),

          status: "Open",
        });
      }

      closeForm();

      await loadBatches({
        silent: true,
      });

      await Swal.fire({
        icon: "success",

        title: editingBatch
          ? "Batch updated"
          : "Batch created",

        text: editingBatch
          ? "The clearance batch has been updated successfully."
          : "The clearance batch has been created successfully.",

        timer: 1800,
        showConfirmButton: false,
      });
    } catch (saveError) {
      console.error(
        "Failed to save office batch:",
        saveError
      );

      await Swal.fire({
        icon: "error",
        title: "Unable to save batch",

        text:
          saveError?.message ||
          "Something went wrong while saving the batch.",

        confirmButtonColor:
          "#2563eb",
      });
    } finally {
      setSavingBatch(false);
    }
  };

  // =========================================================
  // STUDENT MODAL
  // =========================================================

  const loadBatchStudents =
    useCallback(
      async (
        batch,
        {
          silent = false,
        } = {}
      ) => {
        if (!batch?.id) {
          return;
        }

        try {
          if (!silent) {
            setLoadingStudents(
              true
            );
          }

          const [
            assignedResult,
            availableResult,
          ] = await Promise.all([
            getOfficeBatchStudents(
              batch.id
            ),

            getAvailableOfficeBatchStudents(
              batch.id
            ),
          ]);

          setBatchStudents(
            assignedResult?.students ||
              []
          );

          setAvailableStudents(
            availableResult?.students ||
              []
          );

          setSelectedStudentSteps(
            []
          );

          const currentBatch =
            assignedResult?.batch;

          if (currentBatch) {
            setSelectedBatch(
              mapBatch({
                ...batch,
                ...currentBatch,

                assignedCount:
                  assignedResult
                    ?.students
                    ?.length || 0,

                reviewedCount:
                  (
                    assignedResult
                      ?.students || []
                  ).filter(
                    (student) =>
                      [
                        "Approved",
                        "Needs Action",
                      ].includes(
                        student.status
                      )
                  ).length,
              })
            );
          }
        } catch (studentError) {
          console.error(
            "Failed to load batch students:",
            studentError
          );

          await Swal.fire({
            icon: "error",
            title:
              "Unable to load students",

            text:
              studentError?.message ||
              "The students assigned to this batch could not be loaded.",

            confirmButtonColor:
              "#2563eb",
          });
        } finally {
          setLoadingStudents(false);
        }
      },
      []
    );

  const openStudentsModal =
    async (batch) => {
      setSelectedBatch(batch);
      setBatchStudents([]);
      setAvailableStudents([]);
      setSelectedStudentSteps([]);
      setStudentSearch("");
      setShowStudentsModal(true);

      await loadBatchStudents(
        batch
      );
    };

  const closeStudentsModal = () => {
    if (
      assigningStudents ||
      removingStudentId
    ) {
      return;
    }

    setShowStudentsModal(false);
    setSelectedBatch(null);
    setBatchStudents([]);
    setAvailableStudents([]);
    setSelectedStudentSteps([]);
    setStudentSearch("");
  };

  const filteredAvailableStudents =
  useMemo(() => {
    const query =
      studentSearch
        .trim()
        .toLowerCase();

    const assignedStepIds =
      new Set(
        batchStudents
          .map((student) => student.stepId)
          .filter(Boolean)
      );

    const unassignedStudents =
      availableStudents.filter(
        (student) =>
          !assignedStepIds.has(
            student.stepId
          )
      );

    if (!query) {
      return unassignedStudents;
    }

    return unassignedStudents.filter(
      (student) => {
        return [
          student.studentName,
          student.studentId,
          student.course,
          student.yearLevel,
          student.section,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value)
              .toLowerCase()
              .includes(query)
          );
      }
    );
  }, [
    availableStudents,
    batchStudents,
    studentSearch,
  ]);

  const toggleStudentSelection = (
    stepId
  ) => {
    setSelectedStudentSteps(
      (current) =>
        current.includes(stepId)
          ? current.filter(
              (id) =>
                id !== stepId
            )
          : [...current, stepId]
    );
  };

  const selectAllVisibleStudents =
    () => {
      const visibleStepIds =
        filteredAvailableStudents.map(
          (student) =>
            student.stepId
        );

      if (!visibleStepIds.length) {
        return;
      }

      const allSelected =
        visibleStepIds.every(
          (stepId) =>
            selectedStudentSteps.includes(
              stepId
            )
        );

      if (allSelected) {
        setSelectedStudentSteps(
          (current) =>
            current.filter(
              (stepId) =>
                !visibleStepIds.includes(
                  stepId
                )
            )
        );

        return;
      }

      setSelectedStudentSteps(
        (current) => [
          ...new Set([
            ...current,
            ...visibleStepIds,
          ]),
        ]
      );
    };

  const handleAssignStudents =
    async () => {
      if (
        !selectedBatch?.id ||
        !selectedStudentSteps.length
      ) {
        await Swal.fire({
          icon: "info",
          title: "Select students",
          text: "Select at least one student to add to this batch.",
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      const remainingSlots =
        Math.max(
          Number(
            selectedBatch.capacity ||
              0
          ) -
            Number(
              batchStudents.length ||
                0
            ),
          0
        );

      if (
        selectedStudentSteps.length >
        remainingSlots
      ) {
        await Swal.fire({
          icon: "warning",
          title:
            "Not enough batch slots",

          text: `This batch only has ${remainingSlots} remaining slot(s).`,

          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      try {
        setAssigningStudents(true);

        await assignOfficeStudentsToBatch({
          batchId:
            selectedBatch.id,

          stepIds:
            selectedStudentSteps,
        });

        await loadBatchStudents(
          selectedBatch,
          {
            silent: true,
          }
        );

        await loadBatches({
          silent: true,
        });

        await Swal.fire({
          icon: "success",
          title:
            "Students assigned",

          text: `${selectedStudentSteps.length} student(s) were added to the batch.`,

          timer: 1800,
          showConfirmButton: false,
        });
      } catch (assignError) {
        console.error(
          "Failed to assign students:",
          assignError
        );

        await Swal.fire({
          icon: "error",
          title:
            "Unable to assign students",

          text:
            assignError?.message ||
            "The selected students could not be assigned.",

          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setAssigningStudents(
          false
        );
      }
    };

  const handleRemoveStudent =
    async (student) => {
      if (
        !selectedBatch?.id ||
        !student?.stepId
      ) {
        return;
      }

      const confirmation =
        await Swal.fire({
          icon: "warning",
          title:
            "Remove from batch?",

          text: `${student.studentName} will be removed from this schedule. Their clearance request will not be deleted.`,

          showCancelButton: true,

          confirmButtonText:
            "Remove Student",

          cancelButtonText:
            "Cancel",

          confirmButtonColor:
            "#dc2626",
        });

      if (
        !confirmation.isConfirmed
      ) {
        return;
      }

      try {
        setRemovingStudentId(
          student.stepId
        );

        await removeOfficeStudentFromBatch({
          batchId:
            selectedBatch.id,

          stepId:
            student.stepId,
        });

        await loadBatchStudents(
          selectedBatch,
          {
            silent: true,
          }
        );

        await loadBatches({
          silent: true,
        });

        await Swal.fire({
          icon: "success",
          title:
            "Student removed",

          text: "The student was removed from this batch.",

          timer: 1600,
          showConfirmButton: false,
        });
      } catch (removeError) {
        console.error(
          "Failed to remove student:",
          removeError
        );

        await Swal.fire({
          icon: "error",
          title:
            "Unable to remove student",

          text:
            removeError?.message ||
            "The student could not be removed from the batch.",

          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setRemovingStudentId(
          null
        );
      }
    };

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <OfficeStaffLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {/* ===================================================
            HEADER
        =================================================== */}

        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                {office.code}
              </span>

              <span className="text-xs font-bold text-slate-400">
                Office Clearance
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Schedule & Batches
            </h1>

            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
              Organize students into
              clearance batches and control
              when your office will review or
              sign their clearance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                loadBatches({
                  silent: true,
                })
              }
              disabled={
                refreshing || loading
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <FaRedo
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              disabled={
                loading || !office.id
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaPlus />
              Create Batch
            </button>
          </div>
        </section>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-500" />

                <div>
                  <p className="text-sm font-black text-red-700 dark:text-red-400">
                    Unable to load
                    schedule and batches
                  </p>

                  <p className="mt-1 text-xs font-medium leading-5 text-red-600/80 dark:text-red-300/80">
                    {error}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  loadBatches()
                }
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          </section>
        )}

        {/* ===================================================
            STATS
        =================================================== */}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Batches"
            value={
              loading
                ? "..."
                : stats.total
            }
            icon={FaLayerGroup}
          />

          <StatCard
            label="Open Batches"
            value={
              loading
                ? "..."
                : stats.open
            }
            icon={FaCalendarAlt}
          />

          <StatCard
            label="Assigned Students"
            value={
              loading
                ? "..."
                : stats.students
            }
            icon={FaUsers}
          />

          <StatCard
            label="Reviewed"
            value={
              loading
                ? "..."
                : stats.reviewed
            }
            icon={FaCheckCircle}
          />
        </section>

        {/* ===================================================
            SEARCH + FILTER
        =================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search batch..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="All">
                All Status
              </option>

              <option value="Open">
                Open
              </option>

              <option value="Closed">
                Closed
              </option>

              <option value="Completed">
                Completed
              </option>

              <option value="Cancelled">
                Cancelled
              </option>
            </select>
          </div>
        </section>

        {/* ===================================================
            BATCH LIST
        =================================================== */}

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <FaCalendarAlt className="mx-auto mb-4 animate-pulse text-3xl text-blue-500" />

              <h2 className="text-base font-black text-slate-800 dark:text-slate-200">
                Loading batches...
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                Retrieving the latest
                schedule for {office.name}.
              </p>
            </div>
          ) : filteredBatches.length ===
            0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
              <FaCalendarAlt className="mx-auto mb-4 text-3xl text-slate-300 dark:text-slate-600" />

              <h2 className="text-base font-black text-slate-800 dark:text-slate-200">
                {batches.length === 0
                  ? "No batches yet"
                  : "No batches found"}
              </h2>

              <p className="mt-1 text-sm font-medium text-slate-500">
                {batches.length === 0
                  ? `Create the first clearance batch for ${office.name}.`
                  : "Change your search or status filter."}
              </p>
            </div>
          ) : (
            filteredBatches.map(
              (batch) => {
                const progress =
                  batch.assigned > 0
                    ? Math.round(
                        (batch.reviewed /
                          batch.assigned) *
                          100
                      )
                    : 0;

                return (
                  <article
                    key={batch.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getStatusClass(
                                batch.status
                              )}`}
                            >
                              {
                                batch.status
                              }
                            </span>

                            <span className="text-xs font-bold text-slate-400">
                              {
                                office.name
                              }
                            </span>
                          </div>

                          <h2 className="mt-3 text-lg font-black text-slate-950 dark:text-white">
                            {batch.name}
                          </h2>

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-2">
                              <FaCalendarAlt />

                              {formatDate(
                                batch.date
                              )}
                            </span>

                            <span className="flex items-center gap-2">
                              <FaClock />

                              {formatTime(
                                batch.startTime
                              )}{" "}
                              -{" "}
                              {formatTime(
                                batch.endTime
                              )}
                            </span>

                            <span className="flex items-center gap-2">
                              <FaUsers />

                              {
                                batch.assigned
                              }
                              /
                              {
                                batch.capacity
                              }{" "}
                              students
                            </span>
                          </div>

                          {batch.note && (
                            <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Student
                                Note /
                                Instruction
                              </p>

                              <p className="mt-1.5 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                                {
                                  batch.note
                                }
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                batch
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                          >
                            <FaEdit />
                            Manage Batch
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openStudentsModal(
                                batch
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600"
                          >
                            <FaUsers />
                            View Students
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <div className="mb-2 flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500 dark:text-slate-400">
                            Review Progress
                          </span>

                          <span className="text-slate-700 dark:text-slate-300">
                            {
                              batch.reviewed
                            }
                            /
                            {
                              batch.assigned
                            }{" "}
                            reviewed
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-500"
                            style={{
                              width: `${Math.min(
                                progress,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }
            )
          )}
        </section>
                {/* ===================================================
            CREATE / MANAGE BATCH MODAL
        =================================================== */}

        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-5">
            <button
              type="button"
              aria-label="Close batch form"
              onClick={closeForm}
              className="absolute inset-0"
            />

            <div className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    {editingBatch
                      ? "Manage Batch"
                      : "Create Batch"}
                  </h2>

                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    {office.name} clearance
                    schedule
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeForm}
                  disabled={savingBatch}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                >
                  <FaTimes />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-5 p-5 sm:p-6"
              >
                <Field label="Batch Name">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={`${office.name} Clearance - Batch 1`}
                    disabled={savingBatch}
                    className={inputClass}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Schedule Date">
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      disabled={savingBatch}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Maximum Students">
                    <input
                      type="number"
                      min="1"
                      name="capacity"
                      value={
                        formData.capacity
                      }
                      onChange={handleChange}
                      disabled={savingBatch}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Start Time">
                    <input
                      type="time"
                      name="startTime"
                      value={
                        formData.startTime
                      }
                      onChange={handleChange}
                      disabled={savingBatch}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="End Time">
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      disabled={savingBatch}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Student Note / Instructions">
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    rows="4"
                    disabled={savingBatch}
                    placeholder="Example: Please bring your School ID or resolve any outstanding office obligation."
                    className={`${inputClass} resize-none`}
                  />

                  <p className="mt-2 text-xs font-medium leading-5 text-slate-400">
                    This note can be shown
                    to students assigned to
                    this batch once the
                    student-side schedule
                    display is connected.
                  </p>
                </Field>

                {editingBatch && (
                  <Field label="Batch Status">
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      disabled={savingBatch}
                      className={inputClass}
                    >
                      <option value="Open">
                        Open
                      </option>

                      <option value="Closed">
                        Closed
                      </option>

                      <option value="Completed">
                        Completed
                      </option>

                      <option value="Cancelled">
                        Cancelled
                      </option>
                    </select>
                  </Field>
                )}

                {editingBatch &&
                  editingBatch.assigned >
                    0 && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                      <p className="text-xs font-bold leading-5 text-blue-700 dark:text-blue-300">
                        This batch already
                        contains{" "}
                        {
                          editingBatch.assigned
                        }{" "}
                        student(s). Its
                        capacity cannot be
                        reduced below that
                        number.
                      </p>
                    </div>
                  )}

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={savingBatch}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={savingBatch}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingBatch ? (
                      <FaRedo className="animate-spin" />
                    ) : (
                      <FaCheckCircle />
                    )}

                    {savingBatch
                      ? "Saving..."
                      : editingBatch
                        ? "Save Changes"
                        : "Create Batch"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ===================================================
            BATCH STUDENTS MODAL
        =================================================== */}

        {showStudentsModal &&
          selectedBatch && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-5">
              <button
                type="button"
                aria-label="Close students modal"
                onClick={
                  closeStudentsModal
                }
                className="absolute inset-0"
              />

              <div className="relative z-10 flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                {/* MODAL HEADER */}

                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getStatusClass(
                          selectedBatch.status
                        )}`}
                      >
                        {
                          selectedBatch.status
                        }
                      </span>

                      <span className="text-xs font-bold text-slate-400">
                        {office.name}
                      </span>
                    </div>

                    <h2 className="truncate text-lg font-black text-slate-950 dark:text-white sm:text-xl">
                      {selectedBatch.name}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <FaCalendarAlt />

                        {formatDate(
                          selectedBatch.date
                        )}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <FaClock />

                        {formatTime(
                          selectedBatch.startTime
                        )}{" "}
                        -{" "}
                        {formatTime(
                          selectedBatch.endTime
                        )}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <FaUsers />

                        {
                          batchStudents.length
                        }
                        /
                        {
                          selectedBatch.capacity
                        }{" "}
                        students
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeStudentsModal
                    }
                    disabled={
                      assigningStudents ||
                      Boolean(
                        removingStudentId
                      )
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:hover:bg-slate-700"
                  >
                    <FaTimes />
                  </button>
                </div>

                {/* MODAL CONTENT */}

                <div className="overflow-y-auto">
                  {loadingStudents ? (
                    <div className="flex min-h-[420px] flex-col items-center justify-center px-5 py-16 text-center">
                      <FaUsers className="mb-4 animate-pulse text-4xl text-blue-500" />

                      <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                        Loading students...
                      </h3>

                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Retrieving students
                        for this exact{" "}
                        {office.name} batch.
                      </p>
                    </div>
                  ) : (
                    <div className="grid xl:grid-cols-[1fr_1fr]">
                      {/* =====================================
                          ASSIGNED STUDENTS
                      ===================================== */}

                      <section className="border-b border-slate-100 p-5 dark:border-slate-800 sm:p-6 xl:border-b-0 xl:border-r">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                              Current Batch
                            </p>

                            <h3 className="mt-1 text-base font-black text-slate-950 dark:text-white">
                              Assigned
                              Students
                            </h3>
                          </div>

                          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                            {
                              batchStudents.length
                            }
                            /
                            {
                              selectedBatch.capacity
                            }
                          </span>
                        </div>

                        {batchStudents.length ===
                        0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
                            <FaUsers className="mx-auto mb-3 text-2xl text-slate-300 dark:text-slate-600" />

                            <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                              No students
                              assigned
                            </p>

                            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                              Select eligible
                              students from
                              the other side
                              to add them to
                              this batch.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {batchStudents.map(
                              (
                                student
                              ) => {
                                const reviewed =
                                  [
                                    "Approved",
                                    "Needs Action",
                                  ].includes(
                                    student.status
                                  );

                                const removing =
                                  removingStudentId ===
                                  student.stepId;

                                return (
                                  <div
                                    key={
                                      student.assignmentId ||
                                      student.id ||
                                      student.stepId
                                    }
                                    className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                                          {
                                            student.studentName
                                          }
                                        </p>

                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                          {
                                            student.studentId
                                          }
                                        </p>
                                      </div>

                                      <span
                                        className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${getStudentStatusClass(
                                          student.status
                                        )}`}
                                      >
                                        {
                                          student.status
                                        }
                                      </span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                      <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                        {
                                          student.course
                                        }
                                      </span>

                                      <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                        {
                                          student.yearLevel
                                        }
                                      </span>

                                      <span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                        Block{" "}
                                        {
                                          student.section
                                        }
                                      </span>
                                    </div>

                                    {student.remarks && (
                                      <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                          Review
                                          Remarks
                                        </p>

                                        <p className="mt-1 text-xs font-medium leading-5 text-slate-600 dark:text-slate-300">
                                          {
                                            student.remarks
                                          }
                                        </p>
                                      </div>
                                    )}

                                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                                      <p className="text-[10px] font-semibold leading-4 text-slate-400">
                                        {reviewed
                                          ? "Reviewed students are kept in this batch for history."
                                          : "Not reviewed yet."}
                                      </p>

                                      {!reviewed && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleRemoveStudent(
                                              student
                                            )
                                          }
                                          disabled={
                                            removing
                                          }
                                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                        >
                                          {removing ? (
                                            <FaRedo className="animate-spin" />
                                          ) : (
                                            <FaTrashAlt />
                                          )}

                                          {removing
                                            ? "Removing"
                                            : "Remove"}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}
                      </section>

                      {/* =====================================
                          AVAILABLE STUDENTS
                      ===================================== */}

                      <section className="p-5 sm:p-6">
                        <div className="mb-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                            Student Queue
                          </p>

                          <h3 className="mt-1 text-base font-black text-slate-950 dark:text-white">
                            Add Students
                          </h3>

                          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                            Only students
                            belonging to this
                            exact office
                            clearance step
                            and not already
                            assigned to
                            another office
                            batch are shown.
                          </p>
                        </div>

                        {selectedBatch.status !==
                        "Open" ? (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                            <div className="flex items-start gap-3">
                              <FaExclamationTriangle className="mt-0.5 shrink-0 text-amber-500" />

                              <div>
                                <p className="text-sm font-black text-amber-800 dark:text-amber-300">
                                  Batch is{" "}
                                  {
                                    selectedBatch.status
                                  }
                                </p>

                                <p className="mt-1 text-xs font-medium leading-5 text-amber-700/80 dark:text-amber-200/80">
                                  Change the
                                  batch status
                                  to Open before
                                  assigning more
                                  students.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : batchStudents.length >=
                          Number(
                            selectedBatch.capacity
                          ) ? (
                          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                            <div className="flex items-start gap-3">
                              <FaCheckCircle className="mt-0.5 shrink-0 text-blue-500" />

                              <div>
                                <p className="text-sm font-black text-blue-800 dark:text-blue-300">
                                  Batch is full
                                </p>

                                <p className="mt-1 text-xs font-medium leading-5 text-blue-700/80 dark:text-blue-200/80">
                                  This batch has
                                  reached its
                                  maximum of{" "}
                                  {
                                    selectedBatch.capacity
                                  }{" "}
                                  students.
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="relative">
                              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400" />

                              <input
                                type="text"
                                value={
                                  studentSearch
                                }
                                onChange={(
                                  event
                                ) =>
                                  setStudentSearch(
                                    event
                                      .target
                                      .value
                                  )
                                }
                                placeholder="Search student, ID, course, block..."
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                              />
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={
                                  selectAllVisibleStudents
                                }
                                disabled={
                                  filteredAvailableStudents.length ===
                                  0
                                }
                                className="text-xs font-black text-blue-600 transition hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-blue-400"
                              >
                                {filteredAvailableStudents.length >
                                  0 &&
                                filteredAvailableStudents.every(
                                  (
                                    student
                                  ) =>
                                    selectedStudentSteps.includes(
                                      student.stepId
                                    )
                                )
                                  ? "Unselect Visible"
                                  : "Select Visible"}
                              </button>

                              <p className="text-[10px] font-bold text-slate-400">
                                {
                                  selectedStudentSteps.length
                                }{" "}
                                selected
                              </p>
                            </div>

                            {filteredAvailableStudents.length ===
                            0 ? (
                              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
                                <FaUserPlus className="mx-auto mb-3 text-2xl text-slate-300 dark:text-slate-600" />

                                <p className="text-sm font-black text-slate-700 dark:text-slate-300">
                                  {availableStudents.length ===
                                  0
                                    ? "No available students"
                                    : "No matching students"}
                                </p>

                                <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                                  {availableStudents.length ===
                                  0
                                    ? `There are currently no unassigned ${office.name} clearance students available for this batch.`
                                    : "Try a different search term."}
                                </p>
                              </div>
                            ) : (
                              <div className="mt-4 max-h-[410px] space-y-2 overflow-y-auto pr-1">
                                {filteredAvailableStudents.map(
                                  (
                                    student
                                  ) => {
                                    const selected =
                                      selectedStudentSteps.includes(
                                        student.stepId
                                      );

                                    return (
                                      <button
                                        key={
                                          student.stepId
                                        }
                                        type="button"
                                        onClick={() =>
                                          toggleStudentSelection(
                                            student.stepId
                                          )
                                        }
                                        className={`w-full rounded-2xl border p-3.5 text-left transition ${
                                          selected
                                            ? "border-blue-400 bg-blue-50 ring-2 ring-blue-500/10 dark:border-blue-500 dark:bg-blue-500/10"
                                            : "border-slate-200 hover:border-blue-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-blue-500/30 dark:hover:bg-slate-800/50"
                                        }`}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div
                                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                                              selected
                                                ? "border-blue-600 bg-blue-600 text-white"
                                                : "border-slate-300 bg-white text-transparent dark:border-slate-600 dark:bg-slate-900"
                                            }`}
                                          >
                                            <FaCheckCircle className="text-[10px]" />
                                          </div>

                                          <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                              <div className="min-w-0">
                                                <p className="truncate text-xs font-black text-slate-900 dark:text-white">
                                                  {
                                                    student.studentName
                                                  }
                                                </p>

                                                <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                                                  {
                                                    student.studentId
                                                  }
                                                </p>
                                              </div>

                                              <span
                                                className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-wide ${getStudentStatusClass(
                                                  student.status
                                                )}`}
                                              >
                                                {
                                                  student.status
                                                }
                                              </span>
                                            </div>

                                            <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                              <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                                {
                                                  student.course
                                                }
                                              </span>

                                              <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                                {
                                                  student.yearLevel
                                                }
                                              </span>

                                              <span className="rounded-md bg-slate-100 px-2 py-1 dark:bg-slate-800">
                                                Block{" "}
                                                {
                                                  student.section
                                                }
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            )}

                            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="text-xs font-bold text-slate-500">
                                  Remaining
                                  Slots
                                </p>

                                <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                                  {Math.max(
                                    Number(
                                      selectedBatch.capacity ||
                                        0
                                    ) -
                                      batchStudents.length,
                                    0
                                  )}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={
                                  handleAssignStudents
                                }
                                disabled={
                                  assigningStudents ||
                                  selectedStudentSteps.length ===
                                    0
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {assigningStudents ? (
                                  <FaRedo className="animate-spin" />
                                ) : (
                                  <FaUserPlus />
                                )}

                                {assigningStudents
                                  ? "Assigning..."
                                  : `Assign ${
                                      selectedStudentSteps.length
                                    } Student${
                                      selectedStudentSteps.length ===
                                      1
                                        ? ""
                                        : "s"
                                    }`}
                              </button>
                            </div>
                          </>
                        )}
                      </section>
                    </div>
                  )}
                </div>

                {/* MODAL FOOTER */}

                <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-[10px] font-semibold leading-5 text-slate-400">
                    Batch assignment only
                    organizes the schedule.
                    Approval or Needs Action
                    is still performed per
                    student on the exact
                    office clearance step.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      loadBatchStudents(
                        selectedBatch
                      )
                    }
                    disabled={
                      loadingStudents ||
                      assigningStudents ||
                      Boolean(
                        removingStudentId
                      )
                    }
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <FaRedo
                      className={
                        loadingStudents
                          ? "animate-spin"
                          : ""
                      }
                    />

                    Refresh Students
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
// SMALL COMPONENTS
// ===========================================================

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

function Field({
  label,
  children,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}
      </span>

      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Icon />
        </div>
      </div>
    </div>
  );
}

export default ScheduleBatches;