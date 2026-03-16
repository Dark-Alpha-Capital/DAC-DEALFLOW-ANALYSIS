export async function splitContentIntoChunks(
  transcript: string,
  chunkSize: number = 7000,
  overlap: number = 1000
): Promise<string[]> {
  const words = transcript.split(" ");
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    if (currentLength + word.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(" "));
      const overlapWords = currentChunk.slice(-Math.floor(overlap / 10));
      currentChunk = [...overlapWords];
      currentLength = overlapWords.join(" ").length;
    }
    currentChunk.push(word);
    currentLength += word.length + 1;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}
