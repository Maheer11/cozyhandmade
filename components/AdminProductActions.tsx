"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

function DeleteModal({
  productName,
  onCancel,
  onConfirm,
  deleting,
}: {
  productName: string;
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!deleting ? onCancel : undefined}
      />

      {/* Modal card */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ backgroundColor: "#8B2035" }} />

        <div className="px-6 py-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
               style={{ backgroundColor: "#FEF2F2" }}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24"
                 stroke="#8B2035" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </div>

          {/* Text */}
          <h2 className="text-center text-lg font-semibold text-gray-900 mb-1">
            Delete Product
          </h2>
          <p className="text-center text-sm text-gray-500 mb-1">
            You&apos;re about to permanently delete
          </p>
          <p className="text-center text-sm font-semibold mb-4 truncate px-2"
             style={{ color: "#8B2035" }}>
            &ldquo;{productName}&rdquo;
          </p>
          <p className="text-center text-xs text-gray-400 mb-6">
            This action cannot be undone. The product will be removed from your store immediately.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium
                         text-gray-700 bg-white hover:bg-gray-50 transition-colors
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                         transition-all disabled:opacity-60 disabled:cursor-not-allowed
                         hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: "#8B2035" }}
            >
              {deleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                            stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Deleting…
                </>
              ) : (
                "Yes, delete"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductActions({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  const handleConfirmDelete = async () => {
    setDeleting(true);
    await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    setDeleting(false);
    setShowModal(false);
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/admin/products/${productId}/edit`}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100
                     hover:bg-gray-200 rounded-lg transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50
                     hover:bg-red-100 rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>

      {showModal && (
        <DeleteModal
          productName={productName}
          onCancel={() => setShowModal(false)}
          onConfirm={handleConfirmDelete}
          deleting={deleting}
        />
      )}
    </>
  );
}
