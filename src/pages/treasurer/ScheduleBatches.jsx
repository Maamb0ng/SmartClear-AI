import { useEffect, useMemo, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";

import Swal from "sweetalert2";



import TreasurerLayout from "../../layouts/TreasurerLayout";



import {

  createTreasurerBatch,

  getTreasurerBatches,

  getTreasurerEligibleStudents,

  getTreasurerBatchStudents,

  updateTreasurerBatch,

  updateTreasurerBatchStatus,

} from "../../services/treasurerService";



import {

  FaCalendarAlt,

  FaCheck,

  FaClock,

  FaEdit,

  FaEye,

  FaSave,

  FaPlus,

  FaSearch,

  FaSyncAlt,

  FaTimes,

  FaUserGraduate,

  FaUsers,

} from "react-icons/fa";



const INITIAL_FORM = {

  batchName: "",

  schoolYear: "",

  semester: "",

  scheduleDate: "",

  startTime: "",

  endTime: "",

  studentNote: "",

  maxStudents: 30,

};



const formatDate = (value) => {

  if (!value) return "No date";



  const date = new Date(`${value}T00:00:00`);



  if (Number.isNaN(date.getTime())) {

    return value;

  }



  return date.toLocaleDateString("en-PH", {

    month: "short",

    day: "numeric",

    year: "numeric",

  });

};



const formatTime = (value) => {

  if (!value) return "";



  const raw = String(value).slice(0, 5);



  const [hour, minute] = raw.split(":");



  if (hour === undefined || minute === undefined) {

    return value;

  }



  const date = new Date();



  date.setHours(

    Number(hour),

    Number(minute),

    0,

    0

  );



  return date.toLocaleTimeString("en-PH", {

    hour: "numeric",

    minute: "2-digit",

  });

};



const getStatusStyle = (status) => {

  switch (status) {

    case "Open":

      return "bg-emerald-50 text-emerald-700 ring-emerald-200";



    case "Completed":

      return "bg-blue-50 text-blue-700 ring-blue-200";



    case "Closed":

      return "bg-slate-100 text-slate-700 ring-slate-200";



    case "Cancelled":

      return "bg-red-50 text-red-700 ring-red-200";



    default:

      return "bg-amber-50 text-amber-700 ring-amber-200";

  }

};



function ScheduleBatches() {

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =

    useState(false);



  const [eligibleStudents, setEligibleStudents] =

    useState([]);



  const [batches, setBatches] = useState([]);



  const [showCreateModal, setShowCreateModal] =

    useState(false);



  const [saving, setSaving] = useState(false);



  const [searchTerm, setSearchTerm] =

    useState("");



  const [courseFilter, setCourseFilter] =

    useState("All");



  const [yearFilter, setYearFilter] =

    useState("All");



  const [selectedSteps, setSelectedSteps] =

    useState([]);



  const [form, setForm] =

    useState(INITIAL_FORM);

  const [manageBatch, setManageBatch] = useState(null);
  const [manageStudents, setManageStudents] = useState([]);
  const [savingManage, setSavingManage] = useState(false);
  const [viewBatch, setViewBatch] = useState(null);
  const [viewStudents, setViewStudents] = useState([]);
  const [loadingView, setLoadingView] = useState(false);
  const [editForm, setEditForm] = useState({
    batchName: "", scheduleDate: "", startTime: "", endTime: "",
    studentNote: "", maxStudents: 30, status: "Open",
  });



  useEffect(() => {

    loadData();

  }, []);



  const loadData = async (

    showRefreshing = false

  ) => {

    try {

      if (showRefreshing) {

        setRefreshing(true);

      } else {

        setLoading(true);

      }



      const [

        eligibleResult,

        batchResult,

      ] = await Promise.all([

        getTreasurerEligibleStudents(),

        getTreasurerBatches(),

      ]);



      setEligibleStudents(

        Array.isArray(eligibleResult)

          ? eligibleResult

          : []

      );



      setBatches(

        Array.isArray(batchResult)

          ? batchResult

          : []

      );

    } catch (error) {

      console.error(

        "Treasurer schedule load error:",

        error

      );



      await Swal.fire({

        icon: "error",

        title: "Unable to Load",

        text:

          error?.message ||

          "Unable to load Treasurer schedules.",

      });

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  };



  const courseOptions = useMemo(() => {

    return [

      ...new Set(

        eligibleStudents

          .map((student) =>

            String(

              student.course || ""

            ).trim()

          )

          .filter(Boolean)

      ),

    ].sort((a, b) =>

      a.localeCompare(b)

    );

  }, [eligibleStudents]);



  const yearOptions = useMemo(() => {

    return [

      ...new Set(

        eligibleStudents

          .map((student) =>

            String(

              student.year_level || ""

            ).trim()

          )

          .filter(Boolean)

      ),

    ].sort((a, b) =>

      a.localeCompare(b, undefined, {

        numeric: true,

      })

    );

  }, [eligibleStudents]);



  const filteredStudents = useMemo(() => {

    const query = searchTerm

      .trim()

      .toLowerCase();



    return eligibleStudents.filter(

      (student) => {

        if (

          courseFilter !== "All" &&

          String(student.course) !==

            courseFilter

        ) {

          return false;

        }



        if (

          yearFilter !== "All" &&

          String(student.year_level) !==

            yearFilter

        ) {

          return false;

        }



        if (!query) {

          return true;

        }



        return [

          student.student_number,

          student.full_name,

          student.course,

          student.year_level,

          student.section,

          student.semester,

          student.school_year,

        ]

          .filter(Boolean)

          .join(" ")

          .toLowerCase()

          .includes(query);

      }

    );

  }, [

    eligibleStudents,

    searchTerm,

    courseFilter,

    yearFilter,

  ]);



  const selectedCount =

    selectedSteps.length;



  const allVisibleSelected =

    filteredStudents.length > 0 &&

    filteredStudents.every((student) =>

      selectedSteps.includes(

        student.clearance_step_id

      )

    );



  const openCreateBatch = () => {

    setForm(INITIAL_FORM);

    setSelectedSteps([]);

    setSearchTerm("");

    setCourseFilter("All");

    setYearFilter("All");

    setShowCreateModal(true);

  };



  const closeCreateBatch = () => {

    if (saving) return;



    setShowCreateModal(false);

    setSelectedSteps([]);

    setForm(INITIAL_FORM);

  };



  const toggleStudent = (stepId) => {

    setSelectedSteps((current) => {

      if (current.includes(stepId)) {

        return current.filter(

          (id) => id !== stepId

        );

      }



      const maxStudents =

        Number(form.maxStudents) || 0;



      if (

        maxStudents > 0 &&

        current.length >= maxStudents

      ) {

        Swal.fire({

          icon: "info",

          title: "Batch Capacity Reached",

          text: `This batch can contain a maximum of ${maxStudents} students.`,

        });



        return current;

      }



      return [...current, stepId];

    });

  };



  const toggleSelectVisible = () => {

    if (allVisibleSelected) {

      const visibleIds =

        filteredStudents.map(

          (student) =>

            student.clearance_step_id

        );



      setSelectedSteps((current) =>

        current.filter(

          (id) =>

            !visibleIds.includes(id)

        )

      );



      return;

    }



    const capacity =

      Number(form.maxStudents) || 0;



    const current = [

      ...selectedSteps,

    ];



    for (const student of filteredStudents) {

      if (

        capacity > 0 &&

        current.length >= capacity

      ) {

        break;

      }



      if (

        !current.includes(

          student.clearance_step_id

        )

      ) {

        current.push(

          student.clearance_step_id

        );

      }

    }



    setSelectedSteps(current);

  };



  const handleMaxStudentsChange = (

    event

  ) => {

    const value = event.target.value;



    setForm((previous) => ({

      ...previous,

      maxStudents: value,

    }));



    const capacity = Number(value);



    if (

      Number.isInteger(capacity) &&

      capacity > 0

    ) {

      setSelectedSteps((current) =>

        current.slice(0, capacity)

      );

    }

  };



  const handleCreateBatch = async (

    event

  ) => {

    event.preventDefault();



    if (!form.batchName.trim()) {

      await Swal.fire({

        icon: "warning",

        title: "Batch Name Required",

        text: "Enter a name for this schedule batch.",

      });



      return;

    }



    if (!form.schoolYear.trim()) {

      await Swal.fire({

        icon: "warning",

        title: "School Year Required",

        text: "Enter the school year.",

      });



      return;

    }



    if (!form.semester) {

      await Swal.fire({

        icon: "warning",

        title: "Semester Required",

        text: "Select the semester.",

      });



      return;

    }



    if (

      !form.scheduleDate ||

      !form.startTime ||

      !form.endTime

    ) {

      await Swal.fire({

        icon: "warning",

        title: "Schedule Required",

        text: "Select the date, start time, and end time.",

      });



      return;

    }



    if (

      form.endTime <= form.startTime

    ) {

      await Swal.fire({

        icon: "warning",

        title: "Invalid Time",

        text: "End time must be later than the start time.",

      });



      return;

    }



    const capacity =

      Number(form.maxStudents);



    if (

      !Number.isInteger(capacity) ||

      capacity <= 0

    ) {

      await Swal.fire({

        icon: "warning",

        title: "Invalid Capacity",

        text: "Maximum students must be greater than zero.",

      });



      return;

    }



    if (!selectedSteps.length) {

      await Swal.fire({

        icon: "warning",

        title: "No Students Selected",

        text: "Select at least one student for this batch.",

      });



      return;

    }



    const confirmation =

      await Swal.fire({

        icon: "question",

        title: "Create Schedule Batch?",

        html: `

          <div style="text-align:left;line-height:1.7">

            <p><strong>Batch:</strong> ${form.batchName}</p>

            <p><strong>Date:</strong> ${formatDate(form.scheduleDate)}</p>

            <p><strong>Time:</strong> ${formatTime(form.startTime)} - ${formatTime(form.endTime)}</p>

            <p><strong>Students:</strong> ${selectedSteps.length}</p>

          </div>

        `,

        showCancelButton: true,

        confirmButtonText:

          "Create Batch",

        cancelButtonText: "Cancel",

        confirmButtonColor: "#1d4ed8",

      });



    if (!confirmation.isConfirmed) {

      return;

    }



    try {

      setSaving(true);



      const result =

        await createTreasurerBatch({

          batchName:

            form.batchName,

          schoolYear:

            form.schoolYear,

          semester:

            form.semester,

          scheduleDate:

            form.scheduleDate,

          startTime:

            form.startTime,

          endTime:

            form.endTime,

          studentNote:

            form.studentNote,

          maxStudents:

            capacity,

          clearanceStepIds:

            selectedSteps,

        });



      setShowCreateModal(false);

      setSelectedSteps([]);

      setForm(INITIAL_FORM);



      await Swal.fire({

        icon: "success",

        title: "Batch Created",

        text: `${

          result?.students_assigned ??

          selectedSteps.length

        } student(s) were scheduled successfully.`,

        timer: 1800,

        showConfirmButton: false,

      });



      await loadData(true);

    } catch (error) {

      console.error(

        "Create Treasurer batch error:",

        error

      );



      await Swal.fire({

        icon: "error",

        title: "Unable to Create Batch",

        text:

          error?.message ||

          "The Treasurer schedule could not be created.",

      });

    } finally {

      setSaving(false);

    }

  };



  const openManageBatch = async (batch) => {
    try {
      const students = await getTreasurerBatchStudents(batch.id);
      setManageStudents(Array.isArray(students) ? students : []);
      setEditForm({
        batchName: batch.batch_name || "",
        scheduleDate: batch.schedule_date || "",
        startTime: String(batch.start_time || "").slice(0, 5),
        endTime: String(batch.end_time || "").slice(0, 5),
        studentNote: batch.student_note || "",
        maxStudents: batch.max_students || 30,
        status: batch.status || "Open",
      });
      setManageBatch(batch);
    } catch (error) {
      Swal.fire({ icon: "error", title: "Unable to Manage Batch", text: error?.message || "Unable to load this batch." });
    }
  };

  const saveManagedBatch = async (event) => {
    event.preventDefault();
    if (!manageBatch?.id) return;
    const capacity = Number(editForm.maxStudents);
    if (!editForm.batchName.trim()) return Swal.fire({ icon: "warning", title: "Batch Name Required" });
    if (!editForm.scheduleDate || !editForm.startTime || !editForm.endTime) return Swal.fire({ icon: "warning", title: "Schedule Required" });
    if (editForm.endTime <= editForm.startTime) return Swal.fire({ icon: "warning", title: "Invalid Time", text: "End time must be later than start time." });
    if (!Number.isInteger(capacity) || capacity < manageStudents.length || capacity <= 0) return Swal.fire({ icon: "warning", title: "Invalid Capacity", text: `This batch already has ${manageStudents.length} assigned student(s).` });

    if (["Completed", "Cancelled"].includes(editForm.status) && editForm.status !== manageBatch.status) {
      const result = await Swal.fire({ icon: "warning", title: `${editForm.status} Batch?`, text: "Student review records will be preserved.", showCancelButton: true, confirmButtonText: "Confirm" });
      if (!result.isConfirmed) return;
    }

    try {
      setSavingManage(true);
      await updateTreasurerBatch(manageBatch.id, {
        batchName: editForm.batchName,
        scheduleDate: editForm.scheduleDate,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        studentNote: editForm.studentNote,
        maxStudents: capacity,
      });
      if (editForm.status !== manageBatch.status) await updateTreasurerBatchStatus(manageBatch.id, editForm.status);
      setManageBatch(null);
      await Swal.fire({ icon: "success", title: "Batch Updated", timer: 1500, showConfirmButton: false });
      await loadData(true);
    } catch (error) {
      Swal.fire({ icon: "error", title: "Unable to Update Batch", text: error?.message || "Update failed." });
    } finally {
      setSavingManage(false);
    }
  };

  const openViewStudents = async (batch) => {
    setViewBatch(batch); setViewStudents([]); setLoadingView(true);
    try {
      const students = await getTreasurerBatchStudents(batch.id);
      setViewStudents(Array.isArray(students) ? students : []);
    } catch (error) {
      Swal.fire({ icon: "error", title: "Unable to Load Students", text: error?.message || "Unable to load students." });
    } finally { setLoadingView(false); }
  };


  if (loading) {

    return (

      <TreasurerLayout>

        <div className="flex min-h-[65vh] items-center justify-center">

          <div className="text-center">

            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />



            <p className="mt-4 text-sm font-bold text-slate-500">

              Loading schedules...

            </p>

          </div>

        </div>

      </TreasurerLayout>

    );

  }



  return (

    <TreasurerLayout>

      <div className="space-y-5 pt-10 md:pt-12">

        {/* HEADER */}

        <motion.section

          initial={{

            opacity: 0,

            y: 12,

          }}

          animate={{

            opacity: 1,

            y: 0,

          }}

          className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg"

        >

          <div className="relative p-6 md:p-8">

            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />



            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

              <div>

                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-blue-300">

                  <FaCalendarAlt />

                  Treasurer Scheduling

                </div>



                <h1 className="text-2xl font-black md:text-3xl">

                  Schedule & Batches

                </h1>



                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">

                  Set when students can visit

                  the Treasurer for

                  face-to-face financial

                  clearance verification.

                </p>

              </div>



              <div className="flex flex-wrap gap-2">

                <button

                  type="button"

                  onClick={() =>

                    loadData(true)

                  }

                  disabled={refreshing}

                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black transition hover:bg-white/15 disabled:opacity-60"

                >

                  <FaSyncAlt

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

                  onClick={openCreateBatch}

                  className="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-400"

                >

                  <FaPlus />

                  Create Batch

                </button>

              </div>

            </div>

          </div>

        </motion.section>



        {/* SUMMARY */}

        <section className="grid gap-3 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-semibold text-slate-500">

                  Unscheduled Students

                </p>



                <p className="mt-2 text-3xl font-black text-slate-900">

                  {

                    eligibleStudents.length

                  }

                </p>

              </div>



              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">

                <FaUserGraduate />

              </div>

            </div>

          </div>



          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-semibold text-slate-500">

                  Open Batches

                </p>



                <p className="mt-2 text-3xl font-black text-slate-900">

                  {

                    batches.filter(

                      (batch) =>

                        batch.status ===

                        "Open"

                    ).length

                  }

                </p>

              </div>



              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

                <FaCalendarAlt />

              </div>

            </div>

          </div>



          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm font-semibold text-slate-500">

                  Total Batches

                </p>



                <p className="mt-2 text-3xl font-black text-slate-900">

                  {batches.length}

                </p>

              </div>



              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

                <FaUsers />

              </div>

            </div>

          </div>

        </section>



        {/* BATCH LIST */}

        <motion.section

          initial={{

            opacity: 0,

            y: 10,

          }}

          animate={{

            opacity: 1,

            y: 0,

          }}

          className="rounded-3xl border border-slate-200 bg-white shadow-sm"

        >

          <div className="border-b border-slate-200 p-5 md:p-6">

            <h2 className="text-xl font-black text-slate-900">

              Treasurer Batches

            </h2>



            <p className="mt-1 text-sm text-slate-500">

              Students assigned to a batch

              will see its date, time, and

              Treasurer note.

            </p>

          </div>



          <div className="p-5 md:p-6">

            {batches.length === 0 ? (

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">

                <FaCalendarAlt className="mx-auto text-4xl text-slate-300" />



                <h3 className="mt-4 text-lg font-black text-slate-800">

                  No Schedule Batches Yet

                </h3>



                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">

                  Create your first batch

                  and assign students who

                  are waiting for Treasurer

                  clearance.

                </p>



                <button

                  type="button"

                  onClick={openCreateBatch}

                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-800"

                >

                  <FaPlus />

                  Create First Batch

                </button>

              </div>

            ) : (

              <div className="grid gap-4 lg:grid-cols-2">

                {batches.map(

                  (batch, index) => (

                    <motion.article

                      key={batch.id}

                      initial={{

                        opacity: 0,

                        y: 8,

                      }}

                      animate={{

                        opacity: 1,

                        y: 0,

                      }}

                      transition={{

                        delay:

                          index * 0.03,

                      }}

                      className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200 hover:shadow-md"

                    >

                      <div className="flex items-start justify-between gap-4">

                        <div className="min-w-0">

                          <h3 className="truncate text-lg font-black text-slate-900">

                            {

                              batch.batch_name

                            }

                          </h3>



                          <p className="mt-1 text-sm font-semibold text-slate-500">

                            {

                              batch.semester

                            }{" "}

                            •{" "}

                            {

                              batch.school_year

                            }

                          </p>

                        </div>



                        <span

                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ring-1 ring-inset ${getStatusStyle(

                            batch.status

                          )}`}

                        >

                          {batch.status}

                        </span>

                      </div>



                      <div className="mt-5 grid gap-3 sm:grid-cols-2">

                        <div className="rounded-xl bg-slate-50 p-3">

                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">

                            Date

                          </p>



                          <p className="mt-1 font-black text-slate-800">

                            {formatDate(

                              batch.schedule_date

                            )}

                          </p>

                        </div>



                        <div className="rounded-xl bg-slate-50 p-3">

                          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">

                            Time

                          </p>



                          <p className="mt-1 font-black text-slate-800">

                            {formatTime(

                              batch.start_time

                            )}{" "}

                            -{" "}

                            {formatTime(

                              batch.end_time

                            )}

                          </p>

                        </div>

                      </div>



                      <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">

                        <FaUsers className="text-blue-600" />



                        Maximum{" "}

                        {batch.max_students}{" "}

                        students

                      </div>



                      {batch.student_note && (

                        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">

                          <p className="text-xs font-black uppercase tracking-wide text-blue-600">

                            Student Note

                          </p>



                          <p className="mt-1 text-sm leading-6 text-blue-900">

                            {

                              batch.student_note

                            }

                          </p>

                        </div>

                      )}

                      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                        <button type="button" onClick={() => openViewStudents(batch)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"><FaEye /> View Students</button>
                        <button type="button" onClick={() => openManageBatch(batch)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800"><FaEdit /> Manage Batch</button>
                      </div>

                    </motion.article>

                  )

                )}

              </div>

            )}

          </div>

        </motion.section>

      </div>



      {/* CREATE BATCH MODAL */}

      <AnimatePresence>

        {showCreateModal && (

          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

            <motion.div

              initial={{

                opacity: 0,

                scale: 0.97,

                y: 12,

              }}

              animate={{

                opacity: 1,

                scale: 1,

                y: 0,

              }}

              exit={{

                opacity: 0,

                scale: 0.97,

              }}

              className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl"

            >

              <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-5 md:p-6">

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">

                      Treasurer Schedule

                    </p>



                    <h2 className="mt-1 text-xl font-black text-slate-900 md:text-2xl">

                      Create Student Batch

                    </h2>



                    <p className="mt-1 text-sm text-slate-500">

                      Select students and

                      assign their

                      face-to-face Treasurer

                      schedule.

                    </p>

                  </div>



                  <button

                    type="button"

                    onClick={

                      closeCreateBatch

                    }

                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"

                  >

                    <FaTimes />

                  </button>

                </div>

              </div>



              <form

                onSubmit={

                  handleCreateBatch

                }

                className="p-5 md:p-6"

              >

                <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">

                  {/* SCHEDULE FORM */}

                  <div className="space-y-4">

                    <div>

                      <label className="mb-2 block text-sm font-black text-slate-700">

                        Batch Name

                      </label>



                      <input

                        type="text"

                        value={

                          form.batchName

                        }

                        onChange={(event) =>

                          setForm(

                            (previous) => ({

                              ...previous,

                              batchName:

                                event.target

                                  .value,

                            })

                          )

                        }

                        placeholder="Example: BSIT Morning Batch"

                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                      />

                    </div>



                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">

                      <div>

                        <label className="mb-2 block text-sm font-black text-slate-700">

                          School Year

                        </label>



                        <input

                          type="text"

                          value={

                            form.schoolYear

                          }

                          onChange={(

                            event

                          ) =>

                            setForm(

                              (

                                previous

                              ) => ({

                                ...previous,

                                schoolYear:

                                  event

                                    .target

                                    .value,

                              })

                            )

                          }

                          placeholder="2026-2027"

                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                        />

                      </div>



                      <div>

                        <label className="mb-2 block text-sm font-black text-slate-700">

                          Semester

                        </label>



                        <select

                          value={

                            form.semester

                          }

                          onChange={(

                            event

                          ) =>

                            setForm(

                              (

                                previous

                              ) => ({

                                ...previous,

                                semester:

                                  event

                                    .target

                                    .value,

                              })

                            )

                          }

                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                        >

                          <option value="">

                            Select

                          </option>



                          <option value="1st Semester">

                            1st Semester

                          </option>



                          <option value="2nd Semester">

                            2nd Semester

                          </option>



                          <option value="Summer">

                            Summer

                          </option>

                        </select>

                      </div>

                    </div>



                    <div>

                      <label className="mb-2 block text-sm font-black text-slate-700">

                        Schedule Date

                      </label>



                      <input

                        type="date"

                        value={

                          form.scheduleDate

                        }

                        onChange={(event) =>

                          setForm(

                            (previous) => ({

                              ...previous,

                              scheduleDate:

                                event.target

                                  .value,

                            })

                          )

                        }

                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                      />

                    </div>



                    <div className="grid grid-cols-2 gap-3">

                      <div>

                        <label className="mb-2 block text-sm font-black text-slate-700">

                          Start Time

                        </label>



                        <input

                          type="time"

                          value={

                            form.startTime

                          }

                          onChange={(

                            event

                          ) =>

                            setForm(

                              (

                                previous

                              ) => ({

                                ...previous,

                                startTime:

                                  event

                                    .target

                                    .value,

                              })

                            )

                          }

                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                        />

                      </div>



                      <div>

                        <label className="mb-2 block text-sm font-black text-slate-700">

                          End Time

                        </label>



                        <input

                          type="time"

                          value={

                            form.endTime

                          }

                          onChange={(

                            event

                          ) =>

                            setForm(

                              (

                                previous

                              ) => ({

                                ...previous,

                                endTime:

                                  event

                                    .target

                                    .value,

                              })

                            )

                          }

                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                        />

                      </div>

                    </div>



                    <div>

                      <label className="mb-2 block text-sm font-black text-slate-700">

                        Maximum Students

                      </label>



                      <input

                        type="number"

                        min="1"

                        value={

                          form.maxStudents

                        }

                        onChange={

                          handleMaxStudentsChange

                        }

                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                      />

                    </div>



                    <div>

                      <label className="mb-2 block text-sm font-black text-slate-700">

                        Note for Students

                      </label>



                      <textarea

                        rows={4}

                        value={

                          form.studentNote

                        }

                        onChange={(event) =>

                          setForm(

                            (previous) => ({

                              ...previous,

                              studentNote:

                                event.target

                                  .value,

                            })

                          )

                        }

                        placeholder="Example: Please visit the Treasurer's Office and bring your school ID."

                        className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

                      />

                    </div>

                  </div>



                  {/* STUDENT SELECTION */}

                  <div className="min-w-0">

                    <div className="rounded-2xl border border-slate-200">

                      <div className="border-b border-slate-200 p-4">

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                          <div>

                            <h3 className="font-black text-slate-900">

                              Select Students

                            </h3>



                            <p className="mt-1 text-xs font-semibold text-slate-500">

                              {

                                selectedCount

                              }{" "}

                              selected •{" "}

                              {

                                eligibleStudents.length

                              }{" "}

                              available

                            </p>

                          </div>



                          <button

                            type="button"

                            onClick={

                              toggleSelectVisible

                            }

                            disabled={

                              filteredStudents.length ===

                              0

                            }

                            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"

                          >

                            {allVisibleSelected

                              ? "Unselect Visible"

                              : "Select Visible"}

                          </button>

                        </div>



                        <div className="mt-4 grid gap-2 md:grid-cols-[minmax(200px,1fr)\_150px_130px]">

                          <div className="relative">

                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />



                            <input

                              type="text"

                              value={

                                searchTerm

                              }

                              onChange={(

                                event

                              ) =>

                                setSearchTerm(

                                  event

                                    .target

                                    .value

                                )

                              }

                              placeholder="Search student..."

                              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"

                            />

                          </div>



                          <select

                            value={

                              courseFilter

                            }

                            onChange={(

                              event

                            ) =>

                              setCourseFilter(

                                event.target

                                  .value

                              )

                            }

                            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"

                          >

                            <option value="All">

                              All Courses

                            </option>



                            {courseOptions.map(

                              (course) => (

                                <option

                                  key={

                                    course

                                  }

                                  value={

                                    course

                                  }

                                >

                                  {

                                    course

                                  }

                                </option>

                              )

                            )}

                          </select>



                          <select

                            value={

                              yearFilter

                            }

                            onChange={(

                              event

                            ) =>

                              setYearFilter(

                                event.target

                                  .value

                              )

                            }

                            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"

                          >

                            <option value="All">

                              All Years

                            </option>



                            {yearOptions.map(

                              (year) => (

                                <option

                                  key={

                                    year

                                  }

                                  value={

                                    year

                                  }

                                >

                                  Year{" "}

                                  {year}

                                </option>

                              )

                            )}

                          </select>

                        </div>

                      </div>



                      <div className="max-h-[520px] overflow-y-auto p-3">

                        {filteredStudents.length ===

                        0 ? (

                          <div className="px-5 py-14 text-center">

                            <FaUserGraduate className="mx-auto text-4xl text-slate-300" />



                            <p className="mt-4 font-black text-slate-700">

                              No eligible

                              students

                            </p>



                            <p className="mt-1 text-sm text-slate-500">

                              No unscheduled

                              Treasurer

                              clearance

                              requests match

                              the current

                              filters.

                            </p>

                          </div>

                        ) : (

                          <div className="space-y-2">

                            {filteredStudents.map(

                              (

                                student

                              ) => {

                                const selected =

                                  selectedSteps.includes(

                                    student.clearance_step_id

                                  );



                                return (

                                  <button

                                    key={

                                      student.clearance_step_id

                                    }

                                    type="button"

                                    onClick={() =>

                                      toggleStudent(

                                        student.clearance_step_id

                                      )

                                    }

                                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${

                                      selected

                                        ? "border-blue-300 bg-blue-50"

                                        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"

                                    }`}

                                  >

                                    <div

                                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${

                                        selected

                                          ? "border-blue-700 bg-blue-700 text-white"

                                          : "border-slate-300 bg-white text-transparent"

                                      }`}

                                    >

                                      <FaCheck className="text-xs" />

                                    </div>



                                    <div className="min-w-0 flex-1">

                                      <p className="truncate font-black text-slate-900">

                                        {

                                          student.full_name

                                        }

                                      </p>



                                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">

                                        {student.student_number ||

                                          "No Student ID"}{" "}

                                        •{" "}

                                        {student.course ||

                                          "N/A"}{" "}

                                        • Year{" "}

                                        {student.year_level ||

                                          "N/A"}{" "}

                                        •{" "}

                                        {student.section ||

                                          "No Block"}

                                      </p>



                                      <p className="mt-1 text-[11px] font-semibold text-slate-400">

                                        {

                                          student.semester

                                        }{" "}

                                        •{" "}

                                        {

                                          student.school_year

                                        }

                                      </p>

                                    </div>

                                  </button>

                                );

                              }

                            )}

                          </div>

                        )}

                      </div>

                    </div>

                  </div>

                </div>



                <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">

                  <p className="text-sm font-semibold text-slate-500">

                    <span className="font-black text-slate-900">

                      {selectedCount}

                    </span>{" "}

                    of{" "}

                    <span className="font-black text-slate-900">

                      {form.maxStudents ||

                        0}

                    </span>{" "}

                    students selected

                  </p>



                  <div className="flex gap-2">

                    <button

                      type="button"

                      onClick={

                        closeCreateBatch

                      }

                      disabled={saving}

                      className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"

                    >

                      Cancel

                    </button>



                    <button

                      type="submit"

                      disabled={

                        saving ||

                        selectedCount ===

                          0

                      }

                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"

                    >

                      {saving ? (

                        <>

                          <FaSyncAlt className="animate-spin" />

                          Creating...

                        </>

                      ) : (

                        <>

                          <FaCalendarAlt />

                          Create Batch

                        </>

                      )}

                    </button>

                  </div>

                </div>

              </form>

            </motion.div>

          </div>

        )}

      </AnimatePresence>


      <AnimatePresence>
        {manageBatch && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-200 p-6">
                <div><p className="text-xs font-black uppercase tracking-wider text-blue-700">Manage Schedule</p><h2 className="mt-1 text-2xl font-black text-slate-900">Edit Treasurer Batch</h2><p className="mt-1 text-sm text-slate-500">{manageBatch.semester} • {manageBatch.school_year} • {manageStudents.length} assigned</p></div>
                <button type="button" onClick={() => setManageBatch(null)} disabled={savingManage} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100"><FaTimes /></button>
              </div>
              <form onSubmit={saveManagedBatch} className="space-y-4 p-6">
                <div><label className="mb-2 block text-sm font-black text-slate-700">Batch Name</label><input value={editForm.batchName} onChange={(e) => setEditForm((p) => ({...p,batchName:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></div>
                <div><label className="mb-2 block text-sm font-black text-slate-700">Schedule Date</label><input type="date" value={editForm.scheduleDate} onChange={(e) => setEditForm((p) => ({...p,scheduleDate:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></div>
                <div className="grid grid-cols-2 gap-3"><div><label className="mb-2 block text-sm font-black text-slate-700">Start Time</label><input type="time" value={editForm.startTime} onChange={(e) => setEditForm((p) => ({...p,startTime:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></div><div><label className="mb-2 block text-sm font-black text-slate-700">End Time</label><input type="time" value={editForm.endTime} onChange={(e) => setEditForm((p) => ({...p,endTime:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></div></div>
                <div className="grid grid-cols-2 gap-3"><div><label className="mb-2 block text-sm font-black text-slate-700">Maximum Students</label><input type="number" min={Math.max(1,manageStudents.length)} value={editForm.maxStudents} onChange={(e) => setEditForm((p) => ({...p,maxStudents:e.target.value}))} className="w-full rounded-xl border border-slate-200 px-4 py-3" /></div><div><label className="mb-2 block text-sm font-black text-slate-700">Status</label><select value={editForm.status} onChange={(e) => setEditForm((p) => ({...p,status:e.target.value}))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3">{["Draft","Open","Closed","Completed","Cancelled"].map((x)=><option key={x}>{x}</option>)}</select></div></div>
                <div><label className="mb-2 block text-sm font-black text-slate-700">Note for Students</label><textarea rows={5} value={editForm.studentNote} onChange={(e) => setEditForm((p) => ({...p,studentNote:e.target.value}))} className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3" /><p className="mt-2 text-xs font-semibold text-slate-500">Updated schedule and note will appear in the student's Clearance Status.</p></div>
                <div className="flex justify-end gap-2 border-t border-slate-200 pt-5"><button type="button" onClick={() => setManageBatch(null)} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black">Cancel</button><button type="submit" disabled={savingManage} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{savingManage ? <><FaSyncAlt className="animate-spin" /> Saving...</> : <><FaSave /> Save Changes</>}</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewBatch && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} className="max-h-[94vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-200 p-6"><div><p className="text-xs font-black uppercase tracking-wider text-blue-700">Batch Students</p><h2 className="mt-1 text-2xl font-black text-slate-900">{viewBatch.batch_name}</h2><p className="mt-1 text-sm text-slate-500">{formatDate(viewBatch.schedule_date)} • {formatTime(viewBatch.start_time)} - {formatTime(viewBatch.end_time)} • {viewStudents.length}/{viewBatch.max_students} assigned</p></div><button type="button" onClick={() => setViewBatch(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100"><FaTimes /></button></div>
              <div className="max-h-[65vh] overflow-y-auto p-6">{loadingView ? <div className="py-16 text-center"><FaSyncAlt className="mx-auto animate-spin text-3xl text-blue-700" /><p className="mt-3 text-sm font-bold text-slate-500">Loading students...</p></div> : viewStudents.length === 0 ? <div className="py-16 text-center text-slate-500">No students assigned.</div> : <div className="space-y-3">{viewStudents.map((item) => { const student=item.users||{}; return <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-slate-900">{student.full_name||"Student"}</p><p className="mt-1 text-sm font-semibold text-slate-500">{student.student_id||"No Student ID"} • {student.course||"N/A"}{student.year_level?` • Year ${student.year_level}`:""}{student.section?` • ${student.section}`:""}</p></div><span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{item.financial_status||"Scheduled"}</span></div>; })}</div>}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </TreasurerLayout>

  );

}



export default ScheduleBatches;