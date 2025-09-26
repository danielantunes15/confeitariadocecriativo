// js/vendas.js - Funcionalidades da página de vendas
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
            
            console.log('✅ Conexão com Supabase estabelecida (vendas)');
            return true;
        } catch (error) {
            throw new Error(`Erro Supabase: ${error.message}`);
        }
    }

    // Função para inicializar a aplicação de vendas
    async function inicializarVendas() {
        const vendaForm = document.getElementById('venda-form');
        const produtosContainer = document.getElementById('produtos-container');
        const addProdutoBtn = document.getElementById('add-produto');
        const vendasList = document.getElementById('vendas-list');
        const limparFormBtn = document.getElementById('limpar-form');

        try {
            // Carregar dados iniciais
            await carregarProdutos();
            await carregarVendasRecentes();
            
            // Configurar event listeners
            if (addProdutoBtn) {
                addProdutoBtn.addEventListener('click', adicionarProduto);
            }
            
            if (vendaForm) {
                vendaForm.addEventListener('submit', salvarVenda);
            }
            
            if (limparFormBtn) {
                limparFormBtn.addEventListener('click', limparFormulario);
            }

            console.log('✅ Módulo de vendas inicializado com sucesso!');

        } catch (error) {
            console.error('Erro na inicialização do módulo de vendas:', error);
            throw error;
        }
    }

    // Função para carregar produtos do banco de dados
    async function carregarProdutos() {
        const primeiroSelect = document.querySelector('.produto-select');
        if (!primeiroSelect) return;
        
        try {
            const { data, error } = await supabase
                .from('produtos')
                .select('id, nome, preco_venda, estoque_atual')
                .eq('ativo', true)
                .order('nome');
                
            if (error) throw error;
            
            // Preencher o primeiro select
            primeiroSelect.innerHTML = '<option value="">Selecione o produto</option>';
            data.forEach(produto => {
                const option = document.createElement('option');
                option.value = produto.id;
                option.textContent = `${produto.nome} - R$ ${produto.preco_venda.toFixed(2)}`;
                option.dataset.preco = produto.preco_venda;
                primeiroSelect.appendChild(option);
            });

            console.log(`✅ ${data.length} produtos carregados`);

        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            mostrarMensagem('Erro ao carregar produtos', 'error');
        }
    }

    // Função para adicionar campo de produto
    function adicionarProduto() {
        const produtosContainer = document.getElementById('produtos-container');
        if (!produtosContainer) return;
        
        const produtoItem = document.createElement('div');
        produtoItem.className = 'produto-item';
        
        produtoItem.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Produto *</label>
                    <select class="produto-select" required>
                        <option value="">Selecione o produto</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Quantidade *</label>
                    <input type="number" class="quantidade-input" min="1" value="1" required>
                </div>
                <div class="form-group">
                    <label>Preço Unitário (R$)</label>
                    <input type="number" class="preco-input" step="0.01" min="0" readonly>
                </div>
                <div class="form-group">
                    <label>Subtotal (R$)</label>
                    <input type="number" class="subtotal-input" step="0.01" min="0" readonly>
                </div>
                <button type="button" class="btn btn-danger btn-remove">×</button>
            </div>
        `;
        
        produtosContainer.appendChild(produtoItem);
        
        // Adicionar evento de remoção
        const removeBtn = produtoItem.querySelector('.btn-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                produtoItem.remove();
                calcularTotalVenda();
            });
        }
        
        // Carregar produtos no select
        const selectElement = produtoItem.querySelector('.produto-select');
        if (selectElement) {
            carregarProdutosNoSelect(selectElement);
        }
        
        // Adicionar eventos para calcular subtotal
        const quantidadeInput = produtoItem.querySelector('.quantidade-input');
        if (quantidadeInput) {
            quantidadeInput.addEventListener('input', calcularSubtotal);
        }
        
        const produtoSelect = produtoItem.querySelector('.produto-select');
        if (produtoSelect) {
            produtoSelect.addEventListener('change', calcularSubtotal);
        }
        
        // Mostrar botão de remover em todos os itens
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.style.display = 'inline-block';
        });
    }

    // Função para carregar produtos em um select específico
    async function carregarProdutosNoSelect(selectElement) {
        try {
            const { data, error } = await supabase
                .from('produtos')
                .select('id, nome, preco_venda, estoque_atual')
                .eq('ativo', true)
                .order('nome');
                
            if (error) throw error;
            
            selectElement.innerHTML = '<option value="">Selecione o produto</option>';
            data.forEach(produto => {
                const option = document.createElement('option');
                option.value = produto.id;
                option.textContent = `${produto.nome} - R$ ${produto.preco_venda.toFixed(2)}`;
                option.dataset.preco = produto.preco_venda;
                selectElement.appendChild(option);
            });

        } catch (error) {
            console.error('Erro ao carregar produtos no select:', error);
        }
    }

    // Função para calcular subtotal de um produto
    function calcularSubtotal(event) {
        const formRow = event.target.closest('.form-row');
        if (!formRow) return;
        
        const select = formRow.querySelector('.produto-select');
        const quantidadeInput = formRow.querySelector('.quantidade-input');
        const precoInput = formRow.querySelector('.preco-input');
        const subtotalInput = formRow.querySelector('.subtotal-input');
        
        if (!select || !quantidadeInput || !precoInput || !subtotalInput) return;
        
        const selectedOption = select.options[select.selectedIndex];
        const preco = selectedOption && selectedOption.value ? parseFloat(selectedOption.dataset.preco) : 0;
        const quantidade = parseInt(quantidadeInput.value) || 0;
        
        precoInput.value = preco.toFixed(2);
        const subtotal = preco * quantidade;
        subtotalInput.value = subtotal.toFixed(2);
        
        calcularTotalVenda();
    }

    // Função para calcular o total da venda
    function calcularTotalVenda() {
        const subtotalInputs = document.querySelectorAll('.subtotal-input');
        let total = 0;
        
        subtotalInputs.forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        
        const totalElement = document.getElementById('total-venda');
        if (totalElement) {
            totalElement.textContent = `R$ ${total.toFixed(2)}`;
        }
        
        return total;
    }

    // Função para salvar venda no banco de dados
    async function salvarVenda(event) {
        event.preventDefault();
        
        const form = event.target;
        const dataVenda = document.getElementById('data-venda').value;
        const cliente = document.getElementById('cliente').value;
        const formaPagamento = document.getElementById('forma-pagamento').value;
        const observacoes = document.getElementById('observacoes').value;
        
        // Validar dados
        if (!dataVenda || !formaPagamento) {
            mostrarMensagem('Preencha todos os campos obrigatórios', 'error');
            return;
        }
        
        // Coletar produtos
        const produtos = [];
        const produtoItems = document.querySelectorAll('.produto-item');
        
        for (const item of produtoItems) {
            const select = item.querySelector('.produto-select');
            const quantidadeInput = item.querySelector('.quantidade-input');
            
            if (!select.value || !quantidadeInput.value) {
                mostrarMensagem('Preencha todos os produtos corretamente', 'error');
                return;
            }
            
            produtos.push({
                produto_id: select.value,
                quantidade: parseInt(quantidadeInput.value),
                preco_unitario: parseFloat(item.querySelector('.preco-input').value)
            });
        }
        
        if (produtos.length === 0) {
            mostrarMensagem('Adicione pelo menos um produto', 'error');
            return;
        }
        
        try {
            // Inserir venda
            const { data: venda, error: vendaError } = await supabase
                .from('vendas')
                .insert({
                    data_venda: dataVenda,
                    cliente: cliente || 'Cliente não identificado',
                    total: calcularTotalVenda(),
                    forma_pagamento: formaPagamento,
                    observacoes: observacoes,
                    usuario_id: window.sistemaAuth.usuarioLogado.id
                })
                .select()
                .single();
                
            if (vendaError) throw vendaError;
            
            // Inserir itens da venda
            const itensVenda = produtos.map(produto => ({
                venda_id: venda.id,
                produto_id: produto.produto_id,
                quantidade: produto.quantidade,
                preco_unitario: produto.preco_unitario
            }));
            
            const { error: itensError } = await supabase
                .from('vendas_itens')
                .insert(itensVenda);
                
            if (itensError) throw itensError;
            
            // Atualizar estoque
            for (const produto of produtos) {
                const { error: estoqueError } = await supabase.rpc(
                    'diminuir_estoque',
                    { 
                        produto_id: produto.produto_id,
                        quantidade: produto.quantidade
                    }
                );
                
                if (estoqueError) {
                    console.warn('Erro ao atualizar estoque:', estoqueError);
                }
            }
            
            mostrarMensagem('Venda registrada com sucesso!', 'success');
            limparFormulario();
            await carregarVendasRecentes();
            
        } catch (error) {
            console.error('Erro ao salvar venda:', error);
            mostrarMensagem('Erro ao registrar venda: ' + error.message, 'error');
        }
    }

    // Função para carregar vendas recentes
    async function carregarVendasRecentes() {
        const vendasList = document.getElementById('vendas-list');
        if (!vendasList) return;
        
        try {
            const { data, error } = await supabase
                .from('vendas')
                .select(`
                    id,
                    data_venda,
                    cliente,
                    total,
                    forma_pagamento,
                    usuario:usuarios(nome)
                `)
                .order('data_venda', { ascending: false })
                .limit(10);
                
            if (error) throw error;
            
            if (data.length === 0) {
                vendasList.innerHTML = '<p>Nenhuma venda registrada ainda.</p>';
                return;
            }
            
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Cliente</th>
                            <th>Total</th>
                            <th>Pagamento</th>
                            <th>Vendedor</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.forEach(venda => {
                html += `
                    <tr>
                        <td>${new Date(venda.data_venda).toLocaleDateString('pt-BR')}</td>
                        <td>${venda.cliente}</td>
                        <td>R$ ${venda.total.toFixed(2)}</td>
                        <td>${formatarFormaPagamento(venda.forma_pagamento)}</td>
                        <td>${venda.usuario?.nome || 'N/A'}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            vendasList.innerHTML = html;
            
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            vendasList.innerHTML = '<p>Erro ao carregar vendas.</p>';
        }
    }

    // Função para formatar forma de pagamento
    function formatarFormaPagamento(forma) {
        const formas = {
            'dinheiro': 'Dinheiro',
            'cartao_credito': 'Cartão Crédito',
            'cartao_debito': 'Cartão Débito',
            'pix': 'PIX'
        };
        
        return formas[forma] || forma;
    }

    // Função para limpar formulário
    function limparFormulario() {
        const form = document.getElementById('venda-form');
        if (form) form.reset();
        
        // Manter apenas o primeiro produto
        const produtosContainer = document.getElementById('produtos-container');
        if (produtosContainer) {
            const primeiroProduto = produtosContainer.querySelector('.produto-item');
            produtosContainer.innerHTML = '';
            if (primeiroProduto) {
                produtosContainer.appendChild(primeiroProduto);
                // Esconder botão de remover do primeiro produto
                const removeBtn = primeiroProduto.querySelector('.btn-remove');
                if (removeBtn) removeBtn.style.display = 'none';
            }
        }
        
        // Configurar data atual
        const dataVendaInput = document.getElementById('data-venda');
        if (dataVendaInput) {
            const hoje = new Date().toISOString().split('T')[0];
            dataVendaInput.value = hoje;
        }
        
        calcularTotalVenda();
    }

    // Função para mostrar mensagens
    function mostrarMensagem(mensagem, tipo) {
        // Remover mensagens existentes
        const mensagensExistentes = document.querySelectorAll('.alert-message');
        mensagensExistentes.forEach(msg => msg.remove());
        
        // Criar nova mensagem
        const mensagemElement = document.createElement('div');
        mensagemElement.className = `alert-message alert-${tipo}`;
        mensagemElement.textContent = mensagem;
        
        // Inserir antes do primeiro card
        const primeiroCard = document.querySelector('.card');
        if (primeiroCard) {
            primeiroCard.parentNode.insertBefore(mensagemElement, primeiroCard);
        }
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (mensagemElement.parentNode) {
                mensagemElement.parentNode.removeChild(mensagemElement);
            }
        }, 5000);
    }
});