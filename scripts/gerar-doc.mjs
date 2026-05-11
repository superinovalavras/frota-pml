/**
 * Gera a documentação do sistema FROTA PML em formato .docx.
 * Uso: node scripts/gerar-doc.mjs
 * Saída: docs/FROTA-PML-Documentacao-e-Tutorial.docx
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  PageBreak,
  TableOfContents,
  ExternalHyperlink,
} from "docx";
import { promises as fs } from "node:fs";
import path from "node:path";

const AZUL = "1B3A6B";
const AMARELO = "B58A00";
const CINZA = "555555";

/* ---------- helpers ---------- */
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, color: AZUL, size: 32 })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, color: AZUL, size: 26 })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, color: CINZA, size: 23 })],
  });
}
function p(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, size: 22 })];
  return new Paragraph({ spacing: { after: 120 }, ...opts, children: runs });
}
function bullet(text, level = 0) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, size: 22 })];
  return new Paragraph({
    bullet: { level },
    spacing: { after: 60 },
    children: runs,
  });
}
function num(text, ref = "passos") {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, size: 22 })];
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80 },
    children: runs,
  });
}
function b(text) {
  return new TextRun({ text, bold: true, size: 22 });
}
function t(text) {
  return new TextRun({ text, size: 22 });
}
function code(text) {
  return new TextRun({ text, font: "Consolas", size: 20, color: "8A4B00" });
}
function spacer() {
  return new Paragraph({ text: "", spacing: { after: 80 } });
}
function infoBox(linhas) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: AMARELO },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: AMARELO },
      left: { style: BorderStyle.SINGLE, size: 6, color: AMARELO },
      right: { style: BorderStyle.SINGLE, size: 2, color: AMARELO },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "FFF8E1" },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: linhas.map((l) =>
              new Paragraph({
                spacing: { after: 40 },
                children: Array.isArray(l) ? l : [new TextRun({ text: l, size: 21 })],
              }),
            ),
          }),
        ],
      }),
    ],
  });
}
function tabela(headers, rows) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (htext) =>
        new TableCell({
          shading: { fill: AZUL },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: htext, bold: true, color: "FFFFFF", size: 20 })],
            }),
          ],
        }),
    ),
  });
  const bodyRows = rows.map(
    (cells, i) =>
      new TableRow({
        children: cells.map(
          (c) =>
            new TableCell({
              shading: { fill: i % 2 === 0 ? "F4F6FA" : "FFFFFF" },
              margins: { top: 70, bottom: 70, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: Array.isArray(c) ? c : [new TextRun({ text: String(c), size: 20 })],
                }),
              ],
            }),
        ),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
    },
    rows: [headerRow, ...bodyRows],
  });
}

/* ---------- conteúdo ---------- */
const children = [];

// Capa
children.push(
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 120 },
    children: [new TextRun({ text: "FROTA PML", bold: true, size: 72, color: AZUL })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 },
    children: [
      new TextRun({ text: "Sistema de Gestão e Agendamento de Veículos", size: 30, color: CINZA }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 },
    children: [new TextRun({ text: "Prefeitura Municipal de Lavras — MG", size: 26, color: CINZA })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Documentação & Tutorial de Uso", size: 28, italics: true })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200 },
    children: [
      new TextRun({ text: "Versão 0.1.0 — Fase 1 (protótipo funcional)", size: 22, color: CINZA }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200 },
    children: [
      new TextRun({ text: "Repositório: ", size: 20, color: CINZA }),
      new ExternalHyperlink({
        link: "https://github.com/superinovalavras/frota-pml",
        children: [new TextRun({ text: "github.com/superinovalavras/frota-pml", size: 20, style: "Hyperlink" })],
      }),
    ],
  }),
  new Paragraph({ children: [new PageBreak()] }),
);

// Sumário
children.push(
  h1("Sumário"),
  new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-3" }),
  new Paragraph({ children: [new PageBreak()] }),
);

// 1. O que é
children.push(
  h1("1. O que é o FROTA PML"),
  p("O FROTA PML é uma aplicação web que digitaliza e centraliza todo o processo de agendamento e controle de uso dos veículos da Prefeitura Municipal de Lavras. Ele substitui um fluxo hoje inteiramente verbal e informal (\"pedir o carro de boca\") por uma plataforma única, rastreável e auditável."),
  p([
    b("Em uma frase: "),
    t("é a \"agenda compartilhada da frota\" — qualquer servidor reserva um veículo, o gestor aprova, o motorista registra a saída e a devolução com foto do painel, e tudo fica registrado para consulta e relatório."),
  ]),
  h2("Problema que resolve"),
  bullet("Conflitos de veículo: dois servidores que precisam do mesmo carro no mesmo horário — o sistema avisa o conflito na hora da reserva."),
  bullet("Falta de histórico: hoje não há registro de quem usou qual veículo, para onde foi, quantos quilômetros rodou. O sistema registra tudo."),
  bullet("Sem visibilidade: o gestor não sabe a taxa de uso da frota. O painel de relatórios mostra reservas no mês, horas reservadas, km rodados, destinos mais frequentes e quem mais usa."),
  bullet("Cadastro descentralizado e inseguro: ninguém se cadastra sozinho — o administrador (Master) cadastra todos os usuários, com função e órgão definidos."),
  spacer(),
  infoBox([
    [b("Importante — esta é a Fase 1 (protótipo). ")],
    [t("Toda a interface está pronta e funcional, mas os dados ainda ficam guardados apenas no navegador de quem está usando (não há banco de dados central ainda). Isso significa que cada dispositivo enxerga sua própria cópia dos dados. A Fase 2 conecta o sistema a um banco de dados real (Supabase), à autenticação por CPF/e-mail/MASP, ao Google Calendar e ao Google Drive — aí os dados passam a ser compartilhados entre todos.")],
  ]),
  new Paragraph({ children: [new PageBreak()] }),
);

// 2. Perfis de acesso
children.push(
  h1("2. Perfis de acesso"),
  p("O sistema controla o que cada pessoa pode ver e fazer com base em quatro perfis. O perfil é derivado automaticamente da \"função\" que o usuário ocupa (configurada na tela de Administração)."),
  spacer(),
  tabela(
    ["Perfil", "Quem é", "O que pode fazer"],
    [
      ["Master", "Administrador do sistema", "Acesso irrestrito. Cadastra usuários, veículos e órgãos; gerencia a hierarquia de funções; vê relatórios de toda a prefeitura."],
      ["Gestor", "Secretários, subsecretários e superintendentes", "Vê e gerencia os dados e relatórios da própria secretaria; aprova reservas pendentes; cadastra/edita veículos."],
      ["Servidor", "Servidores em geral, agentes, fiscais", "Faz reservas (que ficam pendentes até a aprovação do gestor); registra check-in e check-out das viagens; vê os veículos da própria superintendência + a frota geral da secretaria."],
      ["Motorista", "Motoristas oficiais", "Pode ser designado como condutor em reservas; registra check-in/check-out; vê as reservas em que está envolvido."],
    ],
  ),
  spacer(),
  p([b("Regra de visibilidade: "), t("um usuário só enxerga os veículos da sua secretaria (gestor vê todos; servidor sem superintendência vê só a \"frota geral\"; servidor com superintendência vê a frota geral + os veículos da sua superintendência). Veículos de outras secretarias são invisíveis.")]),
  p([b("Regra de conflito de hierarquia (planejada para a Fase 2): "), t("quando dois servidores disputam o mesmo veículo, o de maior hierarquia tem prioridade — mas o sistema nunca realoca automaticamente; apenas informa quem reservou (nome, cargo, contato) e deixa a decisão com as pessoas.")]),
  new Paragraph({ children: [new PageBreak()] }),
);

// 3. Tutorial
children.push(h1("3. Tutorial de uso"));

children.push(
  h2("3.1 Acessar o sistema"),
  num("Abra o link do sistema no navegador (no computador ou no celular)."),
  num("Na tela de login, clique em \"Entrar (modo demonstração)\". (Na Fase 2 haverá login real por CPF, e-mail ou MASP.)"),
  num("Você cai na tela inicial: a Agenda da frota."),
);

children.push(
  h2("3.2 Trocar de perfil (modo demonstração)"),
  p("Como ainda não há login real, há um seletor no topo da tela escrito \"Simular usuário\". Use-o para alternar entre os perfis cadastrados (Master, Secretário, Superintendente, Servidor, Motorista) e observar como a interface muda — quais menus aparecem, quais veículos ficam visíveis, quais botões de ação existem."),
  p([b("Sair: "), t("clique no avatar (foto) no canto superior direito → \"Sair (voltar ao login)\".")]),
);

children.push(
  h2("3.3 A Agenda da frota"),
  p("É a tela principal: uma grade semanal mostrando todas as reservas dos veículos visíveis para você. Cada bloco colorido é uma reserva — a cor indica o status (pendente, confirmado, em andamento, concluído, cancelado)."),
  bullet("Passe o mouse sobre uma reserva para ver um resumo rápido (destino, horário, veículo, motorista)."),
  bullet("Clique numa reserva para abrir os detalhes completos e as ações disponíveis."),
  bullet("Use as setas para navegar entre semanas; o botão \"Hoje\" volta para a semana atual."),
  bullet("Filtros: \"Todas\" / \"Minhas\" e filtro por veículo específico."),
  bullet([t("Atalho: "), b("clique em um horário vazio"), t(" na grade para já abrir o formulário de nova reserva com a data e a hora preenchidas.")]),
  bullet("No celular, a grade rola horizontalmente; use o botão de menu (☰) no topo para abrir a navegação."),
);

children.push(
  h2("3.4 Criar um agendamento (reserva de veículo)"),
  num("Na Agenda (ou na tela \"Agendamentos\"), clique em \"Novo agendamento\" — ou clique direto em um horário vazio da grade."),
  num("Escolha o veículo (a lista mostra só os visíveis para o solicitante)."),
  num("Defina o período: data e horário de saída e devolução — ou marque \"Dia todo\"."),
  num("Informe o local de partida e, se for diferente, o local de devolução."),
  num("Preencha o destino e a finalidade da viagem."),
  num("Escolha o motorista: \"próprio solicitante\" (se você tem CNH compatível com o veículo) ou um motorista do pool. Se você não tem CNH, é obrigatório designar um motorista."),
  num("Opcional: adicione passageiros (usuários do sistema ou convidados externos) e observações."),
  num("Clique em \"Criar reserva\"."),
  spacer(),
  infoBox([
    [b("Detecção de conflito: "), t("se o veículo já tiver outra reserva no mesmo horário, o formulário mostra um aviso vermelho e não deixa salvar enquanto o conflito não for resolvido (mude o veículo ou o horário).")],
    [b("Status inicial: "), t("se você é gestor ou Master, a reserva já nasce \"confirmada\". Se você é servidor, ela nasce \"pendente\" até um gestor aprovar.")],
  ]),
);

children.push(
  h2("3.5 Aprovar, iniciar e concluir uma viagem (check-in / check-out)"),
  p("Abra a reserva (clique nela na Agenda ou na lista de Agendamentos). Conforme o status e o seu perfil, aparecem os botões de ação:"),
  bullet([b("Confirmar "), t("(só gestor/Master) — aprova uma reserva pendente.")]),
  bullet([b("Iniciar viagem (check-in) "), t("— ao clicar, abre uma janela pedindo a foto do painel do veículo e a quilometragem de saída. A foto é obrigatória. (Na Fase 2 o OCR lerá a quilometragem automaticamente da foto.)")]),
  bullet([b("Concluir viagem (check-out) "), t("— abre a janela de devolução: foto do painel e quilometragem de retorno. Ao concluir, a quilometragem do veículo é atualizada automaticamente e os \"km rodados\" entram nos relatórios.")]),
  bullet([b("Cancelar "), t("— cancela a reserva.")]),
  bullet([b("Editar / Excluir "), t("— editar é permitido a quem criou, ao motorista ou a gestores; excluir é só de gestor/Master.")]),
  p("Depois do check-in/check-out, a própria tela de detalhes da reserva passa a mostrar o \"Registro de viagem\": foto, quilometragem e observações de saída e de retorno, mais o total de km rodados."),
);

children.push(
  h2("3.6 Veículos"),
  p("Tela \"Veículos\": cartões com foto, placa, status (disponível / em uso / em manutenção / indisponível) e observações."),
  bullet("Clique em um cartão para editar o veículo."),
  bullet("Botão \"Novo veículo\" para cadastrar."),
  bullet([t("No formulário você pode "), b("adicionar ou trocar a foto"), t(" do veículo — a imagem é redimensionada automaticamente para não pesar. É aqui que você \"arruma a foto do carro\" diretamente pelo site.")]),
  bullet("A placa é validada (formato Mercosúl ou antigo) e o sistema avisa se já existe outro veículo com a mesma placa."),
);

children.push(
  h2("3.7 Motoristas"),
  p("Tela \"Motoristas\" (visível para gestor e Master): lista, gerada automaticamente, de todos os usuários cuja função está marcada como \"função de motorista\". Mostra a categoria e a validade da CNH de cada um. Para incluir alguém aqui, basta atribuir a ele a função de motorista na tela de Administração."),
);

children.push(
  h2("3.8 Relatórios"),
  p("Tela \"Relatórios\" (gestor e Master): visão analítica da frota, sempre limitada aos veículos visíveis para o seu perfil."),
  bullet("Indicadores: reservas no mês, horas reservadas no mês, viagens concluídas, veículos da frota, quilômetros rodados no mês (e acumulado)."),
  bullet("Reservas por status (gráfico de barras)."),
  bullet("Veículos mais reservados."),
  bullet("Destinos mais frequentes."),
  bullet("Maiores solicitantes."),
);

children.push(
  h2("3.9 Administração (somente Master)"),
  p("Tela \"Administração\", com quatro abas:"),
  bullet([b("Hierarquia: "), t("lista de funções ordenada por prioridade (1 = topo). Use as setas para reordenar; o botão de \"+\" cria novas funções. Cada função define um nível de acesso (master / gestor / servidor) e pode ser marcada como \"função de motorista\". As funções Master e Motorista são de sistema e não podem ser excluídas.")]),
  bullet([b("Usuários: "), t("cadastro completo dos colaboradores — nome, CPF, MASP, e-mail, telefone, cargo, função, órgão, superintendência e dados de CNH (opcionais). Há busca por nome/CPF/MASP. O usuário Master não pode ser excluído.")]),
  bullet([b("Órgãos: "), t("secretarias e demais lotações da prefeitura. Um órgão só pode ser excluído se não houver usuários, veículos ou superintendências vinculados a ele.")]),
  bullet([b("Marca: "), t("permite trocar a logo exibida no sistema (cabeçalho do menu lateral e tela de login). Envie um arquivo de imagem (de preferência PNG quadrado com fundo transparente) ou restaure a logo padrão. Disponível apenas para o Master.")]),
);

children.push(
  h2("3.10 Meu perfil"),
  p("Clique no avatar no canto superior direito → \"Meu perfil\". Mostra seus dados de cadastro, sua situação de habilitação (CNH válida ou vencida) e suas reservas recentes (como solicitante ou como motorista)."),
  new Paragraph({ children: [new PageBreak()] }),
);

// 4. Tecnologias
children.push(
  h1("4. Tecnologias utilizadas"),
  p("O sistema é uma aplicação web moderna, construída inteiramente com tecnologias de código aberto e amplamente adotadas no mercado."),
  spacer(),
  tabela(
    ["Camada", "Tecnologia", "Para que serve"],
    [
      ["Linguagem", "TypeScript (modo estrito)", "Linguagem de programação de todo o projeto — JavaScript com tipagem, o que reduz bugs e facilita manutenção."],
      ["Framework web", "Next.js 16 (App Router)", "Estrutura principal da aplicação: roteamento de páginas, renderização, build de produção."],
      ["Biblioteca de interface", "React 19", "Construção dos componentes visuais e da interatividade da tela."],
      ["Estilização", "Tailwind CSS 4", "Sistema de estilos utilitário — define cores, espaçamentos, layout responsivo (funciona em computador e celular)."],
      ["Componentes de UI", "shadcn/ui + Radix UI", "Componentes prontos e acessíveis: diálogos, menus, abas, seletores, tooltips, etc."],
      ["Ícones", "lucide-react", "Conjunto de ícones usados em toda a interface."],
      ["Empacotador / build", "Turbopack (incluído no Next.js)", "Compila o projeto para produção de forma rápida."],
      ["Armazenamento (Fase 1)", "localStorage do navegador", "Guarda os dados (usuários, veículos, reservas) localmente, no navegador de quem usa. Provisório — será substituído na Fase 2."],
      ["Hospedagem", "Vercel", "Plataforma onde o sistema fica publicado e acessível por um link na internet."],
      ["Controle de versão", "Git / GitHub", "Histórico do código-fonte; repositório em github.com/superinovalavras/frota-pml."],
    ],
  ),
  spacer(),
  h2("Tecnologias planejadas para a Fase 2"),
  tabela(
    ["Tecnologia", "Para que vai servir"],
    [
      ["Supabase (PostgreSQL + Auth + RLS)", "Banco de dados central, login real (por CPF / e-mail / MASP) e controle de acesso por linha (cada perfil só lê/escreve o que pode)."],
      ["Google Calendar API", "Cada veículo terá seu próprio calendário; as reservas aparecem como eventos espelhados, com convite por e-mail ao servidor."],
      ["Google Drive API", "Armazenamento das fotos de check-in/check-out, com nome padronizado por secretaria/servidor/data."],
      ["OCR (a definir)", "Leitura automática da quilometragem a partir da foto do painel — com confirmação manual do valor."],
    ],
  ),
  new Paragraph({ children: [new PageBreak()] }),
);

// 5. Estrutura do projeto
children.push(
  h1("5. Estrutura do projeto (para desenvolvedores)"),
  p("Organização das pastas principais do código-fonte:"),
  bullet([code("app/"), t(" — páginas e layouts (Next.js App Router): rotas de login e do painel (agenda, agendamentos, veículos, motoristas, relatórios, administração, perfil).")]),
  bullet([code("components/"), t(" — componentes de interface, separados por área (agenda, agendamentos, veículos, admin, etc.) e os componentes base de UI em "), code("components/ui/"), t(".")]),
  bullet([code("lib/mock/"), t(" — dados de demonstração (\"seed\"): usuários, veículos, funções, secretarias, superintendências, agendamentos.")]),
  bullet([code("lib/store/"), t(" — \"contextos\" do React que guardam o estado da aplicação e persistem no localStorage.")]),
  bullet([code("lib/"), t(" — utilitários: regras de visibilidade, formatadores, regras de agendamento, etc.")]),
  bullet([code("public/"), t(" — arquivos estáticos: logotipos da prefeitura, fotos de servidores e veículos.")]),
  bullet([code("scripts/"), t(" — scripts auxiliares (otimização de imagens, geração desta documentação).")]),
  bullet([code("docs/"), t(" — documentos de escopo e esta documentação.")]),
  spacer(),
  h2("Como rodar localmente"),
  num([code("npm install"), t(" — instala as dependências.")], "passos2"),
  num([code("npm run dev"), t(" — inicia o servidor de desenvolvimento em "), code("http://localhost:3000"), t(".")], "passos2"),
  num([code("npm run build"), t(" — gera a versão de produção; "), code("npm run start"), t(" roda essa versão.")], "passos2"),
  p([b("Pré-requisito: "), t("Node.js instalado (versão 20 ou superior).")]),
  new Paragraph({ children: [new PageBreak()] }),
);

// 6. Roadmap
children.push(
  h1("6. Roadmap"),
  h2("Fase 1 — Frontend com dados de demonstração — CONCLUÍDA"),
  bullet("Layout base, navegação por perfil e tela de login (modo demonstração)."),
  bullet("Agenda visual semanal com criação de reservas por clique."),
  bullet("Agendamento de veículos com regras de conflito e de CNH."),
  bullet("Check-in / check-out com foto do painel e quilometragem (sem OCR ainda)."),
  bullet("Tela de veículos com status e upload de foto."),
  bullet("Relatórios analíticos."),
  bullet("Administração: hierarquia de funções, usuários e órgãos."),
  bullet("Perfil do usuário."),
  bullet("Versão responsiva (computador e celular)."),
  spacer(),
  h2("Fase 2 — Integração com serviços — PLANEJADA"),
  bullet("Banco de dados Supabase com autenticação real e controle de acesso por linha (RLS)."),
  bullet("Integração com Google Calendar (um calendário por veículo, eventos espelhados, convites por e-mail)."),
  bullet("Armazenamento de fotos no Google Drive institucional."),
  bullet("OCR para leitura automática da quilometragem."),
  bullet("Notificações por e-mail (confirmação, lembrete, substituição por hierarquia, manutenção)."),
  bullet("Suporte offline no check-in (foto e metadados guardados localmente e sincronizados depois)."),
  spacer(),
  h2("Limitações da versão atual (Fase 1)"),
  bullet("Os dados ficam no navegador de cada dispositivo — não são compartilhados entre computadores/celulares diferentes, e podem ser perdidos se o cache do navegador for limpo."),
  bullet("Não há login real nem senha — a troca de perfil é simulada por um seletor."),
  bullet("A leitura da quilometragem por foto (OCR) ainda não está ativa — o valor é digitado manualmente."),
  bullet("A resolução automática de conflitos por hierarquia ainda não está implementada (o sistema mostra o conflito, mas não aplica a regra de prioridade)."),
  bullet("Não há envio de e-mails."),
  new Paragraph({ children: [new PageBreak()] }),
);

// 7. Créditos
children.push(
  h1("7. Créditos e contato"),
  p([b("Projeto: "), t("Superintendência de Inovação — Secretaria de Desenvolvimento — Prefeitura Municipal de Lavras/MG.")]),
  p([b("Repositório do código-fonte: "),
    new ExternalHyperlink({
      link: "https://github.com/superinovalavras/frota-pml",
      children: [new TextRun({ text: "github.com/superinovalavras/frota-pml", size: 22, style: "Hyperlink" })],
    }),
  ]),
  p([b("Documento de escopo completo: "), code("docs/Gestao_Veiculos_Lavras_v1.docx"), t(" (no repositório).")]),
  spacer(),
  p([t("Documento gerado automaticamente a partir do código-fonte em "), t(new Date().toLocaleDateString("pt-BR")), t(".")]),
);

/* ---------- montar e salvar ---------- */
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "passos",
        levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }],
      },
      {
        reference: "passos2",
        levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
    },
  },
  sections: [
    {
      properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      children,
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
const outDir = path.resolve("docs");
await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, "FROTA-PML-Documentacao-e-Tutorial.docx");
await fs.writeFile(outPath, buffer);
console.log(`✓ Gerado: ${outPath} (${Math.round(buffer.length / 1024)} KB)`);
