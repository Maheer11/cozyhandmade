import { whatsappLink } from "@/lib/social-links";
import Button from "@/components/ui/Button";

/**
 * Phone-only custom order card: the two ways to get something made, each one
 * tap — the order form, or a WhatsApp chat. A brown feature block; the buttons
 * are milk, because burgundy on brown has almost no contrast.
 */
export function MobileCustomOrderCard() {
  return (
    <section aria-labelledby="mobile-custom-heading" className="bg-cream lg:hidden">
      <div className="page-container py-8">
        <div className="rounded-block bg-brown px-6 py-8 text-cream">
          <p className="type-eyebrow text-cream">Made for you</p>
          <h2 id="mobile-custom-heading" className="type-h2 mt-3 text-milk">
            Want a piece in your colours?
          </h2>
          <div className="mt-6 flex flex-col gap-3">
            <Button href="/custom-order" variant="onOrange" fullWidth>
              Start a custom order →
            </Button>
            <Button
              href={whatsappLink("Hi! I'd like to ask about a custom piece from Cozi Handmade ✦")}
              target="_blank"
              rel="noopener noreferrer"
              variant="onOrangeOutline"
              fullWidth
            >
              Ask on WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
