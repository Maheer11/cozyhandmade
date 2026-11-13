// Milk "c." on brand orange, built from the traced monogram paths.
import { LOGO_ART } from "./logo-paths";
export function coziIconSvg(size: number, fill = 0.62): string {
  const [vx, vy, vw, vh] = LOGO_ART.monogram.viewBox.split(" ").map(Number);
  const h = size * fill, sc = h / vh, w = vw * sc;
  const paths = LOGO_ART.monogram.paths
    .map((p) => `<path d="${p.d}" fill="#F5F4F0" fill-rule="evenodd"${p.transform ? ` transform="${p.transform}"` : ""}/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#A74508"/><g transform="translate(${(size - w) / 2} ${(size - h) / 2}) scale(${sc}) translate(${-vx} ${-vy})">${paths}</g></svg>`;
}
