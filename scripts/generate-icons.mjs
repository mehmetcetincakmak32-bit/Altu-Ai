import sharp from "sharp";
import fs from "fs";
import path from "path";

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.resolve("public/icons/icon.svg");
const outputDir = path.resolve("public/icons");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  try {
    for (const size of sizes) {
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, `icon-${size}.png`));
      console.log(`Generated icon-${size}.png`);
    }
    console.log("All icons generated successfully!");
  } catch (error) {
    console.error("Error generating icons:", error);
  }
}

generateIcons();