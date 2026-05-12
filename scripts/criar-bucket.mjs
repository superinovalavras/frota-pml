/**
 * Cria (se não existir) o bucket público `imagens` no Supabase Storage.
 * Roda uma vez, com a service_role key.
 *
 *   node --env-file=.env.local scripts/criar-bucket.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).");
  process.exit(1);
}

const supabase = createClient(url, key);
const { data: buckets } = await supabase.storage.listBuckets();
if (buckets?.some((b) => b.id === "imagens")) {
  console.log("Bucket 'imagens' já existe — nada a fazer.");
  process.exit(0);
}

const { error } = await supabase.storage.createBucket("imagens", {
  public: true,
  fileSizeLimit: "5MB",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
});
if (error) {
  console.error("Falha ao criar bucket:", error.message);
  process.exit(1);
}
console.log("Bucket 'imagens' criado (público).");
