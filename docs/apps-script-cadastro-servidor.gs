/**
 * FROTA PML — gera um Google Forms para coletar os dados dos servidores
 * (ex.: pessoal da Comunicação) que vão usar o sistema de reserva de veículos.
 *
 * COMO USAR:
 *   1. Acesse https://script.google.com  → "Novo projeto".
 *   2. Apague o conteúdo e cole ESTE arquivo inteiro.
 *   3. Selecione a função "criarFormularioCadastro" e clique em "Executar".
 *   4. Autorize o acesso (é sua conta que cria o formulário).
 *   5. Veja o menu "Execução" → "Registros" (Logs): lá aparecem o LINK PARA
 *      COMPARTILHAR (mandar pros servidores) e o LINK DE EDIÇÃO.
 *
 * As respostas ficam no próprio Forms (aba "Respostas") — dá pra abrir numa
 * planilha e cadastrar cada pessoa no sistema a partir dali.
 */
function criarFormularioCadastro() {
  var form = FormApp.create('FROTA PML — Cadastro de acesso (servidores)');

  form.setDescription(
    'Preencha para criarmos seu acesso ao sistema de reserva de veículos da ' +
    'Prefeitura Municipal de Lavras.\n\n' +
    'Seu login será o e-mail institucional informado abaixo. A senha inicial ' +
    'é 123456 — troque no primeiro acesso (Meu perfil → Trocar senha).'
  );
  form.setProgressBar(true);
  form.setAllowResponseEdits(true);

  // --- Dados essenciais -----------------------------------------------------
  form.addTextItem()
    .setTitle('Nome completo')
    .setRequired(true);

  var email = form.addTextItem()
    .setTitle('E-mail institucional')
    .setHelpText('É por ele que você vai fazer login no sistema.')
    .setRequired(true);
  email.setValidation(
    FormApp.createTextValidation()
      .setHelpText('Digite um e-mail válido.')
      .requireTextIsEmail()
      .build()
  );

  // --- Opcionais ------------------------------------------------------------
  form.addTextItem()
    .setTitle('Telefone (celular)')
    .setHelpText('Para contato direto sobre a viagem. Ex.: (35) 99999-0000')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Cargo')
    .setHelpText('Ex.: Assessor(a) de Comunicação')
    .setRequired(false);

  form.addTextItem()
    .setTitle('CPF (opcional)')
    .setHelpText('Só números.')
    .setRequired(false);

  form.addTextItem()
    .setTitle('MASP (opcional)')
    .setRequired(false);

  // --- Pergunta de desvio: vai dirigir? -------------------------------------
  var dirige = form.addMultipleChoiceItem()
    .setTitle('Você vai DIRIGIR os veículos da frota?')
    .setHelpText(
      'Se sim, precisamos dos dados da sua CNH. Se não, você ainda pode ' +
      'reservar carros, mas será preciso designar um motorista habilitado.'
    )
    .setRequired(true);

  // --- Seção da CNH (só quem responder "Sim" cai aqui) ----------------------
  var secCnh = form.addPageBreakItem()
    .setTitle('Dados da CNH')
    .setHelpText('Necessário apenas para quem vai dirigir.');
  secCnh.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  form.addListItem()
    .setTitle('Categoria da CNH')
    .setChoiceValues(['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Número da CNH')
    .setRequired(false);

  form.addDateItem()
    .setTitle('Validade da CNH')
    .setRequired(true);

  // Liga o desvio: "Sim" vai pra seção da CNH; "Não" envia direto.
  dirige.setChoices([
    dirige.createChoice('Sim', secCnh),
    dirige.createChoice('Não', FormApp.PageNavigationType.SUBMIT),
  ]);

  // --- Links ----------------------------------------------------------------
  var linkResponder = form.getPublishedUrl();
  var linkEditar = form.getEditUrl();
  Logger.log('==============================================');
  Logger.log('LINK PARA MANDAR AOS SERVIDORES: ' + linkResponder);
  Logger.log('LINK PARA VOCÊ EDITAR/VER RESPOSTAS: ' + linkEditar);
  Logger.log('==============================================');
}
