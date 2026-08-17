"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { DbCategory } from "@/lib/db-categories";

interface FormState {
  name: string;
  description: string;
  image: string;
  display_order: string;
}

function defaultState(category?: DbCategory): FormState {
  return {
    name:           category?.name           ?? "",
    description:    category?.description    ?? "",
    image:          category?.image          ?? "",
    display_order:  category?.display_order?.toString() ?? "0",
  };
}

// Same unsigned-upload Cloudinary pattern as AdminFeaturedPieceForm.tsx / AdminProductForm.tsx.
function optimizeCloudinaryUrl(url: string): string {
  return url.replace("/upload/", "/upload/f_auto,q_auto,w_1600,c_limit/");
}

function uploadFile(file: File, onProgress: (pct: number) => void): Promise<string | null> {
  return new Promise((resolve) => {
    const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error("Cloudinary env vars not set");
      resolve(null);
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", uploadPreset);
    body.append("folder", "category");

    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        const url = data.secure_url as string | undefined;
        resolve(url ? optimizeCloudinaryUrl(url) : null);
      } else {
        console.error("Cloudinary upload failed", xhr.responseText);
        resolve(null);
      }
    };
    xhr.onerror = () => { console.error("Cloudinary upload error"); resolve(null); };
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.send(body);
  });
}

export default function AdminCategoryForm({ category }: { category?: DbCategory }) {
  const isEdit = !!category;
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(defaultState(category));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setProgress(0);
    setUploading(true);
    const url = await uploadFile(file, setProgress);
    if (url) set("image", url);
    else setUploadError("Upload failed. Check your connection and try again.");
    setUploading(false);
    setProgress(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Name is required."); return; }

    setSaving(true);
    const payload = {
      name:           form.name.trim(),
      description:    form.description.trim(),
      image:          form.image.trim(),
      display_order:  parseInt(form.display_order) || 0,
    };

    const res = await fetch(
      isEdit ? `/api/admin/categories/${category!.id}` : "/api/admin/categories",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong, please try again.");
      return;
    }

    router.push("/admin/categories");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {isEdit && (
        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
          ID: <span className="font-mono text-gray-700">{category!.id}</span> is locked, products already reference it.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          placeholder="e.g. Handbags & Totes"
        />
        {!isEdit && form.name.trim() && (
          <p className="text-xs text-gray-400 mt-1.5">
            ID will be: <span className="font-mono">{form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "(none)"}</span>
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          placeholder="Shown under the category name on the Collections page"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Card image <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Leave blank to auto-use the most recently added product&apos;s photo in this category.
          It&apos;ll stay up to date on its own as inventory changes. Upload one here only if you
          want a specific hero shot instead.
        </p>
        <div className="flex items-center gap-4">
          <div
            onClick={() => fileRef.current?.click()}
            className="relative w-28 h-28 shrink-0 rounded-xl border-2 border-dashed border-gray-300
                       bg-gray-50 overflow-hidden cursor-pointer group hover:border-gray-400 transition-colors"
          >
            {form.image ? (
              <Image src={form.image} alt="" fill sizes="112px" className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-1">
                <span className="text-[11px] font-medium text-gray-700">{progress}%</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {form.image && (
              <button
                type="button"
                onClick={() => set("image", "")}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-fit"
              >
                Clear (use auto image)
              </button>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors w-fit"
            >
              {form.image ? "Change image" : "Upload image"}
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        {uploadError && <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Display order</label>
        <p className="text-xs text-gray-400 mb-1.5">Lower number appears first in the Curated Categories slider.</p>
        <input
          type="number"
          value={form.display_order}
          onChange={(e) => set("display_order", e.target.value)}
          className="w-32 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || uploading}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#8B2035" }}
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
