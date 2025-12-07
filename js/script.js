/*
* SCRIPT HÍBRIDO CORRIGIDO
*/
document.addEventListener('DOMContentLoaded', function() {
    
    // Elementos do DOM
    const alertContainer = document.getElementById('alert-container');
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');

    if (typeof supabaseClient === 'undefined') {
        console.error("ERRO: supabase-client.js não foi carregado.");
        alert("Erro fatal: O cliente Supabase não foi encontrado.");
        return;
    }
    
    // Inicializar a aplicação
    inicializarEstoque();

    async function inicializarEstoque() {
        try {
            if (loadingElement) loadingElement.style.display = 'block';
            if (contentElement) contentElement.style.display = 'none';
            if (errorElement) errorElement.style.display = 'none';

            // Teste leve de conexão
            const { error } = await supabaseClient.from('categorias').select('id').limit(1);
            if (error) throw error;
            
            if (loadingElement) loadingElement.style.display = 'none';
            if (contentElement) contentElement.style.display = 'block';

            configurarEventListeners();
            
            await carregarCategorias();
            await carregarListaProdutos(); 
            
            console.log('✅ Módulo de estoque inicializado com sucesso!');

        } catch (error) {
            console.error('Erro na inicialização do estoque:', error);
            if (loadingElement) loadingElement.style.display = 'none';
            if (errorElement) {
                errorElement.style.display = 'block';
                errorElement.innerHTML = `<h2>Erro de Conexão</h2><p>Não foi possível conectar ao banco de dados.</p><p>Detalhes: ${error.message}</p>`;
            }
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
        document.getElementById('form-novo-produto')?.addEventListener('submit', criarProduto);
        document.getElementById('form-editar-produto')?.addEventListener('submit', salvarEdicaoProduto);
        document.getElementById('form-nova-categoria')?.addEventListener('submit', criarCategoria);
        document.getElementById('form-editar-categoria')?.addEventListener('submit', salvarEdicaoCategoria);

        // Botões
        document.getElementById('nova-categoria-btn')?.addEventListener('click', abrirModalCategoria);
        document.getElementById('adicionar-categoria')?.addEventListener('click', abrirModalCategoria);
        document.getElementById('aplicar-filtro')?.addEventListener('click', carregarListaProdutos);

        // Modais
        const modais = document.querySelectorAll('.modal');
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', fecharModais);
        });
        document.getElementById('fechar-modal-produto')?.addEventListener('click', fecharModais);
        document.getElementById('fechar-modal-categoria')?.addEventListener('click', fecharModais);
        document.getElementById('fechar-modal-editar-categoria')?.addEventListener('click', fecharModais);
        window.addEventListener('click', (e) => {
            modais.forEach(modal => {
                if (e.target === modal) fecharModais();
            });
        });

        // Preview de Imagem
        document.getElementById('foto')?.addEventListener('change', (e) => previewImage(e, 'previewImage'));
        document.getElementById('foto-editar')?.addEventListener('change', (e) => previewImage(e, 'previewImage-editar'));
    }

    function switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
        const activeContent = document.getElementById(tabId);
        
        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');
    }

    function previewImage(event, previewElementId) {
        const file = event.target.files[0];
        const preview = document.getElementById(previewElementId);
        
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else {
            preview.src = '';
            preview.style.display = 'none';
        }
    }

    let categoriasCache = [];
    let produtosCache = [];

    async function carregarCategorias() {
        try {
            const { data, error } = await supabaseClient
                .from('categorias')
                .select('id, nome')
                .eq('ativo', true)
                .order('nome');
            if (error) throw error;
            
            categoriasCache = data; 

            const selects = document.querySelectorAll('select[id*="-categoria"]');
            selects.forEach(select => {
                const currentValue = select.value;
                select.innerHTML = ''; 
                
                if (select.id === 'filtro-categoria') {
                    select.innerHTML = '<option value="">Todas as categorias</option>';
                } else {
                    select.innerHTML = '<option value="">Selecione uma categoria</option>';
                }
                
                categoriasCache.forEach(categoria => {
                    const option = document.createElement('option');
                    option.value = categoria.id;
                    option.textContent = categoria.nome;
                    select.appendChild(option);
                });
                select.value = currentValue; 
            });

        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            mostrarMensagem('Erro ao carregar categorias: ' + error.message, 'error');
        }
    }

    async function carregarListaCategorias() {
        const categoriasBody = document.getElementById('categorias-body');
        if (!categoriasBody) return;

        try {
            const { data: categorias, error } = await supabaseClient
                .from('categorias')
                .select('id, nome, descricao, ativo')
                .order('nome');
            if (error) throw error;

            categoriasBody.innerHTML = '';
            if (!categorias || categorias.length === 0) {
                categoriasBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhuma categoria encontrada</td></tr>';
                return;
            }

            categorias.forEach(categoria => {
                const tr = document.createElement('tr');
                const qtdProdutos = produtosCache.filter(p => p.categoria_id === categoria.id).length;
                
                tr.innerHTML = `
                    <td>${categoria.nome}</td>
                    <td>${qtdProdutos}</td>
                    <td>
                        <span class="status-badge ${categoria.ativo ? 'categoria-active' : 'inactive'}">
                            ${categoria.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                    </td>
                    <td>
                        <button class="btn-edit" onclick="window.editarCategoria('${categoria.id}')">Editar</button>
                        <button class="btn-danger" onclick="window.excluirCategoria('${categoria.id}', '${categoria.nome}', ${qtdProdutos})">Excluir</button>
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
            const { error } = await supabaseClient
                .from('categorias')
                .insert({ nome: nome, descricao: descricao, ativo: ativa });
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

    window.editarCategoria = async function(categoriaId) {
        try {
            const { data: categoria, error } = await supabaseClient
                .from('categorias')
                .select('*')
                .eq('id', categoriaId)
                .single();
            if (error) throw error;

            document.getElementById('editar-categoria-id').value = categoria.id;
            document.getElementById('editar-categoria-nome').value = categoria.nome || '';
            document.getElementById('editar-categoria-descricao').value = categoria.descricao || '';
            document.getElementById('editar-categoria-ativa').checked = categoria.ativo;

            document.getElementById('modal-editar-categoria').style.display = 'block';

        } catch (error) {
            mostrarMensagem('Erro ao carregar categoria: ' + error.message, 'error');
        }
    };

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
            const { error } = await supabaseClient
                .from('categorias')
                .update({ nome: nome, descricao: descricao, ativo: ativa })
                .eq('id', categoriaId);
            if (error) throw error;

            mostrarMensagem('Categoria atualizada com sucesso!', 'success');
            fecharModais();
            await carregarCategorias();
            await carregarListaProdutos(); 
            await carregarListaCategorias();

        } catch (error) {
            mostrarMensagem('Erro ao atualizar categoria: ' + error.message, 'error');
        }
    };

    window.excluirCategoria = async function(categoriaId, nome, qtdProdutos) {
        if (qtdProdutos > 0) {
            alert(`Não é possível excluir a categoria "${nome}" pois ela contém ${qtdProdutos} produto(s) associado(s).`);
            return;
        }
        if (!confirm(`Tem certeza que deseja excluir a categoria "${nome}"?`)) {
            return;
        }
        try {
            const { error } = await supabaseClient
                .from('categorias')
                .delete()
                .eq('id', categoriaId);
            if (error) throw error;

            mostrarMensagem(`Categoria "${nome}" excluída com sucesso!`, 'success');
            await carregarCategorias();
            await carregarListaCategorias();
        } catch (error) {
            mostrarMensagem('Erro ao excluir categoria: ' + error.message, 'error');
        }
    };


    // --- Funções de Produtos ---

    async function carregarListaProdutos() {
        const produtosBody = document.getElementById('produtos-body');
        if (!produtosBody) return;
        produtosBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Carregando produtos...</td></tr>';

        const filtroCategoria = document.getElementById('filtro-categoria').value;
        const filtroEstoque = document.getElementById('filtro-estoque').value;

        try {
            // *** CORREÇÃO CRÍTICA DO ERRO 500 ***
            // Removemos 'icone' e '*' da consulta. 
            // Agora trazemos apenas os campos de texto leves.
            let query = supabaseClient
                .from('produtos')
                .select('id, nome, descricao, preco_venda, estoque_atual, estoque_minimo, ativo, categoria_id') 
                .order('created_at', { ascending: false });

            if (filtroCategoria) {
                query = query.eq('categoria_id', filtroCategoria);
            }
            if (filtroEstoque === 'zerado') {
                query = query.eq('estoque_atual', 0);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Adicionar nome da categoria
            data.forEach(produto => {
                const categoria = categoriasCache.find(cat => cat.id === produto.categoria_id);
                produto.nome_categoria = categoria ? categoria.nome : 'Sem Categoria';
            });
            
            let produtosFiltrados = data;
            if (filtroEstoque === 'baixo') {
                produtosFiltrados = data.filter(p => p.estoque_atual <= p.estoque_minimo);
            }
            
            produtosCache = produtosFiltrados; 
            exibirProdutos(produtosBody, produtosFiltrados);
            
            await carregarListaCategorias();

        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            produtosBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #dc3545;">Erro ao carregar produtos (Timeout)</td></tr>';
        }
    }

    function exibirProdutos(produtosBody, produtos) {
        produtosBody.innerHTML = '';

        if (!produtos || produtos.length === 0) {
            produtosBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nenhum produto encontrado</td></tr>';
            return;
        }

        produtos.forEach(produto => {
            const tr = document.createElement('tr');
            
            const estoqueAtual = produto.estoque_atual || 0;
            const estoqueMinimo = produto.estoque_minimo || 0;
            let statusEstoque = { class: 'active', text: 'Em Estoque' };
            if (estoqueAtual === 0) {
                statusEstoque = { class: 'out-of-stock', text: 'Sem Estoque' };
            } else if (estoqueAtual <= estoqueMinimo) {
                statusEstoque = { class: 'low-stock', text: 'Estoque Baixo' };
            }

            // Como removemos o 'icone' da listagem para não travar, mostramos placeholder
            // A imagem real (link) aparecerá apenas se você editar o produto
            let displayIcone;
            if (produto.icone && (produto.icone.startsWith('http') || produto.icone.startsWith('data:image'))) {
                displayIcone = `<img src="${produto.icone}" alt="${produto.nome}" class="produto-imagem-tabela">`;
            } else {
                displayIcone = `<div class="produto-imagem-tabela-placeholder"><i class="fas fa-image"></i></div>`;
            }

            const preco = produto.preco_venda ? produto.preco_venda.toFixed(2) : '0.00';

            tr.innerHTML = `
                <td>${displayIcone}</td>
                <td>${produto.nome}</td>
                <td>${produto.nome_categoria || 'Sem categoria'}</td>
                <td>R$ ${preco}</td>
                <td>${estoqueAtual}</td>
                <td>${estoqueMinimo}</td>
                <td>
                    <span class="status-badge ${statusEstoque.class}">
                        ${statusEstoque.text}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="window.editarProduto('${produto.id}')">Editar</button>
                    <button class="btn-${produto.ativo ? 'warning' : 'success'}" 
                        onclick="window.toggleProduto('${produto.id}', ${produto.ativo})">
                        ${produto.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button class="btn-danger" onclick="window.excluirProduto('${produto.id}', '${produto.nome}')">
                        Excluir
                    </button>
                </td>
            `;
            produtosBody.appendChild(tr);
        });
    }

    // --- Lógica de Salvar ---
    async function criarProduto(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('foto');
        
        const produto = {
            nome: document.getElementById('produto-nome').value.trim(),
            categoria_id: document.getElementById('produto-categoria').value,
            preco_venda: parseFloat(document.getElementById('produto-preco-venda').value),
            estoque_atual: parseInt(document.getElementById('produto-estoque-atual').value) || 0,
            estoque_minimo: parseInt(document.getElementById('produto-estoque-minimo').value) || 0,
            descricao: document.getElementById('produto-descricao').value.trim(),
            ativo: document.getElementById('produto-ativo').checked,
            icone: null 
        };

        if (!produto.nome || !produto.categoria_id || isNaN(produto.preco_venda)) {
            mostrarMensagem('Preencha todos os campos obrigatórios (*)', 'error');
            return;
        }

        try {
            // Upload da imagem
            if (fileInput.files[0]) {
                try {
                    console.log('Enviando imagem para o Storage...');
                    // Chama a nova função global uploadImagem
                    produto.icone = await uploadImagem(fileInput.files[0]);
                    console.log('✅ Imagem enviada.');
                } catch (uploadError) {
                    console.error('Erro no upload:', uploadError);
                    mostrarMensagem('Erro ao enviar imagem: ' + uploadError.message, 'error');
                    return; 
                }
            }

            const { error } = await supabaseClient
                .from('produtos')
                .insert(produto);
            if (error) throw error;

            mostrarMensagem('Produto criado com sucesso!', 'success');
            document.getElementById('form-novo-produto').reset();
            document.getElementById('previewImage').style.display = 'none'; 
            
            await carregarListaProdutos(); 
            switchTab('lista-produtos'); 

        } catch (error) {
            console.error('Erro ao criar produto:', error);
            mostrarMensagem('Erro ao criar produto: ' + error.message, 'error');
        }
    }

    window.editarProduto = async function(produtoId) {
        try {
            // No editar, precisamos do ícone, então buscamos individualmente com select('*')
            // Como é apenas 1 registro, não causa timeout
            const { data: produto, error } = await supabaseClient
                .from('produtos')
                .select('*')
                .eq('id', produtoId)
                .single();
            if (error) throw error;

            document.getElementById('editar-produto-id').value = produto.id;
            document.getElementById('editar-produto-nome').value = produto.nome || '';
            document.getElementById('editar-produto-categoria').value = produto.categoria_id;
            document.getElementById('editar-produto-preco-venda').value = produto.preco_venda;
            document.getElementById('editar-produto-estoque-atual').value = produto.estoque_atual || 0;
            document.getElementById('editar-produto-estoque-minimo').value = produto.estoque_minimo || 0;
            document.getElementById('editar-produto-descricao').value = produto.descricao || '';
            document.getElementById('editar-produto-ativo').checked = produto.ativo;

            const previewEditar = document.getElementById('previewImage-editar');
            document.getElementById('editar-icone-atual').value = produto.icone || ''; 
            document.getElementById('foto-editar').value = ''; 

            if (produto.icone) {
                previewEditar.src = produto.icone;
                previewEditar.style.display = 'block';
            } else {
                previewEditar.src = '';
                previewEditar.style.display = 'none';
            }

            document.getElementById('modal-editar-produto').style.display = 'block';

        } catch (error) {
            console.error('Erro ao carregar produto para edição:', error);
            mostrarMensagem('Erro ao carregar produto: ' + error.message, 'error');
        }
    };

    async function salvarEdicaoProduto(e) {
        e.preventDefault();

        const produtoId = document.getElementById('editar-produto-id').value;
        const fileInput = document.getElementById('foto-editar');
        
        const updateObj = {
            nome: document.getElementById('editar-produto-nome').value.trim(),
            categoria_id: document.getElementById('editar-produto-categoria').value,
            preco_venda: parseFloat(document.getElementById('editar-produto-preco-venda').value),
            estoque_atual: parseInt(document.getElementById('editar-produto-estoque-atual').value) || 0,
            estoque_minimo: parseInt(document.getElementById('editar-produto-estoque-minimo').value) || 0,
            descricao: document.getElementById('editar-produto-descricao').value.trim(),
            ativo: document.getElementById('editar-produto-ativo').checked,
            icone: document.getElementById('editar-icone-atual').value 
        };

        if (!updateObj.nome || !updateObj.categoria_id || isNaN(updateObj.preco_venda)) {
            mostrarMensagem('Preencha todos os campos obrigatórios (*)', 'error');
            return;
        }

        try {
            // Upload nova imagem (Storage)
            if (fileInput.files[0]) { 
                try {
                    console.log('Enviando nova imagem...');
                    updateObj.icone = await uploadImagem(fileInput.files[0]);
                    console.log('✅ Nova imagem enviada');
                } catch (uploadError) {
                    mostrarMensagem('Erro ao processar nova imagem: ' + uploadError.message, 'error');
                    return;
                }
            }

            const { error } = await supabaseClient
                .from('produtos')
                .update(updateObj)
                .eq('id', produtoId);
            if (error) throw error;

            mostrarMensagem('Produto atualizado com sucesso!', 'success');
            fecharModais();
            await carregarListaProdutos(); 

        } catch (error) {
            console.error('Erro ao atualizar produto:', error);
            mostrarMensagem('Erro ao atualizar produto: ' + error.message, 'error');
        }
    }

    window.toggleProduto = async function(produtoId, ativoAtual) {
        const acao = ativoAtual ? 'desativar' : 'ativar';
        if (!confirm(`Tem certeza que deseja ${acao} este produto?`)) {
            return;
        }
        try {
            const { error } = await supabaseClient
                .from('produtos')
                .update({ ativo: !ativoAtual })
                .eq('id', produtoId);
            if (error) throw error;

            mostrarMensagem(`Produto ${acao} com sucesso!`, 'success');
            await carregarListaProdutos();
        } catch (error) {
            mostrarMensagem(`Erro ao ${acao} produto: ${error.message}`, 'error');
        }
    };

    window.excluirProduto = async function(produtoId, produtoNome) {
        if (!confirm(`Tem certeza que deseja excluir o produto "${produtoNome}"?\n\nEsta ação não pode ser desfeita!`)) {
            return;
        }
        try {
            const { error } = await supabaseClient
                .from('produtos')
                .delete()
                .eq('id', produtoId);
            if (error) throw error;

            mostrarMensagem(`Produto "${produtoNome}" excluído com sucesso!`, 'success');
            await carregarListaProdutos();
        } catch (error) {
            mostrarMensagem('Erro ao excluir produto: ' + error.message, 'error');
        }
    };

    // --- Funções Auxiliares ---
    function abrirModalCategoria() {
        document.getElementById('form-nova-categoria').reset();
        document.getElementById('modal-nova-categoria').style.display = 'block';
    }

    function fecharModais() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    function mostrarMensagem(mensagem, tipo) {
        if (!alertContainer) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-message alert-${tipo}`;
        alertDiv.innerHTML = `${mensagem} <button class="close-alert">&times;</button>`;
        
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alertDiv);

        const timeout = setTimeout(() => {
            alertDiv.remove();
        }, 5000);

        alertDiv.querySelector('.close-alert').addEventListener('click', () => {
            alertDiv.remove();
            clearTimeout(timeout);
        });
    }

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Deseja realmente sair do sistema?')) {
            window.sistemaAuth.fazerLogout();
        }
    });

    window.editarProduto = editarProduto;
    window.toggleProduto = toggleProduto;
    window.excluirProduto = excluirProduto;
    window.editarCategoria = editarCategoria;
    window.excluirCategoria = excluirCategoria;

});