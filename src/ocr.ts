import sharp from "sharp";
import { createWorker, PSM, type Worker } from "tesseract.js";

// ---- Worker 1: general text ----
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

// ---- Worker 2: digits and "/" only, for the collector number ----
let numberWorkerPromise: Promise<Worker> | null = null;

function getNumberWorker(): Promise<Worker> {
  if (!numberWorkerPromise) {
    numberWorkerPromise = (async () => {
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789/",   // comment this line out to test without
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      return worker;
    })();
  }
  return numberWorkerPromise;
}

// Each region is a rectangle given as fractions of the whole card.
const NUMBER_REGIONS = [
  // Experiment: tight crop around "199/165" on this card
  { name: "tight", left: 0.162, width: 0.112, top: 0.945, height: 0.026 },
];

export async function extractNumberText(imageBuffer: Buffer): Promise<string> {
  const upright = await sharp(imageBuffer).rotate().toBuffer();
  const { width = 0, height = 0 } = await sharp(upright).metadata();
  const worker = await getNumberWorker();

  const texts: string[] = [];
  for (const region of NUMBER_REGIONS) {
    const base = sharp(upright)
      .extract({
        left: Math.round(width * region.left),
        top: Math.round(height * region.top),
        width: Math.round(width * region.width),
        height: Math.round(height * region.height),
      })
      .greyscale()
      .resize({ width: 400 });

    for (const invert of [false, true]) {
      const crop = await (invert ? base.clone().negate() : base.clone()).toBuffer();

      // Debug only: set DEBUG_OCR=1 to save each crop so we can look at it
      if (process.env.DEBUG_OCR) {
        await sharp(crop).toFile(`strip-debug-${region.name}-${invert ? "inv" : "norm"}.png`);
      }

      const { data } = await worker.recognize(crop);
      texts.push(data.text);
    }
  }
  return texts.join("\n");
}