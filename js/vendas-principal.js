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
    
    // Elementos de Desconto/Acréscimo (NOVOS)
    const tipoAjusteSelect = document.getElementById('tipo-ajuste');
    const valorAjusteInput = document.getElementById('valor-ajuste');
    const aplicarAjusteBtn = document.getElementById('aplicar-ajuste-btn');
    const totalAjustadoSpan = document.getElementById('valor-total-ajustado');
    
    // Variáveis globais
    let categorias = [];
    let produtos = [];
    let clientes = [];
    let carrinho = [];
    let pagamentos = []; 
    let categoriaSelecionada = 'todos';
    
    // NOVO ESTADO GLOBAL DE AJUSTE
    let ajusteTipo = 'desconto'; // 'desconto' ou 'acrescimo'
    let ajustePercentual = 0;

    // Funções auxiliares globais
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    const formatarFormaPagamento = (forma) => {
        const formas = {
            'dinheiro': 'Dinheiro',
            'cartao_debito': 'Cartão Débito',
            'cartao_credito': 'Cartão Crédito',
            'pix': 'PIX',
            'crediario': 'Crediário', // NOVO: Crediario
            'misto': 'Misto'
        };
        return formas[forma] || forma;
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
    
    // NOVO: Calcula o total BRUTO do carrinho
    const getGrossTotal = () => {
        return carrinho.reduce((sum, item) => sum + (item.produto.preco_venda * item.quantidade), 0);
    };
    
    // NOVO: Calcula o total AJUSTADO (final)
    const getAdjustedTotal = () => {
        const grossTotal = getGrossTotal();
        const percentual = ajustePercentual / 100;
        let finalTotal = grossTotal;

        if (ajusteTipo === 'desconto') {
            finalTotal = grossTotal * (1 - percentual);
        } else if (ajusteTipo === 'acrescimo') {
            finalTotal = grossTotal * (1 + percentual);
        }

        return parseFloat(Math.max(0, finalTotal).toFixed(2)); // Garante que o total não seja negativo e tenha 2 casas decimais
    };
    
    // Calcula o total já pago
    const getPaidTotal = () => {
        return pagamentos.reduce((sum, p) => sum + p.valor, 0);
    };

    const atualizarCarrinho = () => {
        const grossTotal = getGrossTotal();
        const adjustedTotal = getAdjustedTotal();

        if (carrinho.length === 0) {
            carrinhoItens.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Seu carrinho está vazio</p>
                </div>
            `;
            totalCarrinho.textContent = '0,00';
            totalAjustadoSpan.textContent = 'R$ 0,00';
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
            totalCarrinho.textContent = grossTotal.toFixed(2);
            finalizarPedidoBtn.disabled = false;
            document.querySelectorAll('.btn-remover').forEach(btn => btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                removerDoCarrinho(index);
            }));
            document.querySelectorAll('.btn-adicionar-carrinho').forEach(btn => btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                aumentarQuantidade(index);
            }));

            // NOVO: Atualiza o total ajustado
            totalAjustadoSpan.textContent = formatarMoeda(adjustedTotal);
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
        // Limpar pagamentos e resetar ajuste se o total mudar
        pagamentos = [];
        ajustePercentual = 0;
        valorAjusteInput.value = 0;
        ajusteTipo = 'desconto';
        tipoAjusteSelect.value = 'desconto';
        
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

    // --- NOVO: FUNÇÕES DE AJUSTE (DESCONTO/ACRÉSCIMO) ---
    
    function aplicarAjuste() {
        const valor = parseFloat(valorAjusteInput.value) || 0;
        const tipo = tipoAjusteSelect.value;
        const grossTotal = getGrossTotal();

        if (valor < 0 || valor > 100) {
            mostrarMensagem('O percentual deve ser entre 0 e 100.', 'error');
            return;
        }
        
        if (grossTotal === 0 && valor > 0) {
             mostrarMensagem('Adicione produtos ao carrinho antes de aplicar ajustes.', 'error');
            return;
        }

        ajusteTipo = tipo;
        ajustePercentual = valor;
        
        // Limpar pagamentos, pois o total mudou
        pagamentos = []; 

        const adjustedTotal = getAdjustedTotal();
        const diff = adjustedTotal - grossTotal;

        mostrarMensagem(`${tipo === 'desconto' ? 'Desconto' : 'Acréscimo'} de ${valor}% aplicado. Ajuste: ${formatarMoeda(diff)}`, 'success');
        
        atualizarCarrinho();
    }
    
    // --- FUNÇÕES DE PAGAMENTO MISTO ---
    
    function atualizarPagamentosMistos() {
        const total = getAdjustedTotal(); // Usa o total AJUSTADO
        const pago = getPaidTotal();
        const saldo = parseFloat((total - pago).toFixed(2));
        
        saldoPendenteMisto.textContent = `Saldo a Pagar: ${formatarMoeda(saldo)}`;
        saldoPendenteMisto.classList.toggle('saldo-ok', saldo === 0);
        
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
        const total = getAdjustedTotal();
        const pago = getPaidTotal();
        const saldo = parseFloat((total - pago).toFixed(2));
        
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
        
        const novoTotalPago = parseFloat((pago + valor).toFixed(2));

        if (tipo === 'crediario' && novoTotalPago > total) {
             // Crediário DEVE ser o valor exato (ou menor, mas nunca mais para não gerar troco)
             mostrarMensagem(`O Crediário deve ser pago no valor exato do saldo pendente: ${formatarMoeda(saldo)}.`, 'error');
             return;
        }

        if (novoTotalPago > total + 0.01 && tipo !== 'crediario') { 
            // Permite pagar um pouco a mais (0.01) para troco em dinheiro/pix, se não for crediário
            mostrarMensagem(`Aviso: O valor excede o total do pedido. Será calculado o troco.`, 'warning');
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
    
    // ... (carregarCategorias, exibirCategorias, selecionarCategoria, carregarProdutos, exibirProdutos, carregarClientes, exibirClientesNaLista inalteradas)

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
        const total = getAdjustedTotal();
        const pago = getPaidTotal();
        const grossTotal = getGrossTotal();

        if (carrinho.length === 0) {
            mostrarMensagem('Adicione produtos ao carrinho antes de finalizar o pedido.', 'error');
            return;
        }
        
        if (pagamentos.length === 0) {
             mostrarMensagem('Adicione pelo menos uma forma de pagamento.', 'error');
            return;
        }
        
        // Verifica se há crediário sem pagamento total
        const hasCrediario = pagamentos.some(p => p.tipo === 'crediario');
        if (hasCrediario && pago > 0.01) {
            mostrarMensagem('Não é possível registrar pagamento misto junto com Crediário. Use Crediário como pagamento único ou zere o pagamento.', 'error');
            return;
        }

        if (pago < total) {
             mostrarMensagem(`O valor pago (${formatarMoeda(pago)}) é menor que o total do pedido (${formatarMoeda(total)}). Ajuste o pagamento.`, 'error');
            return;
        }
        
        const clienteId = clienteSelect.value || null;
        const clienteNome = clienteSelect.options[clienteSelect.selectedIndex].dataset.nome;
        
        const formaPagamento = pagamentos.length > 1 ? 'misto' : pagamentos[0].tipo;
        const troco = Math.max(0, pago - total);

        if (!confirm(`Deseja finalizar o pedido com ${carrinho.length} item(s)?\n\nCliente: ${clienteNome}\nForma de pagamento: ${formaPagamento.toUpperCase()}\nTotal Final: ${formatarMoeda(total)}\nTroco: ${formatarMoeda(troco)}`)) {
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
            
            // NOVO: Criar observação detalhada do ajuste e pagamento
            let observacoesVenda = '';
            
            if (ajustePercentual > 0) {
                 observacoesVenda += `AJUSTE: ${ajusteTipo === 'desconto' ? 'Desconto' : 'Acréscimo'} de ${ajustePercentual}% (${formatarMoeda(total - grossTotal)}) \n`;
                 observacoesVenda += `Total Bruto: ${formatarMoeda(grossTotal)}\n`;
                 observacoesVenda += `Total Ajustado: ${formatarMoeda(total)}\n`;
            }
            
            if (pagamentos.length > 1 || troco > 0) {
                 observacoesVenda += `\nPAGAMENTO DETALHADO:\n`;
                 pagamentos.forEach(p => {
                    observacoesVenda += `• ${formatarFormaPagamento(p.tipo)}: ${formatarMoeda(p.valor)}\n`;
                 });
                 if (troco > 0) {
                     observacoesVenda += `\nTROCO DEVIDO: ${formatarMoeda(troco)}`;
                 }
            }
            
            // Crediário não deve registrar valor no caixa imediatamente
            const valorTotalParaCaixa = pagamentos.filter(p => p.tipo !== 'crediario').reduce((sum, p) => sum + p.valor, 0) - troco;
            
            // Se for crediário, o total da venda deve ser 0 para o caixa, ou o valor pago se houver troco
            const totalParaRegistroCaixa = formaPagamento === 'crediario' ? 0.00 : total; 

            const vendaData = {
                data_venda: new Date().toISOString().split('T')[0],
                cliente: clienteNome,
                cliente_id: clienteId, 
                total: totalParaRegistroCaixa, // Total para fins de CAIXA
                forma_pagamento: formaPagamento, 
                observacoes: observacoesVenda,
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
            mensagem += `💰 Total Final: ${formatarMoeda(total)}\n`;
            if (ajustePercentual > 0) {
                 mensagem += `\n(${ajusteTipo === 'desconto' ? 'Desconto' : 'Acréscimo'} de ${ajustePercentual}%)`;
            }
            mensagem += `\nDetalhes de Pagamento:\n${observacoesVenda}`;
            
            alert(mensagem);
            mostrarMensagem('✅ Pedido finalizado com sucesso!', 'success');
            
            // Resetar
            carrinho = [];
            pagamentos = []; 
            ajustePercentual = 0;
            valorAjusteInput.value = 0;
            ajusteTipo = 'desconto';
            tipoAjusteSelect.value = 'desconto';

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
        
        // Evento para aplicar Desconto/Acréscimo
        if (aplicarAjusteBtn) aplicarAjusteBtn.addEventListener('click', aplicarAjuste);
        
        // Evento para adicionar pagamento
        if (adicionarPagamentoBtn) adicionarPagamentoBtn.addEventListener('click', adicionarPagamento);
        
        // Atualiza ajusteTipo ao trocar o select
        if (tipoAjusteSelect) tipoAjusteSelect.addEventListener('change', () => { ajusteTipo = tipoAjusteSelect.value; atualizarCarrinho(); });
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