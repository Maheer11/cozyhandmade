"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface CustomProduct {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  category: string;
  image: string | null;
  images: string[];
  description: string | null;
  details: string[];
  tags: string[];
  stock_quantity: number;
  in_stock: boolean;
  colors: string[];
  sizes: string[];
  variant_stock: Record<string, number>;
  variant_price: Record<string, number>;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default function AdminCustomProductsPage() {
  const [products, setProducts] = useState<CustomProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState<Partial<CustomProduct>>({
    name: "",
    price: 0,
    original_price: null,
    category: "",
    image: "",
    images: [],
    description: "",
    details: [],
    tags: [],
    stock_quantity: 0,
    in_stock: true,
    colors: [],
    sizes: [],
    variant_stock: {},
    variant_price: {},
    display_order: 0,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("custom_products")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setMessage("Error loading products");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        const { error } = await supabase
          .from("custom_products")
          .update(formData)
          .eq("id", editingId);

        if (error) throw error;
        setMessage("Product updated successfully!");
      } else {
        const { error } = await supabase.from("custom_products").insert([formData]);

        if (error) throw error;
        setMessage("Product created successfully!");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: "",
        price: 0,
        original_price: null,
        category: "",
        image: "",
        images: [],
        description: "",
        details: [],
        tags: [],
        stock_quantity: 0,
        in_stock: true,
        colors: [],
        sizes: [],
        variant_stock: {},
        variant_price: {},
        display_order: 0,
      });
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      setMessage("Error saving product");
    }
  };

  const handleEdit = (product: CustomProduct) => {
    setFormData(product);
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const { error } = await supabase.from("custom_products").delete().eq("id", id);

      if (error) throw error;
      setMessage("Product deleted successfully!");
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      setMessage("Error deleting product");
    }
  };

  return (
    <div className="min-h-screen bg-peach">
      {/* Header */}
      <div className="bg-brown text-cream py-8 px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-heading italic text-4xl font-400">
              Custom Products Manager
            </h1>
            <Link
              href="/"
              className="text-sm font-semibold text-burgundy hover:text-stone transition-colors"
            >
              ← Back to Site
            </Link>
          </div>
          <p className="text-cream/70">
            Manage custom products that appear in "Our Beloved Pieces" and the regular products catalog
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Success/Error Message */}
        {message && (
          <div
            className={`mb-6 px-6 py-4 rounded-xl ${
              message.includes("Error")
                ? "bg-red-100 border border-red-300 text-red-800"
                : "bg-green-100 border border-green-300 text-green-800"
            }`}
          >
            {message}
          </div>
        )}

        {/* Add New Button */}
        <div className="mb-8">
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({
                name: "",
                price: 0,
                original_price: null,
                category: "",
                image: "",
                images: [],
                description: "",
                details: [],
                tags: [],
                stock_quantity: 0,
                in_stock: true,
                colors: [],
                sizes: [],
                variant_stock: {},
                variant_price: {},
                display_order: 0,
              });
            }}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-lg font-semibold
                     bg-burgundy text-cream
                     hover:bg-burgundy-dark transition-colors duration-200"
          >
            + Add New Custom Product
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Products List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-stone">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-line/20">
                <p className="text-stone mb-4">No custom products yet</p>
                <p className="text-sm text-stone">Click "Add New Custom Product" to create one</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden border border-line/20">
                <div className="divide-y divide-line/10">
                  {products.map((product) => (
                    <div key={product.id} className="p-5 hover:bg-peach/30 transition-colors group">
                      <div className="flex gap-4 items-start">
                        {/* Image */}
                        <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-peach">
                          <Image
                            src={product.image || "/images/placeholder.jpg"}
                            alt={product.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading italic text-lg font-400 text-brown">
                            {product.name}
                          </h3>
                          <p className="text-sm text-stone mt-1">
                            €{product.price.toFixed(2)}
                            {product.original_price && (
                              <span className="ml-2 line-through">
                                €{product.original_price.toFixed(2)}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-stone/60 mt-1 line-clamp-2">
                            {product.description}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs font-semibold text-burgundy bg-burgundy/10 px-2 py-1 rounded">
                              Order: {product.display_order}
                            </span>
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded ${
                                product.in_stock
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {product.in_stock ? "In Stock" : "Out of Stock"}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(product)}
                            className="px-3 py-2 rounded-lg text-sm font-semibold
                                     bg-blue-100 text-blue-700
                                     hover:bg-blue-200 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="px-3 py-2 rounded-lg text-sm font-semibold
                                     bg-red-100 text-red-700
                                     hover:bg-red-200 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Form */}
          {showForm && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 border border-line/20 sticky top-24">
                <h3 className="font-heading italic text-lg font-400 text-brown mb-4">
                  {editingId ? "Edit Product" : "Add New Product"}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-3 max-h-[600px] overflow-y-auto">
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-line/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-burgundy"
                    required
                  />

                  <input
                    type="number"
                    placeholder="Price (€)"
                    value={formData.price || ""}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-line/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-burgundy"
                    required
                  />

                  <input
                    type="number"
                    placeholder="Original Price (optional)"
                    value={formData.original_price || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, original_price: parseFloat(e.target.value) || null })
                    }
                    className="w-full px-3 py-2 border border-line/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-burgundy"
                  />

                  <input
                    type="text"
                    placeholder="Category"
                    value={formData.category || ""}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-line/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-burgundy"
                    required
                  />

                  <input
                    type="number"
                    placeholder="Display Order"
                    value={formData.display_order || ""}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-line/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-burgundy"
                  />

                  <textarea
                    placeholder="Description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-line/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-burgundy resize-none"
                    rows={3}
                  />

                  <input
                    type="text"
                    placeholder="Main Image URL"
                    value={formData.image || ""}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-3 py-2 border border-line/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-burgundy"
                  />

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 h-10 rounded-lg font-semibold text-sm
                               bg-burgundy text-cream
                               hover:bg-burgundy-dark transition-colors"
                    >
                      {editingId ? "Update" : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                      }}
                      className="flex-1 h-10 rounded-lg font-semibold text-sm
                               bg-line/20 text-stone
                               hover:bg-line/30 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
