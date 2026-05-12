/**
 * Tipos do banco — espelham `supabase/migrations/0001_schema.sql`.
 *
 * Mantidos à mão por enquanto. Quando o schema estabilizar, dá para gerar
 * automaticamente com:  `supabase gen types typescript --linked > lib/supabase/types.gen.ts`
 *
 * Obs.: as linhas usam `type` (não `interface`) de propósito — assim casam
 * com `Record<string, unknown>`, exigido pelos tipos do supabase-js.
 */

export type PerfilDb = "master" | "gestor" | "servidor" | "motorista";
export type NivelAcessoDb = "master" | "gestor" | "servidor";
export type StatusVeiculoDb =
  | "disponivel"
  | "em_uso"
  | "manutencao"
  | "indisponivel";
export type StatusAgendamentoDb =
  | "pendente"
  | "confirmado"
  | "em_andamento"
  | "concluido"
  | "cancelado"
  | "substituido";

type SecretariaRow = {
  id: string;
  nome: string;
  sigla: string;
  criado_em: string;
};

type SuperintendenciaRow = {
  id: string;
  nome: string;
  sigla: string;
  secretaria_id: string;
  criado_em: string;
};

type FuncaoRow = {
  id: string;
  nome: string;
  hierarquia: number;
  nivel_acesso: NivelAcessoDb;
  sistema: boolean;
  eh_motorista: boolean;
  eh_master: boolean;
  criado_em: string;
};

type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  nome: string;
  cpf: string;
  masp: string;
  email: string;
  cargo: string;
  funcao_id: string;
  perfil: PerfilDb;
  hierarquia: number;
  secretaria_id: string;
  superintendencia_id: string | null;
  telefone: string;
  cnh_categoria: string | null;
  cnh_numero: string | null;
  cnh_validade: string | null;
  foto_url: string | null;
  criado_em: string;
};

type VeiculoRow = {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  cor: string;
  cnh_exigida: string;
  secretaria_id: string;
  superintendencia_id: string | null;
  status: StatusVeiculoDb;
  km_atual: number;
  observacoes: string | null;
  foto_url: string | null;
  criado_em: string;
};

type ConfiguracaoRow = {
  chave: string;
  valor: unknown;
  atualizado_em: string;
};

type AgendamentoRow = {
  id: string;
  veiculo_id: string;
  solicitante_id: string;
  motorista_id: string | null;
  inicio: string;
  fim: string;
  dia_todo: boolean;
  local_partida: string;
  local_devolucao: string;
  destino: string;
  finalidade: string;
  passageiros: unknown;
  status: StatusAgendamentoDb;
  observacoes: string | null;
  checkin_em: string | null;
  km_saida: number | null;
  foto_saida_url: string | null;
  obs_saida: string | null;
  checkout_em: string | null;
  km_retorno: number | null;
  foto_retorno_url: string | null;
  obs_retorno: string | null;
  criado_em: string;
};

type TableShape<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      secretarias: TableShape<SecretariaRow>;
      superintendencias: TableShape<SuperintendenciaRow>;
      funcoes: TableShape<FuncaoRow>;
      profiles: TableShape<ProfileRow>;
      veiculos: TableShape<VeiculoRow>;
      agendamentos: TableShape<AgendamentoRow>;
      configuracoes: TableShape<ConfiguracaoRow>;
    };
    Views: { [_ in never]: never };
    Functions: {
      novo_id: { Args: Record<string, never>; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
