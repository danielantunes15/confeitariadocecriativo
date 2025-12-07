// js/app.js - Módulo Principal de Inicialização (Com Persistência)

// O 'app' é um objeto global que os outros módulos usarão.
// Ele é definido IMEDIATAMENTE, antes do DOM carregar.
window.app = {
    // Estado Global do App
    configLoja: { taxa_entrega: 0, tempo_entrega: 60 },
    clienteLogado: null,
    clientePerfil: { nome: null, telefone: null, endereco: null },
    pedidoAtivoId: null,
    supabaseChannel: null,
    
    // **NOVAS PROPRIEDADES DE ESTADO GLOBAL ADICIONADAS AQUI**
    passoAtual: 1, 
    cupomAplicado: null, // Estado do cupom
    taxasEntrega: {}, // <-- ADICIONADO: Cache para taxas por bairro
    
    // Estado dos Módulos (serão preenchidos por eles)
    carrinho: [],
    categorias: [],
    produtos: [],
    historicoPedidos: [],
    produtoSelecionadoModal: null,
    precoBaseModal: 0,
    
    // Referências aos Módulos (serão preenchidas depois)
    UI: null,
    API: null,
    Auth: null,
    Cardapio: null,
    Carrinho: null,
    Checkout: null,
    Rastreamento: null,
    
    // Constantes
    NUMERO_WHATSAPP: '5533984611926'
};


// O evento DOMContentLoaded garante que o HTML foi carregado
document.addEventListener('DOMContentLoaded', async function() {
    
    // 1. Vincula os módulos ao 'app' global
    app.UI = window.AppUI;
    app.API = window.AppAPI;
    app.Auth = window.AppAuth;
    app.Cardapio = window.AppCardapio;
    app.Carrinho = window.AppCarrinho;
    app.Checkout = window.AppCheckout;
    app.Rastreamento = window.AppRastreamento;

    // *** ETAPA DE CORREÇÃO ***
    // 2. Chama a função para carregar todos os elementos do DOM.
    // Isso garante que app.UI.elementos esteja 100% preenchido
    // ANTES de qualquer outra função tentar usá-los.
    app.UI.carregarElementosDOM();
    // *** FIM DA CORREÇÃO ***

    // 3. Verifica se os módulos essenciais carregaram
    if (!app.UI || !app.API || !app.Auth || !app.Carrinho || !app.Cardapio || !app.Checkout || !app.Rastreamento) {
        console.error("❌ ERRO GRAVE: Um ou mais módulos falharam ao carregar.");
        alert("Erro crítico ao carregar o aplicativo. Verifique o console.");
        return;
    }

    /**
     * Configura todos os event listeners principais da aplicação.
     * Agora é seguro chamar esta função, pois app.UI.elementos está preenchido.
     */
    function configurarEventListenersGlobais() {
        const ui = app.UI.elementos;
        
        if (!ui) {
            console.error("❌ Falha crítica: Módulo de UI não carregou os elementos.");
            return;
        }
        
        // Listeners de Autenticação
        if (ui.btnIniciarSessao) ui.btnIniciarSessao.addEventListener('click', app.Auth.iniciarSessao);
        if (ui.cadastroForm) ui.cadastroForm.addEventListener('submit', app.Auth.finalizarCadastro);
        if (ui.logoutBtnApp) ui.logoutBtnApp.addEventListener('click', app.Auth.fazerLogoutApp);
        if (ui.formEditarEndereco) ui.formEditarEndereco.addEventListener('submit', app.Auth.salvarEdicaoEndereco); 
        if (ui.abrirModalEditarEndereco) ui.abrirModalEditarEndereco.addEventListener('click', app.UI.abrirModalEditarEndereco);
        
        // Listeners do Menu Inferior
        if (ui.navItems) {
            ui.navItems.forEach(item => {
                if(item) item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const viewTarget = item.getAttribute('data-view');
                    app.UI.alternarView(viewTarget);
                });
            });
        }
        
        // Listeners do Checkout (Single Screen)
        // (O restante da função original...)
        
        // Lógica de Pagamento
        if (ui.opcoesPagamento) {
            ui.opcoesPagamento.forEach(opcao => {
                if(opcao) opcao.addEventListener('click', () => {
                    ui.opcoesPagamento.forEach(op => op.classList.remove('selected'));
                    opcao.classList.add('selected');
                    const input = opcao.querySelector('input[name="pagamento"]');
                    if (input) input.checked = true;
                });
            });
        }
        
        // Listeners do Modal de Opções
        if (ui.opcoesBtnAdicionar) ui.opcoesBtnAdicionar.addEventListener('click', app.Cardapio.aumentarQtdModal);
        if (ui.opcoesBtnRemover) ui.opcoesBtnRemover.addEventListener('click', app.Cardapio.diminuirQtdModal);
        if (ui.btnAdicionarOpcoes) ui.btnAdicionarOpcoes.addEventListener('click', app.Cardapio.adicionarItemComOpcoes);
        
        // === INÍCIO DA ALTERAÇÃO (LÓGICA DE VISIBILIDADE) ===
        const setupDeliveryOptions = () => {
            const radios = [ui.deliveryOptionEntrega, ui.deliveryOptionRetirada];
            const labels = document.querySelectorAll('.delivery-option-radio');
            
            radios.forEach(radio => {
                if (radio) {
                    radio.addEventListener('change', () => {
                        // Atualiza a UI (classes 'selected')
                        labels.forEach(label => {
                            if (label) {
                                label.classList.toggle('selected', label.htmlFor === radio.id);
                            }
                        });

                        // Verifica qual radio está checado
                        const isRetirada = ui.deliveryOptionRetirada.checked;
                        
                        // Mostra/Esconde os blocos de endereço corretos
                        if (ui.retiradaAddressInfo) {
                            ui.retiradaAddressInfo.style.display = isRetirada ? 'block' : 'none';
                        }
                        if (ui.entregaAddressInfo) { 
                            ui.entregaAddressInfo.style.display = isRetirada ? 'none' : 'block';
                        }
                        
                        // Recalcula o carrinho (para atualizar a taxa)
                        app.Carrinho.atualizarCarrinho();
                    });
                }
            });

            // Define o estado inicial correto no carregamento da página
            // (Assumindo que "Entrega" está checado por padrão no HTML)
            if (ui.retiradaAddressInfo) ui.retiradaAddressInfo.style.display = 'none';
            if (ui.entregaAddressInfo) ui.entregaAddressInfo.style.display = 'block';
        };
        setupDeliveryOptions();
        // === FIM DA ALTERAÇÃO ===

        // === INÍCIO DA ALTERAÇÃO (LISTENERS DE DROPDOWN) ===
        // Listener para o dropdown de CIDADES no CADASTRO
        if (ui.cadastroCidadeSelect) {
            ui.cadastroCidadeSelect.addEventListener('change', async () => {
                const cidadeId = ui.cadastroCidadeSelect.value;
                if (cidadeId) {
                    const bairros = await app.API.carregarBairrosPorCidade(cidadeId);
                    app.UI.popularBairrosDropdown(bairros, ui.cadastroBairroSelect); // Passa o elemento
                } else {
                    app.UI.popularBairrosDropdown([], ui.cadastroBairroSelect); // Limpa os bairros
                }
            });
        }
        
        // NOVO LISTENER: Listener para o dropdown de CIDADES no MODAL
        if (ui.modalCidadeSelect) {
            ui.modalCidadeSelect.addEventListener('change', async () => { 
                const cidadeId = ui.modalCidadeSelect.value;
                if (cidadeId) {
                    const bairros = await app.API.carregarBairrosPorCidade(cidadeId);
                    // Passa o elemento do MODAL
                    app.UI.popularBairrosDropdown(bairros, ui.modalBairroSelect); 
                } else {
                    // Limpa os bairros do MODAL
                    app.UI.popularBairrosDropdown([], ui.modalBairroSelect); 
                }
            });
        }
        // === FIM DA ALTERAÇÃO ===
        
        // Listeners de Modais (Fechar)
        if (ui.modais) {
            ui.modais.forEach(modal => {
                if (modal) {
                    const closeBtn = modal.querySelector('.close');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', () => app.UI.fecharModal(modal));
                    }
                }
            });
        }
        
        // REMOVIDO: Listeners de CEP
        
        /* --- Listeners do Header v2 --- */
        if (ui.headerSearchInput) ui.headerSearchInput.addEventListener('input', app.Cardapio.setupSearch);
        if (ui.loginBtn) ui.loginBtn.addEventListener('click', () => app.UI.alternarView('view-inicio'));
        if (ui.headerCartBtn) ui.headerCartBtn.addEventListener('click', () => app.UI.alternarView('view-carrinho'));
        if (ui.addressBtn) ui.addressBtn.addEventListener('click', () => app.UI.abrirModalEditarEndereco());
        
        if (ui.headerV2SearchToggle) {
            ui.headerV2SearchToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                ui.headerV2.classList.add('search-active');
                ui.headerSearchInput.focus();
            });
        }
        
        if (ui.headerSearchInput) {
            ui.headerSearchInput.addEventListener('blur', () => {
                setTimeout(() => {
                    ui.headerV2.classList.remove('search-active');
                }, 100);
            });
        }
    }

    /**
     * Função de inicialização principal (IIFE interna)
     */
    (async function() {
        try {
            if (!window.supabase) throw new Error('Cliente Supabase não encontrado.');

            // 1. Carrega configurações da loja
            await app.API.carregarConfiguracoesLoja();

            // 2. Verifica se há um cliente logado
            await app.Auth.verificarSessaoLocal();
            
            // 3. Prepara a interface inicial
            // (Agora é seguro acessar elementos)
            app.UI.elementos.mobileNav.style.display = 'flex';
            
            // 4. Carrega os dados do cardápio
            await app.Cardapio.carregarDadosCardapio();
            
            // 5. Carrega o carrinho persistido
            app.Carrinho.carregarCarrinhoLocalmente();

            // === INÍCIO DA ALTERAÇÃO (PASSAR ELEMENTO) ===
            // 5B. CARREGAR CIDADES PARA CADASTRO
            const cidades = await app.API.carregarCidadesEntrega();
            if (cidades && app.UI.popularCidadesDropdown) {
                // Passa o elemento DOM correto
                app.UI.popularCidadesDropdown(cidades, app.UI.elementos.cadastroCidadeSelect);
                console.log("Cidades de entrega carregadas para o formulário.");
            }
            // === FIM DA ALTERAÇÃO ===
            
            // ================================================================
            // === INÍCIO DA NOVA ETAPA (CARREGAR TAXAS) ===
            // ================================================================
            // 5C. Carrega TODAS as taxas de entrega para o cache global
            app.taxasEntrega = await app.API.carregarTodasTaxasEntrega();
            console.log("Taxas de entrega por bairro carregadas:", app.taxasEntrega);
            // ================================================================
            // === FIM DA NOVA ETAPA ===
            // ================================================================

            if (app.clienteLogado) {
                 console.log(`Cliente ${app.clientePerfil.nome} carregado.`);
                 app.Auth.logarClienteManual(false); 
                 app.UI.alternarView('view-cardapio');
            } else {
                 console.log("Nenhum cliente logado, iniciando como convidado.");
                 app.UI.alternarView('view-cardapio');
            }
            
            // 6. Configura o status da loja e busca
            app.Cardapio.updateStoreStatus();
            setInterval(app.Cardapio.updateStoreStatus, 60000);

            // 7. Configura todos os botões e cliques
            configurarEventListenersGlobais();
            
            // 7b. Configura os listeners do checkout
            if (app.Checkout && app.Checkout.configurarListenersSingleScreen) {
                app.Checkout.configurarListenersSingleScreen();
                console.log("Listeners de Checkout (incluindo cupom) configurados.");
            } else {
                console.error("Falha ao configurar listeners do Checkout.");
            }
            
            // 8. Atualiza o carrinho
            app.Carrinho.atualizarCarrinho();

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            if (app.UI) {
                app.UI.mostrarMensagem('Erro ao carregar o app: ' + error.message, 'error');
            }
            if (app.UI && app.UI.elementos.authScreen) {
                app.UI.elementos.authScreen.classList.add('active');
            }
        }
    })();
});