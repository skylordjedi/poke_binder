import { Router } from "express";
import multer from "multer";
import { extractText } from "../ocr";
import { extractNameCandidates } from "../cardParser";
import { searchCards, findBestMatch, type TcgApiCard } from "../pokemonTcgApi";
import { getEmbedding, cosineSimilarity } from "../vision";
import { fetchWithRetry } from "../httpRetry";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
export const identifyRouter = Router();

identifyRouter.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "An image file is required." });

  try {
    const rawText = await extractText(req.file.buffer);
    const candidates = extractNameCandidates(rawText);

    let matches: TcgApiCard[] = [];
    try {
      matches = await findBestMatch(candidates);
    } catch (apiErr) {
      console.error("Pokémon TCG API lookup failed:", apiErr);
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

    res.json({ rawText, candidates, matches });
  } catch (err) {
    console.error("Identify failed:", err);
    res.status(500).json({ error: "Could not process that image." });
  }
});