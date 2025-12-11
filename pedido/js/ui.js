// js/ui.js - Interface do Usuário (Modernizada com SweetAlert2)

(function() {
    
    // Funções utilitárias
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
    const formatarTelefone = (telefone) => {
        const digitos = telefone.replace(/\D/g, '');
        return digitos.length >= 12 ? digitos : '55' + digitos;
    };

    const elementos = {};

    function carregarElementosDOM() {
        // Mapeamento dos elementos (Mantido igual ao original para compatibilidade)
        elementos.appContainer = document.getElementById('app-container');
        elementos.authScreen = document.getElementById('auth-screen');
        elementos.mobileNav = document.getElementById('mobile-bottom-nav');
        elementos.views = document.querySelectorAll('.app-view');
        elementos.navItems = document.querySelectorAll('.bottom-nav .nav-item');
        
        // Auth e Formulários
        elementos.authTelefoneInput = document.getElementById('auth-telefone');
        elementos.btnIniciarSessao = document.getElementById('btn-iniciar-sessao');
        elementos.cadastroForm = document.getElementById('cadastro-form');
        elementos.cadastroTelefoneHidden = document.getElementById('cadastro-telefone-hidden');
        elementos.cadastroNomeInput = document.getElementById('cadastro-nome');
        elementos.cadastroCidadeSelect = document.getElementById('cadastro-cidade-select');
        elementos.cadastroBairroSelect = document.getElementById('cadastro-bairro-select');
        elementos.cadastroRuaInput = document.getElementById('cadastro-rua');
        elementos.cadastroNumeroInput = document.getElementById('cadastro-numero');
        elementos.btnFinalizarCadastro = document.getElementById('btn-finalizar-cadastro');
        elementos.loginFormGroup = document.getElementById('login-form-group');

        // Perfil
        elementos.logoutBtnApp = document.getElementById('logout-btn-app');
        elementos.homeClienteNome = document.getElementById('home-cliente-nome');
        elementos.statusUltimoPedido = document.getElementById('status-ultimo-pedido');
        elementos.homeEndereco = document.getElementById('home-endereco');
        elementos.abrirModalEditarEndereco = document.getElementById('abrir-modal-editar-endereco');

        // Cardápio e Status
        elementos.storeStatusIndicator = document.querySelector('.store-status .status-indicator');
        elementos.storeStatusText = document.querySelector('.store-status .status-text');
        elementos.storeHoursText = document.getElementById('store-hours-text');
        elementos.storeAttentionBar = document.querySelector('.store-status .attention-bar');
        elementos.storeClosedMessage = document.getElementById('store-closed-message');
        elementos.categoriesScroll = document.getElementById('categorias-container');
        elementos.popularScroll = document.getElementById('popular-scroll');
        elementos.productsSection = document.getElementById('products-section');
        
        // Carrinho
        elementos.carrinhoBadge = document.getElementById('carrinho-badge');
        elementos.cartCountNav = document.querySelector('.bottom-nav .cart-count');
        elementos.carrinhoItens = document.getElementById('carrinho-itens');
        elementos.subtotalCarrinho = document.getElementById('subtotal-carrinho');
        elementos.totalCarrinho = document.getElementById('total-carrinho');
        elementos.taxaEntregaCarrinho = document.getElementById('taxa-entrega-carrinho');
        
        // Checkout
        elementos.finalizarPedidoDireto = document.getElementById('finalizar-pedido-direto');
        elementos.limparCarrinhoBtn = document.getElementById('limpar-carrinho-btn');
        elementos.trocarEnderecoBtn = document.getElementById('trocar-endereco-btn');
        elementos.carrinhoEnderecoInput = document.getElementById('carrinho-endereco-input');
        elementos.carrinhoEnderecoDisplay = document.getElementById('carrinho-endereco-display');
        elementos.carrinhoClienteNomeDisplay = document.getElementById('carrinho-cliente-nome');
        elementos.pedidoObservacoes = document.getElementById('pedido-observacoes');
        elementos.trocoParaInput = document.getElementById('troco-para');
        elementos.deliveryOptionEntrega = document.getElementById('delivery-option-entrega');
        elementos.deliveryOptionRetirada = document.getElementById('delivery-option-retirada');
        elementos.retiradaAddressInfo = document.getElementById('retirada-address-info');
        elementos.entregaAddressInfo = document.getElementById('entrega-address-info');
        
        // Cupom
        elementos.cupomInput = document.getElementById('cupom-input');
        elementos.aplicarCupomBtn = document.getElementById('aplicar-cupom-btn');
        elementos.cupomMessage = document.getElementById('cupom-message');
        elementos.descontoValorDisplay = document.getElementById('desconto-valor-display');
        elementos.descontoTipoDisplay = document.getElementById('desconto-tipo-display');
        elementos.resumoDescontoLinha = document.getElementById('resumo-desconto-linha');
        elementos.resumoSubtotalLiquidoLinha = document.getElementById('resumo-subtotal-liquido-linha');

        // Modais
        elementos.modais = document.querySelectorAll('.modal');
        elementos.modalEditarEndereco = document.getElementById('modal-editar-endereco');
        elementos.formEditarEndereco = document.getElementById('form-editar-endereco');
        elementos.modalCidadeSelect = document.getElementById('modal-cidade-select');
        elementos.modalBairroSelect = document.getElementById('modal-bairro-select');
        elementos.modalRuaInput = document.getElementById('modal-rua');
        elementos.modalNumeroInput = document.getElementById('modal-numero');
        
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
        elementos.opcoesImagemProduto = document.getElementById('opcoes-imagem-produto');
        elementos.opcoesImagemPlaceholder = document.getElementById('opcoes-imagem-placeholder');
        
        // Header Search
        elementos.headerSearchInput = document.getElementById('header-search-input');
        elementos.headerV2 = document.getElementById('header-v2');
        elementos.headerV2SearchToggle = document.getElementById('header-v2-search-toggle');
        elementos.loginBtn = document.getElementById('header-v2-login-btn');
        elementos.headerCartBtn = document.getElementById('header-v2-cart-btn');
        elementos.addressBtn = document.getElementById('header-v2-address-btn');
        elementos.addressText = document.getElementById('header-v2-address-text');
        elementos.headerCartItems = document.getElementById('header-v2-cart-items');
        elementos.headerCartTotal = document.getElementById('header-v2-cart-total');
        
        // Rastreamento (NOVO)
        elementos.rastreamentoContainer = document.getElementById('rastreamento-pedido-ativo');
        elementos.rastreamentoPedidoId = document.getElementById('rastreamento-pedido-id');
        elementos.rastreamentoStatusTexto = document.getElementById('rastreamento-status-texto');
        elementos.stepNovo = document.getElementById('step-novo');
        elementos.stepPreparando = document.getElementById('step-preparando');
        elementos.stepPronto = document.getElementById('step-pronto');
        elementos.stepEntregue = document.getElementById('step-entregue');
        elementos.rastreamentoSubtitulo = document.getElementById('rastreamento-subtitulo');
    }

    /**
     * Exibe mensagem usando SweetAlert2 (Visual Profissional).
     */
    function mostrarMensagem(mensagem, tipo = 'info') {
        // Mapeia tipos do sistema para ícones do SweetAlert
        const iconMap = {
            'success': 'success',
            'error': 'error',
            'warning': 'warning',
            'info': 'info'
        };

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                text: mensagem,
                icon: iconMap[tipo] || 'info',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.addEventListener('mouseenter', Swal.stopTimer);
                    toast.addEventListener('mouseleave', Swal.resumeTimer);
                }
            });
        } else {
            // Fallback caso a lib não carregue
            console.log(`[${tipo.toUpperCase()}]: ${mensagem}`);
            alert(mensagem);
        }
    }

    function alternarView(viewId) {
        if ((viewId === 'view-inicio' || viewId === 'view-carrinho') && !window.app.clienteLogado) {
            viewId = 'auth-screen';
        }
        
        elementos.views.forEach(view => {
            if (view) view.classList.remove('active');
        });
        
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            window.scrollTo(0, 0); // Rola para o topo ao mudar de tela
        }
        
        elementos.navItems.forEach(item => {
             item.classList.toggle('active', item.getAttribute('data-view') === viewId);
        });
        
        if (viewId === 'view-carrinho' && window.app.Carrinho) {
            window.app.Carrinho.atualizarCarrinhoDisplay();
        }
    }

    async function abrirModalEditarEndereco() {
        if (!window.app.clienteLogado) {
             alternarView('auth-screen');
             mostrarMensagem('Faça login para editar seu endereço.', 'error');
             return;
        }
        
        const perfil = window.app.clientePerfil;
        const enderecoSalvo = perfil.endereco || '';
        
        const selectCidade = elementos.modalCidadeSelect;
        const selectBairro = elementos.modalBairroSelect;
        
        if (selectBairro) selectBairro.innerHTML = '<option value="">Selecione uma cidade primeiro</option>';
        if (selectCidade) selectCidade.innerHTML = '<option value="">Carregando...</option>';
        
        try {
            const cidades = await window.AppAPI.carregarCidadesEntrega();
            popularCidadesDropdown(cidades, selectCidade); 
        } catch (e) {
            if (selectCidade) selectCidade.innerHTML = '<option value="">Erro ao carregar</option>';
        }

        // Tenta preencher rua/numero se existir
        const partesEndereco = enderecoSalvo.split(',');
        if (partesEndereco.length >= 2) {
            if (elementos.modalRuaInput) elementos.modalRuaInput.value = partesEndereco[0]?.trim() || '';
            if (elementos.modalNumeroInput) elementos.modalNumeroInput.value = partesEndereco[1]?.trim() || '';
        } else {
             if (elementos.modalRuaInput) elementos.modalRuaInput.value = '';
             if (elementos.modalNumeroInput) elementos.modalNumeroInput.value = '';
        }

        if (elementos.modalEditarEndereco) elementos.modalEditarEndereco.style.display = 'flex';
    }
    
    function fecharModal(modalElement) {
        if(modalElement) {
            modalElement.style.display = 'none';
        }
    }
    
    function popularCidadesDropdown(cidades, selectElement) {
        const select = selectElement;
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
            select.innerHTML = '<option value="">Nenhuma cidade disponível</option>';
        }
    }

    function popularBairrosDropdown(bairros, selectElement) {
        const select = selectElement;
        if (!select) return;

        select.innerHTML = '<option value="">Selecione seu bairro *</option>';
        if (bairros && bairros.length > 0) {
            bairros.forEach(bairro => {
                const option = document.createElement('option');
                option.value = bairro.bairro;
                option.textContent = bairro.bairro;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">Nenhum bairro encontrado</option>';
        }
    }

    window.AppUI = {
        elementos,
        carregarElementosDOM,
        mostrarMensagem,
        alternarView,
        abrirModalEditarEndereco,
        fecharModal,
        popularCidadesDropdown,
        popularBairrosDropdown,
        formatarMoeda,
        formatarTelefone
    };

})();