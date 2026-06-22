/**
 * Utilitário pontual para conferir/aplicar/verificar SQL no banco via conexão
 * direta. Lê SUPABASE_DB_URL do ambiente
 * (use: `node --env-file=.env.local scripts/db-run.mjs ...`).
 *
 * Uso:
 *   node --env-file=.env.local scripts/db-run.mjs check
 *   node --env-file=.env.local scripts/db-run.mjs apply supabase/migrations/0009_integridade.sql
 *   node --env-file=.env.local scripts/db-run.mjs verify
 *   node --env-file=.env.local scripts/db-run.mjs sql "select 1"
 *
 * NUNCA imprime a connection string. Requer o pacote `pg` (instalado --no-save).
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("ERRO: defina SUPABASE_DB_URL no .env.local (ver instruções).");
  process.exit(1);
}

const [, , cmd, arg] = process.argv;

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  // Evita travar indefinidamente se a rede/host estiver errado.
  connectionTimeoutMillis: 15000,
  statement_timeout: 60000,
});

// Conferências de dados que PODEM bloquear a criação das constraints da 0009.
const CHECKS = {
  reservas_sobrepostas: `
    select count(*)::int as n
      from public.agendamentos a
      join public.agendamentos b
        on a.veiculo_id = b.veiculo_id and a.id < b.id
       and tstzrange(a.inicio, a.fim, '[)') && tstzrange(b.inicio, b.fim, '[)')
     where a.status in ('pendente','confirmado','em_andamento')
       and b.status in ('pendente','confirmado','em_andamento')`,
  cpf_duplicados: `
    select count(*)::int as n from (
      select cpf from public.profiles where cpf <> '' group by cpf having count(*) > 1
    ) t`,
  masp_duplicados: `
    select count(*)::int as n from (
      select masp from public.profiles where masp <> '' group by masp having count(*) > 1
    ) t`,
  email_duplicados: `
    select count(*)::int as n from (
      select lower(email) from public.profiles where email <> '' group by lower(email) having count(*) > 1
    ) t`,
};

// Verificações de que os objetos das migrations 0009/0010 existem.
const VERIFY = {
  "constraint anti-sobreposição": `
    select count(*)::int as n from pg_constraint
     where conname = 'agendamentos_sem_sobreposicao'
       and conrelid = 'public.agendamentos'::regclass`,
  "trigger guarda-status": `
    select count(*)::int as n from pg_trigger
     where tgname = 'agendamentos_guard_status' and not tgisinternal`,
  "índice único cpf": `select count(*)::int as n from pg_indexes where indexname = 'uq_profiles_cpf'`,
  "índice único masp": `select count(*)::int as n from pg_indexes where indexname = 'uq_profiles_masp'`,
  "índice único email": `select count(*)::int as n from pg_indexes where indexname = 'uq_profiles_email'`,
  "view usuarios_visiveis": `
    select count(*)::int as n from pg_views
     where schemaname = 'public' and viewname = 'usuarios_visiveis'`,
  "policy ins_notificacoes": `
    select count(*)::int as n from pg_policies
     where schemaname = 'public' and tablename = 'notificacoes' and policyname = 'ins_notificacoes'`,
};

async function rodarConjunto(titulo, conjunto, okQuando) {
  console.log(`\n== ${titulo} ==`);
  let problemas = 0;
  for (const [nome, sql] of Object.entries(conjunto)) {
    const { rows } = await client.query(sql);
    const n = rows[0]?.n ?? 0;
    const ok = okQuando(n);
    if (!ok) problemas++;
    console.log(`${ok ? "OK " : "!! "}${nome}: ${n}`);
  }
  return problemas;
}

async function main() {
  await client.connect();
  try {
    // A view da 0010 usa security_invoker (exige PostgreSQL 15+). Reporta a
    // versão para confirmar antes de aplicar.
    const { rows: ver } = await client.query("show server_version");
    const versao = ver[0]?.server_version ?? "?";
    const major = parseInt(versao, 10);
    console.log(`PostgreSQL: ${versao}${major >= 15 ? " (ok p/ security_invoker)" : " (⚠️ <15: a view da 0010 não vai aplicar)"}`);

    if (cmd === "check") {
      const problemas = await rodarConjunto(
        "Conferências de dados (devem ser 0)",
        CHECKS,
        (n) => n === 0,
      );
      console.log(
        problemas === 0
          ? "\nRESULTADO: limpo ✅ — seguro aplicar a 0009."
          : "\nRESULTADO: há pendências ❌ — limpe os dados antes da 0009.",
      );
      process.exit(problemas === 0 ? 0 : 2);
    } else if (cmd === "verify") {
      const problemas = await rodarConjunto(
        "Objetos esperados (devem ser 1)",
        VERIFY,
        (n) => n >= 1,
      );
      console.log(
        problemas === 0
          ? "\nRESULTADO: todos os objetos presentes ✅"
          : `\nRESULTADO: ${problemas} objeto(s) faltando ❌`,
      );
      process.exit(problemas === 0 ? 0 : 2);
    } else if (cmd === "apply") {
      if (!arg) throw new Error("informe o arquivo .sql");
      const sql = readFileSync(arg, "utf8");
      // Atomicidade explícita: ou aplica tudo, ou nada.
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("commit");
      } catch (e) {
        await client.query("rollback");
        throw e;
      }
      console.log(`APLICADO (transação): ${arg} ✅`);
    } else if (cmd === "sql") {
      if (!arg) throw new Error("informe a query");
      const { rows } = await client.query(arg);
      console.log(JSON.stringify(rows, null, 2));
    } else {
      throw new Error(
        "comando inválido (use: check | apply <arquivo> | verify | sql <query>)",
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("FALHOU:", e.message);
  process.exit(1);
});
