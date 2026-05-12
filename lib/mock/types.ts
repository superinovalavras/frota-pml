export type Perfil = "master" | "gestor" | "servidor" | "motorista";

/** Nível de acesso técnico no sistema (independente de hierarquia organizacional) */
export type NivelAcesso = "master" | "gestor" | "servidor";

export type StatusVeiculo =
  | "disponivel"
  | "em_uso"
  | "manutencao"
  | "indisponivel";

export type StatusAgendamento =
  | "pendente"
  | "confirmado"
  | "em_andamento"
  | "concluido"
  | "cancelado"
  | "substituido";

export type CategoriaCNH = "A" | "B" | "C" | "D" | "E" | "AB" | "AC" | "AD" | "AE";

export interface Secretaria {
  id: string;
  nome: string;
  sigla: string;
}

export interface Superintendencia {
  id: string;
  nome: string;
  sigla: string;
  secretariaId: string;
}

/**
 * Função organizacional. Define a hierarquia (prioridade) e o nível de acesso
 * técnico do usuário. Funções de sistema (Master e Motorista) não podem ser
 * excluídas, mas podem ser renomeadas e reordenadas.
 */
export interface Funcao {
  id: string;
  nome: string;
  /** Menor número = maior prioridade na hierarquia (1 = topo) */
  hierarquia: number;
  nivelAcesso: NivelAcesso;
  /** Funções de sistema não podem ser excluídas */
  sistema?: boolean;
  /** Usuários com esta função entram automaticamente no pool de motoristas */
  ehMotorista?: boolean;
  /** Indica que esta é a função Master única */
  ehMaster?: boolean;
}

export interface Usuario {
  id: string;
  /** Nome completo */
  nome: string;
  cpf: string;
  masp: string;
  /** Email institucional */
  email: string;
  /** Cargo (texto livre) — ex.: "Auditor Fiscal Municipal" */
  cargo: string;
  /** Referência à Função (hierarquia + nivelAcesso) */
  funcaoId: string;
  /** Derivado de funcao.nivelAcesso — mantido para compat de visibilidade */
  perfil: Perfil;
  /** Derivado de funcao.hierarquia — mantido para compat */
  hierarquia: number;
  /** Órgão da prefeitura (lotação principal) */
  secretariaId: string;
  /** null para gestor que responde pela secretaria inteira ou para Master */
  superintendenciaId: string | null;
  telefone: string;
  /** Categoria da CNH — opcional. Se ausente, usuário não pode dirigir. */
  cnhCategoria?: CategoriaCNH;
  cnhNumero?: string;
  /** ISO date (YYYY-MM-DD) */
  cnhValidade?: string;
  /** URL ou caminho da foto de perfil (ex.: "/servidores/fulano.jpg"). */
  fotoUrl?: string;
  /** Vínculo (1:1) com o usuário de autenticação do Supabase. null até o 1º login. */
  authUserId?: string | null;
}

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  cor: string;
  cnhExigida: CategoriaCNH;
  secretariaId: string;
  /** null = frota geral da Secretaria (qualquer superintendência pode usar) */
  superintendenciaId: string | null;
  status: StatusVeiculo;
  kmAtual: number;
  observacoes?: string;
  /** Data URL ou URL externa. Em Fase 1 fica em localStorage. */
  fotoUrl?: string;
}

export interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  cnh: string;
  categoriaCnh: CategoriaCNH;
  validadeCnh: string;
  telefone: string;
  secretariaId: string;
  superintendenciaId: string | null;
  ativo: boolean;
}

/**
 * Passageiro da viagem — pode ser um usuário cadastrado no sistema
 * (recebe email automaticamente quando integração estiver ativa) ou um
 * convidado externo (apenas nome + motivo).
 */
export type Passageiro =
  | { tipo: "usuario"; usuarioId: string }
  | { tipo: "convidado"; nome: string; motivo?: string };

export interface Agendamento {
  id: string;
  veiculoId: string;
  solicitanteId: string;
  motoristaId: string | null;
  /** ISO local. Quando diaTodo=true, é o início do dia (00:00). */
  inicio: string;
  /** ISO local. Quando diaTodo=true, é o fim do dia (23:59). */
  fim: string;
  /** Reserva ocupa o dia inteiro — interface esconde campos de hora */
  diaTodo?: boolean;
  /** Local de retirada do veículo */
  localPartida: string;
  /** Local onde o veículo será devolvido */
  localDevolucao: string;
  destino: string;
  finalidade: string;
  /** Lista de passageiros — usuários do sistema OU convidados externos */
  passageiros: Passageiro[];
  status: StatusAgendamento;
  observacoes?: string;
  criadoEm: string;
  /** Registro de saída do veículo (check-in da viagem). ISO timestamp. */
  checkinEm?: string;
  kmSaida?: number;
  /** Data URL JPEG da foto do painel na saída. */
  fotoSaidaUrl?: string;
  obsSaida?: string;
  /** Registro de retorno do veículo (check-out da viagem). ISO timestamp. */
  checkoutEm?: string;
  kmRetorno?: number;
  fotoRetornoUrl?: string;
  obsRetorno?: string;
}
