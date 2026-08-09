import { chromium } from "@playwright/test";
const b = await chromium.launch();
for (const vp of [{width:1280,height:800},{width:1440,height:900},{width:1920,height:1080}]) {
  const page = await b.newPage({ viewport: vp });
  await page.goto("http://localhost:3000/", { waitUntil:"networkidle" });
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const visible = (el) => el && el.getBoundingClientRect().width > 0;
    const h1 = [...document.querySelectorAll("h1")].find(visible);
    const card = h1.closest(".backdrop-blur-md");
    const bgImg = card.parentElement.parentElement.querySelector("img");
    const boxRect = bgImg.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const newInLinks = [...document.querySelectorAll('a[href^="/new-in/"]')].filter(visible);
    newInLinks.sort((a,b) => b.getBoundingClientRect().height - a.getBoundingClientRect().height);
    const spotlight = newInLinks[0], thumb = newInLinks[1];
    const cs = (el) => getComputedStyle(el).borderRadius;
    return {
      photoBox: { left: Math.round(boxRect.left), right: Math.round(boxRect.right), w: Math.round(boxRect.width) },
      card: { left: Math.round(cardRect.left), right: Math.round(cardRect.right), w: Math.round(cardRect.width), radius: cs(card) },
      marginLeft: Math.round(cardRect.left - boxRect.left),
      marginRight: Math.round(boxRect.right - cardRect.right),
      spotlightRadius: cs(spotlight),
      thumbRadius: cs(thumb),
    };
  });
  console.log(`\n${vp.width}x${vp.height}`);
  console.log(` photo box: ${JSON.stringify(r.photoBox)}`);
  console.log(` card: ${JSON.stringify(r.card)}`);
  console.log(` margin-left ${r.marginLeft}px   margin-right ${r.marginRight}px   (diff ${r.marginLeft - r.marginRight}px)`);
  console.log(` radii — text card: ${r.card.radius}   spotlight: ${r.spotlightRadius}   thumb: ${r.thumbRadius}`);
  await page.close();
}
await b.close();
