import { useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  FaCheckCircle,
  FaDownload,
  FaExclamationTriangle,
  FaFileCsv,
  FaFileUpload,
  FaSyncAlt,
  FaTimes,
  FaTimesCircle,
} from "react-icons/fa";

import { supabase } from "../../services/supabase";

const REQUIRED_HEADERS = [
  "student_id",
  "school_year",
  "semester",
  "amount_due",
  "amount_paid",
];

const HEADER_ALIASES = {
  student_id: [
    "student_id",
    "student id",
    "studentid",
    "id number",
    "id_number",
    "student number",
    "student_no",
    "student no",
  ],
  school_year: [
    "school_year",
    "school year",
    "sy",
    "academic year",
    "academic_year",
  ],
  semester: [
    "semester",
    "sem",
    "term",
  ],
  amount_due: [
    "amount_due",
    "amount due",
    "total due",
    "total_due",
    "assessment",
    "total assessment",
  ],
  amount_paid: [
    "amount_paid",
    "amount paid",
    "paid",
    "total paid",
    "total_paid",
    "payment",
  ],
  balance: [
    "balance",
    "remaining balance",
    "remaining_balance",
    "outstanding balance",
  ],
  payment_status: [
    "payment_status",
    "payment status",
    "status",
    "financial status",
  ],
  reference_number: [
    "reference_number",
    "reference number",
    "reference",
    "or number",
    "or_number",
    "receipt number",
    "receipt_no",
  ],
  remarks: [
    "remarks",
    "remark",
    "notes",
    "note",
    "comment",
    "comments",
  ],
};

const normalizeText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeHeader = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[_-]+/g, " ");

const normalizeKey = (value) =>
  normalizeText(value).toLowerCase();

const normalizeSemester = (value) => {
  const raw = normalizeText(value);
  const key = raw.toLowerCase();

  if (!raw) return "";

  if (
    key === "1" ||
    key === "1st" ||
    key.includes("first") ||
    key.includes("1st sem") ||
    key.includes("1st semester")
  ) {
    return "1st Semester";
  }

  if (
    key === "2" ||
    key === "2nd" ||
    key.includes("second") ||
    key.includes("2nd sem") ||
    key.includes("2nd semester")
  ) {
    return "2nd Semester";
  }

  if (
    key.includes("summer") ||
    key.includes("midyear") ||
    key.includes("mid-year")
  ) {
    return "Summer";
  }

  return raw;
};

const parseMoney = (value) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return 0;
  }

  const cleaned = String(value)
    .replace(/[₱,$\s]/g, "")
    .replace(/,/g, "");

  const amount = Number(cleaned);

  return Number.isFinite(amount) ? amount : NaN;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value) || 0);

const inferPaymentStatus = ({
  explicitStatus,
  balance,
}) => {
  const rawStatus = normalizeText(explicitStatus);
  const statusKey = rawStatus.toLowerCase();

  if (
    statusKey === "cleared" ||
    statusKey === "fully paid" ||
    statusKey === "paid" ||
    statusKey === "settled"
  ) {
    return "Cleared";
  }

  if (
    statusKey === "with balance" ||
    statusKey === "balance" ||
    statusKey === "unpaid" ||
    statusKey === "not cleared"
  ) {
    return "With Balance";
  }

  if (
    statusKey === "no record" ||
    statusKey === "none"
  ) {
    return "No Record";
  }

  return Number(balance) <= 0
    ? "Cleared"
    : "With Balance";
};

const splitCsvLine = (line) => {
  const cells = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (
        insideQuotes &&
        line[index + 1] === '"'
      ) {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (
      character === "," &&
      !insideQuotes
    ) {
      cells.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current);

  return cells.map((cell) =>
    cell.trim()
  );
};

const parseCsv = (text) => {
  const normalizedText = String(text || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const lines = normalizedText
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length < 2) {
    throw new Error(
      "The CSV file must contain a header row and at least one payment record."
    );
  }

  const rawHeaders =
    splitCsvLine(lines[0]);

  const mappedHeaders = rawHeaders.map(
    (header) => {
      const normalized =
        normalizeHeader(header);

      const matchingKey =
        Object.entries(
          HEADER_ALIASES
        ).find(([, aliases]) =>
          aliases.some(
            (alias) =>
              normalizeHeader(alias) ===
              normalized
          )
        )?.[0];

      return matchingKey || null;
    }
  );

  const presentHeaders = new Set(
    mappedHeaders.filter(Boolean)
  );

  const missingRequired =
    REQUIRED_HEADERS.filter(
      (required) =>
        !presentHeaders.has(required)
    );

  if (missingRequired.length > 0) {
    throw new Error(
      `Missing required column(s): ${missingRequired.join(
        ", "
      )}`
    );
  }

  return lines
    .slice(1)
    .map((line, rowIndex) => {
      const cells = splitCsvLine(line);

      const row = {};

      mappedHeaders.forEach(
        (key, columnIndex) => {
          if (!key) return;
          row[key] =
            cells[columnIndex] ?? "";
        }
      );

      return {
        ...row,
        sourceRow: rowIndex + 2,
      };
    });
};

const statusBadgeClass = (status) => {
  switch (status) {
    case "Ready":
      return "bg-emerald-100 text-emerald-700";

    case "Student Not Found":
      return "bg-red-100 text-red-700";

    case "Invalid":
      return "bg-amber-100 text-amber-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
};

function PaymentRecordsImport({
  onImported,
  onClose,
}) {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [rows, setRows] = useState([]);
  const [loadingFile, setLoadingFile] =
    useState(false);

  const [validating, setValidating] =
    useState(false);

  const [importing, setImporting] =
    useState(false);

  const [dragging, setDragging] =
    useState(false);

  const summary = useMemo(
    () => ({
      total: rows.length,
      ready: rows.filter(
        (row) => row.importStatus === "Ready"
      ).length,
      notFound: rows.filter(
        (row) =>
          row.importStatus ===
          "Student Not Found"
      ).length,
      invalid: rows.filter(
        (row) => row.importStatus === "Invalid"
      ).length,
    }),
    [rows]
  );

  const resetImport = () => {
    if (importing) return;

    setSelectedFile(null);
    setRows([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validateRows = async (
    parsedRows
  ) => {
    try {
      setValidating(true);

      const cleanedRows =
        parsedRows.map((row) => {
          const studentId =
            normalizeText(row.student_id);

          const schoolYear =
            normalizeText(row.school_year);

          const semester =
            normalizeSemester(
              row.semester
            );

          const amountDue =
            parseMoney(row.amount_due);

          const amountPaid =
            parseMoney(row.amount_paid);

          const suppliedBalance =
            row.balance === undefined ||
            normalizeText(row.balance) === ""
              ? null
              : parseMoney(row.balance);

          const calculatedBalance =
            Number.isFinite(
              suppliedBalance
            )
              ? suppliedBalance
              : Number.isFinite(
                  amountDue
                ) &&
                Number.isFinite(
                  amountPaid
                )
              ? Math.max(
                  amountDue -
                    amountPaid,
                  0
                )
              : NaN;

          const validationErrors = [];

          if (!studentId) {
            validationErrors.push(
              "Student ID is required."
            );
          }

          if (!schoolYear) {
            validationErrors.push(
              "School year is required."
            );
          }

          if (!semester) {
            validationErrors.push(
              "Semester is required."
            );
          }

          if (
            !Number.isFinite(
              amountDue
            ) ||
            amountDue < 0
          ) {
            validationErrors.push(
              "Amount due must be a valid non-negative number."
            );
          }

          if (
            !Number.isFinite(
              amountPaid
            ) ||
            amountPaid < 0
          ) {
            validationErrors.push(
              "Amount paid must be a valid non-negative number."
            );
          }

          if (
            !Number.isFinite(
              calculatedBalance
            ) ||
            calculatedBalance < 0
          ) {
            validationErrors.push(
              "Balance must be a valid non-negative number."
            );
          }

          return {
            ...row,
            student_id:
              studentId,
            school_year:
              schoolYear,
            semester,
            amount_due:
              amountDue,
            amount_paid:
              amountPaid,
            balance:
              calculatedBalance,
            payment_status:
              inferPaymentStatus({
                explicitStatus:
                  row.payment_status,
                balance:
                  calculatedBalance,
              }),
            reference_number:
              normalizeText(
                row.reference_number
              ),
            remarks:
              normalizeText(
                row.remarks
              ),
            validationErrors,
          };
        });

      const uniqueStudentNumbers = [
        ...new Set(
          cleanedRows
            .map(
              (row) =>
                row.student_id
            )
            .filter(Boolean)
        ),
      ];

      let students = [];

      if (
        uniqueStudentNumbers.length >
        0
      ) {
        const {
          data,
          error,
        } = await supabase
          .from("users")
          .select(`
            id,
            student_id,
            full_name,
            course,
            year_level,
            section,
            status
          `)
          .in(
            "student_id",
            uniqueStudentNumbers
          );

        if (error) throw error;

        students = data || [];
      }

      const studentMap = new Map(
        students.map((student) => [
          normalizeKey(
            student.student_id
          ),
          student,
        ])
      );

      const validatedRows =
        cleanedRows.map((row) => {
          const student =
            studentMap.get(
              normalizeKey(
                row.student_id
              )
            ) || null;

          if (
            row.validationErrors.length >
            0
          ) {
            return {
              ...row,
              matchedStudent:
                student,
              importStatus:
                "Invalid",
            };
          }

          if (!student) {
            return {
              ...row,
              matchedStudent: null,
              importStatus:
                "Student Not Found",
            };
          }

          return {
            ...row,
            matchedStudent:
              student,
            importStatus:
              "Ready",
          };
        });

      setRows(validatedRows);
    } catch (error) {
      console.error(
        "Validate payment records error:",
        error
      );

      setRows([]);

      await Swal.fire({
        icon: "error",
        title:
          "Unable to Validate CSV",
        text:
          error?.message ||
          "The payment records could not be validated.",
      });
    } finally {
      setValidating(false);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;

    const fileName =
      String(file.name || "")
        .toLowerCase();

    if (
      !fileName.endsWith(".csv")
    ) {
      await Swal.fire({
        icon: "warning",
        title:
          "CSV File Required",
        text:
          "For this first version, export the Treasurer Excel file as CSV (.csv) before importing.",
      });

      return;
    }

    if (
      file.size >
      10 * 1024 * 1024
    ) {
      await Swal.fire({
        icon: "warning",
        title: "File Too Large",
        text:
          "Use a CSV file smaller than 10 MB.",
      });

      return;
    }

    try {
      setLoadingFile(true);
      setSelectedFile(file);
      setRows([]);

      const text =
        await file.text();

      const parsedRows =
        parseCsv(text);

      await validateRows(
        parsedRows
      );
    } catch (error) {
      console.error(
        "Read payment CSV error:",
        error
      );

      setSelectedFile(null);
      setRows([]);

      await Swal.fire({
        icon: "error",
        title:
          "Unable to Read CSV",
        text:
          error?.message ||
          "The selected CSV file could not be read.",
      });
    } finally {
      setLoadingFile(false);
    }
  };

  const handleFileInputChange = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    handleFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    const file =
      event.dataTransfer.files?.[0];

    handleFile(file);
  };

  const downloadTemplate = () => {
    const template = [
      [
        "student_id",
        "school_year",
        "semester",
        "amount_due",
        "amount_paid",
        "balance",
        "payment_status",
        "reference_number",
        "remarks",
      ].join(","),
      [
        "20232007",
        "2026-2027",
        "1st Semester",
        "25000",
        "25000",
        "0",
        "Cleared",
        "OR-000123",
        "Fully paid",
      ].join(","),
      [
        "20232282",
        "2026-2027",
        "1st Semester",
        "25000",
        "20000",
        "5000",
        "With Balance",
        "OR-000124",
        "Remaining balance",
      ].join(","),
    ].join("\n");

    const blob = new Blob(
      [template],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      "smartclear-payment-import-template.csv";

    document.body.appendChild(
      anchor
    );

    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  const importRecords = async () => {
    const readyRows =
      rows.filter(
        (row) =>
          row.importStatus ===
          "Ready"
      );

    if (readyRows.length === 0) {
      await Swal.fire({
        icon: "warning",
        title:
          "No Valid Records",
        text:
          "There are no valid payment records ready to import.",
      });

      return;
    }

    const confirmation =
      await Swal.fire({
        icon: "question",
        title:
          "Import Payment Records?",
        html: `
          <div style="text-align:left;line-height:1.7">
            <p><strong>${readyRows.length}</strong> valid record(s) will be imported.</p>
            ${
              summary.notFound > 0
                ? `<p style="margin-top:8px;color:#b91c1c"><strong>${summary.notFound}</strong> student(s) were not found and will be skipped.</p>`
                : ""
            }
            ${
              summary.invalid > 0
                ? `<p style="margin-top:8px;color:#b45309"><strong>${summary.invalid}</strong> invalid row(s) will be skipped.</p>`
                : ""
            }
            <p style="margin-top:10px">Existing records for the same student, school year, and semester will be updated.</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText:
          "Import Records",
        confirmButtonColor:
          "#047857",
        cancelButtonText:
          "Cancel",
      });

    if (
      !confirmation.isConfirmed
    ) {
      return;
    }

    try {
      setImporting(true);

      const payload =
        readyRows.map((row) => ({
          student_id:
            row.matchedStudent.id,
          school_year:
            row.school_year,
          semester:
            row.semester,
          amount_due:
            row.amount_due,
          amount_paid:
            row.amount_paid,
          balance:
            row.balance,
          payment_status:
            row.payment_status,
          reference_number:
            row.reference_number ||
            null,
          remarks:
            row.remarks || null,
          imported_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        }));

      const {
        error,
      } = await supabase
        .from("payment_records")
        .upsert(payload, {
          onConflict:
            "student_id,school_year,semester",
        });

      if (error) throw error;

      await Swal.fire({
        icon: "success",
        title:
          "Payment Records Imported",
        text:
          `${payload.length} payment record(s) were imported successfully.`,
      });

      resetImport();

      if (onImported) {
        await onImported();
      }
    } catch (error) {
      console.error(
        "Import payment records error:",
        error
      );

      await Swal.fire({
        icon: "error",
        title:
          "Import Failed",
        text:
          error?.message ||
          "The payment records could not be imported.",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-xl text-emerald-300">
              <FaFileCsv />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                Treasurer / Cashier
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Import Payment Records
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Export the existing Treasurer Excel sheet as CSV, then upload it here. SmartClear matches each row using the Student ID before saving the financial record.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
            aria-label="Close import"
          >
            <FaTimes />
          </button>
        </div>

        <div className="max-h-[calc(94vh-120px)] overflow-y-auto p-6">
          <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() =>
                  setDragging(false)
                }
                onDrop={handleDrop}
                className={`flex min-h-[230px] flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition ${
                  dragging
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-300 bg-slate-50"
                }`}
              >
                <FaFileUpload className="text-5xl text-emerald-600" />

                <h3 className="mt-4 text-xl font-black text-slate-900">
                  Drop CSV file here
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  Required columns: Student ID, School Year, Semester, Amount Due, and Amount Paid.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={
                    handleFileInputChange
                  }
                  disabled={
                    loadingFile ||
                    validating ||
                    importing
                  }
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    loadingFile ||
                    validating ||
                    importing
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingFile ||
                  validating ? (
                    <FaSyncAlt className="animate-spin" />
                  ) : (
                    <FaFileUpload />
                  )}
                  Choose CSV File
                </button>

                {selectedFile && (
                  <div className="mt-4 flex max-w-full items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
                    <FaFileCsv className="shrink-0 text-emerald-600" />
                    <span className="truncate">
                      {selectedFile.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="font-black text-blue-900">
                  CSV Template
                </h3>

                <p className="mt-2 text-sm leading-6 text-blue-800">
                  You may use the template first, or rename the columns in the Treasurer spreadsheet to the supported headers.
                </p>

                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
                >
                  <FaDownload />
                  Download Template
                </button>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <FaExclamationTriangle className="mt-1 shrink-0 text-amber-600" />

                  <div>
                    <p className="font-black text-amber-900">
                      First version: CSV
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      In Excel, use Save As → CSV. Direct .xlsx upload can be added after this importer is tested.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {rows.length > 0 && (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: "Rows Found",
                    value: summary.total,
                    icon: <FaFileCsv />,
                    tone:
                      "bg-slate-50 text-slate-700",
                  },
                  {
                    label: "Ready to Import",
                    value: summary.ready,
                    icon: <FaCheckCircle />,
                    tone:
                      "bg-emerald-50 text-emerald-700",
                  },
                  {
                    label: "Student Not Found",
                    value: summary.notFound,
                    icon: <FaTimesCircle />,
                    tone:
                      "bg-red-50 text-red-700",
                  },
                  {
                    label: "Invalid Rows",
                    value: summary.invalid,
                    icon: (
                      <FaExclamationTriangle />
                    ),
                    tone:
                      "bg-amber-50 text-amber-700",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl border border-slate-200 p-4 ${item.tone}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide opacity-70">
                          {item.label}
                        </p>
                        <p className="mt-1 text-2xl font-black">
                          {item.value}
                        </p>
                      </div>

                      <div className="text-xl">
                        {item.icon}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-black text-slate-900">
                      Import Preview
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Only rows marked Ready will be saved.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={resetImport}
                    disabled={importing}
                    className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    Clear File
                  </button>
                </div>

                <div className="max-h-[420px] overflow-auto">
                  <table className="min-w-full">
                    <thead className="sticky top-0 z-10 bg-white shadow-sm">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                          Row
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                          Student
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                          Cycle
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                          Due
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                          Paid
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                          Balance
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                          Import Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rows.map((row) => (
                        <tr
                          key={`${row.sourceRow}-${row.student_id}-${row.school_year}-${row.semester}`}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-4 py-4 text-sm font-semibold text-slate-500">
                            {row.sourceRow}
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-black text-slate-900">
                              {row.matchedStudent?.full_name ||
                                row.student_id ||
                                "Missing Student ID"}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {row.student_id}
                              {row.matchedStudent?.course
                                ? ` • ${row.matchedStudent.course}`
                                : ""}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-bold text-slate-700">
                              {row.semester || "N/A"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {row.school_year || "N/A"}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-right font-semibold text-slate-700">
                            {Number.isFinite(
                              row.amount_due
                            )
                              ? formatCurrency(
                                  row.amount_due
                                )
                              : "Invalid"}
                          </td>

                          <td className="px-4 py-4 text-right font-semibold text-slate-700">
                            {Number.isFinite(
                              row.amount_paid
                            )
                              ? formatCurrency(
                                  row.amount_paid
                                )
                              : "Invalid"}
                          </td>

                          <td className="px-4 py-4 text-right">
                            <p
                              className={`font-black ${
                                Number(row.balance) > 0
                                  ? "text-amber-700"
                                  : "text-emerald-700"
                              }`}
                            >
                              {Number.isFinite(
                                row.balance
                              )
                                ? formatCurrency(
                                    row.balance
                                  )
                                : "Invalid"}
                            </p>

                            {row.importStatus === "Ready" && (
                              <p className="mt-1 text-xs font-semibold text-slate-400">
                                {row.payment_status}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${statusBadgeClass(
                                row.importStatus
                              )}`}
                            >
                              {row.importStatus}
                            </span>

                            {row.validationErrors?.length > 0 && (
                              <p className="mt-2 max-w-xs text-xs leading-5 text-amber-700">
                                {row.validationErrors.join(
                                  " "
                                )}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={importRecords}
              disabled={
                importing ||
                validating ||
                summary.ready === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? (
                <>
                  <FaSyncAlt className="animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FaFileUpload />
                  Import {summary.ready || ""} Record
                  {summary.ready === 1
                    ? ""
                    : "s"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentRecordsImport;
