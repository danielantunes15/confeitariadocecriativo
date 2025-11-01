// js/vendas-principal.js - Sistema completo de vendas CORRIGIDO
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação
    const usuario = window.sistemaAuth?.verificarAutenticacao();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos do DOM
    const categoriasContainer = document.getElementById('categorias-container');
    const produtosContainer = document.getElementById('produtos-container');
    const carrinhoItens = document.getElementById('carrinho-itens');
    const totalCarrinho = document.getElementById('total-carrinho');
    const finalizarPedidoBtn = document.getElementById('finalizar-pedido');
    const clienteSelect = document.getElementById('cliente-select'); 
    
    // Elementos do novo pagamento
    const adicionarPagamentoBtn = document.getElementById('adicionar-pagamento-btn');
    const tipoPagamentoMisto = document.getElementById('tipo-pagamento-misto');
    const valorPagamentoMisto = document.getElementById('valor-pagamento-misto');
    const pagamentosAdicionadosContainer = document.getElementById('pagamentos-adicionados-container');
    const saldoPendenteMisto = document.getElementById('saldo-pendente-misto');
    const mensagemPagamentosIniciais = document.getElementById('mensagem-pagamentos-iniciais');
    
    // Variáveis globais
    let categorias = [];
    let produtos = [];
    let clientes = [];
    let carrinho = [];
    let pagamentos = []; // NOVO: Array para armazenar múltiplos pagamentos
    let categoriaSelecionada = 'todos';
    
    // Funções auxiliares globais
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    const formatarFormaPagamento = (forma) => {
        const formas = {
            'dinheiro': 'Dinheiro',
            'cartao_debito': 'Cartão Débito',
            'cartao_credito': 'Cartão Crédito',
            'pix': 'PIX',
            'misto': 'Misto'
        };
        return formas[forma] || forma;
    };

    const mostrarMensagem = (mensagem, tipo = 'info') => {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) {
            console.error('Container de alertas não encontrado');
            return;
        }
        // ... (restante da função mostrarMensagem)
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
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
                <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : tipo === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                <span>${mensagem}</span>
            </div>
            <button class="alert-close" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: inherit; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">&times;</button>
        `;
        alertContainer.appendChild(alertDiv);
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
        alertDiv.querySelector('.alert-close').addEventListener('click', () => alertDiv.remove());
    };

    const adicionarAoCarrinho = (produto) => {
        const itemExistente = carrinho.find(item => item.produto.id === produto.id);
        if (itemExistente) {
            if (itemExistente.quantidade < produto.estoque_atual) {
                itemExistente.quantidade += 1;
            } else {
                mostrarMensagem(`Estoque insuficiente para ${produto.nome}. Máximo: ${produto.estoque_atual}`, 'error');
                return;
            }
        } else {
            if (produto.estoque_atual > 0) {
                carrinho.push({ produto: produto, quantidade: 1 });
            } else {
                mostrarMensagem(`Produto ${produto.nome} sem estoque disponível.`, 'error');
                return;
            }
        }
        atualizarCarrinho();
        mostrarMensagem(`${produto.nome} adicionado ao carrinho!`, 'success');
    };
    
    // Calcula o total do carrinho
    const getCartTotal = () => {
        return carrinho.reduce((sum, item) => sum + (item.produto.preco_venda * item.quantidade), 0);
    };
    
    // Calcula o total já pago
    const getPaidTotal = () => {
        return pagamentos.reduce((sum, p) => sum + p.valor, 0);
    };

    const atualizarCarrinho = () => {
        const total = getCartTotal();

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
            carrinho.forEach((item, index) => {
                const itemSubtotal = item.produto.preco_venda * item.quantidade;
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
            totalCarrinho.textContent = total.toFixed(2);
            finalizarPedidoBtn.disabled = false;
            document.querySelectorAll('.btn-remover').forEach(btn => btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                removerDoCarrinho(index);
            }));
            document.querySelectorAll('.btn-adicionar-carrinho').forEach(btn => btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                aumentarQuantidade(index);
            }));
        }
        
        // NOVO: Atualiza a seção de pagamentos
        atualizarPagamentosMistos();
    };

    const removerDoCarrinho = (index) => {
        const produtoNome = carrinho[index].produto.nome;
        if (carrinho[index].quantidade > 1) {
            carrinho[index].quantidade -= 1;
        } else {
            carrinho.splice(index, 1);
        }
        atualizarCarrinho();
        mostrarMensagem(`${produtoNome} removido do carrinho.`, 'info');
    };

    const aumentarQuantidade = (index) => {
        if (carrinho[index].quantidade < produtos.find(p => p.id === carrinho[index].produto.id).estoque_atual) {
            carrinho[index].quantidade += 1;
            atualizarCarrinho();
        } else {
            mostrarMensagem(`Estoque insuficiente. Máximo: ${produtos.find(p => p.id === carrinho[index].produto.id).estoque_atual}`, 'error');
        }
    };

    // --- NOVO: FUNÇÕES DE PAGAMENTO MISTO ---
    
    function atualizarPagamentosMistos() {
        const total = getCartTotal();
        const pago = getPaidTotal();
        const saldo = total - pago;
        
        saldoPendenteMisto.textContent = `Saldo a Pagar: ${formatarMoeda(saldo)}`;
        saldoPendenteMisto.classList.toggle('saldo-ok', saldo <= 0);
        
        pagamentosAdicionadosContainer.innerHTML = '';
        
        if (pagamentos.length === 0) {
            pagamentosAdicionadosContainer.innerHTML = `<p style="text-align: center; color: var(--text-light);" id="mensagem-pagamentos-iniciais">Use a seção abaixo para adicionar uma ou mais formas de pagamento.</p>`;
        } else {
            pagamentos.forEach((p, index) => {
                const item = document.createElement('div');
                item.className = 'pagamento-detalhe-item';
                item.innerHTML = `
                    <span>${formatarFormaPagamento(p.tipo)}</span>
                    <span class="valor">${formatarMoeda(p.valor)}</span>
                    <button class="btn-remover-pagamento" data-index="${index}" title="Remover">
                        <i class="fas fa-times-circle"></i>
                    </button>
                `;
                pagamentosAdicionadosContainer.appendChild(item);
            });
            
            // Adiciona evento de remoção
            document.querySelectorAll('.btn-remover-pagamento').forEach(btn => {
                btn.addEventListener('click', function() {
                    removerPagamento(parseInt(this.getAttribute('data-index')));
                });
            });
        }
        
        // Pré-preenche o campo de valor com o saldo pendente (ou zero)
        valorPagamentoMisto.value = Math.max(0, saldo).toFixed(2);
        
        // Habilita/Desabilita o botão finalizar
        finalizarPedidoBtn.disabled = saldo !== 0 || total === 0;
        
        // Se o total for zero, desabilita a adição de pagamentos
        adicionarPagamentoBtn.disabled = total === 0;
    }
    
    function adicionarPagamento() {
        const total = getCartTotal();
        const pago = getPaidTotal();
        const saldo = total - pago;
        
        if (total === 0) {
            mostrarMensagem('O carrinho está vazio. Adicione produtos antes de adicionar o pagamento.', 'error');
            return;
        }

        const tipo = tipoPagamentoMisto.value;
        const valor = parseFloat(valorPagamentoMisto.value);

        if (isNaN(valor) || valor <= 0) {
            mostrarMensagem('Insira um valor de pagamento válido.', 'error');
            return;
        }
        
        if (pago + valor > total) {
            mostrarMensagem(`O valor excede o total do pedido. Saldo restante: ${formatarMoeda(saldo)}.`, 'error');
            return;
        }

        pagamentos.push({ tipo, valor });
        atualizarCarrinho(); // Chama a atualização do UI e saldo
        mostrarMensagem(`${formatarMoeda(valor)} em ${formatarFormaPagamento(tipo)} adicionado.`, 'success');
    }
    
    function removerPagamento(index) {
        if (index >= 0 && index < pagamentos.length) {
            const pagamentoRemovido = pagamentos.splice(index, 1)[0];
            mostrarMensagem(`${formatarMoeda(pagamentoRemovido.valor)} em ${formatarFormaPagamento(pagamentoRemovido.tipo)} removido.`, 'info');
            atualizarCarrinho();
        }
    }
    
    // --- FUNÇÕES DE CARREGAMENTO (inalteradas) ---
    // ... (carregarCategorias, exibirCategorias, selecionarCategoria, carregarProdutos, exibirProdutos, carregarClientes, exibirClientesNaLista)
    
    const carregarCategorias = async () => {
        try {
            categorias = await window.vendasSupabase.buscarCategorias();
            exibirCategorias();
        } catch (error) {
            console.error('❌ Erro ao carregar categorias:', error);
            throw error;
        }
    };

    const exibirCategorias = () => {
        if (!categoriasContainer) return;
        categoriasContainer.innerHTML = '';
        const categoriaTodos = document.createElement('button');
        categoriaTodos.className = `categoria-btn ${categoriaSelecionada === 'todos' ? 'active' : ''}`;
        categoriaTodos.setAttribute('data-categoria', 'todos');
        categoriaTodos.innerHTML = `<i class="fas fa-th-large"></i><span>Todos</span>`;
        categoriaTodos.addEventListener('click', () => selecionarCategoria('todos'));
        categoriasContainer.appendChild(categoriaTodos);
        categorias.forEach(categoria => {
            const categoriaBtn = document.createElement('button');
            categoriaBtn.className = `categoria-btn ${categoriaSelecionada === categoria.id ? 'active' : ''}`;
            categoriaBtn.setAttribute('data-categoria', categoria.id);
            categoriaBtn.innerHTML = `<i class="fas ${categoria.icone || 'fa-tag'}"></i><span>${categoria.nome}</span>`;
            categoriaBtn.addEventListener('click', () => selecionarCategoria(categoria.id));
            categoriasContainer.appendChild(categoriaBtn);
        });
    };
    
    const selecionarCategoria = (categoriaId) => {
        categoriaSelecionada = categoriaId;
        document.querySelectorAll('.categoria-btn').forEach(botao => {
            if (botao.getAttribute('data-categoria') === categoriaId) {
                botao.classList.add('active');
            } else {
                botao.classList.remove('active');
            }
        });
        exibirProdutos();
    };

    const carregarProdutos = async () => {
        try {
            produtos = await window.vendasSupabase.buscarProdutos();
            exibirProdutos();
        } catch (error) {
            console.error('❌ Erro ao carregar produtos:', error);
            throw error;
        }
    };

    const exibirProdutos = () => {
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
                    ${produto.estoque_atual > 0 && produto.estoque_atual <= produto.estoque_minimo ? '<div class="low-stock-badge">ESTOQUE BAIXO</div>' : ''}
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
    };

    const carregarClientes = async () => {
        try {
            clientes = await window.vendasSupabase.buscarClientes();
            exibirClientesNaLista();
        } catch (error) {
            console.error('❌ Erro ao carregar clientes:', error);
            clientes = [];
        }
    };
    
    const exibirClientesNaLista = () => {
        if (!clienteSelect) return;
        
        clienteSelect.innerHTML = '';
        const optionDefault = document.createElement('option');
        optionDefault.value = '';
        optionDefault.textContent = 'Cliente sem cadastro';
        optionDefault.dataset.nome = 'Cliente sem cadastro';
        clienteSelect.appendChild(optionDefault);
        
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome;
            option.dataset.nome = cliente.nome;
            clienteSelect.appendChild(option);
        });
    };

    const finalizarPedido = async () => {
        const total = getCartTotal();
        const pago = getPaidTotal();

        if (carrinho.length === 0) {
            mostrarMensagem('Adicione produtos ao carrinho antes de finalizar o pedido.', 'error');
            return;
        }
        
        if (pagamentos.length === 0) {
             mostrarMensagem('Adicione pelo menos uma forma de pagamento.', 'error');
            return;
        }

        if (pago < total) {
             mostrarMensagem(`O valor pago (${formatarMoeda(pago)}) é menor que o total do pedido (${formatarMoeda(total)}). Ajuste o pagamento.`, 'error');
            return;
        }
        
        const clienteId = clienteSelect.value || null;
        const clienteNome = clienteSelect.options[clienteSelect.selectedIndex].dataset.nome;
        
        const formaPagamento = pagamentos.length > 1 ? 'misto' : pagamentos[0].tipo;

        if (!confirm(`Deseja finalizar o pedido com ${carrinho.length} item(s)?\n\nCliente: ${clienteNome}\nForma de pagamento: ${formaPagamento.toUpperCase()}\n\nTotal: ${formatarMoeda(total)}`)) {
            return;
        }
        
        try {
            mostrarMensagem('Processando pedido...', 'info');
            finalizarPedidoBtn.disabled = true;
            finalizarPedidoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

            const usuarioValido = await window.sistemaAuth?.verificarUsuarioNoBanco();
            if (!usuarioValido) {
                const sincronizado = await window.sistemaAuth?.sincronizarUsuario();
                if (!sincronizado) {
                    throw new Error('Problema com a conta de usuário. Faça login novamente.');
                }
            }

            for (const item of carrinho) {
                await window.vendasSupabase.verificarEstoque(item.produto.id, item.quantidade);
            }

            const usuarioAtual = window.sistemaAuth.usuarioLogado;
            
            // NOVO: Criar observação detalhada do pagamento misto
            let observacoesPagamento = pagamentos.length > 1 ? 'Pagamento MISTO DETALHES:\n' : '';
            pagamentos.forEach(p => {
                observacoesPagamento += `• ${formatarFormaPagamento(p.tipo)}: ${formatarMoeda(p.valor)}\n`;
            });
            if (pago > total) {
                 observacoesPagamento += `\nTROCO: ${formatarMoeda(pago - total)}`;
            }

            const vendaData = {
                data_venda: new Date().toISOString().split('T')[0],
                cliente: clienteNome,
                cliente_id: clienteId, 
                total: total,
                forma_pagamento: formaPagamento, // 'dinheiro', 'pix', 'misto', etc.
                observacoes: observacoesPagamento,
                usuario_id: usuarioAtual.id
            };

            const venda = await window.vendasSupabase.criarVenda(vendaData);
            if (!venda || !venda.id) {
                throw new Error('Falha ao criar venda - ID não retornado');
            }

            const itensVenda = carrinho.map(item => ({
                venda_id: venda.id,
                produto_id: item.produto.id,
                quantidade: item.quantidade,
                preco_unitario: item.produto.preco_venda
            }));

            await window.vendasSupabase.criarItensVenda(itensVenda);

            for (const item of carrinho) {
                const novoEstoque = item.produto.estoque_atual - item.quantidade;
                await window.vendasSupabase.atualizarEstoque(item.produto.id, novoEstoque);
            }

            let mensagem = `✅ Pedido finalizado com sucesso!\n\n`;
            mensagem += `📋 Número do Pedido: ${venda.id}\n`;
            mensagem += `👤 Cliente: ${clienteNome}\n`;
            mensagem += `💳 Pagamento: ${formaPagamento.toUpperCase()}\n`;
            mensagem += observacoesPagamento;
            mensagem += `\n💰 Total: ${formatarMoeda(total)}`;
            alert(mensagem);
            mostrarMensagem('✅ Pedido finalizado com sucesso!', 'success');
            
            // Resetar
            carrinho = [];
            pagamentos = []; // Resetar pagamentos
            atualizarCarrinho();
            clienteSelect.value = '';
            
            await carregarProdutos();
            
        } catch (error) {
            console.error('❌ Erro ao finalizar pedido:', error);
            let mensagemErro = 'Erro ao finalizar pedido: ';
            if (error.message.includes('usuario') || error.message.includes('conta')) {
                mensagemErro = 'Problema com a conta de usuário. Faça login novamente.';
                setTimeout(() => { mostrarMensagem('Redirecionando para login...', 'warning'); setTimeout(() => window.sistemaAuth.fazerLogout(), 2000); }, 1000);
            } else if (error.message.includes('estoque')) {
                mensagemErro = error.message;
            } else {
                mensagemErro += error.message;
            }
            mostrarMensagem(mensagemErro, 'error');
            try { await carregarProdutos(); } catch (reloadError) { console.error('❌ Erro ao recarregar produtos:', reloadError); }
        } finally {
            finalizarPedidoBtn.disabled = false;
            finalizarPedidoBtn.innerHTML = 'Finalizar Pedido';
        }
    };
    
    // Configura os event listeners
    const configurarEventListeners = () => {
        if (finalizarPedidoBtn) finalizarPedidoBtn.addEventListener('click', finalizarPedido);
        document.getElementById('logout-btn')?.addEventListener('click', () => window.sistemaAuth.fazerLogout());
        
        // NOVO: Evento para adicionar pagamento
        if (adicionarPagamentoBtn) adicionarPagamentoBtn.addEventListener('click', adicionarPagamento);
    };

    // Função de inicialização
    (async function() {
        const usuario = window.sistemaAuth?.verificarAutenticacao();
        if (!usuario) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const conexaoOk = await window.vendasSupabase.testarConexao();
            if (!conexaoOk) throw new Error('Não foi possível conectar ao banco de dados');

            const usuarioValido = await window.sistemaAuth.verificarUsuarioNoBanco();
            if (!usuarioValido) await window.sistemaAuth.sincronizarUsuario();

            await carregarCategorias();
            await carregarProdutos();
            await carregarClientes();
            configurarEventListeners();
            atualizarCarrinho();

            console.log('✅ Sistema de vendas inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            mostrarMensagem('Erro ao carregar o sistema: ' + error.message, 'error');
        }
    })();
});