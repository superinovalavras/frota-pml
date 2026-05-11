import sharp from "sharp";
import path from "node:path";
import { promises as fs } from "node:fs";

const SRC = "C:/Users/ramon/Desktop/servidores";
const OUT = path.resolve("public/servidores");

const arquivos = [
  { src: "Rennan Campos.JPG", out: "rennan.jpg" },
  { src: "Rodolfo Alvarenga.JPG", out: "rodolfo.jpg" },
  { src: "Bruno dos Anjos Oliveira.JPG", out: "bruno.jpg" },
  { src: "Raquel Silva Pedrosa 2.JPG", out: "raquel.jpg" },
];

await fs.mkdir(OUT, { recursive: true });

for (const { src, out } of arquivos) {
  const inputPath = path.join(SRC, src);
  const outputPath = path.join(OUT, out);
  try {
    await sharp(inputPath)
      .rotate() // aplica orientação EXIF
      .resize(512, 512, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(outputPath);
    const stat = await fs.stat(outputPath);
    console.log(`✓ ${out}  (${Math.round(stat.size / 1024)} KB)`);
  } catch (e) {
    console.error(`✗ ${src}: ${e.message}`);
  }
}
