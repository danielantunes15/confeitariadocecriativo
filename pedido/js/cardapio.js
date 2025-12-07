// js/cardapio.js - Módulo de Cardápio e Opções de Produto (Com Busca no Servidor)

(function() {

    // const ui = window.AppUI; // <-- REMOVIDO
    // const api = window.AppAPI; // <-- REMOVIDO

    /**
     * Carrega categorias, produtos e destaques.
     */
    async function carregarDadosCardapio() {
        try {
            const [categoriasData, produtosData, maisPedidosData] = await Promise.all([
                window.AppAPI.carregarCategorias(),
                window.AppAPI.carregarProdutos(),
                window.AppAPI.carregarMaisPedidos()
            ]);
            
            window.app.categorias = categoriasData;
            window.app.produtos = produtosData;
            
            exibirCategorias();
            exibirProdutos(window.app.produtos);
            exibirMaisPedidos(maisPedidosData);

        } catch (error) {
            window.AppUI.mostrarMensagem('Erro ao carregar o cardápio: ' + error.message, 'error');
        }
    }

    /**
     * Atualiza o status da loja (Aberto/Fechado) com base nos horários do config.
     */
    function updateStoreStatus() {
        const elementos = window.AppUI.elementos;
        if (!elementos.storeStatusIndicator || !elementos.storeStatusText) return;

        const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
        const agora = new Date();
        const diaHoje = diasSemana[agora.getDay()];
        
        const configLoja = window.app.configLoja;
        const abertura = configLoja[`${diaHoje}_abertura`];
        const fechamento = configLoja[`${diaHoje}_fechamento`];
        const fechado = configLoja[`${diaHoje}_fechado`];
        
        let lojaAberta = false;
        let horarioTexto = "Fechado hoje";

        if (fechado) {
            lojaAberta = false;
        } else if (abertura && fechamento) {
            horarioTexto = `Horário: ${abertura} - ${fechamento}`;
            const [horaAbertura, minAbertura] = abertura.split(':').map(Number);
            const [horaFechamento, minFechamento] = fechamento.split(':').map(Number);
            
            const dataAbertura = new Date(); dataAbertura.setHours(horaAbertura, minAbertura, 0);
            const dataFechamento = new Date(); dataFechamento.setHours(horaFechamento, minFechamento, 0);

            if (agora >= dataAbertura && agora < dataFechamento) {
                lojaAberta = true;
                const minutosParaFechar = (dataFechamento - agora) / 60000;
                if (minutosParaFechar <= 60) {
                    elementos.storeAttentionBar.style.display = 'block';
                    elementos.storeAttentionBar.querySelector('p').textContent = `⚠️ Fechando em ${Math.ceil(minutosParaFechar)} minutos!`;
                } else {
                    elementos.storeAttentionBar.style.display = 'none';
                }
            } else {
                elementos.storeAttentionBar.style.display = 'none';
            }
        }

        if (lojaAberta) {
            elementos.storeStatusIndicator.className = 'status-indicator open';
            elementos.storeStatusText.textContent = 'Aberto';
            elementos.storeClosedMessage.style.display = 'none';
        } else {
            elementos.storeStatusIndicator.className = 'status-indicator closed';
            elementos.storeStatusText.textContent = 'Fechado';
            elementos.storeClosedMessage.style.display = 'block';
        }
        
        elementos.storeHoursText.textContent = horarioTexto;
        window.app.Carrinho.atualizarCarrinho();
    }

    /**
     * Renderiza a lista de categorias.
     */
    function exibirCategorias() { 
        const container = window.AppUI.elementos.categoriesScroll;
        if (!container) return;
        container.innerHTML = ''; 
        
        const todos = document.createElement('div');
        todos.className = `category-item active`;
        todos.textContent = 'Todos';
        todos.setAttribute('data-id', 'todos');
        container.appendChild(todos);

        window.app.categorias.forEach(categoria => {
            const btn = document.createElement('div');
            btn.className = `category-item`;
            btn.textContent = categoria.nome;
            btn.setAttribute('data-id', categoria.id);
            container.appendChild(btn);
        });
        
        setupCategoryNavigationJS();
    }

    /**
     * Configura os cliques e o scroll suave das categorias.
     */
    function setupCategoryNavigationJS() {
        const categoryItems = document.querySelectorAll('.category-item');
        const productsSectionEl = window.AppUI.elementos.productsSection;
        
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                const categoryId = item.getAttribute('data-id');
                
                const categorySections = document.querySelectorAll('.category-products');

                if (categoryId === 'todos') {
                    categorySections.forEach(section => section.style.display = 'block');
                    
                    window.scrollTo({
                        top: productsSectionEl.offsetTop - 150, // (Header + Categorias)
                        behavior: 'smooth'
                    });
                    return;
                }
                
                categorySections.forEach(section => section.style.display = 'none');
                const targetSection = document.getElementById(`category-section-${categoryId}`);
                
                if (targetSection) {
                    targetSection.style.display = 'block';
                    
                    const headerHeight = 70; // .header
                    const categoryBarHeight = document.querySelector('.categories-section').offsetHeight || 80;
                    const offset = headerHeight + categoryBarHeight;
                    
                    const elementPosition = targetSection.getBoundingClientRect().top + window.scrollY;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    /**
     * Renderiza a lista de "Mais Pedidos" (Destaques).
     */
    function exibirMaisPedidos(destaques) {
        const container = window.AppUI.elementos.popularScroll;
        if (!container) return;
        container.innerHTML = '';
        
        if (!destaques || destaques.length === 0) {
             container.innerHTML = '<p>Nenhum destaque no momento.</p>';
             return;
        }

        destaques.forEach(produto => {
            const item = document.createElement('div');
            item.className = 'popular-item';
            const imgTag = produto.icone
                ? `<img src="${produto.icone}" alt="${produto.nome}">`
                : `<div class="popular-item-placeholder"><i class="fas fa-cube"></i></div>`;

            item.innerHTML = `
                ${imgTag}
                <h3>${produto.nome}</h3>
                <p>${window.AppUI.formatarMoeda(produto.preco_venda)}</p>
            `;
            item.addEventListener('click', () => abrirModalOpcoes(produto));
            container.appendChild(item);
        });
    }

    /**
     * Realiza a busca de produtos no servidor e atualiza a exibição.
     */
    async function setupSearch() {
        const elementos = window.AppUI.elementos;
        const searchTerm = elementos.headerSearchInput.value.trim(); 

        // Espera pelo menos 2 caracteres para pesquisar, senão retorna a lista completa
        if (searchTerm.length < 2 && searchTerm.length > 0) {
            // Se o usuário digitou 1 caractere, limpa a exibição anterior ou espera
            if (elementos.productsSection) elementos.productsSection.innerHTML = '<p style="padding: 20px; text-align: center;">Digite mais para pesquisar...</p>';
            return;
        }

        try {
            // 1. Busca os produtos no SERVIDOR (usa a nova função)
            const produtosFiltrados = await window.AppAPI.buscarProdutosPorTermo(searchTerm);
            
            // 2. Atualiza o cache global de produtos para que o modal funcione corretamente
            if (!searchTerm) {
                 const todosOsProdutos = await window.AppAPI.carregarProdutos();
                 window.app.produtos = todosOsProdutos;
            } else {
                 window.app.produtos = produtosFiltrados; 
            }
            
            // 3. Exibe os resultados (seja a lista completa ou a filtrada)
            exibirProdutos(produtosFiltrados);
            
            // 4. Atualiza a UI das categorias (ativa "Todos" e mostra todas as seções)
            document.querySelectorAll('.category-item').forEach(cat => cat.classList.remove('active'));
            document.querySelector('.category-item[data-id="todos"]')?.classList.add('active');
            document.querySelectorAll('.category-products').forEach(section => {
                section.style.display = 'block';
            });
            
        } catch (error) {
            console.error("Erro na busca de produtos:", error);
            window.AppUI.mostrarMensagem("Erro ao buscar produtos.", "error");
        }
    }

    /**
     * Renderiza a lista principal de produtos, agrupados por categoria.
     */
    function exibirProdutos(listaParaExibir) {
        const container = window.AppUI.elementos.productsSection;
        if (!container) return;
        container.innerHTML = ''; 
        
        const produtosAtivos = listaParaExibir || window.app.produtos.filter(p => p.ativo);
        
        const produtosPorCategoria = {};
        produtosAtivos.forEach(produto => {
            const catId = produto.categoria_id || 'sem-categoria';
            const categoriaObj = window.app.categorias.find(c => c.id === produto.categoria_id);
            const catNome = categoriaObj?.nome || 'Outros';
            
            if (!produtosPorCategoria[catId]) {
                produtosPorCategoria[catId] = { id: catId, nome: catNome, produtos: [] };
            }
            produtosPorCategoria[catId].produtos.push(produto);
        });
        
        const categoriasOrdenadas = Object.values(produtosPorCategoria).sort((a, b) => a.nome.localeCompare(b.nome));

        if (categoriasOrdenadas.length === 0) {
            container.innerHTML = '<p style="padding: 20px; text-align: center;">Nenhum produto encontrado.</p>';
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
                            <p class="product-price">${window.AppUI.formatarMoeda(produto.preco_venda)}</p>
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
            container.appendChild(categorySectionDiv);
        });
        
        // --- ATUALIZAÇÃO DO EVENT LISTENER: (Adicionar ao Carrinho ou Modal) ---
        container.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const produtoId = e.currentTarget.getAttribute('data-id');
                const produto = window.app.produtos.find(p => p.id === produtoId);
                if (!produto) return;

                if (e.target.classList.contains('add-cart')) {
                    e.stopPropagation();
                    window.app.Carrinho.adicionarAoCarrinho(produto);
                } else if (produto.estoque_atual > 0) {
                    abrirModalOpcoes(produto);
                }
            });
        });

        setupCategoryScrollSpy();
    }
    
    // --- Funções de Modal ---

    async function abrirModalOpcoes(produto) {
        if (produto.estoque_atual <= 0) return;

        window.app.produtoSelecionadoModal = produto;
        window.app.precoBaseModal = produto.preco_venda;
        
        const elementos = window.AppUI.elementos;
        elementos.opcoesTitulo.textContent = produto.nome;
        elementos.opcoesDescricao.textContent = produto.descricao || '';
        
        if (produto.icone) {
            elementos.opcoesImagemProduto.src = produto.icone;
            elementos.opcoesImagemProduto.style.display = 'block';
            elementos.opcoesImagemPlaceholder.style.display = 'none';
        } else {
            elementos.opcoesImagemProduto.src = '';
            elementos.opcoesImagemProduto.style.display = 'none';
            elementos.opcoesImagemPlaceholder.style.display = 'flex';
        }
        
        elementos.opcoesContainer.innerHTML = '';
        elementos.complementosContainer.innerHTML = '';
        elementos.opcoesObservacao.value = '';
        elementos.opcoesQuantidadeValor.textContent = '1';

        window.AppUI.mostrarMensagem('Carregando opções...', 'info');

        try {
            const [gruposOpcoes, complementos] = await Promise.all([
                window.AppAPI.buscarOpcoesProduto(produto.id),
                window.AppAPI.buscarComplementosProduto(produto.id)
            ]);

            if (gruposOpcoes && gruposOpcoes.length > 0) {
                gruposOpcoes.forEach(grupo => {
                    const grupoDiv = document.createElement('div');
                    grupoDiv.className = 'opcoes-grupo';
                    let opcoesHtml = `<h4>${grupo.nome} ${grupo.obrigatorio ? '*' : ''}</h4>`;
                    
                    grupo.opcoes.forEach(opcao => {
                        const precoTexto = opcao.preco_adicional > 0 ? ` (+${window.AppUI.formatarMoeda(opcao.preco_adicional)})` : '';
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
                    elementos.opcoesContainer.appendChild(grupoDiv);
                });
            } else {
                elementos.opcoesContainer.innerHTML = '<p style="font-size:0.9rem; color:#888;">Este item não possui opções de escolha.</p>';
            }

            if (complementos && complementos.length > 0) {
                let complementosHtml = `<div class="opcoes-grupo"><h4>Adicionais (Opcional)</h4>`;
                complementos.forEach(comp => {
                    const precoTexto = comp.preco > 0 ? ` (+${window.AppUI.formatarMoeda(comp.preco)})` : '';
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
                elementos.complementosContainer.innerHTML = complementosHtml;
            }

            elementos.modalOpcoesProduto.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
                input.addEventListener('change', calcularPrecoModal);
            });
            
            calcularPrecoModal();
            elementos.modalOpcoesProduto.style.display = 'flex';

        } catch (error) {
            console.warn(`Aviso: Não foi possível carregar opções para o produto ${produto.id}. ${error.message}`);
            elementos.opcoesContainer.innerHTML = '';
            elementos.complementosContainer.innerHTML = '';
            calcularPrecoModal();
            elementos.modalOpcoesProduto.style.display = 'flex';
        }
    }

    function calcularPrecoModal() {
        let precoCalculado = window.app.precoBaseModal;
        const quantidade = parseInt(window.AppUI.elementos.opcoesQuantidadeValor.textContent);

        window.AppUI.elementos.modalOpcoesProduto.querySelectorAll('input[type="radio"]:checked').forEach(input => {
            precoCalculado += parseFloat(input.dataset.preco || 0);
        });
        window.AppUI.elementos.modalOpcoesProduto.querySelectorAll('input[type="checkbox"]:checked').forEach(input => {
            precoCalculado += parseFloat(input.dataset.preco || 0);
        });
        
        const precoFinal = precoCalculado * quantidade;
        window.AppUI.elementos.opcoesPrecoModal.textContent = window.AppUI.formatarMoeda(precoFinal);
    }
    
    function adicionarItemComOpcoes() {
        const elementos = window.AppUI.elementos;
        const quantidade = parseInt(elementos.opcoesQuantidadeValor.textContent);
        let precoCalculado = window.app.precoBaseModal;
        
        const opcoesSelecionadas = [];
        const complementosSelecionados = [];

        elementos.modalOpcoesProduto.querySelectorAll('input[type="radio"]:checked').forEach(input => {
            precoCalculado += parseFloat(input.dataset.preco || 0);
            opcoesSelecionadas.push({ id: input.value, nome: input.dataset.nome, grupo: input.dataset.grupo, preco: parseFloat(input.dataset.preco || 0) });
        });
        
        elementos.modalOpcoesProduto.querySelectorAll('input[type="checkbox"]:checked').forEach(input => {
            precoCalculado += parseFloat(input.dataset.preco || 0);
            complementosSelecionados.push({ id: input.value, nome: input.dataset.nome, preco: parseFloat(input.dataset.preco || 0) });
        });

        const observacaoItem = elementos.opcoesObservacao.value.trim();
        
        const detalhes = {
            quantidade: quantidade,
            precoFinalItem: precoCalculado,
            opcoes: opcoesSelecionadas,
            complementos: complementosSelecionados,
            observacao: observacaoItem
        };
        
        window.app.Carrinho.adicionarAoCarrinho(window.app.produtoSelecionadoModal, detalhes);
        window.AppUI.fecharModal(elementos.modalOpcoesProduto);
    }
    
    function aumentarQtdModal() {
        let qtd = parseInt(window.AppUI.elementos.opcoesQuantidadeValor.textContent);
        qtd++;
        window.AppUI.elementos.opcoesQuantidadeValor.textContent = qtd;
        calcularPrecoModal();
    }
    
    function diminuirQtdModal() {
        let qtd = parseInt(window.AppUI.elementos.opcoesQuantidadeValor.textContent);
        if (qtd > 1) {
            qtd--;
            window.AppUI.elementos.opcoesQuantidadeValor.textContent = qtd;
            calcularPrecoModal();
        }
    }
    
    /**
     * NOVO: Configura o 'scroll spy' para atualizar a categoria ativa
     * enquanto o usuário rola a lista de produtos.
     */
    function setupCategoryScrollSpy() {
        // Seleciona o container que de fato rola (AGORA É A JANELA)
        const scrollContainer = window;
        if (!scrollContainer) return;

        const categorySections = document.querySelectorAll('.category-products');
        const categoryItems = document.querySelectorAll('.category-item');
        
        // Offset para ativação: Altura do Header (80px) + Altura da Categoria (aprox. 80px)
        const topOffset = 161; // +1 pixel de margem

        scrollContainer.addEventListener('scroll', () => {
            let currentCategoryId = null;

            // Itera pelas seções para ver qual está no topo
            for (let i = 0; i < categorySections.length; i++) {
                const section = categorySections[i];
                const rect = section.getBoundingClientRect();
                
                // Verifica se a seção está visível e próxima ao topo definido pelo offset
                if (section.style.display !== 'none' && rect.top <= topOffset) {
                    currentCategoryId = section.id.replace('category-section-', '');
                }
            }
            
            // Se nenhuma seção estiver no topo (ex: início ou fim da página), 
            // tenta ativar a primeira visível ou 'todos'
            if (!currentCategoryId) {
                const firstVisibleSection = Array.from(categorySections).find(s => s.style.display !== 'none');
                if (firstVisibleSection) {
                     // Se o topo da primeira seção estiver abaixo da linha de ativação
                     // (ou seja, estamos no topo da página), ativa 'todos'.
                     if (firstVisibleSection.getBoundingClientRect().top > topOffset) {
                        currentCategoryId = 'todos';
                     }
                } else {
                    currentCategoryId = 'todos';
                }
            }

            // Atualiza os botões de categoria
            categoryItems.forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-id') === currentCategoryId);
            });
        });
    }


    // Expõe as funções para o objeto global AppCardapio
    window.AppCardapio = {
        carregarDadosCardapio,
        updateStoreStatus,
        setupSearch, // <-- ATUALIZADO
        exibirCategorias,
        exibirProdutos,
        exibirMaisPedidos,
        setupCategoryNavigationJS,
        setupCategoryScrollSpy, 
        abrirModalOpcoes,
        calcularPrecoModal,
        adicionarItemComOpcoes,
        aumentarQtdModal,
        diminuirQtdModal
    };

})();