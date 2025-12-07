/*
* SCRIPT HÍBRIDO:
* Layout e Lógica de Abas/Modais: do 'estoque.js'
* Lógica de Imagem (Base64) e Supabase: do seu 'script.js' e 'supabase-client.js'
*/
document.addEventListener('DOMContentLoaded', function() {
    
    // Elementos do DOM (do estoque.js)
    const alertContainer = document.getElementById('alert-container');
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');

    // Referência ao cliente Supabase (do seu supabase-client.js)
    // Assumindo que supabase-client.js foi carregado antes deste script
    if (typeof supabaseClient === 'undefined') {
        console.error("ERRO: supabase-client.js não foi carregado.");
        alert("Erro fatal: O cliente Supabase não foi encontrado.");
        return;
    }
    
    // Funções do seu supabase-client.js (imageToBase64)
    // (Poderia ser importado, mas vamos embutir para garantir)
    const imageToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    // Inicializar a aplicação
    inicializarEstoque();

    async function inicializarEstoque() {
        try {
            if (loadingElement) loadingElement.style.display = 'block';
            if (contentElement) contentElement.style.display = 'none';
            if (errorElement) errorElement.style.display = 'none';

            // Testar conexão (usando seu supabaseClient)
            const { error } = await supabaseClient.from('produtos').select('id').limit(1);
            if (error) throw error;
            
            if (loadingElement) loadingElement.style.display = 'none';
            if (contentElement) contentElement.style.display = 'block';

            configurarEventListeners();
            
            await carregarCategorias();
            await carregarListaProdutos(); // Carrega produtos (e atualiza contagem de categorias)
            
            console.log('✅ Módulo de estoque híbrido inicializado com sucesso!');

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
        // --- Lógica de Abas (do estoque.js) ---
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                switchTab(tabId);
            });
        });

        // --- Lógica de Formulários (do estoque.js) ---
        document.getElementById('form-novo-produto')?.addEventListener('submit', criarProduto);
        document.getElementById('form-editar-produto')?.addEventListener('submit', salvarEdicaoProduto);
        document.getElementById('form-nova-categoria')?.addEventListener('submit', criarCategoria);
        document.getElementById('form-editar-categoria')?.addEventListener('submit', salvarEdicaoCategoria);

        // --- Lógica de Botões (do estoque.js) ---
        document.getElementById('nova-categoria-btn')?.addEventListener('click', abrirModalCategoria);
        document.getElementById('adicionar-categoria')?.addEventListener('click', abrirModalCategoria);
        document.getElementById('aplicar-filtro')?.addEventListener('click', carregarListaProdutos);

        // --- Lógica de Modais (do estoque.js) ---
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

        // --- Lógica de Preview de Imagem (do seu script.js) ---
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

    // --- Lógica de Imagem (do seu script.js) ---
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

    // --- Funções de Categoria (do estoque.js, usando seu supabaseClient) ---
    let categoriasCache = []; // Cache do seu supabase-client.js
    let produtosCache = []; // Cache dos produtos

    async function carregarCategorias() {
        try {
            const { data, error } = await supabaseClient
                .from('categorias')
                .select('id, nome')
                .eq('ativo', true)
                .order('nome');
            if (error) throw error;
            
            categoriasCache = data; // Salva no cache

            const selects = document.querySelectorAll('select[id*="-categoria"]');
            selects.forEach(select => {
                const currentValue = select.value;
                select.innerHTML = ''; // Limpa
                
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
                select.value = currentValue; // Restaura valor se houver
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
                // Conta produtos no cache
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
            await carregarCategorias(); // Recarrega selects
            await carregarListaCategorias(); // Recarrega tabela de categorias

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
            await carregarListaProdutos(); // Recarregar produtos para atualizar nomes de categoria na tabela
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


    // --- Funções de Produtos (Fusão do 'estoque.js' com seu 'script.js') ---

    async function carregarListaProdutos() {
        const produtosBody = document.getElementById('produtos-body');
        if (!produtosBody) return;
        produtosBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Carregando produtos...</td></tr>';

        const filtroCategoria = document.getElementById('filtro-categoria').value;
        const filtroEstoque = document.getElementById('filtro-estoque').value;

        try {
            // Usando a busca do seu 'supabase-client.js'
            let query = supabaseClient
                .from('produtos')
                .select('*')
                .order('created_at', { ascending: false });

            // Aplicar filtros (do estoque.js)
            if (filtroCategoria) {
                query = query.eq('categoria_id', filtroCategoria);
            }
            if (filtroEstoque === 'zerado') {
                query = query.eq('estoque_atual', 0); // estoque.js usa 'estoque_atual', seu script.js não tinha esse campo
            }

            const { data, error } = await query;
            if (error) throw error;

            // Adicionar nome da categoria (do seu script.js)
            data.forEach(produto => {
                const categoria = categoriasCache.find(cat => cat.id === produto.categoria_id);
                produto.nome_categoria = categoria ? categoria.nome : 'Sem Categoria';
            });
            
            // Filtro de estoque baixo (requer todos os dados, por isso é feito após a busca)
            let produtosFiltrados = data;
            if (filtroEstoque === 'baixo') {
                // 'estoque_minimo' é do estoque.js. Seu script.js não tinha.
                produtosFiltrados = data.filter(p => p.estoque_atual <= p.estoque_minimo);
            }
            
            produtosCache = produtosFiltrados; // Atualiza o cache de produtos
            exibirProdutos(produtosBody, produtosFiltrados);
            
            // Atualiza a contagem na aba de categorias
            await carregarListaCategorias();

        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            produtosBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #dc3545;">Erro ao carregar produtos</td></tr>';
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
            
            // Lógica de Status de Estoque (do estoque.js)
            // Seu script.js original não tinha estoque_minimo, mas o HTML/JS novo tem.
            const estoqueAtual = produto.estoque_atual || 0;
            const estoqueMinimo = produto.estoque_minimo || 0;
            let statusEstoque = { class: 'active', text: 'Em Estoque' };
            if (estoqueAtual === 0) {
                statusEstoque = { class: 'out-of-stock', text: 'Sem Estoque' };
            } else if (estoqueAtual <= estoqueMinimo) {
                statusEstoque = { class: 'low-stock', text: 'Estoque Baixo' };
            }

            // *** MODIFICADO PARA USAR IMAGEM (Base64) EM VEZ DE ÍCONE ***
            const displayIcone = produto.icone 
                ? `<img src="${produto.icone}" alt="${produto.nome}" class="produto-imagem-tabela">`
                : `<div class="produto-imagem-tabela-placeholder">Sem Imagem</div>`;

            // O preço vem do 'preco_venda' (ambos os scripts usam)
            const preco = produto.preco_venda ? produto.preco_venda.toFixed(2) : '0.00';
            
            // O status 'ativo' (ambos os scripts usam)
            const statusAtivo = produto.ativo ? 'Ativo' : 'Inativo'; // Usado nos botões

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

    // --- Lógica de Salvar (Fusão) ---
    async function criarProduto(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('foto');
        
        // Dados do formulário (do estoque.js)
        const produto = {
            nome: document.getElementById('produto-nome').value.trim(),
            categoria_id: document.getElementById('produto-categoria').value,
            preco_venda: parseFloat(document.getElementById('produto-preco-venda').value),
            estoque_atual: parseInt(document.getElementById('produto-estoque-atual').value) || 0,
            estoque_minimo: parseInt(document.getElementById('produto-estoque-minimo').value) || 0,
            descricao: document.getElementById('produto-descricao').value.trim(),
            ativo: document.getElementById('produto-ativo').checked,
            icone: null // Será preenchido pelo upload
        };

        // Validações (do estoque.js)
        if (!produto.nome || !produto.categoria_id || isNaN(produto.preco_venda)) {
            mostrarMensagem('Preencha todos os campos obrigatórios (*)', 'error');
            return;
        }

        try {
            // --- Lógica de Upload (do seu script.js) ---
            if (fileInput.files[0]) {
                try {
                    console.log('Processando imagem...');
                    produto.icone = await imageToBase64(fileInput.files[0]);
                    console.log('✅ Imagem processada e anexada ao produto');
                } catch (uploadError) {
                    console.error('Erro no processamento da imagem:', uploadError);
                    mostrarMensagem('Erro ao processar imagem: ' + uploadError.message, 'error');
                    return; // Para o salvamento se o upload falhar
                }
            }
            // --- Fim da Lógica de Upload ---

            // Inserir no DB (do seu script.js / estoque.js)
            const { error } = await supabaseClient
                .from('produtos')
                .insert(produto);
            if (error) throw error;

            mostrarMensagem('Produto criado com sucesso!', 'success');
            document.getElementById('form-novo-produto').reset();
            document.getElementById('previewImage').style.display = 'none'; // Limpa preview
            
            await carregarListaProdutos(); // Atualiza tabela
            switchTab('lista-produtos'); // Volta para a lista

        } catch (error) {
            console.error('Erro ao criar produto:', error);
            mostrarMensagem('Erro ao criar produto: ' + error.message, 'error');
        }
    }

    window.editarProduto = async function(produtoId) {
        try {
            // Busca o produto (lógica de ambos os scripts)
            const { data: produto, error } = await supabaseClient
                .from('produtos')
                .select('*')
                .eq('id', produtoId)
                .single();
            if (error) throw error;

            // Preenche o formulário (lógica do estoque.js)
            document.getElementById('editar-produto-id').value = produto.id;
            document.getElementById('editar-produto-nome').value = produto.nome || '';
            document.getElementById('editar-produto-categoria').value = produto.categoria_id;
            document.getElementById('editar-produto-preco-venda').value = produto.preco_venda;
            document.getElementById('editar-produto-estoque-atual').value = produto.estoque_atual || 0;
            document.getElementById('editar-produto-estoque-minimo').value = produto.estoque_minimo || 0;
            document.getElementById('editar-produto-descricao').value = produto.descricao || '';
            document.getElementById('editar-produto-ativo').checked = produto.ativo;

            // --- Lógica de Imagem (do seu script.js) ---
            const previewEditar = document.getElementById('previewImage-editar');
            document.getElementById('editar-icone-atual').value = produto.icone || ''; // Salva o base64 antigo
            document.getElementById('foto-editar').value = ''; // Limpa o seletor de arquivo

            if (produto.icone) {
                previewEditar.src = produto.icone;
                previewEditar.style.display = 'block';
            } else {
                previewEditar.src = '';
                previewEditar.style.display = 'none';
            }
            // --- Fim da Lógica de Imagem ---

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
        
        // Dados do formulário (do estoque.js)
        const updateObj = {
            nome: document.getElementById('editar-produto-nome').value.trim(),
            categoria_id: document.getElementById('editar-produto-categoria').value,
            preco_venda: parseFloat(document.getElementById('editar-produto-preco-venda').value),
            estoque_atual: parseInt(document.getElementById('editar-produto-estoque-atual').value) || 0,
            estoque_minimo: parseInt(document.getElementById('editar-produto-estoque-minimo').value) || 0,
            descricao: document.getElementById('editar-produto-descricao').value.trim(),
            ativo: document.getElementById('editar-produto-ativo').checked,
            icone: document.getElementById('editar-icone-atual').value // Começa com o ícone antigo
        };

        if (!updateObj.nome || !updateObj.categoria_id || isNaN(updateObj.preco_venda)) {
            mostrarMensagem('Preencha todos os campos obrigatórios (*)', 'error');
            return;
        }

        try {
            // --- Lógica de Upload (do seu script.js) ---
            if (fileInput.files[0]) { // Se um NOVO arquivo foi selecionado
                try {
                    console.log('Processando nova imagem...');
                    updateObj.icone = await imageToBase64(fileInput.files[0]);
                    console.log('✅ Nova imagem processada');
                } catch (uploadError) {
                    mostrarMensagem('Erro ao processar nova imagem: ' + uploadError.message, 'error');
                    return;
                }
            }
            // --- Fim da Lógica de Upload ---

            // Atualizar no DB (lógica de ambos os scripts)
            const { error } = await supabaseClient
                .from('produtos')
                .update(updateObj)
                .eq('id', produtoId);
            if (error) throw error;

            mostrarMensagem('Produto atualizado com sucesso!', 'success');
            fecharModais();
            await carregarListaProdutos(); // Atualiza a tabela

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

    // --- Funções Auxiliares (do estoque.js) ---
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

    // Logout (do estoque.js)
    document.getElementById('logout-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Deseja realmente sair do sistema?')) {
            alert("Logout... (implementar sua função de logout aqui)");
            // Ex: window.location.href = 'login.html';
        }
    });

    // Torna funções de clique globais (necessário para o onclick="" no HTML)
    window.editarProduto = editarProduto;
    window.toggleProduto = toggleProduto;
    window.excluirProduto = excluirProduto;
    window.editarCategoria = editarCategoria;
    window.excluirCategoria = excluirCategoria;

});