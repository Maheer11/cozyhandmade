import { whatsappLink } from "@/lib/social-links";

export default function FloatingWhatsApp() {
  return (
    <a
      href={whatsappLink("Hi! I'd love to ask about a piece from Cozi Handmade ✦")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-4 sm:right-6 z-40
                 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+1rem)] lg:bottom-6
                 w-14 h-14 rounded-full bg-[#25D366] text-white
                 flex items-center justify-center shadow-xl shadow-black/20
                 hover:scale-110 active:scale-95 transition-transform duration-200"
    >
      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.38 5.06L2 22l5.06-1.36C8.5 21.5 10.2 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/>
      </svg>
      <span className="sr-only">Chat with us on WhatsApp</span>
    </a>
  );
}
