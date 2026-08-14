import Image from "next/image";
import heroImage from "@/public/images/newhome1.jpg";

export default function HeroSlider() {
  return (
    <div className="relative w-full h-full overflow-hidden bg-deep-brown">
      <Image
        src={heroImage}
        alt="Cozi Handmade artisan craftsmanship"
        fill
        sizes="100vw"
        className="object-cover"
        placeholder="blur"
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
}
