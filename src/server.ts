import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import "dotenv/config";
import express from "express";
import cors from "cors";

import { prisma } from "./db";
import { cardsRouter } from "./routes/cards";
import { identifyRouter } from "./routes/identify";

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const port = process.env.PORT ?? 3000;

app.get("/health", async (req, res) => {
  const count = await prisma.card.count();
  res.json({ status: "ok", cardCount: count });
});

app.use("/api/cards", cardsRouter);
app.use("/api/identify", identifyRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});