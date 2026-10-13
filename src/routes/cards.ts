import { Router } from "express";
import multer from "multer";
import { prisma } from "../db";
import { buildKey, uploadImage, deleteImage, getImageUrl, ensureBucket } from "../storage";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const cardsRouter = Router();

ensureBucket().catch((err) => console.error("Could not ensure S3 bucket exists:", err));

async function withImageUrl(card: any) {
  return { ...card, imageUrl: await getImageUrl(card.imageKey) };
}

// GET /api/cards
cardsRouter.get("/", async (req, res) => {
  const cards = await prisma.card.findMany({ orderBy: { createdAt: "desc" } });
  res.json(await Promise.all(cards.map(withImageUrl)));
});

// GET /api/cards/:id
cardsRouter.get("/:id", async (req, res) => {
  const card = await prisma.card.findUnique({ where: { id: req.params.id } });
  if (!card) return res.status(404).json({ error: `No card with id '${req.params.id}'.` });
  res.json(await withImageUrl(card));
});

import { createCardSchema, updateCardSchema } from "../schemas/card";

// POST /api/cards
cardsRouter.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "An image file is required." });

  const parsed = createCardSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
  }
  const { name, setName, cardNumber, rarity, condition, quantity, notes, identifyCandidates } = parsed.data;

  const key = buildKey(req.file.originalname);
  await uploadImage(key, req.file.buffer, req.file.mimetype);

  const card = await prisma.card.create({
    data: {
      name,
      setName,
      cardNumber: cardNumber ?? null,
      rarity: rarity ?? null,
      condition,
      quantity,
      notes: notes ?? null,
      imageKey: key,
      identifyCandidates: identifyCandidates ? JSON.parse(identifyCandidates) : undefined,
    },
  });

  res.status(201).json(await withImageUrl(card));
});

// DELETE /api/cards/:id
cardsRouter.delete("/:id", async (req, res) => {
  const card = await prisma.card.findUnique({ where: { id: req.params.id } });
  if (!card) return res.status(404).json({ error: `No card with id '${req.params.id}'.` });
  await deleteImage(card.imageKey);
  await prisma.card.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// PATCH /api/cards/:id
cardsRouter.patch("/:id", async (req, res) => {
    const parsed = updateCardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
    }
  
    const existing = await prisma.card.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: `No card with id '${req.params.id}'.` });
  
    const card = await prisma.card.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(await withImageUrl(card));
  });