import fs from "fs";
import { extractNumberText } from "./ocr";
import { extractCollectorNumber } from "./cardParser";

(async () => {
  const buf = fs.readFileSync("//Users/ethanfowler/Desktop/proj/pokemon-cards-node/charizard-hires.png"); // put your real photo path here
  const text = await extractNumberText(buf);
  console.log("raw:", JSON.stringify(text));
  console.log("parsed:", extractCollectorNumber(text));
})();

