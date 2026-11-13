import { whatsappLink } from "@/lib/social-links";
import Button from "@/components/ui/Button";

/**
 * Custom order card: the two ways to get something made, each one tap — the
 * order form, or a WhatsApp chat. A brown feature block; the buttons are milk,
 * because burgundy on brown has almost no contrast. Phones stack it; from lg
 * the heading sits left and the buttons right on one row.
 * (Name kept for its existing import; it is no longer phone-only.)
 */
export function MobileCustomOrderCard() {
  return (
    <section aria-labelledby="mobile-custom-heading" className="bg-cream">
      <div className="page-container py-8 lg:py-16">
        <div className="rounded-block bg-brown px-6 py-8 text-cream lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-14 lg:py-14">
          <div className="lg:max-w-xl">
            <p className="type-eyebrow text-cream">Made for you</p>
            <h2 id="mobile-custom-heading" className="type-h2 mt-3 text-milk">
              Want a piece in your colours?
            </h2>
          </div>
          <div className="mt-6 flex flex-col gap-3 lg:mt-0 lg:shrink-0 lg:flex-row">
            <Button href="/custom-order" variant="onOrange" fullWidth className="lg:w-auto lg:min-w-56">
              Start a custom order →
            </Button>
            <Button
              href={whatsappLink("Hi! I'd like to ask about a custom piece from Cozi Handmade ✦")}
              target="_blank"
              rel="noopener noreferrer"
              variant="onOrangeOutline"
              fullWidth
              className="lg:w-auto lg:min-w-56"
            >
              Ask on WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
