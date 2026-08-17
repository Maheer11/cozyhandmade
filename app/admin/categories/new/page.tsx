import Link from "next/link";
import AdminCategoryForm from "@/components/AdminCategoryForm";

export default function NewCategoryPage() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-7">
        <Link href="/admin/categories" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Category</h1>
          <p className="text-sm text-gray-500 mt-0.5">New entry for the Curated Categories slider</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl">
        <AdminCategoryForm />
      </div>
    </div>
  );
}
