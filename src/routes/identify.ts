import { Router } from "express";
import multer from "multer";
import { extractText, extractNumberText } from "../ocr";
import { extractNameCandidates, extractCollectorNumber } from "../cardParser";
import { searchCards, findBestMatch, type TcgApiCard } from "../pokemonTcgApi";
import { getEmbedding, cosineSimilarity } from "../vision";
import { fetchWithRetry } from "../httpRetry";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const identifyRouter = Router();

identifyRouter.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "An image file is required." });

  try {
    // Two OCR passes in parallel: the whole card (for the name) and the
    // small collector-number strip. A failure in the number pass must not
    // break the scan, so it falls back to an empty string.
    const [rawText, numberText] = await Promise.all([
      extractText(req.file.buffer),
      extractNumberText(req.file.buffer).catch((err) => {
        console.error("Collector-number OCR failed:", err);
        return "";
      }),
    ]);
    const candidates = extractNameCandidates(rawText);
    const collector = extractCollectorNumber(numberText);

    let matches: TcgApiCard[] = [];

    // 1) Best signal first: collector number + printed set total.
    if (collector) {
      try {
        matches = await searchCards({
          number: String(collector.number),
          printedTotal: collector.total,
        });
      } catch (apiErr) {
        console.error("Number lookup failed:", apiErr);
      }
    }

    // 2) Fallback: guess by name from the OCR text.
    if (matches.length === 0) {
      try {
        matches = await findBestMatch(candidates);
      } catch (apiErr) {
        console.error("Pokémon TCG API lookup failed:", apiErr);
      }
    }

    if (matches.length > 1) {
      try {
        const queryEmbedding = await getEmbedding(req.file.buffer, req.file.originalname);
        const ranked = await Promise.all(
          matches.map(async (card) => {
            const imgRes = await fetchWithRetry(card.images.small);
            const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
            const cardEmbedding = await getEmbedding(imgBuffer, "reference.png");
            return { ...card, similarity: cosineSimilarity(queryEmbedding, cardEmbedding) };
          })
        );
        matches = ranked.sort((a, b) => b.similarity - a.similarity);
      } catch (visionErr) {
        console.error("Visual ranking failed:", visionErr);
      }
    }

    res.json({ rawText, numberText, collector, candidates, matches });
  } catch (err) {
    console.error("Identify failed:", err);
    res.status(500).json({ error: "Could not process that image." });
  }
});