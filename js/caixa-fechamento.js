// js/caixa-fechamento.js - Sistema completo de fechamento de caixa
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
    const dataFechamentoInput = document.getElementById('data-fechamento');
    const carregarDadosBtn = document.getElementById('carregar-dados');
    const gerarRelatorioBtn = document.getElementById('gerar-relatorio');
    const filtroPagamentoSelect = document.getElementById('filtro-pagamento');
    const vendasBody = document.getElementById('vendas-body');
    const movimentacoesBody = document.getElementById('movimentacoes-body');

    // Elementos de Abertura e Movimentação de Caixa
    const secoesCaixa = document.getElementById('secoes-caixa');
    const valorAberturaInput = document.getElementById('valor-abertura');
    const abrirCaixaBtn = document.getElementById('abrir-caixa-btn');
    const valorMovimentacaoInput = document.getElementById('valor-movimentacao');
    const tipoMovimentacaoSelect = document.getElementById('tipo-movimentacao');
    const descricaoMovimentacaoInput = document.getElementById('descricao-movimentacao');
    const registrarMovimentacaoBtn = document.getElementById('registrar-movimentacao-btn');
    const tabAberturaBtn = document.querySelector('[data-tab="abertura"]');
    const tabMovimentacoesBtn = document.querySelector('[data-tab="movimentacoes"]');

    // Variáveis globais
    let vendasDoDia = [];
    let movimentacoesDoDia = [];
    let valorAbertura = 0;
    let isAdmin = window.sistemaAuth?.isAdmin();

    // Aplicar classe e mostrar seções se o usuário for administrador
    if (isAdmin) {
        document.body.classList.add('is-admin');
        if (secoesCaixa) secoesCaixa.style.display = 'block';
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'block';
        });
    }

    try {
        if (loadingElement) loadingElement.style.display = 'block';
        if (contentElement) contentElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'none';

        await testarConexaoSupabase();
        
        if (loadingElement) loadingElement.style.display = 'none';
        if (contentElement) contentElement.style.display = 'block';

        configurarEventListeners();

        await carregarFechamentoDoDia();

        console.log('✅ Módulo de fechamento de caixa inicializado com sucesso!');
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

    async function testarConexaoSupabase() {
        try {
            const { data, error } = await supabase
                .from('vendas')
                .select('id')
                .limit(1);
                
            if (error) throw error;
            
            console.log('✅ Conexão com Supabase estabelecida (fechamento)');
            return true;
        } catch (error) {
            throw new Error(`Erro Supabase: ${error.message}`);
        }
    }

    function configurarEventListeners() {
        if (carregarDadosBtn) {
            carregarDadosBtn.addEventListener('click', carregarFechamentoDoDia);
        }
        if (gerarRelatorioBtn) {
            gerarRelatorioBtn.addEventListener('click', gerarRelatorioPDF);
        }
        if (filtroPagamentoSelect) {
            filtroPagamentoSelect.addEventListener('change', filtrarVendas);
        }
        if (abrirCaixaBtn && isAdmin) {
            abrirCaixaBtn.addEventListener('click', abrirCaixa);
        }
        if (registrarMovimentacaoBtn) {
            registrarMovimentacaoBtn.addEventListener('click', registrarMovimentacao);
        }

        tabAberturaBtn?.addEventListener('click', () => {
            document.getElementById('tab-abertura').style.display = 'block';
            document.getElementById('tab-movimentacoes').style.display = 'none';
        });

        tabMovimentacoesBtn?.addEventListener('click', () => {
            document.getElementById('tab-abertura').style.display = 'none';
            document.getElementById('tab-movimentacoes').style.display = 'block';
        });
    }

    async function carregarFechamentoDoDia() {
        const dataSelecionada = dataFechamentoInput.value;
        if (!dataSelecionada) {
            mostrarMensagem('Selecione uma data válida', 'error');
            return;
        }

        try {
            mostrarMensagem('Carregando dados do fechamento...', 'info');
            
            await carregarVendas(dataSelecionada);
            await carregarMovimentacoes(dataSelecionada);

            if (isAdmin) {
                await carregarValorAbertura(dataSelecionada);
            }
            
            atualizarResumoFinanceiro();
            atualizarRelatorio();
            
            mostrarMensagem('Fechamento carregado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao carregar fechamento:', error);
            mostrarMensagem('Erro ao carregar fechamento: ' + error.message, 'error');
        }
    }

    async function abrirCaixa() {
        const valor = parseFloat(valorAberturaInput.value);
        if (isNaN(valor) || valor < 0) {
            mostrarMensagem('Por favor, insira um valor de abertura válido.', 'error');
            return;
        }

        const dataSelecionada = dataFechamentoInput.value;
        const usuario = window.sistemaAuth.usuarioLogado;

        try {
            const { data: aberturaExistente, error: erroExistente } = await supabase
                .from('caixa_movimentacoes')
                .select('id')
                .eq('tipo', 'abertura')
                .eq('data_caixa', dataSelecionada);

            if (erroExistente && erroExistente.code !== 'PGRST116') {
                throw erroExistente;
            }

            if (aberturaExistente && aberturaExistente.length > 0) {
                mostrarMensagem('O caixa já foi aberto para esta data.', 'error');
                return;
            }

            const { data, error } = await supabase
                .from('caixa_movimentacoes')
                .insert({
                    data_caixa: dataSelecionada,
                    tipo: 'abertura',
                    valor: valor,
                    descricao: 'Abertura de Caixa',
                    usuario_id: usuario.id
                })
                .select()
                .single();

            if (error) throw error;
            
            console.log('✅ Caixa aberto com sucesso:', data);
            mostrarMensagem(`Caixa aberto com R$ ${valor.toFixed(2)}`, 'success');
            await carregarFechamentoDoDia();
        } catch (error) {
            console.error('Erro ao abrir caixa:', error);
            mostrarMensagem('Erro ao abrir o caixa: ' + error.message, 'error');
        }
    }
    
    async function registrarMovimentacao() {
        const valor = parseFloat(valorMovimentacaoInput.value);
        const tipo = tipoMovimentacaoSelect.value;
        const descricao = descricaoMovimentacaoInput.value.trim();

        if (isNaN(valor) || valor <= 0) {
            mostrarMensagem('Por favor, insira um valor válido.', 'error');
            return;
        }
        
        if (!descricao) {
            mostrarMensagem('Por favor, insira uma descrição para a movimentação.', 'error');
            return;
        }

        const dataSelecionada = dataFechamentoInput.value;
        const usuario = window.sistemaAuth.usuarioLogado;

        try {
            const { data, error } = await supabase
                .from('caixa_movimentacoes')
                .insert({
                    data_caixa: dataSelecionada,
                    tipo: tipo,
                    valor: valor,
                    descricao: descricao,
                    usuario_id: usuario.id
                })
                .select()
                .single();

            if (error) throw error;

            console.log('✅ Movimentação registrada:', data);
            mostrarMensagem(`Movimentação de ${tipo === 'entrada' ? 'entrada' : 'saída'} de R$ ${valor.toFixed(2)} registrada!`, 'success');
            
            valorMovimentacaoInput.value = '';
            descricaoMovimentacaoInput.value = '';

            await carregarFechamentoDoDia();
        } catch (error) {
            console.error('Erro ao registrar movimentação:', error);
            mostrarMensagem('Erro ao registrar movimentação: ' + error.message, 'error');
        }
    }

    async function carregarVendas(data) {
        try {
            console.log('📊 Carregando vendas para data:', data);
            
            const dataInicio = new Date(data + 'T00:00:00').toISOString();
            const dataFim = new Date(data + 'T23:59:59').toISOString();
            
            const { data: vendas, error } = await supabase
                .from('vendas')
                .select('*')
                .gte('created_at', dataInicio)
                .lte('created_at', dataFim)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar vendas:', error);
                throw error;
            }

            console.log(`✅ Encontradas ${vendas?.length || 0} vendas para ${data}`);

            vendasDoDia = vendas || [];
            
            if (vendasDoDia.length > 0) {
                for (let venda of vendasDoDia) {
                    try {
                        const { data: itens, error: errorItens } = await supabase
                            .from('vendas_itens')
                            .select('*')
                            .eq('venda_id', venda.id);

                        if (!errorItens && itens) {
                            venda.itens = itens;
                            
                            for (let item of venda.itens) {
                                try {
                                    const { data: produto, error: errorProduto } = await supabase
                                        .from('produtos')
                                        .select('nome, icone')
                                        .eq('id', item.produto_id)
                                        .single();
                                    if (!errorProduto && produto) {
                                        item.produto = produto;
                                    }
                                } catch (produtoError) {
                                    item.produto = { nome: 'Produto não encontrado', icone: 'fa-cube' };
                                }
                            }
                        }

                        if (venda.usuario_id) {
                            try {
                                const { data: usuario, error: errorUsuario } = await supabase
                                    .from('sistema_usuarios')
                                    .select('nome')
                                    .eq('id', venda.usuario_id)
                                    .single();
                                if (!errorUsuario && usuario) {
                                    venda.usuario = usuario;
                                }
                            } catch (usuarioError) {
                                console.warn('Erro ao buscar usuário:', usuarioError);
                            }
                        }
                    } catch (detalhesError) {
                        console.warn('Erro ao carregar detalhes da venda:', detalhesError);
                    }
                }
            }

            exibirVendas(vendasDoDia);
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            throw error;
        }
    }
    
    async function carregarMovimentacoes(data) {
        try {
            const { data: movimentacoes, error } = await supabase
                .from('caixa_movimentacoes')
                .select('*')
                .eq('data_caixa', data)
                .order('created_at', { ascending: false });

            if (error) throw error;

            movimentacoesDoDia = movimentacoes || [];
            
            for (let mov of movimentacoesDoDia) {
                if (mov.usuario_id) {
                    try {
                        const { data: usuario, error: errorUsuario } = await supabase
                            .from('sistema_usuarios')
                            .select('nome')
                            .eq('id', mov.usuario_id)
                            .single();
                        if (!errorUsuario && usuario) {
                            mov.usuario = usuario;
                        }
                    } catch (usuarioError) {
                        console.warn('Erro ao buscar usuário da movimentação:', usuarioError);
                    }
                }
            }
            
            const movimentacoesFiltradas = movimentacoesDoDia.filter(m => m.tipo === 'entrada' || m.tipo === 'saida');
            exibirMovimentacoes(movimentacoesFiltradas);
        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
            movimentacoesDoDia = [];
            exibirMovimentacoes([]);
        }
    }

    async function carregarValorAbertura(data) {
        try {
            const { data: abertura, error } = await supabase
                .from('caixa_movimentacoes')
                .select('valor')
                .eq('tipo', 'abertura')
                .eq('data_caixa', data)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            valorAbertura = abertura ? abertura.valor : 0;
            console.log('💰 Valor de abertura do dia:', valorAbertura.toFixed(2));
        } catch (error) {
            console.error('Erro ao carregar valor de abertura:', error);
            valorAbertura = 0;
        }
    }

    function exibirVendas(vendas) {
        if (!vendasBody) return;
        vendasBody.innerHTML = '';
        if (vendas.length === 0) {
            vendasBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #666;">
                        Nenhuma venda encontrada para esta data
                    </td>
                </tr>
            `;
            return;
        }
        vendas.forEach(venda => {
            const tr = document.createElement('tr');
            const hora = new Date(venda.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const totalItens = venda.itens ? venda.itens.reduce((sum, item) => sum + item.quantidade, 0) : 0;
            let valorExibido = venda.total?.toFixed(2) || '0.00';
            if (!isAdmin && venda.forma_pagamento !== 'dinheiro') {
                valorExibido = '**.**';
            }
            tr.innerHTML = `
                <td>${hora}</td>
                <td>${venda.cliente || 'Cliente não identificado'}</td>
                <td>${totalItens} item(s)</td>
                <td>R$ ${valorExibido}</td>
                <td>
                    <span class="badge badge-${venda.forma_pagamento}">
                        ${formatarFormaPagamento(venda.forma_pagamento)}
                    </span>
                </td>
                <td>${venda.usuario?.nome || 'N/A'}</td>
                <td>
                    <button class="btn-detalhes" onclick="verDetalhesVenda('${venda.id}')">
                        <i class="fas fa-eye"></i> Detalhes
                    </button>
                </td>
            `;
            vendasBody.appendChild(tr);
        });
    }

    function exibirMovimentacoes(movimentacoes) {
        if (!movimentacoesBody) return;
        movimentacoesBody.innerHTML = '';
        if (movimentacoes.length === 0) {
            movimentacoesBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #666;">
                        Nenhuma movimentação encontrada
                    </td>
                </tr>
            `;
            return;
        }
        movimentacoes.forEach(mov => {
            const tr = document.createElement('tr');
            const hora = new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            tr.innerHTML = `
                <td>${hora}</td>
                <td>${mov.descricao}</td>
                <td>
                    <span class="badge ${mov.tipo === 'entrada' ? 'badge-dinheiro' : 'badge-pix'}">
                        ${mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                </td>
                <td class="${mov.tipo === 'entrada' ? 'entrada' : 'saida'}">
                    R$ ${mov.valor?.toFixed(2) || '0.00'}
                </td>
                <td>${mov.usuario?.nome || 'N/A'}</td>
            `;
            movimentacoesBody.appendChild(tr);
        });
    }

    function atualizarResumoFinanceiro() {
        const vendasDinheiro = vendasDoDia.filter(v => v.forma_pagamento === 'dinheiro');
        const vendasCartao = vendasDoDia.filter(v => v.forma_pagamento === 'cartao');
        const vendasPix = vendasDoDia.filter(v => v.forma_pagamento === 'pix');
        const totalDinheiroVendas = vendasDinheiro.reduce((sum, v) => sum + (v.total || 0), 0);
        const totalCartao = vendasCartao.reduce((sum, v) => sum + (v.total || 0), 0);
        const totalPix = vendasPix.reduce((sum, v) => sum + (v.total || 0), 0);
        const totalGeral = vendasDoDia.reduce((sum, v) => sum + (v.total || 0), 0);

        document.getElementById('total-dinheiro').textContent = `R$ ${totalDinheiroVendas.toFixed(2)}`;
        document.getElementById('qtd-dinheiro').textContent = `${vendasDinheiro.length} venda(s)`;
        document.getElementById('total-cartao').textContent = `R$ ${totalCartao.toFixed(2)}`;
        document.getElementById('qtd-cartao').textContent = `${vendasCartao.length} venda(s)`;
        document.getElementById('total-pix').textContent = `R$ ${totalPix.toFixed(2)}`;
        document.getElementById('qtd-pix').textContent = `${vendasPix.length} venda(s)`;
        
        if (!isAdmin) {
            document.getElementById('total-cartao').textContent = 'R$ **,**';
            document.getElementById('qtd-cartao').textContent = '** venda(s)';
            document.getElementById('total-pix').textContent = 'R$ **,**';
            document.getElementById('qtd-pix').textContent = '** venda(s)';
            document.getElementById('total-geral').textContent = `R$ ${totalDinheiroVendas.toFixed(2)}`;
            document.getElementById('qtd-total').textContent = `${vendasDinheiro.length} venda(s)`;
        } else {
            document.getElementById('total-geral').textContent = `R$ ${totalGeral.toFixed(2)}`;
            document.getElementById('qtd-total').textContent = `${vendasDoDia.length} venda(s)`;
        }
    }

    function atualizarRelatorio() {
        const dataSelecionada = dataFechamentoInput.value;
        const dataFormatada = new Date(dataSelecionada).toLocaleDateString('pt-BR');
        const vendasDinheiro = vendasDoDia.filter(v => v.forma_pagamento === 'dinheiro');
        const totalVendasDinheiro = vendasDinheiro.reduce((sum, v) => sum + (v.total || 0), 0);
        const ticketMedioDinheiro = vendasDinheiro.length > 0 ? totalVendasDinheiro / vendasDinheiro.length : 0;
        
        document.getElementById('relatorio-data').textContent = dataFormatada;
        document.getElementById('relatorio-total-vendas').textContent = `R$ ${totalVendasDinheiro.toFixed(2)}`;
        document.getElementById('relatorio-qtd-vendas').textContent = vendasDinheiro.length;
        document.getElementById('relatorio-ticket-medio').textContent = `R$ ${ticketMedioDinheiro.toFixed(2)}`;

        if (isAdmin) {
            const totalEntradas = movimentacoesDoDia
                .filter(m => m.tipo === 'entrada')
                .reduce((sum, m) => sum + (m.valor || 0), 0);
            const totalSaidas = movimentacoesDoDia
                .filter(m => m.tipo === 'saida')
                .reduce((sum, m) => sum + (m.valor || 0), 0);
            const saldoFinal = valorAbertura + totalVendasDinheiro + totalEntradas - totalSaidas;

            document.getElementById('relatorio-abertura').textContent = `R$ ${valorAbertura.toFixed(2)}`;
            document.getElementById('relatorio-entradas').textContent = `R$ ${totalEntradas.toFixed(2)}`;
            document.getElementById('relatorio-saidas').textContent = `R$ ${totalSaidas.toFixed(2)}`;
            document.getElementById('relatorio-saldo-final').textContent = `R$ ${saldoFinal.toFixed(2)}`;
        }
    }
    
    function filtrarVendas() {
        const filtro = filtroPagamentoSelect.value;
        let vendasFiltradas = vendasDoDia;
        if (filtro !== 'todos') {
            vendasFiltradas = vendasDoDia.filter(v => v.forma_pagamento === filtro);
        }
        exibirVendas(vendasFiltradas);
    }

    window.verDetalhesVenda = function(vendaId) {
        const venda = vendasDoDia.find(v => v.id === vendaId);
        if (!venda) {
            mostrarMensagem('Venda não encontrada', 'error');
            return;
        }
        const modal = document.getElementById('modal-detalhes-venda');
        const content = document.getElementById('detalhes-venda-content');
        const dataHora = new Date(venda.created_at).toLocaleString('pt-BR');
        let valorTotalExibido = (venda.total || 0).toFixed(2);
        if (!isAdmin && venda.forma_pagamento !== 'dinheiro') {
            valorTotalExibido = '**.**';
        }
        let html = `
            <div class="detalhes-venda">
                <div class="info-item">
                    <span><strong>Data/Hora:</strong></span>
                    <span>${dataHora}</span>
                </div>
                <div class="info-item">
                    <span><strong>Cliente:</strong></span>
                    <span>${venda.cliente || 'Cliente não identificado'}</span>
                </div>
                <div class="info-item">
                    <span><strong>Vendedor:</strong></span>
                    <span>${venda.usuario?.nome || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span><strong>Forma de Pagamento:</strong></span>
                    <span>${formatarFormaPagamento(venda.forma_pagamento)}</span>
                </div>
                
                <h4>Itens da Venda:</h4>
        `;
        if (venda.itens && venda.itens.length > 0) {
            venda.itens.forEach(item => {
                let valorItemExibido = ((item.preco_unitario || 0) * (item.quantidade || 0)).toFixed(2);
                let precoUnitarioExibido = (item.preco_unitario || 0).toFixed(2);
                if (!isAdmin && venda.forma_pagamento !== 'dinheiro') {
                    valorItemExibido = '**.**';
                    precoUnitarioExibido = '**.**';
                }
                html += `
                    <div class="detalhes-item">
                        <div class="detalhes-produto">
                            <i class="fas ${item.produto?.icone || 'fa-cube'}"></i>
                            <div>
                                <strong>${item.produto?.nome || 'Produto não encontrado'}</strong>
                                <div>Quantidade: ${item.quantidade}</div>
                            </div>
                        </div>
                        <div>
                            <strong>R$ ${valorItemExibido}</strong>
                            <div>Unit: R$ ${precoUnitarioExibido}</div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<p>Nenhum item encontrado para esta venda</p>`;
        }
        html += `
                <div class="detalhes-total">
                    <div class="info-item">
                        <span><strong>Total da Venda:</strong></span>
                        <span><strong>R$ ${valorTotalExibido}</strong></span>
                    </div>
                </div>
                
                ${venda.observacoes ? `
                    <div class="info-item">
                        <span><strong>Observações:</strong></span>
                        <span>${venda.observacoes}</span>
                    </div>
                ` : ''}
            </div>
        `;
        content.innerHTML = html;
        modal.style.display = 'block';
    };

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            document.getElementById('modal-detalhes-venda').style.display = 'none';
        });
    });

    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal-detalhes-venda');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    async function gerarRelatorioPDF() {
        try {
            mostrarMensagem('Gerando relatório...', 'info');
            const dataSelecionada = dataFechamentoInput.value;
            const dataFormatada = new Date(dataSelecionada).toLocaleDateString('pt-BR');
            const vendasDinheiro = vendasDoDia.filter(v => v.forma_pagamento === 'dinheiro');
            const vendasCartao = vendasDoDia.filter(v => v.forma_pagamento === 'cartao');
            const vendasPix = vendasDoDia.filter(v => v.forma_pagamento === 'pix');
            const totalDinheiro = vendasDinheiro.reduce((sum, v) => sum + (v.total || 0), 0);
            const totalCartao = vendasCartao.reduce((sum, v) => sum + (v.total || 0), 0);
            const totalPix = vendasPix.reduce((sum, v) => sum + (v.total || 0), 0);
            const totalGeral = vendasDoDia.reduce((sum, v) => sum + (v.total || 0), 0);
            
            let totalEntradas = 0;
            let totalSaidas = 0;
            if (isAdmin) {
                totalEntradas = movimentacoesDoDia.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + (m.valor || 0), 0);
                totalSaidas = movimentacoesDoDia.filter(m => m.tipo === 'saida').reduce((sum, m) => sum + (m.valor || 0), 0);
            }
            const saldoFinal = valorAbertura + totalDinheiro + totalEntradas - totalSaidas;

            const relatorioWindow = window.open('', '_blank');
            relatorioWindow.document.write(`
                <html>
                    <head>
                        <title>Relatório de Fechamento - ${dataFormatada}</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            h1, h2 { color: #333; }
                            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                            .total { font-weight: bold; }
                            .assinatura { margin-top: 50px; border-top: 1px solid #333; padding-top: 10px; }
                        </style>
                    </head>
                    <body>
                        <h1>Relatório de Fechamento - Confeitaria Doces Criativos</h1>
                        <h2>Data: ${dataFormatada}</h2>
                        
                        <h3>Resumo Financeiro</h3>
                        <table>
                            <tr>
                                <th>Item</th>
                                <th>Valor Total</th>
                            </tr>
                            ${isAdmin ? `
                            <tr>
                                <td>Valor de Abertura</td>
                                <td>R$ ${valorAbertura.toFixed(2)}</td>
                            </tr>
                            ` : ''}
                            <tr>
                                <td>Total de Vendas em Dinheiro</td>
                                <td>R$ ${totalDinheiro.toFixed(2)}</td>
                            </tr>
                            ${isAdmin ? `
                            <tr>
                                <td>Total de Vendas em Cartão</td>
                                <td>R$ ${totalCartao.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Total de Vendas em PIX</td>
                                <td>R$ ${totalPix.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Total de Entradas (Reforços)</td>
                                <td>R$ ${totalEntradas.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>Total de Saídas (Sangrias)</td>
                                <td>R$ ${totalSaidas.toFixed(2)}</td>
                            </tr>
                            ` : ''}
                            <tr class="total">
                                <td>Total Geral de Vendas</td>
                                <td>R$ ${totalGeral.toFixed(2)}</td>
                            </tr>
                            ${isAdmin ? `
                            <tr class="total">
                                <td>Saldo Calculado do Caixa</td>
                                <td>R$ ${saldoFinal.toFixed(2)}</td>
                            </tr>
                            ` : ''}
                        </table>
                        
                        <div class="assinatura">
                            <p>_________________________________</p>
                            <p>Vendedor</p>
                        </div>
                        
                        ${isAdmin ? `
                        <div class="assinatura">
                            <p>_________________________________</p>
                            <p>Gerente/Administrador</p>
                        </div>
                        ` : ''}
                        
                        <p style="margin-top: 30px; font-size: 12px; color: #666;">
                            Relatório gerado em ${new Date().toLocaleString('pt-BR')}
                        </p>
                    </body>
                </html>
            `);
            relatorioWindow.document.close();
            setTimeout(() => {
                relatorioWindow.print();
            }, 500);
            mostrarMensagem('Relatório gerado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            mostrarMensagem('Erro ao gerar relatório: ' + error.message, 'error');
        }
    }

    function formatarFormaPagamento(forma) {
        const formas = {
            'dinheiro': 'Dinheiro',
            'cartao': 'Cartão',
            'pix': 'PIX'
        };
        return formas[forma] || forma;
    }

    function mostrarMensagem(mensagem, tipo) {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo}`;
        alert.innerHTML = `
            <span>${mensagem}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        alertContainer.appendChild(alert);
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }
});