// js/relatorios.js - VERSÃO COMPLETA CORRIGIDA E SINCRONIZADA
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando página de relatórios...');
    
    // Verificar autenticação
    if (!window.sistemaAuth || !window.sistemaAuth.verificarAutenticacao()) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos do DOM
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');

    // Variáveis globais
    let dadosRelatorios = {
        vendas: [],
        produtos: [],
        vendedores: [],
        categorias: []
    };
    let charts = {};
    let limiteVendas = 10;

    // FUNÇÃO: Mostrar/esconder loading
    function toggleLoading(show) {
        if (loadingElement) loadingElement.style.display = show ? 'block' : 'none';
        if (contentElement) contentElement.style.display = show ? 'none' : 'block';
        if (errorElement) errorElement.style.display = 'none';
    }

    // FUNÇÃO: Mostrar erro
    function mostrarErro(mensagem) {
        toggleLoading(false);
        if (errorElement) {
            errorElement.style.display = 'block';
            errorElement.querySelector('p').textContent = mensagem;
        }
    }

    try {
        // Mostrar loading inicial
        toggleLoading(true);

        // Configurar data atual como padrão
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        document.getElementById('data-inicio').value = formatarDataISO(primeiroDiaMes);
        document.getElementById('data-fim').value = formatarDataISO(hoje);

        // Configurar event listeners
        configurarEventListeners();

        // Carregar dados iniciais
        await carregarRelatorios();

        console.log('✅ Módulo de relatórios inicializado com sucesso!');

    } catch (error) {
        console.error('Erro na inicialização:', error);
        mostrarErro('Erro ao carregar relatórios: ' + error.message);
    }

    // FUNÇÃO: Configurar event listeners
    function configurarEventListeners() {
        const periodoSelect = document.getElementById('periodo');
        const filtroDatas = document.getElementById('filtro-datas');
        const aplicarFiltroBtn = document.getElementById('aplicar-filtro');
        const exportarRelatorioBtn = document.getElementById('exportar-relatorio');
        const limparFiltrosBtn = document.getElementById('limpar-filtros');
        const atualizarDadosBtn = document.getElementById('atualizar-dados');

        // Filtro de período
        if (periodoSelect) {
            periodoSelect.addEventListener('change', function() {
                if (this.value === 'personalizado') {
                    filtroDatas.style.display = 'flex';
                } else {
                    filtroDatas.style.display = 'none';
                    atualizarDatasPorPeriodo(this.value);
                    carregarRelatorios();
                }
            });
        }

        // Filtros rápidos
        document.querySelectorAll('.filtro-rapido').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filtro-rapido').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                const periodo = this.getAttribute('data-periodo');
                document.getElementById('periodo').value = periodo;
                atualizarDatasPorPeriodo(periodo);
                carregarRelatorios();
            });
        });

        // Aplicar filtros
        if (aplicarFiltroBtn) {
            aplicarFiltroBtn.addEventListener('click', carregarRelatorios);
        }

        // Limpar filtros
        if (limparFiltrosBtn) {
            limparFiltrosBtn.addEventListener('click', limparFiltros);
        }

        // Atualizar dados
        if (atualizarDadosBtn) {
            atualizarDadosBtn.addEventListener('click', carregarRelatorios);
        }

        // Exportar relatório
        if (exportarRelatorioBtn) {
            exportarRelatorioBtn.addEventListener('click', exportarRelatorio);
        }

        // Ações dos gráficos
        document.querySelectorAll('.btn-chart-action').forEach(btn => {
            btn.addEventListener('click', function() {
                const chartId = this.getAttribute('data-chart');
                const chartType = this.getAttribute('data-type');
                
                document.querySelectorAll(`[data-chart="${chartId}"]`).forEach(b => {
                    b.classList.remove('active');
                });
                this.classList.add('active');
                
                alterarTipoGrafico(chartId, chartType);
            });
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            window.sistemaAuth.fazerLogout();
        });
    }

    // FUNÇÃO: Limpar filtros
    function limparFiltros() {
        document.getElementById('periodo').value = 'mes';
        document.getElementById('filtro-datas').style.display = 'none';
        document.getElementById('filtro-vendedor').value = 'todos';
        document.getElementById('filtro-pagamento').value = 'todos';
        
        // Atualizar datas
        atualizarDatasPorPeriodo('mes');
        
        // Ativar filtro rápido correspondente
        document.querySelectorAll('.filtro-rapido').forEach(b => b.classList.remove('active'));
        document.querySelector('.filtro-rapido[data-periodo="mes"]').classList.add('active');
        
        // Recarregar relatórios
        carregarRelatorios();
        
        mostrarMensagem('Filtros limpos com sucesso!', 'success');
    }

    // FUNÇÃO: Atualizar datas por período
    function atualizarDatasPorPeriodo(periodo) {
        const hoje = new Date();
        let dataInicio, dataFim;

        switch (periodo) {
            case 'hoje':
                dataInicio = new Date(hoje);
                dataFim = new Date(hoje);
                break;
            case 'ontem':
                const ontem = new Date(hoje);
                ontem.setDate(hoje.getDate() - 1);
                dataInicio = ontem;
                dataFim = ontem;
                break;
            case 'semana':
                const inicioSemana = new Date(hoje);
                inicioSemana.setDate(hoje.getDate() - hoje.getDay());
                dataInicio = inicioSemana;
                dataFim = hoje;
                break;
            case 'mes':
                dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                dataFim = hoje;
                break;
            case 'trimestre':
                const trimestre = Math.floor(hoje.getMonth() / 3);
                dataInicio = new Date(hoje.getFullYear(), trimestre * 3, 1);
                dataFim = hoje;
                break;
            case 'ano':
                dataInicio = new Date(hoje.getFullYear(), 0, 1);
                dataFim = hoje;
                break;
            default:
                return;
        }

        document.getElementById('data-inicio').value = formatarDataISO(dataInicio);
        document.getElementById('data-fim').value = formatarDataISO(dataFim);
    }

    // FUNÇÃO: Carregar relatórios principais
    async function carregarRelatorios() {
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;
        
        if (!dataInicio || !dataFim) {
            mostrarMensagem('Selecione um período válido', 'error');
            return;
        }

        if (new Date(dataInicio) > new Date(dataFim)) {
            mostrarMensagem('Data inicial não pode ser maior que data final', 'error');
            return;
        }

        try {
            // MOSTRAR LOADING
            toggleLoading(true);
            
            mostrarMensagem('Carregando relatórios...', 'info');
            
            console.log(`📊 Buscando dados de ${dataInicio} até ${dataFim}`);
            
            // Carregar dados
            await carregarDadosVendas(dataInicio, dataFim);
            
            // Atualizar interface
            atualizarResumo();
            atualizarMetricasTempoReal();
            atualizarTabelas();
            atualizarGraficos();
            
            console.log('✅ Relatórios carregados com sucesso!');
            mostrarMensagem('Relatórios carregados com sucesso!', 'success');
            
        } catch (error) {
            console.error('❌ Erro ao carregar relatórios:', error);
            mostrarMensagem('Erro ao carregar dados: ' + error.message, 'error');
        } finally {
            // SEMPRE ESCONDER LOADING - MESMO COM ERRO
            toggleLoading(false);
        }
    }

    // FUNÇÃO: Carregar dados de vendas (CORRIGIDA E SINCRONIZADA)
    async function carregarDadosVendas(dataInicio, dataFim) {
        try {
            console.log('🔍 Buscando vendas com filtro por data_venda:', { dataInicio, dataFim });
            
            // CORREÇÃO: Usar data_venda em vez de created_at para filtro
            const { data: vendas, error } = await supabase
                .from('vendas')
                .select('*')
                .gte('data_venda', dataInicio)
                .lte('data_venda', dataFim)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Erro ao buscar vendas:', error);
                throw error;
            }

            console.log(`✅ ${vendas?.length || 0} vendas encontradas`);

            // Buscar itens para cada venda
            if (vendas && vendas.length > 0) {
                for (let venda of vendas) {
                    try {
                        // Buscar itens da venda
                        const { data: itens, error: itensError } = await supabase
                            .from('vendas_itens')
                            .select('*')
                            .eq('venda_id', venda.id);

                        if (!itensError && itens) {
                            venda.itens = itens;
                            
                            // Buscar informações dos produtos para cada item
                            for (let item of venda.itens) {
                                try {
                                    const { data: produto, error: produtoError } = await supabase
                                        .from('produtos')
                                        .select('nome, categoria_id')
                                        .eq('id', item.produto_id)
                                        .single();

                                    if (!produtoError && produto) {
                                        item.produto = produto;
                                    }
                                } catch (produtoError) {
                                    console.warn(`⚠️ Erro ao buscar produto ${item.produto_id}:`, produtoError);
                                }
                            }
                        }

                        // Buscar nome do vendedor
                        if (venda.usuario_id) {
                            try {
                                const { data: usuario, error: usuarioError } = await supabase
                                    .from('sistema_usuarios')
                                    .select('nome')
                                    .eq('id', venda.usuario_id)
                                    .single();

                                if (!usuarioError && usuario) {
                                    venda.vendedor_nome = usuario.nome;
                                }
                            } catch (usuarioError) {
                                console.warn(`⚠️ Erro ao buscar vendedor ${venda.usuario_id}:`, usuarioError);
                            }
                        }

                    } catch (vendaError) {
                        console.error(`❌ Erro ao processar venda ${venda.id}:`, vendaError);
                    }
                }
            }

            dadosRelatorios.vendas = vendas || [];
            
            // DEBUG: Mostrar resumo
            if (dadosRelatorios.vendas.length > 0) {
                const total = dadosRelatorios.vendas.reduce((sum, v) => sum + (v.total || 0), 0);
                console.log('💰 Total de vendas:', total);
                console.log('📋 Primeira venda:', dadosRelatorios.vendas[0]);
            }

        } catch (error) {
            console.error('❌ Erro ao carregar dados de vendas:', error);
            dadosRelatorios.vendas = [];
            throw error;
        }
    }

    // FUNÇÃO: Atualizar métricas em tempo real
    function atualizarMetricasTempoReal() {
        const hoje = new Date().toISOString().split('T')[0];
        const vendasHoje = dadosRelatorios.vendas.filter(v => 
            v.data_venda === hoje
        );
        
        const totalVendasHoje = vendasHoje.reduce((sum, v) => sum + (v.total || 0), 0);
        const totalPedidosHoje = vendasHoje.length;
        const clientesHoje = [...new Set(vendasHoje.map(v => v.cliente).filter(Boolean))].length;
        const ticketMedioHoje = totalPedidosHoje > 0 ? totalVendasHoje / totalPedidosHoje : 0;

        document.getElementById('metricas-vendas-hoje').textContent = formatarMoeda(totalVendasHoje);
        document.getElementById('metricas-pedidos-hoje').textContent = totalPedidosHoje;
        document.getElementById('metricas-clientes-hoje').textContent = clientesHoje;
        document.getElementById('metricas-ticket-medio').textContent = formatarMoeda(ticketMedioHoje);
    }

    // FUNÇÃO: Atualizar resumo
    function atualizarResumo() {
        const vendas = dadosRelatorios.vendas || [];
        
        // Calcular totais
        const totalVendas = vendas.reduce((sum, v) => sum + (v.total || 0), 0);
        const totalPedidos = vendas.length;
        const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;
        
        // Calcular produtos vendidos
        let totalProdutos = 0;
        vendas.forEach(venda => {
            if (venda.itens) {
                totalProdutos += venda.itens.reduce((sum, item) => sum + (item.quantidade || 0), 0);
            }
        });
        
        // Calcular clientes únicos
        const clientesUnicos = [...new Set(vendas.map(v => v.cliente).filter(Boolean))].length;
        
        // Calcular vendas por dia (média)
        const dataInicio = new Date(document.getElementById('data-inicio').value);
        const dataFim = new Date(document.getElementById('data-fim').value);
        const diffTime = Math.abs(dataFim - dataInicio);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const vendasPorDia = totalPedidos / diffDays;

        // Atualizar elementos
        document.getElementById('total-vendas').textContent = formatarMoeda(totalVendas);
        document.getElementById('total-pedidos').textContent = totalPedidos;
        document.getElementById('ticket-medio').textContent = formatarMoeda(ticketMedio);
        document.getElementById('produtos-vendidos').textContent = totalProdutos;
        document.getElementById('total-clientes').textContent = clientesUnicos;
        document.getElementById('vendas-por-dia').textContent = vendasPorDia.toFixed(1);

        // Atualizar total de vendas no período
        document.getElementById('total-vendas-periodo').textContent = `${totalPedidos} vendas`;

        // Atualizar variações
        atualizarVariacoes();

        console.log('📊 Resumo atualizado:', {
            totalVendas,
            totalPedidos,
            ticketMedio,
            totalProdutos,
            clientesUnicos,
            vendasPorDia
        });
    }

    // FUNÇÃO: Atualizar variações
    function atualizarVariacoes() {
        // Simular variações (em um sistema real, isso viria de dados históricos)
        const elementosVariacao = [
            { id: 'variacao-vendas', valor: (Math.random() * 20 - 5) },
            { id: 'variacao-pedidos', valor: (Math.random() * 15 - 5) },
            { id: 'variacao-ticket', valor: (Math.random() * 10 - 3) },
            { id: 'variacao-produtos', valor: (Math.random() * 25 - 5) },
            { id: 'variacao-clientes', valor: (Math.random() * 18 - 4) },
            { id: 'variacao-vendas-dia', valor: (Math.random() * 12 - 2) }
        ];

        elementosVariacao.forEach(item => {
            const element = document.getElementById(item.id);
            if (element) {
                const valor = item.valor;
                const isPositiva = valor >= 0;
                element.textContent = (isPositiva ? '+' : '') + valor.toFixed(1) + '%';
                element.className = `variacao ${isPositiva ? 'positiva' : 'negativa'}`;
            }
        });
    }

    // FUNÇÃO: Atualizar gráficos
    function atualizarGraficos() {
        // Destruir gráficos existentes
        Object.values(charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        charts = {};

        // Criar novos gráficos
        criarGraficoPagamento();
        criarGraficoDiario();
        criarGraficoProdutos();
        criarGraficoVendedores();
    }

    // FUNÇÃO: Alterar tipo de gráfico
    function alterarTipoGrafico(chartId, newType) {
        if (charts[chartId]) {
            charts[chartId].destroy();
        }

        switch (chartId) {
            case 'diario':
                criarGraficoDiario(newType);
                break;
            // Adicione outros casos conforme necessário
        }
    }

    // FUNÇÃO: Gráfico de formas de pagamento
    function criarGraficoPagamento() {
        const ctx = document.getElementById('grafico-pagamento');
        if (!ctx) return;
        
        const vendas = dadosRelatorios.vendas || [];
        const pagamentos = {
            dinheiro: 0,
            cartao: 0,
            pix: 0,
            outros: 0
        };
        
        vendas.forEach(venda => {
            const forma = venda.forma_pagamento || 'outros';
            if (pagamentos.hasOwnProperty(forma)) {
                pagamentos[forma] += venda.total || 0;
            } else {
                pagamentos.outros += venda.total || 0;
            }
        });
        
        const labels = ['Dinheiro', 'Cartão', 'PIX', 'Outros'];
        const data = [pagamentos.dinheiro, pagamentos.cartao, pagamentos.pix, pagamentos.outros];
        
        // Só criar gráfico se houver dados
        if (data.reduce((sum, val) => sum + val, 0) === 0) {
            ctx.parentElement.innerHTML = '<div class="no-data">Nenhum dado disponível para o período selecionado</div>';
            return;
        }
        
        charts.pagamento = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384', // Dinheiro - Rosa
                        '#36A2EB', // Cartão - Azul
                        '#4BC0C0', // PIX - Verde água
                        '#FFCE56'  // Outros - Amarelo
                    ],
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${formatarMoeda(value)} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    // FUNÇÃO: Gráfico diário
    function criarGraficoDiario(tipo = 'bar') {
        const ctx = document.getElementById('grafico-diario');
        if (!ctx) return;
        
        const vendas = dadosRelatorios.vendas || [];
        const vendasPorDia = {};
        
        // Agrupar vendas por dia
        vendas.forEach(venda => {
            const data = venda.data_venda;
            if (data) {
                vendasPorDia[data] = (vendasPorDia[data] || 0) + (venda.total || 0);
            }
        });
        
        // Ordenar por data
        const entries = Object.entries(vendasPorDia).sort(([a], [b]) => 
            new Date(a) - new Date(b)
        );
        
        const labels = entries.map(([data]) => {
            return new Date(data).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit'
            });
        });
        const data = entries.map(([,valor]) => valor);
        
        // Só criar gráfico se houver dados
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<div class="no-data">Nenhum dado disponível para o período selecionado</div>';
            return;
        }
        
        const isLine = tipo === 'line';
        
        charts.diario = new Chart(ctx, {
            type: tipo,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Vendas (R$)', 
                    data: data,
                    borderColor: '#FF6384',
                    backgroundColor: isLine ? 'rgba(255, 99, 132, 0.1)' : '#FF6384',
                    borderWidth: isLine ? 3 : 0,
                    fill: isLine,
                    tension: isLine ? 0.4 : 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Vendas: ${formatarMoeda(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatarMoeda(value);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // FUNÇÃO: Gráfico de produtos
    function criarGraficoProdutos() {
        const ctx = document.getElementById('grafico-produtos');
        if (!ctx) return;
        
        // Calcular produtos mais vendidos
        const vendasPorProduto = {};
        dadosRelatorios.vendas.forEach(venda => {
            if (venda.itens) {
                venda.itens.forEach(item => {
                    const produtoId = item.produto_id;
                    const produtoNome = item.produto?.nome || `Produto ${produtoId}`;
                    
                    if (!vendasPorProduto[produtoId]) {
                        vendasPorProduto[produtoId] = {
                            quantidade: 0,
                            nome: produtoNome
                        };
                    }
                    vendasPorProduto[produtoId].quantidade += item.quantidade || 0;
                });
            }
        });
        
        // Ordenar por quantidade e pegar top 8
        const produtosOrdenados = Object.entries(vendasPorProduto)
            .sort(([,a], [,b]) => b.quantidade - a.quantidade)
            .slice(0, 8);
        
        const labels = produtosOrdenados.map(([,info]) => info.nome);
        const data = produtosOrdenados.map(([,info]) => info.quantidade);
        
        // Só criar gráfico se houver dados
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<div class="no-data">Nenhum dado disponível para o período selecionado</div>';
            return;
        }
        
        charts.produtos = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Quantidade Vendida',
                    data: data,
                    backgroundColor: '#36A2EB'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // FUNÇÃO: Gráfico de vendedores
    function criarGraficoVendedores() {
        const ctx = document.getElementById('grafico-vendedores');
        if (!ctx) return;
        
        // Calcular performance dos vendedores
        const vendedoresMap = {};
        dadosRelatorios.vendas.forEach(venda => {
            if (venda.vendedor_nome) {
                if (!vendedoresMap[venda.vendedor_nome]) {
                    vendedoresMap[venda.vendedor_nome] = 0;
                }
                vendedoresMap[venda.vendedor_nome] += venda.total || 0;
            }
        });
        
        const vendedoresOrdenados = Object.entries(vendedoresMap)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 6);
        
        const labels = vendedoresOrdenados.map(([nome]) => nome);
        const data = vendedoresOrdenados.map(([,valor]) => valor);
        
        // Só criar gráfico se houver dados
        if (data.length === 0) {
            ctx.parentElement.innerHTML = '<div class="no-data">Nenhum dado disponível para o período selecionado</div>';
            return;
        }
        
        charts.vendedores = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Vendas (R$)',
                    data: data,
                    backgroundColor: '#4BC0C0'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatarMoeda(value);
                            }
                        }
                    }
                }
            }
        });
    }

    // FUNÇÃO: Atualizar tabelas
    function atualizarTabelas() {
        atualizarTabelaVendas();
        atualizarTabelaVendedores();
    }

    // FUNÇÃO: Tabela de vendas
    function atualizarTabelaVendas() {
        const tbody = document.getElementById('vendas-body');
        const vendas = dadosRelatorios.vendas.slice(0, limiteVendas) || [];
        
        if (vendas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #666; padding: 2rem;">
                        <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <div>Nenhuma venda encontrada</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = vendas.map(venda => {
            const data = venda.data_venda ? 
                new Date(venda.data_venda).toLocaleDateString('pt-BR') : 'N/A';
            const hora = venda.created_at ? 
                new Date(venda.created_at).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }) : 'N/A';
            const cliente = venda.cliente || 'Cliente não identificado';
            const valor = venda.total || 0;
            const formaPagamento = venda.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                                 venda.forma_pagamento === 'cartao' ? 'Cartão' : 
                                 venda.forma_pagamento === 'pix' ? 'PIX' : 'Outro';
            const vendedor = venda.vendedor_nome || 'N/A';
            const itensCount = venda.itens ? venda.itens.length : 0;
            
            return `
                <tr>
                    <td>
                        <div class="data-hora">
                            <div class="data">${data}</div>
                            <div class="hora">${hora}</div>
                        </div>
                    </td>
                    <td>${cliente}</td>
                    <td>
                        <span class="badge-info">${itensCount} item(s)</span>
                    </td>
                    <td><strong>${formatarMoeda(valor)}</strong></td>
                    <td>
                        <span class="badge badge-${venda.forma_pagamento}">
                            ${formaPagamento}
                        </span>
                    </td>
                    <td>${vendedor}</td>
                </tr>
            `;
        }).join('');
    }

    // FUNÇÃO: Tabela de vendedores
    function atualizarTabelaVendedores() {
        const tbody = document.getElementById('vendedores-body');
        
        // Calcular performance dos vendedores
        const vendedoresMap = {};
        dadosRelatorios.vendas.forEach(venda => {
            if (venda.vendedor_nome) {
                if (!vendedoresMap[venda.vendedor_nome]) {
                    vendedoresMap[venda.vendedor_nome] = {
                        vendas: 0,
                        total: 0
                    };
                }
                vendedoresMap[venda.vendedor_nome].vendas += 1;
                vendedoresMap[venda.vendedor_nome].total += venda.total || 0;
            }
        });
        
        const vendedoresOrdenados = Object.entries(vendedoresMap)
            .map(([nome, dados]) => ({
                nome,
                totalVendas: dados.vendas,
                valorTotal: dados.total,
                ticketMedio: dados.vendas > 0 ? dados.total / dados.vendas : 0
            }))
            .sort((a, b) => b.valorTotal - a.valorTotal);
        
        if (vendedoresOrdenados.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #666; padding: 2rem;">
                        <i class="fas fa-user-slash" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                        <div>Nenhum vendedor encontrado</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = vendedoresOrdenados.map((vendedor, index) => {
            const posicao = index + 1;
            const classePosicao = posicao === 1 ? 'ouro' : 
                                posicao === 2 ? 'prata' : 
                                posicao === 3 ? 'bronze' : '';
            
            return `
                <tr>
                    <td>
                        <div class="ranking ${classePosicao}">
                            ${posicao}º
                        </div>
                    </td>
                    <td>${vendedor.nome}</td>
                    <td>${vendedor.totalVendas}</td>
                    <td><strong>${formatarMoeda(vendedor.valorTotal)}</strong></td>
                    <td>${formatarMoeda(vendedor.ticketMedio)}</td>
                    <td>
                        <div class="performance-bar">
                            <div class="performance-fill" style="width: ${(vendedor.valorTotal / vendedoresOrdenados[0].valorTotal) * 100}%"></div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // FUNÇÃO: Carregar mais vendas
    window.carregarMaisVendas = function() {
        limiteVendas += 10;
        atualizarTabelaVendas();
    };

    // FUNÇÃO: Exportar relatório
    function exportarRelatorio() {
        const dataInicio = document.getElementById('data-inicio').value;
        const dataFim = document.getElementById('data-fim').value;
        
        const relatorio = {
            periodo: `${dataInicio} a ${dataFim}`,
            dataExportacao: new Date().toLocaleString('pt-BR'),
            resumo: {
                totalVendas: dadosRelatorios.vendas.reduce((sum, v) => sum + (v.total || 0), 0),
                totalPedidos: dadosRelatorios.vendas.length,
                ticketMedio: dadosRelatorios.vendas.length > 0 ? 
                    dadosRelatorios.vendas.reduce((sum, v) => sum + (v.total || 0), 0) / dadosRelatorios.vendas.length : 0
            },
            vendas: dadosRelatorios.vendas.slice(0, 50)
        };
        
        // Criar e baixar arquivo JSON
        const dataStr = JSON.stringify(relatorio, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-vendas-${dataInicio}-a-${dataFim}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        mostrarMensagem('Relatório exportado com sucesso!', 'success');
    }

    // FUNÇÃO: Mostrar mensagens
    function mostrarMensagem(mensagem, tipo = 'info') {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        
        // Remover mensagens antigas
        const mensagensAntigas = alertContainer.querySelectorAll('.alert-message');
        mensagensAntigas.forEach(msg => msg.remove());
        
        const alert = document.createElement('div');
        alert.className = `alert-message alert-${tipo}`;
        
        const icon = tipo === 'success' ? 'fa-check-circle' : 
                   tipo === 'error' ? 'fa-exclamation-triangle' : 
                   tipo === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle';
        
        alert.innerHTML = `
            <div class="alert-content">
                <i class="fas ${icon}"></i>
                <span>${mensagem}</span>
            </div>
            <button class="close-alert">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        alertContainer.appendChild(alert);
        
        // Fechar ao clicar no X
        alert.querySelector('.close-alert').addEventListener('click', () => {
            alert.remove();
        });
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    // FUNÇÕES AUXILIARES
    function formatarDataISO(data) {
        return data.toISOString().split('T')[0];
    }

    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    // Debug function
    window.debugRelatorios = function() {
        console.log('🔍 Debug Relatórios:', {
            totalVendas: dadosRelatorios.vendas.reduce((sum, v) => sum + (v.total || 0), 0),
            totalPedidos: dadosRelatorios.vendas.length,
            vendas: dadosRelatorios.vendas,
            charts: Object.keys(charts)
        });
    };

    // Sincronização com outros módulos
    window.atualizarRelatorios = carregarRelatorios;
});