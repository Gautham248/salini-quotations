import { buildPdfHtml } from "./template.html";

async function getPuppeteer(): Promise<any> {
  return import("puppeteer-core");
}

export async function generatePdf(q: Record<string, unknown>, s: Record<string, unknown> | null): Promise<Buffer> {
  const html = buildPdfHtml(q, s);
  const puppeteer = await getPuppeteer();
  const browser = await puppeteer.default.launch({
    executablePath: "/usr/bin/google-chrome", headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30000 });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "12mm", bottom: "10mm", left: "10mm", right: "10mm" } });
    return Buffer.from(pdf);
  } finally { await browser.close(); }
}
