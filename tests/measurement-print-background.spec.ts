import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test.describe("admin measurement print background", () => {
  test("uses pure white structural backgrounds without changing the A4 layout", () => {
    const layout = source("components/measurements/forms/a4-layout.css");

    expect(layout).toContain("background: #fff;");
    expect(layout).not.toContain("background: linear-gradient(180deg, #fff, #f8fafc)");
    expect(layout).not.toContain("background: #f1f5f9");
    expect(layout).not.toContain("background: #fbfdff");
    expect(layout).not.toContain("background: #f8fafc");
    expect(layout).toContain("width: 210mm");
    expect(layout).toContain("min-height: 297mm");
    expect(layout).toContain("grid-template-columns: 1fr 62mm");
  });

  test("forces every printed card section to white in the isolated print portal", () => {
    const printCard = source("components/admin/tailor-print-card.tsx");

    expect(printCard).toContain(".tailor-print-portal .a4-page");
    expect(printCard).toContain(".tailor-print-portal .a4-meta");
    expect(printCard).toContain(".tailor-print-portal .a4-row");
    expect(printCard).toContain(".tailor-print-portal .a4-entry");
    expect(printCard).toContain("background: #fff !important;");
  });
});
