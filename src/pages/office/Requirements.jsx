import {

  useEffect,

  useMemo,

  useState,

} from "react";



import {

  FaCheck,

  FaClipboardList,

  FaEdit,

  FaExclamationCircle,

  FaExclamationTriangle,

  FaPlus,

  FaQuestionCircle,

  FaRedo,

  FaSearch,

  FaSpinner,

  FaTimes,

  FaToggleOff,

  FaToggleOn,

  FaTrash,

} from "react-icons/fa";



import Swal from "sweetalert2";



import OfficeStaffLayout from "../../layouts/OfficeStaffLayout";
import { supabase } from "../../services/supabase";
import ApproverLayout from "../../layouts/ApproverLayout";



import {

  createOfficeRequirement,

  deleteOfficeRequirement,

  getOfficeRequirements,

  getOfficeStaffContext,

  setOfficeRequirementStatus,

  updateOfficeRequirement,

} from "../../services/officeStaffService";



function Requirements() {

  /*

  =========================================================

  STATE

  =========================================================

  */



  const emptyForm = {

    type: "Requirement",

    responseType: "check",

    title: "",

    description: "",

    active: true,

    required: false,

  };



  const [submissionSettings, setSubmissionSettings] = useState({
    approval_mode: "direct", submission_enabled: false, opens_at: "", closes_at: "",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  const saveSubmissionSettings = async () => {
    if (!office?.id || settingsSaving) return;
    const { approval_mode, submission_enabled, opens_at, closes_at } = submissionSettings;
    if (approval_mode === "requirements" && submission_enabled && stats.active === 0) {
      await Swal.fire("No active items", "Create and enable at least one requirement or question before opening submissions.", "warning");
      return;
    }
    if (opens_at && closes_at && new Date(closes_at) <= new Date(opens_at)) {
      await Swal.fire("Invalid schedule", "Closing time must be later than opening time.", "warning");
      return;
    }
    setSettingsSaving(true);
    setSettingsError("");
    const payload = {
      office_id: office.id,
      approval_mode,
      submission_enabled: approval_mode === "requirements" && submission_enabled,
      opens_at: opens_at ? new Date(opens_at).toISOString() : null,
      closes_at: closes_at ? new Date(closes_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error: saveError } = await supabase.from("office_submission_settings")
      .update(payload).eq("office_id", office.id).select("office_id").single();
    setSettingsSaving(false);
    if (saveError) {
      setSettingsError(saveError.message);
      await Swal.fire("Unable to save", saveError.message, "error");
      return;
    }
    await Swal.fire("Settings saved", "Office approval settings were updated. Student submissions remain protected until server-side validation is deployed.", "success");
  };


  const [office, setOffice] =

    useState(null);

  const [
    portalType,
    setPortalType,
  ] = useState("Office");



  const [

    requirements,

    setRequirements,

  ] = useState([]);



  const [loading, setLoading] =

    useState(true);



  const [saving, setSaving] =

    useState(false);



  const [error, setError] =

    useState("");



  const [search, setSearch] =

    useState("");



  const [

    typeFilter,

    setTypeFilter,

  ] = useState("All");



  const [

    showForm,

    setShowForm,

  ] = useState(false);



  const [

    editingItem,

    setEditingItem,

  ] = useState(null);



  const [

    formData,

    setFormData,

  ] = useState(emptyForm);



  const [

    deleteItem,

    setDeleteItem,

  ] = useState(null);



  /*

  =========================================================

  LOAD REQUIREMENTS

  =========================================================

  */



  const loadRequirements =

    async () => {

      try {

        setLoading(true);

        setError("");



        const context =

          await getOfficeStaffContext();



        const profileType =
   String(
     context?.profile?.approver_type ||
       ""
   )
     .trim()
     .toLowerCase();

 setPortalType(
   profileType === "faculty"
     ? "Faculty"
     : "Office"
 );

 const primaryOffice =

          context.primaryOffice;



        if (!primaryOffice) {

          setOffice(null);

          setRequirements([]);



          throw new Error(

            "No active office responsibility was found for this account."

          );

        }



        setOffice({

          id:

            primaryOffice.id,



          name:

            primaryOffice.office_name ||

            "Office",



          code:

            primaryOffice.office_code ||

            "OFFICE",

        });



        const { data: settingRow, error: settingError } = await supabase
          .from("office_submission_settings")
          .select("approval_mode, submission_enabled, opens_at, closes_at")
          .eq("office_id", primaryOffice.id).maybeSingle();
        if (settingError) {
          setSettingsError(settingError.message);
        } else {
          setSettingsError("");
          setSubmissionSettings({
            approval_mode: settingRow?.approval_mode || "direct",
            submission_enabled: settingRow?.submission_enabled === true,
            opens_at: settingRow?.opens_at ? toLocalInput(settingRow.opens_at) : "",
            closes_at: settingRow?.closes_at ? toLocalInput(settingRow.closes_at) : "",
          });
        }


        const data =

          await getOfficeRequirements(

            primaryOffice.id,

            {

              includeInactive: true,

            }

          );



        const mapped = (

  data?.requirements || []

).map(

          (item) => ({

            id:

              item.id,



            officeId:

              item.office_id,



            type:

              item.requirement_type ||

              "Requirement",



            title:

              item.title ||

              "",



            description:

              item.description ||

              "",



            responseType:

              item.response_type ||

              (item.requirement_type ===

              "Question"

                ? "yes-no"

                : "check"),



            required:

              item.is_required ===

              true,



            active:

              item.is_active !==

              false,



            createdAt:

              item.created_at,



            updatedAt:

              item.updated_at,

          })

        );



        setRequirements(

          mapped

        );

      } catch (err) {

        console.error(

          "Failed to load office requirements:",

          err

        );



        setError(

          err?.message ||

            "Unable to load office requirements."

        );

      } finally {

        setLoading(false);

      }

    };



  useEffect(() => {

    loadRequirements();

  }, []);



  /*

  =========================================================

  FILTERS

  =========================================================

  */



  const filteredRequirements =

    useMemo(() => {

      const query =

        search

          .trim()

          .toLowerCase();



      return requirements.filter(

        (item) => {

          const title =

            String(

              item.title || ""

            ).toLowerCase();



          const description =

            String(

              item.description ||

                ""

            ).toLowerCase();



          const matchesSearch =

            !query ||

            title.includes(

              query

            ) ||

            description.includes(

              query

            );



          const matchesType =

            typeFilter ===

              "All" ||

            item.type ===

              typeFilter;



          return (

            matchesSearch &&

            matchesType

          );

        }

      );

    }, [

      requirements,

      search,

      typeFilter,

    ]);



  /*

  =========================================================

  STATS

  =========================================================

  */



  const stats = useMemo(

    () => ({

      total:

        requirements.length,



      requirements:

        requirements.filter(

          (item) =>

            item.type ===

            "Requirement"

        ).length,



      questions:

        requirements.filter(

          (item) =>

            item.type ===

            "Question"

        ).length,



      active:

        requirements.filter(

          (item) =>

            item.active

        ).length,

    }),

    [requirements]

  );



  /*

  =========================================================

  FORM

  =========================================================

  */



  const openCreateForm = () => {

    setEditingItem(null);



    setFormData({

      ...emptyForm,

    });



    setShowForm(true);

  };



  const openEditForm = (

    item

  ) => {

    setEditingItem(item);



    setFormData({

      type:

        item.type,



      title:

        item.title,



      description:

        item.description ||

        "",



      active:

        item.active,



      required:

        item.required,

    });



    setShowForm(true);

  };



  const closeForm = () => {

    if (saving) {

      return;

    }



    setShowForm(false);



    setEditingItem(null);



    setFormData({

      ...emptyForm,

    });

  };



  const handleChange = (

    event

  ) => {

    const {

      name,

      value,

    } = event.target;



    setFormData(

      (current) => ({

        ...current,

        [name]: value,

      })

    );

  };



  /*

  =========================================================

  CREATE / UPDATE

  =========================================================

  */



  const handleSubmit =

    async (event) => {

      event.preventDefault();



      if (

        !formData.title.trim()

      ) {

        await Swal.fire({

          icon: "warning",



          title:

            "Title Required",



          text:

            "Please enter a requirement or question.",



          confirmButtonText:

            "Okay",

        });



        return;

      }



      if (!office?.id) {

        await Swal.fire({

          icon: "error",



          title:

            "Office Not Found",



          text:

            "No active office assignment was found.",



          confirmButtonText:

            "Okay",

        });



        return;

      }



      try {

        setSaving(true);



        if (editingItem) {

          await updateOfficeRequirement({

            requirementId:

              editingItem.id,



            requirementType:

              formData.type,

            responseType: formData.type === "Question" ? formData.responseType : "check",



            title:

              formData.title,



            description:

              formData.description,



            isRequired:

              formData.required,



            isActive:

              formData.active,

          });

        } else {

          await createOfficeRequirement({

            officeId:

              office.id,



            requirementType:

              formData.type,

            responseType: formData.type === "Question" ? formData.responseType : "check",



            title:

              formData.title,



            description:

              formData.description,



            isRequired:

              formData.required,



            isActive:

              formData.active,

          });

        }



        setShowForm(false);



        setEditingItem(

          null

        );



        setFormData({

          ...emptyForm,

        });



        await loadRequirements();



        await Swal.fire({

          icon: "success",



          title:

            editingItem

              ? "Item Updated"

              : "Item Added",



          text:

            editingItem

              ? "The office clearance item has been updated."

              : "The office clearance item has been created.",



          timer: 1600,



          showConfirmButton:

            false,

        });

      } catch (err) {

        console.error(

          "Failed to save office requirement:",

          err

        );



        await Swal.fire({

          icon: "error",



          title:

            "Unable to Save",



          text:

            err?.message ||

            "The office requirement could not be saved.",



          confirmButtonText:

            "Okay",

        });

      } finally {

        setSaving(false);

      }

    };



  /*

  =========================================================

  ACTIVE / INACTIVE

  =========================================================

  */



  const toggleStatus =

    async (item) => {

      if (saving) {

        return;

      }



      const nextStatus =

        !item.active;



      try {

        setSaving(true);



        await setOfficeRequirementStatus({

          requirementId:

            item.id,



          isActive:

            nextStatus,

        });



        setRequirements(

          (current) =>

            current.map(

              (currentItem) =>

                currentItem.id ===

                item.id

                  ? {

                      ...currentItem,

                      active:

                        nextStatus,

                    }

                  : currentItem

            )

        );



        await Swal.fire({

          icon: "success",



          title:

            nextStatus

              ? "Item Enabled"

              : "Item Disabled",



          text:

            nextStatus

              ? "This item will now appear in the office review checklist."

              : "This item will no longer appear in new office review checklists.",



          timer: 1500,



          showConfirmButton:

            false,

        });

      } catch (err) {

        console.error(

          "Failed to change requirement status:",

          err

        );



        await Swal.fire({

          icon: "error",



          title:

            "Unable to Update",



          text:

            err?.message ||

            "The item status could not be changed.",



          confirmButtonText:

            "Okay",

        });

      } finally {

        setSaving(false);

      }

    };



  /*

  =========================================================

  DELETE

  =========================================================

  */



  const confirmDelete =

    async () => {

      if (

        !deleteItem ||

        saving

      ) {

        return;

      }



      const item =

        deleteItem;



      try {

        setSaving(true);



        await deleteOfficeRequirement(

          item.id

        );



        setRequirements(

          (current) =>

            current.filter(

              (requirement) =>

                requirement.id !==

                item.id

            )

        );



        setDeleteItem(null);



        await Swal.fire({

          icon: "success",



          title:

            "Item Deleted",



          text:

            "The office clearance item has been deleted.",



          timer: 1500,



          showConfirmButton:

            false,

        });

      } catch (err) {

        console.error(

          "Failed to delete office requirement:",

          err

        );



        await Swal.fire({

          icon: "error",



          title:

            "Unable to Delete",



          text:

            err?.message ||

            "The office requirement could not be deleted.",



          confirmButtonText:

            "Okay",

        });

      } finally {

        setSaving(false);

      }

    };



    const PortalLayout =
    portalType === "Faculty"
      ? ApproverLayout
      : OfficeStaffLayout;

/*

  =========================================================

  LOADING

  =========================================================

  */



  if (loading) {

    return (

      <PortalLayout>

        <div className="mx-auto flex min-h-[65vh] w-full max-w-[1500px] items-center justify-center">

          <div className="text-center">

            <FaSpinner className="mx-auto animate-spin text-3xl text-blue-600 dark:text-blue-400" />



            <p className="mt-4 text-sm font-black text-slate-800 dark:text-slate-200">

              Loading Office

              Requirements

            </p>



            <p className="mt-1 text-xs font-medium text-slate-500">

              Retrieving your office

              clearance configuration.

            </p>

          </div>

        </div>

      </PortalLayout>

    );

  }



  /*

  =========================================================

  ERROR

  =========================================================

  */



  if (error && !office) {

    return (

      <PortalLayout>

        <div className="mx-auto w-full max-w-[1500px]">

          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-500/20 dark:bg-slate-900">

            <FaExclamationTriangle className="mx-auto text-3xl text-red-500" />



            <h1 className="mt-4 text-xl font-black text-slate-950 dark:text-white">

              Unable to Load

              Requirements

            </h1>



            <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">

              {error}

            </p>



            <button

              type="button"

              onClick={

                loadRequirements

              }

              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"

            >

              <FaRedo />



              Try Again

            </button>

          </div>

        </div>

      </PortalLayout>

    );

  }



  /*

  =========================================================

  UI

  =========================================================

  */



  return (
    <PortalLayout>
      <div className="mx-auto w-full max-w-6xl space-y-4 pb-8 pt-4">
        {/* COMPACT RESPONSIBILITY HEADER */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-lg text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400">
                <FaClipboardList />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400">
                    {office?.code || "OFFICE"}
                  </span>
                  <span className="text-xs font-bold text-slate-400">Faculty Responsibility</span>
                </div>
                <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                  {office?.name || "Office"} — Requirements & Questions
                </h1>
                <p className="mt-1 max-w-2xl text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
                  Add optional checks or questions for this responsibility. If none are active, you can review students directly.
                </p>
              </div>
            </div>
            <button type="button" disabled={saving} onClick={openCreateForm} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60">
              <FaPlus /> Add Item
            </button>
          </div>
          <div className="grid grid-cols-2 border-t border-slate-100 sm:grid-cols-4 dark:border-slate-800">
            {[
              ["Total", stats.total],
              ["Requirements", stats.requirements],
              ["Questions", stats.questions],
              ["Active", stats.active],
            ].map(([label, value]) => (
              <div key={label} className="border-slate-100 px-4 py-3 sm:border-l sm:first:border-l-0 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
                <p className="mt-0.5 text-lg font-black text-slate-900 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/5">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-red-900 dark:text-red-300">Some information could not be loaded</p>
                <p className="mt-1 text-xs font-medium leading-5 text-red-700 dark:text-red-300/80">{error}</p>
              </div>
              <button type="button" onClick={loadRequirements} className="shrink-0 rounded-lg p-2 text-red-600 transition hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/10"><FaRedo /></button>
            </div>
          </section>
        )}

        {/* OFFICE APPROVAL AND SUBMISSION SETTINGS */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white">Office Approval & Submission Settings</h2>
            <p className="mt-1 text-xs text-slate-500">Choose how this office processes clearance. Only requirements-based mode uses student submissions.</p>
          </div>
          {settingsError && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{settingsError}</p>}
          <label className={labelClass}>Approval Mode</label>
          <select value={submissionSettings.approval_mode} disabled={settingsSaving}
            onChange={(e) => setSubmissionSettings(v => ({...v, approval_mode:e.target.value, submission_enabled: e.target.value === "requirements" ? v.submission_enabled : false}))}
            className={inputClass}>
            <option value="direct">Direct Approval — office signs without student submission</option>
            <option value="manual">Manual Verification — office verifies before signing</option>
            <option value="requirements">Requirements-Based — students submit when open</option>
          </select>
          {submissionSettings.approval_mode === "requirements" && (
            <div className="mt-4 space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <label className="flex items-center gap-3 text-sm font-bold text-slate-800 dark:text-slate-200">
                <input type="checkbox" checked={submissionSettings.submission_enabled} disabled={settingsSaving}
                  onChange={e => setSubmissionSettings(v => ({...v, submission_enabled:e.target.checked}))}/>
                Open student submission (subject to schedule)
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className={labelClass}>Opens At (optional)</label>
                  <input type="datetime-local" className={inputClass} value={submissionSettings.opens_at}
                    onChange={e => setSubmissionSettings(v => ({...v, opens_at:e.target.value}))}/></div>
                <div><label className={labelClass}>Closes At (optional)</label>
                  <input type="datetime-local" className={inputClass} value={submissionSettings.closes_at}
                    onChange={e => setSubmissionSettings(v => ({...v, closes_at:e.target.value}))}/></div>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400">Opening submissions here saves the office preference. Student-side submission must remain locked until secure server-side schedule checks are implemented.</p>
            </div>
          )}
          <button type="button" disabled={settingsSaving || saving} onClick={saveSubmissionSettings}
            className="mt-4 rounded-xl bg-cyan-700 px-5 py-2.5 text-sm font-black text-white hover:bg-cyan-800 disabled:opacity-60">
            {settingsSaving ? "Saving..." : "Save Office Settings"}
          </button>
        </section>


        {/* FILTERS */}



        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex flex-col gap-3 md:flex-row">

            <div className="relative flex-1">

              <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400" />



              <input

                type="text"

                value={search}

                onChange={(

                  event

                ) =>

                  setSearch(

                    event.target.value

                  )

                }

                placeholder="Search requirements or questions..."

                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"

              />

            </div>



            <select

              value={typeFilter}

              onChange={(

                event

              ) =>

                setTypeFilter(

                  event.target.value

                )

              }

              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"

            >

              <option value="All">

                All Types

              </option>



              <option value="Requirement">

                Requirements

              </option>



              <option value="Question">

                Questions

              </option>

            </select>

          </div>

        </section>



        {/* LIST */}



        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">

            <div>

              <h2 className="text-sm font-black text-slate-900 dark:text-white">

                Configured Items

              </h2>



              <p className="mt-0.5 text-xs font-medium text-slate-500">

                {

                  filteredRequirements.length

                }{" "}

                item

                {filteredRequirements.length !==

                1

                  ? "s"

                  : ""}

              </p>

            </div>



            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">

              <FaClipboardList />

            </div>

          </div>



          {filteredRequirements.length ===

          0 ? (

            <div className="px-5 py-10 text-center">

              <FaClipboardList className="mx-auto mb-4 text-3xl text-slate-300 dark:text-slate-600" />



              <h3 className="text-base font-black text-slate-800 dark:text-slate-200">

                {requirements.length ===

                0

                  ? "No requirements configured"

                  : "No matching items"}

              </h3>



              <p className="mx-auto mt-1 max-w-md text-sm font-medium leading-6 text-slate-500">

                {requirements.length ===

                0

                  ? "Your office can still review students directly, or you can create a requirement or question."

                  : "Try changing your search or filter."}

              </p>



              {requirements.length ===

                0 && (

                <button

                  type="button"

                  onClick={

                    openCreateForm

                  }

                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"

                >

                  <FaPlus />



                  Add First Item

                </button>

              )}

            </div>

          ) : (

            <div className="divide-y divide-slate-100 dark:divide-slate-800">

              {filteredRequirements.map(

                (item) => {

                  const isQuestion =

                    item.type ===

                    "Question";



                  return (

                    <article

                      key={

                        item.id

                      }

                      className={`p-5 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/30 ${

                        !item.active

                          ? "opacity-60"

                          : ""

                      }`}

                    >

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">

                        <div

                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${

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

                            <span

                              className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${

                                isQuestion

                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"

                                  : "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400"

                              }`}

                            >

                              {

                                item.type

                              }

                            </span>



                            <span

                              className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${

                                item.active

                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"

                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"

                              }`}

                            >

                              {item.active

                                ? "Active"

                                : "Inactive"}

                            </span>



                            <span

                              className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${

                                item.required

                                  ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"

                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"

                              }`}

                            >

                              {item.required

                                ? "Required"

                                : "Optional"}

                            </span>

                          </div>



                          <h3 className="mt-2 text-sm font-black text-slate-900 dark:text-white">

                            {

                              item.title

                            }

                          </h3>



                          {item.description && (

                            <p className="mt-1 max-w-3xl text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">

                              {

                                item.description

                              }

                            </p>

                          )}



                          <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">

                            {isQuestion

                              ? `Response: ${item.responseType === "text" ? "Text Input" : item.responseType === "check" || item.responseType === "checkbox" ? "Checkbox" : "Yes / No"}`

                              : "Response: Verification Check"}

                          </p>

                        </div>



                        <div className="flex flex-wrap gap-2">

                          <button

                            type="button"

                            disabled={

                              saving

                            }

                            onClick={() =>

                              toggleStatus(

                                item

                              )

                            }

                            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${

                              item.active

                                ? "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/10"

                                : "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/10"

                            }`}

                          >

                            {item.active ? (

                              <FaToggleOff />

                            ) : (

                              <FaToggleOn />

                            )}



                            {item.active

                              ? "Disable"

                              : "Enable"}

                          </button>



                          <button

                            type="button"

                            disabled={

                              saving

                            }

                            onClick={() =>

                              openEditForm(

                                item

                              )

                            }

                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"

                          >

                            <FaEdit />



                            Edit

                          </button>



                          <button

                            type="button"

                            disabled={

                              saving

                            }

                            onClick={() =>

                              setDeleteItem(

                                item

                              )

                            }

                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:hover:border-red-500/20 dark:hover:bg-red-500/10 dark:hover:text-red-400"

                          >

                            <FaTrash />

                          </button>

                        </div>

                      </div>

                    </article>

                  );

                }

              )}

            </div>

          )}

        </section>



        {/* CREATE / EDIT MODAL */}



        {showForm && (

          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

            <button

              type="button"

              aria-label="Close requirement form"

              disabled={saving}

              onClick={closeForm}

              className="absolute inset-0"

            />



            <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">

              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">

                <div>

                  <h2 className="text-lg font-black text-slate-950 dark:text-white">

                    {editingItem

                      ? "Edit Item"

                      : "Add Office Item"}

                  </h2>



                  <p className="mt-0.5 text-xs font-medium text-slate-500">

                    {office?.name}{" "}

                    clearance

                    configuration

                  </p>

                </div>



                <button

                  type="button"

                  disabled={saving}

                  onClick={

                    closeForm

                  }

                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:hover:bg-slate-700"

                >

                  <FaTimes />

                </button>

              </div>



              <form

                onSubmit={

                  handleSubmit

                }

                className="space-y-5 p-5 sm:p-6"

              >

                {/* TYPE */}



                <div>

                  <label

                    className={

                      labelClass

                    }

                  >

                    Item Type

                  </label>



                  <div className="grid grid-cols-2 gap-3">

                    <button

                      type="button"

                      disabled={

                        saving

                      }

                      onClick={() =>

                        setFormData(

                          (

                            current

                          ) => ({

                            ...current,



                            type:

                              "Requirement",

                            responseType: "check",

                          })

                        )

                      }

                      className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${

                        formData.type ===

                        "Requirement"

                          ? "border-violet-500 bg-violet-50 ring-4 ring-violet-500/10 dark:bg-violet-500/10"

                          : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"

                      }`}

                    >

                      <FaClipboardList

                        className={

                          formData.type ===

                          "Requirement"

                            ? "text-violet-600"

                            : "text-slate-400"

                        }

                      />



                      <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">

                        Requirement

                      </p>



                      <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500">

                        A check the

                        staff can verify

                        during review.

                      </p>

                    </button>



                    <button

                      type="button"

                      disabled={

                        saving

                      }

                      onClick={() =>

                        setFormData(

                          (

                            current

                          ) => ({

                            ...current,



                            type:

                              "Question",

                            responseType: current.type === "Question" ? current.responseType : "yes-no",

                          })

                        )

                      }

                      className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${

                        formData.type ===

                        "Question"

                          ? "border-blue-500 bg-blue-50 ring-4 ring-blue-500/10 dark:bg-blue-500/10"

                          : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"

                      }`}

                    >

                      <FaQuestionCircle

                        className={

                          formData.type ===

                          "Question"

                            ? "text-blue-600"

                            : "text-slate-400"

                        }

                      />



                      <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">

                        Question

                      </p>



                      <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500">

                        A question

                        students answer

                        during

                        clearance

                        review.

                      </p>

                    </button>

                  </div>

                </div>



                {formData.type === "Question" && (
                  <div>
                    <label htmlFor="office-response-type" className={labelClass}>
                      Student Answer Type
                    </label>
                    <select
                      id="office-response-type"
                      value={formData.responseType || "yes-no"}
                      disabled={saving}
                      onChange={(event) => setFormData((current) => ({ ...current, responseType: event.target.value }))}
                      className={inputClass}
                    >
                      <option value="text">Text Input</option>
                      <option value="yes-no">Yes / No</option>
                      <option value="check">Checkbox</option>
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      Choose how students should answer this question.
                    </p>
                  </div>
                )}

                {/* TITLE */}



                <div>

                  <label

                    className={

                      labelClass

                    }

                  >

                    {formData.type ===

                    "Question"

                      ? "Question"

                      : "Requirement"}

                  </label>



                  <input

                    type="text"

                    name="title"

                    value={

                      formData.title

                    }

                    disabled={

                      saving

                    }

                    onChange={

                      handleChange

                    }

                    placeholder={

                      formData.type ===

                      "Question"

                        ? "Example: Does the student have an unresolved obligation?"

                        : "Example: No outstanding borrowed books"

                    }

                    className={

                      inputClass

                    }

                  />

                </div>



                {/* DESCRIPTION */}



                <div>

                  <label

                    className={

                      labelClass

                    }

                  >

                    Description /

                    Instructions

                  </label>



                  <textarea

                    name="description"

                    value={

                      formData.description

                    }

                    disabled={

                      saving

                    }

                    onChange={

                      handleChange

                    }

                    rows="4"

                    placeholder="Add a short explanation for the reviewing staff..."

                    className={`${inputClass} resize-none`}

                  />

                </div>



                {/* REQUIRED */}



                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">

                  <div>

                    <p className="text-sm font-black text-slate-900 dark:text-white">

                      Required Item

                    </p>



                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500">

                      Required items

                      must be completed

                      before the

                      student can be

                      approved by this

                      office.

                    </p>

                  </div>



                  <button

                    type="button"

                    disabled={

                      saving

                    }

                    onClick={() =>

                      setFormData(

                        (

                          current

                        ) => ({

                          ...current,



                          required:

                            !current.required,

                        })

                      )

                    }

                    className={`shrink-0 text-3xl transition disabled:cursor-not-allowed disabled:opacity-60 ${

                      formData.required

                        ? "text-blue-500"

                        : "text-slate-300 dark:text-slate-600"

                    }`}

                  >

                    {formData.required ? (

                      <FaToggleOn />

                    ) : (

                      <FaToggleOff />

                    )}

                  </button>

                </div>



                {/* ACTIVE */}



                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">

                  <div>

                    <p className="text-sm font-black text-slate-900 dark:text-white">

                      Active Item

                    </p>



                    <p className="mt-1 text-xs font-medium leading-5 text-slate-500">

                      Active items

                      appear in the

                      office review

                      checklist.

                    </p>

                  </div>



                  <button

                    type="button"

                    disabled={

                      saving

                    }

                    onClick={() =>

                      setFormData(

                        (

                          current

                        ) => ({

                          ...current,



                          active:

                            !current.active,

                        })

                      )

                    }

                    className={`shrink-0 text-3xl transition disabled:cursor-not-allowed disabled:opacity-60 ${

                      formData.active

                        ? "text-emerald-500"

                        : "text-slate-300 dark:text-slate-600"

                    }`}

                  >

                    {formData.active ? (

                      <FaToggleOn />

                    ) : (

                      <FaToggleOff />

                    )}

                  </button>

                </div>



                {/* BUTTONS */}



                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 dark:border-slate-800 sm:flex-row sm:justify-end">

                  <button

                    type="button"

                    disabled={

                      saving

                    }

                    onClick={

                      closeForm

                    }

                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"

                  >

                    Cancel

                  </button>



                  <button

                    type="submit"

                    disabled={

                      saving

                    }

                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"

                  >

                    {saving ? (

                      <FaSpinner className="animate-spin" />

                    ) : (

                      <FaCheck />

                    )}



                    {saving

                      ? "Saving..."

                      : editingItem

                        ? "Save Changes"

                        : "Add Item"}

                  </button>

                </div>

              </form>

            </div>

          </div>

        )}



        {/* DELETE CONFIRMATION */}



        {deleteItem && (

          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">

            <button

              type="button"

              aria-label="Close delete confirmation"

              disabled={saving}

              onClick={() =>

                !saving &&

                setDeleteItem(

                  null

                )

              }

              className="absolute inset-0"

            />



            <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">

                <FaTrash />

              </div>



              <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">

                Delete this item?

              </h2>



              <p className="mt-2 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">

                "

                {

                  deleteItem.title

                }

                " will be removed

                from the{" "}

                {office?.name}{" "}

                clearance

                configuration.

              </p>



              <div className="mt-4 rounded-2xl bg-red-50 p-3 dark:bg-red-500/5">

                <p className="text-xs font-medium leading-5 text-red-700 dark:text-red-300">

                  Delete should only

                  be used when this

                  item is no longer

                  needed. If you only

                  want to hide it

                  from current

                  reviews, use

                  Disable instead.

                </p>

              </div>



              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">

                <button

                  type="button"

                  disabled={

                    saving

                  }

                  onClick={() =>

                    setDeleteItem(

                      null

                    )

                  }

                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"

                >

                  Cancel

                </button>



                <button

                  type="button"

                  disabled={

                    saving

                  }

                  onClick={

                    confirmDelete

                  }

                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"

                >

                  {saving ? (

                    <FaSpinner className="animate-spin" />

                  ) : (

                    <FaTrash />

                  )}



                  {saving

                    ? "Deleting..."

                    : "Delete"}

                </button>

              </div>

            </div>

          </div>

        )}

      </div>

    </PortalLayout>

  );

}



/*

\=========================================================

STYLES

\=========================================================

*/



function toLocalInput(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}


const inputClass =

  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white";



const labelClass =

  "mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400";



/*

\=========================================================

STAT CARD

\=========================================================

*/



function StatCard({

  label,

  value,

  icon: Icon,

  iconClass,

}) {

  return (

    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">

      <div className="flex items-center justify-between gap-4">

        <div>

          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">

            {label}

          </p>



          <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">

            {value}

          </p>

        </div>



        <div

          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}

        >

          <Icon />

        </div>

      </div>

    </div>

  );

}



export default Requirements;