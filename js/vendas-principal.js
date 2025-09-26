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

    // Variáveis globais
    let categorias = [];
    let produtos = [];
    let produtosFiltrados = [];
    let carrinho = [];
    let categoriaSelecionada = null;

    try {
        // Mostrar loading
        if (loadingElement) loadingElement.style.display = 'block';
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
            errorElement.style.display = 'block';
            errorElement.innerHTML = `
                <h2>Erro de Conexão</h2>
                <p>Não foi possível conectar ao banco de dados.</p>
                <p>Detalhes do erro: ${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary">Tentar Novamente</button>
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
            console.log(`✅ ${produtos.length} produtos carregados`);
            
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            throw error;
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
            <i class="fas fa-th-large"></i>
            <h3>Todos</h3>
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
            const categoriaCard = document.createElement('div');
            categoriaCard.className = `categoria-card ${categoriaSelecionada === categoria.id ? 'active' : ''}`;
            categoriaCard.innerHTML = `
                <i class="fas fa-tag"></i>
                <h3>${categoria.nome}</h3>
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
        
        if (!produtosParaExibir || produtosParaExibir.length === 0) {
            produtosContainer.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Nenhum produto encontrado para esta categoria.</p>';
            return;
        }
        
        produtosParaExibir.forEach(produto => {
            const produtoCard = document.createElement('div');
            produtoCard.className = `produto-card ${produto.estoque_atual <= 0 ? 'out-of-stock' : ''}`;
            produtoCard.innerHTML = `
                <i class="fas ${produto.icone || 'fa-cube'}"></i>
                <div class="produto-info">
                    <h3>${produto.nome}</h3>
                    <div class="preco">R$ ${produto.preco_venda.toFixed(2)}</div>
                    <div class="estoque">Estoque: ${produto.estoque_atual}</div>
                </div>
            `;
            
            if (produto.estoque_atual > 0) {
                produtoCard.addEventListener('click', () => {
                    adicionarAoCarrinho(produto);
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
        if (carrinho.length === 0) {
            carrinhoVazio.style.display = 'block';
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
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas ${item.produto.icone || 'fa-cube'}"></i>
                            <span>${item.produto.nome}</span>
                        </div>
                    </td>
                    <td>
                        <div class="carrinho-item-quantidade">
                            <button class="diminuir-quantidade" data-index="${index}">-</button>
                            <input type="number" value="${item.quantidade}" min="1" max="${item.produto.estoque_atual}" data-index="${index}">
                            <button class="aumentar-quantidade" data-index="${index}">+</button>
                        </div>
                    </td>
                    <td>R$ ${item.produto.preco_venda.toFixed(2)}</td>
                    <td>R$ ${itemSubtotal.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-danger remover-item" data-index="${index}">
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
                    <i class="fas ${item.produto.icone || 'fa-cube'}"></i>
                    <div>
                        <div><strong>${item.produto.nome}</strong></div>
                        <div>Quantidade: ${item.quantidade}</div>
                        <div>Subtotal: R$ ${(item.produto.preco_venda * item.quantidade).toFixed(2)}</div>
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
            <span>${mensagem}</span>
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