import sharp from "sharp";
import path from "node:path";
import { promises as fs } from "node:fs";

const SRC = path.resolve("Foto dos carros");
const OUT = path.resolve("public/veiculos");

const arquivos = [
  { src: "m_fiat mobi like 21.jpg", out: "mobi.jpg" },
  { src: "polo.jpg", out: "polo.jpg" },
];

await fs.mkdir(OUT, { recursive: true });

for (const { src, out } of arquivos) {
  const inputPath = path.join(SRC, src);
  const outputPath = path.join(OUT, out);
  try {
    await sharp(inputPath)
      .rotate()
      .resize(800, 600, { fit: "cover", position: "centre" })
      .jpeg({ quality: 84, mozjpeg: true })
      .toFile(outputPath);
    const stat = await fs.stat(outputPath);
    console.log(`✓ ${out}  (${Math.round(stat.size / 1024)} KB)`);
  } catch (e) {
    console.error(`✗ ${src}: ${e.message}`);
  }
}
