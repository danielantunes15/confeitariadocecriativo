// js/ui.js - Módulo de Interface e DOM (Corrigido)

(function() {
    
    // Funções utilitárias
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
    const formatarTelefone = (telefone) => {
        const digitos = telefone.replace(/\D/g, '');
        return digitos.length >= 12 ? digitos : '55' + digitos;
    };

    // Objeto para armazenar todos os elementos do DOM (começa vazio)
    // Ele será preenchido pela função carregarElementosDOM()
    const elementos = {};

    /**
     * ESTA FUNÇÃO SERÁ CHAMADA PELO app.js DEPOIS QUE O DOM ESTIVER 100% CARREGADO.
     * Ela preenche o objeto 'elementos' acima.
     */
    function carregarElementosDOM() {
        // Views
        elementos.appContainer = document.getElementById('app-container');
        elementos.authScreen = document.getElementById('auth-screen');
        elementos.mobileNav = document.getElementById('mobile-bottom-nav');
        elementos.views = document.querySelectorAll('.app-view');
        elementos.navItems = document.querySelectorAll('.bottom-nav .nav-item');
        
        // Alertas
        elementos.alertContainer = document.getElementById('alert-container');
        
        // Auth
        elementos.authTelefoneInput = document.getElementById('auth-telefone');
        elementos.btnIniciarSessao = document.getElementById('btn-iniciar-sessao');
        elementos.cadastroForm = document.getElementById('cadastro-form');
        elementos.cadastroTelefoneHidden = document.getElementById('cadastro-telefone-hidden');
        elementos.cadastroNomeInput = document.getElementById('cadastro-nome');
        
        // --- CAMPOS DE CADASTRO MODIFICADOS ---
        elementos.cadastroCidadeSelect = document.getElementById('cadastro-cidade-select');
        elementos.cadastroBairroSelect = document.getElementById('cadastro-bairro-select');
        elementos.cadastroRuaInput = document.getElementById('cadastro-rua');
        elementos.cadastroNumeroInput = document.getElementById('cadastro-numero');
        // --- FIM DA MODIFICAÇÃO ---

        elementos.btnFinalizarCadastro = document.getElementById('btn-finalizar-cadastro');
        elementos.loginFormGroup = document.getElementById('login-form-group');

        // Perfil (view-inicio)
        elementos.logoutBtnApp = document.getElementById('logout-btn-app');
        elementos.homeClienteNome = document.getElementById('home-cliente-nome');
        elementos.statusUltimoPedido = document.getElementById('status-ultimo-pedido');
        elementos.homeEndereco = document.getElementById('home-endereco');
        elementos.abrirModalEditarEndereco = document.getElementById('abrir-modal-editar-endereco');

        // Rastreamento (view-inicio)
        elementos.rastreamentoContainer = document.getElementById('rastreamento-pedido-ativo');
        elementos.rastreamentoPedidoId = document.getElementById('rastreamento-pedido-id');
        elementos.rastreamentoStatusTexto = document.getElementById('rastreamento-status-texto');
        elementos.stepNovo = document.getElementById('step-novo');
        elementos.stepPreparando = document.getElementById('step-preparando');
        elementos.stepPronto = document.getElementById('step-pronto');
        elementos.stepEntregue = document.getElementById('step-entregue');

        // Cardápio (view-cardapio)
        elementos.storeStatusIndicator = document.querySelector('.store-status .status-indicator');
        elementos.storeStatusText = document.querySelector('.store-status .status-text');
        elementos.storeHoursText = document.getElementById('store-hours-text');
        elementos.storeAttentionBar = document.querySelector('.store-status .attention-bar');
        elementos.storeClosedMessage = document.getElementById('store-closed-message');
        elementos.categoriesScroll = document.getElementById('categorias-container');
        elementos.popularScroll = document.getElementById('popular-scroll');
        elementos.productsSection = document.getElementById('products-section');
        
        // Carrinho (view-carrinho)
        elementos.carrinhoBadge = document.getElementById('carrinho-badge');
        elementos.cartCountNav = document.querySelector('.bottom-nav .cart-count');
        elementos.pedidoObservacoes = document.getElementById('pedido-observacoes');
        elementos.trocoParaInput = document.getElementById('troco-para');
        elementos.carrinhoItens = document.getElementById('carrinho-itens');
        
        // Resumo de Valores
        elementos.subtotalCarrinho = document.getElementById('subtotal-carrinho');
        elementos.subtotalAjustadoCarrinho = document.getElementById('subtotal-ajustado-carrinho');
        elementos.resumoSubtotalLiquidoLinha = document.getElementById('resumo-subtotal-liquido-linha');
        elementos.taxaEntregaCarrinho = document.getElementById('taxa-entrega-carrinho');
        elementos.totalCarrinho = document.getElementById('total-carrinho');
        
        // Botões e Campos da Tela Única
        elementos.finalizarPedidoDireto = document.getElementById('finalizar-pedido-direto'); 
        elementos.limparCarrinhoBtn = document.getElementById('limpar-carrinho-btn');
        elementos.addMoreItemsBtn = document.getElementById('add-more-items-btn');
        elementos.trocarEnderecoBtn = document.getElementById('trocar-endereco-btn');
        elementos.tempoEntregaDisplay = document.getElementById('tempo-entrega-display');
        elementos.taxaEntregaStep = document.getElementById('taxa-entrega-step');
        
        // Cupom
        elementos.cupomInput = document.getElementById('cupom-input');
        elementos.aplicarCupomBtn = document.getElementById('aplicar-cupom-btn');
        elementos.cupomMessage = document.getElementById('cupom-message');
        elementos.descontoValorDisplay = document.getElementById('desconto-valor-display');
        elementos.descontoTipoDisplay = document.getElementById('desconto-tipo-display');
        elementos.resumoDescontoLinha = document.getElementById('resumo-desconto-linha');
        
        // Dados de Cliente/Entrega
        elementos.carrinhoEnderecoDisplay = document.getElementById('carrinho-endereco-display');
        elementos.carrinhoClienteNomeDisplay = document.getElementById('carrinho-cliente-nome');
        elementos.carrinhoEnderecoInput = document.getElementById('carrinho-endereco-input');
        elementos.opcoesPagamento = document.querySelectorAll('.opcoes-pagamento .pagamento-opcao');

        // **** INÍCIO DA CORREÇÃO (Opções de Entrega) ****
        elementos.deliveryOptionEntrega = document.getElementById('delivery-option-entrega');
        elementos.deliveryOptionRetirada = document.getElementById('delivery-option-retirada');
        elementos.retiradaAddressInfo = document.getElementById('retirada-address-info');
        // --- INÍCIO DA ALTERAÇÃO ---
        elementos.entregaAddressInfo = document.getElementById('entrega-address-info'); // Adicionado
        // --- FIM DA ALTERAÇÃO ---
        // **** FIM DA CORREÇÃO ****

        // Modais
        elementos.modais = document.querySelectorAll('.modal');
        elementos.modalEditarEndereco = document.getElementById('modal-editar-endereco');
        elementos.formEditarEndereco = document.getElementById('form-editar-endereco');
        
        // === INÍCIO DA ALTERAÇÃO (MODAL EDITAR ENDEREÇO) ===
        elementos.modalCidadeSelect = document.getElementById('modal-cidade-select');
        elementos.modalBairroSelect = document.getElementById('modal-bairro-select');
        elementos.modalRuaInput = document.getElementById('modal-rua');
        elementos.modalNumeroInput = document.getElementById('modal-numero');
        // === FIM DA ALTERAÇÃO ===
        
        elementos.modalDetalhesPedido = document.getElementById('modal-detalhes-pedido');
        elementos.detalhesPedidoId = document.getElementById('detalhes-pedido-id');
        elementos.detalhesPedidoContent = document.getElementById('detalhes-pedido-content');

        elementos.modalOpcoesProduto = document.getElementById('modal-opcoes-produto');
        elementos.opcoesTitulo = document.getElementById('opcoes-titulo');
        elementos.opcoesDescricao = document.getElementById('opcoes-descricao');
        elementos.opcoesContainer = document.getElementById('opcoes-container');
        elementos.complementosContainer = document.getElementById('complementos-container');
        elementos.opcoesObservacao = document.getElementById('opcoes-observacao');
        elementos.opcoesBtnRemover = document.getElementById('opcoes-btn-remover');
        elementos.opcoesQuantidadeValor = document.getElementById('opcoes-quantidade-valor');
        elementos.opcoesBtnAdicionar = document.getElementById('opcoes-btn-adicionar');
        elementos.opcoesPrecoModal = document.getElementById('opcoes-preco-modal');
        elementos.btnAdicionarOpcoes = document.getElementById('btn-adicionar-opcoes');
        
        // Header v2
        elementos.headerV2 = document.getElementById('header-v2');
        elementos.headerV2Logo = document.getElementById('header-v2-logo');
        elementos.headerV2Actions = document.getElementById('header-v2-actions');
        elementos.headerV2SearchToggle = document.getElementById('header-v2-search-toggle');
        elementos.headerV2SearchContainer = document.getElementById('header-v2-search-container');
        elementos.headerSearchInput = document.getElementById('header-search-input'); 
        elementos.loginBtn = document.getElementById('header-v2-login-btn');
        elementos.addressBtn = document.getElementById('header-v2-address-btn');
        elementos.addressText = document.getElementById('header-v2-address-text');
        
        // Header Cart v2
        elementos.headerCartBtn = document.getElementById('header-v2-cart-btn');
        elementos.headerCartItems = document.getElementById('header-v2-cart-items');
        elementos.headerCartTotal = document.getElementById('header-v2-cart-total');
        
        // Elementos do Modal de Opções
        elementos.opcoesImagemProduto = document.getElementById('opcoes-imagem-produto');
        elementos.opcoesImagemPlaceholder = document.getElementById('opcoes-imagem-placeholder');
    }

    /**
     * Exibe uma mensagem de alerta no topo da tela.
     */
    function mostrarMensagem(mensagem, tipo = 'info') {
        // As funções agora acessam 'elementos'
        if (elementos.alertContainer) {
            const alertDiv = document.createElement('div');
            alertDiv.className = `alert alert-${tipo}`;
            alertDiv.innerHTML = `<span>${mensagem}</span><button class="alert-close" onclick="this.parentElement.remove()">&times;</button>`;
            elementos.alertContainer.appendChild(alertDiv);
            setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
        } else {
            console.log(`[Mensagem ${tipo}]: ${mensagem}`);
        }
    }

    /**
     * Alterna a visualização das "páginas" do app.
     */
    function alternarView(viewId) {
        // Lógica de Bloqueio
        if ((viewId === 'view-inicio' || viewId === 'view-carrinho') && !window.app.clienteLogado) {
            viewId = 'auth-screen';
        }
        
        elementos.views.forEach(view => {
            if (view) view.classList.remove('active');
        });
        
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
        } else {
             console.error(`❌ ERRO: View com ID "${viewId}" não encontrada.`);
        }
        
        elementos.navItems.forEach(item => {
             item.classList.toggle('active', item.getAttribute('data-view') === viewId);
        });
        
        if (viewId === 'view-carrinho' && window.app.Carrinho) {
            window.app.Carrinho.atualizarCarrinhoDisplay();
        }
    }

    // === INÍCIO DA ALTERAÇÃO (LÓGICA DO MODAL) ===
    /**
     * Abre o modal de edição de endereço e preenche com dados.
     * REMOVE A LÓGICA DE CEP E ADICIONA LÓGICA DE DROPDOWNS
     */
    async function abrirModalEditarEndereco() {
        if (!window.app.clienteLogado) {
             alternarView('auth-screen');
             mostrarMensagem('Faça login para editar seu endereço.', 'error');
             return;
        }
        
        const perfil = window.app.clientePerfil;
        const enderecoSalvo = perfil.endereco || ''; // Ex: "Rua ABC, 123, Bairro XYZ - Cidade Z"
        
        // 1. Limpar e popular cidades no modal
        const selectCidade = elementos.modalCidadeSelect;
        const selectBairro = elementos.modalBairroSelect;
        if (!selectCidade || !selectBairro) {
            console.error("Elementos select do modal não encontrados.");
            return;
        }
        
        selectBairro.innerHTML = '<option value="">Selecione uma cidade primeiro</option>';
        selectCidade.innerHTML = '<option value="">Carregando...</option>';
        
        try {
            // Re-usa a função da API para carregar cidades
            const cidades = await window.AppAPI.carregarCidadesEntrega();
            // Re-usa a função de popular, mas passa o elemento do MODAL
            popularCidadesDropdown(cidades, selectCidade); 
        } catch (e) {
            mostrarMensagem('Erro ao carregar cidades.', 'error');
            selectCidade.innerHTML = '<option value="">Erro ao carregar</option>';
        }

        // 2. Tentar preencher Rua e Número a partir do endereço salvo
        // Este parse é simples e assume o formato "Rua, Numero, ..."
        const partesEndereco = enderecoSalvo.split(',');
        if (partesEndereco.length >= 2) {
            elementos.modalRuaInput.value = partesEndereco[0]?.trim() || '';
            elementos.modalNumeroInput.value = partesEndereco[1]?.trim() || '';
            // Não vamos tentar pré-selecionar Bairro/Cidade, pois a string é frágil
            // É melhor o usuário re-selecionar nos dropdowns.
        } else {
             elementos.modalRuaInput.value = '';
             elementos.modalNumeroInput.value = '';
        }

        // 3. Abrir o modal
        elementos.modalEditarEndereco.style.display = 'flex';
        if (elementos.formEditarEndereco) {
             // Não usamos reset() aqui para manter os valores preenchidos de rua/numero
        }
    }
    // === FIM DA ALTERAÇÃO ===
    
    /**
     * Fecha um modal específico.
     */
    function fecharModal(modalElement) {
        if(modalElement) {
            modalElement.style.display = 'none';
        }
    }
    
    // === INÍCIO DA ALTERAÇÃO (REATORAÇÃO) ===
    /**
     * Preenche o dropdown de Cidades no formulário de cadastro.
     * Modificado para aceitar qual <select> deve preencher.
     */
    function popularCidadesDropdown(cidades, selectElement) { // Modificado
        const select = selectElement; // Modificado
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione sua cidade *</option>';
        if (cidades && cidades.length > 0) {
            cidades.forEach(cidade => {
                const option = document.createElement('option');
                option.value = cidade.id;
                option.textContent = cidade.nome;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">Nenhuma cidade de entrega cadastrada</option>';
        }
    }

    /**
     * Preenche o dropdown de Bairros com base na cidade selecionada.
     * Modificado para aceitar qual <select> deve preencher.
     */
    function popularBairrosDropdown(bairros, selectElement) { // Modificado
        const select = selectElement; // Modificado
        if (!select) return;

        select.innerHTML = '<option value="">Selecione seu bairro *</option>';
        if (bairros && bairros.length > 0) {
            bairros.forEach(bairro => {
                const option = document.createElement('option');
                option.value = bairro.bairro; // O valor é o próprio nome do bairro
                option.textContent = bairro.bairro;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">Nenhum bairro cadastrado para esta cidade</option>';
        }
    }
    // === FIM DA ALTERAÇÃO ===

    // Expõe os elementos e funções para o objeto global AppUI
    window.AppUI = {
        elementos, // Exporta o objeto (que estará vazio no início)
        carregarElementosDOM, // <-- Exporta a nova função
        mostrarMensagem,
        alternarView,
        abrirModalEditarEndereco,
        fecharModal,
        popularCidadesDropdown, // <-- Exporta nova função
        popularBairrosDropdown, // <-- Exporta nova função
        formatarMoeda,
        formatarTelefone
    };

})();