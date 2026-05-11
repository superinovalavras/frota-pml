/**
 * Lê um File de imagem, redimensiona para no máximo `maxLado` pixels no maior
 * lado e retorna um data URL JPEG (qualidade 0.85). Mantém proporção.
 *
 * Em Fase 1 isso evita estourar o limite de ~5 MB do localStorage com fotos
 * tiradas em alta resolução pelo celular.
 */
export async function lerImagemRedimensionada(
  file: File,
  maxLado = 800,
): Promise<string> {
  const dataUrlOriginal = await fileToDataURL(file);
  const img = await carregarImagem(dataUrlOriginal);

  const { width, height } = img;
  if (width <= maxLado && height <= maxLado) {
    return dataUrlOriginal;
  }

  const ratio = Math.min(maxLado / width, maxLado / height);
  const novoLargura = Math.round(width * ratio);
  const novoAltura = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = novoLargura;
  canvas.height = novoAltura;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrlOriginal;
  ctx.drawImage(img, 0, 0, novoLargura, novoAltura);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Lê um File de imagem e devolve um data URL (sem redimensionar). */
export function lerArquivoComoDataUrl(file: File): Promise<string> {
  return fileToDataURL(file);
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}

/**
 * Recorta uma região (em pixels da imagem original) de uma imagem e devolve
 * um data URL JPEG. Limita o lado maior do resultado a `maxLado` px.
 */
export async function recortarImagem(
  imagemSrc: string,
  regiao: { x: number; y: number; width: number; height: number },
  maxLado = 1000,
): Promise<string> {
  const img = await carregarImagem(imagemSrc);
  let outW = Math.max(1, Math.round(regiao.width));
  let outH = Math.max(1, Math.round(regiao.height));
  const maior = Math.max(outW, outH);
  if (maior > maxLado) {
    const r = maxLado / maior;
    outW = Math.max(1, Math.round(outW * r));
    outH = Math.max(1, Math.round(outH * r));
  }
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return imagemSrc;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    regiao.x,
    regiao.y,
    regiao.width,
    regiao.height,
    0,
    0,
    outW,
    outH,
  );
  return canvas.toDataURL("image/jpeg", 0.85);
}
