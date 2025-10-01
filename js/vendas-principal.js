// js/vendas-principal.js - Sistema completo de vendas CORRIGIDO
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação
    const usuario = window.sistemaAuth?.verificarAutenticacao();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    console.log('👤 Usuário logado:', usuario.nome);
    console.log('🆔 ID do usuário:', usuario.id);

    // Elementos do DOM
    const categoriasContainer = document.getElementById('categorias-container');
    const produtosContainer = document.getElementById('produtos-container');
    const carrinhoItens = document.getElementById('carrinho-itens');
    const totalCarrinho = document.getElementById('total-carrinho');
    const finalizarPedidoBtn = document.getElementById('finalizar-pedido');
    const nomeClienteInput = document.getElementById('nome-cliente');

    // Variáveis globais
    let categorias = [];
    let produtos = [];
    let carrinho = [];
    let categoriaSelecionada = 'todos';

    // Criar container de alertas
    let alertContainer = document.getElementById('alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alert-container';
        alertContainer.style.position = 'fixed';
        alertContainer.style.top = '20px';
        alertContainer.style.right = '20px';
        alertContainer.style.zIndex = '1050';
        alertContainer.style.maxWidth = '400px';
        alertContainer.style.width = '100%';
        document.body.appendChild(alertContainer);
    }

    try {
        // Testar conexão primeiro
        console.log('🔧 Inicializando sistema de vendas...');
        const conexaoOk = await window.vendasSupabase.testarConexao();
        
        if (!conexaoOk) {
            throw new Error('Não foi possível conectar ao banco de dados');
        }

        // Verificar se o usuário está sincronizado
        console.log('🔍 Verificando sincronização do usuário...');
        const usuarioValido = await window.sistemaAuth.verificarUsuarioNoBanco();
        if (!usuarioValido) {
            console.log('🔄 Sincronizando usuário...');
            await window.sistemaAuth.sincronizarUsuario();
        }

        // Inicializar a aplicação
        await inicializarVendas();

    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        mostrarMensagem('Erro ao carregar o sistema: ' + error.message, 'error');
        
        // Mostrar produtos de exemplo em caso de erro
        setTimeout(() => {
            carregarProdutosExemplo();
            mostrarMensagem('Sistema carregado em modo demonstração', 'info');
        }, 2000);
    }

    // Função para inicializar a aplicação de vendas
    async function inicializarVendas() {
        try {
            // Carregar dados iniciais
            await carregarCategorias();
            await carregarProdutos();
            
            // Configurar event listeners
            configurarEventListeners();
            
            console.log('✅ Sistema de vendas inicializado com sucesso!');
            mostrarMensagem('Sistema carregado com sucesso!', 'success');

        } catch (error) {
            console.error('❌ Erro na inicialização do sistema de vendas:', error);
            throw error;
        }
    }

    // Função para carregar categorias
    async function carregarCategorias() {
        try {
            categorias = await window.vendasSupabase.buscarCategorias();
            exibirCategorias();
            
        } catch (error) {
            console.error('❌ Erro ao carregar categorias:', error);
            throw error;
        }
    }

    // Função para carregar produtos
    async function carregarProdutos() {
        try {
            produtos = await window.vendasSupabase.buscarProdutos();
            exibirProdutos();
            
        } catch (error) {
            console.error('❌ Erro ao carregar produtos:', error);
            throw error;
        }
    }

    // Função para exibir categorias
    function exibirCategorias() {
        if (!categoriasContainer) return;
        
        categoriasContainer.innerHTML = '';
        
        // Adicionar categoria "Todos"
        const categoriaTodos = document.createElement('button');
        categoriaTodos.className = `categoria-btn ${categoriaSelecionada === 'todos' ? 'active' : ''}`;
        categoriaTodos.setAttribute('data-categoria', 'todos');
        categoriaTodos.innerHTML = `
            <i class="fas fa-th-large"></i>
            <span>Todos</span>
        `;
        categoriaTodos.addEventListener('click', () => {
            selecionarCategoria('todos');
        });
        
        categoriasContainer.appendChild(categoriaTodos);
        
        // Adicionar categorias do banco
        categorias.forEach(categoria => {
            const categoriaBtn = document.createElement('button');
            categoriaBtn.className = `categoria-btn ${categoriaSelecionada === categoria.id ? 'active' : ''}`;
            categoriaBtn.setAttribute('data-categoria', categoria.id);
            categoriaBtn.innerHTML = `
                <i class="fas ${categoria.icone || 'fa-tag'}"></i>
                <span>${categoria.nome}</span>
            `;
            categoriaBtn.addEventListener('click', () => {
                selecionarCategoria(categoria.id);
            });
            
            categoriasContainer.appendChild(categoriaBtn);
        });
    }

    // Função para selecionar categoria
    function selecionarCategoria(categoriaId) {
        categoriaSelecionada = categoriaId;
        
        // Atualizar botões ativos
        document.querySelectorAll('.categoria-btn').forEach(botao => {
            if (botao.getAttribute('data-categoria') === categoriaId) {
                botao.classList.add('active');
            } else {
                botao.classList.remove('active');
            }
        });
        
        // Exibir produtos da categoria selecionada
        exibirProdutos();
    }

    // Função para exibir produtos
    function exibirProdutos() {
        if (!produtosContainer) return;
        
        produtosContainer.innerHTML = '';
        
        let produtosParaExibir = produtos;
        
        if (categoriaSelecionada !== 'todos') {
            produtosParaExibir = produtos.filter(p => p.categoria_id === categoriaSelecionada);
        }
        
        if (!produtosParaExibir || produtosParaExibir.length === 0) {
            produtosContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666;">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Nenhum produto encontrado</h3>
                    <p>Tente selecionar outra categoria</p>
                </div>
            `;
            return;
        }
        
        produtosParaExibir.forEach(produto => {
            const produtoCard = document.createElement('div');
            produtoCard.className = `produto-card ${produto.estoque_atual <= 0 ? 'out-of-stock' : ''}`;
            produtoCard.innerHTML = `
                <div class="produto-imagem">
                    <i class="fas ${produto.icone || 'fa-cube'}"></i>
                    ${produto.estoque_atual <= 0 ? '<div class="out-of-stock-badge">ESGOTADO</div>' : ''}
                    ${produto.estoque_atual > 0 && produto.estoque_atual <= produto.estoque_minimo ? 
                      '<div class="low-stock-badge">ESTOQUE BAIXO</div>' : ''}
                </div>
                <div class="produto-info">
                    <div class="produto-nome">${produto.nome}</div>
                    <div class="produto-categoria">${produto.categoria?.nome || 'Sem categoria'}</div>
                    <div class="produto-preco">R$ ${produto.preco_venda?.toFixed(2) || '0.00'}</div>
                    <div class="produto-estoque">Estoque: ${produto.estoque_atual}</div>
                    <button class="btn-adicionar" data-id="${produto.id}" ${produto.estoque_atual <= 0 ? 'disabled' : ''}>
                        ${produto.estoque_atual <= 0 ? 'Sem Estoque' : 'Adicionar ao Carrinho'}
                    </button>
                </div>
            `;
            
            if (produto.estoque_atual > 0) {
                produtoCard.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('btn-adicionar')) {
                        adicionarAoCarrinho(produto);
                    }
                });
                
                const btnAdicionar = produtoCard.querySelector('.btn-adicionar');
                btnAdicionar.addEventListener('click', (e) => {
                    e.stopPropagation();
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
            carrinhoItens.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Seu carrinho está vazio</p>
                </div>
            `;
            totalCarrinho.textContent = '0,00';
            finalizarPedidoBtn.disabled = true;
        } else {
            carrinhoItens.innerHTML = '';
            
            // Calcular total
            let total = 0;
            
            // Adicionar itens ao carrinho
            carrinho.forEach((item, index) => {
                const itemSubtotal = item.produto.preco_venda * item.quantidade;
                total += itemSubtotal;
                
                const itemElement = document.createElement('div');
                itemElement.className = 'carrinho-item';
                itemElement.innerHTML = `
                    <div class="carrinho-item-info">
                        <div class="carrinho-item-nome">${item.produto.nome}</div>
                        <div class="carrinho-item-preco">R$ ${item.produto.preco_venda.toFixed(2)}</div>
                    </div>
                    <div class="carrinho-item-controles">
                        <button class="btn-remover" data-index="${index}">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="carrinho-item-quantidade">${item.quantidade}</span>
                        <button class="btn-adicionar-carrinho" data-index="${index}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div class="carrinho-item-subtotal">
                        R$ ${itemSubtotal.toFixed(2)}
                    </div>
                `;
                
                carrinhoItens.appendChild(itemElement);
            });
            
            // Atualizar total
            totalCarrinho.textContent = total.toFixed(2);
            finalizarPedidoBtn.disabled = false;
            
            // Adicionar event listeners aos botões do carrinho
            document.querySelectorAll('.btn-remover').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    removerDoCarrinho(index);
                });
            });
            
            document.querySelectorAll('.btn-adicionar-carrinho').forEach(btn => {
                btn.addEventListener('click', function() {
                    const index = parseInt(this.getAttribute('data-index'));
                    aumentarQuantidade(index);
                });
            });
        }
    }

    // Função para remover item do carrinho
    function removerDoCarrinho(index) {
        const produtoNome = carrinho[index].produto.nome;
        
        if (carrinho[index].quantidade > 1) {
            carrinho[index].quantidade -= 1;
        } else {
            carrinho.splice(index, 1);
        }
        
        atualizarCarrinho();
        mostrarMensagem(`${produtoNome} removido do carrinho.`, 'info');
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

    // Função para configurar event listeners
    function configurarEventListeners() {
        // Finalizar pedido
        if (finalizarPedidoBtn) {
            finalizarPedidoBtn.addEventListener('click', finalizarPedido);
        }

        // Enter no campo do cliente também finaliza pedido
        if (nomeClienteInput) {
            nomeClienteInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && carrinho.length > 0) {
                    finalizarPedido();
                }
            });
        }

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            window.sistemaAuth.fazerLogout();
        });
    }

    // FUNÇÃO FINALIZAR PEDIDO - COMPLETAMENTE CORRIGIDA
    async function finalizarPedido() {
        if (carrinho.length === 0) {
            mostrarMensagem('Adicione produtos ao carrinho antes de finalizar o pedido.', 'error');
            return;
        }
        
        const formaPagamento = document.querySelector('input[name="pagamento"]:checked');
        
        if (!formaPagamento) {
            mostrarMensagem('Por favor, selecione uma forma de pagamento.', 'error');
            return;
        }
        
        const nomeCliente = nomeClienteInput.value.trim() || 'Cliente não identificado';
        
        // Calcular total
        const total = carrinho.reduce((sum, item) => {
            return sum + (item.produto.preco_venda * item.quantidade);
        }, 0);

        // Confirmar pedido
        if (!confirm(`Deseja finalizar o pedido com ${carrinho.length} item(s)?\n\nCliente: ${nomeCliente}\nForma de pagamento: ${formaPagamento.value}\n\nTotal: R$ ${total.toFixed(2)}`)) {
            return;
        }
        
        try {
            mostrarMensagem('Processando pedido...', 'info');
            finalizarPedidoBtn.disabled = true;
            finalizarPedidoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

            // 1. VERIFICAR SE O USUÁRIO ESTÁ SINCRONIZADO COM O BANCO
            console.log('🔍 Verificando sincronização do usuário...');
            const usuarioValido = await window.sistemaAuth.verificarUsuarioNoBanco();
            
            if (!usuarioValido) {
                console.log('🔄 Tentando sincronizar usuário...');
                const sincronizado = await window.sistemaAuth.sincronizarUsuario();
                
                if (!sincronizado) {
                    throw new Error('Problema com a conta de usuário. Faça login novamente.');
                }
            }

            // 2. VERIFICAR ESTOQUE
            console.log('🔍 Verificando estoque...');
            for (const item of carrinho) {
                await window.vendasSupabase.verificarEstoque(item.produto.id, item.quantidade);
            }

            // 3. PREPARAR DADOS DA VENDA COM USUÁRIO CORRETO
            const usuarioAtual = window.sistemaAuth.usuarioLogado;
            const vendaData = {
                data_venda: new Date().toISOString().split('T')[0],
                cliente: nomeCliente,
                total: total,
                forma_pagamento: formaPagamento.value,
                observacoes: '',
                usuario_id: usuarioAtual.id // ✅ AGORA COM ID CORRETO
            };

            console.log('📝 Dados da venda preparados:', vendaData);
            console.log('👤 ID do usuário sendo usado:', usuarioAtual.id);
            console.log('👤 Nome do usuário:', usuarioAtual.nome);

            // 4. CRIAR VENDA
            console.log('🛒 Criando venda no banco...');
            const venda = await window.vendasSupabase.criarVenda(vendaData);
            
            if (!venda || !venda.id) {
                throw new Error('Falha ao criar venda - ID não retornado');
            }

            console.log('✅ Venda criada com ID:', venda.id);

            // 5. PREPARAR ITENS DA VENDA
            const itensVenda = carrinho.map(item => ({
                venda_id: venda.id,
                produto_id: item.produto.id,
                quantidade: item.quantidade,
                preco_unitario: item.produto.preco_venda
            }));

            console.log('📋 Itens da venda preparados:', itensVenda);

            // 6. CRIAR ITENS DA VENDA
            console.log('📦 Inserindo itens da venda...');
            await window.vendasSupabase.criarItensVenda(itensVenda);

            // 7. ATUALIZAR ESTOQUE
            console.log('📊 Atualizando estoque...');
            for (const item of carrinho) {
                const novoEstoque = item.produto.estoque_atual - item.quantidade;
                await window.vendasSupabase.atualizarEstoque(item.produto.id, novoEstoque);
            }

            // 8. MENSAGEM DE SUCESSO
            let mensagem = `✅ Pedido finalizado com sucesso!\n\n`;
            mensagem += `📋 Número do Pedido: ${venda.id}\n`;
            mensagem += `👤 Cliente: ${nomeCliente}\n`;
            mensagem += `💳 Forma de pagamento: ${formaPagamento.value}\n`;
            mensagem += `👨‍💼 Vendedor: ${usuarioAtual.nome}\n\n`;
            mensagem += `🛍️ Itens do pedido:\n`;
            
            carrinho.forEach(item => {
                mensagem += `• ${item.produto.nome} (x${item.quantidade}) - R$ ${(item.produto.preco_venda * item.quantidade).toFixed(2)}\n`;
            });
            
            mensagem += `\n💰 Total: R$ ${total.toFixed(2)}`;

            // Mostrar alerta de sucesso
            alert(mensagem);
            mostrarMensagem('✅ Pedido finalizado com sucesso!', 'success');
            
            // 9. LIMPAR CARRINHO E RECARREGAR
            console.log('🔄 Limpando carrinho...');
            carrinho = [];
            atualizarCarrinho();
            nomeClienteInput.value = '';
            document.querySelectorAll('input[name="pagamento"]').forEach(radio => {
                radio.checked = false;
            });
            
            // 10. RECARREGAR PRODUTOS
            console.log('🔄 Recarregando produtos...');
            await carregarProdutos();
            
        } catch (error) {
            console.error('❌ Erro ao finalizar pedido:', error);
            
            let mensagemErro = 'Erro ao finalizar pedido: ';
            
            if (error.message.includes('usuario') || error.message.includes('conta') || error.message.includes('login')) {
                mensagemErro = error.message;
            } else if (error.message.includes('foreign key') || error.message.includes('usuario_id') || error.message.includes('23503')) {
                mensagemErro = 'Problema com a conta de usuário. Faça login novamente.';
                // Forçar logout em caso de problema de usuário
                setTimeout(() => {
                    mostrarMensagem('Redirecionando para login...', 'warning');
                    setTimeout(() => {
                        window.sistemaAuth.fazerLogout();
                    }, 2000);
                }, 1000);
            } else if (error.message.includes('estoque')) {
                mensagemErro = error.message;
            } else if (error.message.includes('Conflict') || error.message.includes('409') || error.message.includes('23505')) {
                mensagemErro = 'Erro de conflito no banco de dados. Esta venda já pode ter sido processada.';
            } else if (error.message.includes('network') || error.message.includes('connection')) {
                mensagemErro = 'Erro de conexão. Verifique sua internet e tente novamente.';
            } else {
                mensagemErro += error.message;
            }
            
            mostrarMensagem(mensagemErro, 'error');
            
            // Tentar recarregar produtos em caso de erro
            try {
                await carregarProdutos();
            } catch (reloadError) {
                console.error('❌ Erro ao recarregar produtos:', reloadError);
            }
        } finally {
            // Reativar o botão
            finalizarPedidoBtn.disabled = false;
            finalizarPedidoBtn.innerHTML = 'Finalizar Pedido';
        }
    }

    // Função para mostrar mensagens
    function mostrarMensagem(mensagem, tipo = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.style.cssText = `
            padding: 1rem 1.5rem;
            margin-bottom: 1rem;
            border-radius: 8px;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
        `;
        
        // Cores baseadas no tipo
        const cores = {
            success: { bg: '#e8f5e9', color: '#2e7d32', border: '#c8e6c9' },
            error: { bg: '#ffebee', color: '#c62828', border: '#ffcdd2' },
            warning: { bg: '#fff3e0', color: '#ef6c00', border: '#ffe0b2' },
            info: { bg: '#e3f2fd', color: '#1565c0', border: '#bbdefb' }
        };
        
        const cor = cores[tipo] || cores.info;
        alertDiv.style.backgroundColor = cor.bg;
        alertDiv.style.color = cor.color;
        alertDiv.style.border = `1px solid ${cor.border}`;
        
        alertDiv.innerHTML = `
            <div class="alert-content" style="flex: 1; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas ${tipo === 'success' ? 'fa-check' : tipo === 'error' ? 'fa-exclamation-triangle' : tipo === 'warning' ? 'fa-exclamation' : 'fa-info'}"></i>
                <span>${mensagem}</span>
            </div>
            <button class="alert-close" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: inherit; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">&times;</button>
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

    // Função de fallback para carregar produtos exemplo
    function carregarProdutosExemplo() {
        console.log('📦 Carregando produtos de exemplo...');
        
        // Categorias exemplo
        categorias = [
            { id: 1, nome: 'Bolos', icone: 'fa-birthday-cake', ativo: true },
            { id: 2, nome: 'Doces', icone: 'fa-candy-cane', ativo: true },
            { id: 3, nome: 'Salgados', icone: 'fa-pizza-slice', ativo: true }
        ];
        
        // Produtos exemplo
        produtos = [
            {
                id: '1',
                nome: 'Bolo de Chocolate',
                categoria_id: 1,
                preco_venda: 25.00,
                estoque_atual: 10,
                estoque_minimo: 5,
                icone: 'fa-birthday-cake',
                ativo: true,
                categoria: { nome: 'Bolos' }
            },
            {
                id: '2',
                nome: 'Brigadeiro',
                categoria_id: 2,
                preco_venda: 2.50,
                estoque_atual: 50,
                estoque_minimo: 20,
                icone: 'fa-candy-cane',
                ativo: true,
                categoria: { nome: 'Doces' }
            }
        ];
        
        exibirCategorias();
        exibirProdutos();
        mostrarMensagem('Modo demonstração ativado - Dados de exemplo', 'warning');
    }

    // Exportar funções para debug
    window.debugCarrinho = function() {
        console.log('🛒 Debug Carrinho:', {
            itens: carrinho,
            total: carrinho.reduce((sum, item) => sum + (item.produto.preco_venda * item.quantidade), 0),
            quantidadeItens: carrinho.length
        });
    };

    window.limparCarrinho = function() {
        carrinho = [];
        atualizarCarrinho();
        mostrarMensagem('Carrinho limpo', 'info');
    };

    window.verificarUsuario = async function() {
        const usuarioValido = await window.sistemaAuth.verificarUsuarioNoBanco();
        if (usuarioValido) {
            mostrarMensagem('✅ Usuário válido no banco', 'success');
        } else {
            mostrarMensagem('❌ Usuário não encontrado no banco', 'error');
        }
    };
});