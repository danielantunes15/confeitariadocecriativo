// js/relatorios.js - VERSÃO AVANÇADA COM MÚLTIPLOS RELATÓRIOS E CONFIGURAÇÕES
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
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const acessoNegadoElement = document.getElementById('acesso-negado');
    const errorElement = document.getElementById('error-message');

    const toggleDisplay = (element, show) => {
        if (element) element.style.display = show ? 'block' : 'none';
    };

    if (!window.sistemaAuth?.verificarAutenticacao()) { window.location.href = 'login.html'; return; }
    const usuario = window.sistemaAuth.usuarioLogado;
    if (!['administrador', 'admin', 'gerente'].includes(usuario.tipo?.toLowerCase())) {
        toggleDisplay(contentElement, false);
        toggleDisplay(acessoNegadoElement, true);
        return;
    }

    let vendas = [];
    let dataInicio, dataFim;
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

    function salvarTaxas() {
        const taxaDebito = document.getElementById('taxa-debito').value;
        const taxaCredito = document.getElementById('taxa-credito').value;
        localStorage.setItem('confeitaria_taxa_debito', taxaDebito);
        localStorage.setItem('confeitaria_taxa_credito', taxaCredito);
        mostrarMensagem('Taxas salvas com sucesso!', 'success');
        atualizarDashboard();
    }

    function carregarTaxas() {
        const taxaDebito = localStorage.getItem('confeitaria_taxa_debito') || '';
        const taxaCredito = localStorage.getItem('confeitaria_taxa_credito') || '';
        document.getElementById('taxa-debito').value = taxaDebito;
        document.getElementById('taxa-credito').value = taxaCredito;
    }

    async function inicializar() {
        toggleLoading(true);
        carregarTaxas();
        configurarFiltrosEEventos();
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
                carregarDadosEAtualizarDashboard();
            });
        });
        document.querySelectorAll('.report-option-card button').forEach(button => {
            button.addEventListener('click', () => gerarRelatorioPDF(button.dataset.reportType));
        });
        atualizarDatasPorPeriodo('hoje');
    }

    function atualizarDatasPorPeriodo(periodo) {
        const hoje = new Date();
        let inicio = new Date(hoje);
        let fim = new Date(hoje);

        switch (periodo) {
            case 'ontem':
                inicio.setDate(hoje.getDate() - 1);
                fim.setDate(hoje.getDate() - 1);
                break;
            case 'semana':
                inicio.setDate(hoje.getDate() - hoje.getDay());
                break;
            case 'mes':
                inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                break;
        }
        document.getElementById('data-inicio').value = inicio.toISOString().split('T')[0];
        document.getElementById('data-fim').value = fim.toISOString().split('T')[0];
    }

    async function carregarDadosEAtualizarDashboard() {
        dataInicio = document.getElementById('data-inicio').value;
        dataFim = document.getElementById('data-fim').value;

        if (!dataInicio || !dataFim || new Date(dataInicio) > new Date(dataFim)) {
            mostrarMensagem('Período de datas inválido.', 'error');
            return;
        }

        const loadingIndicator = document.querySelector('.relatorios-header');
        if (loadingIndicator) loadingIndicator.classList.add('loading-state');
        
        try {
            const { data, error } = await supabase.from('vendas').select(`*, usuario:sistema_usuarios(nome), itens:vendas_itens(*, produto:produtos(*, categoria:categorias(nome)))`).gte('data_venda', dataInicio).lte('data_venda', dataFim).order('created_at', { ascending: false });
            if (error) throw error;
            vendas = data || [];
            atualizarDashboard();
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            mostrarMensagem('Não foi possível carregar os dados de vendas.', 'error');
            toggleDisplay(errorElement, true);
        } finally {
            if (loadingIndicator) loadingIndicator.classList.remove('loading-state');
        }
    }

    function atualizarDashboard() {
        atualizarKPIs();
        // Adicione aqui as chamadas para atualizar gráficos se necessário
    }

    function atualizarKPIs() {
        const totalPedidos = vendas.length;
        const totalVendas = vendas.reduce((sum, v) => sum + v.total, 0);
        const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;

        document.getElementById('total-vendas').textContent = formatarMoeda(totalVendas);
        document.getElementById('total-pedidos').textContent = totalPedidos;
        document.getElementById('ticket-medio').textContent = formatarMoeda(ticketMedio);
        
        const taxaDebito = parseFloat(document.getElementById('taxa-debito').value) || 0;
        const taxaCredito = parseFloat(document.getElementById('taxa-credito').value) || 0;
        
        let totalBrutoCartoes = 0;
        let totalTaxas = 0;
        
        vendas.forEach(venda => {
            totalBrutoCartoes += (venda.forma_pagamento === 'cartao_debito' || venda.forma_pagamento === 'cartao_credito') ? venda.total : 0;
            totalTaxas += calcularTaxa(venda, taxaDebito, taxaCredito);
        });
        
        document.getElementById('cartoes-bruto').textContent = formatarMoeda(totalBrutoCartoes);
        document.getElementById('cartoes-taxas').textContent = `- ${formatarMoeda(totalTaxas)}`;
        document.getElementById('cartoes-liquido').textContent = formatarMoeda(totalBrutoCartoes - totalTaxas);
    }
    
    function calcularTaxa(venda, taxaDebito, taxaCredito) {
        if (venda.forma_pagamento === 'cartao_debito') return venda.total * (taxaDebito / 100);
        if (venda.forma_pagamento === 'cartao_credito') return venda.total * (taxaCredito / 100);
        return 0;
    }
    
    function gerarRelatorioPDF(tipoRelatorio) {
        if (vendas.length === 0) {
            mostrarMensagem('Não há dados para gerar o relatório no período selecionado.', 'warning');
            return;
        }

        const taxaDebito = parseFloat(localStorage.getItem('confeitaria_taxa_debito')) || 0;
        const taxaCredito = parseFloat(localStorage.getItem('confeitaria_taxa_credito')) || 0;
        let reportData = {};

        switch (tipoRelatorio) {
            case 'geral':
                reportData = construirRelatorioGeral(taxaDebito, taxaCredito);
                break;
            case 'pagamento':
                reportData = construirRelatorioPagamento(taxaDebito, taxaCredito);
                break;
            case 'vendedor':
                reportData = construirRelatorioVendedor(taxaDebito, taxaCredito);
                break;
            case 'produto':
                reportData = construirRelatorioProduto();
                break;
        }

        abrirJanelaDeImpressao(reportData);
    }
    
    function construirRelatorioGeral(taxaDebito, taxaCredito) {
        let totalBruto = 0, totalTaxas = 0, htmlContent = '';
        vendas.forEach(venda => {
            const taxa = calcularTaxa(venda, taxaDebito, taxaCredito);
            totalBruto += venda.total;
            totalTaxas += taxa;
            htmlContent += `<tr><td>${new Date(venda.created_at).toLocaleString('pt-BR')}</td><td>${venda.usuario?.nome || 'N/A'}</td><td>${venda.forma_pagamento.replace('_', ' ')}</td><td>${formatarMoeda(venda.total)}</td><td>-${formatarMoeda(taxa)}</td><td>${formatarMoeda(venda.total - taxa)}</td></tr>`;
        });
        return { titulo: 'Relatório Geral de Vendas', cabecalhoTabela: `<th>Data/Hora</th><th>Vendedor</th><th>Pagamento</th><th>Valor Bruto</th><th>Taxa</th><th>Valor Líquido</th>`, htmlContent, resumo: gerarResumoFinanceiro(totalBruto, totalTaxas) };
    }

    function construirRelatorioPagamento(taxaDebito, taxaCredito) {
        const agrupado = {};
        vendas.forEach(venda => {
            const forma = venda.forma_pagamento;
            if (!agrupado[forma]) agrupado[forma] = { totalBruto: 0, totalTaxas: 0, count: 0 };
            agrupado[forma].totalBruto += venda.total;
            agrupado[forma].totalTaxas += calcularTaxa(venda, taxaDebito, taxaCredito);
            agrupado[forma].count++;
        });

        let htmlContent = '';
        Object.keys(agrupado).sort().forEach(forma => {
            const dados = agrupado[forma];
            htmlContent += `<tr class="group-header"><td colspan="4">${forma.replace('_', ' ').toUpperCase()}</td></tr>`
            htmlContent += `<tr><td>${dados.count}</td><td>${formatarMoeda(dados.totalBruto)}</td><td>-${formatarMoeda(dados.totalTaxas)}</td><td>${formatarMoeda(dados.totalBruto - dados.totalTaxas)}</td></tr>`;
        });
        
        const totalBruto = vendas.reduce((s, v) => s + v.total, 0);
        const totalTaxas = vendas.reduce((s, v) => s + calcularTaxa(v, taxaDebito, taxaCredito), 0);
        
        return { titulo: 'Relatório de Vendas por Forma de Pagamento', cabecalhoTabela: `<th>Nº de Vendas</th><th>Total Bruto</th><th>Total Taxas</th><th>Total Líquido</th>`, htmlContent, resumo: gerarResumoFinanceiro(totalBruto, totalTaxas) };
    }

    function construirRelatorioVendedor(taxaDebito, taxaCredito) {
        const agrupado = {};
        vendas.forEach(venda => {
            const vendedor = venda.usuario?.nome || 'Não Identificado';
            if (!agrupado[vendedor]) agrupado[vendedor] = { totalBruto: 0, totalTaxas: 0, count: 0 };
            agrupado[vendedor].totalBruto += venda.total;
            agrupado[vendedor].totalTaxas += calcularTaxa(venda, taxaDebito, taxaCredito);
            agrupado[vendedor].count++;
        });

        let htmlContent = '';
        Object.keys(agrupado).sort().forEach(vendedor => {
            const dados = agrupado[vendedor];
            htmlContent += `<tr class="group-header"><td colspan="4">${vendedor}</td></tr>`
            htmlContent += `<tr><td>${dados.count}</td><td>${formatarMoeda(dados.totalBruto)}</td><td>-${formatarMoeda(dados.totalTaxas)}</td><td>${formatarMoeda(dados.totalBruto - dados.totalTaxas)}</td></tr>`;
        });

        const totalBruto = vendas.reduce((s, v) => s + v.total, 0);
        const totalTaxas = vendas.reduce((s, v) => s + calcularTaxa(v, taxaDebito, taxaCredito), 0);

        return { titulo: 'Relatório de Performance de Vendedores', cabecalhoTabela: `<th>Nº de Vendas</th><th>Total Bruto</th><th>Total Taxas</th><th>Total Líquido</th>`, htmlContent, resumo: gerarResumoFinanceiro(totalBruto, totalTaxas) };
    }

    function construirRelatorioProduto() {
        const produtos = {};
        vendas.forEach(venda => {
            (venda.itens || []).forEach(item => {
                const nome = item.produto?.nome || 'Produto desconhecido';
                if (!produtos[nome]) produtos[nome] = { quantidade: 0, total: 0 };
                produtos[nome].quantidade += item.quantidade;
                produtos[nome].total += item.quantidade * item.preco_unitario;
            });
        });
        
        let htmlContent = '';
        Object.entries(produtos).sort((a,b) => b[1].total - a[1].total).forEach(([nome, dados]) => {
            htmlContent += `<tr><td>${nome}</td><td>${dados.quantidade}</td><td>${formatarMoeda(dados.total / dados.quantidade)}</td><td>${formatarMoeda(dados.total)}</td></tr>`;
        });

        const totalBruto = Object.values(produtos).reduce((s, p) => s + p.total, 0);
        const resumo = `<h3>Resumo de Produtos</h3><p class="total"><strong>Valor Total Vendido:</strong> ${formatarMoeda(totalBruto)}</p>`;
        
        return { titulo: 'Relatório de Produtos Vendidos', cabecalhoTabela: `<th>Produto</th><th>Quantidade</th><th>Preço Médio</th><th>Valor Total</th>`, htmlContent, resumo };
    }
    
    function gerarResumoFinanceiro(totalBruto, totalTaxas) {
        return `<h3>Resumo Financeiro</h3><p><strong>Total Bruto:</strong> ${formatarMoeda(totalBruto)}</p><p><strong>Total de Taxas Deduzidas:</strong> - ${formatarMoeda(totalTaxas)}</p><hr><p class="total"><strong>Total Líquido Recebido:</strong> ${formatarMoeda(totalBruto - totalTaxas)}</p>`;
    }

    function abrirJanelaDeImpressao({ titulo, resumo, cabecalhoTabela, htmlContent }) {
        const dataFormatada = `${new Date(dataInicio + 'T03:00:00').toLocaleDateString('pt-BR')} a ${new Date(dataFim + 'T03:00:00').toLocaleDateString('pt-BR')}`;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${titulo}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 20px; color: #333; }
                        h1, h2, h3 { color: #ff69b4; } h1 { font-size: 24px; } h2 { font-size: 20px; border-bottom: 2px solid #ff69b4; padding-bottom: 5px;} h3 { font-size: 16px; margin-top: 30px;}
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                        th { background-color: #fce4ec; } .total { font-weight: bold; font-size: 1.1em; }
                        .resumo { margin: 20px 0; padding: 15px; border-radius: 8px; background-color: #f8f9fa; border: 1px solid #dee2e6; max-width: 450px; }
                        tr:nth-child(even) { background-color: #f8f9fa; }
                        .group-header td { background-color: #e9ecef; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>Doces Criativos</h1>
                    <h2>${titulo}</h2>
                    <p><strong>Período:</strong> ${dataFormatada}</p>
                    <div class="resumo">${resumo}</div>
                    <h3>Detalhes</h3>
                    <table>
                        <thead><tr>${cabecalhoTabela}</tr></thead>
                        <tbody>${htmlContent}</tbody>
                    </table>
                    <script>setTimeout(() => { window.print(); window.close(); }, 500);<\/script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    inicializar();
});