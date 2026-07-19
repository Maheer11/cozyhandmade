// Turns a single free-text `new_in_items.description` field into structured
// sections for display — no second "short description" field, per spec.
// Recognizes a simple convention: known section headings on their own line,
// "•"/"-"/"–" bulleted lines under a heading, and "Label: value" lines under a
// "Product Details" heading rendered as a spec sheet. Anything before the
// first recognized heading is the intro paragraph.

export interface DescriptionSection {
  heading: string | null; // null for the intro block
  type: "paragraph" | "bullets" | "specs";
  lines: string[];
}

const KNOWN_HEADINGS = [
  "why you'll love it",
  "why you will love it",
  "product details",
  "production time",
  "care instructions",
  "please note",
];

// Strips bullet markers and invisible joiner/zero-width characters that
// commonly come along when pasting bulleted text from Notes/Word/Pages.
function cleanLine(line: string): string {
  return line.replace(/[⁠​]/g, "").trim();
}

function stripBullet(line: string): string {
  return line.replace(/^[•\-*–—]+\s*/, "").trim();
}

export function parseDescription(raw: string): DescriptionSection[] {
  const rawLines = raw.replace(/\r\n/g, "\n").split("\n");
  const sections: DescriptionSection[] = [];
  let current: { heading: string | null; lines: string[] } = { heading: null, lines: [] };

  const flush = () => {
    const content = current.lines.filter(Boolean);
    if (!content.length) return;
    const bulletCount = content.filter((l) => /^[•\-*–—]/.test(l)).length;
    const isBullets = bulletCount >= Math.ceil(content.length / 2);
    const isSpecs = current.heading?.toLowerCase() === "product details" && content.every((l) => l.includes(":"));
    sections.push({
      heading: current.heading,
      type: isBullets ? "bullets" : isSpecs ? "specs" : "paragraph",
      lines: isBullets ? content.map(stripBullet) : content,
    });
  };

  for (const rawLine of rawLines) {
    const line = cleanLine(rawLine);
    if (!line || line === "⸻" || /^-{3,}$/.test(line)) continue; // skip blank lines / dividers
    const normalized = line.toLowerCase().replace(/:$/, "");
    if (KNOWN_HEADINGS.includes(normalized)) {
      flush();
      current = { heading: line.replace(/:$/, ""), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  flush();

  return sections;
}
