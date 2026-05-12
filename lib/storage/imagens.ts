"use client";

/** Pastas válidas dentro do bucket `imagens`. */
export type PastaImagem = "veiculos" | "perfis" | "marca";

/**
 * Envia uma imagem (data URL já recortada/comprimida) para o Supabase Storage
 * via a rota `/api/imagens` e devolve a URL pública.
 */
export async function enviarImagem(
  dataUrl: string,
  pasta: PastaImagem,
): Promise<string> {
  const resp = await fetch("/api/imagens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, pasta }),
  });
  if (!resp.ok) {
    let detalhe = `HTTP ${resp.status}`;
    try {
      const j = (await resp.json()) as { erro?: string };
      if (j?.erro) detalhe = j.erro;
    } catch {
      /* ignore */
    }
    throw new Error(`Upload de imagem falhou: ${detalhe}`);
  }
  const { url } = (await resp.json()) as { url: string };
  return url;
}
