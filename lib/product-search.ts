// Product search shared by the phone homepage search and the shop page, so
// "See all results" shows the same pieces the dropdown did.
//
// A piece matches when EVERY typed word is the start of a word in its name,
// category or tags. Typing "b" finds blankets, bags and baby gifts, but not
// "Cozi scarf" just because the letter b appears somewhere inside "Cozi
// scarf throws"; typing "bag" no longer matches "cabbage". The old rule
// (the text appears anywhere inside any field) made a single letter match
// nearly the whole catalogue.

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Lower-case words of a string, accents removed, punctuation dropped. */
export function searchWords(text: string): string[] {
  return normalise(text).split(/[^a-z0-9]+/).filter(Boolean);
}

export interface SearchableFields {
  name: string;
  /** Category id, category display name, tags: matched, but ranked below the name. */
  other: string[];
}

/**
 * Lower is better; null means no match. 0 = every typed word starts a word in
 * the name, 1 = at least one only matched a category or tag.
 */
export function matchRank(query: string, fields: SearchableFields): number | null {
  const typed = searchWords(query);
  if (typed.length === 0) return null;

  const nameWords = searchWords(fields.name);
  const otherWords = fields.other.flatMap(searchWords);

  let rank = 0;
  for (const word of typed) {
    if (nameWords.some((w) => w.startsWith(word))) continue;
    if (otherWords.some((w) => w.startsWith(word))) {
      rank = 1;
      continue;
    }
    return null;
  }
  return rank;
}
