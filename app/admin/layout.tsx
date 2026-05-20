import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

function isAdmin(email: string | undefined) {
  return email && process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) redirect("/");

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#F3F0EB" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col" style={{ backgroundColor: "#2C1810" }}>
        <div className="px-5 py-5 border-b border-white/10">
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-body mb-0.5">Admin Panel</p>
          <p className="font-heading italic text-lg text-white leading-tight">Woven with Love</p>
        </div>

        <AdminNav />

        <div className="p-4 border-t border-white/10 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to store
          </Link>
          <p className="text-[10px] text-white/25 truncate">{user.email}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-h-screen">{children}</main>
    </div>
  );
}
