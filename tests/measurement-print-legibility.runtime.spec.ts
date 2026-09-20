import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const layoutCss = readFileSync(
  resolve(process.cwd(), "components/measurements/forms/a4-layout.css"),
  "utf8",
);

const a6ReadabilityCss = `
  @media print {
    .a4-page-root { --ink: #000 !important; --line: #000 !important; }
    .a4-label { font-size: 20px !important; font-weight: 800 !important; padding: 3.5mm 2mm !important; }
    .a4-inputline { font-size: 18px !important; font-weight: 700 !important; }
    .a4-subitem { font-size: 16px !important; min-height: 17.5mm !important; padding: 1.8mm 1mm !important; font-weight: 700 !important; }
    .a4-subitem .a4-smallline input { font-size: 15.5px !important; font-weight: 700 !important; }
    .a4-card h3 { font-size: 18px !important; font-weight: 800 !important; }
    button { font-size: 15.5px !important; font-weight: 800 !important; }
  }
`;

const input = (value = "38") =>
  `<input class="a4-inputline" disabled value="${value}" />`;
const subitem = (label: string, value: string) => `
  <div class="a4-subitem">${label}
    <span class="a4-smallline"><input disabled value="${value}" /></span>
  </div>`;
const row = (label: string, content = input()) => `
  <div class="a4-row">
    <div class="a4-label">${label}</div>
    <div class="a4-entry">${content}</div>
  </div>`;

function printFixture() {
  const sleeves = `${input("23")}
    <div class="a4-subgrid">
      ${subitem("Arm Hole Golai", "10.5")}
      ${subitem("Cuff", "9")}
      ${subitem("Cuff Plate", "3")}
      ${subitem("Gol Bazoo", "96")}
      <div class="a4-subitem double-single">
        <span class="a4-mini"><span class="a4-box checked"></span>Double</span>
        <span class="a4-mini"><span class="a4-box"></span>Single</span>
      </div>
    </div>`;
  const neck = `${input("15")}
    <div class="a4-subgrid">
      ${subitem("Patti Width", "8")}
      ${subitem("Bane Width", "5")}
      ${subitem("Collar Nok", "3")}
      <div class="a4-subitem"><span class="a4-mini"><span class="a4-box"></span>Collar</span></div>
      <div class="a4-subitem"><span class="a4-mini"><span class="a4-box checked"></span>Bane</span></div>
    </div>`;

  return `<!doctype html><html><head><style>${layoutCss}${a6ReadabilityCss}</style></head><body>
    <div class="a4-page-root"><div class="a4-page">
      <header class="a4-header">
        <div class="a4-logo">ET</div>
        <div class="a4-title-area"><h1>Men Shalwar Kameez</h1><h2>EMAN THREAD</h2></div>
      </header>
      <div class="a4-meta"><div>Name: <input class="a4-meta-input" disabled value="Hamza Malik" /></div><div>Delivery Date:</div></div>
      <div class="a4-grid">
        <section>
          <div class="a4-card"><h3>Kameez Measurements</h3><div class="a4-rows">
            ${row("Length", input("36"))}
            ${row("Shoulder", input("16"))}
            ${row("Sleeves", sleeves)}
            ${row("Neck", neck)}
            ${row("Chest", input("22"))}
            ${row("Waist", input("20"))}
            ${row("Hip", `${input("22")}<span class="a4-pill"><span class="a4-box checked"></span>Gol</span><span class="a4-pill"><span class="a4-box"></span>Choras</span>`)}
          </div></div>
          <div class="a4-card"><h3>Pocket</h3><div class="a4-rows">
            ${row("Pocket", `<label>Front <select><option>2</option></select></label><label>Side <select><option>1</option></select></label>`)}
          </div></div>
        </section>
        <aside class="a4-side"><div class="a4-card"><h3>Bottom Type</h3><div class="a4-rows">
          <div style="display:flex;gap:1.5mm;padding:2mm"><button data-selected="true" style="flex:1 1 0;border:2px solid var(--ink);background:#dbeafe;color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink);font-weight:900;padding:3mm 1mm;font-size:13.5px">SHALWAR</button><button style="flex:1 1 0;border:2px solid var(--ink);background:#fff;color:var(--ink);font-weight:900;padding:3mm 1mm;font-size:13.5px">TROUSER</button></div>
          ${row("1. Length", input("38"))}
          ${row("2. Pancha", input("16"))}
          ${row("3. Gherra", input("20"))}
          ${row("4. Assan", input("14"))}
          ${row("5. Pocket", `<select><option>2</option></select>`)}
        </div></div></aside>
      </div>
      <div class="a4-footer"><span>emanthread.com</span><span></span></div>
    </div></div>
  </body></html>`;
}

test("enlarged fixed-paper labels remain inside their boxes with a readable selected bottom type", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1400 });
  await page.emulateMedia({ media: "print" });
  await page.setContent(printFixture(), { waitUntil: "load" });

  const result = await page.locator(".a4-page").evaluate((sheet) => {
    const selectors = ".a4-card h3, .a4-label, .a4-subitem, .a4-mini, .a4-pill, button, label";
    const clipped = Array.from(sheet.querySelectorAll<HTMLElement>(selectors)).flatMap((element) => {
      const bounds = element.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(element);
      const content = range.getBoundingClientRect();
      const outside =
        content.left < bounds.left - 1 ||
        content.right > bounds.right + 1 ||
        content.top < bounds.top - 1 ||
        content.bottom > bounds.bottom + 1;
      return outside ? [element.textContent?.trim() || element.tagName] : [];
    });
    const selected = getComputedStyle(sheet.querySelector<HTMLElement>("[data-selected=true]")!);
    return {
      clipped,
      pageOverflowX: sheet.scrollWidth - sheet.clientWidth,
      pageOverflowY: sheet.scrollHeight - sheet.clientHeight,
      selectedColor: selected.color,
      selectedBackground: selected.backgroundColor,
    };
  });

  expect(result.clipped).toEqual([]);
  expect(result.pageOverflowX).toBeLessThanOrEqual(1);
  expect(result.pageOverflowY).toBeLessThanOrEqual(1);
  expect(result.selectedColor).toBe("rgb(0, 0, 0)");
  expect(result.selectedBackground).toBe("rgb(219, 234, 254)");
});