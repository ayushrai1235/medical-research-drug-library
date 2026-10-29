import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface CombineComparisonOptions {
  drug1Name: string;
  drug2Name: string;
  pdf1Buffer: Buffer | Uint8Array;
  pdf2Buffer: Buffer | Uint8Array;
}

export async function generateCombinedComparisonPdf(
  options: CombineComparisonOptions
): Promise<Uint8Array> {
  const { drug1Name, drug2Name, pdf1Buffer, pdf2Buffer } = options;

  const pdf1 = await PDFDocument.load(pdf1Buffer);
  const pdf2 = await PDFDocument.load(pdf2Buffer);

  const combined = await PDFDocument.create();
  const font = await combined.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await combined.embedFont(StandardFonts.Helvetica);

  const count1 = pdf1.getPageCount();
  const count2 = pdf2.getPageCount();
  const totalPages = Math.max(count1, count2);

  // Landscape dimensions (US Letter landscape: 792 x 612 pt or A4 landscape: 842 x 595 pt)
  // Let's use 1190 x 842 (A3 landscape proportional or wide double-A4) so each side has 595x842 (full A4 portrait width/height)!
  const PAGE_WIDTH = 1190;
  const PAGE_HEIGHT = 842;
  const HALF_WIDTH = PAGE_WIDTH / 2;
  const HEADER_HEIGHT = 45;
  const FOOTER_HEIGHT = 30;
  const CONTENT_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;

  for (let i = 0; i < totalPages; i++) {
    const page = combined.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

    // Draw background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: rgb(0.98, 0.98, 0.99),
    });

    // Draw header divider bar
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - HEADER_HEIGHT,
      width: PAGE_WIDTH,
      height: HEADER_HEIGHT,
      color: rgb(0.12, 0.23, 0.54), // Deep medical blue
    });

    // Drug 1 Header (Left)
    page.drawText(`${drug1Name}`, {
      x: 30,
      y: PAGE_HEIGHT - 28,
      size: 16,
      font,
      color: rgb(1, 1, 1),
    });

    // Drug 2 Header (Right)
    page.drawText(`${drug2Name}`, {
      x: HALF_WIDTH + 30,
      y: PAGE_HEIGHT - 28,
      size: 16,
      font,
      color: rgb(1, 1, 1),
    });

    // Vertical Divider Line in the middle
    page.drawLine({
      start: { x: HALF_WIDTH, y: FOOTER_HEIGHT },
      end: { x: HALF_WIDTH, y: PAGE_HEIGHT - HEADER_HEIGHT },
      thickness: 1.5,
      color: rgb(0.8, 0.85, 0.9),
    });

    // Embed and draw Left Page (Drug 1)
    if (i < count1) {
      const [embedded1] = await combined.embedPdf(pdf1, [i]);
      const { width: origW, height: origH } = embedded1;

      // Fit into left half margin
      const margin = 20;
      const maxW = HALF_WIDTH - margin * 2;
      const maxH = CONTENT_HEIGHT - margin * 2;
      const scale = Math.min(maxW / origW, maxH / origH);

      const scaledW = origW * scale;
      const scaledH = origH * scale;
      const posX = margin + (maxW - scaledW) / 2;
      const posY = FOOTER_HEIGHT + margin + (maxH - scaledH) / 2;

      page.drawPage(embedded1, {
        x: posX,
        y: posY,
        width: scaledW,
        height: scaledH,
      });

      // Label below page
      page.drawText(`Page ${i + 1} of ${count1}`, {
        x: margin,
        y: 12,
        size: 10,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.5),
      });
    } else {
      // Left side blank
      page.drawText(`(No further pages in ${drug1Name})`, {
        x: HALF_WIDTH / 2 - 80,
        y: PAGE_HEIGHT / 2,
        size: 13,
        font: fontRegular,
        color: rgb(0.55, 0.6, 0.65),
      });
    }

    // Embed and draw Right Page (Drug 2)
    if (i < count2) {
      const [embedded2] = await combined.embedPdf(pdf2, [i]);
      const { width: origW, height: origH } = embedded2;

      const margin = 20;
      const maxW = HALF_WIDTH - margin * 2;
      const maxH = CONTENT_HEIGHT - margin * 2;
      const scale = Math.min(maxW / origW, maxH / origH);

      const scaledW = origW * scale;
      const scaledH = origH * scale;
      const posX = HALF_WIDTH + margin + (maxW - scaledW) / 2;
      const posY = FOOTER_HEIGHT + margin + (maxH - scaledH) / 2;

      page.drawPage(embedded2, {
        x: posX,
        y: posY,
        width: scaledW,
        height: scaledH,
      });

      // Label below page
      page.drawText(`Page ${i + 1} of ${count2}`, {
        x: HALF_WIDTH + margin,
        y: 12,
        size: 10,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.5),
      });
    } else {
      // Right side blank
      page.drawText(`(No further pages in ${drug2Name})`, {
        x: HALF_WIDTH + HALF_WIDTH / 2 - 80,
        y: PAGE_HEIGHT / 2,
        size: 13,
        font: fontRegular,
        color: rgb(0.55, 0.6, 0.65),
      });
    }

    // Comparison Sheet Footer
    page.drawText(`Medical Research Drug Library • Side-by-Side Comparison • Spread ${i + 1} of ${totalPages}`, {
      x: HALF_WIDTH - 150,
      y: 12,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5),
    });
  }

  return await combined.save();
}
