import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { FaHistory, FaTimes, FaReceipt, FaUserGraduate, FaMoneyBillWave, FaSpinner, FaWallet } from "react-icons/fa";
import { supabase } from "../../services/supabase";

const money = (value) => new Intl.NumberFormat("en-PH", {
  style: "currency", currency: "PHP", minimumFractionDigits: 2,
}).format(Number(value || 0));

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
};

function PaymentHistoryModal({
  studentName = "Student",
  studentNumber = "",
  paymentRecord,
  onClose,
}) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      if (!paymentRecord?.id) {
        if (active) {
          setTransactions([]);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("payment_transactions")
          .select("id, amount, reference_number, remarks, created_at, recorded_by")
          .eq("payment_record_id", paymentRecord.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (active) setTransactions(data || []);
      } catch (error) {
        console.error("Payment history error:", error);
        if (active) setTransactions([]);
        await Swal.fire({
          icon: "error",
          title: "Unable to Load Payment History",
          text: error?.message || "The payment transactions could not be loaded.",
        });
      } finally {
        if (active) setLoading(false);
      }
    };

    loadHistory();
    return () => { active = false; };
  }, [paymentRecord?.id]);

  useEffect(() => {
    const keydown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [onClose]);

  if (!paymentRecord) return null;

  const balance = Number(paymentRecord.balance || 0);
  const amountPaid = Number(paymentRecord.amount_paid || 0);
  const amountDue = Number(paymentRecord.amount_due || 0);

  return (
    <div
      className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 md:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <FaHistory />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Treasurer / Cashier</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Payment History</h2>
              <p className="mt-1 text-sm text-slate-500">Recorded SmartClear payment transactions.</p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100">
            <FaTimes />
          </button>
        </div>

        <div className="max-h-[calc(92vh-105px)] overflow-y-auto p-5 md:p-7">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm"><FaUserGraduate /></div>
              <div>
                <p className="font-semibold text-slate-900">{studentName}</p>
                <p className="text-sm text-slate-500">{studentNumber || "Student ID unavailable"}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
              <span className="rounded-full border bg-white px-3 py-1.5">{paymentRecord.school_year || "—"}</span>
              <span className="rounded-full border bg-white px-3 py-1.5">{paymentRecord.semester || "—"}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Amount Due</p>
              <p className="mt-2 text-lg font-bold">{money(amountDue)}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase text-emerald-700">Total Paid</p>
              <p className="mt-2 text-lg font-bold text-emerald-900">{money(amountPaid)}</p>
            </div>
            <div className={`rounded-2xl border p-4 ${balance > 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
              <p className={`text-xs font-semibold uppercase ${balance > 0 ? "text-amber-700" : "text-emerald-700"}`}>Remaining Balance</p>
              <p className={`mt-2 text-lg font-bold ${balance > 0 ? "text-amber-900" : "text-emerald-900"}`}>{money(balance)}</p>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">Transaction History</h3>
                <p className="text-sm text-slate-500">{transactions.length} recorded payment{transactions.length === 1 ? "" : "s"}</p>
              </div>
              <FaReceipt className="text-slate-400" />
            </div>

            {loading ? (
              <div className="flex min-h-44 items-center justify-center rounded-2xl border bg-slate-50 text-slate-500">
                <div className="text-center"><FaSpinner className="mx-auto mb-3 animate-spin" />Loading payment history...</div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-slate-50 px-5 py-10 text-center">
                <p className="font-semibold text-slate-700">No payment transactions yet</p>
                <p className="mt-1 text-sm text-slate-500">Imported totals can exist without history. Payments recorded through SmartClear will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx, index) => (
                  <div key={tx.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                      <div className="flex gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><FaMoneyBillWave /></div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-900">Payment #{transactions.length - index}</p>
                            {tx.reference_number && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">OR: {tx.reference_number}</span>}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{formatDateTime(tx.created_at)}</p>
                          {tx.remarks && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{tx.remarks}</p>}
                        </div>
                      </div>
                      <p className="shrink-0 text-lg font-black text-emerald-700">+ {money(tx.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <FaWallet className="mt-0.5 shrink-0" />
            <p>Payment history is separate from the Treasurer's clearance decision. A student may still be approved with an agreement while a balance remains.</p>
          </div>

          <div className="mt-6 flex justify-end border-t pt-5">
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentHistoryModal;
