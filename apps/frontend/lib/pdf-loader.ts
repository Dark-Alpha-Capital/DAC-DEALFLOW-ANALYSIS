import { extractText } from "unpdf";

export class PDFLoader {
  /**
   * @param buffer ArrayBuffer of PDF file
   * @returns the full text content
   */
  async loadFromBuffer(buffer: ArrayBuffer): Promise<string> {
    try {
      const { text } = await extractText(new Uint8Array(buffer), {
        mergePages: true,
      });
      return typeof text === "string" ? text : "";
    } catch (error) {
      console.error("Error parsing PDF:", error);
      throw new Error("Failed to parse PDF file");
    }
  }
}
