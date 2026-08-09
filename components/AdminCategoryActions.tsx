"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function AdminCategoryActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm(`Delete category "${name}"? This can't be undone.`)) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Couldn't delete this category.");
      setDeleting(false);
      return;
    }
    setDeleting(false);
    router.refresh();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/admin/categories/${id}/edit`}
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
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 max-w-[220px] text-right">{error}</p>}
    </div>
  );
}
