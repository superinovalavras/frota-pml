# Fluxo de portaria — monitoramento e comprovante de viagem

> Desenho de design. Rascunho inicial: Claude, 2026-09-09. **Decisões fechadas
> com o Ramon em 2026-10-26** (ver §5). Tudo permanece DORMENTE atrás da flag
> `PORTARIA_ATIVA` até a implantação na prefeitura completa.

## 1. O problema hoje

A pessoa passa na **portaria** e o **porteiro anota à mão** os dados da viagem
(veículo, motorista, destino, KM, hora) — no formato de lista de caderno (o
Ramon mandou fotos ilustrando esse registro manual: a "Ficha de Bordo" / Setor
de Transporte). É trabalhoso, sujeito a erro, e o histórico fica no papel.

## 2. A visão

A **pessoa que reservou** (solicitante/motorista) registra a **saída** no app;
o app vira o **registro oficial** e alimenta o histórico/relatório. O porteiro
**não anota mais** — a pessoa "passa e mostra uma tela" (o **comprovante**)
provando que abriu a viagem corretamente. Na **volta**, mesmo esquema.

O **porteiro ganha uma conta de monitoramento** (somente leitura) para
acompanhar a frota inteira ao vivo. O secretário de transporte ganha um
histórico completo, sem depender do caderno.

## 3. O que JÁ existe (reaproveitar — não construir do zero)

- **Abertura/fechamento de viagem já existe**: `components/agendamentos/check-in-out-dialog.tsx`
  + transições de status `confirmado → em_andamento (SAÍDA) → concluido (RETORNO)`.
- **Campos já no agendamento**: `checkinEm / kmSaida / fotoSaidaUrl / obsSaida`
  e `checkoutEm / kmRetorno / fotoRetornoUrl / obsRetorno`.
- **Quem pode abrir/encerrar**: solicitante e motorista (além de gestor/master)
  — `podeGerenciar` em `agendamento-detalhe.tsx`.
- **Comprovante pronto**: `components/agenda/comprovante-viagem.tsx` — tela
  grande para "mostrar na portaria" (saída e retorno, com KM rodados).
- **Flag `REGISTRO_PAINEL_ATIVO`** (hoje `false`): quando `true`, exige KM + foto
  do painel. **Precisa ser desacoplada** → queremos "KM obrigatório, SEM foto".
- **Trigger no banco (0004)** já atualiza `veiculos.km_atual` a partir do
  `km_retorno`.
- **Telefone visível**: as reservas já mostram o telefone do solicitante/
  motorista para contato direto (base do "porteiro liga para quem esquecer").

➡️ A infraestrutura de "abrir/fechar viagem com KM" está **pronta e dormente**.
Falta: (a) desacoplar KM da foto, (b) ligar o botão "Mostrar na portaria" no
comprovante, e (c) criar o **perfil porteiro (só leitura)** + seu painel.

## 4. As três visões

### 4.1 Solicitante / Motorista (quem registra)
**Saída:** abre a reserva confirmada no celular → "Registrar saída" → informa o
**KM de saída** (campo **só número, sem foto**) → vê o **COMPROVANTE DE SAÍDA**:
tela grande e clara com ✔ "Saída registrada", veículo + placa, motorista,
destino, data/hora e KM. Clica em **"Mostrar na portaria"** e mostra ao porteiro.
**Volta:** "Registrar retorno" → **KM de retorno** → **COMPROVANTE DE RETORNO**
(mostra também KM rodados).

A responsabilidade de registrar é **sempre de quem reservou** — nunca do
porteiro. Se a pessoa esquecer, o porteiro vê no quadro e **liga** (telefone à
vista). Nada trava no sistema por conta disso.

### 4.2 Porteiro — SÓ MONITORAMENTO (decisão 2026-10-26)
Perfil **`portaria`**, cadastrado pelo Master, com **leitura global** (vê a
prefeitura inteira, furando a visibilidade por-secretaria que vale para os
demais perfis). Ele **não escreve nada** — não abre, não fecha, não dá baixa.

> **Primeira fase = observador.** A intenção é o porteiro começar só
> acompanhando, para se acostumar com a plataforma. Sem nenhuma ação que mude
> dados — a única "ação" é **ligar** para quem reservou (telefone à vista).
> Qualquer papel ativo (dar baixa, abrir viagem) fica para fases posteriores,
> se um dia for preciso.

**Foco da tela (o que o porteiro responde o dia todo):** "o que está na rua, o
que vai sair e pra quem eu ligo?". Por isso o painel prioriza, nessa ordem:
1. **Na rua agora** (herói) — carros com viagem aberta; **atrasados** (passaram
   da volta prevista) destacados em vermelho, com o telefone pronto para ligar.
2. **Previstas para hoje** — próximas saídas confirmadas, cada uma com telefone.
3. **Histórico** — busca por placa/pessoa/dia.
Contadores no topo: na rua · previstas hoje · disponíveis. No celular, a mesma
coisa com uma visão por vez (abas Na rua / Hoje / Histórico).

**Telefone NÃO liga sozinho (decisão 2026-10-26):** o contato é **número
copiável**, nunca um `tel:` que dispara a chamada — coerente com o resto do app
(reservas já fazem assim) e evita ligar sem querer. Na guarita o painel costuma
rodar no computador, onde `tel:` nem funciona. Se um dia a portaria for pelo
celular e quiserem discagem rápida, aí sim um passo de confirmação ("Ligar para
X? → Ligar / Cancelar") antes de chamar — fase futura, não agora.

**Refinamentos do painel (aprovados 2026-10-26):**
- **Contador "atrasados"** no topo que só aparece quando houver algum (discreto no
  dia normal, destacado quando precisa). É o resumo que importa no turno.
- **KM de saída sai do card ao vivo** — não ajuda o porteiro enquanto o carro
  está na rua; fica só no comprovante e no histórico. Card ao vivo = carro+placa,
  quem+secretaria, destino, horários (saída/volta prev.) e telefone.
- **Celular em abas**, abrindo sempre em **"Na rua"** (uma visão por vez).

### 4.2.1 Comprovante — hierarquia do destaque (aprovado 2026-10-26)
A tela que a pessoa vira para o porteiro prioriza o que ele confere em 2s:
1. **Selo verde** "Saída/Retorno registrado" + **carimbo de frescor** ("registrado
   agora · há X min · HH:MM") — prova anti-print-velho, sem ação do porteiro.
2. **PLACA gigante** (mono) — é o que ele bate com o carro à frente. Modelo/cor abaixo.
3. **KM e horário** em dois tiles grandes.
4. Apoio (menor): condutor, destino, janela da reserva, id curto do registro.

**O botão "Mostrar na portaria":** fica na reserva logo após registrar a saída/
retorno (verde, destacado). O comprovante também **abre sozinho** ao registrar
(a pessoa já vai com o celular na mão para a guarita); o botão reabre quando quiser.

**Painel da portaria** (única tela realmente nova), ao vivo:
- **Saindo / Em uso agora** — carros com viagem aberta (quem, carro, destino, hora).
- **Previstas pra hoje** — reservas confirmadas que ainda vão sair.
- **Histórico** — toda viagem com saída/retorno/KM (busca).

Além do painel, ele usa a **agenda** e os **relatórios** existentes, vendo a
frota inteira. Em cada reserva enxerga o **telefone** do solicitante/motorista
para entrar em contato (ex.: alguém esqueceu de registrar a saída/retorno).

### 4.3 Secretário de transporte
Não faz nada no dia a dia: como toda viagem é aberta/fechada no app com hora +
KM, o **histórico fica completo automaticamente**. O relatório "melhor e mais
completo" passa a ter saída (hora+KM), retorno (hora+KM) e KM rodados — e some a
dependência do caderno.

## 5. Decisões fechadas (2026-10-26)

1. **Baixa na guarita?** Não. O porteiro **só monitora** (leitura). Quem registra
   KM é o solicitante/motorista. Se esquecerem, o porteiro **liga** (telefone no
   quadro). → Porteiro é somente-leitura; sem escrita, sem mexer no trigger 0009.
2. **Carro sem reserva** (sai direto pra guarita): **não tratar agora**. Exige
   reserva como hoje. Porteiro-cria-viagem fica para fase futura.
3. **Validação de KM:** **travar** retorno < saída; **avisar (sem travar)** salto
   absurdo (erro de digitação).
4. **Quantas guaritas:** **uma central por enquanto** (só esta prefeitura). Pode
   haver mais no futuro — manter a estrutura aberta, mas não construir multi-guarita agora.
5. **Secretaria do porteiro:** **Secretaria de Trânsito** (confirmado
   2026-10-26). Na implantação, garantir que essa secretaria exista no cadastro
   (criar se faltar) antes de criar as contas de porteiro. Lembrete: a visão do
   porteiro é **global** — a secretaria é só organização cadastral, não limita o
   que ele enxerga.
6. **KM obrigatório, foto opcional/zero:** sim. Desacoplar da flag
   `REGISTRO_PAINEL_ATIVO` (que hoje amarra KM + foto).

## 6. O que muda no banco (aditivo, nada quebra)

- `profiles.perfil` ganha o valor **`'portaria'`**.
- **RLS:** helper novo `eh_portaria()` → **SELECT global** em `agendamentos`,
  `veiculos`, `usuarios_visiveis` (CPF/MASP seguem mascarados pela 0010) e
  `notificacoes` próprias. **Nenhum** INSERT/UPDATE/DELETE para o porteiro.
- **Sem** colunas novas de "quem registrou" (não há mais porteiro-abre-viagem).
- `lib/visibilidade.ts` espelha a nova regra de leitura global do porteiro.

## 7. Plano em fases

**Importante: as duas flags são independentes.** O observador NÃO depende de
nenhuma delas e pode subir sozinho, sem mudar nada para os servidores:
- `REGISTRO_PAINEL_ATIVO` = KM obrigatório no check-in/out (pesa o fluxo de todos).
- `PORTARIA_ATIVA` = botão "Mostrar na portaria" + comprovante.
Decisão (2026-10-26): **subir o observador primeiro, com as duas DESLIGADAS.**

- **Fase 1 — Porteiro observador (escolhida para subir agora):** perfil
  `portaria`, RLS de leitura global, **painel da portaria** ao vivo (só leitura,
  telefone copiável). Master passa a poder cadastrar porteiros. **Aditivo — não
  altera reserva, confirmação, cancelamento nem check-in dos servidores.**
  Observação: o bloco "na rua agora/atrasados" se alimenta do check-in (que já
  existe como clique opcional); "previstas hoje/disponíveis/agenda/histórico" já
  têm dado desde já. As duas flags continuam `false`.
- **Fase 2 — Comprovante + KM:** ligar "Mostrar na portaria"; tornar KM
  obrigatório (só número, sem foto) na saída/retorno; alerta de KM absurdo.
  **Esta fase muda o fluxo de todos — combinar e comunicar antes.**
- **Fase 3 — Relatório completo:** saída/retorno/KM rodados por veículo/órgão no PDF.

## 8. Riscos / cuidados

- Tornar KM obrigatório **muda o fluxo de "iniciar viagem" para todos** —
  combinar e comunicar antes de ligar a flag. Só faz sentido com a prefeitura
  inteira usando o app.
- Porteiro com **leitura global** é a única exceção à visibilidade por-secretaria
  — testar a RLS com os cinco perfis antes de subir.
- Não mexer na exclusão de dados; histórico é prova.
