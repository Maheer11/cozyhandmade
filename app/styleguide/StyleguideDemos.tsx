"use client";

import { useState } from "react";
import Accordion from "@/components/ui/Accordion";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import CartLineItem from "@/components/ui/CartLineItem";
import Chip from "@/components/ui/Chip";
import Input from "@/components/ui/Input";
import ProductCard from "@/components/ui/ProductCard";
import QuantityStepper from "@/components/ui/QuantityStepper";
import SectionHeader from "@/components/ui/SectionHeader";
import SizeSelector from "@/components/ui/SizeSelector";

// TEMPORARY specimen of the shared components (docs/DESIGN.md §4). Lives only
// under /styleguide, which 404s in production.
const IMG = "/images/placeholder.jpg";

export default function StyleguideDemos() {
  const [cat, setCat] = useState("All pieces");
  const [size, setSize] = useState<string | null>("Medium");
  const [qty, setQty] = useState(1);
  const [email, setEmail] = useState("aoife@");

  return (
    <div className="space-y-16">
      <section>
        <p className="type-eyebrow text-orange">Component</p>
        <h2 className="type-h2 mb-6">Button</h2>
        <div className="flex flex-wrap items-center gap-4 rounded-card bg-cream p-6 ring-1 ring-line">
          <Button>Checkout securely</Button>
          <Button variant="secondary">Continue shopping</Button>
          <Button disabled>Disabled</Button>
          <Button href="/products">As a link</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-block bg-orange p-6">
          <Button variant="onDark">Shop the Collection</Button>
          <Button variant="onDarkOutline">See featured pieces</Button>
        </div>
        <div className="mt-4 rounded-block bg-brown p-6">
          <Button variant="onDark" fullWidth>Start a custom order →</Button>
        </div>
      </section>

      <section>
        <p className="type-eyebrow text-orange">Component</p>
        <h2 className="type-h2 mb-6">Badge &amp; Chip</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="handmade">✦ Handmade</Badge>
          <Badge variant="lowStock">Only 2 left</Badge>
          <Badge variant="soldOut">Sold out</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {["All pieces", "Throw blankets", "Baby", "Handbags & Totes"].map((c) => (
            <Chip key={c} selected={cat === c} onClick={() => setCat(c)}>{c}</Chip>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader eyebrow="Ready to ship" title="In stock now" seeAllHref="/products" className="mb-6" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <ProductCard href="/products" name="The Amani Bag" image={IMG} price="€55.00" badges={<Badge variant="handmade">✦ Handmade</Badge>} />
          <ProductCard href="/products" name="Colour Splash Baby Blanket in a very long name that wraps to two lines then truncates" image={IMG} price="€55.00" wasPrice="€65.00" badges={<Badge variant="lowStock">Only 2 left</Badge>} />
          <ProductCard href="/products" name="Ivory Moses Basket" image={IMG} price="€189.00" soldOut badges={<Badge variant="soldOut">Sold out</Badge>} />
          <ProductCard href="/products" name="Cozy Cable Blanket" image={IMG} price="€75.00" />
        </div>
      </section>

      <section className="grid gap-10 md:grid-cols-2">
        <div className="space-y-6">
          <p className="type-eyebrow text-orange">Component</p>
          <h2 className="type-h2">Form controls</h2>
          <Input label="Email address" placeholder="you@example.com" hint="We’ll send your receipt and tracking here." />
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={email.includes("@") && email.split("@")[1] ? undefined : "Add the part after the @, like aoife@example.com."}
          />
          <SizeSelector options={[{ value: "Medium" }, { value: "XXL" }, { value: "Small", disabled: true }]} value={size} onChange={setSize} />
          <div className="flex items-center gap-4">
            <span className="type-small font-semibold">Quantity</span>
            <QuantityStepper value={qty} onChange={setQty} max={3} label="Quantity" />
          </div>
        </div>
        <div className="space-y-6">
          <p className="type-eyebrow text-orange">Component</p>
          <h2 className="type-h2">Cart line &amp; accordion</h2>
          <CartLineItem
            name="Bismah Tote Bag"
            image={IMG}
            variantLabel="Size: Medium"
            price="€85.00"
            quantityControl={<QuantityStepper value={qty} onChange={setQty} max={3} label="Bismah Tote Bag quantity" />}
            onRemove={() => {}}
          />
          <Accordion
            defaultOpen={["why"]}
            items={[
              { id: "why", title: "Why you’ll love it", content: "Original Cozi design, made exclusively by Cozi." },
              { id: "details", title: "Product details", content: "Lightweight, durable polyester cord." },
              { id: "care", title: "Care instructions", content: "Machine washable at 30°C, air dry flat." },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
