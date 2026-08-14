"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function AdminFeaturedPieceActions({
  id,
  name,
  addedToCollections,
  productId,
}: {
  id: string;
  name: string;
  addedToCollections: boolean;
  productId?: string | null;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Remove "${name}" from Featured Pieces? This can't be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/admin/featured-pieces/${id}`, { method: "DELETE" });
    setDeleting(false);
    router.refresh();
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {productId ? (
        // Already linked — stock lives on that product, so offer a way through
        // to it rather than an action that would create a second copy.
        <Link
          href={`/admin/products/${productId}/edit`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700
                     bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          title="This piece takes its stock from this product. Open it to change stock."
        >
          ✓ Linked product
        </Link>
      ) : addedToCollections ? (
        // Legacy rows: copied into Collections before migration 013, but never
        // linked, so the two still hold independent stock.
        <Link
          href={`/admin/featured-pieces/${id}/edit`}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700
                     bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
          title="Copied into Collections but not linked — stock is tracked separately. Open to pick the product."
        >
          ⚠ Needs linking
        </Link>
      ) : (
        <Link
          href={`/admin/products/new?fromFeaturedPiece=${id}`}
          className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#8B2035" }}
          title="Create the matching product and link this piece to it, so they share one stock count"
        >
          Create &amp; link product
        </Link>
      )}
      <Link
        href={`/admin/featured-pieces/${id}/edit`}
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
