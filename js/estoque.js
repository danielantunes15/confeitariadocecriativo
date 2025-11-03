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
    
    // Inicializar a aplicação
    inicializarEstoque();

    // --- FUNÇÃO AUXILIAR PARA LIMPAR NOMES DE ARQUIVO ---
    const sanitizeFilename = (text) => {
        // 1. Normaliza e remove acentos
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
                   // 2. Remove caracteres não-alfanuméricos (exceto espaços, _ e -)
                   .replace(/[^a-zA-Z0-9\s-]/g, "") 
                   .trim()
                   // 3. Substitui espaços e múltiplos hífens por um único underline
                   .replace(/[\s-]+/g, '_'); 
    };

    // --- FUNÇÃO DE UPLOAD PARA SUPABASE STORAGE ---
    async function uploadFotoProduto(file, nomeProduto) {
        if (!file) return null;
        
        const nomeBucket = 'fotos-produtos';
        
        // Sanitiza o nome do produto para evitar o erro 'Invalid key'
        const sanitizedName = sanitizeFilename(nomeProduto);
        
        // NOME DO ARQUIVO: Usa o nome do produto sanitizado + timestamp
        const ext = file.name.split('.').pop();
        const fileName = `${sanitizedName}-${Date.now()}.${ext}`;
        const storagePath = `produtos/${fileName}`;

        mostrarMensagem(`Iniciando upload de ${fileName}...`, 'info');

        try {
            // 1. FAZER O UPLOAD REAL DO ARQUIVO
            const { error: uploadError } = await window.supabase.storage
                .from(nomeBucket) 
                .upload(storagePath, file, {
                    cacheControl: '3600', // Cache de 1 hora
                    upsert: false // Não substitui
                });
                
            if (uploadError) {
                console.error('❌ Erro no upload Supabase:', uploadError);
                throw new Error(uploadError.message || 'Falha ao enviar a foto. Verifique a permissão "INSERT" do Storage.');
            }

            // 2. OBTER A URL PÚBLICA
            const { data: urlData } = window.supabase.storage
                .from(nomeBucket) 
                .getPublicUrl(storagePath);
                
            mostrarMensagem('Upload e URL real obtidos com sucesso!', 'success');
            
            // 3. RETORNAR A URL PÚBLICA REAL
            return urlData.publicUrl;
            
        } catch (error) {
            console.error('❌ Erro durante o processo de upload:', error);
            mostrarMensagem('Erro fatal ao fazer upload da foto: ' + error.message, 'error');
            return null;
        }
    }

    // --- FUNÇÃO DE DIAGNÓSTICO PARA IMAGENS ---
    window.debugImagensProdutos = async function() {
        try {
            console.log('🔍 INICIANDO DIAGNÓSTICO DE IMAGENS...');
            
            // 1. Verificar produtos no banco
            const { data: produtos, error } = await supabase
                .from('produtos')
                .select('id, nome, icone, categoria_id');
                
            if (error) throw error;
            
            console.log('📦 PRODUTOS NO BANCO:', produtos);
            
            // 2. Verificar storage
            console.log('🪣 VERIFICANDO STORAGE...');
            const { data: files, error: storageError } = await supabase
                .storage
                .from('fotos-produtos')
                .list('produtos');
                
            console.log('📁 ARQUIVOS NO STORAGE:', files);
            console.log('❌ ERRO STORAGE:', storageError);
            
            // 3. Testar URLs das imagens
            if (produtos && produtos.length > 0) {
                console.log('🔗 TESTANDO URLs DAS IMAGENS:');
                for (let produto of produtos) {
                    if (produto.icone) {
                        console.log(`\n📸 Produto: ${produto.nome}`);
                        console.log(`URL: ${produto.icone}`);
                        
                        // Testar se a URL é acessível
                        try {
                            const response = await fetch(produto.icone, { method: 'HEAD' });
                            console.log(`Status: ${response.status} ${response.statusText}`);
                            console.log(`Acessível: ${response.ok}`);
                        } catch (fetchError) {
                            console.log(`❌ Erro ao acessar URL: ${fetchError.message}`);
                        }
                    } else {
                        console.log(`\n📸 Produto: ${produto.nome} - SEM IMAGEM`);
                    }
                }
            }
            
        } catch (error) {
            console.error('Erro no diagnóstico:', error);
        }
    }

    // --- FUNÇÃO TESTAR BUCKET ---
    window.testarBucketStorage = async function() {
        try {
            console.log('🧪 TESTANDO CONFIGURAÇÃO DO STORAGE...');
            
            // Tentar listar buckets disponíveis
            const { data: buckets, error: bucketsError } = await supabase
                .storage
                .listBuckets();
                
            console.log('🪣 BUCKETS DISPONÍVEIS:', buckets);
            console.log('❌ ERRO BUCKETS:', bucketsError);
            
            // Testar bucket específico
            const { data: testFiles, error: testError } = await supabase
                .storage
                .from('fotos-produtos')
                .list();
                
            console.log('📁 CONTEÚDO DO BUCKET:', testFiles);
            console.log('❌ ERRO BUCKET:', testError);
            
        } catch (error) {
            console.error('Erro no teste do storage:', error);
        }
    }

    // --- FUNÇÃO VERIFICAR PERMISSÕES ---
    window.verificarPermissoesStorage = async function() {
        try {
            console.log('🔐 VERIFICANDO PERMISSÕES DO STORAGE...');
            
            // Testar upload de um arquivo pequeno
            const testBlob = new Blob(['test'], { type: 'text/plain' });
            const testFile = new File([testBlob], 'test-permissions.txt');
            
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('fotos-produtos')
                .upload('test-permissions.txt', testFile);
                
            console.log('📤 TESTE DE UPLOAD:', uploadData);
            console.log('❌ ERRO UPLOAD:', uploadError);
            
            // Testar listagem
            const { data: listData, error: listError } = await supabase
                .storage
                .from('fotos-produtos')
                .list();
                
            console.log('📋 TESTE DE LISTAGEM:', listData);
            console.log('❌ ERRO LISTAGEM:', listError);
            
        } catch (error) {
            console.error('Erro na verificação de permissões:', error);
        }
    }

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
        
        // Listener para preview da foto no modal de edição
        document.getElementById('editar-produto-foto-file')?.addEventListener('change', function(e) {
            const preview = document.getElementById('editar-foto-preview');
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                preview.src = URL.createObjectURL(file);
                preview.style.display = 'block';
            }
        });

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
            mostrarMensagem('Erro ao carregar dados da conta: ' + error.message, 'error');
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

            // 🆕 CHAMAR DIAGNÓSTICO APÓS CARREGAR PRODUTOS
            console.log('🎯 PRODUTOS CARREGADOS PARA EXIBIÇÃO:', produtos);
            debugImagensProdutos();
            testarBucketStorage();

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
            
            // 🆕 DEBUG DETALHADO
            console.log(`🎨 EXIBINDO PRODUTO: ${produto.nome}`, {
                icone: produto.icone,
                temIcone: !!produto.icone,
                startsWithHttp: produto.icone?.startsWith('http'),
                categoria: produto.categoria?.nome
            });
            
            let imagemHTML = '';
            if (produto.icone && produto.icone.startsWith('http')) {
                // Adiciona timestamp para evitar cache
                const urlComTimestamp = `${produto.icone}?t=${Date.now()}`;
                imagemHTML = `
                    <div class="imagem-container" style="position: relative;">
                        <img src="${urlComTimestamp}" 
                             alt="${produto.nome}" 
                             onload="console.log('✅ Imagem carregada:', '${produto.nome}')"
                             onerror="console.log('❌ Erro ao carregar imagem:', '${produto.nome}', this.src); this.style.display='none'; this.nextElementSibling.style.display='inline';"
                             style="max-width: 40px; max-height: 40px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;">
                        <i class="fas fa-camera" style="display: none; font-size: 24px; color: #ff69b4;"></i>
                    </div>
                `;
            } else {
                imagemHTML = '<i class="fas fa-camera" style="font-size: 24px; color: #ff69b4;"></i>';
                console.log(`📭 Produto ${produto.nome} sem URL de imagem válida`);
            }
            
            tr.innerHTML = `
                <td class="foto-tabela" style="text-align: center;">
                    ${imagemHTML}
                </td>
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
        const fotoFile = document.getElementById('produto-foto-file').files[0];
        const ativo = document.getElementById('produto-ativo').checked;

        // Validações
        if (!nome || !categoriaId || isNaN(precoVenda) || isNaN(estoqueAtual) || isNaN(estoqueMinimo) || !fotoFile) {
            mostrarMensagem('Preencha todos os campos obrigatórios e anexe uma foto.', 'error');
            return;
        }

        if (estoqueMinimo < 0) {
            mostrarMensagem('O estoque mínimo não pode ser negativo', 'error');
            return;
        }
        
        // PASSO 1: UPLOAD DA FOTO
        mostrarMensagem('Fazendo upload da foto, por favor aguarde...', 'info');
        const fotoUrl = await uploadFotoProduto(fotoFile, nome);

        if (!fotoUrl) {
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
                    icone: fotoUrl, // Salva a URL real na coluna 'icone'
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
            console.error('❌ Erro ao criar produto:', error);
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
            
            // Preencher campos
            document.getElementById('editar-produto-id').value = produto.id;
            document.getElementById('editar-produto-nome').value = produto.nome || '';
            document.getElementById('editar-produto-categoria').value = produto.categoria_id;
            document.getElementById('editar-produto-preco-venda').value = produto.preco_venda;
            document.getElementById('editar-produto-estoque-atual').value = produto.estoque_atual;
            document.getElementById('editar-produto-estoque-minimo').value = produto.estoque_minimo;
            document.getElementById('editar-produto-descricao').value = produto.descricao || '';
            
            // Lógica de Preview da Foto Atual
            const preview = document.getElementById('editar-foto-preview');
            if (produto.icone) {
                preview.src = produto.icone;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }

            document.getElementById('editar-produto-ativo').checked = produto.ativo;
            
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
        const fotoFile = document.getElementById('editar-produto-foto-file').files[0];
        const ativo = document.getElementById('editar-produto-ativo').checked;

        // Validações
        if (!nome || !categoriaId || isNaN(precoVenda) || isNaN(estoqueAtual) || isNaN(estoqueMinimo)) {
            mostrarMensagem('Preencha todos os campos obrigatórios.', 'error');
            return;
        }
        
        let novaFotoUrl = null;

        // PASSO 1: SE HOUVER NOVO ARQUIVO, FAZER UPLOAD
        if (fotoFile) {
            mostrarMensagem('Fazendo upload da nova foto, por favor aguarde...', 'info');
            novaFotoUrl = await uploadFotoProduto(fotoFile, nome);
            
            if (!novaFotoUrl) {
                return;
            }
        }
        
        // PASSO 2: PREPARAR DADOS PARA ATUALIZAÇÃO
        const dadosAtualizacao = {
            nome: nome,
            categoria_id: categoriaId,
            preco_venda: precoVenda,
            estoque_atual: estoqueAtual,
            estoque_minimo: estoqueMinimo,
            descricao: descricao,
            ativo: ativo
        };
        
        if (novaFotoUrl) {
            dadosAtualizacao.icone = novaFotoUrl; // Salva a nova URL
        }

        try {
            const { error } = await supabase
                .from('produtos')
                .update(dadosAtualizacao)
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
        
        // Limpar o campo de arquivo para que a mudança funcione na próxima vez
        document.getElementById('editar-produto-foto-file').value = null;
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
    configurarLogoutEstoque();

    // Exportar funções para uso global
    window.fecharModais = fecharModais;
    window.mostrarMensagem = mostrarMensagem;
});