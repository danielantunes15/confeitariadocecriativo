// js/pedido.js - Sistema Completo de Pedidos Mobile (VERSÃO MELHORADA)

document.addEventListener('DOMContentLoaded', async function() {
    
    // --- CONFIGURAÇÕES E VARIÁVEIS ---
    const NUMERO_WHATSAPP = '5533984611926'; // SEU NÚMERO DE WHATSAPP AQUI
    
    // ================================================================
    // === NOVAS VARIÁVEIS GLOBAIS ===
    // ================================================================
    let configLoja = { taxa_entrega: 0, tempo_entrega: 60 }; // Padrão
    let supabaseChannel = null; // Canal do Supabase Realtime
    let pedidoAtivoId = null;   // ID do pedido que está sendo rastreado
    let produtoSelecionadoModal = null; // Guarda o produto do modal de opções
    let precoBaseModal = 0;
    // ================================================================
    
    let clienteLogado = null;
    let clientePerfil = { nome: null, telefone: null, endereco: null }; 

    // Elementos da Interface
    const appContainer = document.getElementById('app-container');
    const authScreen = document.getElementById('auth-screen');
    const mobileNav = document.getElementById('mobile-bottom-nav');
    const navItems = document.querySelectorAll('.nav-item-app'); 
    
    // Elementos de Carrinho/Checkout
    const carrinhoBadge = document.getElementById('carrinho-badge'); 
    const pedidoObservacoes = document.getElementById('pedido-observacoes'); 
    const trocoParaInput = document.getElementById('troco-para'); 
    
    // Elementos de Login/Cadastro
    const authTelefoneInput = document.getElementById('auth-telefone');
    const btnIniciarSessao = document.getElementById('btn-iniciar-sessao');
    const cadastroForm = document.getElementById('cadastro-form');
    const cadastroTelefoneHidden = document.getElementById('cadastro-telefone-hidden');
    const cadastroNomeInput = document.getElementById('cadastro-nome');
    
    const cadastroCepInput = document.getElementById('cadastro-cep');
    const cadastroRuaInput = document.getElementById('cadastro-rua');
    const cadastroNumeroInput = document.getElementById('cadastro-numero');
    const cadastroBairroInput = document.getElementById('cadastro-bairro');
    const cadastroCidadeInput = document.getElementById('cadastro-cidade');
    const cadastroEstadoInput = document.getElementById('cadastro-estado');

    const btnFinalizarCadastro = document.getElementById('btn-finalizar-cadastro');
    
    // Elementos do App Logado (Perfil)
    const logoutBtnApp = document.getElementById('logout-btn-app');
    const homeClienteNome = document.getElementById('home-cliente-nome');
    const statusUltimoPedido = document.getElementById('status-ultimo-pedido');
    const homeEndereco = document.getElementById('home-endereco');
    // --- NOVOS: Elementos de Rastreamento ---
    const rastreamentoContainer = document.getElementById('rastreamento-pedido-ativo');
    const rastreamentoPedidoId = document.getElementById('rastreamento-pedido-id');
    const rastreamentoStatusTexto = document.getElementById('rastreamento-status-texto');
    const stepNovo = document.getElementById('step-novo');
    const stepPreparando = document.getElementById('step-preparando');
    const stepPronto = document.getElementById('step-pronto');
    const stepEntregue = document.getElementById('step-entregue');

    // Elementos do Carrinho (View de Checkout)
    const carrinhoItens = document.getElementById('carrinho-itens');
    // --- NOVOS: Resumo do Carrinho ---
    const subtotalCarrinho = document.getElementById('subtotal-carrinho');
    const taxaEntregaCarrinho = document.getElementById('taxa-entrega-carrinho');
    const totalCarrinho = document.getElementById('total-carrinho');
    
    const finalizarDiretoBtn = document.getElementById('finalizar-pedido-direto');
    const carrinhoEnderecoDisplay = document.getElementById('carrinho-endereco-display');
    const carrinhoClienteNomeDisplay = document.getElementById('carrinho-cliente-nome');
    const carrinhoEnderecoInput = document.getElementById('carrinho-endereco-input');
    const pagamentoOpcoesContainer = document.querySelector('#view-carrinho .opcoes-pagamento'); 
    
    // Elementos do Modal de Edição de Endereço
    const modalEditarEndereco = document.getElementById('modal-editar-endereco');
    const formEditarEndereco = document.getElementById('form-editar-endereco');
    const modalCepInput = document.getElementById('modal-cep');
    const modalRuaInput = document.getElementById('modal-rua');
    const modalNumeroInput = document.getElementById('modal-numero');
    const modalBairroInput = document.getElementById('modal-bairro');
    // --- NOVOS: Campos ocultos para ViaCEP ---
    const modalCidadeInput = document.getElementById('modal-cidade');
    const modalEstadoInput = document.getElementById('modal-estado');
    
    // Elementos do Modal de Detalhes do Pedido (Histórico)
    const modalDetalhesPedido = document.getElementById('modal-detalhes-pedido');
    const detalhesPedidoId = document.getElementById('detalhes-pedido-id');
    const detalhesPedidoContent = document.getElementById('detalhes-pedido-content');

    // --- NOVOS: Elementos do Modal de Opções de Produto ---
    const modalOpcoesProduto = document.getElementById('modal-opcoes-produto');
    const opcoesTitulo = document.getElementById('opcoes-titulo');
    const opcoesDescricao = document.getElementById('opcoes-descricao');
    const opcoesContainer = document.getElementById('opcoes-container');
    const complementosContainer = document.getElementById('complementos-container');
    const opcoesObservacao = document.getElementById('opcoes-observacao');
    const opcoesBtnRemover = document.getElementById('opcoes-btn-remover');
    const opcoesQuantidadeValor = document.getElementById('opcoes-quantidade-valor');
    const opcoesBtnAdicionar = document.getElementById('opcoes-btn-adicionar');
    const opcoesPrecoModal = document.getElementById('opcoes-preco-modal');
    const btnAdicionarOpcoes = document.getElementById('btn-adicionar-opcoes');

    // Elementos do NOVO Layout (Cardápio)
    const storeStatusIndicator = document.querySelector('.store-status .status-indicator');
    const storeStatusText = document.querySelector('.store-status .status-text');
    const storeHoursText = document.getElementById('store-hours-text');
    const storeAttentionBar = document.querySelector('.store-status .attention-bar');
    const storeClosedMessage = document.getElementById('store-closed-message');
    const categoriesScroll = document.getElementById('categorias-container');
    const popularScroll = document.getElementById('popular-scroll');
    const productsSection = document.getElementById('products-section');
    const searchIcon = document.querySelector('.header .search-icon');
    const shareIcon = document.querySelector('.header .share-icon');
    const cartCountNav = document.querySelector('.bottom-nav .cart-count'); // Contador do novo nav

    let categorias = [];
    let produtos = [];
    let carrinho = [];
    let historicoPedidos = []; 

    // --- FUNÇÕES DE UTENSÍLIOS ---
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    const mostrarMensagem = (mensagem, tipo = 'info') => {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.innerHTML = `<span>${mensagem}</span><button class="alert-close" onclick="this.parentElement.remove()">&times;</button>`;
        alertContainer.appendChild(alertDiv);
        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
    };
    
    window.alternarView = function(viewId) {
        // Guarda de Rota
        if ((viewId === 'view-inicio' || viewId === 'view-carrinho') && !clienteLogado) {
            mostrarMensagem('Você precisa fazer login para acessar esta área.', 'info');
            viewId = 'auth-screen';
        }
        
        document.querySelectorAll('.app-view').forEach(view => {
            if (view) view.classList.remove('active');
        });
        
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
        } else {
             console.error(`❌ ERRO: View com ID "${viewId}" não encontrada.`);
        }
        
        // Sincroniza o menu novo (bottom-nav)
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
             item.classList.toggle('active', item.getAttribute('data-view') === viewId);
        });
        
        if (viewId === 'view-carrinho') {
            atualizarCarrinhoDisplay();
        }
        if (viewId === 'view-inicio') {
            // A lógica de rastreamento/histórico agora é chamada ao logar
            // ou ao iniciar o rastreamento
        }
    }
    
    function formatarTelefone(telefone) {
        const digitos = telefone.replace(/\D/g, '');
        return digitos.length >= 12 ? digitos : '55' + digitos;
    }

    // Função de busca de CEP (mantida, mas com campos de cidade/estado)
    window.buscarCep = async function(cep) {
        const cepLimpo = cep.replace(/\D/g, ''); 
        if (cepLimpo.length !== 8) return;
        mostrarMensagem('Buscando endereço...', 'info');

        const isCadastro = document.getElementById('cadastro-form').style.display === 'block';
        const isModal = modalEditarEndereco.style.display === 'flex';
        
        let campos = {};

        if (isCadastro) {
            campos = {
                rua: document.getElementById('cadastro-rua'),
                bairro: document.getElementById('cadastro-bairro'),
                cidade: document.getElementById('cadastro-cidade'),
                estado: document.getElementById('cadastro-estado'),
                numero: document.getElementById('cadastro-numero')
            };
        } else if (isModal) {
            campos = {
                rua: document.getElementById('modal-rua'),
                bairro: document.getElementById('modal-bairro'),
                cidade: document.getElementById('modal-cidade'), // Campo oculto
                estado: document.getElementById('modal-estado'), // Campo oculto
                numero: document.getElementById('modal-numero')
            };
        } else {
            return;
        }

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();
            
            if (data.erro) {
                mostrarMensagem('CEP não encontrado. Digite o endereço manualmente.', 'warning');
                campos.rua.value = '';
                campos.bairro.value = '';
                campos.cidade.value = '';
                campos.estado.value = '';
                campos.rua.focus();
                return;
            }

            campos.rua.value = data.logradouro || '';
            campos.bairro.value = data.bairro || '';
            campos.cidade.value = data.localidade || '';
            campos.estado.value = data.uf || '';

            if (data.logradouro) {
                campos.numero.focus();
            } else {
                campos.rua.focus();
            }
            
            mostrarMensagem('Endereço preenchido. Confira os dados.', 'success');

        } catch (error) {
            mostrarMensagem('Erro ao buscar o CEP. Preencha manualmente.', 'error');
        }
    }


    // --- FUNÇÕES DO NOVO DESIGN (STATUS DA LOJA DINÂMICO) ---

    // --- NOVA FUNÇÃO ---
    async function carregarConfiguracoesLoja() {
        try {
            const { data, error } = await supabase
                .from('config_loja')
                .select('taxa_entrega, tempo_entrega, seg_abertura, seg_fechamento, seg_fechado, ter_abertura, ter_fechamento, ter_fechado, qua_abertura, qua_fechamento, qua_fechado, qui_abertura, qui_fechamento, qui_fechado, sex_abertura, sex_fechamento, sex_fechado, sab_abertura, sab_fechamento, sab_fechado, dom_abertura, dom_fechamento, dom_fechado')
                .eq('id', 1)
                .single();
            
            if (error) throw error;
            
            configLoja = data;
            console.log("Configurações da loja carregadas:", configLoja);
            
            // Atualiza o UI imediatamente após carregar
            updateStoreStatus();
            atualizarCarrinho(); // Atualiza o carrinho para pegar a taxa de entrega
            
        } catch (error) {
            console.error("Erro ao carregar configurações da loja:", error);
            mostrarMensagem('Erro ao carregar status da loja.', 'error');
            // Mantém os padrões de fallback
            updateStoreStatus();
            atualizarCarrinho();
        }
    }

    // --- FUNÇÃO ATUALIZADA ---
    function updateStoreStatus() {
        if (!storeStatusIndicator || !storeStatusText) return;

        const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const agora = new Date();
        const diaHoje = diasSemana[agora.getDay()];
        
        const abertura = configLoja[`${diaHoje}_abertura`]; // ex: "08:00"
        const fechamento = configLoja[`${diaHoje}_fechamento`]; // ex: "22:00"
        const fechado = configLoja[`${diaHoje}_fechado`]; // ex: true/false
        
        let lojaAberta = false;
        let horarioTexto = "Fechado hoje";

        if (fechado) {
            lojaAberta = false;
        } else if (abertura && fechamento) {
            horarioTexto = `Horário: ${abertura} - ${fechamento}`;
            const [horaAbertura, minAbertura] = abertura.split(':').map(Number);
            const [horaFechamento, minFechamento] = fechamento.split(':').map(Number);
            
            const dataAbertura = new Date();
            dataAbertura.setHours(horaAbertura, minAbertura, 0);
            
            const dataFechamento = new Date();
            dataFechamento.setHours(horaFechamento, minFechamento, 0);

            // Verifica se está dentro do horário
            if (agora >= dataAbertura && agora < dataFechamento) {
                lojaAberta = true;
                
                // Verifica se está perto de fechar (última hora)
                const minutosParaFechar = (dataFechamento - agora) / 60000;
                if (minutosParaFechar <= 60) {
                    storeAttentionBar.style.display = 'block';
                    storeAttentionBar.querySelector('p').textContent = `⚠️ Fechando em ${Math.ceil(minutosParaFechar)} minutos!`;
                } else {
                    storeAttentionBar.style.display = 'none';
                }
            } else {
                storeAttentionBar.style.display = 'none';
            }
        }

        // Atualiza UI
        if (lojaAberta) {
            storeStatusIndicator.className = 'status-indicator open';
            storeStatusText.textContent = 'Aberto';
            storeClosedMessage.style.display = 'none';
            if(finalizarDiretoBtn) finalizarDiretoBtn.disabled = !(carrinho.length > 0 && clienteLogado); // Habilita o botão se o carrinho não estiver vazio
        } else {
            storeStatusIndicator.className = 'status-indicator closed';
            storeStatusText.textContent = 'Fechado';
            storeClosedMessage.style.display = 'block';
            if(finalizarDiretoBtn) finalizarDiretoBtn.disabled = true; // Desabilita o botão
        }
        
        storeHoursText.textContent = horarioTexto;
    }

    function setupShare() {
        if (!shareIcon) return;
        shareIcon.addEventListener('click', async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Confeitaria Doce Criativo',
                        text: 'Confira os deliciosos doces da Confeitaria Doce Criativo!',
                        url: window.location.href
                    });
                } catch (error) { console.log('Erro ao compartilhar:', error); }
            } else {
                navigator.clipboard.writeText(window.location.href).then(() => {
                    mostrarMensagem('Link copiado para a área de transferência!', 'success');
                });
            }
        });
    }

    function setupSearch() {
        if (!searchIcon) return;
        searchIcon.addEventListener('click', () => {
            const searchTerm = prompt('O que você está procurando?');
            if (searchTerm && searchTerm.trim() !== '') {
                const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));
                exibirProdutos(produtosFiltrados);
                document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('active'));
                document.querySelectorAll('.category-products').forEach(section => {
                    section.style.display = 'block';
                });
            }
        });
    }

    // --- FUNÇÕES CORE (CARRINHO E SUPABASE) ---

    // --- FUNÇÃO ATUALIZADA (para chamar o modal de opções) ---
    function handleProdutoClick(produto) {
        // Lógica futura: verificar se o produto tem opções.
        // Por enquanto, vamos simular que todos os produtos podem ter opções
        // ou podem ser adicionados diretamente.
        
        // Simplesmente adiciona direto por enquanto.
        // Para implementar opções, mude a linha abaixo para:
        // abrirModalOpcoes(produto);
        adicionarAoCarrinho(produto);
    }

    function adicionarAoCarrinho(produto) {
        if (produto.estoque_atual <= 0) {
            mostrarMensagem(`Desculpe, ${produto.nome} está esgotado.`, 'error');
            return;
        }
        const itemExistente = carrinho.find(item => item.produto.id === produto.id && !item.opcoes); // Só agrupa se não tiver opções
        if (itemExistente) {
            if (itemExistente.quantidade < produto.estoque_atual) {
                itemExistente.quantidade += 1;
            } else {
                mostrarMensagem(`Estoque máximo atingido para ${produto.nome} (${produto.estoque_atual} un.)`, 'warning');
                return;
            }
        } else {
            // Adiciona item simples (sem opções)
            carrinho.push({ 
                produto: produto, 
                quantidade: 1, 
                precoFinalItem: produto.preco_venda 
            });
        }
        atualizarCarrinho();
        mostrarMensagem(`${produto.nome} adicionado à sacola!`, 'success');
    }

    function aumentarQuantidade(index) {
        const produtoEstoque = produtos.find(p => p.id === carrinho[index].produto.id).estoque_atual;
        if (carrinho[index].quantidade < produtoEstoque) {
            carrinho[index].quantidade += 1;
            atualizarCarrinho();
        } else {
            mostrarMensagem(`Estoque máximo atingido para ${carrinho[index].produto.nome} (${produtoEstoque} un.)`, 'warning');
        }
    }
    
    function removerDoCarrinho(index) {
        const produtoNome = carrinho[index].produto.nome;
        if (carrinho[index].quantidade > 1) {
            carrinho[index].quantidade -= 1;
        } else {
            carrinho.splice(index, 1);
        }
        atualizarCarrinho();
        mostrarMensagem(`${produtoNome} removido da sacola.`, 'info');
    }
    
    // --- FUNÇÃO ATUALIZADA (para incluir taxa de entrega) ---
    function atualizarCarrinho() {
        let subTotal = 0;
        let totalItens = 0;
        const taxaEntrega = configLoja.taxa_entrega || 0;
            
        if (carrinho.length === 0) {
            carrinhoItens.innerHTML = `<p style="text-align: center; color: #666;">Sua sacola está vazia.</p>`;
        } else {
            carrinhoItens.innerHTML = '';
            carrinho.forEach((item, index) => {
                // Usa o precoFinalItem (que pode incluir complementos)
                const itemSubtotal = item.precoFinalItem * item.quantidade;
                subTotal += itemSubtotal;
                totalItens += item.quantidade; 
                
                // --- NOVO: Renderiza as opções no carrinho ---
                let opcoesHtml = '';
                if (item.opcoes || item.complementos || item.observacao) {
                    opcoesHtml += '<div class="carrinho-item-opcoes">';
                    if(item.opcoes) {
                        item.opcoes.forEach(op => {
                            opcoesHtml += `<p><strong>${op.grupo}:</strong> ${op.nome}</p>`;
                        });
                    }
                    if(item.complementos && item.complementos.length > 0) {
                        opcoesHtml += `<p><strong>Adicionais:</strong> ${item.complementos.map(c => c.nome).join(', ')}</p>`;
                    }
                    if(item.observacao) {
                        opcoesHtml += `<p><strong>Obs:</strong> ${item.observacao}</p>`;
                    }
                    opcoesHtml += '</div>';
                }
                // --- FIM ---

                const itemElement = document.createElement('div');
                itemElement.className = 'carrinho-item';
                itemElement.innerHTML = `
                    <div class="carrinho-item-info">
                        <div class="carrinho-item-nome">${item.quantidade}x ${item.produto.nome}</div>
                        <div class="carrinho-item-preco">${formatarMoeda(item.precoFinalItem)} (un)</div>
                        ${opcoesHtml}
                    </div>
                    <div class="carrinho-item-controles">
                        <button class="btn-remover" data-index="${index}"><i class="fas fa-minus"></i></button>
                        <button class="btn-adicionar-carrinho" data-index="${index}"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="carrinho-item-subtotal">
                        ${formatarMoeda(itemSubtotal)}
                    </div>
                `;
                carrinhoItens.appendChild(itemElement);
            });
            
            document.querySelectorAll('.btn-remover').forEach(btn => btn.addEventListener('click', function() {
                removerDoCarrinho(parseInt(this.getAttribute('data-index')));
            }));
            document.querySelectorAll('.btn-adicionar-carrinho').forEach(btn => btn.addEventListener('click', function() {
                aumentarQuantidade(parseInt(this.getAttribute('data-index')));
            }));
        }

        const totalFinal = subTotal + taxaEntrega;
        
        // Atualiza o resumo do carrinho
        subtotalCarrinho.textContent = formatarMoeda(subTotal);
        taxaEntregaCarrinho.textContent = formatarMoeda(taxaEntrega);
        totalCarrinho.textContent = totalFinal.toFixed(2).replace('.', ',');
        
        // Verifica se está logado e se a loja está aberta para habilitar botões
        const isLojaAberta = storeStatusText.textContent === 'Aberto';
        const isReady = carrinho.length > 0 && clienteLogado && isLojaAberta; 
        if (finalizarDiretoBtn) finalizarDiretoBtn.disabled = !isReady;
        if (!isLojaAberta && carrinho.length > 0) {
            mostrarMensagem('A loja está fechada. Não é possível finalizar o pedido.', 'warning');
        }
        
        // Atualiza os dois contadores de carrinho
        if (carrinhoBadge) {
            carrinhoBadge.textContent = totalItens;
            carrinhoBadge.style.display = totalItens > 0 ? 'block' : 'none';
        }
        if (cartCountNav) {
            cartCountNav.textContent = totalItens;
            cartCountNav.style.display = totalItens > 0 ? 'flex' : 'none';
        }
    }
    
    function limparFormularioECarrinho() { 
        carrinho = [];
        atualizarCarrinho();
        if (carrinhoEnderecoInput) carrinhoEnderecoInput.value = clientePerfil.endereco || '';
        if (cadastroForm) cadastroForm.reset();
        
        document.querySelectorAll('.opcoes-pagamento input[name="pagamento"]').forEach(input => input.checked = false);
        const defaultPayment = document.querySelector('.opcoes-pagamento input[value="Dinheiro"]');
        if(defaultPayment) defaultPayment.checked = true;
        
        document.querySelectorAll('.opcoes-pagamento .pagamento-opcao').forEach(op => op.classList.remove('selected'));
        const defaultPaymentLabel = document.querySelector('.opcoes-pagamento .pagamento-opcao');
        if (defaultPaymentLabel) {
            defaultPaymentLabel.classList.add('selected');
        }
        
        if (pedidoObservacoes) pedidoObservacoes.value = ''; 
        if (trocoParaInput) trocoParaInput.value = ''; 
    }

    // --- CARREGAMENTO DE DADOS (SUPABASE) ---

    async function carregarCategorias() {
        try {
            categorias = await window.vendasSupabase.buscarCategorias();
            exibirCategorias();
        } catch (error) {
            mostrarMensagem('Erro ao carregar categorias.', 'error');
        }
    }

    async function carregarProdutos() {
        try {
            const { data: produtosData, error } = await supabase
                .from('produtos')
                .select('*')
                .eq('ativo', true)
                .order('nome');

            if (error) throw error;
            
            produtos = produtosData || [];
            exibirProdutos(produtos);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            mostrarMensagem('Erro ao carregar produtos.', 'error');
        }
    }

    async function carregarMaisPedidos() {
        if (!popularScroll) return;
        popularScroll.innerHTML = '<p>Carregando...</p>';
        try {
            const { data, error } = await supabase
                .from('produtos')
                .select('*')
                .eq('ativo', true)
                .order('estoque_atual', { ascending: false })
                .limit(5);
            
            if (error) throw error;
            
            popularScroll.innerHTML = '';
            if (data.length === 0) {
                 popularScroll.innerHTML = '<p>Nenhum destaque no momento.</p>';
                 return;
            }

            data.forEach(produto => {
                const popularItem = document.createElement('div');
                popularItem.className = 'popular-item';

                const imgTag = produto.icone
                    ? `<img src="${produto.icone}" alt="${produto.nome}">`
                    : `<div class="popular-item-placeholder"><i class="fas fa-cube"></i></div>`;

                popularItem.innerHTML = `
                    ${imgTag}
                    <h3>${produto.nome}</h3>
                    <p>${formatarMoeda(produto.preco_venda)}</p>
                `;
                popularItem.addEventListener('click', () => handleProdutoClick(produto)); // ATUALIZADO
                popularScroll.appendChild(popularItem);
            });

        } catch (error) {
             popularScroll.innerHTML = '<p>Erro ao carregar destaques.</p>';
        }
    }

    function exibirCategorias() { 
        if (!categoriesScroll) return;
        categoriesScroll.innerHTML = ''; 
        
        const categoriaTodos = document.createElement('div');
        categoriaTodos.className = `category-item active`;
        categoriaTodos.textContent = 'Todos';
        categoriaTodos.setAttribute('data-id', 'todos');
        categoriesScroll.appendChild(categoriaTodos);

        categorias.forEach(categoria => {
            const categoriaBtn = document.createElement('div');
            categoriaBtn.className = `category-item`;
            categoriaBtn.textContent = categoria.nome;
            categoriaBtn.setAttribute('data-id', categoria.id);
            categoriesScroll.appendChild(categoriaBtn);
        });
        
        setupCategoryNavigationJS();
    }

    function setupCategoryNavigationJS() {
        const categoryItems = document.querySelectorAll('.category-item');
        const productsSectionEl = document.querySelector('.products-section');
        
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                const categoryId = item.getAttribute('data-id');
                
                categoryItems.forEach(cat => cat.classList.remove('active'));
                item.classList.add('active');
                
                let targetSection = null;
                const categorySections = document.querySelectorAll('.category-products');

                if (categoryId === 'todos') {
                    categorySections.forEach(section => section.style.display = 'block');
                    productsSectionEl.scrollIntoView({ behavior: 'smooth' });
                    return;
                }
                
                categorySections.forEach(section => {
                    section.style.display = 'none';
                });

                targetSection = document.getElementById(`category-section-${categoryId}`);
                
                if (targetSection) {
                    targetSection.style.display = 'block';
                    setTimeout(() => {
                        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            });
        });
    }

    function exibirProdutos(listaParaExibir) {
        if (!productsSection) return;
        productsSection.innerHTML = ''; 
        
        const produtosAtivos = listaParaExibir || produtos.filter(p => p.ativo);
        
        const produtosPorCategoria = {};
        produtosAtivos.forEach(produto => {
            const catId = produto.categoria_id || 'sem-categoria';
            const categoriaObj = categorias.find(c => c.id === produto.categoria_id);
            const catNome = categoriaObj?.nome || 'Outros';
            
            if (!produtosPorCategoria[catId]) {
                produtosPorCategoria[catId] = {
                    id: catId,
                    nome: catNome,
                    produtos: []
                };
            }
            produtosPorCategoria[catId].produtos.push(produto);
        });
        
        const categoriasOrdenadas = Object.values(produtosPorCategoria).sort((a, b) => a.nome.localeCompare(b.nome));

        if (categoriasOrdenadas.length === 0) {
            productsSection.innerHTML = '<p style="padding: 20px; text-align: center;">Nenhum produto encontrado.</p>';
            return;
        }

        categoriasOrdenadas.forEach(categoria => {
            const categorySectionDiv = document.createElement('div');
            categorySectionDiv.className = 'category-products';
            categorySectionDiv.id = `category-section-${categoria.id}`;
            
            let productListHtml = '';
            categoria.produtos.forEach(produto => {
                const esgotado = produto.estoque_atual <= 0;
                const imgTag = produto.icone
                    ? `<img src="${produto.icone}" alt="${produto.nome}">`
                    : `<div class="product-image-placeholder"><i class="fas fa-cube"></i></div>`;
                
                productListHtml += `
                    <div class="product-item ${esgotado ? 'out-of-stock' : ''}" data-id="${produto.id}">
                        <div class="product-info">
                            <h4 class="product-name">${produto.nome}</h4>
                            <p class="product-description">${produto.descricao || 'Sem descrição'}</p>
                            <p class="product-price">${formatarMoeda(produto.preco_venda)}</p>
                        </div>
                        <div class="product-image">
                            ${imgTag}
                            <button class="add-cart" data-id="${produto.id}" ${esgotado ? 'disabled' : ''}>
                                ${esgotado ? '<i class="fas fa-times"></i>' : '+'}
                            </button>
                        </div>
                    </div>
                `;
            });

            categorySectionDiv.innerHTML = `
                <h3 class="category-title">${categoria.nome}</h3>
                <div class="products-list">
                    ${productListHtml}
                </div>
            `;
            productsSection.appendChild(categorySectionDiv);
        });
        
        // --- ATUALIZADO: Event listener para chamar o modal ou adicionar direto ---
        document.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('add-cart')) {
                    // Se o clique foi no botão '+', só adiciona
                    const produtoId = e.currentTarget.getAttribute('data-id');
                    const produto = produtos.find(p => p.id === produtoId);
                    if (produto) adicionarAoCarrinho(produto);
                } else {
                    // Se o clique foi no card, abre as opções
                    const produtoId = e.currentTarget.getAttribute('data-id');
                    const produto = produtos.find(p => p.id === produtoId);
                    if (produto) {
                        // Mude esta linha para adicionarAoCarrinho(produto) se não quiser o modal
                        abrirModalOpcoes(produto);
                    }
                }
            });
        });
        document.querySelectorAll('.add-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Impede o clique no card
                const produtoId = e.currentTarget.getAttribute('data-id');
                const produto = produtos.find(p => p.id === produtoId);
                if (produto) adicionarAoCarrinho(produto);
            });
        });
    }
    
    // --- FUNÇÕES DE AUTH, CHECKOUT E PERFIL (LÓGICA ANTIGA ADAPTADA) ---

    function obterDadosCliente() {
        const endereco = carrinhoEnderecoInput.value.trim();
        const trocoPara = parseFloat(trocoParaInput.value) || 0; 
        const observacoes = pedidoObservacoes.value.trim(); 

        if (clienteLogado) {
             const nome = clientePerfil.nome;
             const telefone = clientePerfil.telefone;
             
             if (!telefone) {
                window.alternarView('auth-screen');
                mostrarMensagem('Sua sessão expirou. Faça login novamente.', 'error');
                return null;
             }
             
             return {
                 nome: nome,
                 telefone: telefone,
                 endereco: endereco,
                 authId: clienteLogado.id,
                 trocoPara: trocoPara,
                 observacoes: observacoes
             };
        } else {
             window.alternarView('auth-screen');
             mostrarMensagem('🚨 Você precisa estar logado para enviar o pedido.', 'error');
             return null;
        }
    }

    // --- FUNÇÃO ATUALIZADA (para incluir taxa de entrega e opções) ---
    function validarDados() {
        const dadosCliente = obterDadosCliente();
        const formaPagamentoEl = document.querySelector('.opcoes-pagamento input[name="pagamento"]:checked');
        const taxaEntrega = configLoja.taxa_entrega || 0;

        if (carrinho.length === 0) {
            mostrarMensagem('Sua sacola está vazia!', 'error');
            return null;
        }
        
        if (!dadosCliente) return null;
        
        if (!dadosCliente.nome || !dadosCliente.telefone || !dadosCliente.endereco) {
            mostrarMensagem('Dados do cliente ou endereço incompletos.', 'error');
            return null;
        }
        
        const subTotalProdutos = carrinho.reduce((sum, item) => sum + (item.precoFinalItem * item.quantidade), 0);
        const totalPedido = subTotalProdutos + taxaEntrega;
        
        if (formaPagamentoEl.value === 'Dinheiro' && dadosCliente.trocoPara > 0 && dadosCliente.trocoPara < totalPedido) {
             mostrarMensagem('O valor do troco deve ser igual ou maior que o total do pedido.', 'error');
             trocoParaInput.focus();
             return null;
        }
        if (formaPagamentoEl.value !== 'Dinheiro' && dadosCliente.trocoPara > 0) {
             mostrarMensagem('Atenção: Troco só é permitido para pagamento em Dinheiro.', 'warning');
             trocoParaInput.value = 0;
        }
        
        if (!formaPagamentoEl) {
            mostrarMensagem('Por favor, escolha uma forma de pagamento.', 'error');
            return null;
        }
        
        // --- NOVO: Formatação de Itens com Opções ---
        let listaItens = "Itens:\n";
        carrinho.forEach(item => {
            listaItens += `* ${item.quantidade}x ${item.produto.nome} (${formatarMoeda(item.precoFinalItem)})\n`;
            // Adiciona opções, se existirem
            if(item.opcoes) {
                item.opcoes.forEach(op => {
                    listaItens += `  - ${op.grupo}: ${op.nome}\n`;
                });
            }
            if(item.complementos && item.complementos.length > 0) {
                listaItens += `  - Adicionais: ${item.complementos.map(c => c.nome).join(', ')}\n`;
            }
            if(item.observacao) {
                listaItens += `  - Obs: ${item.observacao}\n`;
            }
        });
        
        let obsCompleta = dadosCliente.observacoes;
        if (dadosCliente.trocoPara > 0) {
             obsCompleta += `\nTROCO NECESSÁRIO: Sim, para ${formatarMoeda(dadosCliente.trocoPara)}`;
        } else if (formaPagamentoEl.value === 'Dinheiro') {
             obsCompleta += `\nTROCO NECESSÁRIO: Não`;
        }
        
        obsCompleta = `${listaItens}\nSubtotal: ${formatarMoeda(subTotalProdutos)}\nTaxa Entrega: ${formatarMoeda(taxaEntrega)}\nTotal: ${formatarMoeda(totalPedido)}\n\nOBSERVAÇÕES ADICIONAIS:\n${obsCompleta}`;


        return {
            ...dadosCliente,
            formaPagamento: formaPagamentoEl.value,
            total: totalPedido, // Envia o total FINAL (com taxa)
            observacoes: obsCompleta,
            itens: carrinho.map(item => ({ 
                produto_id: item.produto.id,
                quantidade: item.quantidade,
                preco_unitario: item.precoFinalItem, // Envia o preço final do item (com adicionais)
                nome_produto: item.produto.nome 
            }))
        };
    }

    async function buscarClientePorTelefone(telefone) {
        try {
            const { data, error } = await supabase.from('clientes_delivery')
                .select('*')
                .eq('telefone', telefone)
                .limit(1) 
                .maybeSingle(); 
            
            if (error && error.code !== 'PGRST116') throw error;
            
            return data || null;
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            mostrarMensagem('Erro ao consultar banco de dados.', 'error');
            return null;
        }
    }

    async function iniciarSessao(e) {
        e.preventDefault();
        const telefoneRaw = authTelefoneInput.value.trim();
        const telefone = formatarTelefone(telefoneRaw);

        if (telefone.length < 10) { 
            return mostrarMensagem('Por favor, insira um telefone válido com DDD.', 'error');
        }

        btnIniciarSessao.disabled = true;
        btnIniciarSessao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

        const cliente = await buscarClientePorTelefone(telefone);

        if (cliente) {
            clientePerfil.nome = cliente.nome;
            clientePerfil.telefone = cliente.telefone;
            clientePerfil.endereco = cliente.endereco;

            mostrarMensagem(`Bem-vindo de volta, ${cliente.nome.split(' ')[0]}!`, 'success');
            logarClienteManual();
            
        } else {
            cadastroTelefoneHidden.value = telefone;
            document.getElementById('login-form-group').style.display = 'none';
            cadastroForm.style.display = 'block';
            mostrarMensagem('Novo cliente detectado! Complete seu cadastro.', 'info');
        }

        btnIniciarSessao.disabled = false;
        btnIniciarSessao.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar ou Cadastrar';
    }

    async function finalizarCadastro(e) {
        e.preventDefault();
        const nome = cadastroNomeInput.value.trim();
        const telefone = cadastroTelefoneHidden.value;
        
        const cep = cadastroCepInput.value.trim();
        const rua = cadastroRuaInput.value.trim();
        const numero = cadastroNumeroInput.value.trim();
        const bairro = cadastroBairroInput.value.trim();
        const cidade = cadastroCidadeInput.value.trim();
        const estado = cadastroEstadoInput.value.trim();

        const enderecoCompleto = `${rua}, ${numero}, ${bairro} - ${cidade}/${estado} (CEP: ${cep})`;

        if (!nome || !rua || !numero || !bairro || !cidade || !estado) {
            return mostrarMensagem('Preencha o Nome e todos os campos de Endereço.', 'error');
        }
        
        btnFinalizarCadastro.disabled = true;
        btnFinalizarCadastro.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';

        try {
            const { data: novoCliente, error } = await supabase.from('clientes_delivery').insert({
                nome: nome,
                telefone: telefone,
                endereco: enderecoCompleto, 
                auth_id: 'guest-' + telefone
            }).select().single();

            if (error) {
                if (error.code === '23505') {
                    throw new Error("Este número já está cadastrado. Use a tela inicial para Entrar.");
                }
                throw error;
            }

            clientePerfil.nome = novoCliente.nome;
            clientePerfil.telefone = novoCliente.telefone;
            clientePerfil.endereco = novoCliente.endereco;
            
            mostrarMensagem(`Cadastro de ${nome.split(' ')[0]} concluído!`, 'success');
            logarClienteManual();

        } catch (error) {
            console.error('Erro no cadastro:', error);
            mostrarMensagem('Erro ao finalizar cadastro: ' + error.message, 'error');
        } finally {
            btnFinalizarCadastro.disabled = false;
            btnFinalizarCadastro.innerHTML = 'Finalizar Cadastro';
        }
    }
    
    // --- FUNÇÃO ATUALIZADA (para iniciar rastreamento) ---
    function logarClienteManual() {
        localStorage.setItem('clienteTelefone', clientePerfil.telefone);
        clienteLogado = { id: clientePerfil.telefone, email: clientePerfil.telefone }; 
        
        authScreen.classList.remove('active');
        mobileNav.style.display = 'flex';
        
        window.alternarView('view-cardapio');
        
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector('.bottom-nav .nav-item[data-view="view-cardapio"]')?.classList.add('active');

        atualizarPerfilUI();
        
        // Verifica se há um pedido ativo para rastrear
        const pedidoIdSalvo = localStorage.getItem('pedidoAtivoId');
        if (pedidoIdSalvo) {
            iniciarRastreamento(pedidoIdSalvo);
        } else {
            // Se não houver pedido ativo, carrega o histórico
            carregarStatusUltimoPedido();
        }
    }

    function fazerLogoutApp() {
        localStorage.removeItem('clienteTelefone');
        // --- NOVO: Limpa o pedido ativo ao sair ---
        localStorage.removeItem('pedidoAtivoId');
        if (supabaseChannel) {
            supabase.removeChannel(supabaseChannel);
            supabaseChannel = null;
        }
        pedidoAtivoId = null;
        rastreamentoContainer.style.display = 'none';
        // --- FIM ---
        
        clienteLogado = null;
        clientePerfil = { nome: null, telefone: null, endereco: null };
        mobileNav.style.display = 'none';
        
        authTelefoneInput.value = '';
        cadastroForm.style.display = 'none';
        document.getElementById('login-form-group').style.display = 'block';

        mostrarMensagem('Sessão encerrada.', 'info');
        window.alternarView('auth-screen');
    }

    // --- FUNÇÃO ATUALIZADA (para não mostrar histórico se estiver rastreando) ---
    async function carregarStatusUltimoPedido() {
        // Se um pedido está sendo rastreado, não mostra o histórico
        if (pedidoAtivoId) {
            statusUltimoPedido.innerHTML = '';
            return;
        }
        
        rastreamentoContainer.style.display = 'none'; // Garante que o tracker está oculto
        statusUltimoPedido.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando histórico...';
        
        if (!clienteLogado || !clientePerfil.telefone) {
            statusUltimoPedido.innerHTML = '<p>Faça login para ver o status e o histórico de pedidos.</p>';
            return;
        }

        try {
            const { data, error } = await supabase.from('pedidos_online')
                .select(`id, created_at, total, forma_pagamento, status, observacoes, telefone_cliente, endereco_entrega, nome_cliente`)
                .eq('telefone_cliente', clientePerfil.telefone) 
                .order('created_at', { ascending: false })
                .limit(3); 
                
            if (error) throw error;
            
            const pedidos = data || [];
            historicoPedidos = pedidos;
            
            let htmlHistorico = '';
            
            if (pedidos.length > 0) {
                 htmlHistorico += '<h4>Últimos Pedidos:</h4>';
                 
                 pedidos.forEach((p) => {
                     const dataPedido = new Date(p.created_at).toLocaleDateString('pt-BR');
                     const status = (p.status || 'novo').toUpperCase();
                     
                    let listaItens = 'Itens não detalhados';
                    const obsLines = p.observacoes.split('\n');
                    let isItemList = false;
                    for (const line of obsLines) {
                        if (line.includes('Itens:')) {
                            listaItens = '';
                            isItemList = true;
                            continue;
                        }
                        if (line.includes('Total:') || line.includes('OBSERVAÇÕES ADICIONAIS:')) {
                            isItemList = false;
                            break;
                        }
                        if (isItemList && line.trim() !== '') {
                            listaItens += line.replace('*', '').trim() + ', ';
                        }
                    }
                    if(listaItens.endsWith(', ')) listaItens = listaItens.slice(0, -2);
                    
                     htmlHistorico += `
                         <div class="card-pedido-historico" 
                              onclick="abrirModalDetalhesPedido(${p.id})">
                             <p style="font-weight: bold; margin: 0;">Pedido #${p.id} - ${dataPedido}</p>
                             <p style="font-size: 0.9rem; margin: 0; color: #555;">${listaItens}</p>
                             <p style="font-size: 0.9rem; margin: 0;">Status: 
                                 <span class="status-badge-history status-${status}">
                                     ${status}
                                 </span>
                                 | Total: ${formatarMoeda(p.total)}
                             </p>
                         </div>
                     `;
                 });
            } else {
                 htmlHistorico = 'Você ainda não fez nenhum pedido conosco!';
            }
            
            homeEndereco.innerHTML = `<strong>Endereço Atual:</strong><br>${clientePerfil.endereco || 'Endereço não cadastrado.'}`;
            statusUltimoPedido.innerHTML = htmlHistorico;
            
        } catch (error) {
            statusUltimoPedido.innerHTML = 'Erro ao carregar histórico.';
            console.error('Erro ao carregar status do pedido:', error);
        }
    }

    // Modal de Histórico (sem alterações)
    window.abrirModalDetalhesPedido = function(pedidoId) {
        // ... (código original mantido)
    }

    function atualizarPerfilUI() {
        if (clienteLogado) {
            homeClienteNome.textContent = clientePerfil.nome.split(' ')[0];
            carrinhoClienteNomeDisplay.textContent = clientePerfil.nome || 'N/A';
            carrinhoEnderecoDisplay.textContent = clientePerfil.endereco || 'N/A';
            carrinhoEnderecoInput.value = clientePerfil.endereco || '';
        } else {
            homeClienteNome.textContent = 'Visitante';
        }
    }

    function atualizarCarrinhoDisplay() {
        atualizarPerfilUI(); 
        atualizarCarrinho();
    }
    
    function abrirModalEditarEndereco() {
        if (!clienteLogado) {
             window.alternarView('auth-screen');
             mostrarMensagem('Faça login para editar seu endereço.', 'error');
             return;
        }
        const cepMatch = clientePerfil.endereco ? clientePerfil.endereco.match(/\(CEP:\s?(\d{5}-?\d{3})\)/) : null;
        modalCepInput.value = cepMatch ? cepMatch[1] : '';
        modalRuaInput.value = '';
        modalNumeroInput.value = '';
        modalBairroInput.value = '';
        modalEditarEndereco.style.display = 'flex';
    }

    // --- FUNÇÃO ATUALIZADA (para usar campos de cidade/estado) ---
    async function salvarEdicaoEndereco(e) {
        e.preventDefault();
        const telefone = clientePerfil.telefone;
        const cep = modalCepInput.value.trim();
        const rua = modalRuaInput.value.trim();
        const numero = modalNumeroInput.value.trim();
        const bairro = modalBairroInput.value.trim();
        // --- NOVOS CAMPOS ---
        const cidade = modalCidadeInput.value.trim();
        const estado = modalEstadoInput.value.trim();
        
        if (!rua || !numero || !bairro || !cep || !cidade || !estado) {
            mostrarMensagem('Preencha a Rua, Número, Bairro, CEP, Cidade e Estado.', 'error');
            return;
        }
        
        const enderecoCompleto = `${rua}, ${numero}, ${bairro} - ${cidade}/${estado} (CEP: ${cep})`;

        try {
            const { error } = await supabase.from('clientes_delivery')
                .update({ endereco: enderecoCompleto })
                .eq('telefone', telefone);
            if (error) throw error;
            
            clientePerfil.endereco = enderecoCompleto;
            mostrarMensagem('✅ Endereço atualizado com sucesso!', 'success');
            modalEditarEndereco.style.display = 'none';
            atualizarPerfilUI(); 
            carregarStatusUltimoPedido(); 

        } catch (error) {
            console.error('Erro ao salvar endereço:', error);
            mostrarMensagem('Erro ao salvar endereço. Verifique sua conexão.', 'error');
        }
    }
    
    // --- FINALIZAÇÃO DE PEDIDOS (CONEXÃO COM DELIVERY) ---

    // --- FUNÇÃO ATUALIZADA (para salvar ID e iniciar rastreamento) ---
    async function finalizarPedidoEEnviarWhatsApp() { 
        const dados = validarDados();
        if (!dados) return;

        mostrarMensagem('Processando pedido...', 'info');
        finalizarDiretoBtn.disabled = true;

        try {
            // 1. Criar o pedido_online
            const { data: novoPedido, error } = await supabase.from('pedidos_online').insert({
                nome_cliente: dados.nome,
                telefone_cliente: dados.telefone,
                endereco_entrega: dados.endereco,
                forma_pagamento: dados.formaPagamento,
                total: dados.total,
                status: 'novo',
                observacoes: dados.observacoes
            }).select().single();

            if (error) throw error;
            
            // 2. Atualizar estoque
            for (const item of carrinho) {
                const produtoId = item.produto.id;
                const quantidade = item.quantidade;
                const produtoNoEstoque = produtos.find(p => p.id === produtoId);
                const novoEstoque = produtoNoEstoque.estoque_atual - quantidade;

                if (window.vendasSupabase && window.vendasSupabase.actualizarEstoque) {
                     await window.vendasSupabase.actualizarEstoque(produtoId, novoEstoque);
                } else {
                     await supabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', produtoId);
                }
            }

            // 3. ENVIAR MENSAGEM VIA WHATSAPP (Como antes)
            let mensagem = `*PEDIDO ONLINE - DOCE CRIATIVO*\n\n`;
            mensagem += `*Cliente:* ${dados.nome}\n`;
            // ... (restante da mensagem)
            mensagem += `*TOTAL:* ${formatarMoeda(dados.total)}\n\n`;
            mensagem += `--- DETALHES ---\n`;
            mensagem += dados.observacoes;

            const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
            window.open(url, '_blank');

            mostrarMensagem('✅ Pedido registrado! Acompanhe o status na tela "Pedidos".', 'success');
            
            // --- NOVO: Iniciar Rastreamento ---
            localStorage.setItem('pedidoAtivoId', novoPedido.id);
            iniciarRastreamento(novoPedido.id);
            // --- FIM ---
            
            limparFormularioECarrinho();
            await carregarProdutos();
            
            window.alternarView('view-inicio'); // Muda para a tela de Pedidos/Perfil
            // carregarStatusUltimoPedido(); // Não é mais necessário, pois o iniciarRastreamento vai atualizar a tela

        } catch (error) {
            console.error("Erro ao finalizar pedido direto:", error);
            mostrarMensagem(`Erro ao enviar pedido: ${error.message}`, 'error');
        } finally {
            // Re-habilita o botão com base no status da loja
            updateStoreStatus();
        }
    }
    
    // ================================================================
    // === NOVAS FUNÇÕES (RASTREAMENTO E OPÇÕES) ===
    // ================================================================

    /**
     * Inicia o ouvinte de Realtime do Supabase para um pedido específico.
     */
    function iniciarRastreamento(pedidoId) {
        if (!pedidoId) return;
        
        pedidoAtivoId = pedidoId;
        console.log(`Iniciando rastreamento para o pedido: ${pedidoId}`);
        
        // Esconde o histórico de pedidos
        statusUltimoPedido.innerHTML = '';
        
        // Remove qualquer ouvinte antigo
        if (supabaseChannel) {
            supabase.removeChannel(supabaseChannel);
        }

        // Função para atualizar a UI do tracker
        const atualizarTrackerUI = (pedido) => {
            if (!pedido) {
                // Pedido não encontrado ou finalizado
                localStorage.removeItem('pedidoAtivoId');
                pedidoAtivoId = null;
                rastreamentoContainer.style.display = 'none';
                if(supabaseChannel) supabase.removeChannel(supabaseChannel);
                carregarStatusUltimoPedido(); // Carrega o histórico
                return;
            }

            rastreamentoPedidoId.textContent = `#${pedido.id}`;
            rastreamentoContainer.style.display = 'block';

            // Reseta todos os steps
            [stepNovo, stepPreparando, stepPronto, stepEntregue].forEach(step => {
                step.classList.remove('active', 'completed');
            });
            
            // Atualiza os steps
            if (pedido.status === 'novo') {
                stepNovo.classList.add('active');
                rastreamentoStatusTexto.textContent = 'Pedido recebido pela loja!';
            } else if (pedido.status === 'preparando') {
                stepNovo.classList.add('completed');
                stepPreparando.classList.add('active');
                rastreamentoStatusTexto.textContent = 'Seu pedido está sendo preparado!';
            } else if (pedido.status === 'pronto') {
                stepNovo.classList.add('completed');
                stepPreparando.classList.add('completed');
                stepPronto.classList.add('active');
                rastreamentoStatusTexto.textContent = 'Seu pedido está pronto para sair!';
            } else if (pedido.status === 'entregue' || pedido.status === 'cancelado') {
                stepNovo.classList.add('completed');
                stepPreparando.classList.add('completed');
                stepPronto.classList.add('completed');
                stepEntregue.classList.add(pedido.status === 'entregue' ? 'completed' : 'active'); // 'active' para cancelado (vermelho)
                
                if (pedido.status === 'cancelado') {
                    stepEntregue.querySelector('i').className = 'fas fa-times-circle';
                    stepEntregue.style.color = '#c62828';
                    stepEntregue.querySelector('i').style.background = '#c62828';
                    rastreamentoStatusTexto.textContent = 'Seu pedido foi cancelado.';
                } else {
                    stepEntregue.querySelector('i').className = 'fas fa-check-circle';
                    rastreamentoStatusTexto.textContent = 'Pedido entregue! Bom apetite!';
                }

                // Limpa o rastreamento após 5 segundos de finalizado/cancelado
                setTimeout(() => {
                    localStorage.removeItem('pedidoAtivoId');
                    pedidoAtivoId = null;
                    rastreamentoContainer.style.display = 'none';
                    carregarStatusUltimoPedido(); // Carrega o histórico
                }, 5000);
                
                if(supabaseChannel) supabase.removeChannel(supabaseChannel);
            }
        };

        // 1. Busca o status atual do pedido
        supabase.from('pedidos_online')
            .select('id, status')
            .eq('id', pedidoId)
            .single()
            .then(({ data: pedido, error }) => {
                if (error || !pedido) {
                    console.log("Pedido não encontrado, limpando tracker.");
                    localStorage.removeItem('pedidoAtivoId');
                    pedidoAtivoId = null;
                    carregarStatusUltimoPedido();
                } else {
                    atualizarTrackerUI(pedido);
                }
            });

        // 2. Ouve por atualizações futuras
        supabaseChannel = supabase.channel(`pedido-${pedidoId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'pedidos_online',
                    filter: `id=eq.${pedidoId}`
                },
                (payload) => {
                    console.log('Status do pedido atualizado via Realtime!', payload.new);
                    atualizarTrackerUI(payload.new);
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Canal de rastreamento para ${pedidoId} iniciado.`);
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('Erro no canal de rastreamento:', err);
                }
            });
    }


    /**
     * Abre o modal de opções para um produto.
     */
    async function abrirModalOpcoes(produto) {
        produtoSelecionadoModal = produto;
        precoBaseModal = produto.preco_venda;

        opcoesTitulo.textContent = produto.nome;
        opcoesDescricao.textContent = produto.descricao || '';
        opcoesContainer.innerHTML = '';
        complementosContainer.innerHTML = '';
        opcoesObservacao.value = '';
        opcoesQuantidadeValor.textContent = '1';

        mostrarMensagem('Carregando opções...', 'info');

        try {
            // --- LÓGICA DE BUSCA DE OPÇÕES (REQUER NOVAS TABELAS) ---
            // Como as tabelas 'produto_opcoes_grupos' e 'produto_complementos' não existem,
            // esta busca retornará vazio. O código está pronto para quando elas existirem.
            
            // 1. Buscar Grupos de Opções (ex: Tamanho, Massa) - tipo RADIO
            const { data: gruposOpcoes, error: errorGrupos } = await supabase
                .from('produto_opcoes_grupos') // Tabela não existe (ainda)
                .select(`*, opcoes:produto_opcoes(*)`)
                .eq('produto_id', produto.id)
                .order('nome');

            if (errorGrupos) throw errorGrupos;

            // 2. Buscar Complementos (Adicionais) - tipo CHECKBOX
            const { data: complementos, error: errorComps } = await supabase
                .from('produto_complementos') // Tabela não existe (ainda)
                .select(`*`)
                .eq('produto_id', produto.id)
                .order('nome');
                
            if (errorComps) throw errorComps;
            
            // --- Renderiza Grupos de Opções (Radio) ---
            if (gruposOpcoes && gruposOpcoes.length > 0) {
                gruposOpcoes.forEach(grupo => {
                    const grupoDiv = document.createElement('div');
                    grupoDiv.className = 'opcoes-grupo';
                    let opcoesHtml = `<h4>${grupo.nome} ${grupo.obrigatorio ? '*' : ''}</h4>`;
                    
                    grupo.opcoes.forEach(opcao => {
                        const precoTexto = opcao.preco_adicional > 0 ? ` (+${formatarMoeda(opcao.preco_adicional)})` : '';
                        opcoesHtml += `
                            <label class="opcao-item">
                                <div>
                                    <input type="radio" name="grupo-${grupo.id}" value="${opcao.id}" data-preco="${opcao.preco_adicional}" data-nome="${opcao.nome}" data-grupo="${grupo.nome}" ${grupo.obrigatorio ? 'required' : ''}>
                                    ${opcao.nome}
                                </div>
                                <span>${precoTexto}</span>
                            </label>
                        `;
                    });
                    grupoDiv.innerHTML = opcoesHtml;
                    opcoesContainer.appendChild(grupoDiv);
                });
            } else {
                opcoesContainer.innerHTML = '<p style="font-size:0.9rem; color:#888;">Este item não possui opções de escolha.</p>';
            }

            // --- Renderiza Complementos (Checkbox) ---
            if (complementos && complementos.length > 0) {
                let complementosHtml = `<div class="opcoes-grupo"><h4>Adicionais (Opcional)</h4>`;
                complementos.forEach(comp => {
                    const precoTexto = comp.preco > 0 ? ` (+${formatarMoeda(comp.preco)})` : '';
                    complementosHtml += `
                        <label class="opcao-item">
                            <div>
                                <input type="checkbox" name="complemento" value="${comp.id}" data-preco="${comp.preco}" data-nome="${comp.nome}">
                                ${comp.nome}
                            </div>
                            <span>${precoTexto}</span>
                        </label>
                    `;
                });
                complementosHtml += `</div>`;
                complementosContainer.innerHTML = complementosHtml;
            }

            // Adiciona listener para recalcular preço
            modalOpcoesProduto.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
                input.addEventListener('change', calcularPrecoModal);
            });
            
            calcularPrecoModal(); // Calcula o preço base
            modalOpcoesProduto.style.display = 'flex';

        } catch (error) {
            // Este erro é esperado se as tabelas não existirem
            console.warn(`Aviso: Não foi possível carregar opções para o produto ${produto.id}. ${error.message}`);
            // Se falhar (ex: tabelas não existem), apenas mostra o preço base
            calcularPrecoModal();
            modalOpcoesProduto.style.display = 'flex';
        }
    }

    /**
     * Calcula o preço total no modal de opções
     */
    function calcularPrecoModal() {
        let precoCalculado = precoBaseModal;
        const quantidade = parseInt(opcoesQuantidadeValor.textContent);

        // Soma opções (radio)
        modalOpcoesProduto.querySelectorAll('input[type="radio"]:checked').forEach(input => {
            precoCalculado += parseFloat(input.dataset.preco || 0);
        });
        
        // Soma complementos (checkbox)
        modalOpcoesProduto.querySelectorAll('input[type="checkbox"]:checked').forEach(input => {
            precoCalculado += parseFloat(input.dataset.preco || 0);
        });
        
        const precoFinal = precoCalculado * quantidade;
        opcoesPrecoModal.textContent = formatarMoeda(precoFinal);
    }
    
    /**
     * Adiciona o item personalizado ao carrinho
     */
    function adicionarItemComOpcoes() {
        const quantidade = parseInt(opcoesQuantidadeValor.textContent);
        let precoCalculado = precoBaseModal;
        
        const opcoesSelecionadas = [];
        const complementosSelecionados = [];

        // Pega opções (radio)
        modalOpcoesProduto.querySelectorAll('input[type="radio"]:checked').forEach(input => {
            precoCalculado += parseFloat(input.dataset.preco || 0);
            opcoesSelecionadas.push({
                id: input.value,
                nome: input.dataset.nome,
                grupo: input.dataset.grupo,
                preco: parseFloat(input.dataset.preco || 0)
            });
        });
        
        // Pega complementos (checkbox)
        modalOpcoesProduto.querySelectorAll('input[type="checkbox"]:checked').forEach(input => {
            precoCalculado += parseFloat(input.dataset.preco || 0);
            complementosSelecionados.push({
                id: input.value,
                nome: input.dataset.nome,
                preco: parseFloat(input.dataset.preco || 0)
            });
        });

        const observacaoItem = opcoesObservacao.value.trim();
        
        // Adiciona ao carrinho
        carrinho.push({
            produto: produtoSelecionadoModal,
            quantidade: quantidade,
            precoFinalItem: precoCalculado, // Preço unitário final com adicionais
            opcoes: opcoesSelecionadas,
            complementos: complementosSelecionados,
            observacao: observacaoItem
        });
        
        atualizarCarrinho();
        modalOpcoesProduto.style.display = 'none';
        mostrarMensagem(`${produtoSelecionadoModal.nome} adicionado à sacola!`, 'success');
    }
    
    // --- FUNÇÕES DE EVENTOS ---

    function configurarEventListeners() {
        if (btnIniciarSessao) btnIniciarSessao.addEventListener('click', iniciarSessao);
        if (cadastroForm) cadastroForm.addEventListener('submit', finalizarCadastro);
        if (logoutBtnApp) logoutBtnApp.addEventListener('click', fazerLogoutApp);
        if (formEditarEndereco) formEditarEndereco.addEventListener('submit', salvarEdicaoEndereco); 
        
        document.getElementById('abrir-modal-editar-endereco')?.addEventListener('click', abrirModalEditarEndereco);
        
        // Listeners do Menu Inferior (Novo Design)
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const viewTarget = item.getAttribute('data-view');
                window.alternarView(viewTarget);
            });
        });
        
        if (finalizarDiretoBtn) finalizarDiretoBtn.addEventListener('click', finalizarPedidoEEnviarWhatsApp);
        
        carrinhoEnderecoInput.addEventListener('change', (e) => {
             clientePerfil.endereco = e.target.value.trim();
             carrinhoEnderecoDisplay.textContent = clientePerfil.endereco;
        });
        
        document.querySelectorAll('.opcoes-pagamento .pagamento-opcao').forEach(opcao => {
            opcao.addEventListener('click', () => {
                document.querySelectorAll('.opcoes-pagamento .pagamento-opcao').forEach(op => op.classList.remove('selected'));
                opcao.classList.add('selected');
                opcao.querySelector('input[name="pagamento"]').checked = true;
            });
        });
        
        // --- NOVOS: Listeners do Modal de Opções ---
        opcoesBtnAdicionar.addEventListener('click', () => {
            let qtd = parseInt(opcoesQuantidadeValor.textContent);
            qtd++;
            opcoesQuantidadeValor.textContent = qtd;
            calcularPrecoModal();
        });
        opcoesBtnRemover.addEventListener('click', () => {
            let qtd = parseInt(opcoesQuantidadeValor.textContent);
            if (qtd > 1) {
                qtd--;
                opcoesQuantidadeValor.textContent = qtd;
                calcularPrecoModal();
            }
        });
        btnAdicionarOpcoes.addEventListener('click', adicionarItemComOpcoes);
        
        // Fecha modals clicando no 'X'
        document.querySelectorAll('.modal .close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });
    }

    // --- Inicialização da Página (IIFE) ---
    
    (async function() {
        try {
            if (!window.vendasSupabase) {
                 throw new Error('Módulo de vendas (supabase-vendas.js) não carregado.');
            }
            
            // Carrega configurações da loja primeiro (para taxa de entrega e status)
            await carregarConfiguracoesLoja();

            const telefoneSalvo = localStorage.getItem('clienteTelefone');
            let clienteEncontrado = false;
            
            if (telefoneSalvo) {
                const cliente = await buscarClientePorTelefone(telefoneSalvo);
                if (cliente) {
                    clientePerfil.nome = cliente.nome;
                    clientePerfil.telefone = cliente.telefone;
                    clientePerfil.endereco = cliente.endereco;
                    clienteLogado = { id: clientePerfil.telefone, email: clientePerfil.telefone }; 
                    clienteEncontrado = true;
                } else {
                     localStorage.removeItem('clienteTelefone');
                     localStorage.removeItem('pedidoAtivoId'); // Limpa tracker se o cliente sumir
                }
            }
            
            authScreen.classList.remove('active');
            mobileNav.style.display = 'flex';
            window.alternarView('view-cardapio');
            
            if (clienteEncontrado) {
                 console.log(`Cliente ${clientePerfil.nome} carregado.`);
                 logarClienteManual(); // Esta função agora chama o rastreamento
            } else {
                 console.log("Nenhum cliente logado, iniciando como convidado.");
            }
            
            await carregarCategorias(); 
            await carregarProdutos();
            await carregarMaisPedidos();
            
            setupShare();
            setupSearch();
            setInterval(updateStoreStatus, 60000);

            configurarEventListeners();
            
            if (clienteEncontrado) {
                atualizarPerfilUI();
            }
            
            atualizarCarrinho();

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            mostrarMensagem('Erro ao carregar o app: ' + error.message, 'error');
            document.getElementById('auth-screen').classList.add('active');
        }
    })();
});