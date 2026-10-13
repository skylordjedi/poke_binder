import { createWorker, Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng");
  }
  return workerPromise;
}

export async function extractText(imageBuffer: Buffer): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(imageBuffer);
  return data.text;
}