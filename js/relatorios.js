// js/relatorios.js - Sistema completo de relatórios e analytics
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
    const alertContainer = document.getElementById('alert-container');

    // Elementos de filtro
    const periodoSelect = document.getElementById('periodo');
    const dataInicioInput = document.getElementById('data-inicio');
    const dataFimInput = document.getElementById('data-fim');
    const tipoRelatorioSelect = document.getElementById('tipo-relatorio');
    const gerarRelatorioBtn = document.getElementById('gerar-relatorio');
    const exportarPdfBtn = document.getElementById('exportar-pdf');

    // Elementos de dados
    const totalVendasElement = document.getElementById('total-vendas');
    const ticketMedioElement = document.getElementById('ticket-medio');
    const totalProdutosElement = document.getElementById('total-produtos');
    const totalClientesElement = document.getElementById('total-clientes');

    // Gráficos
    let vendasChart = null;
    let pagamentosChart = null;
    let produtosChart = null;
    let categoriasChart = null;

    // Dados globais
    let dadosRelatorios = {};
    let periodoAtual = {};

    try {
        // Mostrar loading
        if (loadingElement) loadingElement.style.display = 'block';
        if (contentElement) contentElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'none';

        // Testar conexão
        await testarConexaoSupabase();
        
        // Esconder loading e mostrar conteúdo
        if (loadingElement) loadingElement.style.display = 'none';
        if (contentElement) contentElement.style.display = 'block';

        // Configurar event listeners
        configurarEventListeners();
        
        // Carregar dados iniciais
        await carregarRelatorios();

        console.log('✅ Módulo de relatórios inicializado com sucesso!');

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
                .from('vendas')
                .select('count')
                .limit(1);
                
            if (error) throw error;
            
            console.log('✅ Conexão com Supabase estabelecida (relatórios)');
            return true;
        } catch (error) {
            throw new Error(`Erro Supabase: ${error.message}`);
        }
    }

    // Configurar event listeners
    function configurarEventListeners() {
        // Filtros
        periodoSelect.addEventListener('change', handlePeriodoChange);
        gerarRelatorioBtn.addEventListener('click', carregarRelatorios);
        exportarPdfBtn.addEventListener('click', exportarRelatorioPDF);

        // Exportações individuais
        document.getElementById('exportar-vendas')?.addEventListener('click', () => exportarTabelaPDF('vendas'));
        document.getElementById('exportar-produtos')?.addEventListener('click', () => exportarTabelaPDF('produtos'));
        document.getElementById('exportar-financeiro')?.addEventListener('click', exportarRelatorioFinanceiroPDF);

        // Controle de gráficos
        document.getElementById('tipo-grafico-vendas')?.addEventListener('change', atualizarGraficoVendas);

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.sistemaAuth.fazerLogout();
            });
        }
    }

    // Manipular mudança de período
    function handlePeriodoChange() {
        const periodo = periodoSelect.value;
        const dataPersonalizada = document.getElementById('data-personalizada');
        
        if (periodo === 'personalizado') {
            dataPersonalizada.style.display = 'flex';
        } else {
            dataPersonalizada.style.display = 'none';
            // Definir datas automaticamente
            definirDatasPeriodo(periodo);
        }
    }

    // Definir datas baseadas no período selecionado
    function definirDatasPeriodo(periodo) {
        const hoje = new Date();
        const dataFim = new Date(hoje);
        const dataInicio = new Date(hoje);

        switch (periodo) {
            case 'hoje':
                dataInicio.setHours(0, 0, 0, 0);
                dataFim.setHours(23, 59, 59, 999);
                break;
            case 'ontem':
                dataInicio.setDate(hoje.getDate() - 1);
                dataInicio.setHours(0, 0, 0, 0);
                dataFim.setDate(hoje.getDate() - 1);
                dataFim.setHours(23, 59, 59, 999);
                break;
            case 'semana':
                dataInicio.setDate(hoje.getDate() - 7);
                break;
            case 'mes':
                dataInicio.setMonth(hoje.getMonth() - 1);
                break;
            case 'trimestre':
                dataInicio.setMonth(hoje.getMonth() - 3);
                break;
            case 'ano':
                dataInicio.setFullYear(hoje.getFullYear() - 1);
                break;
        }

        dataInicioInput.value = dataInicio.toISOString().split('T')[0];
        dataFimInput.value = dataFim.toISOString().split('T')[0];
    }

    // Função principal para carregar relatórios
    async function carregarRelatorios() {
        try {
            mostrarMensagem('Carregando dados dos relatórios...', 'info');
            
            // Obter período selecionado
            const dataInicio = new Date(dataInicioInput.value + 'T00:00:00');
            const dataFim = new Date(dataFimInput.value + 'T23:59:59');
            
            periodoAtual = { dataInicio, dataFim };

            // Carregar todos os dados em paralelo
            const [
                vendas,
                produtos,
                categorias,
                dadosComparativos
            ] = await Promise.all([
                carregarVendasPeriodo(dataInicio, dataFim),
                carregarProdutosPeriodo(dataInicio, dataFim),
                carregarCategoriasPeriodo(dataInicio, dataFim),
                carregarDadosComparativos(dataInicio, dataFim)
            ]);

            // Consolidar dados
            dadosRelatorios = {
                vendas,
                produtos,
                categorias,
                comparativos: dadosComparativos,
                periodo: periodoAtual
            };

            // Atualizar interface
            atualizarResumo();
            atualizarGraficos();
            atualizarTabelas();
            atualizarRelatorioFinanceiro();

            mostrarMensagem('Relatórios atualizados com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
            mostrarMensagem('Erro ao carregar relatórios: ' + error.message, 'error');
        }
    }

    // Carregar vendas do período
    async function carregarVendasPeriodo(dataInicio, dataFim) {
        try {
            const { data: vendas, error } = await supabase
                .from('vendas')
                .select(`
                    *,
                    vendas_itens(*),
                    sistema_usuarios(nome)
                `)
                .gte('created_at', dataInicio.toISOString())
                .lte('created_at', dataFim.toISOString())
                .order('created_at', { ascending: true });

            if (error) throw error;

            return vendas || [];
        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            return [];
        }
    }

    // Carregar produtos do período
    async function carregarProdutosPeriodo(dataInicio, dataFim) {
        try {
            // Primeiro buscar os itens de venda do período
            const { data: itensVenda, error } = await supabase
                .from('vendas_itens')
                .select(`
                    *,
                    vendas!inner(created_at),
                    produtos(nome, categoria:categorias(nome), preco_venda)
                `)
                .gte('vendas.created_at', dataInicio.toISOString())
                .lte('vendas.created_at', dataFim.toISOString());

            if (error) throw error;

            // Agrupar por produto
            const produtosAgrupados = {};
            itensVenda?.forEach(item => {
                if (!produtosAgrupados[item.produto_id]) {
                    produtosAgrupados[item.produto_id] = {
                        produto: item.produtos,
                        quantidade: 0,
                        valorTotal: 0
                    };
                }
                produtosAgrupados[item.produto_id].quantidade += item.quantidade;
                produtosAgrupados[item.produto_id].valorTotal += item.quantidade * item.preco_unitario;
            });

            return Object.values(produtosAgrupados);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            return [];
        }
    }

    // Carregar categorias do período
    async function carregarCategoriasPeriodo(dataInicio, dataFim) {
        try {
            const { data: categorias, error } = await supabase
                .from('categorias')
                .select('*')
                .eq('ativo', true);

            if (error) throw error;

            // Para cada categoria, calcular vendas
            const categoriasComVendas = await Promise.all(
                categorias?.map(async categoria => {
                    const { data: itens, error: errorItens } = await supabase
                        .from('vendas_itens')
                        .select(`
                            *,
                            vendas!inner(created_at),
                            produtos!inner(categoria_id)
                        `)
                        .eq('produtos.categoria_id', categoria.id)
                        .gte('vendas.created_at', dataInicio.toISOString())
                        .lte('vendas.created_at', dataFim.toISOString());

                    if (errorItens) throw errorItens;

                    const valorTotal = itens?.reduce((total, item) => 
                        total + (item.quantidade * item.preco_unitario), 0) || 0;

                    return {
                        ...categoria,
                        valorTotal,
                        quantidadeItens: itens?.reduce((total, item) => total + item.quantidade, 0) || 0
                    };
                }) || []
            );

            return categoriasComVendas.filter(cat => cat.valorTotal > 0);
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            return [];
        }
    }

    // Carregar dados comparativos (período anterior)
    async function carregarDadosComparativos(dataInicio, dataFim) {
        try {
            const duracao = dataFim - dataInicio;
            const dataInicioAnterior = new Date(dataInicio.getTime() - duracao - 86400000); // -1 dia extra
            const dataFimAnterior = new Date(dataInicio.getTime() - 86400000); // até o dia anterior ao início

            const [vendasAnteriores] = await Promise.all([
                carregarVendasPeriodo(dataInicioAnterior, dataFimAnterior)
            ]);

            return {
                vendas: vendasAnteriores,
                periodo: { dataInicio: dataInicioAnterior, dataFim: dataFimAnterior }
            };
        } catch (error) {
            console.error('Erro ao carregar dados comparativos:', error);
            return { vendas: [], periodo: {} };
        }
    }

    // Atualizar cards de resumo
    function atualizarResumo() {
        const { vendas, produtos, comparativos } = dadosRelatorios;
        
        // Calcular totais
        const totalVendas = vendas.reduce((total, venda) => total + venda.valor_total, 0);
        const totalProdutosVendidos = vendas.reduce((total, venda) => 
            total + venda.vendas_itens.reduce((sum, item) => sum + item.quantidade, 0), 0);
        const ticketMedio = vendas.length > 0 ? totalVendas / vendas.length : 0;

        // Calcular totais do período anterior
        const totalVendasAnterior = comparativos.vendas.reduce((total, venda) => total + venda.valor_total, 0);
        const totalProdutosAnterior = comparativos.vendas.reduce((total, venda) => 
            total + venda.vendas_itens.reduce((sum, item) => sum + item.quantidade, 0), 0);
        const ticketMedioAnterior = comparativos.vendas.length > 0 ? totalVendasAnterior / comparativos.vendas.length : 0;

        // Calcular variações
        const variacaoVendas = totalVendasAnterior > 0 ? ((totalVendas - totalVendasAnterior) / totalVendasAnterior) * 100 : 0;
        const variacaoProdutos = totalProdutosAnterior > 0 ? ((totalProdutosVendidos - totalProdutosAnterior) / totalProdutosAnterior) * 100 : 0;
        const variacaoTicket = ticketMedioAnterior > 0 ? ((ticketMedio - ticketMedioAnterior) / ticketMedioAnterior) * 100 : 0;

        // Atualizar elementos
        totalVendasElement.textContent = formatarMoeda(totalVendas);
        totalProdutosElement.textContent = totalProdutosVendidos.toLocaleString();
        ticketMedioElement.textContent = formatarMoeda(ticketMedio);
        totalClientesElement.textContent = vendas.length.toLocaleString();

        // Atualizar variações
        document.getElementById('variacao-vendas').textContent = 
            `${variacaoVendas >= 0 ? '+' : ''}${variacaoVendas.toFixed(1)}% vs período anterior`;
        document.getElementById('variacao-produtos').textContent = 
            `${variacaoProdutos >= 0 ? '+' : ''}${variacaoProdutos.toFixed(1)}% vs período anterior`;
        document.getElementById('variacao-ticket').textContent = 
            `${variacaoTicket >= 0 ? '+' : ''}${variacaoTicket.toFixed(1)}% vs período anterior`;
        document.getElementById('variacao-clientes').textContent = 
            `${vendas.length - comparativos.vendas.length >= 0 ? '+' : ''}${vendas.length - comparativos.vendas.length} vs período anterior`;

        // Aplicar classes de cor
        aplicarClasseVariacao('variacao-vendas', variacaoVendas);
        aplicarClasseVariacao('variacao-produtos', variacaoProdutos);
        aplicarClasseVariacao('variacao-ticket', variacaoTicket);
    }

    // Aplicar classe CSS baseada na variação
    function aplicarClasseVariacao(elementId, variacao) {
        const element = document.getElementById(elementId);
        element.className = 'variacao';
        
        if (variacao > 0) {
            element.classList.add('positivo');
        } else if (variacao < 0) {
            element.classList.add('negativo');
        } else {
            element.classList.add('neutro');
        }
    }

    // Atualizar gráficos
    function atualizarGraficos() {
        atualizarGraficoVendas();
        atualizarGraficoPagamentos();
        atualizarGraficoProdutos();
        atualizarGraficoCategorias();
    }

    // Gráfico de vendas ao longo do tempo
    function atualizarGraficoVendas() {
        const ctx = document.getElementById('vendasChart')?.getContext('2d');
        if (!ctx) return;

        // Destruir gráfico anterior se existir
        if (vendasChart) {
            vendasChart.destroy();
        }

        const { vendas } = dadosRelatorios;
        const tipoGrafico = document.getElementById('tipo-grafico-vendas')?.value || 'linha';

        // Agrupar vendas por dia
        const vendasPorDia = {};
        vendas.forEach(venda => {
            const data = new Date(venda.created_at).toLocaleDateString('pt-BR');
            if (!vendasPorDia[data]) {
                vendasPorDia[data] = 0;
            }
            vendasPorDia[data] += venda.valor_total;
        });

        const labels = Object.keys(vendasPorDia);
        const dados = Object.values(vendasPorDia);

        vendasChart = new Chart(ctx, {
            type: tipoGrafico === 'barra' ? 'bar' : 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Vendas (R$)',
                    data: dados,
                    backgroundColor: tipoGrafico === 'barra' ? 'rgba(54, 162, 235, 0.5)' : 'rgba(54, 162, 235, 0.1)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    fill: tipoGrafico === 'linha',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Evolução das Vendas'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR', {minimumFractionDigits: 2});
                            }
                        }
                    }
                }
            }
        });
    }

    // Gráfico de formas de pagamento
    function atualizarGraficoPagamentos() {
        const ctx = document.getElementById('pagamentosChart')?.getContext('2d');
        if (!ctx) return;

        if (pagamentosChart) {
            pagamentosChart.destroy();
        }

        const { vendas } = dadosRelatorios;

        // Agrupar por forma de pagamento
        const pagamentos = {};
        vendas.forEach(venda => {
            const forma = venda.forma_pagamento || 'Não informado';
            if (!pagamentos[forma]) {
                pagamentos[forma] = 0;
            }
            pagamentos[forma] += venda.valor_total;
        });

        const cores = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

        pagamentosChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(pagamentos),
                datasets: [{
                    data: Object.values(pagamentos),
                    backgroundColor: cores,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = Object.values(pagamentos).reduce((a, b) => a + b, 0);
                                const percentual = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: R$ ${context.raw.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percentual}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Gráfico de produtos mais vendidos
    function atualizarGraficoProdutos() {
        const ctx = document.getElementById('produtosChart')?.getContext('2d');
        if (!ctx) return;

        if (produtosChart) {
            produtosChart.destroy();
        }

        const { produtos } = dadosRelatorios;

        // Ordenar por quantidade e pegar top 10
        const topProdutos = produtos
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 10);

        produtosChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topProdutos.map(p => p.produto.nome),
                datasets: [{
                    label: 'Quantidade Vendida',
                    data: topProdutos.map(p => p.quantidade),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
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

    // Gráfico de categorias
    function atualizarGraficoCategorias() {
        const ctx = document.getElementById('categoriasChart')?.getContext('2d');
        if (!ctx) return;

        if (categoriasChart) {
            categoriasChart.destroy();
        }

        const { categorias } = dadosRelatorios;

        categoriasChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: categorias.map(c => c.nome),
                datasets: [{
                    data: categorias.map(c => c.valorTotal),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = categorias.reduce((sum, cat) => sum + cat.valorTotal, 0);
                                const percentual = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: R$ ${context.raw.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percentual}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Atualizar tabelas
    function atualizarTabelas() {
        atualizarTabelaVendas();
        atualizarTabelaProdutos();
    }

    // Tabela de vendas detalhadas
    function atualizarTabelaVendas() {
        const tbody = document.getElementById('vendas-body');
        const { vendas } = dadosRelatorios;

        if (!tbody) return;

        tbody.innerHTML = vendas.map(venda => `
            <tr>
                <td>${formatarDataHora(venda.created_at)}</td>
                <td>${venda.cliente_nome || 'Consumidor Final'}</td>
                <td>${venda.vendas_itens.length} itens</td>
                <td>${formatarMoeda(venda.valor_total)}</td>
                <td>${venda.forma_pagamento || 'Não informado'}</td>
                <td>${venda.sistema_usuarios?.nome || 'Sistema'}</td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align: center;">Nenhuma venda encontrada</td></tr>';
    }

    // Tabela de performance de produtos
    function atualizarTabelaProdutos() {
        const tbody = document.getElementById('produtos-body');
        const { produtos } = dadosRelatorios;
        const totalVendas = produtos.reduce((total, p) => total + p.valorTotal, 0);

        if (!tbody) return;

        tbody.innerHTML = produtos
            .sort((a, b) => b.valorTotal - a.valorTotal)
            .map(produto => `
                <tr>
                    <td>${produto.produto.nome}</td>
                    <td>${produto.produto.categoria?.nome || 'Sem categoria'}</td>
                    <td>${produto.quantidade}</td>
                    <td>${formatarMoeda(produto.valorTotal)}</td>
                    <td>${formatarMoeda(produto.valorTotal / produto.quantidade)}</td>
                    <td>${((produto.valorTotal / totalVendas) * 100).toFixed(1)}%</td>
                </tr>
            `).join('') || '<tr><td colspan="6" style="text-align: center;">Nenhum produto vendido</td></tr>';
    }

    // Atualizar relatório financeiro
    function atualizarRelatorioFinanceiro() {
        const { vendas } = dadosRelatorios;

        // Agrupar por forma de pagamento
        const receitas = {
            dinheiro: 0,
            cartao: 0,
            pix: 0
        };

        vendas.forEach(venda => {
            const forma = venda.forma_pagamento?.toLowerCase() || '';
            if (forma.includes('dinheiro')) {
                receitas.dinheiro += venda.valor_total;
            } else if (forma.includes('cartão') || forma.includes('cartao')) {
                receitas.cartao += venda.valor_total;
            } else if (forma.includes('pix')) {
                receitas.pix += venda.valor_total;
            }
        });

        const totalReceitas = receitas.dinheiro + receitas.cartao + receitas.pix;
        const ticketMedio = vendas.length > 0 ? totalReceitas / vendas.length : 0;
        const totalProdutos = vendas.reduce((total, venda) => 
            total + venda.vendas_itens.reduce((sum, item) => sum + item.quantidade, 0), 0);
        const produtosPorVenda = vendas.length > 0 ? totalProdutos / vendas.length : 0;

        // Calcular vendas por dia útil
        const diasComVendas = new Set(vendas.map(v => new Date(v.created_at).toDateString())).size;
        const diasTotais = Math.ceil((dadosRelatorios.periodo.dataFim - dadosRelatorios.periodo.dataInicio) / (1000 * 60 * 60 * 24)) + 1;
        const vendasPorDia = totalReceitas / Math.max(diasComVendas, 1);

        // Atualizar elementos
        document.getElementById('receita-dinheiro').textContent = formatarMoeda(receitas.dinheiro);
        document.getElementById('receita-cartao').textContent = formatarMoeda(receitas.cartao);
        document.getElementById('receita-pix').textContent = formatarMoeda(receitas.pix);
        document.getElementById('total-receitas').textContent = formatarMoeda(totalReceitas);
        document.getElementById('indicador-ticket').textContent = formatarMoeda(ticketMedio);
        document.getElementById('vendas-dia').textContent = formatarMoeda(vendasPorDia);
        document.getElementById('produtos-venda').textContent = produtosPorVenda.toFixed(1);
        document.getElementById('dias-vendas').textContent = `${diasComVendas}/${diasTotais}`;
    }

    // Exportar relatório completo em PDF
    async function exportarRelatorioPDF() {
        try {
            mostrarMensagem('Preparando relatório para exportação...', 'info');
            
            // Aqui você implementaria a lógica de exportação PDF
            // Por enquanto, vamos simular com um alerta
            setTimeout(() => {
                mostrarMensagem('Recurso de exportação PDF será implementado em breve!', 'info');
            }, 1000);

        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            mostrarMensagem('Erro ao exportar PDF: ' + error.message, 'error');
        }
    }

    // Exportar tabela específica em PDF
    async function exportarTabelaPDF(tipo) {
        try {
            mostrarMensagem(`Exportando tabela de ${tipo}...`, 'info');
            
            // Simular exportação
            setTimeout(() => {
                mostrarMensagem(`Exportação de ${tipo} será implementada em breve!`, 'info');
            }, 1000);

        } catch (error) {
            console.error(`Erro ao exportar ${tipo}:`, error);
            mostrarMensagem(`Erro ao exportar ${tipo}: ` + error.message, 'error');
        }
    }

    // Exportar relatório financeiro em PDF
    async function exportarRelatorioFinanceiroPDF() {
        try {
            mostrarMensagem('Exportando relatório financeiro...', 'info');
            
            // Simular exportação
            setTimeout(() => {
                mostrarMensagem('Exportação do relatório financeiro será implementada em breve!', 'info');
            }, 1000);

        } catch (error) {
            console.error('Erro ao exportar relatório financeiro:', error);
            mostrarMensagem('Erro ao exportar relatório financeiro: ' + error.message, 'error');
        }
    }

    // Funções utilitárias
    function formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    function formatarDataHora(dataString) {
        const data = new Date(dataString);
        return data.toLocaleString('pt-BR');
    }

    function mostrarMensagem(mensagem, tipo = 'info') {
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo}`;
        alert.innerHTML = `
            <span>${mensagem}</span>
            <button onclick="this.parentElement.remove()" class="alert-close">×</button>
        `;

        alertContainer.appendChild(alert);

        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }
});

// Adicionar estilos para alertas
const style = document.createElement('style');
style.textContent = `
    .alert {
        padding: 12px 20px;
        margin: 10px 0;
        border-radius: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        animation: slideIn 0.3s ease-out;
    }

    .alert-info {
        background: #d1ecf1;
        color: #0c5460;
        border: 1px solid #bee5eb;
    }

    .alert-success {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }

    .alert-error {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }

    .alert-close {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        margin-left: 10px;
    }

    @keyframes slideIn {
        from {
            transform: translateY(-20px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);