import Link from "next/link";
import AdminReviewForm from "@/components/AdminReviewForm";

export default function NewReviewPage() {
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-7">
        <Link href="/admin/reviews" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Review</h1>
          <p className="text-sm text-gray-500 mt-0.5">New customer screenshot for the homepage</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <AdminReviewForm />
      </div>
    </div>
  );
}
