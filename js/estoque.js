// js/estoque.js - Gestão de Estoque
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticação
    if (!window.sistemaAuth || !window.sistemaAuth.requerAutenticacao()) {
        return;
    }

    // Elementos do DOM
    const alertContainer = document.getElementById('alert-container');
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');
    
    // Lista de ícones de confeitaria
    const iconesConfeitaria = [
        { classe: 'fa-cookie', nome: 'Biscoito' },
        { classe: 'fa-birthday-cake', nome: 'Bolo' },
        { classe: 'fa-ice-cream', nome: 'Sorvete' },
        { classe: 'fa-candy-cane', nome: 'Pirulito' },
        { classe: 'fa-mug-hot', nome: 'Chocolate' },
        { classe: 'fa-star', nome: 'Estrela' },
        { classe: 'fa-heart', nome: 'Coração' },
        { classe: 'fa-gem', nome: 'Diamante' },
        { classe: 'fa-cupcake', nome: 'Cupcake' },
        { classe: 'fa-pie', nome: 'Torta' },
        { classe: 'fa-bread-slice', nome: 'Pão' },
        { classe: 'fa-cheese', nome: 'Queijo' },
        { classe: 'fa-apple-alt', nome: 'Maçã' },
        { classe: 'fa-lemon', nome: 'Limão' },
        { classe: 'fa-stroopwafel', nome: 'Waffle' },
        { classe: 'fa-doughnut', nome: 'Donut' },
        { classe: 'fa-croissant', nome: 'Croissant' },
        { classe: 'fa-pizza-slice', nome: 'Pizza' },
        { classe: 'fa-hamburger', nome: 'Hambúrguer' },
        { classe: 'fa-hotdog', nome: 'Hot Dog' },
        { classe: 'fa-cookie-bite', nome: 'Biscoito Mordido' },
        { classe: 'fa-cake-candles', nome: 'Bolo com Velas' },
        { classe: 'fa-muffin', nome: 'Muffin' },
        { classe: 'fa-pastafarianism', nome: 'Macarrão' },
        { classe: 'fa-egg', nome: 'Ovo' },
        { classe: 'fa-fish', nome: 'Peixe' },
        { classe: 'fa-drumstick-bite', nome: 'Frango' },
        { classe: 'fa-carrot', nome: 'Cenoura' },
        { classe: 'fa-pepper-hot', nome: 'Pimenta' },
        { classe: 'fa-seedling', nome: 'Planta' }
    ];

    // Inicializar a aplicação
    inicializarEstoque();

    async function inicializarEstoque() {
        try {
            // Mostrar loading
            if (loadingElement) loadingElement.style.display = 'block';
            if (contentElement) contentElement.style.display = 'none';
            if (errorElement) errorElement.style.display = 'none';

            // Testar conexão
            await testarConexaoSupabase();
            
            // Esconder loading e mostrar conteúdo
            if (loadingElement) loadingElement.style.display = 'none';
            if (contentElement) contentElement.style.display = 'block';

            // Configurar event listeners
            configurarEventListeners();
            
            // Carregar dados iniciais
            await carregarCategorias();
            await carregarListaProdutos();
            await carregarListaCategorias();
            
            // Carregar ícones nos formulários
            carregarIcones();

            console.log('✅ Módulo de estoque inicializado com sucesso!');

        } catch (error) {
            console.error('Erro na inicialização do estoque:', error);
            if (loadingElement) loadingElement.style.display = 'none';
            if (errorElement) {
                errorElement.style.display = 'block';
                errorElement.innerHTML = `
                    <h2>Erro de Conexão</h2>
                    <p>Não foi possível conectar ao banco de dados.</p>
                    <p>Detalhes do erro: ${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Tentar Novamente</button>
                `;
            }
        }
    }

    // Função para testar conexão
    async function testarConexaoSupabase() {
        try {
            const { data, error } = await supabase
                .from('produtos')
                .select('id')
                .limit(1);
                
            if (error) throw error;
            
            return true;
        } catch (error) {
            throw new Error(`Erro Supabase: ${error.message}`);
        }
    }

    function configurarEventListeners() {
        // Tabs
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                switchTab(tabId);
            });
        });

        // Formulários
        const formNovoProduto = document.getElementById('form-novo-produto');
        if (formNovoProduto) {
            formNovoProduto.addEventListener('submit', criarProduto);
        }

        const formEditarProduto = document.getElementById('form-editar-produto');
        if (formEditarProduto) {
            formEditarProduto.addEventListener('submit', salvarEdicaoProduto);
        }

        const formNovaCategoria = document.getElementById('form-nova-categoria');
        if (formNovaCategoria) {
            formNovaCategoria.addEventListener('submit', criarCategoria);
        }

        const formEditarCategoria = document.getElementById('form-editar-categoria');
        if (formEditarCategoria) {
            formEditarCategoria.addEventListener('submit', salvarEdicaoCategoria);
        }

        // Botões
        const novaCategoriaBtn = document.getElementById('nova-categoria-btn');
        if (novaCategoriaBtn) {
            novaCategoriaBtn.addEventListener('click', abrirModalCategoria);
        }

        const adicionarCategoriaBtn = document.getElementById('adicionar-categoria');
        if (adicionarCategoriaBtn) {
            adicionarCategoriaBtn.addEventListener('click', abrirModalCategoria);
        }

        const aplicarFiltroBtn = document.getElementById('aplicar-filtro');
        if (aplicarFiltroBtn) {
            aplicarFiltroBtn.addEventListener('click', carregarListaProdutos);
        }

        // Modais
        const modalProduto = document.getElementById('modal-editar-produto');
        const modalCategoria = document.getElementById('modal-nova-categoria');
        const modalEditarCategoria = document.getElementById('modal-editar-categoria');
        
        // Fechar modais
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', fecharModais);
        });

        document.getElementById('fechar-modal-produto')?.addEventListener('click', fecharModais);
        document.getElementById('fechar-modal-categoria')?.addEventListener('click', fecharModais);
        document.getElementById('fechar-modal-editar-categoria')?.addEventListener('click', fecharModais);

        window.addEventListener('click', (e) => {
            if (e.target === modalProduto || e.target === modalCategoria || e.target === modalEditarCategoria) {
                fecharModais();
            }
        });
    }

    function switchTab(tabId) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
        const activeContent = document.getElementById(tabId);
        
        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    }

    // Função para carregar ícones nos formulários
    function carregarIcones() {
        const iconesGrid = document.getElementById('icones-grid');
        const editarIconesGrid = document.getElementById('editar-icones-grid');
        
        if (iconesGrid) {
            iconesGrid.innerHTML = '';
            iconesConfeitaria.forEach(icone => {
                const iconeElement = criarElementoIcone(icone, 'produto-icone');
                iconesGrid.appendChild(iconeElement);
            });
        }
        
        if (editarIconesGrid) {
            editarIconesGrid.innerHTML = '';
            iconesConfeitaria.forEach(icone => {
                const iconeElement = criarElementoIcone(icone, 'editar-produto-icone');
                editarIconesGrid.appendChild(iconeElement);
            });
        }
    }

    function criarElementoIcone(icone, campoId) {
        const div = document.createElement('div');
        div.className = 'icone-option';
        div.innerHTML = `
            <i class="fas ${icone.classe}"></i>
            <span>${icone.nome}</span>
        `;
        
        div.addEventListener('click', () => {
            // Remover seleção de outros ícones
            document.querySelectorAll(`.${campoId.replace('-', '-')}-container .icone-option`).forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Selecionar este ícone
            div.classList.add('selected');
            document.getElementById(campoId).value = icone.classe;
        });
        
        return div;
    }

    // Funções para Categorias
    async function carregarCategorias() {
        try {
            const { data: categorias, error } = await supabase
                .from('categorias')
                .select('id, nome')
                .eq('ativo', true)
                .order('nome');

            if (error) throw error;

            // Preencher selects de categoria
            const selects = document.querySelectorAll('select[id*="categoria"]');
            selects.forEach(select => {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Selecione uma categoria</option>';
                
                if (categorias) {
                    categorias.forEach(categoria => {
                        const option = document.createElement('option');
                        option.value = categoria.id;
                        option.textContent = categoria.nome;
                        select.appendChild(option);
                    });

                    // Manter o valor atual se existir
                    if (currentValue) {
                        select.value = currentValue;
                    }
                }
            });

            return categorias;
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            throw error;
        }
    }

    async function carregarListaCategorias() {
        const categoriasBody = document.getElementById('categorias-body');
        if (!categoriasBody) return;

        try {
            const { data: categorias, error } = await supabase
                .from('categorias')
                .select(`
                    id,
                    nome,
                    descricao,
                    ativo,
                    produtos:produtos(count)
                `)
                .order('nome');

            if (error) throw error;

            categoriasBody.innerHTML = '';

            if (!categorias || categorias.length === 0) {
                categoriasBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhuma categoria encontrada</td></tr>';
                return;
            }

            categorias.forEach(categoria => {
                const tr = document.createElement('tr');
                
                tr.innerHTML = `
                    <td>${categoria.nome}</td>
                    <td>${categoria.produtos[0]?.count || 0}</td>
                    <td>
                        <span class="status-badge ${categoria.ativo ? 'active' : 'inactive'}">
                            ${categoria.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                    </td>
                    <td>
                        <button class="btn-edit" onclick="editarCategoria('${categoria.id}')">Editar</button>
                        ${categoria.produtos[0]?.count === 0 ? 
                            `<button class="btn-danger" onclick="excluirCategoria('${categoria.id}', '${categoria.nome}')">
                                Excluir
                            </button>` : 
                            '<span style="color: #666; font-size: 12px;">Não pode excluir</span>'
                        }
                    </td>
                `;

                categoriasBody.appendChild(tr);
            });

        } catch (error) {
            console.error('Erro ao carregar lista de categorias:', error);
            categoriasBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #dc3545;">Erro ao carregar categorias</td></tr>';
        }
    }

    async function criarCategoria(e) {
        e.preventDefault();

        const nome = document.getElementById('categoria-nome').value.trim();
        const descricao = document.getElementById('categoria-descricao').value.trim();
        const ativa = document.getElementById('categoria-ativa').checked;

        if (!nome) {
            mostrarMensagem('Preencha o nome da categoria', 'error');
            return;
        }

        try {
            const { data: categoria, error } = await supabase
                .from('categorias')
                .insert({
                    nome: nome,
                    descricao: descricao,
                    ativo: ativa
                })
                .select()
                .single();

            if (error) throw error;

            mostrarMensagem('Categoria criada com sucesso!', 'success');
            document.getElementById('form-nova-categoria').reset();
            fecharModais();
            await carregarCategorias();
            await carregarListaCategorias();

        } catch (error) {
            console.error('Erro ao criar categoria:', error);
            mostrarMensagem('Erro ao criar categoria: ' + error.message, 'error');
        }
    }

    // NOVA FUNÇÃO: Editar categoria
    window.editarCategoria = async function(categoriaId) {
        try {
            const { data: categoria, error } = await supabase
                .from('categorias')
                .select('*')
                .eq('id', categoriaId)
                .single();

            if (error) throw error;

            // Preencher o formulário de edição
            document.getElementById('editar-categoria-id').value = categoria.id;
            document.getElementById('editar-categoria-nome').value = categoria.nome || '';
            document.getElementById('editar-categoria-descricao').value = categoria.descricao || '';
            document.getElementById('editar-categoria-ativa').checked = categoria.ativo;

            // Abrir modal de edição
            document.getElementById('modal-editar-categoria').style.display = 'block';

        } catch (error) {
            console.error('Erro ao carregar categoria para edição:', error);
            mostrarMensagem('Erro ao carregar categoria: ' + error.message, 'error');
        }
    };

    // NOVA FUNÇÃO: Salvar edição da categoria
    window.salvarEdicaoCategoria = async function(e) {
        e.preventDefault();

        const categoriaId = document.getElementById('editar-categoria-id').value;
        const nome = document.getElementById('editar-categoria-nome').value.trim();
        const descricao = document.getElementById('editar-categoria-descricao').value.trim();
        const ativa = document.getElementById('editar-categoria-ativa').checked;

        if (!nome) {
            mostrarMensagem('Preencha o nome da categoria', 'error');
            return;
        }

        try {
            const { error } = await supabase
                .from('categorias')
                .update({
                    nome: nome,
                    descricao: descricao,
                    ativo: ativa
                })
                .eq('id', categoriaId);

            if (error) throw error;

            mostrarMensagem('Categoria atualizada com sucesso!', 'success');
            fecharModais();
            await carregarCategorias();
            await carregarListaCategorias();

        } catch (error) {
            console.error('Erro ao atualizar categoria:', error);
            mostrarMensagem('Erro ao atualizar categoria: ' + error.message, 'error');
        }
    };

    // Funções para Produtos
    async function carregarListaProdutos() {
        const produtosBody = document.getElementById('produtos-body');
        if (!produtosBody) return;

        const filtroCategoria = document.getElementById('filtro-categoria').value;
        const filtroEstoque = document.getElementById('filtro-estoque').value;

        try {
            let query = supabase
                .from('produtos')
                .select(`
                    id,
                    nome,
                    descricao,
                    preco_venda,
                    estoque_atual,
                    estoque_minimo,
                    ativo,
                    icone,
                    categoria:categorias(nome)
                `);

            // Aplicar filtros
            if (filtroCategoria) {
                query = query.eq('categoria_id', filtroCategoria);
            }

            if (filtroEstoque === 'baixo') {
                const { data: produtos, error } = await query.order('nome');
                
                if (error) throw error;

                const produtosFiltrados = produtos.filter(produto => 
                    produto.estoque_atual <= produto.estoque_minimo
                );

                exibirProdutos(produtosBody, produtosFiltrados);
                return;

            } else if (filtroEstoque === 'zerado') {
                query = query.eq('estoque_atual', 0);
            }

            const { data: produtos, error } = await query.order('nome');

            if (error) throw error;

            exibirProdutos(produtosBody, produtos);

        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            produtosBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #dc3545;">Erro ao carregar produtos</td></tr>';
        }
    }

    // Função auxiliar para exibir produtos
    function exibirProdutos(produtosBody, produtos) {
        produtosBody.innerHTML = '';

        if (!produtos || produtos.length === 0) {
            produtosBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhum produto encontrado</td></tr>';
            return;
        }

        produtos.forEach(produto => {
            const tr = document.createElement('tr');
            const statusEstoque = getStatusEstoque(produto.estoque_atual, produto.estoque_minimo);
            
            tr.innerHTML = `
                <td class="icone-tabela"><i class="fas ${produto.icone || 'fa-cube'}"></i></td>
                <td>${produto.nome}</td>
                <td>${produto.categoria?.nome || 'Sem categoria'}</td>
                <td>R$ ${produto.preco_venda ? produto.preco_venda.toFixed(2) : '0.00'}</td>
                <td>${produto.estoque_atual}</td>
                <td>${produto.estoque_minimo}</td>
                <td>
                    <span class="status-badge ${statusEstoque.class}">
                        ${statusEstoque.text}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="editarProduto('${produto.id}')">Editar</button>
                    <button class="btn-${produto.ativo ? 'warning' : 'success'}" 
                        onclick="toggleProduto('${produto.id}', ${produto.ativo})">
                        ${produto.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button class="btn-danger" onclick="excluirProduto('${produto.id}', '${produto.nome}')">
                        Excluir
                    </button>
                </td>
            `;

            produtosBody.appendChild(tr);
        });
    }

    function getStatusEstoque(estoqueAtual, estoqueMinimo) {
        if (estoqueAtual === 0) {
            return { class: 'out-of-stock', text: 'Sem Estoque' };
        } else if (estoqueAtual <= estoqueMinimo) {
            return { class: 'low-stock', text: 'Estoque Baixo' };
        } else {
            return { class: 'active', text: 'Em Estoque' };
        }
    }

    async function criarProduto(e) {
        e.preventDefault();

        const nome = document.getElementById('produto-nome').value.trim();
        const categoriaId = document.getElementById('produto-categoria').value;
        const precoVenda = parseFloat(document.getElementById('produto-preco-venda').value);
        const estoqueAtual = parseInt(document.getElementById('produto-estoque-atual').value);
        const estoqueMinimo = parseInt(document.getElementById('produto-estoque-minimo').value);
        const descricao = document.getElementById('produto-descricao').value.trim();
        const icone = document.getElementById('produto-icone').value;
        const ativo = document.getElementById('produto-ativo').checked;

        // Validações
        if (!nome || !categoriaId || isNaN(precoVenda) || isNaN(estoqueAtual) || isNaN(estoqueMinimo) || !icone) {
            mostrarMensagem('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        if (estoqueMinimo < 0) {
            mostrarMensagem('O estoque mínimo não pode ser negativo', 'error');
            return;
        }

        try {
            const { data: produto, error } = await supabase
                .from('produtos')
                .insert({
                    nome: nome,
                    categoria_id: categoriaId,
                    preco_venda: precoVenda,
                    estoque_atual: estoqueAtual,
                    estoque_minimo: estoqueMinimo,
                    descricao: descricao,
                    icone: icone,
                    ativo: ativo
                })
                .select()
                .single();

            if (error) throw error;

            mostrarMensagem('Produto criado com sucesso!', 'success');
            document.getElementById('form-novo-produto').reset();
            await carregarListaProdutos();
            switchTab('lista-produtos');

        } catch (error) {
            console.error('Erro ao criar produto:', error);
            mostrarMensagem('Erro ao criar produto: ' + error.message, 'error');
        }
    }

    // Funções globais para os botões
    window.editarProduto = async function(produtoId) {
        try {
            const { data: produto, error } = await supabase
                .from('produtos')
                .select('*')
                .eq('id', produtoId)
                .single();

            if (error) throw error;

            // Carregar categorias no modal
            await carregarCategorias();
            
            // Carregar ícones no modal de edição
            carregarIcones();

            document.getElementById('editar-produto-id').value = produto.id;
            document.getElementById('editar-produto-nome').value = produto.nome || '';
            document.getElementById('editar-produto-categoria').value = produto.categoria_id;
            document.getElementById('editar-produto-preco-venda').value = produto.preco_venda;
            document.getElementById('editar-produto-estoque-atual').value = produto.estoque_atual;
            document.getElementById('editar-produto-estoque-minimo').value = produto.estoque_minimo;
            document.getElementById('editar-produto-descricao').value = produto.descricao || '';
            document.getElementById('editar-produto-icone').value = produto.icone || '';
            document.getElementById('editar-produto-ativo').checked = produto.ativo;

            // Selecionar ícone atual
            if (produto.icone) {
                const iconeOption = document.querySelector(`.editar-produto-icone-container .icone-option i.fas.${produto.icone}`)?.closest('.icone-option');
                if (iconeOption) {
                    iconeOption.classList.add('selected');
                }
            }

            document.getElementById('modal-editar-produto').style.display = 'block';

        } catch (error) {
            console.error('Erro ao carregar produto para edição:', error);
            mostrarMensagem('Erro ao carregar produto: ' + error.message, 'error');
        }
    };

    window.salvarEdicaoProduto = async function(e) {
        e.preventDefault();

        const produtoId = document.getElementById('editar-produto-id').value;
        const nome = document.getElementById('editar-produto-nome').value.trim();
        const categoriaId = document.getElementById('editar-produto-categoria').value;
        const precoVenda = parseFloat(document.getElementById('editar-produto-preco-venda').value);
        const estoqueAtual = parseInt(document.getElementById('editar-produto-estoque-atual').value);
        const estoqueMinimo = parseInt(document.getElementById('editar-produto-estoque-minimo').value);
        const descricao = document.getElementById('editar-produto-descricao').value.trim();
        const icone = document.getElementById('editar-produto-icone').value;
        const ativo = document.getElementById('editar-produto-ativo').checked;

        // Validações
        if (!nome || !categoriaId || isNaN(precoVenda) || isNaN(estoqueAtual) || isNaN(estoqueMinimo) || !icone) {
            mostrarMensagem('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        try {
            const { error } = await supabase
                .from('produtos')
                .update({
                    nome: nome,
                    categoria_id: categoriaId,
                    preco_venda: precoVenda,
                    estoque_atual: estoqueAtual,
                    estoque_minimo: estoqueMinimo,
                    descricao: descricao,
                    icone: icone,
                    ativo: ativo
                })
                .eq('id', produtoId);

            if (error) throw error;

            mostrarMensagem('Produto atualizado com sucesso!', 'success');
            fecharModais();
            await carregarListaProdutos();

        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            mostrarMensagem('Erro ao atualizar produto: ' + error.message, 'error');
        }
    };

    window.toggleProduto = async function(produtoId, ativoAtual) {
        if (!confirm(`Tem certeza que deseja ${ativoAtual ? 'desativar' : 'ativar'} este produto?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('produtos')
                .update({ ativo: !ativoAtual })
                .eq('id', produtoId);

            if (error) throw error;

            mostrarMensagem(`Produto ${ativoAtual ? 'desativado' : 'ativado'} com sucesso!`, 'success');
            await carregarListaProdutos();

        } catch (error) {
            console.error('Erro ao alterar status do produto:', error);
            mostrarMensagem('Erro ao alterar status do produto: ' + error.message, 'error');
        }
    };

    // Função: Excluir produto
    window.excluirProduto = async function(produtoId, produtoNome) {
        if (!confirm(`Tem certeza que deseja excluir o produto "${produtoNome}"?\n\nEsta ação não pode ser desfeita!`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('produtos')
                .delete()
                .eq('id', produtoId);

            if (error) throw error;

            mostrarMensagem(`Produto "${produtoNome}" excluído com sucesso!`, 'success');
            await carregarListaProdutos();

        } catch (error) {
            console.error('Erro ao excluir produto:', error);
            mostrarMensagem('Erro ao excluir produto: ' + error.message, 'error');
        }
    };

    // Função: Excluir categoria
    window.excluirCategoria = async function(categoriaId, nome) {
        if (!confirm(`Tem certeza que deseja excluir a categoria "${nome}"?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('categorias')
                .delete()
                .eq('id', categoriaId);

            if (error) throw error;

            mostrarMensagem(`Categoria "${nome}" excluída com sucesso!`, 'success');
            await carregarCategorias();
            await carregarListaCategorias();

        } catch (error) {
            console.error('Erro ao excluir categoria:', error);
            mostrarMensagem('Erro ao excluir categoria: ' + error.message, 'error');
        }
    };

    // Funções auxiliares
    function abrirModalCategoria() {
        document.getElementById('modal-nova-categoria').style.display = 'block';
    }

    function fecharModais() {
        document.getElementById('modal-editar-produto').style.display = 'none';
        document.getElementById('modal-nova-categoria').style.display = 'none';
        document.getElementById('modal-editar-categoria').style.display = 'none';
    }

    function mostrarMensagem(mensagem, tipo) {
        if (!alertContainer) return;
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-message alert-${tipo}`;
        alertDiv.innerHTML = `
            ${mensagem}
            <button class="close-alert">&times;</button>
        `;

        alertContainer.innerHTML = '';
        alertContainer.appendChild(alertDiv);

        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);

        // Fechar manualmente
        alertDiv.querySelector('.close-alert').addEventListener('click', () => {
            alertDiv.remove();
        });
    }

    // Exportar funções para uso global
    window.fecharModais = fecharModais;
    window.mostrarMensagem = mostrarMensagem;

    // js/estoque.js - ADICIONAR NO FINAL

// Configurar logout
function configurarLogoutEstoque() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Deseja realmente sair do sistema?')) {
                if (window.sistemaAuth) {
                    window.sistemaAuth.fazerLogout();
                } else {
                    window.fazerLogoutGlobal();
                }
            }
        });
    }
}

// Chamar quando o DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    configurarLogoutEstoque();
});
});