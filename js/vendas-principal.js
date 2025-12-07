// js/vendas-principal.js - Sistema completo de vendas CORRIGIDO
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação
    const usuario = window.sistemaAuth?.verificarAutenticacao();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // Variáveis globais (Movidas para o topo para garantir a inicialização)
    let categorias = [];
    let produtos = [];
    let clientes = [];
    let carrinho = [];
    let pagamentos = []; 
    let categoriaSelecionada = 'todos'; 
    
    // NOVO ESTADO GLOBAL DE AJUSTE (Desconto/Acréscimo)
    let descontoPercentual = 0; 
    let acrescimoPercentual = 0; 
    let descontoValorFixo = 0; 
    let acrescimoValorFixo = 0; 
    let descontoTipo = 'percentual'; 
    let acrescimoTipo = 'percentual'; 

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
    
    // Elementos de Desconto/Acréscimo (NOVOS)
    const descontoTipoSelect = document.getElementById('desconto-tipo');
    const descontoInput = document.getElementById('desconto-input');
    const acrescimoTipoSelect = document.getElementById('acrescimo-tipo');
    const acrescimoInput = document.getElementById('acrescimo-input');
    const aplicarAjusteBtn = document.getElementById('aplicar-ajuste-btn');
    const totalAjustadoSpan = document.getElementById('valor-total-ajustado');
    const totalAjustadoP = document.getElementById('total-ajustado'); 


    // Funções auxiliares globais
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    // Definição da função mostrarMensagem
    const mostrarMensagem = (mensagem, tipo = 'success') => {
        const container = document.getElementById('alert-container');
        if (!container) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.innerHTML = `<span>${mensagem}</span><button class="alert-close" onclick="this.parentElement.remove()">&times;</button>`;
        container.appendChild(alertDiv);
        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
    };

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
    
    // LÓGICA REESCRITA PARA VALOR OU PERCENTUAL
    const getAdjustedTotal = () => {
        const grossTotal = getGrossTotal();
        let finalTotal = grossTotal;

        // 1. Aplica o Desconto
        if (descontoTipo === 'valor') {
            finalTotal = finalTotal - descontoValorFixo;
        } else if (descontoTipo === 'percentual' && descontoPercentual > 0) {
            const desconto = descontoPercentual / 100;
            finalTotal = finalTotal * (1 - desconto);
        }

        // Garante que o subtotal não seja negativo após o desconto
        finalTotal = Math.max(0, finalTotal); 

        // 2. Aplica o Acréscimo
        if (acrescimoTipo === 'valor') {
            finalTotal = finalTotal + acrescimoValorFixo;
        } else if (acrescimoTipo === 'percentual' && acrescimoPercentual > 0) {
            const acrescimo = acrescimoPercentual / 100;
            finalTotal = finalTotal * (1 + acrescimo);
        }

        return parseFloat(finalTotal.toFixed(2)); // Garante 2 casas decimais
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
            // Reseta o resumo
            if (totalAjustadoP) totalAjustadoP.innerHTML = `<strong>Total Final:</strong> R$ <span id="valor-total-ajustado">0,00</span>`;
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
            
            // ATUALIZAÇÃO DO RESUMO DETALHADO (Para resolver o layout estranho)
            
            const hasAdjustment = (descontoTipo === 'valor' && descontoValorFixo > 0) || (descontoTipo === 'percentual' && descontoPercentual > 0) || 
                                  (acrescimoTipo === 'valor' && acrescimoValorFixo > 0) || (acrescimoTipo === 'percentual' && acrescimoPercentual > 0);
            
            // Recálculo do valor de ajuste absoluto para exibição
            // Nota: Este cálculo é complexo devido à ordem de aplicação (Desconto primeiro, Acréscimo depois).
            const valorDescontoAbsoluto = grossTotal - (descontoTipo === 'valor' ? (grossTotal - descontoValorFixo) : (grossTotal * (1 - descontoPercentual / 100)));
            const subtotalAposDesconto = grossTotal - valorDescontoAbsoluto;
            const valorAcrescimoAbsoluto = adjustedTotal - subtotalAposDesconto;

            if (hasAdjustment) {
                let htmlDetalhe = '';
                
                // DESCONTO
                if (valorDescontoAbsoluto > 0.01) { // Verifica se há desconto significativo
                    const valorDisplay = descontoTipo === 'valor' ? formatarMoeda(descontoValorFixo) : `${descontoPercentual}%`;
                    const valorDeducao = descontoTipo === 'valor' ? descontoValorFixo : grossTotal * (descontoPercentual / 100);

                    htmlDetalhe += `<p class="ajuste-item-detalhe desconto-valor">
                                        <span>Desconto (${valorDisplay}):</span>
                                        <span class="valor">- ${formatarMoeda(valorDeducao)}</span>
                                    </p>`;
                }
                
                // ACRÉSCIMO
                if (valorAcrescimoAbsoluto > 0.01) { // Verifica se há acréscimo significativo
                    const valorDisplay = acrescimoTipo === 'valor' ? formatarMoeda(acrescimoValorFixo) : `${acrescimoPercentual}%`;
                    const valorAdicao = acrescimoTipo === 'valor' ? acrescimoValorFixo : subtotalAposDesconto * (acrescimoPercentual / 100);

                    htmlDetalhe += `<p class="ajuste-item-detalhe acrescimo-valor">
                                        <span>Acréscimo (${valorDisplay}):</span>
                                        <span class="valor">+ ${formatarMoeda(valorAdicao)}</span>
                                    </p>`;
                }
                
                // CONTEÚDO DETALHADO INJETANDO HTML
                const summaryHTML = `
                    <div id="ajuste-detalhe-resumo" class="ajuste-resumo-card">
                        <p class="ajuste-item-detalhe">
                            <span style="font-weight: bold;">Total Bruto:</span> 
                            <span class="valor-bruto">${formatarMoeda(grossTotal)}</span>
                        </p>
                        ${htmlDetalhe}
                        <p class="ajuste-item-detalhe total-final">
                            <span style="font-weight: bold;">Total Final:</span> 
                            <span id="valor-total-ajustado" class="valor-final">${adjustedTotal.toFixed(2).replace('.', ',')}</span>
                        </p>
                    </div>
                `;
                if (totalAjustadoP) totalAjustadoP.innerHTML = summaryHTML;

            } else {
                 // CONTEÚDO PADRÃO (sem ajuste)
                 if (totalAjustadoP) {
                     totalAjustadoP.innerHTML = `
                         <strong>Total Final:</strong> R$ <span id="valor-total-ajustado">${adjustedTotal.toFixed(2).replace('.', ',')}</span>
                     `;
                 }
            }
            
            // Atualiza o total principal do carrinho com o valor AJUSTADO (o valor que o cliente realmente paga)
            totalCarrinho.textContent = adjustedTotal.toFixed(2).replace('.', ',');
            finalizarPedidoBtn.disabled = false;
            document.querySelectorAll('.btn-remover').forEach(btn => btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                removerDoCarrinho(index);
            }));
            document.querySelectorAll('.btn-adicionar-carrinho').forEach(btn => btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                aumentarQuantidade(index);
            }));

            // Atualiza o total ajustado (este é apenas o valor final que a atendente vê)
            if (totalAjustadoSpan) totalAjustadoSpan.textContent = formatarMoeda(adjustedTotal);
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
        
        // REINICIA TODOS OS PARÂMETROS GLOBAIS DE AJUSTE
        descontoPercentual = acrescimoPercentual = descontoValorFixo = acrescimoValorFixo = 0;
        descontoTipo = acrescimoTipo = 'percentual';
        
        if (descontoInput) descontoInput.value = 0;
        if (acrescimoInput) acrescimoInput.value = 0;
        if (descontoTipoSelect) descontoTipoSelect.value = 'percentual';
        if (acrescimoTipoSelect) acrescimoTipoSelect.value = 'percentual';
        
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

    // --- FUNÇÕES DE AJUSTE (DESCONTO/ACRÉSCIMO) ---
    
    function aplicarAjuste() {
        const grossTotal = getGrossTotal();
        
        // 1. LER E VALIDAR DESCONTO
        const descontoRaw = parseFloat(descontoInput.value) || 0;
        const descontoType = descontoTipoSelect.value;
        
        if (descontoType === 'percentual' && (descontoRaw < 0 || descontoRaw > 100)) {
            mostrarMensagem('O percentual de desconto deve ser entre 0 e 100.', 'error');
            return;
        }
        if (descontoType === 'valor' && descontoRaw > grossTotal) {
            mostrarMensagem('O desconto em valor (R$) não pode ser maior que o Total Bruto.', 'error');
            return;
        }

        // 2. LER E VALIDAR ACRÉSCIMO
        const acrescimoRaw = parseFloat(acrescimoInput.value) || 0;
        const acrescimoType = acrescimoTipoSelect.value;
        
        if (acrescimoType === 'percentual' && (acrescimoRaw < 0 || acrescimoRaw > 100)) {
            mostrarMensagem('O percentual de acréscimo deve ser entre 0 e 100.', 'error');
            return;
        }

        // 3. ATUALIZAR ESTADOS GLOBAIS
        if (descontoType === 'percentual') {
            descontoPercentual = descontoRaw;
            descontoValorFixo = 0;
        } else {
            descontoPercentual = 0;
            descontoValorFixo = descontoRaw;
        }
        descontoTipo = descontoType;
        
        if (acrescimoType === 'percentual') {
            acrescimoPercentual = acrescimoRaw;
            acrescimoValorFixo = 0;
        } else {
            acrescimoPercentual = 0;
            acrescimoValorFixo = acrescimoRaw;
        }
        acrescimoTipo = acrescimoType;


        if (grossTotal === 0 && (descontoRaw > 0 || acrescimoRaw > 0)) {
             mostrarMensagem('Adicione produtos ao carrinho antes de aplicar ajustes.', 'error');
             // Reseta o estado global se o carrinho estiver vazio
             descontoPercentual = acrescimoPercentual = descontoValorFixo = acrescimoValorFixo = 0;
             return;
        }

        // Limpar pagamentos, pois o total mudou
        pagamentos = []; 

        const adjustedTotal = getAdjustedTotal();
        const ajusteTotal = adjustedTotal - grossTotal; 

        mostrarMensagem(`Ajustes aplicados. Diferença total: ${formatarMoeda(ajusteTotal)}`, 'success');
        
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

        // --- CORREÇÃO APLICADA AQUI: Permite valor >= 0, pois o problema de Crediário será resolvido no finalizePedido
        if (isNaN(valor) || (valor < 0)) { 
            mostrarMensagem('Insira um valor de pagamento válido.', 'error');
            return;
        }
        // -----------------------------------------------------------------------
        
        const novoTotalPago = parseFloat((pago + valor).toFixed(2));
        
        // VERIFICAÇÃO DE CREDÍARIO (TRANSFERIDA DE finalizePedido para aqui)
        if (tipo === 'crediario' && !clienteSelect.value) {
            mostrarMensagem('Ao usar Crediário, é obrigatório selecionar um cliente cadastrado!', 'error');
            return;
        }
        // FIM DA VALIDAÇÃO CREDÍARIO

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
    
    // ... (restante das funções de carregamento e exibição)

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
            
            // ================================================================
            // === INÍCIO DA CORREÇÃO (Onde a mágica acontece) ===
            // ================================================================
            
            // Lógica para decidir se usa <img> (Base64) ou <i> (Ícone)
            let imagemHtml = '';
            if (produto.icone && (produto.icone.startsWith('data:image') || produto.icone.startsWith('http'))) {
                // É uma imagem Base64 ou URL
                imagemHtml = `<img src="${produto.icone}" alt="${produto.nome}" class="produto-imagem-real">`;
            } else if (produto.icone) {
                // É um ícone Font Awesome
                imagemHtml = `<i class="fas ${produto.icone}"></i>`;
            } else {
                // Padrão (Cubo)
                imagemHtml = `<i class="fas fa-cube"></i>`;
            }

            produtoCard.innerHTML = `
                <div class="produto-imagem">
                    ${imagemHtml}
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
            
            // ================================================================
            // === FIM DA CORREÇÃO ===
            // ================================================================
            
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
        optionDefault.dataset.nome = 'Cliente sem cadastro';
        optionDefault.textContent = 'Cliente sem cadastro';
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
        
        const clienteId = clienteSelect.value || null;
        const clienteNome = clienteSelect.options[clienteSelect.selectedIndex].dataset.nome;
        
        // CORREÇÃO: Força a forma de pagamento para 'crediario' se a opção estiver presente, evitando o 'misto' no DB.
        const isCrediario = pagamentos.some(p => p.tipo === 'crediario');
        const formaPagamento = isCrediario ? 'crediario' : pagamentos[0].tipo; 

        const troco = Math.max(0, pago - total);
        
        // NOVO CÁLCULO: Total pago desconsiderando Crediário.
        const pagoSemCrediario = pagamentos
            .filter(p => p.tipo !== 'crediario')
            .reduce((sum, p) => sum + p.valor, 0);
        // FIM DO NOVO CÁLCULO

        // VALIDAÇÃO: CREDÍARIO REQUER CLIENTE CADASTRADO (FINAL CHECK)
        
        const epsilon = 0.001; 
        
        if (isCrediario && !clienteId) {
            mostrarMensagem('O pagamento em Crediário exige que um cliente cadastrado seja selecionado!', 'error');
            const clienteSection = document.querySelector('.cliente');
            if (clienteSection) {
                 clienteSection.style.border = '2px solid var(--error-color)';
                 setTimeout(() => { clienteSection.style.border = 'none'; }, 5000);
            }
            return; // Bloqueia a finalização
        }
        
        // Bloqueio de Crediário Misto (Se for Crediário, não deve ter pago mais de 0.01)
        if (isCrediario && pagoSemCrediario > 0.01) { 
            mostrarMensagem('Não é possível registrar pagamento misto junto com Crediário. Se a venda for totalmente a prazo, zere os demais pagamentos. Se for parcial, remova o Crediário e registre apenas o valor pago na hora.', 'error');
            return;
        }
        
        // CHECK DE PAGAMENTO COM TOLERÂNCIA (Para resolver o bug de "não finalizar")
        
        const isFullCrediarioForValidation = isCrediario && pagoSemCrediario <= epsilon; 
        
        if (!isFullCrediarioForValidation && pago < total - epsilon) { 
             mostrarMensagem(`O valor pago (${formatarMoeda(pago)}) é menor que o total do pedido (${formatarMoeda(total)}). Saldo pendente: ${formatarMoeda(total - pago)}. Ajuste o pagamento.`, 'error');
            return;
        }
        // FIM DO CHECK DE PAGAMENTO ROBUSTO
        
        
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
            
            if (descontoPercentual > 0 || acrescimoPercentual > 0 || descontoValorFixo > 0 || acrescimoValorFixo > 0) {
                 observacoesVenda += `AJUSTES APLICADOS:\n`;
                 
                 if (descontoTipo === 'valor' && descontoValorFixo > 0) observacoesVenda += `Desconto: ${formatarMoeda(descontoValorFixo)} (Valor Fixo)\n`;
                 if (descontoTipo === 'percentual' && descontoPercentual > 0) observacoesVenda += `Desconto: ${descontoPercentual}%\n`;
                 
                 if (acrescimoTipo === 'valor' && acrescimoValorFixo > 0) observacoesVenda += `Acréscimo: ${formatarMoeda(acrescimoValorFixo)} (Valor Fixo)\n`;
                 if (acrescimoTipo === 'percentual' && acrescimoPercentual > 0) observacoesVenda += `Acréscimo: ${acrescimoPercentual}%\n`;
                 
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
            
            // CORREÇÃO: Define o valor que entra no campo 'total' da tabela 'vendas'.
            const valorRealDaVenda = total; 
            
            let valorParaRegistroTotal;

            if (isCrediario) {
                // Se for crediário, o 'total' armazena a DÍVIDA PENDENTE (valor total - valor pago no momento).
                const debitoRestante = parseFloat((valorRealDaVenda - pagoSemCrediario).toFixed(2));
                valorParaRegistroTotal = debitoRestante;
            } else {
                // Para outros tipos de pagamento (dinheiro, cartão), registra o valor total da venda.
                valorParaRegistroTotal = valorRealDaVenda; 
            }

            const vendaData = {
                data_venda: new Date().toISOString().split('T')[0],
                cliente: clienteNome,
                cliente_id: clienteId, 
                total: valorParaRegistroTotal, // AGORA REGISTRA A DÍVIDA (se crediário) ou o total da venda
                forma_pagamento: formaPagamento, // Registra 'crediario' se for crediário
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

            // ================================================================
            // === INÍCIO DA CORREÇÃO (TYPO z/c) ===
            // ================================================================
            for (const item of carrinho) {
                const novoEstoque = item.produto.estoque_atual - item.quantidade;
                // CORREÇÃO: Chamando a função com 'c' (actualizarEstoque)
                await window.vendasSupabase.actualizarEstoque(item.produto.id, novoEstoque);
            }
            // ================================================================
            // === FIM DA CORREÇÃO ===
            // ================================================================


            // Lógica de reset (da correção anterior)
            mostrarMensagem('✅ Pedido finalizado com sucesso!', 'success');
            
            carrinho = [];
            pagamentos = []; 
            descontoPercentual = acrescimoPercentual = descontoValorFixo = acrescimoValorFixo = 0;
            descontoTipo = acrescimoTipo = 'percentual';

            if (descontoInput) descontoInput.value = 0;
            if (acrescimoInput) acrescimoInput.value = 0;
            if (descontoTipoSelect) descontoTipoSelect.value = 'percentual';
            if (acrescimoTipoSelect) acrescimoTipoSelect.value = 'percentual';
            if (clienteSelect) clienteSelect.value = '';

            atualizarCarrinho(); 
            await carregarProdutos();
            
            finalizarPedidoBtn.innerHTML = 'Finalizar Pedido';
            
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
            
            // SE DER ERRO, re-habilita o botão
            finalizarPedidoBtn.disabled = false;
            finalizarPedidoBtn.innerHTML = 'Finalizar Pedido';

            try { await carregarProdutos(); } catch (reloadError) { console.error('❌ Erro ao recarregar produtos:', reloadError); }
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
        
        // Eventos de mudança nos selects para atualizar o estado global
        if (descontoTipoSelect) descontoTipoSelect.addEventListener('change', () => { descontoTipo = descontoTipoSelect.value; });
        if (acrescimoTipoSelect) acrescimoTipoSelect.addEventListener('change', () => { acrescimoTipo = acrescimoTipoSelect.value; });
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