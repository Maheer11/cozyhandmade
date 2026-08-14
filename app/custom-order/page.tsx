import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/db-categories";
import CustomOrderForm from "@/components/CustomOrderForm";

export default async function CustomOrderPage() {
  const supabase = await createClient();
  const categories = await getCategories(supabase);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-cream-dark border-b border-taupe/20 px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="max-w-xl mx-auto">
          <p className="text-gold text-[11px] uppercase tracking-[0.28em] font-body font-semibold mb-2">
            ✦ Made just for you
          </p>
          <h1 className="font-heading italic text-3xl sm:text-4xl font-400 text-deep-brown mb-3">
            Create a Custom Order
          </h1>
          <p className="text-deep-brown/70 text-sm sm:text-base leading-relaxed">
            Tell us what you have in mind (colour, size, occasion, anything) and we'll
            reply on WhatsApp to talk it through before you order.
          </p>
        </div>
      </div>

      <CustomOrderForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
