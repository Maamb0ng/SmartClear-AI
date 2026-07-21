import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

import AdminLayout from "../../layouts/AdminLayout";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

import {
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaUserShield,
  FaBuilding,
  FaTimes,
  FaSave,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

import {
  getAssignments,
  getApprovers,
  addAssignment,
  updateAssignment,
  deleteAssignment,
} from "../../services/approverAssignmentService";

import { getOffices } from "../../services/officeService";

function ApproverManagement() {
  const [assignments, setAssignments] = useState([]);
  const [approvers, setApprovers] = useState([]);
  const [offices, setOffices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] =
    useState(null);

  const [formData, setFormData] = useState({
    approver_id: "",
    selected_targets: [],
    is_active: true,
  });

  // NEW: tracks which approver groups are expanded (collapsed by default)
  const [expandedApprovers, setExpandedApprovers] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);

      const [
        assignmentData,
        approverData,
        officeData,
      ] = await Promise.all([
        getAssignments(),
        getApprovers(),
        getOffices(),
      ]);

      setAssignments(
        (assignmentData || []).filter(
          (assignment) =>
            Boolean(assignment.office_id)
        )
      );

      setApprovers(approverData || []);
      setOffices(officeData || []);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Unable to Load Data",
        text:
          error?.message ||
          "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredAssignments = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return assignments;
    }

    return assignments.filter((assignment) => {
      return (
        (assignment.users?.full_name || "")
          .toLowerCase()
          .includes(keyword) ||
        (assignment.users?.employee_id || "")
          .toLowerCase()
          .includes(keyword) ||
        (assignment.users?.email || "")
          .toLowerCase()
          .includes(keyword) ||
        (assignment.offices?.office_name || "")
          .toLowerCase()
          .includes(keyword) ||
        (assignment.offices?.office_code || "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [assignments, search]);

  const groupedAssignments = useMemo(() => {
    const groups = {};

    filteredAssignments.forEach((assignment) => {
      const approverId = assignment.approver_id;

      if (!groups[approverId]) {
        groups[approverId] = {
          approver: assignment.users,
          assignments: [],
        };
      }

      groups[approverId].assignments.push(assignment);
    });

    return Object.values(groups);
  }, [filteredAssignments]);

  const availableTargets = offices;

  const resetForm = () => {
    setEditingAssignment(null);
    setFormData({
      approver_id: "",
      selected_targets: [],
      is_active: true,
    });
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  // NEW: toggle a single approver group open/closed
  const toggleGroup = (approverId) => {
    setExpandedApprovers((previous) => ({
      ...previous,
      [approverId]: !previous[approverId],
    }));
  };

  const toggleTarget = (targetId) => {
    setFormData((previousData) => {
      const isSelected =
        previousData.selected_targets.includes(targetId);

      return {
        ...previousData,
        selected_targets: isSelected
          ? previousData.selected_targets.filter(
              (id) => id !== targetId
            )
          : [
              ...previousData.selected_targets,
              targetId,
            ],
      };
    });
  };

  const handleSelectAll = () => {
    setFormData((previousData) => {
      const allIds = availableTargets.map(
        (target) => target.id
      );

      const allSelected =
        allIds.length > 0 &&
        allIds.every((id) =>
          previousData.selected_targets.includes(id)
        );

      return {
        ...previousData,
        selected_targets: allSelected
          ? []
          : allIds,
      };
    });
  };

  const getTargetName = (target) => {
    return target.office_name;
  };

  const getTargetCode = (target) => {
    return target.office_code;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.approver_id) {
      Swal.fire({
        icon: "warning",
        title: "Approver Required",
        text: "Please select an approver.",
      });

      return;
    }

    if (formData.selected_targets.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Assignment Required",
        text:
          "Please select at least one office.",
      });

      return;
    }

    try {
      setSaving(true);

      /*
      =====================================
      EDIT ONE EXISTING ASSIGNMENT
      =====================================
      */

      if (editingAssignment) {
        const selectedTargetId =
          formData.selected_targets[0];

        await updateAssignment(
          editingAssignment.id,
          {
            approver_id: formData.approver_id,

            office_id:
              selectedTargetId,

            subject_id:
              null,

            is_active: formData.is_active,
          }
        );

        await Swal.fire({
          icon: "success",
          title: "Assignment Updated",
          text:
            "The office assignment was updated successfully.",
          timer: 1400,
          showConfirmButton: false,
        });
      } else {
        /*
        =====================================
        CREATE MULTIPLE ASSIGNMENTS
        =====================================
        */

        const selectedTargetNames =
          availableTargets
            .filter((target) =>
              formData.selected_targets.includes(
                target.id
              )
            )
            .map((target) =>
              getTargetName(target)
            );

        const results = await Promise.allSettled(
          formData.selected_targets.map(
            (targetId) =>
              addAssignment({
                approver_id:
                  formData.approver_id,

                office_id:
                  targetId,

                subject_id:
                  null,

                is_active:
                  formData.is_active,
              })
          )
        );

        const successfulResults =
          results.filter(
            (result) =>
              result.status === "fulfilled"
          );

        const failedResults =
          results.filter(
            (result) =>
              result.status === "rejected"
          );

        if (successfulResults.length === 0) {
          const firstError =
            failedResults[0]?.reason;

          throw new Error(
            firstError?.message ||
              "Unable to create the selected office assignments."
          );
        }

        const selectedApprover =
          approvers.find(
            (approver) =>
              approver.id ===
              formData.approver_id
          );

        const assignmentList =
          selectedTargetNames
            .map(
              (targetName) =>
                `<li style="margin-bottom:6px">${targetName}</li>`
            )
            .join("");

        await Swal.fire({
          icon:
            failedResults.length > 0
              ? "warning"
              : "success",

          title:
            failedResults.length > 0
              ? "Office Assignments Partially Saved"
              : "Office Assignments Saved",

          html: `
            <div style="text-align:left">
              <p style="margin-bottom:10px">
                <strong>${
                  selectedApprover?.full_name ||
                  "The approver"
                }</strong> was assigned to:
              </p>

              <ul style="padding-left:20px">
                ${assignmentList}
              </ul>

              ${
                failedResults.length > 0
                  ? `<p style="margin-top:12px;color:#b45309">
                      ${failedResults.length} assignment(s) were skipped because they may already exist.
                    </p>`
                  : ""
              }
            </div>
          `,
        });
      }

      closeModal();
      await loadData();
    } catch (error) {
      console.error(error);

      let errorMessage =
        error?.message ||
        "Unable to save the assignment.";

      if (
        errorMessage.includes(
          "approver_assignments_unique"
        ) ||
        errorMessage.includes(
          "duplicate key"
        )
      ) {
        errorMessage =
          "This approver is already assigned to one or more of the selected offices.";
      }

      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: errorMessage,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (assignment) => {
    const targetId =
      assignment.office_id;

    setEditingAssignment(assignment);

    setFormData({
      approver_id:
        assignment.approver_id || "",

      selected_targets: targetId
        ? [targetId]
        : [],

      is_active:
        assignment.is_active ?? true,
    });

    setShowModal(true);
  };

  const handleDelete = async (
    assignmentId
  ) => {
    const confirmation =
      await Swal.fire({
        icon: "warning",
        title: "Delete Assignment?",
        text:
          "This approver will no longer receive new clearance steps for this office.",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#dc2626",
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      await deleteAssignment(
        assignmentId
      );

      await Swal.fire({
        icon: "success",
        title: "Assignment Deleted",
        timer: 1200,
        showConfirmButton: false,
      });

      await loadData();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error?.message ||
          "Unable to delete the assignment.",
      });
    }
  };

  const handleDeleteAll = async (
    group
  ) => {
    const confirmation =
      await Swal.fire({
        icon: "warning",
        title: "Remove All Assignments?",
        text: `Remove all assignments belonging to ${
          group.approver?.full_name ||
          "this approver"
        }?`,
        showCancelButton: true,
        confirmButtonText: "Remove All",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#dc2626",
      });

    if (!confirmation.isConfirmed) {
      return;
    }

    try {
      const results =
        await Promise.allSettled(
          group.assignments.map(
            (assignment) =>
              deleteAssignment(
                assignment.id
              )
          )
        );

      const failedCount =
        results.filter(
          (result) =>
            result.status === "rejected"
        ).length;

      if (failedCount > 0) {
        throw new Error(
          `${failedCount} assignment(s) could not be deleted.`
        );
      }

      await Swal.fire({
        icon: "success",
        title: "Assignments Removed",
        timer: 1200,
        showConfirmButton: false,
      });

      await loadData();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error?.message ||
          "Unable to remove all assignments.",
      });
    }
  };

  return (
    <AdminLayout>
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative overflow-hidden pb-10"
      >
        <div className="pointer-events-none absolute -right-48 -top-44 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-[34rem] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      <motion.section
        initial={{ opacity: 0, y: -18, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.62,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#061b51] text-white shadow-[0_24px_60px_rgba(2,12,40,0.22)]"
      >
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage: `url(${campusImage})`,
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-[#03143f]/98 via-[#082a70]/94 to-[#0c4a8a]/82" />

        <motion.div
          animate={{
            x: [0, 24, 0],
            y: [0, -14, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl"
        />

        <div className="relative z-10 flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <motion.div
              whileHover={{ rotate: 4, scale: 1.04 }}
              className="hidden h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/25 bg-white p-1 shadow-xl sm:block"
            >
              <img
                src={schoolLogo}
                alt="Consolatrix College of Toledo City seal"
                className="h-full w-full rounded-full object-cover"
              />
            </motion.div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-cyan-200 backdrop-blur-md">
                <FaUserShield />
                Clearance Setup
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
                Approver Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
                Assign authorized staff to clearance offices. Subject teachers are managed separately through Class Assignments.
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={openAddModal}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#082a70] shadow-lg transition hover:bg-blue-50"
          >
            <FaPlus />
            New Office Assignments
          </motion.button>
        </div>
      </motion.section>


      {/* Search */}

      <div className="mb-6 rounded-2xl border border-white/60 bg-white/70 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-md">
        <div className="relative">
          <FaSearch className="absolute left-4 top-4 text-slate-400" />

          <input
            type="text"
            placeholder="Search by office approver, employee ID, email, or office..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-200 bg-white/80 py-3 pl-12 pr-4 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Grouped Assignments */}

      <div className="space-y-5">
        {loading ? (
          <div className="rounded-3xl border border-white/60 bg-white/70 p-14 text-center text-slate-500 shadow-lg backdrop-blur-md">
            Loading assignments...
          </div>
        ) : groupedAssignments.length ===
          0 ? (
          <div className="rounded-3xl border border-white/60 bg-white/70 p-14 text-center text-slate-500 shadow-lg backdrop-blur-md">
            No office approver assignments found.
          </div>
        ) : (
          groupedAssignments.map(
            (group) => {
              const isExpanded = Boolean(
                expandedApprovers[group.approver?.id]
              );

              return (
                <div
                  key={group.approver?.id}
                  className="overflow-hidden rounded-3xl border border-white/60 bg-white/70 shadow-lg shadow-slate-900/5 backdrop-blur-md transition hover:shadow-xl"
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleGroup(group.approver?.id)
                    }
                    className="flex w-full flex-col justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white/40 p-6 text-left md:flex-row md:items-center"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-50 shadow-inner">
                        <FaUserShield className="text-2xl text-blue-700" />
                      </div>

                      <div>
                        <h2 className="text-xl font-bold text-slate-800">
                          {group.approver
                            ?.full_name ||
                            "No Name"}
                        </h2>

                        <p className="text-sm text-slate-500">
                          {group.approver
                            ?.employee_id ||
                            group.approver
                              ?.email ||
                            "No Employee ID"}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-blue-700">
                          {
                            group
                              .assignments
                              .length
                          }{" "}
                          assignment
                          {group
                            .assignments
                            .length !== 1
                            ? "s"
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteAll(group);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.stopPropagation();
                            handleDeleteAll(group);
                          }
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2 font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <FaTrash />
                        Remove All
                      </span>

                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition">
                        {isExpanded ? (
                          <FaChevronUp />
                        ) : (
                          <FaChevronDown />
                        )}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
                          {group.assignments.map(
                            (assignment) => {
                              const name =
                                assignment.offices
                                  ?.office_name ||
                                "Unassigned Office";

                              const code =
                                assignment.offices
                                  ?.office_code ||
                                "No code";

                              return (
                                <motion.div
                                  key={assignment.id}
                                  whileHover={{ y: -2 }}
                                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex gap-3">
                                      <div
                                        className="rounded-xl bg-purple-50 p-3 text-purple-700"
                                      >
                                        <FaBuilding />
                                      </div>

                                      <div>
                                        <p className="text-sm text-slate-500">
                                          Office
                                        </p>

                                        <h3 className="font-semibold text-slate-800">
                                          {name}
                                        </h3>

                                        <p className="text-sm text-slate-500">
                                          {code}
                                        </p>
                                      </div>
                                    </div>

                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                        assignment.is_active
                                          ? "bg-green-50 text-green-700"
                                          : "bg-red-50 text-red-700"
                                      }`}
                                    >
                                      {assignment.is_active
                                        ? "Active"
                                        : "Inactive"}
                                    </span>
                                  </div>

                                  <div className="mt-5 flex justify-end gap-2">
                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.06 }}
                                      whileTap={{ scale: 0.94 }}
                                      onClick={() =>
                                        handleEdit(
                                          assignment
                                        )
                                      }
                                      title="Edit assignment"
                                      className="rounded-lg bg-yellow-500 p-3 text-white shadow-sm transition hover:bg-yellow-600"
                                    >
                                      <FaEdit />
                                    </motion.button>

                                    <motion.button
                                      type="button"
                                      whileHover={{ scale: 1.06 }}
                                      whileTap={{ scale: 0.94 }}
                                      onClick={() =>
                                        handleDelete(
                                          assignment.id
                                        )
                                      }
                                      title="Delete assignment"
                                      className="rounded-lg bg-red-600 p-3 text-white shadow-sm transition hover:bg-red-700"
                                    >
                                      <FaTrash />
                                    </motion.button>
                                  </div>
                                </motion.div>
                              );
                            }
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }
          )
        )}
      </div>

      {/* Modal */}

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/60 bg-white/95 p-8 shadow-2xl backdrop-blur-md"
            >
              <div className="mb-7 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">
                    {editingAssignment
                      ? "Edit Office Assignment"
                      : "New Office Assignments"}
                  </h2>

                  <p className="mt-2 text-slate-500">
                    {editingAssignment
                      ? "Update this individual assignment."
                      : "Select one or more clearance offices for the chosen approver."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full bg-slate-100 p-3 text-slate-600 transition hover:bg-slate-200"
                >
                  <FaTimes />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                {/* Approver */}

                <div>
                  <label className="mb-2 block font-semibold text-slate-700">
                    Office Approver
                  </label>

                  <select
                    value={
                      formData.approver_id
                    }
                    onChange={(event) =>
                      setFormData(
                        (
                          previousData
                        ) => ({
                          ...previousData,
                          approver_id:
                            event.target
                              .value,
                        })
                      )
                    }
                    disabled={Boolean(
                      editingAssignment
                    )}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    required
                  >
                    <option value="">
                      Select Office Approver
                    </option>

                    {approvers.map(
                      (approver) => (
                        <option
                          key={
                            approver.id
                          }
                          value={
                            approver.id
                          }
                        >
                          {approver.full_name ||
                            approver.email}
                          {approver.employee_id
                            ? ` — ${approver.employee_id}`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Multiple Selection */}

                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <label className="font-semibold text-slate-700">
                      Select Offices
                    </label>

                    {!editingAssignment &&
                      availableTargets.length >
                        0 && (
                        <button
                          type="button"
                          onClick={
                            handleSelectAll
                          }
                          className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                        >
                          {formData.selected_targets
                            .length ===
                          availableTargets.length
                            ? "Clear All"
                            : "Select All"}
                        </button>
                      )}
                  </div>

                  {availableTargets.length ===
                  0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
                      No active offices are available.
                    </div>
                  ) : (
                    <div className="grid max-h-80 gap-3 overflow-y-auto rounded-2xl border border-slate-100 p-4 md:grid-cols-2">
                      {availableTargets.map(
                        (target) => {
                          const selected =
                            formData.selected_targets.includes(
                              target.id
                            );

                          return (
                            <label
                              key={
                                target.id
                              }
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                                selected
                                  ? "border-blue-500 bg-blue-50/70"
                                  : "border-slate-100 hover:bg-slate-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  selected
                                }
                                onChange={() => {
                                  if (
                                    editingAssignment
                                  ) {
                                    setFormData(
                                      (
                                        previousData
                                      ) => ({
                                        ...previousData,
                                        selected_targets:
                                          [
                                            target.id,
                                          ],
                                      })
                                    );
                                  } else {
                                    toggleTarget(
                                      target.id
                                    );
                                  }
                                }}
                                className="h-5 w-5 accent-blue-700"
                              />

                              <div>
                                <p className="font-semibold text-slate-800">
                                  {getTargetName(
                                    target
                                  )}
                                </p>

                                <p className="text-sm text-slate-500">
                                  {getTargetCode(
                                    target
                                  ) ||
                                    "No code"}
                                </p>
                              </div>
                            </label>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>

                {/* Active */}

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 p-4 transition hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={
                      formData.is_active
                    }
                    onChange={(event) =>
                      setFormData(
                        (
                          previousData
                        ) => ({
                          ...previousData,
                          is_active:
                            event.target
                              .checked,
                        })
                      )
                    }
                    className="h-5 w-5 accent-blue-700"
                  />

                  <div>
                    <p className="font-semibold text-slate-800">
                      Active Assignment
                    </p>

                    <p className="text-sm text-slate-500">
                      Active assignments generate clearance approval steps.
                    </p>
                  </div>
                </label>

                {/* Buttons */}

                <div className="flex justify-end gap-4 border-t border-slate-100 pt-6">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel
                  </button>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: saving ? 1 : 1.02 }}
                    whileTap={{ scale: saving ? 1 : 0.98 }}
                    disabled={
                      saving ||
                      formData
                        .selected_targets
                        .length === 0
                    }
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 px-6 py-3 font-semibold text-white shadow-md shadow-blue-900/20 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FaSave />

                    {saving
                      ? "Saving..."
                      : editingAssignment
                      ? "Update Assignment"
                      : `Save ${formData.selected_targets.length} Assignment${
                          formData
                            .selected_targets
                            .length !== 1
                            ? "s"
                            : ""
                        }`}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </motion.main>
    </AdminLayout>
  );
}

export default ApproverManagement;