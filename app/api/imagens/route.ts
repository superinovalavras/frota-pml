import { NextResponse } from "next/server";
import { criarSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Upload de imagem para o bucket `imagens` do Supabase Storage.
 * Recebe um data URL (já recortado/comprimido no cliente) e devolve a URL
 * pública do arquivo salvo.
 *
 * TODO (Fase 2b): exigir sessão autenticada antes de aceitar o upload.
 */
const PASTAS = new Set(["veiculos", "perfis", "marca"]);
const BUCKET = "imagens";

type Corpo = { dataUrl?: unknown; pasta?: unknown };

export async function POST(req: Request) {
  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const { dataUrl, pasta } = corpo;
  if (typeof dataUrl !== "string" || typeof pasta !== "string" || !PASTAS.has(pasta)) {
    return NextResponse.json({ erro: "Parâmetros inválidos" }, { status: 400 });
  }

  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/i.exec(dataUrl);
  if (!m) {
    return NextResponse.json(
      { erro: "Esperado data URL de imagem (jpeg/png/webp)" },
      { status: 400 },
    );
  }
  const contentType = m[1].toLowerCase();
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const bytes = Buffer.from(m[3], "base64");
  if (bytes.byteLength > 5 * 1024 * 1024) {
    return NextResponse.json({ erro: "Imagem acima de 5 MB" }, { status: 413 });
  }

  const nome = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const supabase = criarSupabaseAdmin();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(nome, bytes, { contentType, upsert: false });
  if (error) {
    return NextResponse.json({ erro: `Falha no upload: ${error.message}` }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nome);
  return NextResponse.json({ url: data.publicUrl });
}
