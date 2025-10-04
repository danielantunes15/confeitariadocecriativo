// js/relatorios.js - VERSÃO FINAL COM DASHBOARD DINÂMICO E FILTRO DE PDF E PERSISTÊNCIA DE TAXAS VIA SUPABASE
document.addEventListener('DOMContentLoaded', async function () {
    // LÓGICA DAS ABAS
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            button.classList.add('active');
            const targetPane = document.getElementById(`tab-${button.dataset.tab}`);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const acessoNegadoElement = document.getElementById('acesso-negado');
    const errorElement = document.getElementById('error-message');
    let charts = {};

    const toggleDisplay = (element, show) => { if (element) element.style.display = show ? 'block' : 'none'; };

    // --- Lógica de Autenticação (Mantida)
    if (!window.sistemaAuth?.verificarAutenticacao()) { window.location.href = 'login.html'; return; }
    const usuario = window.sistemaAuth.usuarioLogado;
    if (!['administrador', 'admin', 'gerente'].includes(usuario.tipo?.toLowerCase())) {
        toggleDisplay(loadingElement, true);
        toggleDisplay(contentElement, false);
        toggleDisplay(acessoNegadoElement, true);
        return;
    }

    let vendasDoDashboard = [];
    let dataInicioDashboard, dataFimDashboard;
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
    const mostrarMensagem = (mensagem, tipo = 'success') => {
        const container = document.getElementById('alert-container');
        if (!container) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.innerHTML = `<span>${mensagem}</span><button onclick="this.parentElement.remove()">&times;</button>`;
        container.appendChild(alertDiv);
        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
    };
    const toggleLoading = (show) => {
        toggleDisplay(loadingElement, show);
        toggleDisplay(contentElement, !show);
    };

    /**
     * NOVO: Salva as taxas no Supabase, tornando-as persistentes entre dispositivos.
     */
    async function salvarTaxas() {
        const novaTaxaDebito = document.getElementById('taxa-debito').value;
        const novaTaxaCredito = document.getElementById('taxa-credito').value;

        try {
            // Salva/Atualiza a linha de configuração (assumindo id=1 para configurações globais)
            const { error } = await supabase.from('configuracoes')
                .upsert({ 
                    id: 1, 
                    taxa_debito: parseFloat(novaTaxaDebito) || 0, 
                    taxa_credito: parseFloat(novaTaxaCredito) || 0 
                }, { onConflict: 'id' });

            if (error) throw error;
            
            mostrarMensagem('Taxas salvas com sucesso em todos os dispositivos!', 'success');
            // Re-renderiza o dashboard para usar as novas taxas imediatamente
            atualizarDashboardCompleto(vendasDoDashboard); 
        } catch (error) {
            console.error('❌ Erro ao salvar taxas:', error);
            mostrarMensagem('Erro ao salvar as taxas no banco de dados. Verifique a tabela "configuracoes".', 'error');
        }
    }

    /**
     * NOVO: Busca as taxas salvas no Supabase.
     */
    async function buscarTaxasDoBanco() {
        try {
            const { data, error } = await supabase.from('configuracoes')
                .select('taxa_debito, taxa_credito')
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error; 
            
            if (data) {
                // Preenche os inputs com os valores do banco
                document.getElementById('taxa-debito').value = data.taxa_debito || '';
                document.getElementById('taxa-credito').value = data.taxa_credito || '';
            }
        } catch (error) {
            console.error('❌ Erro ao buscar taxas no Supabase:', error);
            mostrarMensagem('Não foi possível carregar as taxas salvas.', 'error');
        }
    }
    
    // Função carregarTaxas original removida/mantida vazia, pois a lógica está em buscarTaxasDoBanco
    function carregarTaxas() { /* Lógica movida para buscarTaxasDoBanco() */ }

    async function inicializar() {
        toggleLoading(true);
        // NOVO: Busca as taxas do banco antes de configurar o dashboard
        await buscarTaxasDoBanco();
        configurarFiltrosEEventos();
        // Garante que o dashboard inicialize com o filtro "Hoje"
        await carregarDadosEAtualizarDashboard(); 
        toggleLoading(false);
    }

    function configurarFiltrosEEventos() {
        document.getElementById('aplicar-filtro').addEventListener('click', carregarDadosEAtualizarDashboard);
        document.getElementById('salvar-taxas').addEventListener('click', salvarTaxas);
        document.querySelectorAll('.filtro-rapido').forEach(btn => {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.filtro-rapido').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                atualizarDatasPorPeriodo(this.dataset.periodo);
                carregarDadosEAtualizarDashboard(); // Recarrega os dados ao clicar no filtro rápido
            });
        });
        document.querySelectorAll('.report-option-card button').forEach(button => {
            button.addEventListener('click', () => gerarRelatorioPDF(button.dataset.reportType));
        });
        // Define o filtro inicial para 'hoje'
        atualizarDatasPorPeriodo('hoje');
    }

    /**
     * CORREÇÃO: Função corrigida para criar datas ISO sem problemas de fuso horário
     */
    const createLocalISO = (dateStr, endOfDay = false) => {
        // Cria a data no fuso horário local
        const date = new Date(dateStr);
        
        if (endOfDay) {
            date.setHours(23, 59, 59, 999);
        } else {
            date.setHours(0, 0, 0, 0);
        }
        
        // Converte para UTC para evitar problemas de fuso horário
        const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        return utcDate.toISOString();
    };

    function atualizarDatasPorPeriodo(periodo) {
        const hoje = new Date();
        // Zera o tempo para começar o cálculo do dia corretamente
        hoje.setHours(0, 0, 0, 0); 
        let inicio = new Date(hoje);
        let fim = new Date(hoje); 

        switch (periodo) {
            case 'ontem':
                inicio.setDate(inicio.getDate() - 1);
                fim.setDate(fim.getDate() - 1);
                break;
            case 'semana':
                // Início da semana (Domingo)
                inicio.setDate(inicio.getDate() - inicio.getDay());
                fim = new Date(); // Fim é o dia atual
                break;
            case 'mes':
                // Primeiro dia do mês
                inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                fim = new Date(); // Fim é o dia atual
                break;
            case 'hoje':
            default:
                // Inicio e Fim já são o dia de hoje
                break;
        }
        // Os inputs de data (HTML) devem ser no formato YYYY-MM-DD
        document.getElementById('data-inicio').value = inicio.toISOString().split('T')[0];
        document.getElementById('data-fim').value = fim.toISOString().split('T')[0];
    }

    async function carregarDadosEAtualizarDashboard() {
        let dataInicioInput = document.getElementById('data-inicio').value;
        let dataFimInput = document.getElementById('data-fim').value;
        
        if (!dataInicioInput || !dataFimInput) {
            mostrarMensagem('Período de datas inválido.', 'error'); return;
        }
        
        // CORREÇÃO: Usa a função auxiliar corrigida para criar as strings de consulta
        const dataInicioQuery = createLocalISO(dataInicioInput); 
        const dataFimQuery = createLocalISO(dataFimInput, true); 

        // Armazena as datas do dashboard no formato de input (YYYY-MM-DD)
        dataInicioDashboard = dataInicioInput;
        dataFimDashboard = dataFimInput;
        
        document.querySelector('.relatorios-header').classList.add('loading-state');
        try {
            const { data, error } = await supabase.from('vendas')
                .select(`*, usuario:sistema_usuarios(nome), itens:vendas_itens(*, produto:produtos(*, categoria:categorias(nome)))`)
                .gte('data_venda', dataInicioQuery)
                .lte('data_venda', dataFimQuery) 
                .order('created_at', { ascending: false });

            if (error) throw error;
            vendasDoDashboard = data || [];
            atualizarDashboardCompleto(vendasDoDashboard);
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            mostrarMensagem('Não foi possível carregar os dados de vendas.', 'error');
        } finally {
            document.querySelector('.relatorios-header').classList.remove('loading-state');
        }
    }

    function atualizarDashboardCompleto(dados) {
        const faturamentoTotal = dados.reduce((sum, v) => sum + v.total, 0);
        const totalTransacoes = dados.length;
        const ticketMedio = totalTransacoes > 0 ? faturamentoTotal / totalTransacoes : 0;
        
        // Cálculo de Vendas/Dia ajustado
        const dataInicioObj = new Date(dataInicioDashboard);
        const dataFimObj = new Date(dataFimDashboard);
        const diffTime = Math.abs(dataFimObj - dataInicioObj);
        // Adiciona +1 para incluir o dia final. Ex: 01/10 a 01/10 é 1 dia.
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1); 
        const vendasPorDia = totalTransacoes / diffDays;

        document.getElementById('kpi-faturamento').textContent = formatarMoeda(faturamentoTotal);
        document.getElementById('kpi-transacoes').textContent = totalTransacoes;
        document.getElementById('kpi-ticket-medio').textContent = formatarMoeda(ticketMedio);
        document.getElementById('kpi-vendas-dia').textContent = vendasPorDia.toFixed(1);

        Object.values(charts).forEach(chart => { if (chart) chart.destroy(); });

        criarGraficoPagamentos(dados);
        criarGraficoCategorias(dados);
        criarGraficoTopProdutos(dados);
        atualizarTabelaVendasRecentes(dados);
    }
    
    const criarGrafico = (elementId, type, data, options) => {
        const ctx = document.getElementById(elementId);
        if (!ctx) return null;
        return new Chart(ctx.getContext('2d'), { type, data, options });
    };

    function criarGraficoPagamentos(dados) {
        const pagamentos = dados.reduce((acc, v) => { const forma = (v.forma_pagamento || 'N/A').replace('_', ' '); acc[forma] = (acc[forma] || 0) + v.total; return acc; }, {});
        charts.pagamentos = criarGrafico('chart-pagamentos', 'doughnut', {
            labels: Object.keys(pagamentos), datasets: [{ data: Object.values(pagamentos), backgroundColor: ['#ff69b4', '#8a2be2', '#28a745', '#ffc107'] }]
        }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } });
    }
    
    function criarGraficoCategorias(dados) {
        const categorias = {};
        dados.forEach(v => (v.itens || []).forEach(item => {
            const cat = item.produto?.categoria?.nome || 'Sem Categoria';
            categorias[cat] = (categorias[cat] || 0) + (item.preco_unitario * item.quantidade);
        }));
        charts.categorias = criarGrafico('chart-categorias', 'pie', {
            labels: Object.keys(categorias), datasets: [{ data: Object.values(categorias), backgroundColor: ['#17a2b8', '#dc3545', '#6f42c1', '#fd7e14', '#20c997'] }]
        }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } });
    }

    function criarGraficoTopProdutos(dados) {
        const produtos = {};
        dados.forEach(v => (v.itens || []).forEach(item => {
            const nome = item.produto?.nome || 'N/A';
            produtos[nome] = (produtos[nome] || 0) + (item.preco_unitario * item.quantidade);
        }));
        const sortedProdutos = Object.entries(produtos).sort((a,b) => b[1] - a[1]).slice(0, 5).reverse();
        charts.topProdutos = criarGrafico('chart-top-produtos', 'bar', {
            labels: sortedProdutos.map(p => p[0]),
            datasets: [{ label: 'Valor Vendido', data: sortedProdutos.map(p => p[1]), backgroundColor: '#8a2be2' }]
        }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } });
    }

    function atualizarTabelaVendasRecentes(dados) {
        const tbody = document.getElementById('tabela-vendas-recentes');
        tbody.innerHTML = '';
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhuma venda no período.</td></tr>';
            return;
        }
        dados.slice(0, 7).forEach(v => {
            const totalItens = (v.itens || []).reduce((s, i) => s + i.quantidade, 0);
            tbody.innerHTML += `<tr><td>${new Date(v.created_at).toLocaleDateString('pt-BR')}</td><td>${v.usuario?.nome || 'N/A'}</td><td>${totalItens}</td><td><span class="badge-pagamento">${(v.forma_pagamento || '').replace('_', ' ')}</span></td><td>${formatarMoeda(v.total)}</td></tr>`;
        });
    }
    
    function calcularTaxa(venda, taxaDebito, taxaCredito) {
        if (venda.forma_pagamento === 'cartao_debito') return venda.total * (taxaDebito / 100);
        if (venda.forma_pagamento === 'cartao_credito') return venda.total * (taxaCredito / 100);
        return 0;
    }
    
    async function gerarRelatorioPDF(tipoRelatorio) {
        const pdfInicio = document.getElementById('pdf-data-inicio').value;
        const pdfFim = document.getElementById('pdf-data-fim').value;
        let dadosParaRelatorio, dataInicialRelatorio, dataFinalRelatorio;

        if (pdfInicio && pdfFim) {
            if (new Date(pdfInicio) > new Date(pdfFim)) {
                mostrarMensagem('Data de início do relatório não pode ser maior que a data final.', 'error'); return;
            }
            dataInicialRelatorio = pdfInicio; dataFinalRelatorio = pdfFim;
            mostrarMensagem('Buscando dados para o relatório...', 'info');
            
            // CORREÇÃO: Usa a função auxiliar corrigida
            const dataInicioComInicioDoDia = createLocalISO(pdfInicio);
            const dataFimComFimDoDia = createLocalISO(pdfFim, true);

            try {
                const { data, error } = await supabase.from('vendas').select(`*, usuario:sistema_usuarios(nome), itens:vendas_itens(*, produto:produtos(*, categoria:categorias(nome)))`).gte('data_venda', dataInicioComInicioDoDia).lte('data_venda', dataFimComFimDoDia).order('created_at', { ascending: false });
                if (error) throw error;
                dadosParaRelatorio = data || [];
            } catch (error) {
                mostrarMensagem(`Erro ao buscar dados para o relatório: ${error.message}`, 'error'); return;
            }
        } else {
            // Usa os dados do dashboard (que já foram carregados com as datas corretas)
            dadosParaRelatorio = vendasDoDashboard;
            dataInicialRelatorio = dataInicioDashboard;
            dataFinalRelatorio = dataFimDashboard;
        }

        if (dadosParaRelatorio.length === 0) {
            mostrarMensagem('Não há dados para gerar o relatório no período selecionado.', 'warning'); return;
        }

        // NOVO: Lê as taxas diretamente do input (que foi preenchido pelo Supabase)
        const taxaDebito = parseFloat(document.getElementById('taxa-debito').value) || 0;
        const taxaCredito = parseFloat(document.getElementById('taxa-credito').value) || 0;
        let reportData = {};

        switch (tipoRelatorio) {
            case 'geral': reportData = construirRelatorioGeral(dadosParaRelatorio, taxaDebito, taxaCredito); break;
            case 'pagamento': reportData = construirRelatorioPagamento(dadosParaRelatorio, taxaDebito, taxaCredito); break;
            case 'vendedor': reportData = construirRelatorioVendedor(dadosParaRelatorio, taxaDebito, taxaCredito); break;
            case 'produto': reportData = construirRelatorioProduto(dadosParaRelatorio); break;
        }
        abrirJanelaDeImpressao(reportData, dataInicialRelatorio, dataFinalRelatorio);
    }
    
    function construirRelatorioGeral(dados, taxaDebito, taxaCredito) {
        let totalBruto = 0, totalTaxas = 0, htmlContent = '';
        dados.forEach(venda => {
            const taxa = calcularTaxa(venda, taxaDebito, taxaCredito);
            totalBruto += venda.total;
            totalTaxas += taxa;
            htmlContent += `<tr><td>${new Date(venda.created_at).toLocaleString('pt-BR')}</td><td>${venda.usuario?.nome || 'N/A'}</td><td>${venda.forma_pagamento.replace('_', ' ')}</td><td>${formatarMoeda(venda.total)}</td><td>-${formatarMoeda(taxa)}</td><td>${formatarMoeda(venda.total - taxa)}</td></tr>`;
        });
        return { titulo: 'Relatório Geral de Vendas', cabecalhoTabela: `<th>Data/Hora</th><th>Vendedor</th><th>Pagamento</th><th>Valor Bruto</th><th>Taxa</th><th>Valor Líquido</th>`, htmlContent, resumo: gerarResumoFinanceiro(totalBruto, totalTaxas) };
    }

    function construirRelatorioPagamento(dados, taxaDebito, taxaCredito) {
        const agrupado = {};
        dados.forEach(venda => {
            const forma = venda.forma_pagamento;
            if (!agrupado[forma]) agrupado[forma] = { totalBruto: 0, totalTaxas: 0, count: 0 };
            agrupado[forma].totalBruto += venda.total;
            agrupado[forma].totalTaxas += calcularTaxa(venda, taxaDebito, taxaCredito);
            agrupado[forma].count++;
        });
        let htmlContent = '';
        Object.keys(agrupado).sort().forEach(forma => {
            const d = agrupado[forma];
            htmlContent += `<tr class="group-header"><td colspan="4">${forma.replace(/_/g, ' ').toUpperCase()}</td></tr>`;
            htmlContent += `<tr><td>${d.count}</td><td>${formatarMoeda(d.totalBruto)}</td><td>-${formatarMoeda(d.totalTaxas)}</td><td>${formatarMoeda(d.totalBruto - d.totalTaxas)}</td></tr>`;
        });
        const totalBruto = dados.reduce((s, v) => s + v.total, 0);
        const totalTaxas = dados.reduce((s, v) => s + calcularTaxa(v, taxaDebito, taxaCredito), 0);
        return { titulo: 'Relatório de Vendas por Forma de Pagamento', cabecalhoTabela: `<th>Nº de Vendas</th><th>Total Bruto</th><th>Total Taxas</th><th>Total Líquido</th>`, htmlContent, resumo: gerarResumoFinanceiro(totalBruto, totalTaxas) };
    }

    function construirRelatorioVendedor(dados, taxaDebito, taxaCredito) {
        const agrupado = {};
        dados.forEach(venda => {
            const vendedor = venda.usuario?.nome || 'Não Identificado';
            if (!agrupado[vendedor]) agrupado[vendedor] = { totalBruto: 0, totalTaxas: 0, count: 0 };
            agrupado[vendedor].totalBruto += venda.total;
            agrupado[vendedor].totalTaxas += calcularTaxa(venda, taxaDebito, taxaCredito);
            agrupado[vendedor].count++;
        });
        let htmlContent = '';
        Object.keys(agrupado).sort().forEach(vendedor => {
            const d = agrupado[vendedor];
            htmlContent += `<tr class="group-header"><td colspan="4">${vendedor}</td></tr>`;
            htmlContent += `<tr><td>${d.count}</td><td>${formatarMoeda(d.totalBruto)}</td><td>-${formatarMoeda(d.totalTaxas)}</td><td>${formatarMoeda(d.totalBruto - d.totalTaxas)}</td></tr>`;
        });
        const totalBruto = dados.reduce((s, v) => s + v.total, 0);
        const totalTaxas = dados.reduce((s, v) => s + calcularTaxa(v, taxaDebito, taxaCredito), 0);
        return { titulo: 'Relatório de Performance por Vendedor', cabecalhoTabela: `<th>Nº de Vendas</th><th>Total Bruto</th><th>Total Taxas</th><th>Total Líquido</th>`, htmlContent, resumo: gerarResumoFinanceiro(totalBruto, totalTaxas) };
    }

    function construirRelatorioProduto(dados) {
        const produtos = {};
        dados.forEach(venda => {
            (venda.itens || []).forEach(item => {
                const nome = item.produto?.nome || 'N/A';
                const categoria = item.produto?.categoria?.nome || 'Sem Categoria';
                const chave = `${nome} (${categoria})`;
                if (!produtos[chave]) produtos[chave] = { quantidade: 0, total: 0, categoria };
                produtos[chave].quantidade += item.quantidade;
                produtos[chave].total += (item.preco_unitario * item.quantidade);
            });
        });
        const produtosOrdenados = Object.entries(produtos).sort((a, b) => b[1].total - a[1].total);
        let htmlContent = '';
        produtosOrdenados.forEach(([nome, dadosProd]) => {
            htmlContent += `<tr><td>${nome}</td><td>${dadosProd.quantidade}</td><td>${formatarMoeda(dadosProd.total)}</td></tr>`;
        });
        const totalBruto = produtosOrdenados.reduce((s, [, p]) => s + p.total, 0);
        return { titulo: 'Relatório de Produtos Vendidos', cabecalhoTabela: `<th>Produto</th><th>Quantidade</th><th>Total Vendido</th>`, htmlContent, resumo: `<p><strong>Total Geral de Vendas:</strong> ${formatarMoeda(totalBruto)}</p>` };
    }

    function gerarResumoFinanceiro(totalBruto, totalTaxas) {
        return `<p><strong>Total Bruto:</strong> ${formatarMoeda(totalBruto)}</p><p><strong>Total de Taxas:</strong> -${formatarMoeda(totalTaxas)}</p><p><strong>Total Líquido:</strong> ${formatarMoeda(totalBruto - totalTaxas)}</p>`;
    }

    function abrirJanelaDeImpressao(reportData, dataInicio, dataFim) {
        const printWindow = window.open('', '_blank', 'width=900,height=600');
        const dataInicioFormatada = new Date(dataInicio).toLocaleDateString('pt-BR');
        const dataFimFormatada = new Date(dataFim).toLocaleDateString('pt-BR');
        const periodoTexto = dataInicio === dataFim ? dataInicioFormatada : `${dataInicioFormatada} a ${dataFimFormatada}`;
        printWindow.document.write(`
            <!DOCTYPE html><html><head><title>Relatório - ${reportData.titulo}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .report-header { text-align: center; border-bottom: 2px solid #8a2be2; padding-bottom: 15px; margin-bottom: 20px; }
                .report-title { color: #8a2be2; margin-bottom: 5px; }
                .report-period { font-size: 1.1em; margin-bottom: 15px; }
                .report-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .report-table th, .report-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .report-table th { background-color: #f8f9fa; font-weight: bold; }
                .group-header { background-color: #e9ecef !important; font-weight: bold; }
                .report-summary { background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px; }
                @media print { body { margin: 0; } .no-print { display: none; } }
            </style></head>
            <body>
                <div class="report-header">
                    <h1 class="report-title">${reportData.titulo}</h1>
                    <div class="report-period">Período: ${periodoTexto}</div>
                </div>
                <table class="report-table">
                    <thead><tr>${reportData.cabecalhoTabela}</tr></thead>
                    <tbody>${reportData.htmlContent}</tbody>
                </table>
                <div class="report-summary">${reportData.resumo}</div>
                <div class="no-print" style="margin-top: 20px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; background: #8a2be2; color: white; border: none; border-radius: 5px; cursor: pointer;">Imprimir Relatório</button>
                </div>
            </body></html>
        `);
        printWindow.document.close();
    }

    inicializar();
});