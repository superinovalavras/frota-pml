# Fluxo de portaria — abrir e encerrar viagem pelo app

> Rascunho de design (Claude, 2026-09-09). O Ramon pediu para pensar bem antes
> de implementar. Isto é o raciocínio + plano; as decisões marcadas com ❓ ficam
> para ele confirmar.

## 1. O problema hoje

A pessoa passa na **portaria** e o **porteiro anota à mão** os dados da viagem
(veículo, motorista, destino, KM, hora) — no formato de lista de caderno (o
Ramon mandou fotos ilustrando esse registro manual). É trabalhoso, sujeito a
erro, e o histórico fica no papel.

## 2. A visão

A **pessoa** registra a **saída** no app; o app vira o **registro oficial** e
alimenta o histórico/relatório. O porteiro **não anota mais** — a pessoa "passa
e mostra uma tela" (o **comprovante**) provando que abriu a viagem corretamente.
Na **volta**, mesmo esquema. O secretário de transporte ganha um histórico
completo, sem depender do caderno.

## 3. O que JÁ existe (reaproveitar — não construir do zero)

- **Abertura/fechamento de viagem já existe**: `components/agendamentos/check-in-out-dialog.tsx`
  + transições de status `confirmado → em_andamento (SAÍDA) → concluido (RETORNO)`.
- **Campos já no agendamento**: `checkinEm / kmSaida / fotoSaidaUrl / obsSaida`
  e `checkoutEm / kmRetorno / fotoRetornoUrl / obsRetorno`.
- **Quem pode abrir/encerrar**: solicitante e motorista (além de gestor/master)
  — `podeGerenciar` em `agendamento-detalhe.tsx`.
- **Flag `REGISTRO_PAINEL_ATIVO`** (hoje `false`): quando `true`, exige KM + foto
  do painel; quando `false`, vira um clique. Foi desligada justamente porque "a
  portaria anota o KM manual" — que é o que queremos inverter.
- **Trigger no banco (0004)** já atualiza `veiculos.km_atual` a partir do
  `km_retorno`.

➡️ A infraestrutura de "abrir/fechar viagem com KM" está **pronta e dormente**.
Falta: (a) refinar a captura pelo usuário, (b) a **tela de comprovante** para a
portaria, e (c) decidir o papel do porteiro.

## 4. As três visões

### 4.1 Usuário (motorista/solicitante)
**Saída:** abre a reserva confirmada no celular → "Registrar saída" → informa
**KM de saída** (+ observação e foto opcionais) → vê o **COMPROVANTE DE SAÍDA**:
tela grande e clara com ✔ "Saída registrada", veículo + placa, motorista,
destino, data/hora e KM. Mostra na portaria.
**Volta:** "Registrar retorno" → **KM de retorno** → **COMPROVANTE DE RETORNO**
(mostra também KM rodados).

### 4.2 Porteiro
- **Opção A — passiva (recomendada para começar):** o porteiro só **olha o
  comprovante** no celular da pessoa. Sem conta, sem tela nova. Resolve a maior
  parte com zero atrito.
- **Opção B — ativa (fase futura):** o porteiro tem um **"Painel da portaria"**
  com a lista ao vivo de viagens saindo/voltando hoje; ele confere e "dá baixa".
  Fica registrado que passou pela guarita — mais controle e à prova de "fingir
  que abriu". Exige um **perfil porteiro**.

### 4.3 Secretário de transporte
Não faz nada no dia a dia: como toda viagem é aberta/fechada no app com hora +
KM, o **histórico fica completo automaticamente**. O relatório "melhor e mais
completo" (já pedido) passa a ter saída (hora+KM), retorno (hora+KM) e KM
rodados — e some a dependência do caderno.

## 5. Decisões para o Ramon confirmar ❓ (recomendação em **negrito**)

1. **KM obrigatório** na saída/retorno? → **Sim** (é o que substitui a anotação
   do porteiro). **Foto opcional** (não travar o fluxo). *Obs.: hoje a flag exige
   foto — precisaríamos afrouxar para "KM obrigatório, foto opcional".*
2. Papel do porteiro: **começar pela Opção A (comprovante)**; Opção B depois se
   precisar de controle real na guarita.
3. Ligar para todos de uma vez? → **Sim, é aditivo** (não quebra nada existente).
4. Comprovante precisa de "selo" anti-falsificação? → **Selo simples** com
   data/hora do servidor + status + id curto da reserva. Sem exagero.

## 6. Plano em fases

- **Fase 1 — Comprovante (baixo risco, aditivo):** tela de comprovante de
  saída/retorno pronta para mostrar na portaria + KM obrigatório / foto opcional.
- **Fase 2 — Portaria ativa:** perfil porteiro + painel ao vivo + baixa na guarita.
- **Fase 3 — Relatório completo:** saída/retorno/KM rodados por veículo/órgão no PDF.

## 7. Riscos / cuidados

- Tornar KM obrigatório **muda o fluxo de "iniciar viagem" para todos** —
  combinar antes de ligar.
- Não mexer na exclusão de dados; histórico é prova.
- Fotos vão para o bucket público (contam no medidor de armazenamento) — ok por
  serem eventuais.
