/**
 * Cria um usuário de autenticação (Supabase Auth) para cada perfil em
 * `profiles` que tenha e-mail, com uma senha padrão, e grava `auth_user_id`.
 * Idempotente: se o usuário de auth já existe, só refaz o vínculo.
 *
 *   node --env-file=.env.local scripts/criar-usuarios-auth.mjs
 *
 * ⚠️ A senha padrão abaixo é provisória — oriente cada pessoa a trocar.
 */
import { createClient } from "@supabase/supabase-js";

const SENHA_PADRAO = "Frota@Lavras2026";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local).");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

// Mapa email -> id de usuários de auth já existentes
const existentes = new Map();
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error("listUsers:", error.message); process.exit(1); }
  for (const u of data.users) if (u.email) existentes.set(u.email.toLowerCase(), u.id);
  if (data.users.length < 200) break;
}

const { data: perfis, error: errPerfis } = await supabase
  .from("profiles")
  .select("id, nome, email")
  .neq("email", "");
if (errPerfis) { console.error("select profiles:", errPerfis.message); process.exit(1); }

let criados = 0, vinculados = 0, jaOk = 0;
for (const p of perfis) {
  const email = p.email.toLowerCase();
  let authId = existentes.get(email);
  if (!authId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: p.email,
      password: SENHA_PADRAO,
      email_confirm: true,
      user_metadata: { nome: p.nome },
    });
    if (error) { console.error(`createUser(${p.email}):`, error.message); continue; }
    authId = data.user.id;
    criados++;
  }
  const { data: atual } = await supabase.from("profiles").select("auth_user_id").eq("id", p.id).single();
  if (atual?.auth_user_id === authId) { jaOk++; continue; }
  const { error: errUpd } = await supabase.from("profiles").update({ auth_user_id: authId }).eq("id", p.id);
  if (errUpd) { console.error(`update profiles(${p.id}):`, errUpd.message); continue; }
  vinculados++;
  console.log(`  ${p.nome.padEnd(28)} ${p.email}`);
}

console.log(`\nUsuários de auth criados: ${criados} · vínculos novos: ${vinculados} · já ok: ${jaOk}`);
console.log(`Senha padrão de todos: ${SENHA_PADRAO}  (oriente cada pessoa a trocar)`);
