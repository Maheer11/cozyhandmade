"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export interface ReviewItem {
  id: string;
  screenshot: string;
  platform: "whatsapp" | "instagram";
  customer_label: string | null;
  location: string | null;
  review_date: string | null;
  display_order: number;
}

interface FormState {
  screenshot: string;
  platform: "whatsapp" | "instagram";
  customer_label: string;
  location: string;
  review_date: string;
  display_order: string;
}

function defaultState(item?: ReviewItem): FormState {
  return {
    screenshot:     item?.screenshot     ?? "",
    platform:       item?.platform       ?? "whatsapp",
    customer_label: item?.customer_label ?? "",
    location:       item?.location       ?? "",
    review_date:    item?.review_date    ?? "",
    display_order:  item?.display_order?.toString() ?? "0",
  };
}

// Cloudinary stores the raw original upload — inserting a delivery
// transformation into the returned URL keeps the stored URL itself small
// (auto format, auto quality, capped width), same fix applied to product
// and Featured Pieces image uploads.
function optimizeCloudinaryUrl(url: string): string {
  return url.replace("/upload/", "/upload/f_auto,q_auto,w_1200,c_limit/");
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
    body.append("folder", "reviews");

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

export default function AdminReviewForm({ item }: { item?: ReviewItem }) {
  const isEdit = !!item;
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultState(item));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setProgress(0);
    setUploading(true);
    const url = await uploadFile(file, setProgress);
    if (url) set("screenshot", url);
    else setUploadError("Upload failed. Check your connection and try again.");
    setUploading(false);
    setProgress(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.screenshot.trim()) { setError("Upload the review screenshot."); return; }

    setSaving(true);
    const payload = {
      screenshot:     form.screenshot,
      platform:       form.platform,
      customer_label: form.customer_label.trim() || null,
      location:       form.location.trim() || null,
      review_date:    form.review_date.trim() || null,
      display_order:  parseInt(form.display_order) || 0,
    };

    const res = await fetch(
      isEdit ? `/api/admin/reviews/${item!.id}` : "/api/admin/reviews",
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

    router.push("/admin/reviews");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Screenshot</label>
        <p className="text-xs text-gray-400 mb-2">
          The real customer message/screenshot, no fabricated quotes.
        </p>
        <div
          onClick={() => fileRef.current?.click()}
          className="relative w-full max-w-[220px] aspect-[9/14] rounded-xl border-2 border-dashed
                     border-gray-300 bg-gray-50 overflow-hidden cursor-pointer group
                     hover:border-gray-400 transition-colors"
        >
          {form.screenshot ? (
            <>
              <Image src={form.screenshot} alt="Review screenshot" fill sizes="220px" className="object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors
                              flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="text-white text-xs font-medium">Change</span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-1.5">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-xs">Upload screenshot</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-2">
              <span className="text-xs font-medium text-gray-700">{progress}%</span>
              <div className="w-2/3 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gray-700 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        {uploadError && (
          <p className="text-xs text-red-600 mt-1.5">
            {uploadError} <button type="button" onClick={() => fileRef.current?.click()} className="underline">Try again</button>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
          <select
            value={form.platform}
            onChange={(e) => set("platform", e.target.value as "whatsapp" | "instagram")}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram DM</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Customer name (optional)</label>
          <input
            type="text"
            value={form.customer_label}
            onChange={(e) => set("customer_label", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder="e.g. Sarah M."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder="e.g. London"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date label (optional)</label>
          <input
            type="text"
            value={form.review_date}
            onChange={(e) => set("review_date", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder="e.g. 2 weeks ago"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display order</label>
          <input
            type="number"
            value={form.display_order}
            onChange={(e) => set("display_order", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity
                   hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#8B2035" }}
      >
        {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Review"}
      </button>
    </form>
  );
}
