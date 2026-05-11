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

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}
