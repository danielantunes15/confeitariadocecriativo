// js/cardapio.js - Cardápio Otimizado (Busca Local + Lazy Load)

(function() {

    /**
     * Carrega categorias, produtos e destaques.
     * Inclui um "Skeleton Loading" para melhorar a percepção de performance.
     */
    async function carregarDadosCardapio() {
        try {
            // Skeleton Loading antes de carregar
            exibirSkeletonLoading();

            const [categoriasData, produtosData, maisPedidosData] = await Promise.all([
                window.AppAPI.carregarCategorias(),
                window.AppAPI.carregarProdutos(),
                window.AppAPI.carregarMaisPedidos()
            ]);
            
            window.app.categorias = categoriasData;
            window.app.produtos = produtosData; // Cache local para busca rápida
            
            exibirCategorias();
            exibirProdutos(window.app.produtos); // Renderiza tudo inicial
            exibirMaisPedidos(maisPedidosData);

        } catch (error) {
            window.AppUI.mostrarMensagem('Erro ao carregar o cardápio: ' + error.message, 'error');
        }
    }

    /**
     * Exibe "esqueletos" (placeholders animados) enquanto os produtos carregam.
     */
    function exibirSkeletonLoading() {
        const container = window.AppUI.elementos.productsSection;
        if(!container) return;
        
        let skeletons = '<div class="category-products"><h3 class="category-title skeleton-text" style="width: 40%;"></h3><div class="products-list">';
        for(let i=0; i<4; i++) {
            skeletons += '<div class="product-item skeleton-item"></div>';
        }
        skeletons += '</div></div>';
        container.innerHTML = skeletons;
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
     * Configura a navegação por clique nas categorias.
     */
    function setupCategoryNavigationJS() {
        const categoryItems = document.querySelectorAll('.category-item');
        const productsSectionEl = window.AppUI.elementos.productsSection;
        
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                const categoryId = item.getAttribute('data-id');
                categoryItems.forEach(c => c.classList.remove('active'));
                item.classList.add('active');
                
                const categorySections = document.querySelectorAll('.category-products');

                if (categoryId === 'todos') {
                    categorySections.forEach(section => section.style.display = 'block');
                    window.scrollTo({ top: productsSectionEl.offsetTop - 150, behavior: 'smooth' });
                    return;
                }
                
                categorySections.forEach(section => section.style.display = 'none');
                const targetSection = document.getElementById(`category-section-${categoryId}`);
                
                if (targetSection) {
                    targetSection.style.display = 'block';
                    const headerHeight = 130; 
                    const elementPosition = targetSection.getBoundingClientRect().top + window.scrollY;
                    const offsetPosition = elementPosition - headerHeight;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
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
             container.innerHTML = '<p style="padding: 10px; font-size: 0.8rem; color: #888;">Em breve.</p>';
             return;
        }

        destaques.forEach(produto => {
            const item = document.createElement('div');
            item.className = 'popular-item';
            const imgTag = produto.icone
                ? `<img src="${produto.icone}" alt="${produto.nome}" loading="lazy">`
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
     * Realiza a busca de produtos em TEMPO REAL (Client-Side).
     * Filtra o array local `window.app.produtos` para máxima performance.
     */
    function setupSearch() {
        const elementos = window.AppUI.elementos;
        const searchTerm = elementos.headerSearchInput.value.trim().toLowerCase(); 

        // Filtra o array local (muito mais rápido que ir ao servidor)
        if (searchTerm.length === 0) {
            // Se limpou a busca, mostra tudo
            exibirProdutos(window.app.produtos);
            // Reseta categorias
            document.querySelectorAll('.category-item').forEach(c => c.classList.remove('active'));
            document.querySelector('.category-item[data-id="todos"]').classList.add('active');
            return;
        }

        const produtosFiltrados = window.app.produtos.filter(p => 
            p.nome.toLowerCase().includes(searchTerm)
        );
        
        exibirProdutos(produtosFiltrados);
    }

    /**
     * Renderiza a lista principal de produtos, agrupados por categoria.
     */
    function exibirProdutos(listaParaExibir) {
        const container = window.AppUI.elementos.productsSection;
        if (!container) return;
        container.innerHTML = ''; 
        
        const produtosAtivos = listaParaExibir || window.app.produtos.filter(p => p.ativo);
        
        // Agrupa por categoria
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
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cookie-bite"></i>
                    <p>Nenhum produto encontrado com este nome.</p>
                </div>`;
            return;
        }

        categoriasOrdenadas.forEach(categoria => {
            const categorySectionDiv = document.createElement('div');
            categorySectionDiv.className = 'category-products';
            categorySectionDiv.id = `category-section-${categoria.id}`;
            
            let productListHtml = '';
            categoria.produtos.forEach(produto => {
                const esgotado = produto.estoque_atual <= 0;
                // LAZY LOADING ADICIONADO AQUI (loading="lazy")
                const imgTag = produto.icone
                    ? `<img src="${produto.icone}" alt="${produto.nome}" loading="lazy">`
                    : `<div class="product-image-placeholder"><i class="fas fa-cube"></i></div>`;
                
                productListHtml += `
                    <div class="product-item ${esgotado ? 'out-of-stock' : ''}" data-id="${produto.id}">
                        <div class="product-info">
                            <h4 class="product-name">${produto.nome}</h4>
                            <p class="product-description">${produto.descricao || ''}</p>
                            <p class="product-price">${window.AppUI.formatarMoeda(produto.preco_venda)}</p>
                        </div>
                        <div class="product-image">
                            ${imgTag}
                            <button class="add-cart" data-id="${produto.id}" ${esgotado ? 'disabled' : ''}>
                                ${esgotado ? '<i class="fas fa-times"></i>' : '<i class="fas fa-plus"></i>'}
                            </button>
                        </div>
                    </div>
                `;
            });

            categorySectionDiv.innerHTML = `
                <h3 class="category-title">${categoria.nome}</h3>
                <div class="products-list">${productListHtml}</div>
            `;
            container.appendChild(categorySectionDiv);
        });
        
        // Listeners para clique no produto e botão adicionar
        container.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const produtoId = e.currentTarget.getAttribute('data-id');
                const produto = window.app.produtos.find(p => p.id === produtoId);
                if (!produto) return;

                if (e.target.closest('.add-cart')) {
                    e.stopPropagation();
                    window.app.Carrinho.adicionarAoCarrinho(produto);
                } else if (produto.estoque_atual > 0) {
                    abrirModalOpcoes(produto);
                }
            });
        });

        setupCategoryScrollSpy();
    }
    
    // --- Funções do Modal de Opções ---

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
            // Caso falhe (tabelas não existem), apenas mostra o modal básico
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
     * Scroll Spy: Atualiza a categoria ativa conforme o usuário rola a tela.
     */
    function setupCategoryScrollSpy() {
        const scrollContainer = window;
        const categorySections = document.querySelectorAll('.category-products');
        const categoryItems = document.querySelectorAll('.category-item');
        const topOffset = 150; 

        scrollContainer.addEventListener('scroll', () => {
            let currentCategoryId = null;
            for (let i = 0; i < categorySections.length; i++) {
                const section = categorySections[i];
                const rect = section.getBoundingClientRect();
                if (section.style.display !== 'none' && rect.top <= topOffset) {
                    currentCategoryId = section.id.replace('category-section-', '');
                }
            }
            if (!currentCategoryId) currentCategoryId = 'todos';

            categoryItems.forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-id') === currentCategoryId);
            });
        });
    }

    // Exporta o módulo
    window.AppCardapio = {
        carregarDadosCardapio,
        updateStoreStatus,
        setupSearch,
        exibirCategorias,
        exibirProdutos,
        exibirMaisPedidos,
        abrirModalOpcoes,
        calcularPrecoModal,
        adicionarItemComOpcoes,
        aumentarQtdModal,
        diminuirQtdModal
    };

})();