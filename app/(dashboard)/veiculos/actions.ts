"use server";

import { criarSupabaseAdmin } from "@/lib/supabase/server";
import { obterAtor } from "@/lib/api/autenticar";
import { inserirNotificacoes } from "@/lib/notificar-server";

/**
 * Avisa no sino que um defeito foi relatado: notifica o Master e os gestores da
 * secretaria dona do veículo (menos quem relatou). Falha silenciosa — o aviso
 * nunca quebra o relato em si (que já foi salvo pelo cliente).
 */
export async function avisarDefeito(
  veiculoId: string,
  descricao: string,
): Promise<void> {
  const aut = await obterAtor();
  if (!aut.ok) return;
  const ator = aut.ator;
  const admin = criarSupabaseAdmin();

  const { data: veic } = await admin
    .from("veiculos")
    .select("secretaria_id, modelo, placa")
    .eq("id", veiculoId)
    .maybeSingle();
  if (!veic) return;

  const { data: profs } = await admin
    .from("profiles")
    .select("id, perfil, secretaria_id");
  if (!profs) return;

  const destinatarios = profs
    .filter(
      (p) =>
        p.perfil === "master" ||
        (p.perfil === "gestor" && p.secretaria_id === veic.secretaria_id),
    )
    .map((p) => p.id);

  const nomeVeic =
    `${veic.modelo ?? ""}${veic.placa ? ` · ${veic.placa}` : ""}`.trim() ||
    "veículo";

  await inserirNotificacoes(
    admin,
    destinatarios.map((id) => ({
      destinatarioId: id,
      tipo: "veiculo_manutencao" as const,
      titulo: `Defeito relatado — ${nomeVeic}`,
      mensagem: `${ator.nome}: ${descricao.slice(0, 140)}`,
      veiculoId,
    })),
    ator.profileId,
  );
}
