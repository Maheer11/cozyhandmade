"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function AdminReviewActions({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Remove this review${label ? ` (${label})` : ""}? This can't be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    setDeleting(false);
    router.refresh();
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/reviews/${id}/edit`}
        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100
                   hover:bg-gray-200 rounded-lg transition-colors"
      >
        Edit
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50
                   hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
      >
        {deleting ? "Removing…" : "Remove"}
      </button>
    </div>
  );
}
