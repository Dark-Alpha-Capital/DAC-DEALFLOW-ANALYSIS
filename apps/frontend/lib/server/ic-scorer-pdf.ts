import type { IcScorerMemoStructured } from "@repo/schemas";

type PdfLine = {
  text: string;
  size: number;
  font: "regular" | "bold";
  gapAfter?: number;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 54;
const TOP_Y = 744;
const BOTTOM_Y = 54;

function normalizePdfText(value: string): string {
  return value
    .replace(/[•]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .split("")
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126);
    })
    .join("");
}

function escapePdfString(value: string): string {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars: number): string[] {
  const words = normalizePdfText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function addSection(lines: PdfLine[], title: string, body: string | string[]) {
  lines.push({ text: title, size: 13, font: "bold", gapAfter: 4 });
  const rows = Array.isArray(body) ? body : [body];
  for (const row of rows) {
    for (const wrapped of wrapText(row, 92)) {
      lines.push({ text: wrapped, size: 10, font: "regular" });
    }
  }
  lines.push({ text: "", size: 10, font: "regular", gapAfter: 8 });
}

function memoToPdfLines(input: {
  dealId: string;
  score: number | null;
  memo: IcScorerMemoStructured;
}): PdfLine[] {
  const lines: PdfLine[] = [
    { text: "IC Readiness Report", size: 20, font: "bold", gapAfter: 6 },
    {
      text: `Deal ID: ${input.dealId}${input.score == null ? "" : ` | Score: ${input.score}/100`}`,
      size: 10,
      font: "regular",
      gapAfter: 10,
    },
    { text: input.memo.scoreHeadline, size: 12, font: "bold", gapAfter: 12 },
  ];

  addSection(lines, "Investment thesis", input.memo.investmentThesisMemo);
  addSection(
    lines,
    "Alignment",
    input.memo.alignmentMemos.map((row) => `${row.pillar}: ${row.memo}`),
  );
  addSection(
    lines,
    "Strengths",
    input.memo.strengthBullets.map((s) => `- ${s}`),
  );
  addSection(
    lines,
    "Risks and gaps",
    input.memo.riskAndGapsMemo.map(
      (r) =>
        `- ${r.risk}${r.suggestedAction.trim() ? ` - ${r.suggestedAction}` : ""}`,
    ),
  );
  addSection(lines, "Recommendation", input.memo.recommendationMemo);
  return lines;
}

function paginate(lines: PdfLine[]): PdfLine[][] {
  const pages: PdfLine[][] = [[]];
  let y = TOP_Y;
  for (const line of lines) {
    const height = line.size + (line.gapAfter ?? 4);
    if (y - height < BOTTOM_Y && pages[pages.length - 1]!.length > 0) {
      pages.push([]);
      y = TOP_Y;
    }
    pages[pages.length - 1]!.push(line);
    y -= height;
  }
  return pages;
}

function buildContentStream(lines: PdfLine[]): string {
  let y = TOP_Y;
  const commands: string[] = [];
  for (const line of lines) {
    if (line.text.trim()) {
      const fontName = line.font === "bold" ? "F2" : "F1";
      commands.push(
        `BT /${fontName} ${line.size} Tf ${MARGIN_X} ${y} Td (${escapePdfString(line.text)}) Tj ET`,
      );
    }
    y -= line.size + (line.gapAfter ?? 4);
  }
  return commands.join("\n");
}

function makeObject(body: string): string {
  return `${body}\n`;
}

function toBase64BinaryString(value: string): string {
  if (typeof btoa === "function") return btoa(value);
  return Buffer.from(value, "binary").toString("base64");
}

export function buildIcScorerMemoPdfBase64(input: {
  dealId: string;
  score: number | null;
  memo: IcScorerMemoStructured;
}): string {
  const pages = paginate(memoToPdfLines(input));
  const objects: string[] = [];
  objects[0] = makeObject("<< /Type /Catalog /Pages 2 0 R >>");
  objects[1] = "";
  objects[2] = makeObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects[3] = makeObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  );

  const pageObjectIds: number[] = [];
  for (const pageLines of pages) {
    const content = buildContentStream(pageLines);
    const contentObjectId = objects.length + 1;
    objects.push(
      makeObject(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`),
    );
    const pageObjectId = objects.length + 1;
    pageObjectIds.push(pageObjectId);
    objects.push(
      makeObject(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
      ),
    );
  }

  objects[1] = makeObject(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`,
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}endobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return toBase64BinaryString(pdf);
}
