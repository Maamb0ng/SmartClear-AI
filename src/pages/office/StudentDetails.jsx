import {

  useEffect,

  useMemo,

  useState,

} from "react";



import {

  useNavigate,

  useParams,

} from "react-router-dom";



import {

  FaArrowLeft,

  FaBuilding,

  FaCalendarAlt,

  FaCheck,

  FaCheckCircle,

  FaClipboardCheck,

  FaClipboardList,

  FaExclamationTriangle,

  FaIdCard,

  FaInfoCircle,

  FaQuestionCircle,

  FaSave,

  FaTimes,

  FaUserGraduate,

  FaSpinner,

  FaRedo,

} from "react-icons/fa";



import Swal from "sweetalert2";



import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";



import {

  getOfficeStudentReview,

  saveOfficeRequirementResponses,

  saveOfficeStudentReview,

} from "../../services/officeStaffService";



function StudentDetails() {

  const navigate = useNavigate();



  const { id } = useParams();



  const [loading, setLoading] =

    useState(true);



  const [saving, setSaving] =

    useState(false);



  const [error, setError] =

    useState("");



  const [office, setOffice] =

    useState(null);



  const [student, setStudent] =

    useState(null);



  const [step, setStep] =

    useState(null);



  const [request, setRequest] =

    useState(null);



  const [batch, setBatch] =

    useState(null);



  const [

    requirements,

    setRequirements,

  ] = useState([]);



  const [remarks, setRemarks] =

    useState("");



  const [decision, setDecision] =

    useState(null);



  const [

    showConfirmation,

    setShowConfirmation,

  ] = useState(false);



  /*

  =====================================

  LOAD STUDENT REVIEW

  =====================================

  */



  const loadStudentReview =

    async () => {

      if (!id) {

        setError(

          "Clearance step ID is missing."

        );



        setLoading(false);



        return;

      }



      try {

        setLoading(true);

        setError("");



        const data =

          await getOfficeStudentReview(

            id

          );



        setOffice(

          data.office || null

        );



        setStudent(

          data.student || null

        );



        setStep(

          data.step || null

        );



        setRequest(

          data.request || null

        );



        setBatch(

          data.batch || null

        );



        const mappedRequirements = (

          data.requirements || []

        ).map(

          (requirement) => {

            const responseType =

              requirement.response_type ||

              "check";



            const savedValue =

              String(

                requirement.responseValue ||

                  ""

              ).trim();



            return {

              id:

                requirement.id,



              type:

                requirement.requirement_type ||

                "Requirement",



              title:

                requirement.title ||

                "Requirement",



              description:

                requirement.description ||

                "",



              responseType,



              isRequired:

                requirement.is_required ===

                true,



              checked:

                responseType ===

                  "check" &&

                savedValue.toLowerCase() ===

                  "verified",



              answer:

                responseType ===

                "yes-no"

                  ? savedValue

                  : "",



              responseValue:

                savedValue,

            };

          }

        );



        setRequirements(

          mappedRequirements

        );



        setRemarks(

          data.step?.remarks || ""

        );

      } catch (err) {

        console.error(

          "Failed to load office student review:",

          err

        );



        setError(

          err?.message ||

            "Unable to load the student clearance review."

        );

      } finally {

        setLoading(false);

      }

    };



  useEffect(() => {

    loadStudentReview();

  }, [id]);



  /*

  =====================================

  REQUIREMENT HANDLERS

  =====================================

  */



  const toggleRequirement = (

    requirementId

  ) => {

    setRequirements(

      (current) =>

        current.map(

          (requirement) => {

            if (

              requirement.id !==

              requirementId

            ) {

              return requirement;

            }



            return {

              ...requirement,



              checked:

                !requirement.checked,

            };

          }

        )

    );

  };



  const setQuestionAnswer = (

    requirementId,

    answer

  ) => {

    setRequirements(

      (current) =>

        current.map(

          (requirement) =>

            requirement.id ===

            requirementId

              ? {

                  ...requirement,

                  answer,

                }

              : requirement

        )

    );

  };



  /*

  =====================================

  REVIEW SUMMARY

  =====================================

  */



  const reviewSummary =

    useMemo(() => {

      const checkRequirements =

        requirements.filter(

          (item) =>

            item.responseType ===

            "check"

        );



      const questions =

        requirements.filter(

          (item) =>

            item.responseType ===

            "yes-no"

        );



      const completedChecks =

        checkRequirements.filter(

          (item) =>

            item.checked

        ).length;



      const answeredQuestions =

        questions.filter(

          (item) =>

            String(

              item.answer || ""

            ).trim()

        ).length;



      const requiredItems =

        requirements.filter(

          (item) =>

            item.isRequired

        );



      const completedRequired =

        requiredItems.filter(

          (item) => {

            if (

              item.responseType ===

              "check"

            ) {

              return item.checked;

            }



            if (

              item.responseType ===

              "yes-no"

            ) {

              return Boolean(

                String(

                  item.answer || ""

                ).trim()

              );

            }



            return false;

          }

        ).length;



      return {

        checks:

          checkRequirements.length,



        completedChecks,



        questions:

          questions.length,



        answeredQuestions,



        required:

          requiredItems.length,



        completedRequired,

      };

    }, [requirements]);



  /*

  =====================================

  FORMAT RESPONSES FOR DATABASE

  =====================================

  */



  const buildResponses = () => {

    return requirements.map(

      (requirement) => {

        let responseValue = "";



        if (

          requirement.responseType ===

          "check"

        ) {

          responseValue =

            requirement.checked

              ? "Verified"

              : "";

        }



        if (

          requirement.responseType ===

          "yes-no"

        ) {

          responseValue =

            requirement.answer || "";

        }



        return {

          requirementId:

            requirement.id,



          responseValue,

        };

      }

    );

  };



  /*

  =====================================

  VALIDATE APPROVAL

  =====================================

  */



  const validateApproval = () => {

    const missingRequired =

      requirements.filter(

        (requirement) => {

          if (

            !requirement.isRequired

          ) {

            return false;

          }



          if (

            requirement.responseType ===

            "check"

          ) {

            return !requirement.checked;

          }



          if (

            requirement.responseType ===

            "yes-no"

          ) {

            return !String(

              requirement.answer || ""

            ).trim();

          }



          return true;

        }

      );



    if (

      missingRequired.length

    ) {

      Swal.fire({

        icon: "warning",



        title:

          "Incomplete Requirements",



        text:

          "Please complete all required office requirements before approving this student.",



        confirmButtonText: "Okay",

      });



      return false;

    }



    return true;

  };



  /*

  =====================================

  REQUEST DECISION

  =====================================

  */



  const requestDecision = (

    nextDecision

  ) => {

    if (

      nextDecision ===

        "Approved" &&

      !validateApproval()

    ) {

      return;

    }



    if (

      nextDecision ===

        "Needs Action" &&

      !remarks.trim()

    ) {

      Swal.fire({

        icon: "warning",



        title:

          "Remarks Required",



        text:

          "Please add a remark explaining what the student needs to resolve.",



        confirmButtonText: "Okay",

      });



      return;

    }



    setDecision(

      nextDecision

    );



    setShowConfirmation(

      true

    );

  };



  /*

  =====================================

  CONFIRM DECISION

  =====================================

  */



  const confirmDecision =

    async () => {

      if (

        !decision ||

        !step?.id

      ) {

        return;

      }



      try {

        setSaving(true);



        await saveOfficeStudentReview({

          stepId:

            step.id,



          status:

            decision,



          remarks:

            remarks.trim(),



          responses:

            buildResponses(),

        });



        setShowConfirmation(

          false

        );



        await Swal.fire({

          icon: "success",



          title:

            decision ===

            "Approved"

              ? "Clearance Approved"

              : "Needs Action",



          text:

            decision ===

            "Approved"

              ? `${student?.name || "Student"} has been cleared by ${office?.office_name || "this office"}.`

              : `${student?.name || "Student"} has been marked as Needs Action.`,



          confirmButtonText:

            "Continue",

        });



        navigate(

          "/office/students"

        );

      } catch (err) {

        console.error(

          "Failed to save clearance decision:",

          err

        );



        await Swal.fire({

          icon: "error",



          title:

            "Unable to Save",



          text:

            err?.message ||

            "The clearance decision could not be saved.",



          confirmButtonText:

            "Okay",

        });

      } finally {

        setSaving(false);

      }

    };



  /*

  =====================================

  SAVE DRAFT

  =====================================

  */



  const saveDraft =

    async () => {

      if (!step?.id) {

        return;

      }



      try {

        setSaving(true);



        await saveOfficeRequirementResponses({

          stepId:

            step.id,



          responses:

            buildResponses(),

        });



        await Swal.fire({

          icon: "success",



          title:

            "Draft Saved",



          text:

            "Your office review progress has been saved.",



          timer: 1700,



          showConfirmButton:

            false,

        });

      } catch (err) {

        console.error(

          "Failed to save office review draft:",

          err

        );



        await Swal.fire({

          icon: "error",



          title:

            "Unable to Save Draft",



          text:

            err?.message ||

            "The review draft could not be saved.",



          confirmButtonText:

            "Okay",

        });

      } finally {

        setSaving(false);

      }

    };



  /*

  =====================================

  LOADING

  =====================================

  */



  if (loading) {

    return (

      <OfficeStaffLayout>

        <div className="mx-auto flex min-h-[65vh] w-full max-w-[1450px] items-center justify-center">

          <div className="text-center">

            <FaSpinner className="mx-auto animate-spin text-3xl text-blue-600 dark:text-blue-400" />



            <p className="mt-4 text-sm font-black text-slate-800 dark:text-slate-200">

              Loading Student Review

            </p>



            <p className="mt-1 text-xs font-medium text-slate-500">

              Retrieving the student's

              clearance information.

            </p>

          </div>

        </div>

      </OfficeStaffLayout>

    );

  }



  /*

  =====================================

  ERROR

  =====================================

  */



  if (

    error ||

    !student ||

    !office ||

    !step

  ) {

    return (

      <OfficeStaffLayout>

        <div className="mx-auto w-full max-w-[1450px]">

          <button

            type="button"

            onClick={() =>

              navigate(

                "/office/students"

              )

            }

            className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"

          >

            <FaArrowLeft />



            Back to Student Queue

          </button>



          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-500/20 dark:bg-slate-900">

            <FaExclamationTriangle className="mx-auto text-3xl text-red-500" />



            <h1 className="mt-4 text-xl font-black text-slate-950 dark:text-white">

              Unable to Load Review

            </h1>



            <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">

              {error ||

                "The requested clearance step could not be loaded."}

            </p>



            <div className="mt-5 flex flex-wrap justify-center gap-2">

              <button

                type="button"

                onClick={

                  loadStudentReview

                }

                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"

              >

                <FaRedo />



                Try Again

              </button>



              <button

                type="button"

                onClick={() =>

                  navigate(

                    "/office/students"

                  )

                }

                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"

              >

                <FaArrowLeft />



                Student Queue

              </button>

            </div>

          </div>

        </div>

      </OfficeStaffLayout>

    );

  }



  const officeName =

    office.office_name ||

    "Office";



  const officeCode =

    office.office_code ||

    "OFFICE";



  const clearanceStatus =

    step.displayStatus ||

    student.clearanceStatus ||

    "Pending";



  return (

    <OfficeStaffLayout>

      <div className="mx-auto w-full max-w-[1450px] space-y-6">

        {/* HEADER */}



        <section>

          <button

            type="button"

            onClick={() =>

              navigate(

                "/office/students"

              )

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

                    {getInitials(

                      student.name

                    )}

                  </div>



                  <div className="min-w-0">

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">

                        {officeCode}

                      </span>



                      <StatusBadge

                        status={

                          clearanceStatus

                        }

                      />

                    </div>



                    <h1 className="mt-2 truncate text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">

                      {student.name}

                    </h1>



                    <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">

                      {student.studentId} •{" "}

                      {student.course} •{" "}

                      {student.yearLevel} •

                      Block{" "}

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



                    {officeName}

                  </p>

                </div>

              </div>

            </div>

          </div>

        </section>



        {/* CONTENT */}



        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">

          <div className="space-y-6">

            {/* STUDENT INFORMATION */}



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

                  value={

                    student.studentId

                  }

                />



                <InfoItem

                  icon={FaUserGraduate}

                  label="Course"

                  value={

                    student.course

                  }

                />



                <InfoItem

                  icon={FaUserGraduate}

                  label="Year & Block"

                  value={`${student.yearLevel} • ${student.section}`}

                />



                <InfoItem

                  icon={FaCalendarAlt}

                  label="Semester"

                  value={

                    student.semester ||

                    "—"

                  }

                />



                <InfoItem

                  icon={FaCalendarAlt}

                  label="School Year"

                  value={

                    student.schoolYear ||

                    "—"

                  }

                />



                <InfoItem

                  icon={FaClipboardCheck}

                  label="Office Status"

                  value={

                    clearanceStatus

                  }

                />

              </div>

            </div>



            {/* REQUEST INFORMATION */}



            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">

                <div className="flex items-center gap-2">

                  <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />



                  <h2 className="text-base font-black text-slate-950 dark:text-white">

                    Clearance Request

                  </h2>

                </div>

              </div>



              <div className="p-5">

                <div className="grid gap-4 sm:grid-cols-2">

                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">

                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">

                      Request Status

                    </p>



                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">

                      {request?.status ||

                        "—"}

                    </p>

                  </div>



                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">

                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">

                      Requested

                    </p>



                    <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">

                      {formatDateTime(

                        request?.requested_at

                      )}

                    </p>

                  </div>

                </div>



                {batch ? (

                  <div className="mt-4 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/5">

                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />

                          <p className="text-sm font-black text-blue-900 dark:text-blue-200">

                            {batch.batchName || batch.name || "Office Clearance Batch"}

                          </p>

                          <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300">

                            {batch.status || "Open"}

                          </span>

                        </div>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">

                          <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">

                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">

                              Schedule Date

                            </p>

                            <p className="mt-1 text-xs font-black text-slate-800 dark:text-slate-200">

                              {formatScheduleDate(batch.scheduleDate || batch.date)}

                            </p>

                          </div>

                          <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">

                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">

                              Time

                            </p>

                            <p className="mt-1 text-xs font-black text-slate-800 dark:text-slate-200">

                              {formatScheduleTime(batch.startTime)} - {formatScheduleTime(batch.endTime)}

                            </p>

                          </div>

                        </div>

                        {batch.note && (

                          <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/80 p-3 dark:bg-slate-900/70">

                            <FaInfoCircle className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />

                            <div>

                              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">

                                Office Note

                              </p>

                              <p className="mt-1 text-xs font-medium leading-5 text-slate-700 dark:text-slate-300">

                                {batch.note}

                              </p>

                            </div>

                          </div>

                        )}

                      </div>

                    </div>

                  </div>

                ) : (

                  <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">

                    <div className="flex items-start gap-2">

                      <FaInfoCircle className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />

                      <p className="text-xs font-medium leading-5 text-blue-700 dark:text-blue-300">

                        Schedule and batch information will appear here once this student is assigned through the Office Staff Schedule & Batches workflow.

                      </p>

                    </div>

                  </div>

                )}

              </div>

            </div>



            {/* REQUIREMENTS */}



            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

              <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <div className="flex items-center gap-2">

                    <FaClipboardList className="text-violet-600 dark:text-violet-400" />



                    <h2 className="text-base font-black text-slate-950 dark:text-white">

                      Office Review

                      Checklist

                    </h2>

                  </div>



                  <p className="mt-1 text-xs font-medium text-slate-500">

                    Requirements and

                    questions configured by{" "}

                    {officeName}.

                  </p>

                </div>



                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">

                  {requirements.length}{" "}

                  {requirements.length === 1

                    ? "item"

                    : "items"}

                </span>

              </div>



              <div className="space-y-4 p-5">

                {requirements.length ===

                0 ? (

                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-700">

                    <FaClipboardCheck className="mx-auto mb-3 text-2xl text-slate-300" />



                    <p className="text-sm font-black text-slate-700 dark:text-slate-300">

                      No Office

                      Requirements

                    </p>



                    <p className="mt-1 text-xs font-medium text-slate-500">

                      {officeName} has no

                      active requirements or

                      questions configured.

                      The student may be

                      reviewed directly.

                    </p>

                  </div>

                ) : (

                  requirements.map(

                    (

                      requirement,

                      index

                    ) => (

                      <RequirementCard

                        key={

                          requirement.id

                        }

                        number={

                          index + 1

                        }

                        requirement={

                          requirement

                        }

                        disabled={

                          saving

                        }

                        onToggle={() =>

                          toggleRequirement(

                            requirement.id

                          )

                        }

                        onAnswer={(

                          answer

                        ) =>

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



            {/* REMARKS */}



            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">

                <h2 className="text-base font-black text-slate-950 dark:text-white">

                  Office Remarks

                </h2>



                <p className="mt-1 text-xs font-medium text-slate-500">

                  Add instructions or a

                  reason when the student

                  needs to resolve an

                  obligation.

                </p>

              </div>



              <div className="p-5">

                <textarea

                  value={remarks}

                  disabled={saving}

                  onChange={(event) =>

                    setRemarks(

                      event.target.value

                    )

                  }

                  rows="5"

                  placeholder={`Add ${officeName} clearance remarks...`}

                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"

                />



                <p className="mt-2 text-xs font-medium text-slate-400">

                  Remarks are required

                  when selecting Needs

                  Action.

                </p>

              </div>

            </div>

          </div>



          {/* RIGHT PANEL */}



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

                  label="Required completed"

                  value={`${reviewSummary.completedRequired}/${reviewSummary.required}`}

                />



                <SummaryRow

                  label="Office"

                  value={officeName}

                />

              </div>



              <div className="mt-5 rounded-2xl bg-blue-50 p-4 dark:bg-blue-500/5">

                <div className="flex items-start gap-2">

                  <FaInfoCircle className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />



                  <p className="text-xs font-medium leading-5 text-blue-700 dark:text-blue-300">

                    Approving this

                    student clears only

                    the{" "}

                    <strong>

                      {officeName}

                    </strong>{" "}

                    clearance step. Other

                    signatories remain

                    separate.

                  </p>

                </div>

              </div>



              {step.rawStatus ===

                "Rejected" && (

                <div className="mt-3 rounded-2xl bg-amber-50 p-4 dark:bg-amber-500/5">

                  <div className="flex items-start gap-2">

                    <FaExclamationTriangle className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />



                    <p className="text-xs font-medium leading-5 text-amber-700 dark:text-amber-300">

                      This student is

                      currently marked as

                      Needs Action. You

                      may review the

                      requirements again

                      and approve once the

                      issue is resolved.

                    </p>

                  </div>

                </div>

              )}

            </div>



            {/* ACTIONS */}



            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

              <h2 className="text-sm font-black text-slate-900 dark:text-white">

                Clearance Decision

              </h2>



              <p className="mt-1 text-xs font-medium leading-5 text-slate-500">

                Review the student's{" "}

                {officeName} obligations

                before signing.

              </p>



              <div className="mt-5 space-y-2.5">

                <button

                  type="button"

                  disabled={saving}

                  onClick={() =>

                    requestDecision(

                      "Approved"

                    )

                  }

                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {saving ? (

                    <FaSpinner className="animate-spin" />

                  ) : (

                    <FaCheckCircle />

                  )}



                  Sign & Approve

                </button>



                <button

                  type="button"

                  disabled={saving}

                  onClick={() =>

                    requestDecision(

                      "Needs Action"

                    )

                  }

                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"

                >

                  <FaExclamationTriangle />



                  Needs Action

                </button>



                <button

                  type="button"

                  disabled={saving}

                  onClick={saveDraft}

                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"

                >

                  {saving ? (

                    <FaSpinner className="animate-spin" />

                  ) : (

                    <FaSave />

                  )}



                  Save Review Draft

                </button>

              </div>

            </div>

          </aside>

        </section>



        {/* CONFIRMATION MODAL */}



        {showConfirmation && (

          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

            <button

              type="button"

              aria-label="Close confirmation"

              disabled={saving}

              onClick={() =>

                setShowConfirmation(

                  false

                )

              }

              className="absolute inset-0"

            />



            <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">

              <div

                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${

                  decision ===

                  "Approved"

                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"

                    : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"

                }`}

              >

                {decision ===

                "Approved" ? (

                  <FaCheckCircle />

                ) : (

                  <FaExclamationTriangle />

                )}

              </div>



              <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">

                {decision ===

                "Approved"

                  ? "Approve Clearance?"

                  : "Mark as Needs Action?"}

              </h2>



              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">

                {decision ===

                "Approved"

                  ? `This will sign and approve ${student.name}'s ${officeName} clearance step.`

                  : `${student.name} will need to resolve the ${officeName} issue before approval.`}

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

                  disabled={saving}

                  onClick={() =>

                    setShowConfirmation(

                      false

                    )

                  }

                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"

                >

                  <FaTimes />



                  Cancel

                </button>



                <button

                  type="button"

                  disabled={saving}

                  onClick={

                    confirmDecision

                  }

                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 ${

                    decision ===

                    "Approved"

                      ? "bg-emerald-600 hover:bg-emerald-700"

                      : "bg-amber-500 hover:bg-amber-600"

                  }`}

                >

                  {saving ? (

                    <FaSpinner className="animate-spin" />

                  ) : (

                    <FaCheck />

                  )}



                  {saving

                    ? "Saving..."

                    : "Confirm"}

                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </OfficeStaffLayout>

  );

}



/*

=====================================

REQUIREMENT CARD

=====================================

*/



function RequirementCard({

  number,

  requirement,

  onToggle,

  onAnswer,

  disabled,

}) {

  const isQuestion =

    requirement.responseType ===

    "yes-no";



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

              {requirement.type}{" "}

              {number}

            </span>



            <span

              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${

                requirement.isRequired

                  ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"

                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"

              }`}

            >

              {requirement.isRequired

                ? "Required"

                : "Optional"}

            </span>

          </div>



          <h3 className="mt-1 text-sm font-black text-slate-900 dark:text-white">

            {requirement.title}

          </h3>



          {requirement.description && (

            <p className="mt-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">

              {

                requirement.description

              }

            </p>

          )}



          {!isQuestion ? (

            <button

              type="button"

              disabled={disabled}

              onClick={onToggle}

              className={`mt-4 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${

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

                disabled={disabled}

                onClick={() =>

                  onAnswer("Yes")

                }

                className={`rounded-xl border px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${

                  requirement.answer ===

                  "Yes"

                    ? "border-blue-600 bg-blue-600 text-white"

                    : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"

                }`}

              >

                Yes

              </button>



              <button

                type="button"

                disabled={disabled}

                onClick={() =>

                  onAnswer("No")

                }

                className={`rounded-xl border px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${

                  requirement.answer ===

                  "No"

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



/*

=====================================

INFO ITEM

=====================================

*/



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

          {value || "—"}

        </p>

      </div>

    </div>

  );

}



/*

=====================================

SUMMARY ROW

=====================================

*/



function SummaryRow({

  label,

  value,

}) {

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



/*

=====================================

STATUS BADGE

=====================================

*/



function StatusBadge({

  status,

}) {

  const normalized =

    String(

      status || ""

    ).toLowerCase();



  let classes =

    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";



  if (

    normalized === "approved"

  ) {

    classes =

      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";

  }



  if (

    normalized ===

    "needs action"

  ) {

    classes =

      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";

  }



  if (

    normalized === "pending"

  ) {

    classes =

      "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";

  }



  return (

    <span

      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${classes}`}

    >

      {status || "Pending"}

    </span>

  );

}



/*

=====================================

FORMAT DATE

=====================================

*/



function formatDateTime(

  value

) {

  if (!value) {

    return "—";

  }



  const date =

    new Date(value);



  if (

    Number.isNaN(

      date.getTime()

    )

  ) {

    return "—";

  }



  return date.toLocaleString(

    undefined,

    {

      year: "numeric",

      month: "short",

      day: "numeric",

      hour: "numeric",

      minute: "2-digit",

    }

  );

}



/*

=====================================

FORMAT SCHEDULE DATE / TIME

=====================================

*/

function formatScheduleDate(value) {

  if (!value) {

    return "—";

  }

  const parts = String(value).split("-");

  if (parts.length !== 3) {

    return value;

  }

  const [year, month, day] = parts.map(Number);

  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {

    return value;

  }

  return date.toLocaleDateString(undefined, {

    year: "numeric",

    month: "short",

    day: "numeric",

  });

}

function formatScheduleTime(value) {

  if (!value) {

    return "—";

  }

  const [hourText, minuteText] = String(value).split(":");

  const hour = Number(hourText);

  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {

    return value;

  }

  const date = new Date();

  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString(undefined, {

    hour: "numeric",

    minute: "2-digit",

  });

}

/*

=====================================

INITIALS

=====================================

*/



function getInitials(name) {

  return String(name || "Student")

    .split(" ")

    .filter(Boolean)

    .map(

      (part) =>

        part[0]

    )

    .join("")

    .slice(0, 2)

    .toUpperCase();

}



export default StudentDetails;