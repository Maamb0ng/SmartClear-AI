import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import Swal from "sweetalert2";

import AdminLayout from "../../layouts/AdminLayout";

import {
  FaBuilding,
  FaCheckCircle,
  FaEdit,
  FaLayerGroup,
  FaPlus,
  FaSave,
  FaSearch,
  FaSyncAlt,
  FaTimes,
  FaToggleOff,
  FaToggleOn,
  FaTrash,
} from "react-icons/fa";

import {
  addOffice,
  deleteOffice,
  getOffices,
  updateOffice,
} from "../../services/officeService";

import campusImage from "../../assets/cctc-campus.png";
import schoolLogo from "../../assets/cctc-logo.jpg";

const defaultFormData = {
  office_name: "",
  office_code: "",
  description: "",
  is_active: true,
};

function OfficeManagement() {
  const [
    offices,
    setOffices,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    editingOffice,
    setEditingOffice,
  ] = useState(null);

  const [
    formData,
    setFormData,
  ] = useState(
    defaultFormData
  );

  const loadOffices =
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

        const data =
          await getOffices();

        setOffices(
          data || []
        );
      } catch (error) {
        await Swal.fire({
          icon: "error",
          title:
            "Unable to Load Offices",
          text:
            error?.message ||
            "An unexpected error occurred while loading offices.",
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
    };

  useEffect(() => {
    loadOffices();
  }, []);

  const statistics =
    useMemo(() => {
      const active =
        offices.filter(
          (office) =>
            office.is_active
        ).length;

      return {
        total:
          offices.length,
        active,
        inactive:
          offices.length -
          active,
      };
    }, [
      offices,
    ]);

  const filteredOffices =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (
        !keyword
      ) {
        return offices;
      }

      return offices.filter(
        (
          office
        ) => {
          return [
            office.office_name,
            office.office_code,
            office.description,
          ]
            .filter(
              Boolean
            )
            .join(" ")
            .toLowerCase()
            .includes(
              keyword
            );
        }
      );
    }, [
      offices,
      search,
    ]);

  const resetForm = () => {
    setEditingOffice(
      null
    );

    setFormData({
      ...defaultFormData,
    });
  };

  const openAddModal =
    () => {
      resetForm();
      setShowModal(
        true
      );
    };

  const openEditModal =
    (
      office
    ) => {
      setEditingOffice(
        office
      );

      setFormData({
        office_name:
          office.office_name ||
          "",
        office_code:
          office.office_code ||
          "",
        description:
          office.description ||
          "",
        is_active:
          office.is_active ??
          true,
      });

      setShowModal(
        true
      );
    };

  const closeModal = () => {
    if (
      saving
    ) {
      return;
    }

    setShowModal(
      false
    );
    resetForm();
  };

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData(
      (
        previous
      ) => ({
        ...previous,
        [name]:
          type ===
          "checkbox"
            ? checked
            : name ===
              "office_code"
            ? value.toUpperCase()
            : value,
      })
    );
  };

  const validateForm =
    () => {
      if (
        !formData.office_name.trim()
      ) {
        return "Office name is required.";
      }

      if (
        !formData.office_code.trim()
      ) {
        return "Office code is required.";
      }

      return null;
    };

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      const validationError =
        validateForm();

      if (
        validationError
      ) {
        await Swal.fire({
          icon: "warning",
          title:
            "Incomplete Information",
          text:
            validationError,
          confirmButtonColor:
            "#2563eb",
        });

        return;
      }

      try {
        setSaving(
          true
        );

        const payload = {
          office_name:
            formData.office_name.trim(),
          office_code:
            formData.office_code
              .trim()
              .toUpperCase(),
          description:
            formData.description.trim(),
          is_active:
            formData.is_active,
        };

        if (
          editingOffice
        ) {
          await updateOffice(
            editingOffice.id,
            payload
          );

          await Swal.fire({
            icon: "success",
            title:
              "Office Updated",
            text:
              "The office information was updated successfully.",
            timer: 1500,
            showConfirmButton:
              false,
          });
        } else {
          await addOffice(
            payload
          );

          await Swal.fire({
            icon: "success",
            title:
              "Office Added",
            text:
              "The new clearance office was added successfully.",
            timer: 1500,
            showConfirmButton:
              false,
          });
        }

        closeModal();
        await loadOffices();
      } catch (error) {
        await Swal.fire({
          icon: "error",
          title:
            "Save Failed",
          text:
            error?.message ||
            "Unable to save the office.",
          confirmButtonColor:
            "#2563eb",
        });
      } finally {
        setSaving(
          false
        );
      }
    };

  const handleDelete =
    async (
      office
    ) => {
      const result =
        await Swal.fire({
          title:
            "Delete Office?",
          html: `
            <div style="text-align:left;line-height:1.6">
              <p><strong>${office.office_name}</strong> (${office.office_code})</p>
              <p style="margin-top:10px;color:#dc2626">
                This action cannot be undone. Offices already used by clearance records may need to be deactivated instead.
              </p>
            </div>
          `,
          icon: "warning",
          showCancelButton:
            true,
          confirmButtonText:
            "Delete Office",
          cancelButtonText:
            "Cancel",
          confirmButtonColor:
            "#dc2626",
        });

      if (
        !result.isConfirmed
      ) {
        return;
      }

      try {
        await deleteOffice(
          office.id
        );

        await Swal.fire({
          icon: "success",
          title:
            "Office Deleted",
          timer: 1400,
          showConfirmButton:
            false,
        });

        await loadOffices();
      } catch (error) {
        await Swal.fire({
          icon: "error",
          title:
            "Delete Failed",
          text:
            error?.message ||
            "Unable to delete the office.",
          confirmButtonColor:
            "#2563eb",
        });
      }
    };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex min-h-[65vh] items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700" />

              <FaBuilding className="text-2xl text-blue-700" />
            </div>

            <p className="mt-5 font-bold text-slate-700">
              Loading office management...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
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
          duration: 0.55,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
        className="relative space-y-6 overflow-hidden pb-10"
      >
        <div className="pointer-events-none absolute -right-44 top-44 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

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
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
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
                  <FaBuilding className="text-cyan-300" />
                  Clearance Setup
                </div>

                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                  Office Management
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100/75">
                  Create and manage the official school offices responsible for
                  reviewing student clearance requirements.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <motion.button
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                type="button"
                onClick={() =>
                  loadOffices(
                    true
                  )
                }
                disabled={
                  refreshing
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-60"
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
              </motion.button>

              <motion.button
                whileHover={{
                  y: -2,
                }}
                whileTap={{
                  scale: 0.98,
                }}
                type="button"
                onClick={
                  openAddModal
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#082a70] shadow-lg transition hover:bg-blue-50"
              >
                <FaPlus />
                Add Office
              </motion.button>
            </div>
          </div>
        </section>

        {/* Statistics */}

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label:
                "Total Offices",
              value:
                statistics.total,
              icon:
                FaLayerGroup,
              tone:
                "bg-blue-400/15 text-cyan-300",
            },
            {
              label:
                "Active Offices",
              value:
                statistics.active,
              icon:
                FaToggleOn,
              tone:
                "bg-emerald-400/15 text-emerald-300",
            },
            {
              label:
                "Inactive Offices",
              value:
                statistics.inactive,
              icon:
                FaToggleOff,
              tone:
                "bg-rose-400/15 text-rose-300",
            },
          ].map(
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
                    y: 16,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      0.08 +
                      index *
                        0.07,
                  }}
                  whileHover={{
                    y: -4,
                  }}
                  className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#071b4b] p-5 text-white shadow-[0_18px_38px_rgba(2,12,40,0.16)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-100/60">
                        {
                          item.label
                        }
                      </p>

                      <p className="mt-3 text-3xl font-black">
                        {
                          item.value
                        }
                      </p>
                    </div>

                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}
                    >
                      <Icon />
                    </div>
                  </div>
                </motion.article>
              );
            }
          )}
        </section>

        {/* Search */}

        <motion.section
          initial={{
            opacity: 0,
            y: 16,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.16,
          }}
          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.07)]"
        >
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search office name, code, or description..."
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event
                    .target
                    .value
                )
              }
              className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50/60 pl-11 pr-4 text-sm outline-none transition focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </motion.section>

        {/* Office table/cards */}

        <motion.section
          initial={{
            opacity: 0,
            y: 16,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.22,
          }}
          className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
        >
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                Office Directory
              </p>

              <h2 className="mt-1 text-xl font-black text-slate-900">
                Clearance Offices
              </h2>
            </div>

            <span className="w-fit rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700">
              {
                filteredOffices.length
              }{" "}
              record
              {filteredOffices.length ===
              1
                ? ""
                : "s"}
            </span>
          </div>

          {filteredOffices.length ===
          0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-3xl text-slate-400">
                <FaBuilding />
              </div>

              <h3 className="mt-5 text-xl font-black text-slate-800">
                No Offices Found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Add an office or change your search keyword.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-white">
                      {[
                        "Office",
                        "Code",
                        "Description",
                        "Status",
                        "Actions",
                      ].map(
                        (
                          heading
                        ) => (
                          <th
                            key={
                              heading
                            }
                            className={`px-5 py-4 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 sm:px-6 ${
                              heading ===
                              "Actions"
                                ? "text-right"
                                : "text-left"
                            }`}
                          >
                            {
                              heading
                            }
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOffices.map(
                      (
                        office,
                        index
                      ) => (
                        <motion.tr
                          key={
                            office.id
                          }
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            delay:
                              0.26 +
                              index *
                                0.04,
                          }}
                          className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-4 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#071b4b] text-cyan-300">
                                <FaBuilding />
                              </div>

                              <div>
                                <p className="font-black text-slate-800">
                                  {
                                    office.office_name
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-slate-400">
                                  Clearance office
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-black text-blue-700">
                              {
                                office.office_code
                              }
                            </span>
                          </td>

                          <td className="max-w-md px-5 py-4 text-sm leading-6 text-slate-600">
                            {office.description ||
                              "No description provided."}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                                office.is_active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  office.is_active
                                    ? "bg-emerald-500"
                                    : "bg-rose-500"
                                }`}
                              />

                              {office.is_active
                                ? "Active"
                                : "Inactive"}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <motion.button
                                whileHover={{
                                  y: -2,
                                }}
                                whileTap={{
                                  scale:
                                    0.95,
                                }}
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    office
                                  )
                                }
                                title="Edit office"
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 transition hover:bg-amber-500 hover:text-white"
                              >
                                <FaEdit />
                              </motion.button>

                              <motion.button
                                whileHover={{
                                  y: -2,
                                }}
                                whileTap={{
                                  scale:
                                    0.95,
                                }}
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    office
                                  )
                                }
                                title="Delete office"
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 transition hover:bg-rose-600 hover:text-white"
                              >
                                <FaTrash />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}

              <div className="grid gap-4 p-4 md:hidden">
                {filteredOffices.map(
                  (
                    office,
                    index
                  ) => (
                    <motion.article
                      key={
                        office.id
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
                          index *
                          0.04,
                      }}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#071b4b] text-cyan-300">
                            <FaBuilding />
                          </div>

                          <div>
                            <h3 className="font-black text-slate-800">
                              {
                                office.office_name
                              }
                            </h3>

                            <p className="mt-0.5 text-xs font-bold text-blue-700">
                              {
                                office.office_code
                              }
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            office.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {office.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {office.description ||
                          "No description provided."}
                      </p>

                      <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(
                              office
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2 text-xs font-bold text-amber-700"
                        >
                          <FaEdit />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              office
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-rose-100 px-4 py-2 text-xs font-bold text-rose-700"
                        >
                          <FaTrash />
                          Delete
                        </button>
                      </div>
                    </motion.article>
                  )
                )}
              </div>
            </>
          )}
        </motion.section>

        {/* Modal */}

        <AnimatePresence>
          {showModal && (
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
              className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{
                  opacity: 0,
                  y: 24,
                  scale: 0.97,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: 20,
                  scale: 0.97,
                }}
                transition={{
                  duration: 0.24,
                }}
                className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl"
              >
                <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-[#061b51] px-5 py-5 text-white sm:px-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200/70">
                      Office Configuration
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      {editingOffice
                        ? "Edit Office"
                        : "Add Office"}
                    </h2>

                    <p className="mt-1 text-xs text-blue-100/60">
                      Configure the official office information and availability.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={
                      closeModal
                    }
                    disabled={
                      saving
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-blue-100 transition hover:bg-white/15 disabled:opacity-50"
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
                  <div>
                    <label
                      htmlFor="office-name"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Office Name
                    </label>

                    <input
                      id="office-name"
                      type="text"
                      name="office_name"
                      value={
                        formData.office_name
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Example: Registrar Office"
                      className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="office-code"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Office Code
                    </label>

                    <input
                      id="office-code"
                      type="text"
                      name="office_code"
                      value={
                        formData.office_code
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Example: REG"
                      maxLength="20"
                      className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm uppercase outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="office-description"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Description
                    </label>

                    <textarea
                      id="office-description"
                      rows="5"
                      name="description"
                      value={
                        formData.description
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Describe this office and its clearance responsibility."
                      className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={
                        formData.is_active
                      }
                      onChange={
                        handleChange
                      }
                      className="h-5 w-5 accent-blue-700"
                    />

                    <div>
                      <p className="text-sm font-black text-slate-800">
                        Active Office
                      </p>

                      <p className="mt-0.5 text-xs leading-5 text-slate-500">
                        Active offices can be used in new clearance assignments.
                      </p>
                    </div>
                  </label>

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={
                        closeModal
                      }
                      disabled={
                        saving
                      }
                      className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <motion.button
                      whileHover={{
                        y:
                          saving
                            ? 0
                            : -2,
                      }}
                      whileTap={{
                        scale:
                          saving
                            ? 1
                            : 0.98,
                      }}
                      type="submit"
                      disabled={
                        saving
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 px-5 text-sm font-black text-white shadow-[0_12px_26px_rgba(37,99,235,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FaSave />

                      {saving
                        ? "Saving..."
                        : editingOffice
                        ? "Update Office"
                        : "Save Office"}
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

export default OfficeManagement;