"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export interface FeaturedPieceItem {
  id: string;
  name: string;
  product_image: string;
  lifestyle_image: string | null;
  sold_out: boolean;
  is_handmade: boolean;
  display_order: number;
  price: number;
  discount_price: number | null;
  colors: string[];
  sizes: string[];
  description: string | null;
  sku: string | null;
  variant_price: Record<string, number>;
  shipping_weight_grams: number | null;
  added_to_collections: boolean;
  show_on_homepage: boolean;
  /**
   * The product this piece draws its stock from. Featured Pieces have had no
   * stock counter of their own since migration 013 — see
   * lib/featured-piece-stock.ts.
   */
  product_id: string | null;
}

/** The products the picker offers, loaded server-side by the pages below. */
export interface StockProductOption {
  id: string;
  name: string;
  stock_quantity: number;
}

interface FormState {
  name: string;
  product_image: string;
  lifestyle_image: string;
  sold_out: boolean;
  is_handmade: boolean;
  show_on_homepage: boolean;
  display_order: string;
  price: string;
  discount_price: string;
  colors: string; // comma-separated in the UI, split on submit
  sizes: string;  // comma-separated in the UI, split on submit
  description: string;
  sku: string;
  product_id: string; // "" = nothing picked yet
  variantPrice: Record<string, string>; // size -> price string, e.g. "With Stand": "215.00"
  shipping_weight_grams: string;
}

function defaultState(item?: FeaturedPieceItem): FormState {
  return {
    name:            item?.name            ?? "",
    product_image:   item?.product_image   ?? "",
    lifestyle_image: item?.lifestyle_image ?? "",
    sold_out:        item?.sold_out        ?? false,
    is_handmade:     item?.is_handmade     ?? true,
    show_on_homepage: item?.show_on_homepage ?? false,
    display_order:   item?.display_order?.toString() ?? "0",
    price:           item?.price?.toString() ?? "",
    discount_price:  item?.discount_price?.toString() ?? "",
    colors:          item?.colors?.join(", ") ?? "",
    sizes:           item?.sizes?.join(", ")  ?? "",
    description:     item?.description ?? "",
    sku:             item?.sku ?? "",
    product_id:      item?.product_id ?? "",
    variantPrice:    Object.fromEntries(
      Object.entries(item?.variant_price ?? {}).map(([k, v]) => [k, v.toString()])
    ),
    shipping_weight_grams: item?.shipping_weight_grams?.toString() ?? "",
  };
}

// Cloudinary stores the raw original upload — phone photos are often 5-20MB.
// Every place that shows it (this preview, the homepage rail, the detail
// page) then has to fetch/transcode that full-size original on first load,
// which is exactly the lag / blank-flash you get right after uploading:
// already-cached images are fine, freshly uploaded ones stall until Next's
// image optimizer finishes processing the huge source file. Inserting a
// Cloudinary delivery transformation into the URL fixes this at the source —
// auto format (WebP/AVIF), auto quality, capped width — so the stored URL
// itself is always small, not just the on-the-fly Next.js optimized copy.
function optimizeCloudinaryUrl(url: string): string {
  return url.replace("/upload/", "/upload/f_auto,q_auto,w_1600,c_limit/");
}

// Same unsigned-upload Cloudinary pattern as AdminProductForm.tsx, just a
// different destination folder so Featured Pieces assets stay organized.
function uploadFile(file: File, folder: string, onProgress: (pct: number) => void): Promise<string | null> {
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
    body.append("folder", folder);

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

function ImageDropzone({
  label,
  hint,
  url,
  onUploaded,
  folder,
}: {
  label: string;
  hint: string;
  url: string;
  onUploaded: (url: string) => void;
  folder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setProgress(0);
    setUploading(true);
    const uploadedUrl = await uploadFile(file, folder, setProgress);
    if (uploadedUrl) onUploaded(uploadedUrl);
    else setError("Upload failed. Check your connection and try again.");
    setUploading(false);
    setProgress(0);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <p className="text-xs text-gray-400 mb-2">{hint}</p>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative w-full aspect-square max-w-[220px] rounded-xl border-2 border-dashed
                   border-gray-300 bg-gray-50 overflow-hidden cursor-pointer group
                   hover:border-gray-400 transition-colors"
      >
        {url ? (
          <>
            <Image src={url} alt={label} fill sizes="220px" className="object-cover" />
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
            <span className="text-xs">Upload image</span>
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
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {error && (
        <p className="text-xs text-red-600 mt-1.5">
          {error} <button type="button" onClick={() => inputRef.current?.click()} className="underline">Try again</button>
        </p>
      )}
    </div>
  );
}

export default function AdminFeaturedPieceForm({
  item,
  products,
}: {
  item?: FeaturedPieceItem;
  /** Every product, for the stock-source picker. Loaded server-side by the page. */
  products: StockProductOption[];
}) {
  const isEdit = !!item;
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultState(item));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof Omit<FormState, "variantPrice">, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const setVariantPrice = (size: string, v: string) =>
    setForm((f) => ({ ...f, variantPrice: { ...f.variantPrice, [size]: v } }));

  const sizeList = form.sizes.split(",").map((s) => s.trim()).filter(Boolean);
  const linkedProduct = products.find((p) => p.id === form.product_id) ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim())          { setError("Name is required."); return; }
    if (!form.product_image.trim()) { setError("Upload a product image."); return; }
    if (!form.price.trim() || Number.isNaN(parseFloat(form.price))) { setError("Price is required."); return; }
    if (!form.description.trim())   { setError("Description is required."); return; }
    // Required: without it the piece has no stock source at all. Checkout
    // refuses to sell an unlinked piece (UNLINKED_FEATURED_PIECE), so catching
    // it here is the difference between an inline message and a customer
    // getting charged and refunded.
    if (!form.product_id)           { setError("Pick the product this piece takes its stock from."); return; }
    if (
      form.discount_price.trim() &&
      !Number.isNaN(parseFloat(form.discount_price)) &&
      parseFloat(form.discount_price) >= parseFloat(form.price)
    ) {
      setError("Discount price must be lower than the regular price.");
      return;
    }

    setSaving(true);
    const variant_price: Record<string, number> = {};
    for (const size of sizeList) {
      const raw = form.variantPrice[size];
      if (raw?.trim() && !Number.isNaN(parseFloat(raw))) variant_price[size] = parseFloat(raw);
    }

    const payload = {
      name:            form.name.trim(),
      product_image:   form.product_image,
      lifestyle_image: form.lifestyle_image || null,
      sold_out:        form.sold_out,
      is_handmade:     form.is_handmade,
      show_on_homepage: form.show_on_homepage,
      display_order:   parseInt(form.display_order) || 0,
      price:           parseFloat(form.price),
      discount_price:  form.discount_price.trim() ? parseFloat(form.discount_price) : null,
      colors:          form.colors.split(",").map((s) => s.trim()).filter(Boolean),
      sizes:           sizeList,
      description:     form.description.trim(),
      sku:             form.sku.trim() || null,
      product_id:      form.product_id,
      variant_price,
      shipping_weight_grams: form.shipping_weight_grams.trim() ? parseInt(form.shipping_weight_grams) : null,
    };

    const res = await fetch(
      isEdit ? `/api/admin/featured-pieces/${item!.id}` : "/api/admin/featured-pieces",
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

    router.push("/admin/featured-pieces");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap gap-6">
        <ImageDropzone
          label="Product image"
          hint="Tight/close shot, shown by default"
          url={form.product_image}
          onUploaded={(url) => set("product_image", url)}
          folder="new-in-product"
        />
        <ImageDropzone
          label="Lifestyle image"
          hint="Item in use, shown on hover / press"
          url={form.lifestyle_image}
          onUploaded={(url) => set("lifestyle_image", url)}
          folder="new-in-lifestyle"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          placeholder="e.g. Coco Bucket Bag"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price (€)</label>
          <p className="text-xs text-gray-400 mb-1.5">
            Entered and shown in pounds directly, with no currency conversion for Featured Pieces items.
          </p>
          <input
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder="52.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Discount price (€, optional)</label>
          <input
            type="number"
            step="0.01"
            value={form.discount_price}
            onChange={(e) => set("discount_price", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder="Leave blank if none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Colors</label>
          <p className="text-xs text-gray-400 mb-1.5">Comma-separated, e.g. Red, Navy, Cream</p>
          <input
            type="text"
            value={form.colors}
            onChange={(e) => set("colors", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder="Red, Navy, Cream"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sizes</label>
          <p className="text-xs text-gray-400 mb-1.5">Comma-separated, e.g. Small, Medium, Large</p>
          <input
            type="text"
            value={form.sizes}
            onChange={(e) => set("sizes", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder="Small, Medium, Large"
          />
        </div>
      </div>

      {/* Per-size/tier pricing — e.g. sizes "Without Stand, With Stand, With
          Stand and Bedding" each getting their own price. Falls back to the
          base Price/Discount price above when left blank. */}
      {sizeList.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price per size (optional)</label>
          <p className="text-xs text-gray-400 mb-2">
            Set a different price for one or more sizes, e.g. for a product sold in configurations
            like &quot;Without Stand&quot; / &quot;With Stand&quot;. Leave blank to use the base price above.
          </p>
          <div className="space-y-2">
            {sizeList.map((size) => (
              <div key={size} className="flex items-center gap-3">
                <span className="w-48 shrink-0 text-sm text-gray-700 truncate">{size}</span>
                <div className="relative flex-1 max-w-[160px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.variantPrice[size] ?? ""}
                    onChange={(e) => setVariantPrice(size, e.target.value)}
                    className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                    placeholder={form.price || "0.00"}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={5}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          placeholder="Full product description shown on the detail page…"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Shipping weight (grams)</label>
        <p className="text-xs text-gray-400 mb-1.5">
          Billable weight in grams. Blankets are bulky and light, so carriers usually charge on
          volumetric weight rather than actual weight. Enter whatever weight your carrier actually
          bills for this item, not what the scales say.
        </p>
        <input
          type="number"
          min={0}
          value={form.shipping_weight_grams}
          onChange={(e) => set("shipping_weight_grams", e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          placeholder="e.g. 450"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU (optional)</label>
          <input
            type="text"
            value={form.sku}
            onChange={(e) => set("sku", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder="FEAT-001"
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

      {/* Stock source. Featured Pieces used to carry their own stock number,
          which meant the same physical item listed here and in Products had
          two counters that drifted apart. Stock now lives on the product and
          only there — this picker says which product, and the count beside it
          is read-only on purpose: editing it here is exactly the split-brain
          the change removes. */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">Stock comes from this product</label>
        <p className="text-xs text-gray-500">
          Pick the product this piece is. Its stock is the stock: sell one here or in the shop and the
          same number goes down. To change the count, edit the product.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <select
            value={form.product_id}
            onChange={(e) => set("product_id", e.target.value)}
            className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <option value="">Select a product</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {linkedProduct ? (
            <span
              className={`shrink-0 text-sm font-medium px-3 py-2 rounded-lg border ${
                linkedProduct.stock_quantity > 0
                  ? "bg-white border-gray-200 text-gray-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              Stock: {linkedProduct.stock_quantity}, managed on the product
            </span>
          ) : (
            <span className="shrink-0 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              No product linked, so this piece can&apos;t be sold
            </span>
          )}
        </div>
        {linkedProduct && (
          <p className="pt-0.5">
            <Link
              href={`/admin/products/${linkedProduct.id}/edit`}
              className="text-xs text-red-700 hover:underline"
            >
              Edit {linkedProduct.name} to change its stock →
            </Link>
          </p>
        )}
      </div>

      {/* Availability. Kept as an explicit two-state control rather than a
          "Sold out" tick, because with stock now coming from the product it is
          no longer obvious what ticking a box would even mean — spelling out
          both states, and what each one overrides, is the difference. */}
      <div className="rounded-xl border border-gray-200 p-4 space-y-2">
        <span className="block text-sm font-medium text-gray-700">Availability</span>
        <div className="flex flex-wrap items-center gap-5 pt-0.5">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="availability"
              checked={!form.sold_out}
              onChange={() => set("sold_out", false)}
              className="w-4 h-4 accent-red-700"
            />
            Available
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name="availability"
              checked={form.sold_out}
              onChange={() => set("sold_out", true)}
              className="w-4 h-4 accent-red-700"
            />
            Out of stock
          </label>
        </div>
        <p className="text-xs text-gray-500">
          A manual override. &quot;Out of stock&quot; hides this piece from sale even when the linked
          product still has stock. Use it to pull something early. &quot;Available&quot; follows the
          product: once its stock hits zero, this piece shows as sold out on its own.
          {linkedProduct && !form.sold_out && linkedProduct.stock_quantity <= 0 && (
            <span className="block mt-1 text-amber-700">
              {linkedProduct.name} currently has no stock, so this piece is showing as sold out right now.
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={form.is_handmade}
            onChange={(e) => set("is_handmade", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          Handmade
        </label>
      </div>

      {/* Homepage hero curation. Own block rather than a third checkbox in the
          row above: unlike "Sold out"/"Handmade", which describe the item, this
          one decides where it appears, and it needs the explanation to be
          usable — the hero has no count cap anymore, so what's ticked here is
          literally what visitors see. */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.show_on_homepage}
            onChange={(e) => set("show_on_homepage", e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-gray-300"
          />
          <span>
            <span className="text-sm font-medium text-gray-700">Show on homepage</span>
            <span className="block text-xs text-gray-500 mt-0.5">
              Puts this piece in the homepage hero, alongside any Products that are
              switched on. There is no limit. The hero shows exactly what you tick,
              so a handful reads best. The first one (by display order) becomes the
              large spotlight image.
            </span>
          </span>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity
                   hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#8B2035" }}
      >
        {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Item"}
      </button>
    </form>
  );
}
