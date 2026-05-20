"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"] as const;

export default function AdminOrderStatus({
  orderId,
  current,
}: {
  orderId: string;
  current: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(current);
  const [saving, setSaving] = useState(false);

  const handleChange = async (next: string) => {
    if (next === status) return;
    setSaving(true);
    await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setStatus(next);
    setSaving(false);
    router.refresh();
  };

  const COLOR: Record<string, string> = {
    pending:    "bg-amber-50 text-amber-700 border-amber-200",
    paid:       "bg-blue-50 text-blue-700 border-blue-200",
    processing: "bg-purple-50 text-purple-700 border-purple-200",
    shipped:    "bg-sky-50 text-sky-700 border-sky-200",
    delivered:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled:  "bg-red-50 text-red-600 border-red-200",
  };

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer focus:outline-none disabled:opacity-50 ${COLOR[status] ?? COLOR.pending}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
