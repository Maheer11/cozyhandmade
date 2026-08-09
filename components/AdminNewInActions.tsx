"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function AdminNewInActions({ id, name, addedToCollections }: { id: string; name: string; addedToCollections: boolean }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Remove "${name}" from New In? This can't be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/admin/new-in/${id}`, { method: "DELETE" });
    setDeleting(false);
    router.refresh();
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {addedToCollections ? (
        <span
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg"
          title="Already duplicated into Collections. Editing this item will not update that product."
        >
          ✓ In Collections
        </span>
      ) : (
        <Link
          href={`/admin/products/new?fromNewIn=${id}`}
          className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#8B2035" }}
          title="Create a matching product in Collections, keeping this New In item as-is"
        >
          Add to Collections
        </Link>
      )}
      <Link
        href={`/admin/new-in/${id}/edit`}
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
