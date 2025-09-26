// js/relatorios.js - Sistema completo de relatórios e analytics
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação (usando o mesmo sistema das outras páginas)
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) {
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

    // Função para testar conexão (padronizada)
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

    // Carregar vendas do período (adaptado para estrutura do seu banco)
    async function carregarVendasPeriodo(dataInicio, dataFim) {
        try {
            const { data: vendas, error } = await supabase
                .from('vendas')
                .select(`
                    *,
                    vendas_itens(*),
                    sistema_usuarios(nome)
                `)
                .gte('data_venda', dataInicio.toISOString().split('T')[0])
                .lte('data_venda', dataFim.toISOString().split('T')[0])
                .order('data_venda', { ascending: true });

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
                    vendas!inner(data_venda),
                    produtos(nome, categoria:categorias(nome), preco_venda)
                `)
                .gte('vendas.data_venda', dataInicio.toISOString().split('T')[0])
                .lte('vendas.data_venda', dataFim.toISOString().split('T')[0]);

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
                            vendas!inner(data_venda),
                            produtos!inner(categoria_id)
                        `)
                        .eq('produtos.categoria_id', categoria.id)
                        .gte('vendas.data_venda', dataInicio.toISOString().split('T')[0])
                        .lte('vendas.data_venda', dataFim.toISOString().split('T')[0]);

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
            const dataInicioAnterior = new Date(dataInicio.getTime() - duracao - 86400000);
            const dataFimAnterior = new Date(dataInicio.getTime() - 86400000);

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

    // ... (o restante das funções permanece igual - atualizarResumo, atualizarGraficos, etc.)

    // Função para mostrar mensagens (padronizada com outras páginas)
    function mostrarMensagem(mensagem, tipo = 'info') {
        if (!alertContainer) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.innerHTML = `
            <div class="alert-content">
                <i class="fas ${tipo === 'success' ? 'fa-check' : tipo === 'error' ? 'fa-exclamation-triangle' : tipo === 'warning' ? 'fa-exclamation' : 'fa-info'}"></i>
                <span>${mensagem}</span>
            </div>
            <button class="alert-close">&times;</button>
        `;
        
        alertContainer.appendChild(alertDiv);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
        
        // Botão de fechar
        alertDiv.querySelector('.alert-close').addEventListener('click', () => {
            alertDiv.remove();
        });
    }

    // Funções utilitárias (mantidas iguais)
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

    // ... (mantenha todas as outras funções como estão)
});

// Adicionar estilos para alertas (compatível com outras páginas)
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

    .alert-warning {
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffeaa7;
    }

    .alert-close {
        background: none;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        margin-left: 10px;
    }

    .alert-content {
        display: flex;
        align-items: center;
        gap: 10px;
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