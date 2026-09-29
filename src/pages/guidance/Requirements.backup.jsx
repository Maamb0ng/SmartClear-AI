import {

  useCallback,

  useEffect,

  useMemo,

  useState,

} from "react";

import { motion } from "framer-motion";

import Swal from "sweetalert2";



import GuidanceLayout from "../../layouts/GuidanceLayout";

import { supabase } from "../../services/supabase";

import {

  getGuidanceAttachments,


  formatGuidanceAttachmentSize,

  isGuidanceAttachmentImage,

  isGuidanceAttachmentPdf,

} from "../../services/guidanceService";



import {

  FaCheck,

  FaCheckCircle,

  FaClipboardCheck,

  FaClock,

  FaEye,

  FaFilter,

  FaExternalLinkAlt,

  FaFileAlt,

  FaFilePdf,

  FaImage,

  FaPaperclip,

  FaRedoAlt,

  FaSearch,

  FaSyncAlt,

  FaTimes,

  FaUserGraduate,

  FaUsers,

} from "react-icons/fa";



const GUIDANCE_OFFICE_CODE = "GUI";



const normalizeStatus = (value) =>

  String(value || "").trim().toLowerCase();



const formatDate = (value) => {

  if (!value) return "N/A";



  const date = new Date(value);



  if (Number.isNaN(date.getTime())) {

    return "N/A";

  }



  return date.toLocaleString("en-PH", {

    month: "short",

    day: "numeric",

    year: "numeric",

    hour: "numeric",

    minute: "2-digit",

  });

};



const formatScheduleDate = (value) => {

  if (!value) return "N/A";



  const date = new Date(

    String(value).length === 10

      ? `${value}T00:00:00`

      : value

  );



  if (Number.isNaN(date.getTime())) {

    return "N/A";

  }



  return date.toLocaleDateString("en-PH", {

    month: "short",

    day: "numeric",

    year: "numeric",

  });

};



const formatTime = (value) => {

  if (!value) return "";



  const parts = String(value).split(":");

  const hours = Number(parts[0]);

  const minutes = Number(parts[1]);



  if (

    Number.isNaN(hours) ||

    Number.isNaN(minutes)

  ) {

    return value;

  }



  const date = new Date();

  date.setHours(hours, minutes, 0, 0);



  return date.toLocaleTimeString("en-PH", {

    hour: "numeric",

    minute: "2-digit",

  });

};



const getStatusConfig = (status) => {

  const normalized = normalizeStatus(status);



  if (

    normalized === "for review" ||

    normalized === "answered"

  ) {

    return {

      label: "For Review",

      className:

        "border-blue-200 bg-blue-50 text-blue-700",

    };

  }



  if (normalized === "needs follow-up") {

    return {

      label: "Needs Follow-up",

      className:

        "border-red-200 bg-red-50 text-red-700",

    };

  }



  if (normalized === "approved") {

    return {

      label: "Approved",

      className:

        "border-emerald-200 bg-emerald-50 text-emerald-700",

    };

  }



  return {

    label: "Scheduled",

    className:

      "border-amber-200 bg-amber-50 text-amber-700",

  };

};



const isReviewReady = (item) => {

  const status = normalizeStatus(

    item.guidance_status

  );



  return (

    status === "for review" ||

    status === "answered"

  );

};



function Requirements() {

  const [guidanceUser, setGuidanceUser] =

    useState(null);



  const [guidanceOffice, setGuidanceOffice] =

    useState(null);



  const [queue, setQueue] = useState([]);



  const [loading, setLoading] =

    useState(true);



  const [refreshing, setRefreshing] =

    useState(false);



  const [search, setSearch] =

    useState("");



  const [statusFilter, setStatusFilter] =

    useState("All");



  const [batchFilter, setBatchFilter] =

    useState("All");



  const [selectedIds, setSelectedIds] =

    useState([]);



  const [selectedStudent, setSelectedStudent] =

    useState(null);



  const [processingId, setProcessingId] =

    useState(null);



  const [bulkProcessing, setBulkProcessing] =

    useState(false);



  const loadQueue = useCallback(

    async (silent = false) => {

      try {

        if (silent) {

          setRefreshing(true);

        } else {

          setLoading(true);

        }



        const {

          data: { user: authUser },

          error: authError,

        } = await supabase.auth.getUser();



        if (authError) throw authError;



        if (!authUser) {

          throw new Error(

            "Your session has expired. Please log in again."

          );

        }



        const {

          data: profile,

          error: profileError,

        } = await supabase

          .from("users")

          .select(`

            id,

            auth_id,

            full_name,

            employee_id,

            email,

            role,

            status

          `)

          .eq("auth_id", authUser.id)

          .single();



        if (profileError) {

          throw profileError;

        }



        if (

          profile.role !== "Approver" ||

          profile.status !== "Active"

        ) {

          throw new Error(

            "Only an active Guidance Office account can access this queue."

          );

        }



        const {

          data: assignments,

          error: assignmentError,

        } = await supabase

          .from("approver_assignments")

          .select(`

            id,

            office_id,

            is_active,

            offices (

              id,

              office_name,

              office_code,

              is_active

            )

          `)

          .eq("approver_id", profile.id)

          .eq("is_active", true)

          .not("office_id", "is", null);



        if (assignmentError) {

          throw assignmentError;

        }



        const guidanceAssignment = (

          assignments || []

        ).find((assignment) => {

          const office = assignment.offices;



          const code = String(

            office?.office_code || ""

          )

            .trim()

            .toUpperCase();



          const name = String(

            office?.office_name || ""

          )

            .trim()

            .toLowerCase();



          return (

            office?.is_active !== false &&

            (code === GUIDANCE_OFFICE_CODE ||

              name.includes("guidance"))

          );

        });



        if (!guidanceAssignment?.offices) {

          throw new Error(

            "This account is not assigned to the Guidance Office."

          );

        }



        const office =

          guidanceAssignment.offices;



        setGuidanceUser(profile);

        setGuidanceOffice(office);



        const {

          data: batches,

          error: batchError,

        } = await supabase

          .from("guidance_batches")

          .select(`

            id,

            office_id,

            batch_name,

            school_year,

            semester,

            schedule_date,

            start_time,

            end_time,

            question,

            instructions,

            max_students,

            status,

            created_at,

            updated_at

          `)

          .eq("office_id", office.id)

          .order("schedule_date", {

            ascending: false,

          })

          .order("start_time", {

            ascending: false,

          });



        if (batchError) {

          throw batchError;

        }



        const safeBatches = batches || [];



        if (safeBatches.length === 0) {

          setQueue([]);

          setSelectedIds([]);

          return;

        }



        const batchIds = safeBatches.map(

          (batch) => batch.id

        );



        const {

          data: batchStudents,

          error: batchStudentError,

        } = await supabase

          .from("guidance_batch_students")

          .select(`

            id,

            batch_id,

            clearance_step_id,

            student_id,

            response,

            response_submitted_at,

            guidance_status,

            guidance_remarks,

            reviewed_by,

            reviewed_at,

            created_at,

            updated_at

          `)

          .in("batch_id", batchIds)

          .neq("guidance_status", "Approved")

          .order("updated_at", {

            ascending: false,

          });



        if (batchStudentError) {

          throw batchStudentError;

        }



        const safeBatchStudents =

          batchStudents || [];



        if (

          safeBatchStudents.length === 0

        ) {

          setQueue([]);

          setSelectedIds([]);

          return;

        }



        const studentIds = [

          ...new Set(

            safeBatchStudents

              .map((item) => item.student_id)

              .filter(Boolean)

          ),

        ];



        let students = [];



        if (studentIds.length > 0) {

          const {

            data: studentRows,

            error: studentError,

          } = await supabase

            .from("users")

            .select(`

              id,

              student_id,

              full_name,

              email,

              course,

              year_level,

              block,

              section,

              section_id,

              semester,

              school_year

            `)

            .in("id", studentIds);



          if (studentError) {

            throw studentError;

          }



          students = studentRows || [];

        }



        const sectionIds = [

          ...new Set(

            students

              .map(

                (student) =>

                  student.section_id

              )

              .filter(Boolean)

          ),

        ];



        let sections = [];



        if (sectionIds.length > 0) {

          const {

            data: sectionRows,

            error: sectionError,

          } = await supabase

            .from("sections")

            .select(`

              id,

              course,

              year_level,

              block_code,

              school_year,

              semester

            `)

            .in("id", sectionIds);



          if (sectionError) {

            throw sectionError;

          }



          sections = sectionRows || [];

        }



        const batchMap = new Map(

          safeBatches.map((batch) => [

            batch.id,

            batch,

          ])

        );



        const studentMap = new Map(

          students.map((student) => [

            student.id,

            student,

          ])

        );



        const sectionMap = new Map(

          sections.map((section) => [

            section.id,

            section,

          ])

        );



        const enriched = safeBatchStudents

          .map((item) => {

            const student =

              studentMap.get(item.student_id) ||

              null;



            const section =

              student?.section_id

                ? sectionMap.get(

                    student.section_id

                  ) || null

                : null;



            return {

              ...item,

              batch:

                batchMap.get(item.batch_id) ||

                null,

              student,

              section,

              course:

                section?.course ||

                student?.course ||

                "N/A",

              yearLevel:

                section?.year_level ||

                student?.year_level ||

                "N/A",

              block:

                section?.block_code ||

                student?.block ||

                student?.section ||

                "N/A",

            };

          })

          .sort((a, b) => {

            const aReady = isReviewReady(a)

              ? 1

              : 0;



            const bReady = isReviewReady(b)

              ? 1

              : 0;



            if (aReady !== bReady) {

              return bReady - aReady;

            }



            return (

              new Date(

                b.response_submitted_at ||

                  b.updated_at ||

                  0

              ) -

              new Date(

                a.response_submitted_at ||

                  a.updated_at ||

                  0

              )

            );

          });



        setQueue(enriched);



        setSelectedIds((current) =>

          current.filter((id) =>

            enriched.some(

              (item) =>

                item.id === id &&

                isReviewReady(item)

            )

          )

        );

      } catch (error) {

        console.error(

          "Guidance Student Queue error:",

          error

        );



        setQueue([]);

        setSelectedIds([]);



        await Swal.fire({

          icon: "error",

          title:

            "Unable to Load Student Queue",

          text:

            error?.message ||

            "An unexpected error occurred.",

        });

      } finally {

        setLoading(false);

        setRefreshing(false);

      }

    },

    []

  );



  useEffect(() => {

    loadQueue();

  }, [loadQueue]);



  const batchOptions = useMemo(() => {

    const unique = new Map();



    queue.forEach((item) => {

      if (item.batch?.id) {

        unique.set(

          item.batch.id,

          item.batch.batch_name ||

            "Unnamed Batch"

        );

      }

    });



    return Array.from(

      unique.entries()

    ).map(([id, name]) => ({

      id,

      name,

    }));

  }, [queue]);



  const filteredQueue = useMemo(() => {

    const keyword = search

      .trim()

      .toLowerCase();



    return queue.filter((item) => {

      const normalized =

        normalizeStatus(

          item.guidance_status

        );



      if (

        statusFilter === "Scheduled" &&

        normalized !== "scheduled"

      ) {

        return false;

      }



      if (

        statusFilter === "For Review" &&

        ![

          "for review",

          "answered",

        ].includes(normalized)

      ) {

        return false;

      }



      if (

        statusFilter ===

          "Needs Follow-up" &&

        normalized !== "needs follow-up"

      ) {

        return false;

      }



      if (

        batchFilter !== "All" &&

        item.batch_id !== batchFilter

      ) {

        return false;

      }



      if (!keyword) {

        return true;

      }



      const searchable = [

        item.student?.student_id,

        item.student?.full_name,

        item.student?.email,

        item.course,

        item.yearLevel,

        item.block,

        item.batch?.batch_name,

        item.batch?.school_year,

        item.batch?.semester,

        item.guidance_status,

        item.response,

      ]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();



      return searchable.includes(keyword);

    });

  }, [

    queue,

    search,

    statusFilter,

    batchFilter,

  ]);



  const statistics = useMemo(() => {

    const scheduled = queue.filter(

      (item) =>

        normalizeStatus(

          item.guidance_status

        ) === "scheduled"

    ).length;



    const forReview = queue.filter(

      (item) => isReviewReady(item)

    ).length;



    const followUp = queue.filter(

      (item) =>

        normalizeStatus(

          item.guidance_status

        ) === "needs follow-up"

    ).length;



    return {

      total: queue.length,

      scheduled,

      forReview,

      followUp,

    };

  }, [queue]);



  const reviewReadyVisible =

    useMemo(

      () =>

        filteredQueue.filter(

          isReviewReady

        ),

      [filteredQueue]

    );



  const allVisibleSelected =

    reviewReadyVisible.length > 0 &&

    reviewReadyVisible.every((item) =>

      selectedIds.includes(item.id)

    );



  const toggleSelected = (item) => {

    if (!isReviewReady(item)) {

      return;

    }



    setSelectedIds((current) =>

      current.includes(item.id)

        ? current.filter(

            (id) => id !== item.id

          )

        : [...current, item.id]

    );

  };



  const toggleSelectAllVisible = () => {

    if (allVisibleSelected) {

      const visibleIds = new Set(

        reviewReadyVisible.map(

          (item) => item.id

        )

      );



      setSelectedIds((current) =>

        current.filter(

          (id) => !visibleIds.has(id)

        )

      );



      return;

    }



    setSelectedIds((current) => [

      ...new Set([

        ...current,

        ...reviewReadyVisible.map(

          (item) => item.id

        ),

      ]),

    ]);

  };



  const approveStudent = async (item) => {

    if (!isReviewReady(item)) {

      await Swal.fire({

        icon: "info",

        title: "Response Required",

        text:

          "This student must submit the Guidance response before approval.",

      });

      return;

    }



    const result = await Swal.fire({

      icon: "question",

      title: "Approve Student?",

      html: `

        <div style="text-align:left">

          <p style="margin:0 0 8px"><strong>${item.student?.full_name || "Student"}</strong></p>

          <p style="margin:0;color:#64748b;font-size:14px">

            This will approve the student's individual Guidance clearance step.

          </p>

        </div>

      `,

      showCancelButton: true,

      confirmButtonText: "Approve",

      cancelButtonText: "Cancel",

      confirmButtonColor: "#059669",

    });



    if (!result.isConfirmed) {

      return;

    }



    try {

      setProcessingId(item.id);



      const {

        error,

      } = await supabase.rpc(

        "review_guidance_student",

        {

          p_batch_student_id: item.id,

          p_decision: "Approved",

          p_remarks: null,

        }

      );



      if (error) throw error;



      if (

        selectedStudent?.id === item.id

      ) {

        setSelectedStudent(null);

      }



      await Swal.fire({

        icon: "success",

        title: "Student Approved",

        text:

          "The Guidance clearance was approved successfully.",

        timer: 1600,

        showConfirmButton: false,

      });



      await loadQueue(true);

    } catch (error) {

      console.error(

        "Approve Guidance student:",

        error

      );



      await Swal.fire({

        icon: "error",

        title: "Approval Failed",

        text:

          error?.message ||

          "Unable to approve this student.",

      });

    } finally {

      setProcessingId(null);

    }

  };



  const markNeedsFollowUp = async (

    item

  ) => {

    const result = await Swal.fire({

      icon: "warning",

      title: "Needs Follow-up",

      text:

        "Enter the Guidance remark that the student needs to address.",

      input: "textarea",

      inputPlaceholder:

        "Example: Please clarify your response or submit the requested information.",

      inputAttributes: {

        "aria-label":

          "Guidance follow-up remarks",

      },

      showCancelButton: true,

      confirmButtonText:

        "Send Follow-up",

      cancelButtonText: "Cancel",

      confirmButtonColor: "#dc2626",

      inputValidator: (value) => {

        if (!String(value || "").trim()) {

          return "Remarks are required for Needs Follow-up.";

        }



        return undefined;

      },

    });



    if (!result.isConfirmed) {

      return;

    }



    try {

      setProcessingId(item.id);



      const {

        error,

      } = await supabase.rpc(

        "review_guidance_student",

        {

          p_batch_student_id: item.id,

          p_decision:

            "Needs Follow-up",

          p_remarks: String(

            result.value || ""

          ).trim(),

        }

      );



      if (error) throw error;



      setSelectedStudent(null);



      await Swal.fire({

        icon: "success",

        title: "Follow-up Sent",

        text:

          "The student was marked as Needs Follow-up.",

        timer: 1700,

        showConfirmButton: false,

      });



      await loadQueue(true);

    } catch (error) {

      console.error(

        "Guidance follow-up:",

        error

      );



      await Swal.fire({

        icon: "error",

        title: "Unable to Save",

        text:

          error?.message ||

          "Unable to mark this student for follow-up.",

      });

    } finally {

      setProcessingId(null);

    }

  };



  const approveSelected = async () => {

    const validIds = selectedIds.filter(

      (id) =>

        queue.some(

          (item) =>

            item.id === id &&

            isReviewReady(item)

        )

    );



    if (validIds.length === 0) {

      await Swal.fire({

        icon: "info",

        title: "No Students Selected",

        text:

          "Select one or more students with a submitted response first.",

      });

      return;

    }



    const result = await Swal.fire({

      icon: "question",

      title: `Approve ${validIds.length} Selected?`,

      text:

        "Each selected student's Guidance clearance will be approved individually.",

      showCancelButton: true,

      confirmButtonText:

        "Approve Selected",

      cancelButtonText: "Cancel",

      confirmButtonColor: "#059669",

    });



    if (!result.isConfirmed) {

      return;

    }



    try {

      setBulkProcessing(true);



      const {

        data,

        error,

      } = await supabase.rpc(

        "approve_selected_guidance_students",

        {

          p_batch_student_ids:

            validIds,

          p_remarks: null,

        }

      );



      if (error) throw error;



      setSelectedIds([]);



      const approvedCount =

        data?.approvedCount ??

        data?.approved_count ??

        validIds.length;



      await Swal.fire({

        icon: "success",

        title: "Students Approved",

        text: `${approvedCount} student${

          approvedCount === 1 ? "" : "s"

        } approved successfully.`,

        timer: 1800,

        showConfirmButton: false,

      });



      await loadQueue(true);

    } catch (error) {

      console.error(

        "Bulk Guidance approval:",

        error

      );



      await Swal.fire({

        icon: "error",

        title: "Bulk Approval Failed",

        text:

          error?.message ||

          "Unable to approve the selected students.",

      });

    } finally {

      setBulkProcessing(false);

    }

  };



  if (loading) {

    return (

      <GuidanceLayout>

        <div className="flex min-h-[70vh] items-center justify-center">

          <div className="text-center">

            <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />



            <p className="mt-4 text-sm font-medium text-slate-600">

              Loading Student Queue...

            </p>

          </div>

        </div>

      </GuidanceLayout>

    );

  }



  return (

    <GuidanceLayout>

      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">

        <div className="mx-auto max-w-7xl">

          <motion.div

            initial={{

              opacity: 0,

              y: -10,

            }}

            animate={{

              opacity: 1,

              y: 0,

            }}

            className="mb-6"

          >

            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">

              <div>

                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-600">

                  <FaClipboardCheck />



                  <span>

                    {guidanceOffice

                      ?.office_name ||

                      "Guidance Office"}

                  </span>

                </div>



                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">

                  Student Queue

                </h1>



                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">

                  Review scheduled students and

                  submitted Guidance responses.

                  Approval remains individual even

                  when multiple students are

                  selected.

                </p>



                {guidanceUser?.full_name && (

                  <p className="mt-2 text-xs font-medium text-slate-400">

                    Signed in as{" "}

                    {guidanceUser.full_name}

                  </p>

                )}

              </div>



              <button

                type="button"

                disabled={refreshing}

                onClick={() =>

                  loadQueue(true)

                }

                className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto"

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

                  : "Refresh"}

              </button>

            </div>

          </motion.div>



          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <SummaryCard

              label="Active Queue"

              value={statistics.total}

              icon={FaUsers}

              iconClass="bg-slate-100 text-slate-600"

            />



            <SummaryCard

              label="Scheduled"

              value={statistics.scheduled}

              icon={FaClock}

              iconClass="bg-amber-50 text-amber-600"

            />



            <SummaryCard

              label="For Review"

              value={statistics.forReview}

              icon={FaClipboardCheck}

              iconClass="bg-blue-50 text-blue-600"

            />



            <SummaryCard

              label="Needs Follow-up"

              value={statistics.followUp}

              icon={FaRedoAlt}

              iconClass="bg-red-50 text-red-600"

            />

          </div>



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

              delay: 0.08,

            }}

            className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"

          >

            <div className="border-b border-slate-100 p-5 sm:p-6">

              <div className="flex flex-col gap-4">

                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">

                  <div>

                    <h2 className="font-bold text-slate-900">

                      Guidance Review Queue

                    </h2>



                    <p className="mt-1 text-sm text-slate-500">

                      Scheduled students remain

                      visible, but only submitted

                      responses can be selected for

                      approval.

                    </p>

                  </div>



                  <button

                    type="button"

                    disabled={

                      selectedIds.length === 0 ||

                      bulkProcessing

                    }

                    onClick={approveSelected}

                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"

                  >

                    <FaCheckCircle />



                    {bulkProcessing

                      ? "Approving..."

                      : `Approve Selected${

                          selectedIds.length

                            ? ` (${selectedIds.length})`

                            : ""

                        }`}

                  </button>

                </div>



                <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">

                  <div className="relative">

                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />



                    <input

                      type="text"

                      value={search}

                      onChange={(event) =>

                        setSearch(

                          event.target.value

                        )

                      }

                      placeholder="Search name, student ID, course, batch..."

                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"

                    />

                  </div>



                  <div className="relative">

                    <FaFilter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />



                    <select

                      value={statusFilter}

                      onChange={(event) =>

                        setStatusFilter(

                          event.target.value

                        )

                      }

                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 lg:w-44"

                    >

                      <option value="All">

                        All Status

                      </option>



                      <option value="Scheduled">

                        Scheduled

                      </option>



                      <option value="For Review">

                        For Review

                      </option>



                      <option value="Needs Follow-up">

                        Needs Follow-up

                      </option>

                    </select>

                  </div>



                  <select

                    value={batchFilter}

                    onChange={(event) =>

                      setBatchFilter(

                        event.target.value

                      )

                    }

                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 lg:w-52"

                  >

                    <option value="All">

                      All Batches

                    </option>



                    {batchOptions.map(

                      (batch) => (

                        <option

                          key={batch.id}

                          value={batch.id}

                        >

                          {batch.name}

                        </option>

                      )

                    )}

                  </select>

                </div>

              </div>

            </div>



            {filteredQueue.length === 0 ? (

              <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl text-slate-400">

                  <FaUserGraduate />

                </div>



                <h3 className="mt-4 font-bold text-slate-800">

                  No Students Found

                </h3>



                <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">

                  {queue.length === 0

                    ? "There are currently no active students in the Guidance review queue."

                    : "No students match the current search or filters."}

                </p>

              </div>

            ) : (

              <>

                <div className="hidden overflow-x-auto lg:block">

                  <table className="w-full">

                    <thead>

                      <tr className="border-b border-slate-100 bg-slate-50/70">

                        <th className="w-12 px-5 py-3.5 text-center">

                          <input

                            type="checkbox"

                            checked={

                              allVisibleSelected

                            }

                            disabled={

                              reviewReadyVisible.length ===

                              0

                            }

                            onChange={

                              toggleSelectAllVisible

                            }

                            className="h-4 w-4 rounded border-slate-300 accent-blue-600 disabled:opacity-40"

                            aria-label="Select all review-ready students"

                          />

                        </th>



                        <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">

                          Student

                        </th>



                        <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">

                          Course / Section

                        </th>



                        <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">

                          Batch

                        </th>



                        <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">

                          Response

                        </th>



                        <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">

                          Status

                        </th>



                        <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-slate-500">

                          Action

                        </th>

                      </tr>

                    </thead>



                    <tbody className="divide-y divide-slate-100">

                      {filteredQueue.map(

                        (item) => (

                          <QueueRow

                            key={item.id}

                            item={item}

                            selected={selectedIds.includes(

                              item.id

                            )}

                            processing={

                              processingId ===

                              item.id

                            }

                            onToggle={() =>

                              toggleSelected(

                                item

                              )

                            }

                            onView={() =>

                              setSelectedStudent(

                                item

                              )

                            }

                            onApprove={() =>

                              approveStudent(

                                item

                              )

                            }

                          />

                        )

                      )}

                    </tbody>

                  </table>

                </div>



                <div className="divide-y divide-slate-100 lg:hidden">

                  {filteredQueue.map(

                    (item) => (

                      <MobileQueueCard

                        key={item.id}

                        item={item}

                        selected={selectedIds.includes(

                          item.id

                        )}

                        processing={

                          processingId ===

                          item.id

                        }

                        onToggle={() =>

                          toggleSelected(item)

                        }

                        onView={() =>

                          setSelectedStudent(

                            item

                          )

                        }

                        onApprove={() =>

                          approveStudent(item)

                        }

                      />

                    )

                  )}

                </div>

              </>

            )}

          </motion.section>

        </div>

      </div>



      {selectedStudent && (

        <StudentReviewModal

          item={selectedStudent}

          processing={

            processingId ===

            selectedStudent.id

          }

          onClose={() =>

            setSelectedStudent(null)

          }

          onApprove={() =>

            approveStudent(

              selectedStudent

            )

          }

          onFollowUp={() =>

            markNeedsFollowUp(

              selectedStudent

            )

          }

        />

      )}

    </GuidanceLayout>

  );

}



function SummaryCard({

  label,

  value,

  icon: Icon,

  iconClass,

}) {

  return (

    <motion.div

      whileHover={{

        y: -2,

      }}

      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"

    >

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-sm font-medium text-slate-500">

            {label}

          </p>



          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">

            {value}

          </p>

        </div>



        <div

          className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${iconClass}`}

        >

          <Icon />

        </div>

      </div>
      {attachmentPreview && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) {
        setAttachmentPreview(null);
      }
    }}
  >
    <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Attachment Preview
          </p>

          <h3 className="truncate font-bold text-slate-900">
            {attachmentPreview.fileName}
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setAttachmentPreview(null)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl text-slate-600 transition hover:bg-slate-100"
        >
          ×
        </button>
      </div>

      {/* PREVIEW */}
      <div className="min-h-0 flex-1 bg-slate-100 p-4">

        {attachmentPreview.fileType?.startsWith("image/") ? (
          <div className="flex h-full items-center justify-center overflow-auto rounded-xl bg-slate-200/50">
            <img
              src={attachmentPreview.url}
              alt={attachmentPreview.fileName}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : attachmentPreview.fileType === "application/pdf" ? (
          <iframe
            src={attachmentPreview.url}
            title={attachmentPreview.fileName}
            className="h-full w-full rounded-xl border-0 bg-white"
          />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl bg-white">
            <div className="text-center">
              <FaFileAlt className="mx-auto mb-3 text-4xl text-slate-400" />

              <p className="font-semibold text-slate-800">
                Preview is not available for this file type.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER */}
      <div className="flex justify-end border-t border-slate-200 px-5 py-3">
        <button
          type="button"
          onClick={() => setAttachmentPreview(null)}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Close
        </button>
      </div>

    </div>
  </div>
)}
    </motion.div>
    

  );

}



function QueueRow({

  item,

  selected,

  processing,

  onToggle,

  onView,

  onApprove,

}) {

  const status =

    getStatusConfig(

      item.guidance_status

    );



  const ready = isReviewReady(item);



  return (

    <tr className="transition hover:bg-slate-50/80">

      <td className="px-5 py-4 text-center">

        <input

          type="checkbox"

          checked={selected}

          disabled={!ready || processing}

          onChange={onToggle}

          className="h-4 w-4 rounded border-slate-300 accent-blue-600 disabled:opacity-35"

          aria-label={`Select ${

            item.student?.full_name ||

            "student"

          }`}

        />

      </td>



      <td className="px-4 py-4">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

            <FaUserGraduate />

          </div>



          <div className="min-w-0">

            <p className="max-w-[220px] truncate text-sm font-bold text-slate-800">

              {item.student?.full_name ||

                "Unknown Student"}

            </p>



            <p className="mt-0.5 text-xs text-slate-500">

              {item.student?.student_id ||

                "No Student ID"}

            </p>

          </div>

        </div>

      </td>



      <td className="px-4 py-4">

        <p className="text-sm font-semibold text-slate-700">

          {item.course}

        </p>



        <p className="mt-0.5 text-xs text-slate-500">

          {item.yearLevel} • Block{" "}

          {item.block}

        </p>

      </td>



      <td className="px-4 py-4">

        <p className="max-w-[190px] truncate text-sm font-semibold text-slate-700">

          {item.batch?.batch_name ||

            "N/A"}

        </p>



        <p className="mt-0.5 text-xs text-slate-500">

          {formatScheduleDate(

            item.batch?.schedule_date

          )}

        </p>

      </td>



      <td className="px-4 py-4">

        {item.response ? (

          <div>

            <p className="max-w-[220px] truncate text-sm text-slate-700">

              {item.response}

            </p>



            <p className="mt-0.5 text-xs text-slate-400">

              {formatDate(

                item.response_submitted_at

              )}

            </p>

          </div>

        ) : (

          <span className="text-xs font-medium text-slate-400">

            No response yet

          </span>

        )}

      </td>



      <td className="px-4 py-4">

        <span

          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${status.className}`}

        >

          {status.label}

        </span>

      </td>



      <td className="px-5 py-4">

        <div className="flex justify-end gap-2">

          <button

            type="button"

            onClick={onView}

            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-600"

          >

            <FaEye />

            Review

          </button>



          <button

            type="button"

            disabled={

              !ready || processing

            }

            onClick={onApprove}

            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"

          >

            <FaCheck />

            {processing

              ? "Saving..."

              : "Approve"}

          </button>

        </div>

      </td>

    </tr>

  );

}



function MobileQueueCard({

  item,

  selected,

  processing,

  onToggle,

  onView,

  onApprove,

}) {

  const status =

    getStatusConfig(

      item.guidance_status

    );



  const ready = isReviewReady(item);



  return (

    <div className="p-5">

      <div className="flex items-start gap-3">

        <input

          type="checkbox"

          checked={selected}

          disabled={!ready || processing}

          onChange={onToggle}

          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600 disabled:opacity-35"

        />



        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

          <FaUserGraduate />

        </div>



        <div className="min-w-0 flex-1">

          <p className="truncate text-sm font-bold text-slate-800">

            {item.student?.full_name ||

              "Unknown Student"}

          </p>



          <p className="mt-0.5 text-xs text-slate-500">

            {item.student?.student_id ||

              "No Student ID"}

          </p>

        </div>



        <span

          className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${status.className}`}

        >

          {status.label}

        </span>

      </div>



      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">

        <InfoItem

          label="Course"

          value={item.course}

        />



        <InfoItem

          label="Section"

          value={`${item.yearLevel} • ${item.block}`}

        />



        <InfoItem

          label="Batch"

          value={

            item.batch?.batch_name ||

            "N/A"

          }

        />



        <InfoItem

          label="Schedule"

          value={formatScheduleDate(

            item.batch?.schedule_date

          )}

        />

      </div>



      <div className="mt-3 rounded-xl border border-slate-100 p-3">

        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">

          Student Response

        </p>



        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">

          {item.response ||

            "No response submitted yet."}

        </p>

      </div>



      <div className="mt-4 flex gap-2">

        <button

          type="button"

          onClick={onView}

          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-600"

        >

          <FaEye />

          Review

        </button>



        <button

          type="button"

          disabled={!ready || processing}

          onClick={onApprove}

          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"

        >

          <FaCheck />

          {processing

            ? "Saving..."

            : "Approve"}

        </button>

      </div>

    </div>

  );

}



function StudentReviewModal({

  item,

  processing,

  onClose,

  onApprove,

  onFollowUp,

}) {

  const status = getStatusConfig(item.guidance_status);

  const ready = isReviewReady(item);



  const [attachments, setAttachments] = useState([]);
  const safeAttachments = Array.isArray(attachments) ? attachments : [];

  const [loadingAttachments, setLoadingAttachments] = useState(true);

  const [openingAttachmentId, setOpeningAttachmentId] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);


  useEffect(() => {

    let active = true;



    const loadAttachments = async () => {

      try {

        setLoadingAttachments(true);

        const result = await getGuidanceAttachments(item.id);

        const rows = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result?.attachments)
              ? result.attachments
              : [];

        if (active) setAttachments(rows);

      } catch (error) {

        console.error("Load Guidance attachments:", error);

        if (active) setAttachments([]);

      } finally {

        if (active) setLoadingAttachments(false);

      }

    };



    loadAttachments();



    return () => {

      active = false;

    };

  }, [item.id]);



const openAttachment = async (attachment) => {
  try {
    setOpeningAttachmentId(attachment.id);

    const filePath = String(attachment?.file_path || "").trim();

    if (!filePath) {
      throw new Error("This attachment does not have a valid storage path.");
    }

    const { data, error } = await supabase.storage
      .from("guidance-attachments")
      .createSignedUrl(filePath, 600);

    if (error) throw error;

    const signedUrl = data?.signedUrl;

    if (!signedUrl) {
      throw new Error("Unable to create secure attachment link.");
    }

    setAttachmentPreview({
      id: attachment.id,
      fileName: attachment.file_name || "Attachment",
      fileType: attachment.file_type || "",
      url: signedUrl,
    });
  } catch (error) {
    console.error("Open Guidance attachment:", error);

    await Swal.fire({
      icon: "error",
      title: "Unable to Open Attachment",
      text:
        error?.message ||
        "The attachment could not be opened. Please try again.",
    });
  } finally {
    setOpeningAttachmentId(null);
  }
};



  return (

    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">

      <motion.div

        initial={{ opacity: 0, scale: 0.98, y: 14 }}

        animate={{ opacity: 1, scale: 1, y: 0 }}

        className="max-h-[100dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl"

      >

        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">

          <div className="min-w-0">

            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">

              Guidance Review

            </p>

            <h2 className="mt-1 truncate text-lg font-bold text-slate-900">

              {item.student?.full_name || "Student"}

            </h2>

          </div>



          <button

            type="button"

            onClick={onClose}

            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"

            aria-label="Close"

          >

            <FaTimes />

          </button>

        </div>



        <div className="space-y-5 p-5 sm:p-6">

          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center">

            <div>

              <p className="text-sm font-bold text-slate-800">

                {item.student?.student_id || "No Student ID"}

              </p>

              <p className="mt-1 text-xs text-slate-500">

                {item.course} • {item.yearLevel} • Block {item.block}

              </p>

              <p className="mt-1 text-xs text-slate-500">

                {item.student?.email || "No email"}

              </p>

            </div>



            <span className={`self-start rounded-full border px-3 py-1.5 text-xs font-bold ${status.className}`}>

              {status.label}

            </span>

          </div>



          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            <DetailCard label="Batch" value={item.batch?.batch_name || "N/A"} />

            <DetailCard

              label="Schedule"

              value={`${formatScheduleDate(item.batch?.schedule_date)}${

                item.batch?.start_time ? ` • ${formatTime(item.batch.start_time)}` : ""

              }${item.batch?.end_time ? ` – ${formatTime(item.batch.end_time)}` : ""}`}

            />

            <DetailCard label="Semester" value={item.batch?.semester || "N/A"} />

            <DetailCard label="School Year" value={item.batch?.school_year || "N/A"} />

          </div>



          <div className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/60">

            <div className="border-b border-blue-100 px-4 py-3">

              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">

                Question / Requirement

              </p>

            </div>

            <div className="p-4">

              <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">

                {item.batch?.question || "No question provided."}

              </p>

              {item.batch?.instructions && (

                <div className="mt-4 rounded-xl bg-white/70 p-3">

                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">

                    Instructions

                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">

                    {item.batch.instructions}

                  </p>

                </div>

              )}

            </div>

          </div>



          <div className="rounded-2xl border border-slate-200 bg-white p-4">

            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">

              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">

                Student Response

              </p>

              {item.response_submitted_at && (

                <p className="text-xs text-slate-400">

                  Submitted {formatDate(item.response_submitted_at)}

                </p>

              )}

            </div>



            {item.response ? (

              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">

                {item.response}

              </p>

            ) : (

              <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">

                The student has not submitted a response yet.

              </div>

            )}

          </div>



          <div className="rounded-2xl border border-slate-200 bg-white p-4">

            <div className="flex items-center justify-between gap-3">

              <div className="flex items-center gap-2">

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">

                  <FaPaperclip />

                </div>

                <div>

                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">

                    Supporting Attachments

                  </p>

                  <p className="mt-0.5 text-xs text-slate-400">

                    Private files submitted by the student

                  </p>

                </div>

              </div>

              {!loadingAttachments && (

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">

                  {safeAttachments.length}

                </span>

              )}

            </div>



            {loadingAttachments ? (

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">

                <FaSyncAlt className="animate-spin" />

                Loading attachments...

              </div>

            ) : safeAttachments.length === 0 ? (

              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">

                <FaFileAlt className="mx-auto text-xl text-slate-300" />

                <p className="mt-2 text-sm font-semibold text-slate-500">

                  No attachment submitted

                </p>

                <p className="mt-1 text-xs text-slate-400">

                  The student submitted a text response only.

                </p>

              </div>

            ) : (

              <div className="mt-4 space-y-2">

                {safeAttachments.map((attachment) => {

                  const isPdf = isGuidanceAttachmentPdf(attachment);

                  const isImage = isGuidanceAttachmentImage(attachment);

                  const FileIcon = isPdf ? FaFilePdf : isImage ? FaImage : FaFileAlt;

                  const opening = openingAttachmentId === attachment.id;



                  return (

                    <div

                      key={attachment.id}

                      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center"

                    >

                      <div className="flex min-w-0 flex-1 items-center gap-3">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg text-indigo-600 shadow-sm">

                          <FileIcon />

                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-sm font-bold text-slate-700" title={attachment.file_name}>

                            {attachment.file_name || "Attachment"}

                          </p>

                          <p className="mt-0.5 text-xs text-slate-400">

                            {isPdf ? "PDF" : isImage ? "Image" : "File"} • {formatGuidanceAttachmentSize(attachment.file_size)}

                          </p>

                        </div>

                      </div>



                      <button

                        type="button"

                        onClick={() => openAttachment(attachment)}

                        disabled={opening}

                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"

                      >

                        {opening ? <FaSyncAlt className="animate-spin" /> : <FaExternalLinkAlt />}

                        {opening ? "Opening..." : "View File"}

                      </button>

                    </div>

                  );

                })}

              </div>

            )}

          </div>



          {item.guidance_remarks && (

            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">

              <p className="text-xs font-bold uppercase tracking-wide text-red-600">

                Previous Guidance Remark

              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">

                {item.guidance_remarks}

              </p>

            </div>

          )}

        </div>



        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:flex-row sm:justify-end sm:px-6">

          <button

            type="button"

            onClick={onClose}

            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"

          >

            Close

          </button>

          <button

            type="button"

            disabled={!ready || processing}

            onClick={onFollowUp}

            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"

          >

            <FaRedoAlt />

            Needs Follow-up

          </button>

          <button

            type="button"

            disabled={!ready || processing}

            onClick={onApprove}

            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"

          >

            <FaCheckCircle />

            {processing ? "Saving..." : "Approve Student"}

          </button>

        </div>

      </motion.div>

    </div>

  );

}



function DetailCard({

  label,

  value,

}) {

  return (

    <div className="rounded-xl border border-slate-200 p-4">

      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">

        {label}

      </p>



      <p className="mt-1 text-sm font-semibold text-slate-700">

        {value}

      </p>

    </div>

  );

}



function InfoItem({

  label,

  value,

}) {

  return (

    <div>

      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">

        {label}

      </p>



      <p className="mt-1 truncate text-xs font-semibold text-slate-700">

        {value}

      </p>

    </div>

  );

}



export default Requirements;
