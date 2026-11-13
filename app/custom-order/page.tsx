import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/db-categories";
import CustomOrderForm from "@/components/CustomOrderForm";

export default async function CustomOrderPage() {
  const supabase = await createClient();
  const categories = await getCategories(supabase);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-cream border-b border-line px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Same inner padding as the form box below, so the edges line up. */}
        <div className="max-w-xl mx-auto sm:px-6 lg:px-8">
          <p className="type-eyebrow text-burgundy mb-2">
            ✦ Made just for you
          </p>
          <h1 className="type-h1 text-brown mb-3">
            Create a Custom Order
          </h1>
          <p className="text-stone text-sm sm:text-base leading-relaxed">
            Tell us what you have in mind (colour, size, occasion, anything) and we'll
            reply on WhatsApp to talk it through before you order.
          </p>
        </div>
      </div>

      <CustomOrderForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
