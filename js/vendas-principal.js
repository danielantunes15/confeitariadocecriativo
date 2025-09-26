// js/vendas-principal.js
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação
    const usuario = window.sistemaAuth?.verificarAutenticacao();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos do DOM
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');
    const categoriasContainer = document.getElementById('categorias-container');
    const produtosContainer = document.getElementById('produtos-container');
    const carrinhoVazio = document.getElementById('carrinho-vazio');
    const carrinhoItens = document.getElementById('carrinho-itens');
    const carrinhoLista = document.getElementById('carrinho-lista');
    const subtotalCarrinho = document.getElementById('subtotal-carrinho');
    const finalizarVendaBtn = document.getElementById('finalizar-venda');
    const cancelarItemBtn = document.getElementById('cancelar-item');
    const cancelarVendaBtn = document.getElementById('cancelar-venda');
    const contadorProdutos = document.getElementById('contador-produtos');
    const contadorCarrinho = document.getElementById('contador-carrinho');
    const searchInput = document.getElementById('search-produtos');

    // Variáveis globais
    let categorias = [];
    let produtos = [];
    let produtosFiltrados = [];
    let carrinho = [];
    let categoriaSelecionada = null;

    try {
        // Mostrar loading
        if (loadingElement) loadingElement.style.display = 'flex';
        if (contentElement) contentElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'none';

        // Testar conexão com Supabase
        await testarConexaoSupabase();
        
        // Esconder loading e mostrar conteúdo
        if (loadingElement) loadingElement.style.display = 'none';
        if (contentElement) contentElement.style.display = 'block';

        // Inicializar a aplicação
        await inicializarVendas();

    } catch (error) {
        console.error('Erro na inicialização:', error);
        if (loadingElement) loadingElement.style.display = 'none';
        if (errorElement) {
            errorElement.style.display = 'flex';
            errorElement.innerHTML = `
                <div class="error-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h2>Erro de Conexão</h2>
                    <p>Não foi possível conectar ao banco de dados.</p>
                    <p>Detalhes do erro: ${error.message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">Tentar Novamente</button>
                </div>
            `;
        }
    }

    // Função para testar conexão
    async function testarConexaoSupabase() {
        try {
            const { data, error } = await supabase
                .from('produtos')
                .select('count')
                .limit(1);
                
            if (error) throw error;
            
            console.log('✅ Conexão com Supabase estabelecida (vendas principal)');
            return true;
        } catch (error) {
            throw new Error(`Erro Supabase: ${error.message}`);
        }
    }

    // Função para inicializar a aplicação de vendas
    async function inicializarVendas() {
        try {
            // Carregar dados iniciais
            await carregarCategorias();
            await carregarProdutos();
            
            // Configurar event listeners
            configurarEventListeners();
            
            // Exibir categorias
            exibirCategorias();
            
            // Exibir todos os produtos inicialmente
            exibirProdutos(produtos);

            console.log('✅ Módulo de vendas principal inicializado com sucesso!');

        } catch (error) {
            console.error('Erro na inicialização do módulo de vendas principal:', error);
            throw error;
        }
    }

    // Função para carregar categorias
    async function carregarCategorias() {
        try {
            const { data, error } = await supabase
                .from('categorias')
                .select('*')
                .eq('ativo', true)
                .order('nome');
                
            if (error) throw error;
            
            categorias = data;
            console.log(`✅ ${categorias.length} categorias carregadas`);
            
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            throw error;
        }
    }

    // Função para carregar produtos
    async function carregarProdutos() {
        try {
            const { data, error } = await supabase
                .from('produtos')
                .select('*, categoria:categorias(nome)')
                .eq('ativo', true)
                .order('nome');
                
            if (error) throw error;
            
            produtos = data;
            produtosFiltrados = [...produtos];
            atualizarContadorProdutos();
            console.log(`✅ ${produtos.length} produtos carregados`);
            
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            throw error;
        }
    }

    // Função para atualizar contador de produtos
    function atualizarContadorProdutos() {
        if (contadorProdutos) {
            const count = produtosFiltrados.length;
            contadorProdutos.textContent = `${count} produto${count !== 1 ? 's' : ''}`;
        }
    }

    // Função para atualizar contador do carrinho
    function atualizarContadorCarrinho() {
        if (contadorCarrinho) {
            const totalItens = carrinho.reduce((total, item) => total + item.quantidade, 0);
            contadorCarrinho.textContent = totalItens;
            contadorCarrinho.style.display = totalItens > 0 ? 'block' : 'none';
        }
    }

    // Função para exibir categorias
    function exibirCategorias() {
        if (!categoriasContainer) return;
        
        categoriasContainer.innerHTML = '';
        
        // Adicionar categoria "Todos"
        const categoriaTodos = document.createElement('div');
        categoriaTodos.className = `categoria-card ${!categoriaSelecionada ? 'active' : ''}`;
        categoriaTodos.innerHTML = `
            <div class="categoria-icon">
                <i class="fas fa-th-large"></i>
            </div>
            <h3>Todos</h3>
            <span class="categoria-count">${produtos.length}</span>
        `;
        categoriaTodos.addEventListener('click', () => {
            categoriaSelecionada = null;
            produtosFiltrados = [...produtos];
            exibirProdutos(produtosFiltrados);
            
            // Atualizar estado ativo das categorias
            document.querySelectorAll('.categoria-card').forEach(card => {
                card.classList.remove('active');
            });
            categoriaTodos.classList.add('active');
        });
        
        categoriasContainer.appendChild(categoriaTodos);
        
        // Adicionar categorias do banco
        categorias.forEach(categoria => {
            const produtosNaCategoria = produtos.filter(p => p.categoria_id === categoria.id).length;
            const categoriaCard = document.createElement('div');
            categoriaCard.className = `categoria-card ${categoriaSelecionada === categoria.id ? 'active' : ''}`;
            categoriaCard.innerHTML = `
                <div class="categoria-icon">
                    <i class="fas ${categoria.icone || 'fa-tag'}"></i>
                </div>
                <h3>${categoria.nome}</h3>
                <span class="categoria-count">${produtosNaCategoria}</span>
            `;
            categoriaCard.addEventListener('click', () => {
                categoriaSelecionada = categoria.id;
                produtosFiltrados = produtos.filter(p => p.categoria_id === categoria.id);
                exibirProdutos(produtosFiltrados);
                
                // Atualizar estado ativo das categorias
                document.querySelectorAll('.categoria-card').forEach(card => {
                    card.classList.remove('active');
                });
                categoriaCard.classList.add('active');
            });
            
            categoriasContainer.appendChild(categoriaCard);
        });
    }

    // Função para exibir produtos
    function exibirProdutos(produtosParaExibir) {
        if (!produtosContainer) return;
        
        produtosContainer.innerHTML = '';
        atualizarContadorProdutos();
        
        if (!produtosParaExibir || produtosParaExibir.length === 0) {
            produtosContainer.innerHTML = `
                <div class="produtos-vazios">
                    <i class="fas fa-search"></i>
                    <h3>Nenhum produto encontrado</h3>
                    <p>Tente selecionar outra categoria ou ajustar sua busca</p>
                </div>
            `;
            return;
        }
        
        produtosParaExibir.forEach(produto => {
            const produtoCard = document.createElement('div');
            produtoCard.className = `produto-card ${produto.estoque_atual <= 0 ? 'out-of-stock' : ''}`;
            produtoCard.innerHTML = `
                <div class="produto-image">
                    <i class="fas ${produto.icone || 'fa-cube'}"></i>
                    ${produto.estoque_atual <= 0 ? '<div class="out-of-stock-badge">ESGOTADO</div>' : ''}
                </div>
                <div class="produto-info">
                    <h3 class="produto-nome">${produto.nome}</h3>
                    <p class="produto-categoria">${produto.categoria?.nome || 'Sem categoria'}</p>
                    <div class="produto-details">
                        <div class="produto-preco">R$ ${produto.preco_venda.toFixed(2)}</div>
                        <div class="produto-estoque">Estoque: ${produto.estoque_atual}</div>
                    </div>
                </div>
                ${produto.estoque_atual > 0 ? '<div class="produto-action"><i class="fas fa-plus"></i></div>' : ''}
            `;
            
            if (produto.estoque_atual > 0) {
                produtoCard.addEventListener('click', () => {
                    adicionarAoCarrinho(produto);
                    // Efeito visual de confirmação
                    produtoCard.classList.add('added');
                    setTimeout(() => {
                        produtoCard.classList.remove('added');
                    }, 500);
                });
            }
            
            produtosContainer.appendChild(produtoCard);
        });
    }

    // Função para adicionar produto ao carrinho
    function adicionarAoCarrinho(produto) {
        // Verificar se o produto já está no carrinho
        const itemExistente = carrinho.find(item => item.produto.id === produto.id);
        
        if (itemExistente) {
            // Se já existe, aumentar a quantidade
            if (itemExistente.quantidade < produto.estoque_atual) {
                itemExistente.quantidade += 1;
            } else {
                mostrarMensagem(`Estoque insuficiente para ${produto.nome}. Máximo: ${produto.estoque_atual}`, 'error');
                return;
            }
        } else {
            // Se não existe, adicionar novo item
            if (produto.estoque_atual > 0) {
                carrinho.push({
                    produto: produto,
                    quantidade: 1
                });
            } else {
                mostrarMensagem(`Produto ${produto.nome} sem estoque disponível.`, 'error');
                return;
            }
        }
        
        // Atualizar exibição do carrinho
        atualizarCarrinho();
        mostrarMensagem(`${produto.nome} adicionado ao carrinho!`, 'success');
    }

    // Função para atualizar exibição do carrinho
    function atualizarCarrinho() {
        atualizarContadorCarrinho();
        
        if (carrinho.length === 0) {
            carrinhoVazio.style.display = 'flex';
            carrinhoItens.style.display = 'none';
        } else {
            carrinhoVazio.style.display = 'none';
            carrinhoItens.style.display = 'block';
            
            // Limpar lista atual
            carrinhoLista.innerHTML = '';
            
            // Calcular subtotal
            let subtotal = 0;
            
            // Adicionar itens ao carrinho
            carrinho.forEach((item, index) => {
                const itemSubtotal = item.produto.preco_venda * item.quantidade;
                subtotal += itemSubtotal;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div class="carrinho-item-produto">
                            <div class="produto-icon">
                                <i class="fas ${item.produto.icone || 'fa-cube'}"></i>
                            </div>
                            <div class="produto-desc">
                                <div class="produto-nome">${item.produto.nome}</div>
                                <div class="produto-categoria">${item.produto.categoria?.nome || 'Sem categoria'}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="carrinho-item-quantidade">
                            <button class="btn-quantidade diminuir-quantidade" data-index="${index}">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" value="${item.quantidade}" min="1" max="${item.produto.estoque_atual}" data-index="${index}">
                            <button class="btn-quantidade aumentar-quantidade" data-index="${index}">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </td>
                    <td class="preco-unitario">R$ ${item.produto.preco_venda.toFixed(2)}</td>
                    <td class="subtotal">R$ ${itemSubtotal.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-danger btn-remover remover-item" data-index="${index}" title="Remover item">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                
                carrinhoLista.appendChild(tr);
            });
            
            // Atualizar subtotal
            subtotalCarrinho.textContent = `R$ ${subtotal.toFixed(2)}`;
            
            // Adicionar event listeners aos botões
            document.querySelectorAll('.diminuir-quantidade').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    diminuirQuantidade(index);
                });
            });
            
            document.querySelectorAll('.aumentar-quantidade').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    aumentarQuantidade(index);
                });
            });
            
            document.querySelectorAll('.remover-item').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    removerItem(index);
                });
            });
            
            document.querySelectorAll('.carrinho-item-quantidade input').forEach(input => {
                input.addEventListener('change', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    const novaQuantidade = parseInt(this.value) || 1;
                    alterarQuantidade(index, novaQuantidade);
                });
            });
        }
    }

    // Função para diminuir quantidade de um item
    function diminuirQuantidade(index) {
        if (carrinho[index].quantidade > 1) {
            carrinho[index].quantidade -= 1;
            atualizarCarrinho();
        }
    }

    // Função para aumentar quantidade de um item
    function aumentarQuantidade(index) {
        if (carrinho[index].quantidade < carrinho[index].produto.estoque_atual) {
            carrinho[index].quantidade += 1;
            atualizarCarrinho();
        } else {
            mostrarMensagem(`Estoque insuficiente. Máximo: ${carrinho[index].produto.estoque_atual}`, 'error');
        }
    }

    // Função para alterar quantidade de um item
    function alterarQuantidade(index, novaQuantidade) {
        if (novaQuantidade < 1) {
            novaQuantidade = 1;
        }
        
        if (novaQuantidade > carrinho[index].produto.estoque_atual) {
            novaQuantidade = carrinho[index].produto.estoque_atual;
            mostrarMensagem(`Quantidade ajustada para o máximo disponível: ${novaQuantidade}`, 'warning');
        }
        
        carrinho[index].quantidade = novaQuantidade;
        atualizarCarrinho();
    }

    // Função para remover item do carrinho
    function removerItem(index) {
        const produtoNome = carrinho[index].produto.nome;
        carrinho.splice(index, 1);
        atualizarCarrinho();
        mostrarMensagem(`${produtoNome} removido do carrinho.`, 'success');
    }

    // Função para configurar event listeners
    function configurarEventListeners() {
        // Finalizar venda
        if (finalizarVendaBtn) {
            finalizarVendaBtn.addEventListener('click', finalizarVenda);
        }
        
        // Cancelar item
        if (cancelarItemBtn) {
            cancelarItemBtn.addEventListener('click', abrirModalCancelarItem);
        }
        
        // Cancelar venda
        if (cancelarVendaBtn) {
            cancelarVendaBtn.addEventListener('click', cancelarVenda);
        }
        
        // Busca de produtos
        if (searchInput) {
            searchInput.addEventListener('input', filtrarProdutos);
        }
        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Deseja realmente sair do sistema?')) {
            if (window.sistemaAuth) {
                window.sistemaAuth.fazerLogout();
            } else {
                // Fallback
                localStorage.removeItem('usuarioLogado');
                window.location.href = 'login.html';
            }
        }
    });
}
        // Modal cancelar item
        const modalCancelarItem = document.getElementById('modal-cancelar-item');
        const closeModalBtn = modalCancelarItem?.querySelector('.close');
        const cancelarModalItemBtn = document.getElementById('cancelar-modal-item');
        const confirmarCancelarItemBtn = document.getElementById('confirmar-cancelar-item');
        
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                modalCancelarItem.style.display = 'none';
            });
        }
        
        if (cancelarModalItemBtn) {
            cancelarModalItemBtn.addEventListener('click', () => {
                modalCancelarItem.style.display = 'none';
            });
        }
        
        if (confirmarCancelarItemBtn) {
            confirmarCancelarItemBtn.addEventListener('click', confirmarCancelarItem);
        }
        
        window.addEventListener('click', (e) => {
            if (e.target === modalCancelarItem) {
                modalCancelarItem.style.display = 'none';
            }
        });
    }

    // Função para filtrar produtos
    function filtrarProdutos() {
        const termo = searchInput.value.toLowerCase().trim();
        
        if (!termo) {
            produtosFiltrados = categoriaSelecionada 
                ? produtos.filter(p => p.categoria_id === categoriaSelecionada)
                : [...produtos];
        } else {
            produtosFiltrados = produtos.filter(produto => 
                produto.nome.toLowerCase().includes(termo) ||
                (produto.categoria?.nome || '').toLowerCase().includes(termo)
            );
        }
        
        exibirProdutos(produtosFiltrados);
    }

    // Função para finalizar venda
    async function finalizarVenda() {
        if (carrinho.length === 0) {
            mostrarMensagem('Adicione produtos ao carrinho antes de finalizar a venda.', 'error');
            return;
        }
        
        const formaPagamento = document.querySelector('input[name="forma-pagamento"]:checked').value;
        
        // Confirmar venda
        if (!confirm(`Deseja finalizar a venda com ${carrinho.length} item(s)?\nForma de pagamento: ${formaPagamento}`)) {
            return;
        }
        
        try {
            // Calcular total
            const total = carrinho.reduce((sum, item) => {
                return sum + (item.produto.preco_venda * item.quantidade);
            }, 0);
            
            // Inserir venda
            const { data: venda, error: vendaError } = await supabase
                .from('vendas')
                .insert({
                    data_venda: new Date().toISOString().split('T')[0],
                    cliente: 'Cliente não identificado',
                    total: total,
                    forma_pagamento: formaPagamento,
                    observacoes: '',
                    usuario_id: window.sistemaAuth.usuarioLogado.id
                })
                .select()
                .single();
                
            if (vendaError) throw vendaError;
            
            // Inserir itens da venda
            const itensVenda = carrinho.map(item => ({
                venda_id: venda.id,
                produto_id: item.produto.id,
                quantidade: item.quantidade,
                preco_unitario: item.produto.preco_venda
            }));
            
            const { error: itensError } = await supabase
                .from('vendas_itens')
                .insert(itensVenda);
                
            if (itensError) throw itensError;
            
            // Atualizar estoque
            for (const item of carrinho) {
                const { error: estoqueError } = await supabase
                    .from('produtos')
                    .update({ 
                        estoque_atual: item.produto.estoque_atual - item.quantidade 
                    })
                    .eq('id', item.produto.id);
                    
                if (estoqueError) {
                    console.warn('Erro ao atualizar estoque:', estoqueError);
                }
            }
            
            mostrarMensagem('Venda finalizada com sucesso!', 'success');
            
            // Limpar carrinho e recarregar produtos
            carrinho = [];
            atualizarCarrinho();
            await carregarProdutos();
            exibirProdutos(produtosFiltrados);
            
        } catch (error) {
            console.error('Erro ao finalizar venda:', error);
            mostrarMensagem('Erro ao finalizar venda: ' + error.message, 'error');
        }
    }

    // Função para abrir modal de cancelar item
    function abrirModalCancelarItem() {
        if (carrinho.length === 0) {
            mostrarMensagem('O carrinho está vazio.', 'error');
            return;
        }
        
        const modalCancelarItem = document.getElementById('modal-cancelar-item');
        const listaItensCancelar = document.getElementById('lista-itens-cancelar');
        
        if (!modalCancelarItem || !listaItensCancelar) return;
        
        // Limpar lista anterior
        listaItensCancelar.innerHTML = '';
        
        // Adicionar itens à lista
        carrinho.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'item-cancelar';
            itemDiv.dataset.index = index;
            itemDiv.innerHTML = `
                <div class="item-cancelar-info">
                    <div class="item-icon">
                        <i class="fas ${item.produto.icone || 'fa-cube'}"></i>
                    </div>
                    <div class="item-details">
                        <div class="item-nome"><strong>${item.produto.nome}</strong></div>
                        <div class="item-quantidade">Quantidade: ${item.quantidade}</div>
                        <div class="item-subtotal">Subtotal: R$ ${(item.produto.preco_venda * item.quantidade).toFixed(2)}</div>
                    </div>
                </div>
            `;
            
            itemDiv.addEventListener('click', function() {
                // Desselecionar todos
                document.querySelectorAll('.item-cancelar').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // Selecionar este
                this.classList.add('selected');
            });
            
            listaItensCancelar.appendChild(itemDiv);
        });
        
        modalCancelarItem.style.display = 'block';
    }

    // Função para confirmar cancelamento de item
    function confirmarCancelarItem() {
        const itemSelecionado = document.querySelector('.item-cancelar.selected');
        
        if (!itemSelecionado) {
            mostrarMensagem('Selecione um item para cancelar.', 'error');
            return;
        }
        
        const index = parseInt(itemSelecionado.dataset.index);
        const produtoNome = carrinho[index].produto.nome;
        
        if (confirm(`Deseja cancelar o item "${produtoNome}"?`)) {
            carrinho.splice(index, 1);
            atualizarCarrinho();
            mostrarMensagem(`Item "${produtoNome}" cancelado.`, 'success');
            
            // Fechar modal
            document.getElementById('modal-cancelar-item').style.display = 'none';
        }
    }

    // Função para cancelar venda
    function cancelarVenda() {
        if (carrinho.length === 0) {
            mostrarMensagem('O carrinho já está vazio.', 'info');
            return;
        }
        
        if (confirm('Deseja cancelar toda a venda e limpar o carrinho?')) {
            carrinho = [];
            atualizarCarrinho();
            mostrarMensagem('Venda cancelada. Carrinho limpo.', 'success');
        }
    }

    // Função para mostrar mensagens
    function mostrarMensagem(mensagem, tipo = 'info') {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.innerHTML = `
            <div class="alert-content">
                <i class="fas ${tipo === 'success' ? 'fa-check' : tipo === 'error' ? 'fa-exclamation-triangle' : tipo === 'warning' ? 'fa-exclamation' : 'fa-info'}"></i>
                <span>${mensagem}</span>
            </div>
            <button class="alert-close">&times;</button>
        `;
        
        alertContainer.appendChild(alertDiv);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
        
        // Botão de fechar
        alertDiv.querySelector('.alert-close').addEventListener('click', () => {
            alertDiv.remove();
        });
    }
});