// js/relatorios.js - VERSÃO FINAL CORRIGIDA COM PDFS MODERNOS E FUNCIONAIS E FILTROS DE DATA

document.addEventListener('DOMContentLoaded', async function () {

    // --- VARIÁVEIS GLOBAIS ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const acessoNegadoElement = document.getElementById('acesso-negado');
    const estoqueProducaoBody = document.getElementById('estoque-producao-body');
    const alertaEstoqueProducao = document.getElementById('alerta-estoque-producao');
    const recarregarEstoqueBtn = document.getElementById('recarregar-estoque-producao');
    
    // ELEMENTOS DO MODAL (NOVO)
    const modalEstoque = document.getElementById('modal-estoque-producao');
    const formIngrediente = document.getElementById('form-ingrediente');
    const modalTituloEstoque = document.getElementById('modal-titulo-estoque');

    let charts = {};

    let vendasDoDashboard = [];
    let estoqueProducaoData = [];
    let dataInicioDashboard, dataFimDashboard;
    let taxaDebitoAtual = 0;
    let taxaCreditoAtual = 0;

    const toggleDisplay = (element, show) => { if (element) element.style.display = show ? 'block' : 'none'; };
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
    const mostrarMensagem = (mensagem, tipo = 'success') => {
        const container = document.getElementById('alert-container');
        if (!container) return;
        const alertDiv = document.createElement('div');
        // Usar as classes de alerta do style.css ou customizadas no relatorios.css
        alertDiv.className = `alert alert-${tipo}`; 
        alertDiv.innerHTML = `<span>${mensagem}</span><button class="alert-close" onclick="this.parentElement.remove()">&times;</button>`;
        container.appendChild(alertDiv);
        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
    };
    const toggleLoading = (show) => {
        toggleDisplay(loadingElement, show);
        toggleDisplay(contentElement, !show);
    };
    
    // FUNÇÃO AUXILIAR GLOBAL
    function fecharModalEstoque() {
        if (modalEstoque) modalEstoque.style.display = 'none';
        if (formIngrediente) formIngrediente.reset();
        document.getElementById('ingrediente-id-edicao').value = '';
        if (modalTituloEstoque) modalTituloEstoque.innerHTML = '<i class="fas fa-plus-circle"></i> Novo Ingrediente';
    }
    // Adicionar ao escopo global para o onclick no HTML
    window.fecharModalEstoque = fecharModalEstoque;


    // --- AUTENTICAÇÃO ---
    if (!window.sistemaAuth?.verificarAutenticacao()) {
        window.location.href = 'login.html';
        return;
    }
    const usuario = window.sistemaAuth.usuarioLogado;
    const isAdminOrManager = ['administrador', 'admin', 'gerente', 'supervisor'].includes(usuario.tipo?.toLowerCase());
    
    if (!isAdminOrManager) {
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
            atualizarDashboardCompleto(vendasDoDashboard);
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

    // --- INICIALIZAÇÃO ---
    async function inicializar() {
        toggleLoading(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        await buscarTaxasDoBanco();
        configurarFiltrosEEventos();
        await carregarDadosEAtualizarDashboard();
        
        await carregarEstoqueProducao();

        toggleLoading(false);
    }

    function configurarFiltrosEEventos() {
        document.getElementById('aplicar-filtro').addEventListener('click', carregarDadosEAtualizarDashboard);
        document.getElementById('salvar-taxas').addEventListener('click', salvarTaxas);
        
        if (recarregarEstoqueBtn) {
            recarregarEstoqueBtn.addEventListener('click', carregarEstoqueProducao);
        }
        
        // NOVO EVENT LISTENER: Lógica do Formulário de Ingredientes
        if (formIngrediente) {
            formIngrediente.addEventListener('submit', salvarIngrediente);
        }
        
        // NOVO EVENT LISTENER: Botão Abrir Modal (já configurado no HTML)
        // document.getElementById('abrir-modal-ingrediente')?.addEventListener('click', ...);


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
                
                if (button.dataset.tab === 'estoque-producao') {
                    carregarEstoqueProducao();
                }
            });
        });
    }

    // --- FUNÇÕES DE DATA ---
    const createLocalISO = (dateStr, endOfDay = false) => {
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
    
    // --- CARREGAMENTO DE DADOS (VENDAS) ---
    async function carregarDadosEAtualizarDashboard() {
         let dataInicioInput = document.getElementById('data-inicio').value;
        let dataFimInput = document.getElementById('data-fim').value;

        if (!dataInicioInput || !dataFimInput) {
            mostrarMensagem('Período de datas inválido.', 'error');
            return;
        }

        const dataInicioQuery = createLocalISO(dataInicioInput);
        const dataFimQuery = createLocalISO(dataFimInput, true); 

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
    
    // --- DASHBOARD PRINCIPAL (KPIs e Gráficos) ---
    
    function calcularTaxaVenda(venda) {
        if (venda.forma_pagamento === 'cartao_debito') return venda.total * (taxaDebitoAtual / 100);
        if (venda.forma_pagamento === 'cartao_credito') return venda.total * (taxaCreditoAtual / 100);
        return 0;
    }

    function atualizarDashboardCompleto(dados) {
        const faturamentoTotal = dados.reduce((sum, v) => sum + v.total, 0);
        const totalTaxas = dados.reduce((sum, v) => sum + calcularTaxaVenda(v), 0);
        const faturamentoLiquido = faturamentoTotal - totalTaxas;
        const totalTransacoes = dados.length;
        const ticketMedio = totalTransacoes > 0 ? faturamentoLiquido / totalTransacoes : 0;

        const dataInicioObj = new Date(dataInicioDashboard);
        const dataFimObj = new Date(dataFimDashboard);
        
        dataInicioObj.setHours(0, 0, 0, 0);
        dataFimObj.setHours(0, 0, 0, 0); 
        
        const diffTime = Math.abs(dataFimObj.getTime() - dataInicioObj.getTime());
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1); 
        
        const vendasPorDia = totalTransacoes / diffDays;

        document.getElementById('kpi-faturamento').textContent = formatarMoeda(faturamentoTotal);
        document.getElementById('kpi-faturamento-liquido').textContent = formatarMoeda(faturamentoLiquido);
        document.getElementById('kpi-total-taxas').textContent = formatarMoeda(totalTaxas);
        document.getElementById('kpi-transacoes').textContent = totalTransacoes;
        document.getElementById('kpi-ticket-medio').textContent = formatarMoeda(ticketMedio);
        document.getElementById('kpi-vendas-dia').textContent = vendasPorDia.toFixed(1);

        Object.values(charts).forEach(chart => { if (chart) chart.destroy(); });
        charts = {};

        criarGraficoPagamentos(dados);
        criarGraficoCategorias(dados);
        criarGraficoTopProdutos(dados);
        atualizarTabelaVendasRecentes(dados);
    }
    
    // ----------------------------------------------------------------------
    // --- MÓDULO: ESTOQUE DE PRODUÇÃO (CRUD INCLUÍDO) ---
    // ----------------------------------------------------------------------

    async function carregarEstoqueProducao() {
        if (!estoqueProducaoBody) return;
        
        estoqueProducaoBody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><div class="spinner-moderno" style="width: 20px; height: 20px;"></div> Carregando estoque...</td></tr>';
        alertaEstoqueProducao.innerHTML = '';

        try {
            const { data, error } = await supabase.from('estoque_producao')
                .select('*')
                .order('nome'); // Ordena por nome, incluindo inativos

            if (error) throw error;
            
            estoqueProducaoData = data || [];
            exibirEstoqueProducao(estoqueProducaoData);
            
            if (recarregarEstoqueBtn) {
                recarregarEstoqueBtn.classList.remove('btn-danger');
                recarregarEstoqueBtn.classList.add('btn-secondary');
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar estoque de produção:', error);
            mostrarMensagem('Erro ao carregar o estoque de produção. Verifique se a tabela foi criada corretamente.', 'error');
            estoqueProducaoBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--danger-color);">Erro ao carregar estoque.</td></tr>';
            
            if (recarregarEstoqueBtn) {
                recarregarEstoqueBtn.classList.add('btn-danger');
                recarregarEstoqueBtn.classList.remove('btn-secondary');
            }
        }
    }

    function exibirEstoqueProducao(dados) {
        if (!estoqueProducaoBody) return;

        estoqueProducaoBody.innerHTML = '';
        alertaEstoqueProducao.innerHTML = '';
        let itensParaComprar = [];

        if (dados.length === 0) {
            estoqueProducaoBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-color);">Nenhum ingrediente ativo cadastrado.</td></tr>';
            return;
        }

        dados.forEach(item => {
            const estoqueAtual = item.estoque_atual || 0;
            const estoqueMinimo = item.estoque_minimo || 0;
            let statusText = item.ativo ? 'Em Estoque' : 'Inativo';
            let statusClass = item.ativo ? 'success' : 'info';
            const linhaClass = item.ativo ? '' : 'style="opacity: 0.6; font-style: italic;"';

            if (item.ativo) {
                if (estoqueAtual <= 0) {
                    statusText = 'ESGOTADO';
                    statusClass = 'danger';
                    itensParaComprar.push({ item: item.nome, status: statusText, falta: estoqueMinimo, unidade_medida: item.unidade_medida });
                } else if (estoqueAtual <= estoqueMinimo) {
                    statusText = 'Estoque Baixo';
                    statusClass = 'warning';
                    itensParaComprar.push({ item: item.nome, status: statusText, falta: estoqueMinimo - estoqueAtual, unidade_medida: item.unidade_medida });
                }
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td ${linhaClass}>${item.nome}</td>
                <td ${linhaClass}>${item.unidade_medida}</td>
                <td ${linhaClass}>${estoqueAtual.toFixed(2).replace('.', ',')}</td>
                <td ${linhaClass}>${estoqueMinimo.toFixed(2).replace('.', ',')}</td>
                <td>
                    <span class="badge pdf-badge-${statusClass}" style="
                        ${statusClass === 'success' ? 'background: #d4edda; color: #155724;' : ''}
                        ${statusClass === 'warning' ? 'background: #fff3cd; color: #856404;' : ''}
                        ${statusClass === 'danger' ? 'background: #f8d7da; color: #721c24;' : ''}
                        ${statusClass === 'info' ? 'background: #e3f2fd; color: #1565c0;' : ''}
                        padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;
                    ">
                        ${statusText}
                    </span>
                </td>
                <td>
                    <button class="btn btn-edit btn-sm" onclick="editarIngrediente('${item.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="excluirIngrediente('${item.id}', '${item.nome}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            estoqueProducaoBody.appendChild(tr);
        });
        
        // Exibir alertas de compra
        if (itensParaComprar.length > 0) {
            const listaAlerta = document.createElement('div');
            listaAlerta.className = 'card'
            listaAlerta.style.cssText = `background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
            
            let htmlAlerta = '<p style="font-weight: bold; color: #856404; margin-bottom: 10px;">🚨 ITENS A SEREM COMPRADOS IMEDIATAMENTE:</p>';
            htmlAlerta += '<ul style="margin-left: 20px; color: #856404; font-size: 0.9rem; list-style-type: disc;">';
            
            itensParaComprar.forEach(item => {
                const acao = item.status === 'ESGOTADO' ? 'COMPRAR JÁ' : 'Comprar para reposição';
                const falta = item.falta > 0 ? item.falta.toFixed(2).replace('.', ',') : '0,00';
                
                let mensagemFalta = '';
                if (item.status === 'ESGOTADO') {
                    mensagemFalta = `(Deveria ter pelo menos ${item.falta.toFixed(2).replace('.', ',')} ${item.unidade_medida})`
                } else {
                    mensagemFalta = `(Faltam ${falta} ${item.unidade_medida} para atingir o estoque mínimo)`;
                }
                
                htmlAlerta += `<li style="margin-bottom: 5px;">
                    <strong>${item.item}:</strong> ${item.status}. 
                    ${mensagemFalta}
                    <span style="font-weight: bold; color: ${item.status === 'ESGOTADO' ? 'var(--danger-color)' : 'orange'}; margin-left: 10px;">[${acao}]</span>
                </li>`;
            });
            
            htmlAlerta += '</ul>';
            
            listaAlerta.innerHTML = htmlAlerta;
            alertaEstoqueProducao.appendChild(listaAlerta);
        }
    }
    
    // --- CRUD FUNCTIONS ---
    
    async function salvarIngrediente(e) {
        e.preventDefault();
        
        const isEdicao = !!document.getElementById('ingrediente-id-edicao').value;
        const ingredienteId = document.getElementById('ingrediente-id-edicao').value;
        
        const nome = document.getElementById('ingrediente-nome').value.trim();
        const unidade_medida = document.getElementById('ingrediente-unidade').value;
        const estoque_atual = parseFloat(document.getElementById('ingrediente-atual').value);
        const estoque_minimo = parseFloat(document.getElementById('ingrediente-minimo').value);
        const ativo = document.getElementById('ingrediente-ativo').checked;
        
        if (!nome || !unidade_medida || isNaN(estoque_atual) || isNaN(estoque_minimo) || estoque_minimo < 0) {
            mostrarMensagem('Preencha todos os campos corretamente.', 'error');
            return;
        }

        const dadosIngrediente = {
            nome,
            unidade_medida,
            estoque_atual,
            estoque_minimo,
            ativo
        };
        
        try {
            if (isEdicao) {
                // Atualizar
                const { error } = await supabase.from('estoque_producao')
                    .update(dadosIngrediente)
                    .eq('id', ingredienteId);
                    
                if (error) throw error;
                mostrarMensagem('Ingrediente atualizado com sucesso!', 'success');
            } else {
                // Criar
                const { error } = await supabase.from('estoque_producao')
                    .insert([dadosIngrediente]);
                    
                if (error) throw error;
                mostrarMensagem('Ingrediente cadastrado com sucesso!', 'success');
            }
            
            fecharModalEstoque();
            await carregarEstoqueProducao();

        } catch (error) {
            console.error('❌ Erro ao salvar ingrediente:', error);
            let msg = 'Erro ao salvar ingrediente.';
            if (error.code === '23505') {
                msg = 'Erro: Já existe um ingrediente com este nome.';
            } else if (error.message) {
                msg += ' Detalhe: ' + error.message;
            }
            mostrarMensagem(msg, 'error');
        }
    }
    
    window.editarIngrediente = async function(ingredienteId) {
        try {
            const { data: ingrediente, error } = await supabase.from('estoque_producao')
                .select('*')
                .eq('id', ingredienteId)
                .single();
                
            if (error) throw error;
            
            document.getElementById('ingrediente-id-edicao').value = ingrediente.id;
            document.getElementById('ingrediente-nome').value = ingrediente.nome;
            document.getElementById('ingrediente-unidade').value = ingrediente.unidade_medida;
            // Garantir que os valores numéricos sejam formatados corretamente para o input
            document.getElementById('ingrediente-atual').value = parseFloat(ingrediente.estoque_atual).toFixed(2);
            document.getElementById('ingrediente-minimo').value = parseFloat(ingrediente.estoque_minimo).toFixed(2);
            document.getElementById('ingrediente-ativo').checked = ingrediente.ativo;
            
            modalTituloEstoque.innerHTML = '<i class="fas fa-edit"></i> Editar Ingrediente';
            modalEstoque.style.display = 'flex';
            
        } catch (error) {
            console.error('❌ Erro ao carregar ingrediente para edição:', error);
            mostrarMensagem('Erro ao carregar dados do ingrediente.', 'error');
        }
    }

    window.excluirIngrediente = async function(ingredienteId, nomeIngrediente) {
        if (!confirm(`Tem certeza que deseja excluir o ingrediente "${nomeIngrediente}"?\nEsta ação é irreversível!`)) {
            return;
        }

        try {
            const { error } = await supabase.from('estoque_producao')
                .delete()
                .eq('id', ingredienteId);
                
            if (error) throw error;
            
            mostrarMensagem(`Ingrediente "${nomeIngrediente}" excluído com sucesso!`, 'success');
            await carregarEstoqueProducao();

        } catch (error) {
            console.error('❌ Erro ao excluir ingrediente:', error);
            mostrarMensagem('Erro ao excluir ingrediente: ' + error.message, 'error');
        }
    }

    // ----------------------------------------------------------------------
    // --- FUNÇÕES PDF, GRÁFICOS E OUTROS (MANTIDAS) ---
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
        return vendasDoDashboard.filter(v => {
            const dataVenda = new Date(v.data_venda).toISOString().split('T')[0];
            return dataVenda >= dataInicioPDF && dataVenda <= dataFimPDF;
        });
    }

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

        const dadosBase = getRelatorioBase(dataInicioPDF, dataFimPDF);

        if (dadosBase.length === 0) {
            mostrarMensagem('Nenhuma venda encontrada para gerar o relatório no período especificado.', 'error');
            return;
        }

        mostrarMensagem('Gerando relatório PDF...', 'info');

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            let startY = setupDoc(doc, `Relatório de ${getTituloRelatorio(tipoRelatorio)}`, dataInicioPDF, dataFimPDF);
            
            startY = adicionarResumoExecutivo(doc, dadosBase, startY);
            
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
            'geral': 'Vendas Gerais',
            'pagamento': 'Vendas por Pagamento', 
            'vendedor': 'Performance de Vendedores',
            'produto': 'Produtos Vendidos'
        };
        return titulos[tipo] || tipo;
    }

    function adicionarResumoExecutivo(doc, dados, startY) {
        const totalBruto = dados.reduce((sum, v) => sum + v.total, 0);
        const totalTaxas = dados.reduce((sum, v) => sum + calcularTaxaVenda(v), 0);
        const totalLiquido = totalBruto - totalTaxas;
        const totalTransacoes = dados.length;
        const ticketMedio = totalTransacoes > 0 ? totalLiquido / totalTransacoes : 0;

        doc.setFontSize(12);
        doc.setTextColor(50, 50, 50);
        doc.text('RESUMO EXECUTIVO', 20, startY);
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        
        const resumoLines = [
            `Total de Vendas: ${totalTransacoes} transações`,
            `Faturamento Bruto: ${formatarMoeda(totalBruto)}`,
            `Custos com Taxas: ${formatarMoeda(totalTaxas)}`,
            `Faturamento Líquido: ${formatarMoeda(totalLiquido)}`,
            `Ticket Médio: ${formatarMoeda(ticketMedio)}`
        ];
        
        resumoLines.forEach((line, index) => {
            doc.text(line, 20, startY + 10 + (index * 5));
        });
        
        return startY + 10 + (resumoLines.length * 5) + 10;
    }

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
                const categoria = item.produto?.categoria?.nome || 'Sem Categoria';
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
            'pix': 'PIX'
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
            const cat = item.produto?.categoria?.nome || 'Sem Categoria';
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