"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { DbProduct } from "@/lib/db-products";
import { categories } from "@/lib/products";

interface FormState {
  name: string;
  price: string;
  original_price: string;
  category: string;
  description: string;
  details: string;
  tags: string;
  stock_quantity: string;
  in_stock: boolean;
  featured: boolean;
  image: string;
  images: string[];
}

function defaultState(product?: DbProduct): FormState {
  return {
    name:           product?.name           ?? "",
    price:          product?.price.toString()         ?? "",
    original_price: product?.original_price?.toString() ?? "",
    category:       product?.category       ?? categories[0]?.id ?? "",
    description:    product?.description    ?? "",
    details:        product?.details?.join("\n")      ?? "",
    tags:           product?.tags?.join(", ")         ?? "",
    stock_quantity: product?.stock_quantity?.toString() ?? "0",
    in_stock:       product?.in_stock       ?? true,
    featured:       product?.featured       ?? false,
    image:          product?.image          ?? "",
    images:         product?.images         ?? [],
  };
}

export default function AdminProductForm({ product }: { product?: DbProduct }) {
  const isEdit = !!product;
  const router = useRouter();
  const fileRef  = useRef<HTMLInputElement>(null);
  const moreRef  = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(defaultState(product));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FormState, v: string | boolean | string[]) =>
    setForm((f) => ({ ...f, [k]: v }));

  /* ── Image upload helpers ── */
  async function uploadFile(file: File): Promise<string | null> {
    const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.error("Cloudinary env vars not set");
      return null;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("upload_preset", uploadPreset);
    body.append("folder", "product-images");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body }
    );

    if (!res.ok) { console.error("Cloudinary upload failed", await res.text()); return null; }
    const data = await res.json();
    return (data.secure_url as string) ?? null;
  }

  async function handleMainImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadFile(file);
    if (url) set("image", url);
    setUploading(false);
  }

  async function handleMoreImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const urls = await Promise.all(files.map(uploadFile));
    const valid = urls.filter(Boolean) as string[];
    set("images", [...form.images, ...valid]);
    setUploading(false);
  }

  function removeImage(idx: number) {
    set("images", form.images.filter((_, i) => i !== idx));
  }

  /* ── Submit ── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim())  { setError("Product name is required."); return; }
    if (!form.price.trim()) { setError("Price is required."); return; }
    if (!form.image.trim()) { setError("Upload at least one image."); return; }

    setSaving(true);
    const payload = {
      name:           form.name.trim(),
      price:          parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      category:       form.category,
      description:    form.description.trim(),
      details:        form.details.split("\n").map((s) => s.trim()).filter(Boolean),
      tags:           form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      // in_stock is a generated column (stock_quantity > 0) — not sent directly
      // "In Stock" checkbox drives stock_quantity: unchecked → 0, checked → quantity
      stock_quantity: form.in_stock ? (parseInt(form.stock_quantity) || 1) : 0,
      featured:       form.featured,
      image:          form.image,
      images:         form.images.length ? form.images : [form.image],
    };

    const url    = isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products";
    const method = isEdit ? "PATCH" : "POST";
    const res    = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      setSaving(false);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  /* ── UI ── */
  const inputCls = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: main fields ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Name */}
          <div>
            <label className={labelCls}>Product Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputCls}
              placeholder="e.g. Chunky Cable Knit Blanket"
            />
          </div>

          {/* Price row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Price (₦) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className={inputCls}
                placeholder="150000"
                min={0}
              />
            </div>
            <div>
              <label className={labelCls}>Original Price (₦) — for sale</label>
              <input
                type="number"
                value={form.original_price}
                onChange={(e) => set("original_price", e.target.value)}
                className={inputCls}
                placeholder="Leave blank if not on sale"
                min={0}
              />
            </div>
          </div>

          {/* Category + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category *</label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={inputCls}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Stock Quantity</label>
              <input
                type="number"
                value={form.stock_quantity}
                onChange={(e) => set("stock_quantity", e.target.value)}
                className={inputCls}
                min={0}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className={inputCls}
              placeholder="Describe the product — materials, dimensions, care instructions…"
            />
          </div>

          {/* Details — one per line */}
          <div>
            <label className={labelCls}>Details (one bullet per line)</label>
            <textarea
              value={form.details}
              onChange={(e) => set("details", e.target.value)}
              rows={4}
              className={inputCls}
              placeholder={"100% merino wool\nHand wash cold\nQueen size: 200cm × 200cm"}
            />
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Tags (comma separated)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              className={inputCls}
              placeholder="wool, blanket, merino, gift"
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.in_stock}
                onChange={(e) => set("in_stock", e.target.checked)}
                className="w-4 h-4 rounded accent-red-700"
              />
              <span className="text-sm text-gray-700 font-medium">In Stock</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
                className="w-4 h-4 rounded accent-red-700"
              />
              <span className="text-sm text-gray-700 font-medium">Featured on homepage</span>
            </label>
          </div>
        </div>

        {/* ── Right: images ── */}
        <div className="space-y-5">

          {/* Main image */}
          <div>
            <label className={labelCls}>Main Image *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="relative cursor-pointer aspect-square rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 transition-colors overflow-hidden flex items-center justify-center"
            >
              {form.image ? (
                <Image src={form.image} alt="Main" fill className="object-cover" />
              ) : (
                <div className="text-center p-4">
                  <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-xs text-gray-400">{uploading ? "Uploading…" : "Click to upload"}</p>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <span className="text-xs text-gray-500">Uploading…</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleMainImage} />
            {form.image && (
              <input
                type="text"
                value={form.image}
                onChange={(e) => set("image", e.target.value)}
                className={`${inputCls} mt-2 text-xs`}
                placeholder="or paste image URL"
              />
            )}
            {!form.image && (
              <input
                type="text"
                onChange={(e) => set("image", e.target.value)}
                className={`${inputCls} mt-2 text-xs`}
                placeholder="or paste image URL directly"
              />
            )}
          </div>

          {/* Additional images */}
          <div>
            <label className={labelCls}>Additional Images</label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {form.images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                  <Image src={img} alt="" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >×</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => moreRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 hover:border-gray-300 text-gray-300 hover:text-gray-400 text-2xl flex items-center justify-center transition-colors"
              >+</button>
            </div>
            <input ref={moreRef} type="file" accept="image/*" multiple className="hidden" onChange={handleMoreImages} />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || uploading}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "#8B2035" }}
        >
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
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
