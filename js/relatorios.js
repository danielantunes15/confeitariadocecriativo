// js/relatorios.js - Lógica completa para o dashboard de relatórios moderno
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando página de relatórios...');

    // Elementos do DOM
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');
    const acessoNegadoElement = document.getElementById('acesso-negado');

    // Função para mostrar/esconder seções
    const toggleDisplay = (element, show) => {
        if (element) element.style.display = show ? 'block' : 'none';
    };

    // 1. VERIFICAR AUTENTICAÇÃO E PERMISSÕES
    if (!window.sistemaAuth || !window.sistemaAuth.verificarAutenticacao()) {
        console.log('❌ Usuário não autenticado, redirecionando...');
        window.location.href = 'login.html';
        return;
    }

    const usuario = window.sistemaAuth.usuarioLogado;
    const tiposComAcesso = ['administrador', 'admin', 'gerente'];

    if (!usuario || !tiposComAcesso.includes(usuario.tipo?.toLowerCase())) {
        console.log(`❌ Acesso negado para o tipo: ${usuario.tipo}`);
        toggleDisplay(loadingElement, false);
        toggleDisplay(acessoNegadoElement, true);
        return;
    }

    console.log(`✅ Acesso permitido para ${usuario.nome} (Tipo: ${usuario.tipo})`);

    // Variáveis globais
    let vendas = [];
    let charts = {};
    let dataInicio, dataFim;

    // Função de formatação
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    // FUNÇÕES DE UI
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

    // INICIALIZAÇÃO
    async function inicializar() {
        try {
            toggleDisplay(loadingElement, true);
            toggleDisplay(contentElement, false);
            
            configurarFiltros();
            await carregarDadosEAtualizarDashboard();
            
            toggleDisplay(loadingElement, false);
            toggleDisplay(contentElement, true);
            console.log('✅ Dashboard inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro fatal na inicialização:', error);
            toggleDisplay(loadingElement, false);
            toggleDisplay(errorElement, true);
        }
    }

    // CONFIGURAÇÃO DOS FILTROS
    function configurarFiltros() {
        const hoje = new Date();
        const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

        document.getElementById('data-inicio').value = inicioDoMes.toISOString().split('T')[0];
        document.getElementById('data-fim').value = hoje.toISOString().split('T')[0];
        
        document.getElementById('aplicar-filtro').addEventListener('click', carregarDadosEAtualizarDashboard);
        document.getElementById('exportar-relatorio').addEventListener('click', exportarRelatorio);

        document.querySelectorAll('.filtro-rapido').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filtro-rapido').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                atualizarDatasPorPeriodo(this.dataset.periodo);
                carregarDadosEAtualizarDashboard();
            });
        });
    }
    
    function atualizarDatasPorPeriodo(periodo) {
        const hoje = new Date();
        let inicio = new Date();
        let fim = new Date();

        switch (periodo) {
            case 'hoje':
                inicio = hoje;
                break;
            case 'semana':
                inicio.setDate(hoje.getDate() - hoje.getDay());
                break;
            case 'mes':
                inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                break;
            case 'ano':
                inicio = new Date(hoje.getFullYear(), 0, 1);
                break;
        }
        document.getElementById('data-inicio').value = inicio.toISOString().split('T')[0];
        document.getElementById('data-fim').value = fim.toISOString().split('T')[0];
    }

    // CARREGAMENTO DE DADOS PRINCIPAL
    async function carregarDadosEAtualizarDashboard() {
        dataInicio = document.getElementById('data-inicio').value;
        dataFim = document.getElementById('data-fim').value;

        if (!dataInicio || !dataFim || new Date(dataInicio) > new Date(dataFim)) {
            mostrarMensagem('Período de datas inválido.', 'error');
            return;
        }
        
        toggleDisplay(loadingElement, true);
        contentElement.style.opacity = 0.5;

        try {
            const { data, error } = await supabase
                .from('vendas')
                .select(`
                    *,
                    usuario:sistema_usuarios(nome),
                    itens:vendas_itens(
                        *,
                        produto:produtos(
                            nome,
                            categoria:categorias(nome)
                        )
                    )
                `)
                .gte('data_venda', dataInicio)
                .lte('data_venda', dataFim)
                .order('created_at', { ascending: false });

            if (error) throw error;
            vendas = data || [];
            
            console.log(`🔍 ${vendas.length} vendas carregadas.`);
            
            // ATUALIZAR TODO O DASHBOARD
            atualizarKPIs();
            atualizarGraficos();
            atualizarTabelas();

        } catch (error) {
            console.error('❌ Erro ao carregar dados de vendas:', error);
            mostrarMensagem('Não foi possível carregar os dados de vendas.', 'error');
        } finally {
            toggleDisplay(loadingElement, false);
            contentElement.style.opacity = 1;
        }
    }
    
    // ATUALIZAÇÃO DOS COMPONENTES
    function atualizarKPIs() {
        const totalPedidos = vendas.length;
        const totalVendas = vendas.reduce((sum, v) => sum + v.total, 0);
        const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;
        
        let totalProdutos = 0;
        vendas.forEach(v => {
            if (v.itens) {
                totalProdutos += v.itens.reduce((sum, item) => sum + item.quantidade, 0);
            }
        });
        
        const clientesUnicos = [...new Set(vendas.map(v => v.cliente).filter(Boolean))].length;

        document.getElementById('total-vendas').textContent = formatarMoeda(totalVendas);
        document.getElementById('total-pedidos').textContent = totalPedidos;
        document.getElementById('ticket-medio').textContent = formatarMoeda(ticketMedio);
        document.getElementById('produtos-vendidos').textContent = totalProdutos;
        document.getElementById('clientes-unicos').textContent = clientesUnicos;
    }

    function atualizarGraficos() {
        // Destruir gráficos antigos para evitar sobreposição
        Object.values(charts).forEach(chart => chart.destroy());

        criarGraficoVendasDiarias();
        criarGraficoPagamentos();
        criarGraficoCategorias();
        criarGraficoProdutosMaisVendidos();
        criarGraficoPerformanceVendedores();
    }
    
    function atualizarTabelas() {
        preencherTabelaUltimasVendas();
        preencherTabelaRankingVendedores();
    }

    // CRIAÇÃO DOS GRÁFICOS
    const criarGrafico = (ctx, type, data, options) => {
        if (!ctx) return null;
        return new Chart(ctx, { type, data, options });
    };

    function criarGraficoVendasDiarias() {
        const vendasPorDia = vendas.reduce((acc, venda) => {
            const data = venda.data_venda;
            acc[data] = (acc[data] || 0) + venda.total;
            return acc;
        }, {});

        const labels = Object.keys(vendasPorDia).sort();
        const data = labels.map(label => vendasPorDia[label]);

        charts.vendasDiarias = criarGrafico(
            document.getElementById('grafico-vendas-diarias').getContext('2d'),
            'bar',
            {
                labels,
                datasets: [{
                    label: 'Vendas (R$)',
                    data,
                    backgroundColor: 'rgba(255, 105, 180, 0.6)',
                    borderColor: 'rgba(255, 105, 180, 1)',
                    borderWidth: 1
                }]
            },
            { responsive: true, maintainAspectRatio: false }
        );
    }
    
    function criarGraficoPagamentos() {
        const pagamentos = vendas.reduce((acc, venda) => {
            const forma = venda.forma_pagamento || 'Outro';
            acc[forma] = (acc[forma] || 0) + venda.total;
            return acc;
        }, {});
        
        charts.pagamentos = criarGrafico(
            document.getElementById('grafico-pagamentos').getContext('2d'),
            'doughnut',
            {
                labels: Object.keys(pagamentos),
                datasets: [{ data: Object.values(pagamentos), backgroundColor: ['#ff69b4', '#8a2be2', '#28a745', '#ffc107'] }]
            },
            { responsive: true, maintainAspectRatio: false }
        );
    }
    
    function criarGraficoCategorias() {
        const vendasPorCategoria = {};
        vendas.forEach(venda => {
            venda.itens.forEach(item => {
                const categoria = item.produto?.categoria?.nome || 'Sem Categoria';
                const valorItem = item.preco_unitario * item.quantidade;
                vendasPorCategoria[categoria] = (vendasPorCategoria[categoria] || 0) + valorItem;
            });
        });
        
        charts.categorias = criarGrafico(
            document.getElementById('grafico-categorias').getContext('2d'),
            'pie',
            {
                labels: Object.keys(vendasPorCategoria),
                datasets: [{ data: Object.values(vendasPorCategoria), backgroundColor: ['#17a2b8', '#dc3545', '#6f42c1', '#fd7e14', '#20c997'] }]
            },
            { responsive: true, maintainAspectRatio: false }
        );
    }

    function criarGraficoProdutosMaisVendidos() {
        const vendasPorProduto = {};
        vendas.forEach(venda => {
            venda.itens.forEach(item => {
                const nomeProduto = item.produto?.nome || `ID ${item.produto_id}`;
                vendasPorProduto[nomeProduto] = (vendasPorProduto[nomeProduto] || 0) + item.quantidade;
            });
        });

        const sortedProdutos = Object.entries(vendasPorProduto).sort((a, b) => b[1] - a[1]).slice(0, 8);

        charts.produtos = criarGrafico(
            document.getElementById('grafico-produtos').getContext('2d'),
            'bar',
            {
                labels: sortedProdutos.map(p => p[0]),
                datasets: [{ label: 'Quantidade Vendida', data: sortedProdutos.map(p => p[1]), backgroundColor: '#36a2eb' }]
            },
            { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
        );
    }
    
    function criarGraficoPerformanceVendedores() {
        const vendasPorVendedor = {};
        vendas.forEach(venda => {
            const nomeVendedor = venda.usuario?.nome || 'Não identificado';
            vendasPorVendedor[nomeVendedor] = (vendasPorVendedor[nomeVendedor] || 0) + venda.total;
        });

        const sortedVendedores = Object.entries(vendasPorVendedor).sort((a, b) => b[1] - a[1]).slice(0, 8);

        charts.vendedores = criarGrafico(
            document.getElementById('grafico-vendedores').getContext('2d'),
            'bar',
            {
                labels: sortedVendedores.map(v => v[0]),
                datasets: [{ label: 'Valor Vendido (R$)', data: sortedVendedores.map(v => v[1]), backgroundColor: '#4bc0c0' }]
            },
            { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
        );
    }

    // PREENCHIMENTO DAS TABELAS
    function preencherTabelaUltimasVendas() {
        const tbody = document.getElementById('tabela-ultimas-vendas');
        tbody.innerHTML = '';
        const ultimasVendas = vendas.slice(0, 10);
        
        if (ultimasVendas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Nenhuma venda no período.</td></tr>';
            return;
        }

        ultimasVendas.forEach(venda => {
            const totalItens = venda.itens.reduce((sum, item) => sum + item.quantidade, 0);
            const dataFormatada = new Date(venda.created_at).toLocaleDateString('pt-BR');
            tbody.innerHTML += `
                <tr>
                    <td>${dataFormatada}</td>
                    <td>${venda.cliente || 'N/A'}</td>
                    <td>${venda.usuario?.nome || 'N/A'}</td>
                    <td>${totalItens}</td>
                    <td>${formatarMoeda(venda.total)}</td>
                    <td><span class="badge-pagamento">${venda.forma_pagamento}</span></td>
                </tr>
            `;
        });
    }
    
    function preencherTabelaRankingVendedores() {
        const tbody = document.getElementById('tabela-ranking-vendedores');
        const performance = {};

        vendas.forEach(venda => {
            const nomeVendedor = venda.usuario?.nome || 'Não identificado';
            if (!performance[nomeVendedor]) {
                performance[nomeVendedor] = { vendas: 0, total: 0 };
            }
            performance[nomeVendedor].vendas++;
            performance[nomeVendedor].total += venda.total;
        });

        const ranking = Object.entries(performance)
            .map(([nome, dados]) => ({
                nome,
                ...dados,
                ticketMedio: dados.vendas > 0 ? dados.total / dados.vendas : 0
            }))
            .sort((a, b) => b.total - a.total);

        tbody.innerHTML = '';
        if (ranking.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">Nenhum dado de vendedor.</td></tr>';
            return;
        }
        
        ranking.forEach((vendedor, index) => {
            tbody.innerHTML += `
                <tr>
                    <td><strong>${index + 1}º</strong></td>
                    <td>${vendedor.nome}</td>
                    <td>${vendedor.vendas}</td>
                    <td>${formatarMoeda(vendedor.total)}</td>
                    <td>${formatarMoeda(vendedor.ticketMedio)}</td>
                </tr>
            `;
        });
    }

    // FUNÇÃO DE EXPORTAÇÃO
    function exportarRelatorio() {
        const relatorio = {
            periodo: { inicio: dataInicio, fim: dataFim },
            geradoEm: new Date().toISOString(),
            kpis: {
                totalVendas: document.getElementById('total-vendas').textContent,
                totalPedidos: document.getElementById('total-pedidos').textContent,
                ticketMedio: document.getElementById('ticket-medio').textContent,
            },
            vendas: vendas
        };
        const blob = new Blob([JSON.stringify(relatorio, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_vendas_${dataInicio}_${dataFim}.json`;
        a.click();
        URL.revokeObjectURL(url);
        mostrarMensagem('Relatório exportado com sucesso!', 'success');
    }

    // INICIAR APLICAÇÃO
    inicializar();
});