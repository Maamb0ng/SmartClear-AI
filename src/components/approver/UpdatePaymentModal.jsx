import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  FaCoins,
  FaTimes,
  FaUserGraduate,
  FaMoneyBillWave,
  FaReceipt,
  FaStickyNote,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaWallet,
} from "react-icons/fa";

import { supabase } from "../../services/supabase";

const money = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const cleanNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

function UpdatePaymentModal({
  studentName = "Student",
  studentNumber = "",
  paymentRecord,
  onClose,
  onUpdated,
}) {
  const [amount, setAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const amountDue = cleanNumber(paymentRecord?.amount_due);
  const amountPaid = cleanNumber(paymentRecord?.amount_paid);
  const currentBalance = cleanNumber(paymentRecord?.balance);
  const enteredAmount = cleanNumber(amount);

  const projectedBalance = useMemo(
    () => Math.max(currentBalance - enteredAmount, 0),
    [currentBalance, enteredAmount]
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !saving) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  const handleBackdrop = (event) => {
    if (event.target === event.currentTarget && !saving) {
      onClose?.();
    }
  };

  const handleAmountChange = (event) => {
    const next = event.target.value;

    if (next === "") {
      setAmount("");
      return;
    }

    if (!/^\d*\.?\d{0,2}$/.test(next)) {
      return;
    }

    setAmount(next);
  };

  const submitPayment = async (event) => {
    event.preventDefault();

    if (!paymentRecord?.id) {
      await Swal.fire({
        icon: "warning",
        title: "No Financial Record",
        text: "This student does not have an imported payment record yet.",
      });
      return;
    }

    if (currentBalance <= 0) {
      await Swal.fire({
        icon: "info",
        title: "No Remaining Balance",
        text: "This financial record currently has no remaining balance.",
      });
      return;
    }

    if (!enteredAmount || enteredAmount <= 0) {
      await Swal.fire({
        icon: "warning",
        title: "Enter Payment Amount",
        text: "Payment amount must be greater than zero.",
      });
      return;
    }

    if (enteredAmount > currentBalance) {
      await Swal.fire({
        icon: "warning",
        title: "Amount Exceeds Balance",
        html: `The payment cannot exceed the current balance of <strong>${money(
          currentBalance
        )}</strong>.`,
      });
      return;
    }

    const confirmation = await Swal.fire({
      icon: "question",
      title: "Record this payment?",
      html: `
        <div style="text-align:left;line-height:1.7">
          <div><strong>Student:</strong> ${studentName}</div>
          <div><strong>Payment:</strong> ${money(enteredAmount)}</div>
          <div><strong>Current balance:</strong> ${money(currentBalance)}</div>
          <div><strong>Balance after payment:</strong> ${money(
            projectedBalance
          )}</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Yes, Record Payment",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) return;

    try {
      setSaving(true);

      const { data, error } = await supabase.rpc("record_student_payment", {
        p_payment_record_id: paymentRecord.id,
        p_amount: enteredAmount,
        p_reference_number: referenceNumber.trim() || null,
        p_remarks: remarks.trim() || null,
      });

      if (error) throw error;

      await Swal.fire({
        icon: "success",
        title: "Payment Recorded",
        html: `
          <div style="text-align:left;line-height:1.7">
            <div><strong>Payment:</strong> ${money(
              data?.paymentAmount ?? enteredAmount
            )}</div>
            <div><strong>Total paid:</strong> ${money(
              data?.amountPaid ?? amountPaid + enteredAmount
            )}</div>
            <div><strong>Remaining balance:</strong> ${money(
              data?.balance ?? projectedBalance
            )}</div>
          </div>
        `,
        timer: 2200,
        showConfirmButton: false,
      });

      await onUpdated?.(data);
      onClose?.();
    } catch (error) {
      console.error("Payment update error:", error);

      await Swal.fire({
        icon: "error",
        title: "Unable to Record Payment",
        text:
          error?.message ||
          "The payment could not be saved. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!paymentRecord) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={handleBackdrop}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-5 backdrop-blur md:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <FaMoneyBillWave />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                Treasurer
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Update Payment
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Record an actual payment without changing the Treasurer's
                clearance decision.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => onClose?.()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={submitPayment} className="space-y-6 p-5 md:p-7">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm">
                <FaUserGraduate />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {studentName}
                </p>
                <p className="text-sm text-slate-500">
                  {studentNumber || "Student ID unavailable"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                {paymentRecord.school_year || "School year unavailable"}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
                {paymentRecord.semester || "Semester unavailable"}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <FaCoins />
                Amount Due
              </div>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {money(amountDue)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <FaCheckCircle />
                Amount Paid
              </div>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {money(amountPaid)}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <FaWallet />
                Current Balance
              </div>
              <p className="mt-2 text-lg font-bold text-amber-900">
                {money(currentBalance)}
              </p>
            </div>
          </div>

          {currentBalance <= 0 ? (
            <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <FaCheckCircle className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">No remaining balance</p>
                <p className="mt-1 text-emerald-700">
                  This accounting record is already fully paid. This does not
                  automatically approve the student's clearance step.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label
                  htmlFor="payment-amount"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Amount Paid Now
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500">
                    ₱
                  </span>
                  <input
                    id="payment-amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-9 pr-4 text-lg font-semibold text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>Maximum: {money(currentBalance)}</span>
                  {enteredAmount > 0 && enteredAmount <= currentBalance && (
                    <span className="font-semibold text-emerald-700">
                      New balance: {money(projectedBalance)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="payment-reference"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <FaReceipt className="text-slate-400" />
                  Reference / OR Number
                </label>
                <input
                  id="payment-reference"
                  type="text"
                  value={referenceNumber}
                  onChange={(event) => setReferenceNumber(event.target.value)}
                  placeholder="Example: OR-2026-00125"
                  maxLength={120}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label
                  htmlFor="payment-remarks"
                  className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
                >
                  <FaStickyNote className="text-slate-400" />
                  Remarks
                  <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="payment-remarks"
                  rows={3}
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Example: Partial payment received at cashier."
                  maxLength={500}
                  className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <FaExclamationTriangle className="mt-0.5 shrink-0" />
                <p>
                  Recording a payment only updates the accounting record.
                  Students with a remaining balance may still be cleared
                  separately by the Treasurer through an approved agreement.
                </p>
              </div>
            </>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => onClose?.()}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            {currentBalance > 0 && (
              <button
                type="submit"
                disabled={
                  saving ||
                  enteredAmount <= 0 ||
                  enteredAmount > currentBalance
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Saving Payment...
                  </>
                ) : (
                  <>
                    <FaMoneyBillWave />
                    Record Payment
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default UpdatePaymentModal;
