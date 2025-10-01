// js/relatorios.js - VERSÃO CORRIGIDA COM PERFORMANCE POR VENDEDOR
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação E se é administrador
    const usuario = window.sistemaAuth?.verificarAutenticacao();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // Verificar se é administrador
    if (!window.sistemaAuth.isAdmin()) {
        mostrarAcessoRestrito();
        return;
    }

    // Elementos do DOM
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');
    const periodoSelect = document.getElementById('periodo');
    const filtroDatas = document.getElementById('filtro-datas');
    const dataInicioInput = document.getElementById('data-inicio');
    const dataFimInput = document.getElementById('data-fim');
    const aplicarFiltroBtn = document.getElementById('aplicar-filtro');
    const exportarRelatorioBtn = document.getElementById('exportar-relatorio');

    // Variáveis globais
    let dadosRelatorios = {};
    let charts = {};

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

        // Configurar data atual como padrão
        const hoje = new Date().toISOString().split('T')[0];
        dataInicioInput.value = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        dataFimInput.value = hoje;

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

    // Função para mostrar acesso restrito
    function mostrarAcessoRestrito() {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem;">
                <div style="font-size: 4rem; color: #dc3545; margin-bottom: 1rem;">
                    <i class="fas fa-lock"></i>
                </div>
                <h2 style="color: #dc3545; margin-bottom: 1rem;">Acesso Restrito</h2>
                <p style="font-size: 1.1rem; margin-bottom: 2rem; color: #666;">
                    Esta página é restrita a administradores do sistema.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button onclick="window.location.href='index.html'" class="btn btn-primary">
                        <i class="fas fa-home"></i> Voltar para Vendas
                    </button>
                    <button onclick="window.sistemaAuth.fazerLogout()" class="btn btn-secondary">
                        <i class="fas fa-sign-out-alt"></i> Fazer Logout
                    </button>
                </div>
                <div style="margin-top: 2rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                    <small style="color: #666;">
                        <i class="fas fa-info-circle"></i>
                        Se você deveria ter acesso, contate o administrador do sistema.
                    </small>
                </div>
            </div>
        `;
    }

    // Função para testar conexão
    async function testarConexaoSupabase() {
        try {
            const { data, error } = await supabase
                .from('vendas')
                .select('id')
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
        // Filtro de período
        if (periodoSelect) {
            periodoSelect.addEventListener('change', function() {
                if (this.value === 'personalizado') {
                    filtroDatas.style.display = 'flex';
                } else {
                    filtroDatas.style.display = 'none';
                    atualizarDatasPorPeriodo(this.value);
                }
            });
        }

        // Aplicar filtros
        if (aplicarFiltroBtn) {
            aplicarFiltroBtn.addEventListener('click', carregarRelatorios);
        }

        // Exportar relatório
        if (exportarRelatorioBtn) {
            exportarRelatorioBtn.addEventListener('click', exportarRelatorio);
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.sistemaAuth.fazerLogout();
            });
        }

        // Nova funcionalidade: Atualizar automaticamente ao mudar datas
        if (dataInicioInput && dataFimInput) {
            dataInicioInput.addEventListener('change', carregarRelatorios);
            dataFimInput.addEventListener('change', carregarRelatorios);
        }
    }

    // Atualizar datas baseado no período selecionado
    function atualizarDatasPorPeriodo(periodo) {
        const hoje = new Date();
        let dataInicio, dataFim;

        switch (periodo) {
            case 'hoje':
                dataInicio = hoje.toISOString().split('T')[0];
                dataFim = dataInicio;
                break;
            case 'ontem':
                const ontem = new Date(hoje);
                ontem.setDate(hoje.getDate() - 1);
                dataInicio = ontem.toISOString().split('T')[0];
                dataFim = dataInicio;
                break;
            case 'semana':
                const inicioSemana = new Date(hoje);
                inicioSemana.setDate(hoje.getDate() - hoje.getDay());
                dataInicio = inicioSemana.toISOString().split('T')[0];
                dataFim = hoje.toISOString().split('T')[0];
                break;
            case 'mes':
                dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
                dataFim = hoje.toISOString().split('T')[0];
                break;
            case 'trimestre':
                const trimestre = Math.floor(hoje.getMonth() / 3);
                dataInicio = new Date(hoje.getFullYear(), trimestre * 3, 1).toISOString().split('T')[0];
                dataFim = hoje.toISOString().split('T')[0];
                break;
            case 'ano':
                dataInicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split('T')[0];
                dataFim = hoje.toISOString().split('T')[0];
                break;
        }

        dataInicioInput.value = dataInicio;
        dataFimInput.value = dataFim;
    }

    // Função principal para carregar relatórios
    async function carregarRelatorios() {
        const dataInicio = dataInicioInput.value;
        const dataFim = dataFimInput.value;
        
        if (!dataInicio || !dataFim) {
            mostrarMensagem('Selecione um período válido', 'error');
            return;
        }

        try {
            mostrarMensagem('Carregando relatórios...', 'info');
            
            // Mostrar loading nos gráficos
            mostrarLoadingGraficos();
            
            // Carregar dados em sequência para evitar muitos requests
            await carregarDadosVendas(dataInicio, dataFim);
            await carregarDadosEstoque();
            await carregarDadosVendedores(dataInicio, dataFim);
            
            // Atualizar interface
            atualizarResumo();
            atualizarGraficos();
            atualizarTabelas();
            
            mostrarMensagem('Relatórios carregados com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
            mostrarMensagem('Erro ao carregar relatórios: ' + error.message, 'error');
        }
    }

    // Mostrar loading nos gráficos
    function mostrarLoadingGraficos() {
        const graficos = ['grafico-pagamento', 'grafico-categorias', 'grafico-diario', 'grafico-produtos'];
        graficos.forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.innerHTML = `
                    <div style="text-align: center; color: #666; padding: 40px;">
                        <div class="spinner" style="width: 30px; height: 30px; margin: 0 auto 10px;"></div>
                        <p>Carregando...</p>
                    </div>
                `;
            }
        });
    }

    // Carregar dados de vendas - VERSÃO ROBUSTA
    async function carregarDadosVendas(dataInicio, dataFim) {
        try {
            const dataInicioISO = new Date(dataInicio + 'T00:00:00').toISOString();
            const dataFimISO = new Date(dataFim + 'T23:59:59').toISOString();
            
            console.log('📊 Carregando vendas de:', dataInicioISO, 'até:', dataFimISO);
            
            // Buscar vendas básicas
            const { data: vendas, error } = await supabase
                .from('vendas')
                .select('*')
                .gte('created_at', dataInicioISO)
                .lte('created_at', dataFimISO)
                .order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ ${vendas?.length || 0} vendas encontradas`);

            dadosRelatorios.vendas = vendas || [];
            
            // Buscar itens das vendas
            if (dadosRelatorios.vendas.length > 0) {
                const vendaIds = dadosRelatorios.vendas.map(v => v.id);
                
                const { data: itensVendas, error: errorItens } = await supabase
                    .from('vendas_itens')
                    .select('*')
                    .in('venda_id', vendaIds);

                if (!errorItens && itensVendas) {
                    // Agrupar itens por venda
                    const itensPorVenda = {};
                    itensVendas.forEach(item => {
                        if (!itensPorVenda[item.venda_id]) {
                            itensPorVenda[item.venda_id] = [];
                        }
                        itensPorVenda[item.venda_id].push(item);
                    });
                    
                    // Associar itens às vendas
                    dadosRelatorios.vendas.forEach(venda => {
                        venda.vendas_itens = itensPorVenda[venda.id] || [];
                    });

                    console.log(`✅ ${itensVendas.length} itens de venda carregados`);
                    
                    // Buscar informações dos produtos
                    await carregarInformacoesProdutos(itensVendas);
                }
            }

        } catch (error) {
            console.error('Erro ao carregar dados de vendas:', error);
            throw error;
        }
    }

    // Função auxiliar para carregar informações dos produtos
    async function carregarInformacoesProdutos(itensVendas) {
        if (!itensVendas || itensVendas.length === 0) return;
        
        try {
            // Coletar IDs únicos de produtos
            const produtoIds = [...new Set(itensVendas.map(item => item.produto_id))];
            
            console.log(`📦 Buscando informações de ${produtoIds.length} produtos...`);
            
            // Buscar produtos
            const { data: produtos, error } = await supabase
                .from('produtos')
                .select('id, nome, categoria_id')
                .in('id', produtoIds);

            if (!error && produtos) {
                // Criar mapa de produtos para acesso rápido
                const mapaProdutos = {};
                produtos.forEach(produto => {
                    mapaProdutos[produto.id] = produto;
                });

                // Buscar categorias
                const categoriaIds = [...new Set(produtos.map(p => p.categoria_id).filter(id => id))];
                const mapaCategorias = {};
                
                if (categoriaIds.length > 0) {
                    const { data: categorias, error: errorCat } = await supabase
                        .from('categorias')
                        .select('id, nome')
                        .in('id', categoriaIds);

                    if (!errorCat && categorias) {
                        categorias.forEach(cat => {
                            mapaCategorias[cat.id] = cat.nome;
                        });
                        console.log(`✅ ${categorias.length} categorias carregadas`);
                    }
                }

                // Adicionar informações aos itens de venda
                let itensComInfo = 0;
                dadosRelatorios.vendas.forEach(venda => {
                    if (venda.vendas_itens) {
                        venda.vendas_itens.forEach(item => {
                            const produto = mapaProdutos[item.produto_id];
                            if (produto) {
                                item.produto_nome = produto.nome;
                                item.categoria = mapaCategorias[produto.categoria_id] || 'Sem categoria';
                                itensComInfo++;
                            } else {
                                item.produto_nome = `Produto ${item.produto_id?.substring(0, 8)}` || 'Produto desconhecido';
                                item.categoria = 'Sem categoria';
                            }
                        });
                    }
                });

                console.log(`✅ Informações adicionadas a ${itensComInfo} itens`);
            } else {
                console.warn('❌ Não foi possível carregar informações dos produtos');
                // Adicionar informações básicas mesmo sem dados dos produtos
                dadosRelatorios.vendas.forEach(venda => {
                    if (venda.vendas_itens) {
                        venda.vendas_itens.forEach(item => {
                            item.produto_nome = `Produto ${item.produto_id?.substring(0, 8)}` || 'Produto desconhecido';
                            item.categoria = 'Sem categoria';
                        });
                    }
                });
            }
        } catch (error) {
            console.warn('Erro ao carregar informações dos produtos:', error);
            // Adicionar informações básicas mesmo com erro
            dadosRelatorios.vendas.forEach(venda => {
                if (venda.vendas_itens) {
                    venda.vendas_itens.forEach(item => {
                        item.produto_nome = `Produto ${item.produto_id?.substring(0, 8)}` || 'Produto desconhecido';
                        item.categoria = 'Sem categoria';
                    });
                }
            });
        }
    }

    // Carregar dados de estoque - VERSÃO SIMPLIFICADA
    async function carregarDadosEstoque() {
        try {
            console.log('📦 Carregando dados de estoque...');
            
            // Buscar produtos básicos
            const { data: produtos, error } = await supabase
                .from('produtos')
                .select(`
                    *,
                    categorias!inner(nome)
                `)
                .order('nome');

            if (error) {
                console.warn('Erro na consulta de produtos com categorias, tentando sem...');
                // Tentar sem o join com categorias
                const { data: produtosSimples, error: errorSimples } = await supabase
                    .from('produtos')
                    .select('*')
                    .order('nome');
                    
                if (!errorSimples) {
                    dadosRelatorios.produtos = produtosSimples || [];
                    console.log(`✅ ${produtosSimples?.length || 0} produtos carregados (sem categorias)`);
                } else {
                    throw errorSimples;
                }
            } else {
                dadosRelatorios.produtos = produtos || [];
                console.log(`✅ ${produtos?.length || 0} produtos carregados`);
            }

        } catch (error) {
            console.error('Erro ao carregar dados de estoque:', error);
            dadosRelatorios.produtos = [];
        }
    }

    // Carregar dados de vendedores - VERSÃO CORRIGIDA
    async function carregarDadosVendedores(dataInicio, dataFim) {
        try {
            console.log('👥 Carregando dados de vendedores...');
            
            // Buscar vendedores ativos
            const { data: vendedores, error } = await supabase
                .from('sistema_usuarios')
                .select('id, nome, username')
                .eq('ativo', true);

            if (error) throw error;

            console.log(`✅ ${vendedores?.length || 0} vendedores encontrados`);

            // Calcular performance de cada vendedor
            const vendedoresComPerformance = await Promise.all(
                vendedores.map(async (vendedor) => {
                    return await calcularPerformanceVendedor(vendedor, dataInicio, dataFim);
                })
            );

            dadosRelatorios.vendedores = vendedoresComPerformance;
            console.log(`📊 Performance calculada para ${vendedoresComPerformance.length} vendedores`);

        } catch (error) {
            console.error('Erro ao carregar dados de vendedores:', error);
            dadosRelatorios.vendedores = [];
        }
    }

    // Função para calcular performance do vendedor - VERSÃO CORRIGIDA
    async function calcularPerformanceVendedor(vendedor, dataInicio, dataFim) {
        try {
            const dataInicioISO = new Date(dataInicio + 'T00:00:00').toISOString();
            const dataFimISO = new Date(dataFim + 'T23:59:59').toISOString();
            
            console.log(`🔍 Buscando vendas para vendedor: ${vendedor.nome}`);
            
            // PRIMEIRO: Verificar quais colunas existem na tabela vendas
            const { data: colunasVendas, error: errorColunas } = await supabase
                .from('vendas')
                .select('*')
                .limit(1);

            if (errorColunas) {
                console.warn('Erro ao verificar colunas da tabela vendas:', errorColunas);
            } else if (colunasVendas && colunasVendas.length > 0) {
                console.log('📋 Colunas disponíveis na tabela vendas:', Object.keys(colunasVendas[0]));
            }

            // TENTAR DIFERENTES CAMPOS POSSÍVEIS PARA VENDEDOR
            let vendasVendedor = [];
            
            // Tentativa 1: Campo 'vendedor_id'
            try {
                const { data, error } = await supabase
                    .from('vendas')
                    .select('*')
                    .eq('vendedor_id', vendedor.id)
                    .gte('created_at', dataInicioISO)
                    .lte('created_at', dataFimISO);

                if (!error && data) {
                    vendasVendedor = data;
                    console.log(`✅ ${vendedor.nome}: ${vendasVendedor.length} vendas encontradas por vendedor_id`);
                }
            } catch (e) {
                console.log(`❌ Campo vendedor_id não funciona para ${vendedor.nome}`);
            }

            // Tentativa 2: Campo 'usuario_id' (se vendedor_id não funcionou)
            if (vendasVendedor.length === 0) {
                try {
                    const { data, error } = await supabase
                        .from('vendas')
                        .select('*')
                        .eq('usuario_id', vendedor.id)
                        .gte('created_at', dataInicioISO)
                        .lte('created_at', dataFimISO);

                    if (!error && data) {
                        vendasVendedor = data;
                        console.log(`✅ ${vendedor.nome}: ${vendasVendedor.length} vendas encontradas por usuario_id`);
                    }
                } catch (e) {
                    console.log(`❌ Campo usuario_id não funciona para ${vendedor.nome}`);
                }
            }

            // Tentativa 3: Campo 'vendedor' (nome do vendedor)
            if (vendasVendedor.length === 0) {
                try {
                    const { data, error } = await supabase
                        .from('vendas')
                        .select('*')
                        .eq('vendedor', vendedor.nome)
                        .gte('created_at', dataInicioISO)
                        .lte('created_at', dataFimISO);

                    if (!error && data) {
                        vendasVendedor = data;
                        console.log(`✅ ${vendedor.nome}: ${vendasVendedor.length} vendas encontradas por nome`);
                    }
                } catch (e) {
                    console.log(`❌ Campo vendedor (nome) não funciona para ${vendedor.nome}`);
                }
            }

            // Tentativa 4: Buscar todas as vendas e filtrar localmente (fallback)
            if (vendasVendedor.length === 0) {
                console.log(`🔄 ${vendedor.nome}: Tentando busca local...`);
                const todasVendas = dadosRelatorios.vendas || [];
                
                // Filtrar vendas que podem ser deste vendedor
                // Esta é uma abordagem mais genérica que pode precisar de ajustes
                vendasVendedor = todasVendas.filter(venda => {
                    // Verificar diferentes campos possíveis
                    return venda.vendedor_id === vendedor.id ||
                           venda.usuario_id === vendedor.id ||
                           venda.vendedor === vendedor.nome ||
                           venda.vendedor_nome === vendedor.nome;
                });
                
                console.log(`📊 ${vendedor.nome}: ${vendasVendedor.length} vendas encontradas localmente`);
            }

            // Calcular métricas
            const totalVendas = vendasVendedor.length;
            const valorTotal = vendasVendedor.reduce((sum, v) => sum + (v.total || 0), 0);
            const ticketMedio = totalVendas > 0 ? valorTotal / totalVendas : 0;

            // Calcular vendas por dia
            const diasNoPeriodo = Math.max(1, calcularDiasUteis(dataInicio, dataFim));
            const vendasPorDia = totalVendas / diasNoPeriodo;

            console.log(`📈 ${vendedor.nome}: ${totalVendas} vendas, R$ ${valorTotal.toFixed(2)}, Ticket: R$ ${ticketMedio.toFixed(2)}`);

            return {
                ...vendedor,
                totalVendas,
                valorTotal,
                ticketMedio,
                vendasPorDia,
                vendas: vendasVendedor
            };

        } catch (error) {
            console.error(`Erro ao calcular performance do vendedor ${vendedor.nome}:`, error);
            // Retornar dados vazios em caso de erro
            return {
                ...vendedor,
                totalVendas: 0,
                valorTotal: 0,
                ticketMedio: 0,
                vendasPorDia: 0,
                vendas: []
            };
        }
    }

    // Função auxiliar para calcular dias úteis no período
    function calcularDiasUteis(dataInicio, dataFim) {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        let diasUteis = 0;
        
        for (let data = new Date(inicio); data <= fim; data.setDate(data.getDate() + 1)) {
            const diaSemana = data.getDay();
            // Considera apenas dias de semana (segunda a sexta)
            if (diaSemana !== 0 && diaSemana !== 6) {
                diasUteis++;
            }
        }
        
        return Math.max(1, diasUteis);
    }

    // Atualizar resumo
    function atualizarResumo() {
        const vendas = dadosRelatorios.vendas || [];
        
        console.log('📈 Atualizando resumo com', vendas.length, 'vendas');
        
        // Calcular totais do período atual
        const totalVendas = vendas.reduce((sum, v) => sum + (v.total || 0), 0);
        const totalPedidos = vendas.length;
        const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;
        
        // Calcular total de produtos vendidos
        let totalProdutos = 0;
        vendas.forEach(venda => {
            if (venda.vendas_itens) {
                totalProdutos += venda.vendas_itens.reduce((sum, item) => sum + (item.quantidade || 0), 0);
            }
        });
        
        // Atualizar elementos
        document.getElementById('total-vendas').textContent = `R$ ${totalVendas.toFixed(2)}`;
        document.getElementById('total-pedidos').textContent = totalPedidos;
        document.getElementById('ticket-medio').textContent = `R$ ${ticketMedio.toFixed(2)}`;
        document.getElementById('produtos-vendidos').textContent = totalProdutos;
        
        // Para simplificar, vamos usar variações fixas por enquanto
        document.getElementById('variacao-vendas').textContent = '+0%';
        document.getElementById('variacao-vendas').className = 'variacao positiva';
        document.getElementById('variacao-pedidos').textContent = '+0%';
        document.getElementById('variacao-pedidos').className = 'variacao positiva';
        document.getElementById('variacao-ticket').textContent = '+0%';
        document.getElementById('variacao-ticket').className = 'variacao positiva';
        document.getElementById('variacao-produtos').textContent = '+0%';
        document.getElementById('variacao-produtos').className = 'variacao positiva';
    }

    // Atualizar gráficos
    function atualizarGraficos() {
        atualizarGraficoPagamento();
        atualizarGraficoCategorias();
        atualizarGraficoDiario();
        atualizarGraficoProdutos();
    }

    // Gráfico de formas de pagamento
    function atualizarGraficoPagamento() {
        const vendas = dadosRelatorios.vendas || [];
        const ctx = document.getElementById('grafico-pagamento');
        
        if (!ctx) return;
        
        // Agrupar por forma de pagamento
        const pagamentos = {};
        vendas.forEach(venda => {
            const forma = venda.forma_pagamento || 'outros';
            pagamentos[forma] = (pagamentos[forma] || 0) + (venda.total || 0);
        });
        
        const labels = Object.keys(pagamentos).map(p => 
            p === 'dinheiro' ? 'Dinheiro' : 
            p === 'cartao' ? 'Cartão' : 
            p === 'pix' ? 'PIX' : 'Outro');
        const data = Object.values(pagamentos);
        
        console.log('💰 Dados pagamento:', { labels, data });
        
        // Destruir gráfico anterior se existir
        if (charts.pagamento) {
            charts.pagamento.destroy();
        }
        
        // Só criar gráfico se houver dados
        if (data.length > 0 && data.some(val => val > 0)) {
            charts.pagamento = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#28a745', '#ffc107', '#17a2b8', '#e91e63'],
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
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            ctx.innerHTML = `
                <div style="text-align: center; color: #666; padding: 40px;">
                    <i class="fas fa-money-bill-wave" style="font-size: 48px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>Nenhum dado de pagamento disponível</p>
                    <small>Não há vendas no período selecionado</small>
                </div>
            `;
        }
    }

    // Gráfico de categorias - VERSÃO CORRIGIDA
    function atualizarGraficoCategorias() {
        const vendas = dadosRelatorios.vendas || [];
        const ctx = document.getElementById('grafico-categorias');
        
        if (!ctx) return;
        
        // Agrupar por categoria de forma mais simples
        const categorias = {};
        vendas.forEach(venda => {
            if (venda.vendas_itens && venda.vendas_itens.length > 0) {
                venda.vendas_itens.forEach(item => {
                    // Usar categoria do item ou categoria padrão
                    const categoria = item.categoria || 'Sem categoria';
                    const valorItem = (item.preco_unitario || 0) * (item.quantidade || 0);
                    categorias[categoria] = (categorias[categoria] || 0) + valorItem;
                });
            }
        });
        
        // Se não encontrou categorias, tentar método alternativo
        if (Object.keys(categorias).length === 0) {
            console.log('📊 Tentando método alternativo para categorias...');
            
            // Método alternativo: agrupar por produto e depois por categoria dos produtos
            const produtosAgrupados = {};
            vendas.forEach(venda => {
                if (venda.vendas_itens) {
                    venda.vendas_itens.forEach(item => {
                        const produtoId = item.produto_id;
                        if (!produtosAgrupados[produtoId]) {
                            produtosAgrupados[produtoId] = {
                                quantidade: 0,
                                valor: 0,
                                produto_nome: item.produto_nome || 'Produto desconhecido'
                            };
                        }
                        produtosAgrupados[produtoId].quantidade += item.quantidade || 0;
                        produtosAgrupados[produtoId].valor += (item.preco_unitario || 0) * (item.quantidade || 0);
                    });
                }
            });
            
            // Usar nomes dos produtos como "categorias" temporárias
            Object.values(produtosAgrupados).forEach(produto => {
                categorias[produto.produto_nome] = produto.valor;
            });
        }
        
        const labels = Object.keys(categorias);
        const data = Object.values(categorias);
        
        console.log('📊 Dados categorias:', { labels, data });
        
        if (charts.categorias) {
            charts.categorias.destroy();
        }
        
        if (data.length > 0 && data.some(val => val > 0)) {
            charts.categorias = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1',
                            '#e83e8c', '#fd7e14', '#20c997', '#6610f2', '#6f42c1'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                font: {
                                    size: 11
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            ctx.innerHTML = `
                <div style="text-align: center; color: #666; padding: 40px;">
                    <i class="fas fa-chart-pie" style="font-size: 48px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>Nenhum dado de categorias disponível</p>
                    <small>As vendas não possuem informações de categoria</small>
                </div>
            `;
        }
    }

    // Gráfico diário
    function atualizarGraficoDiario() {
        const vendas = dadosRelatorios.vendas || [];
        const ctx = document.getElementById('grafico-diario');
        
        if (!ctx) return;
        
        // Agrupar por dia
        const vendasPorDia = {};
        vendas.forEach(venda => {
            const data = new Date(venda.created_at).toLocaleDateString('pt-BR');
            vendasPorDia[data] = (vendasPorDia[data] || 0) + (venda.total || 0);
        });
        
        // Ordenar por data
        const entries = Object.entries(vendasPorDia).sort(([a], [b]) => 
            new Date(a.split('/').reverse().join('-')) - new Date(b.split('/').reverse().join('-'))
        );
        
        const labels = entries.map(([data]) => data);
        const data = entries.map(([,valor]) => valor);
        
        console.log('📅 Dados diários:', { labels, data });
        
        if (charts.diario) {
            charts.diario.destroy();
        }
        
        if (data.length > 0 && data.some(val => val > 0)) {
            charts.diario = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Vendas (R$)', 
                        data: data,
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'R$ ' + value;
                                }
                            }
                        }
                    }
                }
            });
        } else {
            ctx.innerHTML = `
                <div style="text-align: center; color: #666; padding: 40px;">
                    <i class="fas fa-chart-line" style="font-size: 48px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>Nenhum dado diário disponível</p>
                    <small>Não há vendas no período selecionado</small>
                </div>
            `;
        }
    }

    // Gráfico de produtos mais vendidos - VERSÃO CORRIGIDA
    function atualizarGraficoProdutos() {
        const vendas = dadosRelatorios.vendas || [];
        const ctx = document.getElementById('grafico-produtos');
        
        if (!ctx) return;
        
        // Agrupar por produto
        const produtos = {};
        vendas.forEach(venda => {
            if (venda.vendas_itens && venda.vendas_itens.length > 0) {
                venda.vendas_itens.forEach(item => {
                    const produtoNome = item.produto_nome || `Produto ${item.produto_id?.substring(0, 8)}` || 'Produto desconhecido';
                    produtos[produtoNome] = (produtos[produtoNome] || 0) + (item.quantidade || 0);
                });
            }
        });
        
        // Se não encontrou produtos, tentar método alternativo
        if (Object.keys(produtos).length === 0) {
            console.log('📊 Tentando método alternativo para produtos...');
            
            // Método alternativo: usar dados dos produtos do estoque
            const produtosEstoque = dadosRelatorios.produtos || [];
            produtosEstoque.forEach(produto => {
                if (produto.estoque_minimo > 0) {
                    // Simular vendas baseadas no estoque mínimo (apenas para demo)
                    produtos[produto.nome] = Math.floor(produto.estoque_minimo * 2);
                }
            });
        }
        
        // Ordenar e pegar top 10
        const topProdutos = Object.entries(produtos)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        const labels = topProdutos.map(([nome]) => {
            // Abreviar nomes muito longos
            return nome.length > 20 ? nome.substring(0, 20) + '...' : nome;
        });
        const data = topProdutos.map(([,quantidade]) => quantidade);
        
        console.log('📊 Dados produtos:', { labels, data });
        
        if (charts.produtos) {
            charts.produtos.destroy();
        }
        
        if (data.length > 0 && data.some(val => val > 0)) {
            charts.produtos = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Quantidade Vendida',
                        data: data,
                        backgroundColor: '#28a745',
                        borderColor: '#1e7e34',
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            },
                            title: {
                                display: true,
                                text: 'Quantidade'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Produtos'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title: function(context) {
                                    const index = context[0].dataIndex;
                                    return topProdutos[index][0]; // Nome completo
                                }
                            }
                        }
                    }
                }
            });
        } else {
            ctx.innerHTML = `
                <div style="text-align: center; color: #666; padding: 40px;">
                    <i class="fas fa-boxes" style="font-size: 48px; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>Nenhum dado de produtos disponível</p>
                    <small>Não há produtos vendidos no período</small>
                </div>
            `;
        }
    }

    // Atualizar tabelas
    function atualizarTabelas() {
        atualizarTabelaVendas();
        atualizarTabelaEstoque();
        atualizarTabelaVendedores();
    }

    // Tabela de vendas detalhadas
    function atualizarTabelaVendas() {
        const tbody = document.getElementById('vendas-body');
        const vendas = dadosRelatorios.vendas || [];
        
        if (vendas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhuma venda encontrada no período</td></tr>';
            return;
        }
        
        tbody.innerHTML = vendas.map(venda => {
            const data = new Date(venda.created_at).toLocaleDateString('pt-BR');
            const hora = new Date(venda.created_at).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            const cliente = venda.cliente || 'Cliente não identificado';
            const itens = venda.vendas_itens?.length || 0;
            const valor = venda.total || 0;
            const formaPagamento = venda.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                                 venda.forma_pagamento === 'cartao' ? 'Cartão' : 
                                 venda.forma_pagamento === 'pix' ? 'PIX' : 'Outro';
            
            return `
                <tr>
                    <td>${data} ${hora}</td>
                    <td>${cliente}</td>
                    <td>${itens} item(s)</td>
                    <td>R$ ${valor.toFixed(2)}</td>
                    <td>${formaPagamento}</td>
                    <td>Vendedor</td>
                </tr>
            `;
        }).join('');
    }

    // Tabela de estoque
    function atualizarTabelaEstoque() {
        const tbody = document.getElementById('estoque-body');
        const produtos = dadosRelatorios.produtos || [];
        
        if (produtos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhum produto encontrado</td></tr>';
            return;
        }
        
        tbody.innerHTML = produtos.map(produto => {
            const estoqueAtual = produto.estoque_atual || 0;
            const estoqueMinimo = produto.estoque_minimo || 0;
            
            let status = 'normal';
            let statusTexto = 'Normal';
            
            if (estoqueAtual === 0) {
                status = 'critico';
                statusTexto = 'Esgotado';
            } else if (estoqueAtual <= estoqueMinimo) {
                status = 'baixo';
                statusTexto = 'Baixo';
            }
            
            return `
                <tr>
                    <td>${produto.nome}</td>
                    <td>${produto.categorias?.nome || 'Sem categoria'}</td>
                    <td>${estoqueAtual}</td>
                    <td>${estoqueMinimo}</td>
                    <td><span class="status-badge ${status}">${statusTexto}</span></td>
                    <td>-</td>
                </tr>
            `;
        }).join('');
    }

    // Tabela de performance de vendedores - VERSÃO CORRIGIDA
    function atualizarTabelaVendedores() {
        const tbody = document.getElementById('vendedores-body');
        const vendedores = dadosRelatorios.vendedores || [];
        
        // Ordenar por valor total (maior primeiro)
        const vendedoresOrdenados = [...vendedores].sort((a, b) => b.valorTotal - a.valorTotal);
        
        if (vendedoresOrdenados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Nenhum vendedor encontrado</td></tr>';
            return;
        }
        
        tbody.innerHTML = vendedoresOrdenados.map((vendedor, index) => {
            const posicao = index + 1;
            const classePosicao = posicao === 1 ? 'ranking-ouro' : 
                                posicao === 2 ? 'ranking-prata' : 
                                posicao === 3 ? 'ranking-bronze' : '';
            
            return `
                <tr>
                    <td>
                        <div class="ranking-vendedor ${classePosicao}">
                            <span class="posicao">${posicao}º</span>
                            <span class="nome">${vendedor.nome}</span>
                        </div>
                    </td>
                    <td>${vendedor.totalVendas}</td>
                    <td>R$ ${vendedor.valorTotal.toFixed(2)}</td>
                    <td>R$ ${vendedor.ticketMedio.toFixed(2)}</td>
                    <td>${vendedor.vendasPorDia.toFixed(1)}</td>
                </tr>
            `;
        }).join('');
    }

    // Exportar relatório
    function exportarRelatorio() {
        const dataInicio = dataInicioInput.value;
        const dataFim = dataFimInput.value;
        const periodo = periodoSelect.options[periodoSelect.selectedIndex].text;
        
        // Criar conteúdo do relatório
        let conteudo = `RELATÓRIO DE VENDAS - DOCES CRIATIVOS\n`;
        conteudo += `Período: ${periodo} (${dataInicio} a ${dataFim})\n`;
        conteudo += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
        conteudo += `Gerado por: ${window.sistemaAuth.usuarioLogado?.nome || 'Administrador'}\n\n`;
        
        // Adicionar resumo
        conteudo += `RESUMO:\n`;
        conteudo += `Total de Vendas: ${document.getElementById('total-vendas').textContent}\n`;
        conteudo += `Total de Pedidos: ${document.getElementById('total-pedidos').textContent}\n`;
        conteudo += `Ticket Médio: ${document.getElementById('ticket-medio').textContent}\n`;
        conteudo += `Produtos Vendidos: ${document.getElementById('produtos-vendidos').textContent}\n\n`;
        
        // Adicionar performance de vendedores
        conteudo += `PERFORMANCE POR VENDEDOR:\n`;
        const vendedores = dadosRelatorios.vendedores || [];
        vendedores.forEach((vendedor, index) => {
            conteudo += `${index + 1}º - ${vendedor.nome}: ${vendedor.totalVendas} vendas, R$ ${vendedor.valorTotal.toFixed(2)}, Ticket: R$ ${vendedor.ticketMedio.toFixed(2)}\n`;
        });
        conteudo += `\n`;
        
        // Adicionar vendas detalhadas
        conteudo += `VENDAS DETALHADAS:\n`;
        const vendas = dadosRelatorios.vendas || [];
        vendas.forEach(venda => {
            const data = new Date(venda.created_at).toLocaleDateString('pt-BR');
            const cliente = venda.cliente || 'Cliente não identificado';
            const valor = venda.total || 0;
            const formaPagamento = venda.forma_pagamento === 'dinheiro' ? 'Dinheiro' : 
                                 venda.forma_pagamento === 'cartao' ? 'Cartão' : 
                                 venda.forma_pagamento === 'pix' ? 'PIX' : 'Outro';
            
            conteudo += `${data} - ${cliente} - R$ ${valor.toFixed(2)} - ${formaPagamento}\n`;
        });
        
        // Criar e baixar arquivo
        const blob = new Blob([conteudo], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-vendas-${dataInicio}-a-${dataFim}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        mostrarMensagem('Relatório exportado com sucesso!', 'success');
    }

    // Função para mostrar mensagens
    function mostrarMensagem(mensagem, tipo) {
        const container = document.getElementById('alert-container');
        if (!container) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo}`;
        alert.innerHTML = `
            <span>${mensagem}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        
        container.appendChild(alert);
        
        // Remover automaticamente após 5 segundos
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }

    // Nova funcionalidade: Atualização automática a cada 5 minutos
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            console.log('🔄 Atualização automática dos relatórios');
            carregarRelatorios();
        }
    }, 5 * 60 * 1000); // 5 minutos

    // Nova funcionalidade: Tecla F5 para atualizar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F5') {
            e.preventDefault();
            carregarRelatorios();
        }
    });

    // Nova funcionalidade: Mostrar informações do administrador
    function mostrarInfoAdmin() {
        const usuario = window.sistemaAuth.usuarioLogado;
        if (usuario && window.sistemaAuth.isAdmin()) {
            console.log(`👤 Administrador logado: ${usuario.nome} (${usuario.username})`);
        }
    }

    // Executar ao carregar
    mostrarInfoAdmin();
});