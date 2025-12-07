// js/relatorios.js - VERSÃO FINAL CORRIGIDA COM PDFS MODERNOS E FUNCIONAIS E FILTROS DE DATA
// + MODIFICAÇÕES PARA INCLUIR DADOS DE DELIVERY (COM CORREÇÃO DE SINTAXE)

document.addEventListener('DOMContentLoaded', async function () {

    // --- VARIÁVEIS GLOBAIS ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const acessoNegadoElement = document.getElementById('acesso-negado');
    let charts = {};

    let vendasDoDashboard = [];
    let pedidosOnlineDoDashboard = []; // Nova variável para dados de delivery

    let dataInicioDashboard, dataFimDashboard;
    let taxaDebitoAtual = 0;
    let taxaCreditoAtual = 0;

    let categoriasCache = []; // Cache para armazenar nomes das categorias

    const toggleDisplay = (element, show) => { if (element) element.style.display = show ? 'block' : 'none'; };
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
    const mostrarMensagem = (mensagem, tipo = 'success') => {
        const container = document.getElementById('alert-container');
        if (!container) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.innerHTML = `<span>${mensagem}</span><button class="alert-close" onclick="this.parentElement.remove()">&times;</button>`;
        container.appendChild(alertDiv);
        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
    };
    const toggleLoading = (show) => {
        toggleDisplay(loadingElement, show);
        toggleDisplay(contentElement, !show);
    };

    // --- AUTENTICAÇÃO ---
    if (!window.sistemaAuth?.verificarAutenticacao()) {
        window.location.href = 'login.html';
        return;
    }
    const usuario = window.sistemaAuth.usuarioLogado;
    if (!['administrador', 'admin', 'gerente'].includes(usuario.tipo?.toLowerCase())) {
        toggleDisplay(loadingElement, false);
        toggleDisplay(contentElement, false);
        toggleDisplay(acessoNegadoElement, true);
        return;
    }

    // --- SUPABASE: TAXAS ---
    async function salvarTaxas() {
        const novaTaxaDebito = document.getElementById('taxa-debito').value;
        const novaTaxaCredito = document.getElementById('taxa-credito').value;
        
        taxaDebitoAtual = parseFloat(novaTaxaDebito) || 0;
        taxaCreditoAtual = parseFloat(novaTaxaCredito) || 0;

        try {
            const { error } = await supabase.from('configuracoes')
                .upsert({
                    id: 1,
                    taxa_debito: taxaDebitoAtual,
                    taxa_credito: taxaCreditoAtual
                }, { onConflict: 'id' });

            if (error) throw error;

            mostrarMensagem('Taxas salvas com sucesso em todos os dispositivos!', 'success');
            atualizarDashboardCompleto(vendasDoDashboard, pedidosOnlineDoDashboard);
        } catch (error) {
            console.error('❌ Erro ao salvar taxas:', error);
            mostrarMensagem('Erro ao salvar as taxas no banco de dados.', 'error');
        }
    }

    async function buscarTaxasDoBanco() {
        try {
            const { data, error } = await supabase.from('configuracoes')
                .select('taxa_debito, taxa_credito')
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                taxaDebitoAtual = data.taxa_debito || 0;
                taxaCreditoAtual = data.taxa_credito || 0;
                document.getElementById('taxa-debito').value = taxaDebitoAtual || '';
                document.getElementById('taxa-credito').value = taxaCreditoAtual || '';
            }
        } catch (error) {
            console.error('❌ Erro ao buscar taxas no Supabase:', error);
            mostrarMensagem('Não foi possível carregar as taxas salvas.', 'error');
        }
    }
    
    /**
     * Carrega todas as categorias do banco para um cache local.
     */
    async function carregarCategoriasCache() {
        try {
            const { data, error } = await supabase.from('categorias').select('id, nome');
            if (error) throw error;
            categoriasCache = data || [];
            console.log(`✅ Cache de ${categoriasCache.length} categorias carregado.`);
        } catch (error) {
            console.error('❌ Erro ao carregar cache de categorias:', error);
            mostrarMensagem('Falha ao carregar categorias, o gráfico pode ficar incompleto.', 'error');
        }
    }


    // --- INICIALIZAÇÃO ---
    async function inicializar() {
        toggleLoading(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        await buscarTaxasDoBanco();
        
        await carregarCategoriasCache(); // Carrega as categorias antes de tudo
        
        configurarFiltrosEEventos();
        await carregarDadosEAtualizarDashboard();
        toggleLoading(false);
    }

    function configurarFiltrosEEventos() {
        document.getElementById('aplicar-filtro').addEventListener('click', carregarDadosEAtualizarDashboard);
        document.getElementById('salvar-taxas').addEventListener('click', salvarTaxas);

        atualizarDatasPorPeriodo('hoje');

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

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                button.classList.add('active');
                const targetPane = document.getElementById(`tab-${button.dataset.tab}`);
                if (targetPane) targetPane.classList.add('active');
            });
        });
    }

    // --- FUNÇÕES DE DATA CORRIGIDAS DEFINITIVAMENTE (FUSO HORÁRIO) ---
    
    const createLocalISO = (dateStr, endOfDay = false) => {
        if (!dateStr) dateStr = new Date().toISOString().split('T')[0]; // Fallback para hoje
        const [year, month, day] = dateStr.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        if (endOfDay) localDate.setHours(23, 59, 59, 999);
        else localDate.setHours(0, 0, 0, 0);

        return localDate.toLocaleString('sv-SE').replace(' ', 'T');
    };
    
    const formatarParaInput = (date) => date.toISOString().split('T')[0];

    function atualizarDatasPorPeriodo(periodo) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); 
        
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
            case 'hoje':
            default:
                break;
        }

        document.getElementById('data-inicio').value = formatarParaInput(inicio);
        document.getElementById('data-fim').value = formatarParaInput(fim);
        document.getElementById('pdf-data-inicio').value = formatarParaInput(inicio);
        document.getElementById('pdf-data-fim').value = formatarParaInput(fim);
    }

    // --- CARREGAMENTO DE DADOS ---
    async function carregarDadosEAtualizarDashboard() {
        let dataInicioInput = document.getElementById('data-inicio').value;
        let dataFimInput = document.getElementById('data-fim').value;

        if (!dataInicioInput || !dataFimInput) {
            mostrarMensagem('Período de datas inválido.', 'error');
            return;
        }

        const dataInicioQuery = dataInicioInput;
        const dataFimQuery = dataFimInput;
        
        const dataInicioISO = createLocalISO(dataInicioInput, false);
        const dataFimISO = createLocalISO(dataFimInput, true);


        dataInicioDashboard = dataInicioInput;
        dataFimDashboard = dataFimInput;

        try {
            const activeTab = document.querySelector('.tab-pane.active');
            const headerElement = activeTab?.querySelector('.new-dashboard-header');
            if (headerElement && headerElement.classList) {
                headerElement.classList.add('loading-state');
            }
        } catch (e) {
            console.warn("⚠️ Cabeçalho não encontrado, prosseguindo normalmente.");
        }

        try {
            
            // Promise 1: Vendas (Frente de Caixa)
            const promessaVendas = supabase.from('vendas')
                .select(`
                    *, 
                    usuario:sistema_usuarios(nome), 
                    itens:vendas_itens(
                        *, 
                        produto:produtos(
                            id, 
                            nome, 
                            categoria_id
                        )
                    )
                `)
                .gte('data_venda', dataInicioQuery)
                .lte('data_venda', dataFimQuery)
                .order('created_at', { ascending: false });

            // Promise 2: Delivery (Pedidos Online)
            const promessaDelivery = supabase.from('pedidos_online')
                .select(`id, created_at, nome_cliente, total, forma_pagamento, status, observacoes`)
                .gte('created_at', dataInicioISO) // Filtro de timestamp
                .lte('created_at', dataFimISO)   // Filtro de timestamp
                .in('status', ['entregue', 'pronto']) // Apenas pedidos concluídos que geram faturamento
                .order('created_at', { ascending: false });

            // Executa as duas buscas em paralelo
            const [vendasResult, deliveryResult] = await Promise.all([promessaVendas, promessaDelivery]);

            if (vendasResult.error) throw vendasResult.error;
            if (deliveryResult.error) throw deliveryResult.error;

            vendasDoDashboard = vendasResult.data || [];
            pedidosOnlineDoDashboard = deliveryResult.data || []; // Salva os dados de delivery

            atualizarDashboardCompleto(vendasDoDashboard, pedidosOnlineDoDashboard); // Passa ambos
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados (vendas ou delivery):', error);
            mostrarMensagem('Não foi possível carregar os dados de vendas ou delivery.', 'error');
        } finally {
            try {
                const activeTab = document.querySelector('.tab-pane.active');
                const headerElement = activeTab?.querySelector('.new-dashboard-header');
                if (headerElement && headerElement.classList) {
                    headerElement.classList.remove('loading-state');
                }
            } catch (e) {
                console.warn("⚠️ Nenhum cabeçalho ativo encontrado ao finalizar carregamento.");
            }
        }
    }

    // --- DASHBOARD PRINCIPAL ---
    function calcularTaxaVenda(venda) {
        if (venda.forma_pagamento === 'cartao_debito') return venda.total * (taxaDebitoAtual / 100);
        if (venda.forma_pagamento === 'cartao_credito') return venda.total * (taxaCreditoAtual / 100);
        return 0;
    }

    function atualizarDashboardCompleto(dadosVendas, dadosDelivery) {
        
        // --- KPIs VENDAS (LOJA) ---
        const faturamentoTotalVendas = dadosVendas.reduce((sum, v) => sum + v.total, 0);
        const totalTaxasVendas = dadosVendas.reduce((sum, v) => sum + calcularTaxaVenda(v), 0);
        const faturamentoLiquidoVendas = faturamentoTotalVendas - totalTaxasVendas;
        const totalTransacoesVendas = dadosVendas.length;
        const ticketMedioVendas = totalTransacoesVendas > 0 ? faturamentoLiquidoVendas / totalTransacoesVendas : 0;

        const dataInicioObj = new Date(dataInicioDashboard);
        const dataFimObj = new Date(dataFimDashboard);
        
        dataInicioObj.setHours(0, 0, 0, 0);
        dataFimObj.setHours(0, 0, 0, 0); 
        
        const diffTime = Math.abs(dataFimObj.getTime() - dataInicioObj.getTime());
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1); 
        
        const vendasPorDia = totalTransacoesVendas / diffDays;

        document.getElementById('kpi-faturamento').textContent = formatarMoeda(faturamentoTotalVendas);
        document.getElementById('kpi-faturamento-liquido').textContent = formatarMoeda(faturamentoLiquidoVendas);
        document.getElementById('kpi-total-taxas').textContent = formatarMoeda(totalTaxasVendas);
        document.getElementById('kpi-transacoes').textContent = totalTransacoesVendas;
        document.getElementById('kpi-ticket-medio').textContent = formatarMoeda(ticketMedioVendas);
        document.getElementById('kpi-vendas-dia').textContent = vendasPorDia.toFixed(1);

        // --- NOVOS KPIs (DELIVERY) ---
        const faturamentoTotalDelivery = dadosDelivery.reduce((sum, v) => sum + v.total, 0);
        const totalTransacoesDelivery = dadosDelivery.length;

        document.getElementById('kpi-faturamento-delivery').textContent = formatarMoeda(faturamentoTotalDelivery);
        document.getElementById('kpi-transacoes-delivery').textContent = totalTransacoesDelivery;
        // --- FIM NOVOS KPIs ---


        Object.values(charts).forEach(chart => { if (chart) chart.destroy(); });
        charts = {};

        // Gráficos continuam baseados apenas nas vendas da LOJA (vendas)
        criarGraficoPagamentos(dadosVendas);
        criarGraficoCategorias(dadosVendas);
        criarGraficoTopProdutos(dadosVendas);
        atualizarTabelaVendasRecentes(dadosVendas);
    }
    
    // ----------------------------------------------------------------------
    // --- FUNÇÕES PDF CORRIGIDAS E MELHORADAS ---
    // ----------------------------------------------------------------------

    const configPdf = {
        titleColor: '#8a2be2',
        primaryColor: '#ff69b4',
        textColor: '#343a40',
        headerStyle: { 
            fillColor: [138, 43, 226], 
            textColor: 255, 
            fontStyle: 'bold',
            fontSize: 10
        },
        bodyStyle: { 
            textColor: 50,
            fontSize: 9
        },
        footerStyle: { 
            fillColor: [230, 230, 250], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold',
            fontSize: 9
        },
        alternateRowStyle: {
            fillColor: [248, 249, 250]
        }
    };

    const setupDoc = (doc, title, start, end) => {
        // Header com logo e título
        doc.setFontSize(22);
        doc.setTextColor(138, 43, 226);
        doc.text('Doce Criativo', 105, 15, null, null, "center");
        
        doc.setFontSize(16);
        doc.setTextColor(50, 50, 50);
        doc.text(title, 105, 25, null, null, "center");
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Período: ${new Date(start).toLocaleDateString('pt-BR')} a ${new Date(end).toLocaleDateString('pt-BR')}`, 105, 32, null, null, "center");
        
        // Linha decorativa
        doc.setDrawColor(138, 43, 226);
        doc.setLineWidth(0.5);
        doc.line(20, 35, 190, 35);
        
        return 40; // Retorna a posição Y inicial para o conteúdo
    };

    const addFooter = (doc, finalY) => {
        const pageHeight = doc.internal.pageSize.height;
        const footerY = pageHeight - 15;
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Relatório gerado em ${new Date().toLocaleString('pt-BR')}`, 105, footerY, null, null, "center");
        doc.text(`Doce Criativo - Sistema de Gestão`, 105, footerY + 5, null, null, "center");
    };

    const getRelatorioBase = (dataInicioPDF, dataFimPDF) => {
        // Usa os dados que já estão no dashboard, filtrando pelo período do PDF se diferente
        return vendasDoDashboard.filter(v => {
            const dataVenda = new Date(v.data_venda).toISOString().split('T')[0];
            return dataVenda >= dataInicioPDF && dataVenda <= dataFimPDF;
        });
    }
    
    /**
     * Pega os dados de delivery já carregados e filtra pela data do PDF.
     */
    const getRelatorioDeliveryBase = (dataInicioPDF, dataFimPDF) => {
        return pedidosOnlineDoDashboard.filter(p => {
            const dataPedido = new Date(p.created_at).toISOString().split('T')[0];
            return dataPedido >= dataInicioPDF && dataPedido <= dataFimPDF;
        });
    }


    // --- GERAÇÃO DE PDF CORRIGIDA ---
    async function gerarRelatorioPDF(tipoRelatorio) {
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            mostrarMensagem('ERRO: Biblioteca jsPDF não carregada. Verifique a conexão com a internet.', 'error');
            return;
        }

        let dataInicioPDF = document.getElementById('pdf-data-inicio').value || dataInicioDashboard;
        let dataFimPDF = document.getElementById('pdf-data-fim').value || dataFimDashboard;
        
        if (!dataInicioPDF || !dataFimPDF) {
            mostrarMensagem('Selecione um período válido para o relatório.', 'error');
            return;
        }

        const dadosBase = (tipoRelatorio === 'delivery') 
            ? getRelatorioDeliveryBase(dataInicioPDF, dataFimPDF) 
            : getRelatorioBase(dataInicioPDF, dataFimPDF);

        if (dadosBase.length === 0) {
            mostrarMensagem('Nenhuma venda encontrada para gerar o relatório no período especificado.', 'error');
            return;
        }

        mostrarMensagem('Gerando relatório PDF...', 'info');

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            let startY = setupDoc(doc, `Relatório de ${getTituloRelatorio(tipoRelatorio)}`, dataInicioPDF, dataFimPDF);
            
            // Adicionar resumo executivo (passa flag se é delivery)
            startY = adicionarResumoExecutivo(doc, dadosBase, startY, tipoRelatorio === 'delivery');
            
            switch (tipoRelatorio) {
                case 'geral':
                    startY = gerarRelatorioGeral(doc, dadosBase, startY);
                    break;
                case 'pagamento':
                    startY = gerarRelatorioPagamento(doc, dadosBase, startY);
                    break;
                case 'vendedor':
                    startY = gerarRelatorioVendedor(doc, dadosBase, startY);
                    break;
                case 'produto':
                    startY = gerarRelatorioProduto(doc, dadosBase, startY);
                    break;
                case 'delivery':
                    startY = gerarRelatorioDelivery(doc, dadosBase, startY);
                    break;
                default:
                    throw new Error(`Tipo de relatório desconhecido: ${tipoRelatorio}`);
            }

            addFooter(doc, startY);
            
            doc.save(`Relatorio_${getTituloRelatorio(tipoRelatorio)}_${dataInicioPDF}_a_${dataFimPDF}.pdf`);
            mostrarMensagem(`Relatório de ${getTituloRelatorio(tipoRelatorio)} gerado com sucesso!`, 'success');
            
        } catch (error) {
            console.error('❌ Erro ao gerar PDF:', error);
            mostrarMensagem(`Erro ao gerar o relatório: ${error.message}`, 'error');
        }
    }

    function getTituloRelatorio(tipo) {
        const titulos = {
            'geral': 'Vendas Gerais (Loja)',
            'pagamento': 'Vendas por Pagamento (Loja)', 
            'vendedor': 'Performance de Vendedores (Loja)',
            'produto': 'Produtos Vendidos (Loja)',
            'delivery': 'Vendas Delivery' // NOVO TÍTULO
        };
        return titulos[tipo] || tipo;
    }

    function adicionarResumoExecutivo(doc, dados, startY, isDelivery = false) {
        const totalBruto = dados.reduce((sum, v) => sum + v.total, 0);
        const totalTransacoes = dados.length;
        let resumoLines = [];

        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text('RESUMO EXECUTIVO', 20, startY);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);

        if (isDelivery) {
            // Resumo para Delivery (sem taxas)
            const ticketMedio = totalTransacoes > 0 ? totalBruto / totalTransacoes : 0;
            resumoLines = [
                `Total de Pedidos: ${totalTransacoes} transações`,
                `Faturamento Delivery: ${formatarMoeda(totalBruto)}`,
                `Ticket Médio: ${formatarMoeda(ticketMedio)}`
            ];
        } else {
            // Resumo para Vendas (com taxas)
            const totalTaxas = dados.reduce((sum, v) => sum + calcularTaxaVenda(v), 0);
            const totalLiquido = totalBruto - totalTaxas;
            const ticketMedio = totalTransacoes > 0 ? totalLiquido / totalTransacoes : 0;
            resumoLines = [
                `Total de Vendas: ${totalTransacoes} transações`,
                `Faturamento Bruto: ${formatarMoeda(totalBruto)}`,
                `Custos com Taxas: ${formatarMoeda(totalTaxas)}`,
                `Faturamento Líquido: ${formatarMoeda(totalLiquido)}`,
                `Ticket Médio: ${formatarMoeda(ticketMedio)}`
            ];
        }
        
        resumoLines.forEach((line, index) => {
            doc.text(line, 20, startY + 10 + (index * 5));
        });
        
        return startY + 10 + (resumoLines.length * 5) + 10;
    }

    // --- IMPLEMENTAÇÃO DOS RELATÓRIOS ---
    
    /**
     * Extrai a lista de itens da string de observações do delivery.
     */
    const parseItensDelivery = (observacoes) => {
        if (!observacoes) return 'N/A';
        const linhas = observacoes.split('\n');
        let itens = [];
        let capturandoItens = false;
        for (const linha of linhas) {
            if (linha.startsWith('Itens:')) {
                capturandoItens = true;
                continue;
            }
            if (linha.startsWith('Total:') || linha.startsWith('OBSERVAÇÕES ADICIONAIS:')) {
                capturandoItens = false;
                break;
            }
            if (capturandoItens && linha.trim() !== '') {
                itens.push(linha.replace('*', '').trim()); 
            }
        }
        if (itens.length === 0) return 'Detalhes não encontrados';
        // Retorna como string única separada por ; para o PDF
        return itens.join('; ');
    };
    

    function gerarRelatorioGeral(doc, dadosBase, startY) {
        const head = [["Data/Hora", "Vendedor", "Pagamento", "Bruto", "Taxa", "Líquido"]];
        const body = dadosBase.map(v => {
            const taxa = calcularTaxaVenda(v);
            const liquido = v.total - taxa;
            return [
                new Date(v.created_at).toLocaleString('pt-BR', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                v.usuario?.nome || 'N/A',
                formatarFormaPagamento(v.forma_pagamento),
                formatarMoeda(v.total),
                formatarMoeda(taxa),
                formatarMoeda(liquido)
            ];
        });

        const totalBruto = dadosBase.reduce((sum, v) => sum + v.total, 0);
        const totalTaxas = dadosBase.reduce((sum, v) => sum + calcularTaxaVenda(v), 0);
        const totalLiquido = totalBruto - totalTaxas;

        doc.autoTable({
            startY: startY,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: configPdf.headerStyle,
            bodyStyles: configPdf.bodyStyle,
            alternateRowStyles: configPdf.alternateRowStyle,
            foot: [
                ["TOTAL GERAL", "", "", formatarMoeda(totalBruto), formatarMoeda(totalTaxas), formatarMoeda(totalLiquido)]
            ],
            footStyles: configPdf.footerStyle,
            margin: { top: startY },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 25 },
                2: { cellWidth: 20 },
                3: { cellWidth: 20 },
                4: { cellWidth: 20 },
                5: { cellWidth: 20 }
            }
        });

        return doc.lastAutoTable.finalY + 10;
    }
    
    function gerarRelatorioDelivery(doc, dadosBase, startY) {
        const head = [["Data/Hora", "Cliente", "Itens (Resumo)", "Pagamento", "Status", "Total"]];
        const body = dadosBase.map(p => {
            const itensResumo = parseItensDelivery(p.observacoes);
            
            // ISOLANDO A DATA PARA GARANTIR A SINTAXE LIMPA NO ARRAY LITERAL
            const dataHoraFormatada = new Date(p.created_at).toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return [
                dataHoraFormatada, // Variável de data formatada
                p.nome_cliente || 'N/A',
                itensResumo.substring(0, 45) + (itensResumo.length > 45 ? '...' : ''), // Limita o tamanho
                formatarFormaPagamento(p.forma_pagamento),
                p.status,
                formatarMoeda(p.total)
            ];
        });

        const totalBruto = dadosBase.reduce((sum, v) => sum + v.total, 0);

        doc.autoTable({
            startY: startY,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: configPdf.headerStyle,
            bodyStyles: configPdf.bodyStyle,
            alternateRowStyles: configPdf.alternateRowStyle,
            foot: [
                ["TOTAL GERAL", "", "", "", "", formatarMoeda(totalBruto)]
            ],
            footStyles: configPdf.footerStyle,
            margin: { top: startY },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 35 },
                2: { cellWidth: 50 },
                3: { cellWidth: 20 },
                4: { cellWidth: 15 },
                5: { cellWidth: 20 }
            }
        });

        return doc.lastAutoTable.finalY + 10;
    }


    function gerarRelatorioPagamento(doc, dadosBase, startY) {
        const agrupado = dadosBase.reduce((acc, v) => {
            const forma = v.forma_pagamento || 'dinheiro';
            acc[forma] = acc[forma] || { bruto: 0, taxas: 0, liquido: 0, transacoes: 0 };
            const taxa = calcularTaxaVenda(v);
            acc[forma].bruto += v.total;
            acc[forma].taxas += taxa;
            acc[forma].liquido += (v.total - taxa);
            acc[forma].transacoes += 1;
            return acc;
        }, {});

        const head = [["Forma de Pagamento", "Transações", "Total Bruto", "Total Taxas", "Total Líquido"]];
        const body = Object.entries(agrupado).map(([forma, totais]) => [
            formatarFormaPagamento(forma),
            totais.transacoes.toString(),
            formatarMoeda(totais.bruto),
            formatarMoeda(totais.taxas),
            formatarMoeda(totais.liquido)
        ]).sort((a, b) => parseFloat(b[4].replace(/[R$\s.]/g, '').replace(',', '.')) - parseFloat(a[4].replace(/[R$\s.]/g, '').replace(',', '.')));
        //                                                                                                                                                                                                                                                    ^ CORRIGIDO: O parêntese de fechamento do .sort() estava faltando aqui.

        const totalBruto = dadosBase.reduce((sum, v) => sum + v.total, 0);
        const totalTaxas = dadosBase.reduce((sum, v) => sum + calcularTaxaVenda(v), 0);
        const totalLiquido = totalBruto - totalTaxas;

        doc.autoTable({
            startY: startY,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: configPdf.headerStyle,
            bodyStyles: configPdf.bodyStyle,
            foot: [
                ["TOTAL GERAL", dadosBase.length.toString(), formatarMoeda(totalBruto), formatarMoeda(totalTaxas), formatarMoeda(totalLiquido)]
            ],
            footStyles: configPdf.footerStyle,
            margin: { top: startY },
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 25 },
                2: { cellWidth: 30 },
                3: { cellWidth: 30 },
                4: { cellWidth: 30 }
            }
        });

        return doc.lastAutoTable.finalY + 10;
    }

    function gerarRelatorioVendedor(doc, dadosBase, startY) {
        const agrupado = dadosBase.reduce((acc, v) => {
            const vendedor = v.usuario?.nome || 'N/A';
            acc[vendedor] = acc[vendedor] || { vendas: 0, bruto: 0, taxas: 0, liquido: 0 };
            const taxa = calcularTaxaVenda(v);
            acc[vendedor].vendas += 1;
            acc[vendedor].bruto += v.total;
            acc[vendedor].taxas += taxa;
            acc[vendedor].liquido += (v.total - taxa);
            return acc;
        }, {});

        const head = [["Vendedor", "Vendas", "Faturamento Bruto", "Custo Taxas", "Faturamento Líquido"]];
        const body = Object.entries(agrupado).map(([vendedor, totais]) => [
            vendedor,
            totais.vendas.toString(),
            formatarMoeda(totais.bruto),
            formatarMoeda(totais.taxas),
            formatarMoeda(totais.liquido)
        ]).sort((a, b) => b[4].replace(/[R$\s.]/g, '').replace(',', '.') - a[4].replace(/[R$\s.]/g, '').replace(',', '.'));
        //                                                                                                                                                                                                      ^ CORRIGIDO: O parêntese de fechamento do .sort() estava faltando aqui.

        const totalBruto = dadosBase.reduce((sum, v) => sum + v.total, 0);
        const totalTaxas = dadosBase.reduce((sum, v) => sum + calcularTaxaVenda(v), 0);
        const totalLiquido = totalBruto - totalTaxas;

        doc.autoTable({
            startY: startY,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: configPdf.headerStyle,
            bodyStyles: configPdf.bodyStyle,
            alternateRowStyles: configPdf.alternateRowStyle,
            foot: [
                ["TOTAL GERAL", dadosBase.length.toString(), formatarMoeda(totalBruto), formatarMoeda(totalTaxas), formatarMoeda(totalLiquido)]
            ],
            footStyles: configPdf.footerStyle,
            margin: { top: startY },
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: {
                0: { cellWidth: 45 },
                1: { cellWidth: 20 },
                2: { cellWidth: 30 },
                3: { cellWidth: 30 },
                4: { cellWidth: 30 }
            }
        });

        return doc.lastAutoTable.finalY + 10;
    }

    function gerarRelatorioProduto(doc, dadosBase, startY) {
        const produtos = {};
        dadosBase.forEach(venda => {
            (venda.itens || []).forEach(item => {
                const nome = item.produto?.nome || 'Produto Removido';
                
                // Usa o cache de categorias em vez do join quebrado
                const catId = item.produto?.categoria_id;
                const categoriaEncontrada = categoriasCache.find(c => c.id === catId);
                const categoria = categoriaEncontrada ? categoriaEncontrada.nome : (catId ? 'Sem Categoria' : 'Produto Removido');
                
                const valorVendido = item.preco_unitario * item.quantidade;

                produtos[nome] = produtos[nome] || { 
                    categoria: categoria, 
                    quantidade: 0, 
                    valor: 0 
                };
                produtos[nome].quantidade += item.quantidade;
                produtos[nome].valor += valorVendido;
            });
        });

        const head = [["Produto", "Categoria", "Qtd. Vendida", "Total Vendido"]];
        const body = Object.entries(produtos)
            .map(([nome, dados]) => [
                nome,
                dados.categoria,
                dados.quantidade.toString(),
                formatarMoeda(dados.valor)
            ])
            .sort((a, b) => 
                parseFloat(b[3].replace(/[R$\s.]/g, '').replace(',', '.')) - 
                parseFloat(a[3].replace(/[R$\s.]/g, '').replace(',', '.'))
            );

        const totalGeral = dadosBase.reduce((sum, v) => sum + v.total, 0);
        const totalItens = body.reduce((sum, row) => sum + parseInt(row[2]), 0);

        doc.autoTable({
            startY: startY,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: configPdf.headerStyle,
            bodyStyles: configPdf.bodyStyle,
            foot: [
                ["TOTAL GERAL", "", totalItens.toString(), formatarMoeda(totalGeral)]
            ],
            footStyles: configPdf.footerStyle,
            margin: { top: startY },
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 40 },
                2: { cellWidth: 25 },
                3: { cellWidth: 30 }
            }
        });

        return doc.lastAutoTable.finalY + 10;
    }

    function formatarFormaPagamento(forma) {
        const formas = {
            'dinheiro': 'Dinheiro',
            'cartao_debito': 'Cartão Débito',
            'cartao_credito': 'Cartão Crédito',
            'pix': 'PIX',
            'crediario': 'Crediário',
            'cartao_(maquininha)': 'Cartão (Máquina)'
        };
        return formas[forma] || forma;
    }

    // --- GRÁFICOS (mantidos da versão anterior) ---
    const criarGrafico = (elementId, type, data, options) => {
        const ctx = document.getElementById(elementId);
        if (!ctx) return null;
        return new Chart(ctx.getContext('2d'), { type, data, options });
    };

    function criarGraficoPagamentos(dados) {
        const pagamentos = dados.reduce((acc, v) => {
            const forma = (v.forma_pagamento || 'N/A').replace('_', ' ');
            acc[forma] = (acc[forma] || 0) + v.total;
            return acc;
        }, {});
        charts.pagamentos = criarGrafico('chart-pagamentos', 'doughnut', {
            labels: Object.keys(pagamentos),
            datasets: [{ data: Object.values(pagamentos), backgroundColor: ['#ff69b4', '#8a2be2', '#28a745', '#ffc107'] }]
        }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } });
    }

    function criarGraficoCategorias(dados) {
        const categorias = {};
        dados.forEach(v => (v.itens || []).forEach(item => {
            
            // Usa o cache de categorias em vez do join quebrado
            const catId = item.produto?.categoria_id;
            const categoriaEncontrada = categoriasCache.find(c => c.id === catId);
            const cat = categoriaEncontrada ? categoriaEncontrada.nome : (catId ? 'Sem Categoria' : 'Produto Removido');

            categorias[cat] = (categorias[cat] || 0) + (item.preco_unitario * item.quantidade);
        }));
        charts.categorias = criarGrafico('chart-categorias', 'pie', {
            labels: Object.keys(categorias),
            datasets: [{ data: Object.values(categorias), backgroundColor: ['#17a2b8', '#dc3545', '#6f42c1', '#fd7e14', '#20c997'] }]
        }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } });
    }

    function criarGraficoTopProdutos(dados) {
        const produtos = {};
        dados.forEach(v => (v.itens || []).forEach(item => {
            const nome = item.produto?.nome || 'N/A';
            produtos[nome] = (produtos[nome] || 0) + (item.preco_unitario * item.quantidade);
        }));
        const sortedProdutos = Object.entries(produtos).sort((a, b) => b[1] - a[1]).slice(0, 5).reverse();
        charts.topProdutos = criarGrafico('chart-top-produtos', 'bar', {
            labels: sortedProdutos.map(p => p[0]),
            datasets: [{ label: 'Valor Vendido', data: sortedProdutos.map(p => p[1]), backgroundColor: '#ff69b4' }]
        }, { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } });
    }

    function atualizarTabelaVendasRecentes(dados) {
        const tbody = document.getElementById('tabela-vendas-recentes');
        tbody.innerHTML = '';
        if (dados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma venda no período.</td></tr>';
            return;
        }
        dados.slice(0, 10).forEach(v => {
            tbody.innerHTML += `<tr><td>${new Date(v.created_at).toLocaleString('pt-BR')}</td><td>${v.usuario?.nome || 'N/A'}</td><td><span class="badge-pagamento">${(v.forma_pagamento || '').replace('_', ' ')}</span></td><td>${formatarMoeda(v.total)}</td></tr>`;
        });
    }

    // --- CHAMADA INICIAL ---
    inicializar();
});