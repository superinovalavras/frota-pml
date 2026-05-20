/**
 * Conversões entre as linhas do banco (snake_case, ver `lib/supabase/types.ts`)
 * e os tipos de domínio do app (camelCase, ver `lib/mock/types.ts`).
 */
import type {
  Agendamento,
  CategoriaCNH,
  EmailEventoTipo,
  EmailOutbox,
  EmailStatus,
  Funcao,
  Manutencao,
  NivelAcesso,
  Passageiro,
  Perfil,
  Secretaria,
  StatusAgendamento,
  StatusVeiculo,
  Superintendencia,
  Usuario,
  Veiculo,
} from "@/lib/mock/types";
import type { Database } from "@/lib/supabase/types";

type Tables = Database["public"]["Tables"];

// ---------------------------------------------------------------------
// Datas / fuso
//  * O app trabalha com "hora de parede de Lavras" (Brasil, UTC−3, sem DST).
//  * No banco os campos de hora são `timestamptz`. Convertemos nas bordas.
// ---------------------------------------------------------------------
const TZ = "America/Sao_Paulo";

/** "2026-05-12T08:00:00" (hora local de Lavras) → ISO com offset p/ o banco */
export function isoLocalParaTimestamptz(s: string): string {
  if (!s) return s;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) return s; // já tem offset
  const comSegundos = s.length === 16 ? `${s}:00` : s;
  return `${comSegundos}-03:00`;
}

/** timestamptz do banco → "YYYY-MM-DDTHH:MM:SS" na hora local de Lavras */
export function timestamptzParaIsoLocal(ts: string): string {
  if (!ts) return ts;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  // 'sv-SE' produz "YYYY-MM-DD HH:MM:SS"
  return d.toLocaleString("sv-SE", { timeZone: TZ }).replace(" ", "T");
}

const orNull = (v: string | undefined | null): string | null =>
  v == null || v === "" ? null : v;

// ---------------------------------------------------------------------
// Secretarias
// ---------------------------------------------------------------------
export function secretariaFromRow(r: Tables["secretarias"]["Row"]): Secretaria {
  return { id: r.id, nome: r.nome, sigla: r.sigla };
}
export function secretariaToRow(s: Secretaria): Tables["secretarias"]["Insert"] {
  return { id: s.id, nome: s.nome, sigla: s.sigla };
}

// ---------------------------------------------------------------------
// Superintendências
// ---------------------------------------------------------------------
export function superintendenciaFromRow(
  r: Tables["superintendencias"]["Row"],
): Superintendencia {
  return {
    id: r.id,
    nome: r.nome,
    sigla: r.sigla,
    secretariaId: r.secretaria_id,
  };
}
export function superintendenciaToRow(
  s: Superintendencia,
): Tables["superintendencias"]["Insert"] {
  return { id: s.id, nome: s.nome, sigla: s.sigla, secretaria_id: s.secretariaId };
}

// ---------------------------------------------------------------------
// Funções
// ---------------------------------------------------------------------
export function funcaoFromRow(r: Tables["funcoes"]["Row"]): Funcao {
  return {
    id: r.id,
    nome: r.nome,
    hierarquia: r.hierarquia,
    nivelAcesso: r.nivel_acesso as NivelAcesso,
    sistema: r.sistema || undefined,
    ehMotorista: r.eh_motorista || undefined,
    ehMaster: r.eh_master || undefined,
  };
}
export function funcaoToRow(f: Funcao): Tables["funcoes"]["Insert"] {
  return {
    id: f.id,
    nome: f.nome,
    hierarquia: f.hierarquia,
    nivel_acesso: f.nivelAcesso,
    sistema: !!f.sistema,
    eh_motorista: !!f.ehMotorista,
    eh_master: !!f.ehMaster,
  };
}

// ---------------------------------------------------------------------
// Usuários (profiles)
// ---------------------------------------------------------------------
export function usuarioFromRow(r: Tables["profiles"]["Row"]): Usuario {
  return {
    id: r.id,
    nome: r.nome,
    cpf: r.cpf ?? "",
    masp: r.masp ?? "",
    email: r.email ?? "",
    cargo: r.cargo ?? "",
    funcaoId: r.funcao_id,
    perfil: r.perfil as Perfil,
    hierarquia: r.hierarquia,
    secretariaId: r.secretaria_id,
    superintendenciaId: r.superintendencia_id,
    telefone: r.telefone ?? "",
    cnhCategoria: (r.cnh_categoria as CategoriaCNH | null) ?? undefined,
    cnhNumero: r.cnh_numero ?? undefined,
    cnhValidade: r.cnh_validade ?? undefined,
    fotoUrl: r.foto_url ?? undefined,
    authUserId: r.auth_user_id,
  };
}
export function usuarioToRow(u: Usuario): Tables["profiles"]["Insert"] {
  return {
    id: u.id,
    nome: u.nome,
    cpf: u.cpf ?? "",
    masp: u.masp ?? "",
    email: u.email ?? "",
    cargo: u.cargo ?? "",
    funcao_id: u.funcaoId,
    perfil: u.perfil,
    hierarquia: u.hierarquia,
    secretaria_id: u.secretariaId,
    superintendencia_id: u.superintendenciaId,
    telefone: u.telefone ?? "",
    cnh_categoria: orNull(u.cnhCategoria),
    cnh_numero: orNull(u.cnhNumero),
    cnh_validade: orNull(u.cnhValidade),
    foto_url: orNull(u.fotoUrl),
  };
}

// ---------------------------------------------------------------------
// Veículos
// ---------------------------------------------------------------------
export function veiculoFromRow(r: Tables["veiculos"]["Row"]): Veiculo {
  return {
    id: r.id,
    placa: r.placa,
    modelo: r.modelo ?? "",
    marca: r.marca ?? "",
    ano: r.ano,
    cor: r.cor ?? "",
    cnhExigida: r.cnh_exigida as CategoriaCNH,
    secretariaId: r.secretaria_id,
    superintendenciaId: r.superintendencia_id,
    status: r.status as StatusVeiculo,
    kmAtual: r.km_atual,
    observacoes: r.observacoes ?? undefined,
    fotoUrl: r.foto_url ?? undefined,
  };
}
export function veiculoToRow(v: Veiculo): Tables["veiculos"]["Insert"] {
  return {
    id: v.id,
    placa: v.placa,
    modelo: v.modelo ?? "",
    marca: v.marca ?? "",
    ano: v.ano,
    cor: v.cor ?? "",
    cnh_exigida: v.cnhExigida,
    secretaria_id: v.secretariaId,
    superintendencia_id: v.superintendenciaId,
    status: v.status,
    km_atual: v.kmAtual,
    observacoes: orNull(v.observacoes),
    foto_url: orNull(v.fotoUrl),
  };
}

// ---------------------------------------------------------------------
// Manutenções
// ---------------------------------------------------------------------
export function manutencaoFromRow(
  r: Tables["manutencoes"]["Row"],
): Manutencao {
  return {
    id: r.id,
    veiculoId: r.veiculo_id,
    motivo: r.motivo,
    previsaoRetorno: r.previsao_retorno,
    criadoPor: r.criado_por,
    criadoEm: r.criado_em,
    encerradoEm: r.encerrado_em ?? undefined,
  };
}
export function manutencaoToRow(m: Manutencao): Tables["manutencoes"]["Insert"] {
  return {
    id: m.id,
    veiculo_id: m.veiculoId,
    motivo: m.motivo,
    previsao_retorno: m.previsaoRetorno,
    criado_por: m.criadoPor,
    criado_em: m.criadoEm,
    encerrado_em: orNull(m.encerradoEm),
  };
}

// ---------------------------------------------------------------------
// Email outbox
// ---------------------------------------------------------------------
export function emailOutboxFromRow(
  r: Tables["email_outbox"]["Row"],
): EmailOutbox {
  return {
    id: r.id,
    tipoEvento: r.tipo_evento as EmailEventoTipo,
    destinatarioEmail: r.destinatario_email,
    destinatarioNome: r.destinatario_nome ?? "",
    destinatarioProfileId: r.destinatario_profile_id,
    assunto: r.assunto ?? "",
    payload: (r.payload ?? {}) as Record<string, unknown>,
    corpoHtml: r.corpo_html,
    corpoTexto: r.corpo_texto,
    status: r.status as EmailStatus,
    tentativas: r.tentativas,
    erroUltimo: r.erro_ultimo,
    agendamentoId: r.agendamento_id,
    veiculoId: r.veiculo_id,
    criadoEm: r.criado_em,
    enviadoEm: r.enviado_em,
  };
}

// ---------------------------------------------------------------------
// Agendamentos
// ---------------------------------------------------------------------
export function agendamentoFromRow(
  r: Tables["agendamentos"]["Row"],
): Agendamento {
  return {
    id: r.id,
    veiculoId: r.veiculo_id,
    solicitanteId: r.solicitante_id,
    motoristaId: r.motorista_id,
    inicio: timestamptzParaIsoLocal(r.inicio),
    fim: timestamptzParaIsoLocal(r.fim),
    diaTodo: r.dia_todo || undefined,
    localPartida: r.local_partida ?? "",
    localDevolucao: r.local_devolucao ?? "",
    destino: r.destino ?? "",
    finalidade: r.finalidade ?? "",
    passageiros: (Array.isArray(r.passageiros) ? r.passageiros : []) as Passageiro[],
    status: r.status as StatusAgendamento,
    observacoes: r.observacoes ?? undefined,
    criadoEm: r.criado_em,
    checkinEm: r.checkin_em ?? undefined,
    kmSaida: r.km_saida ?? undefined,
    fotoSaidaUrl: r.foto_saida_url ?? undefined,
    obsSaida: r.obs_saida ?? undefined,
    checkoutEm: r.checkout_em ?? undefined,
    kmRetorno: r.km_retorno ?? undefined,
    fotoRetornoUrl: r.foto_retorno_url ?? undefined,
    obsRetorno: r.obs_retorno ?? undefined,
  };
}
export function agendamentoToRow(
  a: Agendamento,
): Tables["agendamentos"]["Insert"] {
  return {
    id: a.id,
    veiculo_id: a.veiculoId,
    solicitante_id: a.solicitanteId,
    motorista_id: a.motoristaId,
    inicio: isoLocalParaTimestamptz(a.inicio),
    fim: isoLocalParaTimestamptz(a.fim),
    dia_todo: !!a.diaTodo,
    local_partida: a.localPartida ?? "",
    local_devolucao: a.localDevolucao ?? "",
    destino: a.destino ?? "",
    finalidade: a.finalidade ?? "",
    passageiros: a.passageiros ?? [],
    status: a.status,
    observacoes: orNull(a.observacoes),
    checkin_em: orNull(a.checkinEm),
    km_saida: a.kmSaida ?? null,
    foto_saida_url: orNull(a.fotoSaidaUrl),
    obs_saida: orNull(a.obsSaida),
    checkout_em: orNull(a.checkoutEm),
    km_retorno: a.kmRetorno ?? null,
    foto_retorno_url: orNull(a.fotoRetornoUrl),
    obs_retorno: orNull(a.obsRetorno),
    criado_em: a.criadoEm,
  };
}
