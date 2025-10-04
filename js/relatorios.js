// js/relatorios.js - VERSÃO CORRIGIDA COM ABAS
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando página de relatórios com abas...');

    // LÓGICA DAS ABAS
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove a classe 'active' de todos os botões e painéis
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Adiciona a classe 'active' ao botão clicado e seu painel correspondente
            button.classList.add('active');
            const targetPane = document.getElementById(`tab-${button.dataset.tab}`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // --- O RESTANTE DO CÓDIGO PERMANECE O MESMO ---

    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');
    const acessoNegadoElement = document.getElementById('acesso-negado');

    const toggleDisplay = (element, show) => {
        if (element) element.style.display = show ? 'block' : 'none';
    };

    if (!window.sistemaAuth || !window.sistemaAuth.verificarAutenticacao()) {
        window.location.href = 'login.html';
        return;
    }
    const usuario = window.sistemaAuth.usuarioLogado;
    const tiposComAcesso = ['administrador', 'admin', 'gerente'];
    if (!usuario || !tiposComAcesso.includes(usuario.tipo?.toLowerCase())) {
        toggleDisplay(loadingElement, false);
        toggleDisplay(acessoNegadoElement, true);
        return;
    }

    let vendas = [];
    let charts = {};
    let dataInicio, dataFim;
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    const mostrarMensagem = (mensagem, tipo = 'info') => {
        const container = document.getElementById('alert-container');
        if (!container) return;
        const alert = document.createElement('div');
        alert.className = `alert-moderno alert-${tipo}`;
        alert.innerHTML = `<span>${mensagem}</span><button>&times;</button>`;
        container.appendChild(alert);
        alert.querySelector('button').onclick = () => alert.remove();
        setTimeout(() => alert.remove(), 5000);
    };

    async function inicializar() {
        try {
            toggleDisplay(loadingElement, true);
            configurarFiltros();
            await carregarDadosEAtualizarDashboard();
            toggleDisplay(loadingElement, false);
            toggleDisplay(contentElement, true);
        } catch (error) {
            console.error('❌ Erro fatal na inicialização:', error);
            toggleDisplay(loadingElement, false);
            toggleDisplay(errorElement, true);
        }
    }

    function configurarFiltros() {
        document.getElementById('aplicar-filtro').addEventListener('click', carregarDadosEAtualizarDashboard);
        document.getElementById('gerar-pdf').addEventListener('click', gerarRelatorioPDF);
        document.querySelectorAll('.filtro-rapido').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filtro-rapido').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                atualizarDatasPorPeriodo(this.dataset.periodo);
                carregarDadosEAtualizarDashboard();
            });
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
        
        contentElement.style.opacity = 0.5;

        try {
            const { data, error } = await supabase.from('vendas').select(`*, usuario:sistema_usuarios(nome), itens:vendas_itens(*, produto:produtos(*, categoria:categorias(nome)))`).gte('data_venda', dataInicio).lte('data_venda', dataFim).order('created_at', { ascending: false });
            if (error) throw error;
            vendas = data || [];
            
            atualizarKPIs();
            atualizarGraficos();
            atualizarTabelas();
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            mostrarMensagem('Não foi possível carregar os dados de vendas.', 'error');
        } finally {
            contentElement.style.opacity = 1;
        }
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
            if (venda.forma_pagamento === 'cartao_debito') {
                totalBrutoCartoes += venda.total;
                totalTaxas += venda.total * (taxaDebito / 100);
            } else if (venda.forma_pagamento === 'cartao_credito') {
                totalBrutoCartoes += venda.total;
                totalTaxas += venda.total * (taxaCredito / 100);
            }
        });
        
        const totalLiquidoCartoes = totalBrutoCartoes - totalTaxas;
        
        document.getElementById('cartoes-bruto').textContent = formatarMoeda(totalBrutoCartoes);
        document.getElementById('cartoes-taxas').textContent = `- ${formatarMoeda(totalTaxas)}`;
        document.getElementById('cartoes-liquido').textContent = formatarMoeda(totalLiquidoCartoes);
    }

    function atualizarGraficos() {
        Object.values(charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        criarGraficoVendasDiarias();
        criarGraficoPagamentos();
        criarGraficoCategorias();
    }
    
    function atualizarTabelas() {
        preencherTabelaUltimasVendas();
        preencherTabelaRankingVendedores();
    }

    const criarGrafico = (elementId, type, data, options) => {
        const ctx = document.getElementById(elementId);
        if (!ctx) return null;
        return new Chart(ctx.getContext('2d'), { type, data, options });
    };

    function criarGraficoVendasDiarias() {
        const vendasPorDia = vendas.reduce((acc, venda) => {
            const data = venda.data_venda;
            acc[data] = (acc[data] || 0) + venda.total;
            return acc;
        }, {});
        const labels = Object.keys(vendasPorDia).sort();
        charts.vendasDiarias = criarGrafico('grafico-vendas-diarias', 'bar', {
            labels, datasets: [{ label: 'Vendas (R$)', data: labels.map(label => vendasPorDia[label]), backgroundColor: 'rgba(255, 105, 180, 0.6)' }]
        }, { responsive: true, maintainAspectRatio: false });
    }
    
    function criarGraficoPagamentos() {
        const pagamentos = vendas.reduce((acc, v) => { acc[v.forma_pagamento] = (acc[v.forma_pagamento] || 0) + v.total; return acc; }, {});
        charts.pagamentos = criarGrafico('grafico-pagamentos', 'doughnut', {
            labels: Object.keys(pagamentos), datasets: [{ data: Object.values(pagamentos), backgroundColor: ['#ff69b4', '#8a2be2', '#28a745', '#ffc107'] }]
        }, { responsive: true, maintainAspectRatio: false });
    }
    
    function criarGraficoCategorias() {
        const vendasPorCategoria = {};
        vendas.forEach(v => (v.itens || []).forEach(item => {
            const cat = item.produto?.categoria?.nome || 'N/A';
            vendasPorCategoria[cat] = (vendasPorCategoria[cat] || 0) + (item.preco_unitario * item.quantidade);
        }));
        charts.categorias = criarGrafico('grafico-categorias', 'pie', {
            labels: Object.keys(vendasPorCategoria), datasets: [{ data: Object.values(vendasPorCategoria), backgroundColor: ['#17a2b8', '#dc3545', '#6f42c1', '#fd7e14'] }]
        }, { responsive: true, maintainAspectRatio: false });
    }

    function preencherTabelaUltimasVendas() {
        const tbody = document.getElementById('tabela-ultimas-vendas');
        tbody.innerHTML = '';
        if (vendas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhuma venda no período.</td></tr>';
            return;
        }
        vendas.slice(0, 10).forEach(v => {
            const totalItens = (v.itens || []).reduce((s, i) => s + i.quantidade, 0);
            tbody.innerHTML += `<tr><td>${new Date(v.created_at).toLocaleDateString('pt-BR')}</td><td>${v.cliente || 'N/A'}</td><td>${v.usuario?.nome || 'N/A'}</td><td>${totalItens}</td><td>${formatarMoeda(v.total)}</td><td><span class="badge-pagamento">${(v.forma_pagamento || '').replace('_', ' ')}</span></td></tr>`;
        });
    }
    
    function preencherTabelaRankingVendedores() {
        const tbody = document.getElementById('tabela-ranking-vendedores');
        const perf = {};
        vendas.forEach(v => {
            const nome = v.usuario?.nome || 'N/A';
            if (!perf[nome]) perf[nome] = { vendas: 0, total: 0 };
            perf[nome].vendas++;
            perf[nome].total += v.total;
        });
        const ranking = Object.entries(perf).map(([nome, dados]) => ({ nome, ...dados, ticket: dados.vendas > 0 ? dados.total / dados.vendas : 0 })).sort((a, b) => b.total - a.total);
        tbody.innerHTML = '';
        if (ranking.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum dado de vendedor.</td></tr>';
            return;
        }
        ranking.forEach((vend, i) => {
            tbody.innerHTML += `<tr><td><strong>${i + 1}º</strong></td><td>${vend.nome}</td><td>${vend.vendas}</td><td>${formatarMoeda(vend.total)}</td><td>${formatarMoeda(vend.ticket)}</td></tr>`;
        });
    }

    function gerarRelatorioPDF() {
        const tipoPagamento = document.getElementById('filtro-pagamento-pdf').value;
        const taxaDebito = parseFloat(document.getElementById('taxa-debito').value) || 0;
        const taxaCredito = parseFloat(document.getElementById('taxa-credito').value) || 0;
        const vendasFiltradas = tipoPagamento === 'todos' ? vendas : vendas.filter(v => v.forma_pagamento === tipoPagamento);

        if (vendasFiltradas.length === 0) {
            mostrarMensagem('Nenhuma venda para o filtro selecionado.', 'warning');
            return;
        }

        let totalBruto = 0, totalTaxas = 0, htmlVendas = '';
        vendasFiltradas.forEach(v => {
            let taxa = 0;
            if (v.forma_pagamento === 'cartao_debito') taxa = v.total * (taxaDebito / 100);
            if (v.forma_pagamento === 'cartao_credito') taxa = v.total * (taxaCredito / 100);
            totalBruto += v.total;
            totalTaxas += taxa;
            htmlVendas += `<tr><td>${new Date(v.created_at).toLocaleString('pt-BR')}</td><td>${v.cliente || 'N/A'}</td><td>${formatarMoeda(v.total)}</td><td>-${formatarMoeda(taxa)}</td><td>${formatarMoeda(v.total - taxa)}</td></tr>`;
        });

        const totalLiquido = totalBruto - totalTaxas;
        const dataFormatada = `${new Date(dataInicio + 'T03:00:00').toLocaleDateString('pt-BR')} a ${new Date(dataFim + 'T03:00:00').toLocaleDateString('pt-BR')}`;
        const tipoPagamentoTexto = document.getElementById('filtro-pagamento-pdf').options[document.getElementById('filtro-pagamento-pdf').selectedIndex].text;
        
        const relatorioWindow = window.open('', '_blank');
        relatorioWindow.document.write(`
            <html>
                <head>
                    <title>Relatório de Vendas - ${tipoPagamentoTexto}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; } h1, h2, h3 { color: #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; } .total { font-weight: bold; }
                        .resumo { margin-top: 30px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; max-width: 400px; background-color: #f9f9f9; }
                    </style>
                </head>
                <body>
                    <h1>Relatório de Vendas - Confeitaria Doces Criativos</h1>
                    <h2>Período: ${dataFormatada}</h2>
                    <h3>Filtro de Pagamento: ${tipoPagamentoTexto}</h3>
                    
                    <div class="resumo">
                        <h3>Resumo Financeiro</h3>
                        <p><strong>Total Bruto:</strong> ${formatarMoeda(totalBruto)}</p>
                        <p><strong>Total de Taxas Deduzidas:</strong> - ${formatarMoeda(totalTaxas)}</p>
                        <hr>
                        <p class="total"><strong>Total Líquido Recebido:</strong> ${formatarMoeda(totalLiquido)}</p>
                    </div>

                    <h3>Vendas Detalhadas</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Data/Hora</th><th>Cliente</th><th>Valor Bruto</th><th>Taxa</th><th>Valor Líquido</th>
                            </tr>
                        </thead>
                        <tbody>${htmlVendas}</tbody>
                    </table>
                    <script>
                        setTimeout(() => { window.print(); window.close(); }, 500);
                    <\/script>
                </body>
            </html>
        `);
        relatorioWindow.document.close();
    }
    
    inicializar();
});