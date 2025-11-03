// js/pedido.js - Sistema Completo de Pedidos Mobile (INTEGRADO COM NOVO DESIGN)

document.addEventListener('DOMContentLoaded', async function() {
    
    // --- CONFIGURAÇÕES E VARIÁVEIS ---
    const NUMERO_WHATSAPP = '5573991964394'; // SEU NÚMERO DE WHATSAPP AQUI
    const AREA_COBERTURA_INICIAL = ['45', '46']; // Prefixo de CEP (Ex: Bahia)
    
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
    
    // Elementos do App Logado
    const logoutBtnApp = document.getElementById('logout-btn-app');
    const homeClienteNome = document.getElementById('home-cliente-nome');
    const statusUltimoPedido = document.getElementById('status-ultimo-pedido');
    const homeEndereco = document.getElementById('home-endereco');

    // Elementos do Carrinho (View de Checkout)
    const carrinhoItens = document.getElementById('carrinho-itens');
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
    
    // Elementos do Modal de Detalhes de Produto
    const modalDetalhesProduto = document.getElementById('modal-detalhes-produto');
    const detalhesTitulo = document.getElementById('detalhes-titulo');
    const detalhesProdutoContent = document.getElementById('detalhes-produto-content');
    const detalhesPrecoModal = document.getElementById('detalhes-preco-modal');
    const btnAdicionarModal = document.getElementById('btn-adicionar-modal');
    
    // Elementos do Modal de Detalhes do Pedido
    const modalDetalhesPedido = document.getElementById('modal-detalhes-pedido');
    const detalhesPedidoId = document.getElementById('detalhes-pedido-id');
    const detalhesPedidoContent = document.getElementById('detalhes-pedido-content');

    // Elementos do NOVO Layout (Cardápio)
    const storeStatusIndicator = document.querySelector('.store-status .status-indicator');
    const storeStatusText = document.querySelector('.store-status .status-text');
    const storeAttentionBar = document.querySelector('.store-status .attention-bar');
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
        document.querySelectorAll('.app-view').forEach(view => {
            if (view) view.classList.remove('active');
        });
        
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
        } else {
             console.error(`❌ ERRO: View com ID "${viewId}" não encontrada.`);
        }
        
        // Sincroniza os dois menus (o antigo e o novo)
        navItems.forEach(item => {
            if (item) item.classList.toggle('active', item.getAttribute('data-view') === viewId);
        });
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
             // Sincroniza o menu do novo design (pelo índice, por enquanto)
             if(viewId === 'view-cardapio' && item.querySelector('span').textContent === 'Início') item.classList.add('active');
             else if(viewId === 'view-carrinho' && item.querySelector('span').textContent === 'Carrinho') item.classList.add('active');
             else if(viewId === 'view-inicio' && item.querySelector('span').textContent === 'Pedidos') item.classList.add('active'); // Mapeando 'Pedidos' para 'Meu Perfil'
             else if(viewId === 'view-promocoes' && item.querySelector('span').textContent === 'Promos') item.classList.add('active');
             else item.classList.remove('active');
        });
        
        if (viewId === 'view-carrinho') {
            atualizarCarrinhoDisplay();
        }
        if (viewId === 'view-inicio') {
            carregarStatusUltimoPedido();
        }
    }
    
    function formatarTelefone(telefone) {
        const digitos = telefone.replace(/\D/g, '');
        return digitos.length >= 12 ? digitos : '55' + digitos;
    }

    function validarAreaEntrega(cep) {
        if (!cep) return false;
        const prefixo = cep.substring(0, 2);
        return AREA_COBERTURA_INICIAL.includes(prefixo);
    }
    
    window.buscarCep = async function(cep) {
        const cepLimpo = cep.replace(/\D/g, ''); 
        if (cepLimpo.length !== 8) return;
        mostrarMensagem('Buscando endereço...', 'info');

        if (!validarAreaEntrega(cepLimpo)) {
            mostrarMensagem('❌ Não entregamos nesse CEP. Por favor, verifique a área de cobertura.', 'error');
            return;
        }
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();
            if (data.erro) {
                mostrarMensagem('CEP não encontrado ou inválido.', 'error');
                return;
            }
            if (document.getElementById('cadastro-form').style.display === 'block') {
                cadastroRuaInput.value = data.logradouro || '';
                cadastroBairroInput.value = data.bairro || '';
                cadastroCidadeInput.value = data.localidade || '';
                cadastroEstadoInput.value = data.uf || '';
                cadastroNumeroInput.focus();
            } else if (modalEditarEndereco.style.display === 'flex') {
                modalRuaInput.value = data.logradouro || '';
                modalBairroInput.value = data.bairro || '';
                modalNumeroInput.focus();
            }
            mostrarMensagem('Endereço preenchido automaticamente.', 'success');
        } catch (error) {
            mostrarMensagem('Erro ao buscar o CEP. Preencha manually.', 'error');
        }
    }

    // --- FUNÇÕES DO NOVO DESIGN ---

    function updateStoreStatus() {
        const now = new Date();
        const currentHour = now.getHours();
        
        if (!storeStatusIndicator || !storeStatusText || !storeAttentionBar) return;

        if (currentHour >= 8 && currentHour < 22) {
            storeStatusIndicator.className = 'status-indicator open';
            storeStatusText.textContent = 'Aberto';
            if (currentHour >= 21) {
                storeAttentionBar.style.display = 'block';
                storeAttentionBar.querySelector('p').textContent = `⚠️ Fechando em ${22 - currentHour} hora(s) e ${60 - now.getMinutes()} minutos!`;
            } else {
                storeAttentionBar.style.display = 'none';
            }
        } else {
            storeStatusIndicator.className = 'status-indicator closed';
            storeStatusText.textContent = 'Fechado';
            storeAttentionBar.style.display = 'none';
        }
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
            if (searchTerm) {
                // Lógica de busca simples: filtra os produtos já carregados
                const produtosFiltrados = produtos.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));
                exibirProdutos(produtosFiltrados); // Re-renderiza a lista de produtos
                
                // Desativa a categoria ativa
                document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('active'));
                
                // Mostra todos os containers de categoria
                document.querySelectorAll('.category-products').forEach(section => {
                    section.style.display = 'block';
                });
            }
        });
    }

    // --- FUNÇÕES CORE (CARRINHO E SUPABASE) ---

    function adicionarAoCarrinho(produto) {
        if (produto.estoque_atual <= 0) {
            mostrarMensagem(`Desculpe, ${produto.nome} está esgotado.`, 'error');
            return;
        }
        const itemExistente = carrinho.find(item => item.produto.id === produto.id);
        if (itemExistente) {
            if (itemExistente.quantidade < produto.estoque_atual) {
                itemExistente.quantidade += 1;
            } else {
                mostrarMensagem(`Estoque máximo atingido para ${produto.nome} (${produto.estoque_atual} un.)`, 'warning');
                return;
            }
        } else {
            carrinho.push({ produto: produto, quantidade: 1 });
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
    
    function atualizarCarrinho() {
        let total = 0;
        let totalItens = 0; 
            
        if (carrinho.length === 0) {
            carrinhoItens.innerHTML = `<p style="text-align: center; color: #666;">Sua sacola está vazia.</p>`;
            totalCarrinho.textContent = '0,00';
            if (finalizarDiretoBtn) finalizarDiretoBtn.disabled = true; 
        } else {
            carrinhoItens.innerHTML = '';
            carrinho.forEach((item, index) => {
                const itemSubtotal = item.produto.preco_venda * item.quantidade;
                total += itemSubtotal;
                totalItens += item.quantidade; 
                const itemElement = document.createElement('div');
                itemElement.className = 'carrinho-item';
                itemElement.innerHTML = `
                    <div class="carrinho-item-info">
                        <div class="carrinho-item-nome">${item.produto.nome}</div>
                        <div class="carrinho-item-preco">R$ ${item.produto.preco_venda.toFixed(2)}</div>
                    </div>
                    <div class="carrinho-item-controles">
                        <button class="btn-remover" data-index="${index}"><i class="fas fa-minus"></i></button>
                        <span class="carrinho-item-quantidade">${item.quantidade}</span>
                        <button class="btn-adicionar-carrinho" data-index="${index}"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="carrinho-item-subtotal">
                        R$ ${itemSubtotal.toFixed(2)}
                    </div>
                `;
                carrinhoItens.appendChild(itemElement);
            });
            totalCarrinho.textContent = total.toFixed(2).replace('.', ',');
            
            // Verifica se está logado para habilitar botões de finalização
            const isReady = carrinho.length > 0 && clienteLogado; 
            if (finalizarDiretoBtn) finalizarDiretoBtn.disabled = !isReady; 
            
            document.querySelectorAll('.btn-remover').forEach(btn => btn.addEventListener('click', function() {
                removerDoCarrinho(parseInt(this.getAttribute('data-index')));
            }));
            document.querySelectorAll('.btn-adicionar-carrinho').forEach(btn => btn.addEventListener('click', function() {
                aumentarQuantidade(parseInt(this.getAttribute('data-index')));
            }));
        }
        
        // Atualiza os dois contadores de carrinho
        if (carrinhoBadge) { // Badge do menu antigo
            carrinhoBadge.textContent = totalItens;
            carrinhoBadge.style.display = totalItens > 0 ? 'block' : 'none';
        }
        if (cartCountNav) { // Badge do menu novo
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
        document.querySelector('.opcoes-pagamento input[value="Dinheiro"]').checked = true;
        
        document.querySelectorAll('.opcoes-pagamento .pagamento-opcao').forEach(op => op.classList.remove('selected'));
        if (document.querySelector('.opcoes-pagamento .pagamento-opcao')) {
            document.querySelector('.opcoes-pagamento .pagamento-opcao').classList.add('selected');
        }
        
        if (pedidoObservacoes) pedidoObservacoes.value = ''; 
        if (trocoParaInput) trocoParaInput.value = ''; 
    }

    // --- CARREGAMENTO DE DADOS (SUPABASE) ---

    async function carregarCategorias() {
        try {
            // Usando a função do supabase-vendas.js
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
                .select('*, categoria:categorias(nome)')
                .eq('ativo', true) // Apenas produtos ativos
                .order('nome');

            if (error) throw error;
            
            produtos = produtosData || [];
            exibirProdutos(produtos); // Exibe todos por padrão
        } catch (error) {
            mostrarMensagem('Erro ao carregar produtos.', 'error');
        }
    }

    async function carregarMaisPedidos() {
        if (!popularScroll) return;
        popularScroll.innerHTML = '<p>Carregando...</p>';
        try {
            // Lógica de "Mais Pedidos" (ex: 5 mais caros ou mais em estoque)
            // Vou usar os 5 com maior estoque como "destaque"
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
                popularItem.innerHTML = `
                    <img src="https://via.placeholder.com/140x140?text=${produto.nome.substring(0,10)}" alt="${produto.nome}">
                    <h3>${produto.nome}</h3>
                    <p>${formatarMoeda(produto.preco_venda)}</p>
                `;
                // Adiciona o clique para adicionar ao carrinho
                popularItem.addEventListener('click', () => adicionarAoCarrinho(produto));
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
        categoriaTodos.addEventListener('click', () => selecionarCategoria('todos'));
        categoriesScroll.appendChild(categoriaTodos);

        categorias.forEach(categoria => {
            const categoriaBtn = document.createElement('div');
            categoriaBtn.className = `category-item`;
            categoriaBtn.textContent = categoria.nome;
            categoriaBtn.setAttribute('data-id', categoria.id);
            categoriaBtn.addEventListener('click', () => selecionarCategoria(categoria.id));
            categoriesScroll.appendChild(categoriaBtn);
        });
        
        // Adiciona a lógica de navegação/scroll
        setupCategoryNavigationJS();
    }

    // Lógica de clique da categoria (scroll/filtro)
    function setupCategoryNavigationJS() {
        const categoryItems = document.querySelectorAll('.category-item');
        const categorySections = document.querySelectorAll('.category-products');
        const productsSectionEl = document.querySelector('.products-section');
        
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                const categoryName = item.textContent;
                
                categoryItems.forEach(cat => cat.classList.remove('active'));
                item.classList.add('active');
                
                if (categoryName === 'Todos') {
                    categorySections.forEach(section => section.style.display = 'block');
                    productsSectionEl.scrollIntoView({ behavior: 'smooth' });
                    return;
                }
                
                let targetSection = null;
                categorySections.forEach(section => {
                    const title = section.querySelector('.category-title').textContent;
                    if (title === categoryName) {
                        section.style.display = 'block';
                        targetSection = section;
                    } else {
                        section.style.display = 'none';
                    }
                });
                
                if (targetSection) {
                    // Espera a UI atualizar antes de rolar
                    setTimeout(() => {
                        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            });
        });
    }


    // Modificado para aceitar uma lista filtrada (para busca) ou usar a lista global
    function exibirProdutos(listaParaExibir) {
        if (!productsSection) return;
        productsSection.innerHTML = ''; 
        
        const produtosAtivos = listaParaExibir || produtos.filter(p => p.ativo);
        
        // Agrupa por categoria
        const produtosPorCategoria = {};
        produtosAtivos.forEach(produto => {
            const catId = produto.categoria_id || 'sem-categoria';
            const catNome = produto.categoria?.nome || 'Outros';
            
            if (!produtosPorCategoria[catId]) {
                produtosPorCategoria[catId] = {
                    nome: catNome,
                    produtos: []
                };
            }
            produtosPorCategoria[catId].produtos.push(produto);
        });
        
        // Ordena as categorias (opcional, mas bom)
        const categoriasOrdenadas = Object.keys(produtosPorCategoria).sort((a, b) => {
            return produtosPorCategoria[a].nome.localeCompare(produtosPorCategoria[b].nome);
        });

        if (categoriasOrdenadas.length === 0) {
            productsSection.innerHTML = '<p style="padding: 20px; text-align: center;">Nenhum produto encontrado.</p>';
            return;
        }

        // Renderiza cada seção de categoria
        categoriasOrdenadas.forEach(catId => {
            const categoria = produtosPorCategoria[catId];
            
            const categorySectionDiv = document.createElement('div');
            categorySectionDiv.className = 'category-products';
            
            let productListHtml = '';
            categoria.produtos.forEach(produto => {
                const esgotado = produto.estoque_atual <= 0;
                
                productListHtml += `
                    <div class="product-item ${esgotado ? 'out-of-stock' : ''}">
                        <div class="product-info">
                            <h4 class="product-name">${produto.nome}</h4>
                            <p class="product-description">${produto.descricao || 'Sem descrição'}</p>
                            <p class="product-price">${formatarMoeda(produto.preco_venda)}</p>
                        </div>
                        <div class="product-image">
                            <img src="https://via.placeholder.com/90x90?text=${produto.nome.substring(0,3)}" alt="${produto.nome}">
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
        
        // Adiciona os event listeners aos novos botões
        document.querySelectorAll('.add-cart').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const produtoId = e.currentTarget.getAttribute('data-id');
                const produto = produtos.find(p => p.id === produtoId);
                if (produto) {
                    adicionarAoCarrinho(produto);
                }
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
                mostrarMensagem('Sua sessão expirou. Por favor, faça login novamente.', 'error');
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
             mostrarMensagem('🚨 Você precisa estar logado para enviar o pedido. Faça login ou cadastre-se!', 'error');
             return null;
        }
    }

    function validarDados() {
        const dadosCliente = obterDadosCliente();
        const formaPagamentoEl = document.querySelector('.opcoes-pagamento input[name="pagamento"]:checked');

        if (carrinho.length === 0) {
            mostrarMensagem('Sua sacola está vazia!', 'error');
            return null;
        }
        
        if (!dadosCliente) return null;
        
        if (!dadosCliente.nome || !dadosCliente.telefone || !dadosCliente.endereco) {
            mostrarMensagem('Dados do cliente ou endereço incompletos. Verifique o Login/Cadastro.', 'error');
            return null;
        }
        
        const totalPedido = carrinho.reduce((sum, item) => sum + (item.produto.preco_venda * item.quantidade), 0);
        
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
        
        let listaItens = "Itens:\n";
        carrinho.forEach(item => {
            listaItens += `* ${item.quantidade}x ${item.produto.nome} (R$ ${item.produto.preco_venda.toFixed(2)})\n`;
        });
        
        let obsCompleta = dadosCliente.observacoes;
        if (dadosCliente.trocoPara > 0) {
             obsCompleta += `\nTROCO NECESSÁRIO: Sim, para ${formatarMoeda(dadosCliente.trocoPara)}`;
        } else if (formaPagamentoEl.value === 'Dinheiro') {
             obsCompleta += `\nTROCO NECESSÁRIO: Não`;
        }
        // Remove a lista de itens da observação principal, o JS do delivery vai ler do banco
        obsCompleta = listaItens + `\nTotal: R$ ${totalPedido.toFixed(2)}\n\nOBSERVAÇÕES ADICIONAIS:\n` + obsCompleta;


        return {
            ...dadosCliente,
            formaPagamento: formaPagamentoEl.value,
            total: totalPedido,
            observacoes: obsCompleta,
            itens: carrinho.map(item => ({ // Adiciona os itens para salvar no banco
                produto_id: item.produto.id,
                quantidade: item.quantidade,
                preco_unitario: item.produto.preco_venda,
                nome_produto: item.produto.nome // Facilita a exibição no delivery
            }))
        };
    }

    async function buscarClientePorTelefone(telefone) {
        try {
            const { data, error } = await supabase.from('clientes_delivery')
                .select('*')
                .eq('telefone', telefone)
                .single(); // Espera um único resultado
            
            if (error && error.code !== 'PGRST116') throw error; // Ignora erro "nenhuma linha"
            
            return data || null; // Retorna o cliente ou null
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
            mostrarMensagem('Novo cliente detectado! Por favor, complete seu cadastro.', 'info');
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
            return mostrarMensagem('Preencha o Nome e todos os campos de Endereço corretamente.', 'error');
        }
        
        if (!validarAreaEntrega(cep)) {
            return mostrarMensagem('❌ Não entregamos no CEP fornecido. Favor verificar a área de cobertura.', 'error');
        }
        
        btnFinalizarCadastro.disabled = true;
        btnFinalizarCadastro.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';

        try {
            const { data: novoCliente, error } = await supabase.from('clientes_delivery').insert({
                nome: nome,
                telefone: telefone,
                endereco: enderecoCompleto, 
                auth_id: 'guest-' + telefone // ID simples
            }).select().single();

            if (error) {
                if (error.code === '23505') {
                    throw new Error("Este número já está cadastrado. Por favor, use a tela inicial para Entrar.");
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
    
    function logarClienteManual() {
        localStorage.setItem('clienteTelefone', clientePerfil.telefone);
        clienteLogado = { id: clientePerfil.telefone, email: clientePerfil.telefone }; 
        
        authScreen.classList.remove('active');
        mobileNav.style.display = 'flex';
        
        window.alternarView('view-cardapio');
        
        // Ativa o item "Início" no novo menu
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector('.bottom-nav .nav-item[data-view="view-cardapio"]')?.classList.add('active');

        atualizarPerfilUI();
    }
    
    function fazerLogoutApp() {
        localStorage.removeItem('clienteTelefone');
        clienteLogado = null;
        clientePerfil = { nome: null, telefone: null, endereco: null };
        mobileNav.style.display = 'none';
        
        authTelefoneInput.value = '';
        cadastroForm.style.display = 'none';
        document.getElementById('login-form-group').style.display = 'block';

        mostrarMensagem('Sessão encerrada.', 'info');
        window.alternarView('auth-screen');
    }

    async function carregarStatusUltimoPedido() {
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
                     
                     // Tenta extrair itens da observação
                    let listaItens = 'Itens não detalhados';
                    const obsLines = p.observacoes.split('\n');
                    let isItemList = false;
                    for (const line of obsLines) {
                        if (line.includes('Itens:')) {
                            listaItens = ''; // Limpa para começar a adicionar
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

    window.abrirModalDetalhesPedido = function(pedidoId) {
        const pedido = historicoPedidos.find(p => p.id === pedidoId);
        if (!pedido) {
            mostrarMensagem('Detalhes do pedido não encontrados.', 'error');
            return;
        }

        const dataPedido = new Date(pedido.created_at).toLocaleString('pt-BR');
        const status = (pedido.status || 'novo').toUpperCase();
        
        const obsLines = pedido.observacoes.split('\n');
        let itensListHtml = '';
        let obsAdicionais = '';
        let isItemList = false;

        for (let i = 0; i < obsLines.length; i++) {
            const line = obsLines[i];
            if (line.includes('Itens:')) {
                isItemList = true;
                continue;
            }
            if (line.includes('Total:') || line.includes('OBSERVAÇÕES ADICIONAIS:')) {
                isItemList = false;
                if (line.includes('OBSERVAÇÕES ADICIONAIS:')) {
                    obsAdicionais = obsLines.slice(i).join('\n');
                }
                continue;
            }
            if (isItemList && line.trim() !== '') {
                itensListHtml += `<p style="margin: 3px 0; font-size: 0.9rem;">- ${line.replace('*', '').trim()}</p>`;
            }
        }
        
        const cleanedObsAdicionais = obsAdicionais.replace('OBSERVAÇÕES ADICIONAIS:', '').trim();

        detalhesPedidoId.textContent = `#${pedido.id}`;
        detalhesPedidoContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px;">
                <h4 style="margin: 0; font-size: 1.5rem;">${formatarMoeda(pedido.total)}</h4>
                <span class="status-badge-history status-${status}" style="margin-top: 5px;">
                    <i class="fas fa-info-circle"></i> STATUS: ${status}
                </span>
            </div>
            
            <h5 style="border-bottom: 1px dashed #eee; padding-bottom: 5px; margin-top: 15px; font-weight: bold;">Detalhes da Entrega</h5>
            <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Data/Hora:</strong> ${dataPedido}</p>
            <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Cliente:</strong> ${pedido.nome_cliente}</p>
            <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Endereço:</strong> ${pedido.endereco_entrega}</p>
            <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Pagamento:</strong> ${pedido.forma_pagamento}</p>
            
            <h5 style="border-bottom: 1px dashed #eee; padding-bottom: 5px; margin-top: 15px; font-weight: bold;">Itens Solicitados</h5>
            ${itensListHtml || '<p style="font-size: 0.9rem; color: #999;">Nenhum item detalhado.</p>'}
            
            ${cleanedObsAdicionais ? 
                `<h5 style="border-bottom: 1px dashed #eee; padding-bottom: 5px; margin-top: 15px; font-weight: bold;">Observações</h5>
                 <pre style="white-space: pre-wrap; font-size: 0.85rem; color: #555; background: #f9f9f9; padding: 10px; border-radius: 5px;">${cleanedObsAdicionais}</pre>` 
                : ''}
        `;
        modalDetalhesPedido.style.display = 'flex';
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

    async function salvarEdicaoEndereco(e) {
        e.preventDefault();
        const telefone = clientePerfil.telefone;
        const cep = modalCepInput.value.trim();
        const rua = modalRuaInput.value.trim();
        const numero = modalNumeroInput.value.trim();
        const bairro = modalBairroInput.value.trim();
        
        if (!rua || !numero || !bairro || !cep) {
            return mostrarMensagem('Preencha a Rua, Número, Bairro e CEP.', 'error');
        }
        if (!validarAreaEntrega(cep)) {
            return mostrarMensagem('❌ Não entregamos no novo CEP fornecido.', 'error');
        }

        // Busca cidade/estado pelo CEP para endereço completo
        const cepLimpo = cep.replace(/\D/g, '');
        let cidade = '';
        let estado = '';
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();
            if (!data.erro) {
                cidade = data.localidade;
                estado = data.uf;
            }
        } catch (e) { console.warn("Não foi possível buscar cidade/estado do CEP"); }
        
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

    async function finalizarPedidoEEnviarWhatsApp() { 
        const dados = validarDados();
        if (!dados) return;

        mostrarMensagem('Processando pedido...', 'info');
        finalizarDiretoBtn.disabled = true;

        try {
            // 1. Criar o pedido_online (para o painel de delivery)
            const { data: novoPedido, error } = await supabase.from('pedidos_online').insert({
                nome_cliente: dados.nome,
                telefone_cliente: dados.telefone,
                endereco_entrega: dados.endereco,
                forma_pagamento: dados.formaPagamento,
                total: dados.total,
                status: 'novo',
                observacoes: dados.observacoes, // Já contém os itens e observações
                itens_pedido: dados.itens // Salva os itens estruturados (se a coluna existir)
            }).select().single();

            if (error) throw error;
            
            // 2. Atualizar estoque
            for (const item of carrinho) {
                const produtoId = item.produto.id;
                const quantidade = item.quantidade;
                const novoEstoque = item.produto.estoque_atual - quantidade;

                // Usando a função de supabase-vendas.js (se disponível) ou direto
                if (window.vendasSupabase && window.vendasSupabase.actualizarEstoque) {
                     await window.vendasSupabase.actualizarEstoque(produtoId, novoEstoque);
                } else {
                     await supabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', produtoId);
                }
            }

            // 3. ENVIAR MENSAGEM VIA WHATSAPP
            let mensagem = `*PEDIDO ONLINE - DOCE CRIATIVO*\n\n`;
            mensagem += `*Cliente:* ${dados.nome}\n`;
            mensagem += `*Telefone:* ${dados.telefone}\n`;
            mensagem += `*Endereço:* ${dados.endereco}\n`;
            mensagem += `*Pagamento:* ${dados.formaPagamento}\n`;
            mensagem += `*TOTAL:* ${formatarMoeda(dados.total)}\n\n`;
            mensagem += `--- DETALHES ---\n`;
            mensagem += dados.observacoes;

            const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
            window.open(url, '_blank');

            mostrarMensagem('✅ Pedido registrado! Você será redirecionado para o WhatsApp.', 'success');
            limparFormularioECarrinho();
            
            // Recarrega os produtos para atualizar o estoque visualmente
            await carregarProdutos();
            
            window.alternarView('view-inicio');
            carregarStatusUltimoPedido();

        } catch (error) {
            console.error("Erro ao finalizar pedido direto:", error);
            mostrarMensagem(`Erro ao enviar pedido: ${error.message}`, 'error');
        } finally {
            finalizarDiretoBtn.disabled = false;
        }
    }

    // --- FUNÇÕES DE EVENTOS ---

    function configurarEventListeners() {
        if (btnIniciarSessao) btnIniciarSessao.addEventListener('click', iniciarSessao);
        if (cadastroForm) cadastroForm.addEventListener('submit', finalizarCadastro);
        if (logoutBtnApp) logoutBtnApp.addEventListener('click', fazerLogoutApp);
        if (formEditarEndereco) formEditarEndereco.addEventListener('submit', salvarEdicaoEndereco); 
        
        document.getElementById('abrir-modal-editar-endereco')?.addEventListener('click', abrirModalEditarEndereco);
        
        // Listeners do Menu Inferior (Antigo)
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                window.alternarView(item.getAttribute('data-view'));
            });
        });
        
        // Listeners do Menu Inferior (Novo Design)
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                
                const spanText = item.querySelector('span').textContent;
                if (spanText === 'Início') window.alternarView('view-cardapio');
                if (spanText === 'Pedidos') window.alternarView('view-inicio'); // Mapeado para Perfil/Histórico
                if (spanText === 'Promos') window.alternarView('view-promocoes');
                if (spanText === 'Carrinho') window.alternarView('view-carrinho');
            });
        });
        
        // Botão de Finalizar (Tela do Carrinho)
        if (finalizarDiretoBtn) finalizarDiretoBtn.addEventListener('click', finalizarPedidoEEnviarWhatsApp);
        
        // Listener de Endereço (Tela do Carrinho)
        carrinhoEnderecoInput.addEventListener('change', (e) => {
             clientePerfil.endereco = e.target.value.trim();
             carrinhoEnderecoDisplay.textContent = clientePerfil.endereco;
        });
        
        // Listeners de Pagamento (Tela do Carrinho)
        document.querySelectorAll('.opcoes-pagamento .pagamento-opcao').forEach(opcao => {
            opcao.addEventListener('click', () => {
                document.querySelectorAll('.opcoes-pagamento .pagamento-opcao').forEach(op => op.classList.remove('selected'));
                opcao.classList.add('selected');
                opcao.querySelector('input[name="pagamento"]').checked = true;
            });
        });
    }

    // --- Inicialização da Página (IIFE) ---
    
    (async function() {
        try {
            if (!window.vendasSupabase) {
                 throw new Error('Módulo de vendas (supabase-vendas.js) não carregado.');
            }
            
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
                }
            }
            
            if(clienteEncontrado) {
                authScreen.classList.remove('active');
                mobileNav.style.display = 'flex';
                window.alternarView('view-cardapio');
            } else {
                // Força o Login se não houver cliente salvo
                authScreen.classList.add('active');
                mobileNav.style.display = 'none';
            }
            
            // Carrega os dados do cardápio
            await carregarCategorias(); 
            await carregarProdutos(); // Popula a lista principal
            await carregarMaisPedidos(); // Popula o scroll "Mais Pedidos"
            
            // Configura funções do novo design
            updateStoreStatus();
            setupShare();
            setupSearch();
            setInterval(updateStoreStatus, 60000); // Atualiza status da loja

            // Configura listeners do sistema antigo
            configurarEventListeners();
            
            if (clienteEncontrado) {
                atualizarPerfilUI();
            }
            
            atualizarCarrinho(); // Inicializa o contador do carrinho

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            mostrarMensagem('Erro ao carregar o app: ' + error.message, 'error');
            document.getElementById('auth-screen').classList.add('active');
        }
    })();
});