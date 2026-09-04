"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { currentAcademicYear } from "@/lib/academic-year";
import { Card, EmptyState } from "@/components/card";
import type { FeeType } from "@/types/db";

const FEE_TYPES: FeeType[] = ["TUITION", "BUS", "LIBRARY", "OTHER"];

interface Fee {
  id: string;
  fee_type: FeeType;
  amount: number;
  due_date: string;
  fee_transactions: { amount_paid: number }[];
}

export function FeeManager({ students }: { students: { id: string; label: string }[] }) {
  const supabase = createClient();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [fees, setFees] = useState<Fee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [feeType, setFeeType] = useState<FeeType>("TUITION");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [payAmount, setPayAmount] = useState<Record<string, string>>({});

  async function loadFees(id: string) {
    const { data } = await supabase
      .from("fees")
      .select("id, fee_type, amount, due_date, fee_transactions(amount_paid)")
      .eq("student_id", id)
      .order("due_date");
    setFees((data as unknown as Fee[]) ?? []);
  }

  useEffect(() => {
    if (!studentId) return;
    let cancelled = false;

    supabase
      .from("fees")
      .select("id, fee_type, amount, due_date, fee_transactions(amount_paid)")
      .eq("student_id", studentId)
      .order("due_date")
      .then(({ data }) => {
        if (!cancelled) setFees((data as unknown as Fee[]) ?? []);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function handleAddFee() {
    if (!amount || !dueDate) {
      setError("Enter an amount and due date.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error } = await supabase.from("fees").insert({
      student_id: studentId,
      fee_type: feeType,
      amount: Number(amount),
      due_date: dueDate,
      academic_year: currentAcademicYear(),
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setAmount("");
    setDueDate("");
    loadFees(studentId);
  }

  async function handleRecordPayment(feeId: string) {
    const value = Number(payAmount[feeId]);
    if (!value || value <= 0) return;

    await supabase.from("fee_transactions").insert({
      fee_id: feeId,
      amount_paid: value,
    });
    setPayAmount((prev) => ({ ...prev, [feeId]: "" }));
    loadFees(studentId);
  }

  function statusFor(fee: Fee) {
    const paid = fee.fee_transactions.reduce((s, t) => s + Number(t.amount_paid), 0);
    if (paid >= Number(fee.amount)) return { label: "PAID", paid };
    if (new Date(fee.due_date) < new Date()) return { label: "OVERDUE", paid };
    return { label: "PENDING", paid };
  }

  return (
    <div className="space-y-6">
      <Card title="Select student">
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Card>

      <Card title="Assign a fee">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Type</label>
            <select
              value={feeType}
              onChange={(e) => setFeeType(e.target.value as FeeType)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {FEE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Amount (₹)</label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddFee}
              disabled={loading}
              className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add fee"}
            </button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>

      <Card title="Fees for this student">
        {fees.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Due</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2">Record payment</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((f) => {
                const { label, paid } = statusFor(f);
                return (
                  <tr key={f.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{f.fee_type}</td>
                    <td className="py-2 pr-4">
                      ₹{paid.toLocaleString()} / ₹{Number(f.amount).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4">{f.due_date}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          label === "PAID"
                            ? "bg-green-100 text-green-700"
                            : label === "OVERDUE"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="py-2">
                      {label !== "PAID" && (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="Amount"
                            value={payAmount[f.id] ?? ""}
                            onChange={(e) =>
                              setPayAmount((prev) => ({ ...prev, [f.id]: e.target.value }))
                            }
                            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs"
                          />
                          <button
                            onClick={() => handleRecordPayment(f.id)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
                          >
                            Record
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No fees assigned to this student yet." />
        )}
      </Card>
    </div>
  );
}
