"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Mirrors ALLOWED_FROM in app/api/admin/orders/[id]/route.ts — admin can only
// ever ship, deliver, or cancel, and only from the statuses listed here.
// "pending" / "processing" are set exclusively by checkout_verified_order();
// there is no manual control to set an order back into those states.
// "paid" is only ever seen on orders created before this system existed —
// it gets the same actions as "processing" so those legacy rows aren't stuck.
const NEXT_ACTIONS: Record<string, { status: "shipped" | "delivered" | "cancelled"; label: string; confirm?: boolean }[]> = {
  pending:    [{ status: "cancelled", label: "Cancel Order", confirm: true }],
  paid:       [{ status: "shipped", label: "Mark as Shipped" }, { status: "cancelled", label: "Cancel Order", confirm: true }],
  processing: [{ status: "shipped", label: "Mark as Shipped" }, { status: "cancelled", label: "Cancel Order", confirm: true }],
  shipped:    [{ status: "delivered", label: "Mark as Delivered" }],
};

const COLOR: Record<string, string> = {
  pending:    "bg-amber-50 text-amber-700 border-amber-200",
  paid:       "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-purple-50 text-purple-700 border-purple-200",
  shipped:    "bg-sky-50 text-sky-700 border-sky-200",
  delivered:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:  "bg-red-50 text-red-600 border-red-200",
};

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

  const handleAction = async (next: string, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const prev = status;
    setSaving(true);
    setStatus(next);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      setStatus(prev);
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Failed to update status — please try again.");
    } else {
      router.refresh();
    }
    setSaving(false);
  };

  const actions = NEXT_ACTIONS[status] ?? [];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${COLOR[status] ?? COLOR.pending}`}>
        {status}
      </span>

      {actions.map((action) => (
        <button
          key={action.status}
          onClick={() =>
            handleAction(
              action.status,
              action.confirm ? `Cancel this order? This cannot be undone from here.` : undefined
            )
          }
          disabled={saving}
          className="text-xs font-medium px-2.5 py-1 rounded-full border border-gray-300 text-gray-700
                     hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
