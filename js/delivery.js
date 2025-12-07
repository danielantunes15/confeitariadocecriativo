// js/delivery.js - Lógica do Painel de Pedidos Online
// VERSÃO CORRIGIDA - SEM updated_at

document.addEventListener('DOMContentLoaded', async function () {

    // --- VARIÁVEIS GLOBAIS ---
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('delivery-board');
    const acessoNegadoElement = document.getElementById('acesso-negado');
    const recarregarBtn = document.getElementById('recarregar-pedidos');
    
    // Modal de Detalhes do Pedido
    const modalDetalhes = document.getElementById('modal-detalhes');
    const detalhesContent = document.getElementById('detalhes-pedido-content');
    const modalPedidoId = document.getElementById('modal-pedido-id');
    const btnAvancarStatus = document.getElementById('btn-avancar-status');
    const btnCancelarPedido = document.getElementById('btn-cancelar-pedido');
    const btnImprimirCanhoto = document.getElementById('btn-imprimir-canhoto');
    const btnConfirmarPagamento = document.getElementById('btn-confirmar-pagamento'); 
    
    // NOVO BOTÃO WHATSAPP
    const btnConfirmarWhatsApp = document.getElementById('btn-confirmar-whatsapp');

    // Elementos de Configurações
    const btnAbrirConfig = document.getElementById('btn-abrir-config');
    const modalConfig = document.getElementById('modal-configuracoes');
    const formConfig = document.getElementById('form-config-delivery');
    const btnFecharConfig = document.getElementById('fechar-modal-config');
    
    // NOVO: Elementos da Aba Entrega
    const formNovaTaxa = document.getElementById('form-nova-taxa');
    const taxasTabelaBody = document.getElementById('taxas-tabela-body');
    const configEnderecoRetirada = document.getElementById('config-endereco-retirada');
    const salvarEnderecoRetiradaBtn = document.getElementById('salvar-endereco-retirada');
    const taxaIdEdicao = document.getElementById('taxa-id-edicao');
    
    // CAMPOS DE TAXA NOVOS (AGORA SELECT)
    const taxaCidadeSelect = document.getElementById('taxa-cidade-select'); 
    const taxaBairroInput = document.getElementById('taxa-bairro'); 
    const taxaValorInput = document.getElementById('taxa-valor');
    
    // NOVOS ELEMENTOS DE GERENCIAMENTO DE CIDADES
    const formNovaCidade = document.getElementById('form-nova-cidade');
    const cidadeIdEdicao = document.getElementById('cidade-id-edicao');
    const cidadeNomeInput = document.getElementById('cidade-nome-input');
    const cidadesTabelaBody = document.getElementById('cidades-tabela-body');


    // Elementos da Aba Histórico
    const tabButtons = document.querySelectorAll('header.card .tabs .tab-btn'); // <-- CORRIGIDO
    const tabContents = document.querySelectorAll('#tab-kanban, #tab-historico, #tab-promocoes, #tab-entrega'); // <-- CORRIGIDO
    const historicoTabelaBody = document.getElementById('historico-tabela-body');
    const historicoPaginacao = document.getElementById('historico-paginacao');
    
    // Filtros de Data
    const histDataInicioInput = document.getElementById('hist-data-inicio');
    const histDataFimInput = document.getElementById('hist-data-fim');
    const aplicarFiltroHistoricoBtn = document.getElementById('aplicar-filtro-historico');
    
    // ELEMENTOS DA ABA CUPONS
    const btnNovoCupom = document.getElementById('btn-novo-cupom'); 
    const modalNovoCupom = document.getElementById('modal-novo-cupom'); 
    const fecharModalCupom = document.getElementById('fechar-modal-cupom');
    const formNovoCupom = document.getElementById('form-novo-cupom');
    const cuponsTabelaBody = document.getElementById('cupons-tabela-body');

    let todosPedidos = []; // Pedidos ATIVOS (Kanban)
    let todosPedidosHistorico = []; // Pedidos INATIVOS (Histórico)
    let todosCupons = []; // Lista de Cupons
    let todasTaxas = []; // NOVO: Lista de Taxas de Entrega
    let todasCidades = []; // NOVO: Lista de Cidades Atendidas
    let pedidoSelecionado = null;
    
    // Cache de configurações da loja
    // <-- OBJETO MODIFICADO -->
    let configLoja = { tempo_entrega: 60, endereco_retirada: '', chave_pix: '' }; 
    let timerInterval = null;
    
    const audioNotificacao = new Audio("audio/sompedido.mp3");
    audioNotificacao.load(); // Ajuda a pré-carregar o som
    let ultimoTotalDePedidos = 0; 
    
    let paginaAtualHistorico = 1;
    const ITENS_POR_PAGINA = 15; 
    let totalPedidosHistorico = 0;
    
    const STATUS_MAP = {
        'novo': { title: 'Novo', icon: 'fas fa-box-open', next: 'preparando', nextText: 'Iniciar Preparo', color: 'var(--primary-color)' },
        'preparando': { title: 'Preparando', icon: 'fas fa-fire-alt', next: 'pronto', nextText: 'Marcar como Pronto', color: 'var(--warning-color)' },
        'pronto': { title: 'Pronto para Envio', icon: 'fas fa-truck-loading', next: 'entregue', nextText: 'Marcar como Entregue', color: 'var(--info-color)' },
        'entregue': { title: 'Entregue', icon: 'fas fa-check-circle', next: null, nextText: 'Finalizado', color: 'var(--success-color)' },
        'cancelado': { title: 'Cancelado', icon: 'fas fa-times-circle', next: null, nextText: 'Cancelado', color: 'var(--error-color)' }
    };
    
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
    
    const formatarFormaPagamento = (forma) => {
        const formas = {
            'dinheiro': 'Dinheiro',
            'cartao_(maquininha)': 'Cartão',
            'pix': 'PIX',
            'cartao_debito': 'Cartão Débito',
            'cartao_credito': 'Cartão Crédito',
            'crediario': 'Crediário'
        };
        return formas[forma] || forma;
    };
    
    const toggleDisplay = (element, show) => { 
        if (!element) return;
        if (element.id === 'delivery-board') {
            element.style.display = show ? 'flex' : 'none';
        } else {
            element.style.display = show ? 'block' : 'none'; 
        }
    };

    /**
     * Mover a função imprimirCanhotoDelivery para o escopo global do script
     * para garantir que configurarEventListeners possa referenciá-la.
     */
    function imprimirCanhotoDelivery() {
        if (!pedidoSelecionado) {
            mostrarMensagem('Nenhum pedido selecionado.', 'error');
            return;
        }

        const pedido = pedidoSelecionado;
        const horaPedido = new Date(pedido.created_at).toLocaleString('pt-BR');
        const itens = parseItens(pedido.observacoes, false); 
        const obsAdicionais = parseObsAdicionais(pedido.observacoes);
        const troco = parseTroco(pedido.observacoes);
        const pagamento = formatarFormaPagamento(pedido.forma_pagamento);

        const thermalCss = `
            <style>
                body {
                    width: 58mm;
                    font-family: 'Arial', sans-serif;
                    font-size: 10px;
                    margin: 0;
                    padding: 5px;
                }
                h4 {
                    text-align: center;
                    margin: 2px 0;
                    font-size: 12px;
                }
                hr {
                    border: 0;
                    border-top: 1px dashed #000;
                    margin: 5px 0;
                }
                p {
                    margin: 2px 0;
                }
                .detalhes {
                    font-size: 9px;
                    white-space: pre-wrap; 
                    margin-bottom: 5px;
                }
                .total {
                    font-weight: bold;
                    font-size: 12px;
                    margin-top: 5px;
                }
                @page {
                    margin: 0;
                }
            </style>
        `;

        const canhotoContent = `
            <div id="canhoto-impressao">
                <h4>Confeitaria Doces Criativos</h4>
                <p><strong>Pedido:</strong> #${pedido.id}</p>
                <p><strong>Data/Hora:</strong> ${horaPedido}</p>
                <hr>
                <p><strong>Cliente:</strong> ${pedido.nome_cliente}</p>
                <p><strong>Telefone:</strong> ${pedido.telefone_cliente}</p>
                <p><strong>Endereço:</strong> ${pedido.endereco_entrega}</p>
                <hr>
                <p><strong>Itens do Pedido:</strong></p>
                <div class="detalhes">${itens}</div>
                <hr>
                ${obsAdicionais ? `<p><strong>Obs:</strong> ${obsAdicionais}</p><hr>` : ''}
                <p><strong>Pagamento:</strong> ${pagamento}</p>
                <p><strong>Troco:</strong> ${troco}</p>
                <p class="total"><strong>TOTAL: ${formatarMoeda(pedido.total)}</strong></p>
                <hr>
                <p style="text-align: center; font-size: 9px;">Obrigado pela preferência!</p>
            </div>`;

        const printWindow = window.open('', 'PrintCanhoto', 'height=600,width=400');
        
        printWindow.document.write('<html><head><title>Canhoto do Pedido</title>' + thermalCss + '</head><body>');
        printWindow.document.write(canhotoContent);
        
        const fixScript = `
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 1000); 
                };
            </script>
        `;
        printWindow.document.write(fixScript);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
    }
    
    // --- FUNÇÕES CRUD CUPONS (MOVIDAS PARA CIMA) ---
    async function criarNovoCupom(e) {
        e.preventDefault();
        
        const codigo = document.getElementById('cupom-codigo').value.trim().toUpperCase();
        const tipo = document.getElementById('cupom-tipo').value;
        const valor = parseFloat(document.getElementById('cupom-valor').value);
        const validade = document.getElementById('cupom-validade').value || null;
        const usosMaximos = parseInt(document.getElementById('cupom-usos-maximos').value) || 0;
        const ativo = document.getElementById('cupom-ativo').checked;

        if (!codigo || isNaN(valor) || valor <= 0) {
            mostrarMensagem('Preencha o Código e o Valor corretamente.', 'error');
            return;
        }

        try {
            const { error } = await supabase.from('cupons')
                .insert({
                    codigo: codigo,
                    tipo: tipo,
                    valor: valor,
                    data_validade: validade,
                    usos_maximos: usosMaximos,
                    ativo: ativo,
                    usos_usados: 0 
                });

            if (error) throw error;

            mostrarMensagem(`Cupom ${codigo} cadastrado com sucesso!`, 'success');
            formNovoCupom.reset();
            modalNovoCupom.style.display = 'none'; 
            await carregarCupons();

        } catch (error) {
            console.error('❌ Erro ao criar cupom:', error);
            let msg = 'Erro ao cadastrar cupom.';
            if (error.code === '23505') {
                msg = `Erro: O código **${codigo}** já existe.`;
            } else if (error.message) {
                msg += ' Detalhe: ' + error.message;
            }
            mostrarMensagem(msg, 'error');
        }
    }

    window.editarCupom = function(cupomId) {
        mostrarMensagem(`Funcionalidade de Edição do cupom #${cupomId} em desenvolvimento.`, 'info');
    }

    window.excluirCupom = async function(cupomId, codigo) {
        if (!confirm(`Tem certeza que deseja EXCLUIR o cupom "${codigo}"?\nEsta ação é irreversível!`)) return;

        try {
            const { error } = await supabase.from('cupons')
                .delete()
                .eq('id', cupomId);
            
            if (error) throw error;
            
            mostrarMensagem(`Cupom ${codigo} excluído com sucesso!`, 'success');
            await carregarCupons();

        } catch (error) {
            console.error('❌ Erro ao excluir cupom:', error);
            mostrarMensagem('Erro ao excluir cupom: ' + error.message, 'error');
        }
    }
    // --- FIM: FUNÇÕES CRUD CUPONS ---

    
    // --- FUNÇÕES DE EXIBIÇÃO DE DADOS (MOVIDAS PARA CIMA) ---

    function exibirCidadesNaTabela(cidades) {
        if (!cidadesTabelaBody) return;
        cidadesTabelaBody.innerHTML = '';
        if (cidades.length === 0) {
            cidadesTabelaBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #666;">Nenhuma cidade cadastrada.</td></tr>`;
            return;
        }
        
        cidades.forEach(cidade => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${cidade.nome}</strong></td>
                <td>
                    <button class="btn-edit btn-sm" onclick="editarCidade('${cidade.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger btn-sm" onclick="excluirCidade('${cidade.id}', '${cidade.nome}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            cidadesTabelaBody.appendChild(tr);
        });
    }

    function exibirTaxasEntrega(taxas) {
        if (!taxasTabelaBody) return;
        taxasTabelaBody.innerHTML = '';
        
        if (taxas.length === 0) {
            taxasTabelaBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #666;">Nenhuma taxa cadastrada.</td></tr>`;
            return;
        }

        taxas.forEach(taxa => {
            const tr = document.createElement('tr');
            const nomeCidade = taxa.cidade?.nome || 'Cidade Removida';
            tr.innerHTML = `
                <td><strong>${nomeCidade}</strong></td>
                <td><strong>${taxa.bairro}</strong></td>
                <td>${formatarMoeda(taxa.valor)}</td>
                <td>
                    <button class="btn-edit btn-sm" onclick="editarTaxaEntrega('${taxa.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger btn-sm" onclick="excluirTaxaEntrega('${taxa.id}', '${taxa.bairro} em ${nomeCidade}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            taxasTabelaBody.appendChild(tr);
        });
    }

    function exibirCupons(cupons) {
        if (!cuponsTabelaBody) return;
        cuponsTabelaBody.innerHTML = '';
        
        if (cupons.length === 0) {
            cuponsTabelaBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #666;">Nenhum cupom cadastrado.</td></tr>`;
            return;
        }

        const hoje = new Date().toISOString().split('T')[0];

        cupons.forEach(cupom => {
            const isExpirado = cupom.data_validade && cupom.data_validade < hoje;
            const isEsgotado = cupom.usos_maximos > 0 && cupom.usos_usados >= cupom.usos_maximos;
            const isAtivo = cupom.ativo && !isExpirado && !isEsgotado;

            const statusClass = isAtivo ? 'success' : isExpirado ? 'danger' : isEsgotado ? 'warning' : 'info';
            const statusText = isAtivo ? 'Ativo' : isExpirado ? 'Expirado' : isEsgotado ? 'Esgotado' : 'Inativo';
            const valorDisplay = cupom.tipo === 'percentual' ? `${cupom.valor}%` : formatarMoeda(cupom.valor);
            const validadeDisplay = cupom.data_validade ? new Date(cupom.data_validade + 'T00:00:00').toLocaleDateString('pt-BR') : 'Ilimitado';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${cupom.codigo}</strong></td>
                <td>${valorDisplay}</td>
                <td>${validadeDisplay}</td>
                <td>${cupom.usos_usados} (${cupom.usos_maximos === 0 ? '∞' : cupom.usos_maximos})</td>
                <td>
                    <span class="status-badge status-${statusClass}">${statusText}</span>
                </td>
                <td>
                    <button class="btn-edit btn-sm" onclick="editarCupom('${cupom.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger btn-sm" onclick="excluirCupom('${cupom.id}', '${cupom.codigo}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            cuponsTabelaBody.appendChild(tr);
        });
    }

    function renderizarTabelaHistorico(pedidos) {
        historicoTabelaBody.innerHTML = '';
        if (pedidos.length === 0) {
            historicoTabelaBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">Nenhum pedido encontrado no histórico${(histDataInicioInput.value || histDataFimInput.value) ? ' para este filtro' : ''}.</td></tr>`;
            return;
        }

        pedidos.forEach(pedido => {
            const tr = document.createElement('tr');
            const data = new Date(pedido.created_at).toLocaleDateString('pt-BR');
            const statusClasse = `status-${pedido.status}`;
            
            tr.innerHTML = `
                <td><strong>#${pedido.id}</strong></td>
                <td>${data}</td>
                <td>${pedido.nome_cliente}</td>
                <td>${formatarMoeda(pedido.total)}</td>
                <td>${formatarFormaPagamento(pedido.forma_pagamento)}</td>
                <td>
                    <span class="status-badge ${statusClasse}">${STATUS_MAP[pedido.status].title}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-ver-detalhes-hist" onclick="abrirModalDetalhes(${pedido.id})">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                </td>
            `;
            historicoTabelaBody.appendChild(tr);
        });
    }
    
    // --- FUNÇÕES DE CARREGAMENTO DE DADOS (AGORA NO ESCOPO CORRETO) ---
    
    async function carregarPedidosOnline() {
        if (!contentElement) return;
        // ... (código para carregar pedidos online)
        const board = document.getElementById('delivery-board');
        board.querySelectorAll('.card-list').forEach(list => list.innerHTML = '');
        
        try {
            const { data, error } = await supabase.from('pedidos_online')
                .select('*')
                .gte('created_at', new Date().toISOString().split('T')[0] + 'T00:00:00Z')
                .neq('status', 'entregue') 
                .neq('status', 'cancelado') 
                .order('created_at', { ascending: true });

            if (error) throw error;
            
            todosPedidos = data || [];
            ultimoTotalDePedidos = todosPedidos.length;
            exibirPedidosNoBoard(todosPedidos);
            
        } catch (error) {
            console.error('❌ Erro ao carregar pedidos online:', error);
            mostrarMensagem('Erro ao carregar o painel de pedidos. Verifique se a tabela `pedidos_online` existe.', 'error');
        }
    }

    async function carregarHistoricoPedidos(pagina) {
        if (!historicoTabelaBody) return;

        paginaAtualHistorico = pagina;
        const offset = (pagina - 1) * ITENS_POR_PAGINA;
        
        const dataInicio = histDataInicioInput.value;
        const dataFim = histDataFimInput.value;

        historicoTabelaBody.innerHTML = `<tr><td colspan="7" style="text-align: center;"><div class="spinner"></div></td></tr>`;

        try {
            let query = supabase
                .from('pedidos_online')
                .select('*', { count: 'exact' }); 
            
            query = query.in('status', ['entregue', 'cancelado']);

            if (dataInicio) query = query.gte('created_at', dataInicio + 'T00:00:00Z');
            if (dataFim) query = query.lte('created_at', dataFim + 'T23:59:59Z');

            // ================================================================
            // === INÍCIO DA CORREÇÃO (ReferenceError) ===
            // ================================================================
            const { data: pedidos, error: pedidosError, count } = await query
                .order('created_at', { ascending: false }) 
                .range(offset, offset + ITENS_POR_PAGINA - 1); // <-- CORRIGIDO DE ITENS_POR_AGRUPAMENTO
            // ================================================================
            // === FIM DA CORREÇÃO ===
            // ================================================================

            if (pedidosError) throw pedidosError;

            todosPedidosHistorico = pedidos || [];
            totalPedidosHistorico = count || 0;

            renderizarTabelaHistorico(todosPedidosHistorico);
            renderizarPaginacao(); // Agora esta função será chamada

        } catch (error) {
            console.error('❌ Erro ao carregar histórico:', error);
            historicoTabelaBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--error-color);">Erro ao carregar histórico.</td></tr>`;
        }
    }
    
    async function carregarCupons() {
        if (!cuponsTabelaBody) return;
        cuponsTabelaBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #666;">Carregando cupons...</td></tr>`;

        try {
            const { data, error } = await supabase.from('cupons')
                .select('*')
                .order('codigo', { ascending: true });

            if (error) throw error;
            
            todosCupons = data || [];
            exibirCupons(todosCupons);

        } catch (error) {
            console.error('❌ Erro ao carregar cupons:', error);
            mostrarMensagem('Erro ao carregar cupons. Verifique se a tabela `cupons` existe.', 'error');
            cuponsTabelaBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--error-color);">Falha ao carregar cupons.</td></tr>`;
        }
    }
    
    // --- FIM: FUNÇÕES DE CARREGAMENTO DE DADOS ---


    // --- AUTENTICAÇÃO E INICIALIZAÇÃO ---
    if (!window.sistemaAuth?.verificarAutenticacao()) {
        window.location.href = 'login.html';
        return;
    }
    const usuario = window.sistemaAuth.usuarioLogado;
    const isAdminOrManager = ['administrador', 'admin', 'gerente', 'supervisor'].includes(usuario.tipo?.toLowerCase());
    

    async function inicializar() {
        toggleDisplay(loadingElement, true);

        configurarEventListeners();
        
        await carregarConfiguracoesDaLoja(); 
        
        // CORREÇÃO: As funções de carregamento agora estão definidas antes
        await Promise.all([
            carregarPedidosOnline(), 
            carregarHistoricoPedidos(paginaAtualHistorico),
            carregarCupons(),
            carregarCidades(), 
            carregarTaxasEntrega() 
        ]);
        
        // Intervalo aumentado para 15s (notificação global cuida dos 10s)
        setInterval(verificarNovosPedidos, 15000); 
        console.log('🔄 Polling de pedidos (local) iniciado. Verificando a cada 15 segundos.');
        
        iniciarAtualizadorDeTimers();

        toggleDisplay(loadingElement, false);
        toggleDisplay(document.getElementById('tab-kanban'), true);
        toggleDisplay(contentElement, true);
    }
    
    function configurarEventListeners() {
        if (recarregarBtn) {
            recarregarBtn.addEventListener('click', () => {
                verificarNovosPedidos(); 
                carregarHistoricoPedidos(paginaAtualHistorico);
                carregarCupons();
                carregarCidades(); // Recarrega cidades também
                carregarTaxasEntrega(); 
            });
        }
        if (btnAvancarStatus) {
            btnAvancarStatus.addEventListener('click', avancarStatusPedido);
        }
        if (btnCancelarPedido) {
            btnCancelarPedido.addEventListener('click', () => atualizarStatusPedido('cancelado', 'Tem certeza que deseja CANCELAR este pedido?'));
        }
        
        // A função imprimirCanhotoDelivery está definida acima
        if (btnImprimirCanhoto) {
            btnImprimirCanhoto.addEventListener('click', imprimirCanhotoDelivery);
        }
        
        if (btnConfirmarPagamento) {
            btnConfirmarPagamento.addEventListener('click', confirmarPagamentoManual);
        }
        // NOVO LISTENER
        if (btnConfirmarWhatsApp) {
            btnConfirmarWhatsApp.addEventListener('click', enviarConfirmacaoWhatsApp);
        }

        if (btnAbrirConfig) {
            if (!isAdminOrManager) {
                btnAbrirConfig.style.display = 'none';
            } else {
                btnAbrirConfig.addEventListener('click', abrirModalConfiguracoes);
            }
        }
        if (btnFecharConfig) {
            btnFecharConfig.addEventListener('click', fecharModalConfiguracoes);
        }
        if (formConfig) {
            formConfig.addEventListener('submit', salvarConfiguracoes);
        }

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
        
        if (aplicarFiltroHistoricoBtn) {
            aplicarFiltroHistoricoBtn.addEventListener('click', () => carregarHistoricoPedidos(1));
        }
        
        if (btnNovoCupom) {
             btnNovoCupom.addEventListener('click', () => {
                 formNovoCupom.reset(); 
                 modalNovoCupom.style.display = 'flex';
             });
        }
        
        if (fecharModalCupom) {
             fecharModalCupom.addEventListener('click', () => {
                 modalNovoCupom.style.display = 'none';
             });
             window.addEventListener('click', (e) => {
                 if (e.target === modalNovoCupom) {
                     modalNovoCupom.style.display = 'none';
                 }
             });
        }
        
        // A função criarNovoCupom está definida no escopo principal
        if (formNovoCupom) {
            formNovoCupom.addEventListener('submit', criarNovoCupom);
        }
        
        // NOVO: Listeners para a Aba Entrega
        if (formNovaTaxa) {
             formNovaTaxa.addEventListener('submit', salvarTaxaEntrega);
        }
        if (salvarEnderecoRetiradaBtn) {
             salvarEnderecoRetiradaBtn.addEventListener('click', salvarEnderecoRetirada);
        }
        
        // NOVO: Listeners para Gerenciamento de Cidades
        if (formNovaCidade) {
            formNovaCidade.addEventListener('submit', salvarCidade);
        }
        
        // Adiciona o switch de sub-tabs dentro da aba Entrega
        document.querySelectorAll('#tab-entrega .tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                 // Lógica para alternar as sub-abas de Gerenciamento de Entrega
                 document.querySelectorAll('#tab-entrega .tabs .tab-btn').forEach(b => b.classList.remove('active'));
                 document.querySelectorAll('#tab-entrega .tab-content').forEach(c => c.style.display = 'none');
                 
                 e.currentTarget.classList.add('active');
                 const targetId = e.currentTarget.getAttribute('data-tab');
                 document.getElementById(targetId).style.display = 'block';
                 
                 // Recarrega lista ao entrar nas sub-abas
                 if (targetId === 'tab-gerenciar-cidades') carregarCidades();
                 if (targetId === 'tab-gerenciar-bairros') carregarTaxasEntrega();
            });
        });
    }

    function switchTab(tabId) {
        tabContents.forEach(content => {
            if (content.id === 'tab-kanban') {
                toggleDisplay(content, content.id === tabId);
                toggleDisplay(contentElement, content.id === tabId);
            } else {
                toggleDisplay(content, content.id === tabId);
            }
        });
        tabButtons.forEach(button => {
            button.classList.toggle('active', button.getAttribute('data-tab') === tabId);
        });

        if (tabId === 'tab-historico') {
            if (!histDataInicioInput.value) {
                const hoje = new Date().toISOString().split('T')[0];
                const seteDiasAtras = new Date();
                seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
                
                histDataFimInput.value = hoje;
                histDataInicioInput.value = seteDiasAtras.toISOString().split('T')[0];
            }
            carregarHistoricoPedidos(1);
        } else if (tabId === 'tab-promocoes') {
             carregarCupons();
        } else if (tabId === 'tab-entrega') { // NOVO
             // Ao entrar na aba Entrega, carrega as cidades e as taxas
             carregarCidades(); 
             carregarTaxasEntrega();
             if (configEnderecoRetirada) configEnderecoRetirada.value = configLoja.endereco_retirada || '';
             // Força a sub-aba de Bairros a ser a ativa
             document.getElementById('tab-gerenciar-bairros').style.display = 'block';
             document.querySelector('[data-tab="tab-gerenciar-bairros"]').classList.add('active');
        }
    }
    
    // --- LÓGICA DE PEDIDOS ONLINE (CRUD) ---

    
    function exibirPedidosNoBoard(pedidos) {
        const colunas = { novo: [], preparando: [], pronto: [], entregue: [], cancelado: [] };
        
        const pedidosAtivos = pedidos.filter(p => p.status !== 'entregue' && p.status !== 'cancelado');
        
        pedidosAtivos.forEach(p => {
            const status = p.status || 'novo';
            if (colunas[status]) {
                colunas[status].push(p);
            }
        });
        
        ['novo', 'preparando', 'pronto'].forEach(status => {
            const colElement = document.getElementById(`col-${status}`);
            if (!colElement) return;
            const listElement = colElement.querySelector('.card-list');
            
            colElement.querySelector('h3').innerHTML = `<i class="${STATUS_MAP[status].icon}"></i> ${STATUS_MAP[status].title} (${colunas[status].length})`;
            listElement.innerHTML = '';
            
            if (colunas[status].length === 0) {
                 listElement.innerHTML = `<p style="text-align: center; color: white; font-style: italic; margin-top: 1rem; opacity: 0.8;">Nenhum pedido</p>`;
            } else {
                colunas[status].forEach(pedido => {
                    const card = criarCardPedido(pedido);
                    listElement.appendChild(card);
                });
            }
        });

        atualizarTimers();
    }
    
    function parseTroco(observacoes) {
        if (!observacoes) return 'Não precisa';
        const trocoMatch = observacoes.match(/TROCO NECESSÁRIO: Sim, para (R\$ \d+[,.]\d{2})/);
        if (trocoMatch && trocoMatch[1]) {
            return `Troco p/ ${trocoMatch[1]}`;
        }
        if (observacoes.includes('TROCO NECESSÁRIO: Não')) {
            return 'Não precisa';
        }
        return 'Verificar';
    }

    function parseItens(observacoes, formatAsHtml = false) {
        if (!observacoes) return 'Nenhum item listado.';
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
        if (itens.length === 0) return 'Detalhes no modal.';
        return formatAsHtml ? itens.join('<br>') : itens.join('\n');
    }

    function parseObsAdicionais(observacoes) {
        if (!observacoes) return '';
        const obsSeparada = observacoes.split('OBSERVAÇÕES ADICIONAIS:');
        if (obsSeparada.length > 1) {
            return obsSeparada[1].trim();
        }
        return '';
    }

    function criarCardPedido(pedido) {
        const card = document.createElement('div');
        const status = pedido.status || 'novo';
        card.className = `pedido-card status-${status}`;
        card.setAttribute('data-id', pedido.id);
        
        const hora = new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        const trocoInfo = parseTroco(pedido.observacoes);
        const pagamentoInfo = formatarFormaPagamento(pedido.forma_pagamento);
        const totalInfo = formatarMoeda(pedido.total);
        
        const isPago = pedido.observacoes.includes('Pagamento CONFIRMADO');
        const pagamentoOkHtml = isPago 
            ? `<span class="badge-pagamento-ok" style="background: var(--success-color); color: white; font-size: 0.75rem; padding: 3px 8px; border-radius: 10px; font-weight: bold; margin-left: 5px; display: inline-block;">
                 <i class="fas fa-check-double"></i> Pago
               </span>`
            : '';

        card.innerHTML = `
            <div class="card-novo-header">
                <strong>Pedido #${pedido.id}</strong>
                <div class="card-novo-hora-grupo">
                    <span class="card-novo-hora"><i class="fas fa-clock"></i> ${hora}</span>
                    <span class="card-novo-timer no-prazo" id="timer-pedido-${pedido.id}">
                        (Carregando...)
                    </span>
                </div>
            </div>
            <div class="card-novo-body">
                <div class="card-novo-cliente">
                    <span class="cliente-nome">
                        <i class="fas fa-user"></i>
                        ${pedido.nome_cliente}
                    </span>
                    <span class="cliente-fone">
                        <i class="fas fa-phone"></i>
                        ${pedido.telefone_cliente}
                    </span>
                </div>
                <div class="card-novo-info">
                    <div class="info-pagamento">
                        <span>Total</span>
                        <strong>${totalInfo}</strong>
                    </div>
                    <div class="info-pagamento">
                        <span>${pagamentoInfo} ${pagamentoOkHtml}</span> <strong class="troco-info">${trocoInfo}</strong>
                    </div>
                </div>
                <div class="card-novo-delivery">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${pedido.endereco_entrega}</span>
                </div>
            </div>
            <div class="card-novo-action">
                <button class="btn-ver-detalhes">
                    Ver Detalhes &nbsp; <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;
        
        card.addEventListener('click', () => abrirModalDetalhes(pedido.id));
        return card;
    }
    
    window.abrirModalDetalhes = function(pedidoId) {
        pedidoSelecionado = todosPedidos.find(p => p.id === pedidoId) || todosPedidosHistorico.find(p => p.id === pedidoId);

        if (!pedidoSelecionado) return;
        
        modalPedidoId.textContent = `#${pedidoId}`;
        
        const statusInfo = STATUS_MAP[pedidoSelecionado.status];
        
        const isFinal = pedidoSelecionado.status === 'cancelado' || pedidoSelecionado.status === 'entregue';
        const isConfirmed = pedidoSelecionado.observacoes.includes('Pagamento CONFIRMADO');

        btnAvancarStatus.style.display = (isFinal || !statusInfo.next) ? 'none' : 'inline-flex';
        btnAvancarStatus.textContent = statusInfo.nextText || '';
        btnAvancarStatus.setAttribute('data-next-status', statusInfo.next);

        btnCancelarPedido.style.display = isFinal ? 'none' : 'inline-flex';
        
        btnConfirmarPagamento.style.display = (isFinal || isConfirmed) ? 'none' : 'inline-flex';

        // NOVO: Mostrar/Esconder botão do WhatsApp
        if (btnConfirmarWhatsApp) {
            btnConfirmarWhatsApp.style.display = isFinal ? 'none' : 'inline-flex';
        }
        
        btnAvancarStatus.style.background = STATUS_MAP[statusInfo.next]?.color || 'var(--primary-color)';
        
        const todosItens = parseItens(pedidoSelecionado.observacoes, true); 
        const obsAdicionais = parseObsAdicionais(pedidoSelecionado.observacoes);

        const confirmacaoHtml = isConfirmed 
            ? `<div style="background: #d4edda; color: #155724; padding: 10px; border-radius: 8px; font-weight: bold; margin-bottom: 1rem; text-align: center;">
                 <i class="fas fa-check-double"></i> Pagamento Confirmado Manualmente
               </div>`
            : '';

        detalhesContent.innerHTML = `
            ${confirmacaoHtml} <p><strong>Status Atual:</strong> <span style="font-weight: bold; color: ${statusInfo.color}">${statusInfo.title}</span></p>
            <p><strong>Cliente:</strong> ${pedidoSelecionado.nome_cliente}</p>
            <p><strong>Telefone:</strong> <a href="https://wa.me/55${pedidoSelecionado.telefone_cliente.replace(/\D/g,'')}" target="_blank">${pedidoSelecionado.telefone_cliente}</a></p>
            <p><strong>Endereço:</strong> ${pedidoSelecionado.endereco_entrega}</p>
            <p><strong>Pagamento:</strong> ${formatarFormaPagamento(pedidoSelecionado.forma_pagamento)}</p>
            <p style="font-size: 1.5rem; font-weight: bold; color: var(--primary-dark); margin-top: 1rem;">Total: ${formatarMoeda(pedidoSelecionado.total)}</p>
            
            <h4 style="margin-top: 1.5rem; border-top: 1px dashed #ccc; padding-top: 0.5rem;">Itens do Pedido:</h4>
            <div style="font-size: 0.9rem; font-family: inherit; background: #f9f9f9; padding: 10px; border-radius: 5px; max-height: 150px; overflow-y: auto;">${todosItens}</div>

            ${obsAdicionais ? `
                <h4 style="margin-top: 1.5rem;">Observações Adicionais:</h4>
                <p style="font-size: 0.9rem; font-style: italic; background: #fff8e1; padding: 10px; border-radius: 5px;">${obsAdicionais}</p>
            ` : ''}
        `;
        
        modalDetalhes.style.display = 'flex';
    }
    
    async function avancarStatusPedido() {
        const nextStatus = btnAvancarStatus.getAttribute('data-next-status');
        if (!nextStatus) return;
        await atualizarStatusPedido(nextStatus, `Confirma a mudança de status para "${STATUS_MAP[nextStatus].title}"?`);
    }

    async function confirmarPagamentoManual() {
        if (!pedidoSelecionado) return;
        if (!confirm(`Confirma que o pagamento do pedido #${pedidoSelecionado.id} foi recebido?\n(Isso vale para Dinheiro, PIX ou Cartão)`)) return;

        try {
            const observacoesAtualizadas = `\n--- REGISTRO MANUAL ---\nPagamento CONFIRMADO em: ${new Date().toLocaleString('pt-BR')}\n-----------------------\n` + pedidoSelecionado.observacoes;
            
            // 1. Atualiza o DB
            const { error: obsError } = await supabase.from('pedidos_online')
                .update({ observacoes: observacoesAtualizadas })
                .eq('id', pedidoSelecionado.id);
            
            if (obsError) throw obsError;
            
            mostrarMensagem(`✅ Pagamento do pedido #${pedidoSelecionado.id} confirmado e registrado!`, 'success');
            
            // 2. Atualiza o objeto local (para re-renderizar o modal e o card)
            pedidoSelecionado.observacoes = observacoesAtualizadas;
            const pedidoNoKanban = todosPedidos.find(p => p.id === pedidoSelecionado.id);
            if(pedidoNoKanban) {
                pedidoNoKanban.observacoes = observacoesAtualizadas;
            }

            // 3. Se o status for 'novo', chama a outra função (que já faz a atualização local)
            if (pedidoSelecionado.status === 'novo') {
                 // Esta função já redesenha o board e fecha o modal
                 await atualizarStatusPedido('preparando', `Pagamento Confirmado. Avançando para Preparando...`);
            } else {
            // 4. Se não for 'novo', apenas fecha o modal e redesenha o kanban local
                 modalDetalhes.style.display = 'none';
                 exibirPedidosNoBoard(todosPedidos); // Redesenha o kanban com o badge "Pago"
            }

        } catch (error) {
            mostrarMensagem('Erro ao confirmar pagamento: ' + error.message, 'error');
        }
    }

    async function atualizarStatusPedido(novoStatus, mensagemConfirmacao) {
        if (!pedidoSelecionado || !confirm(mensagemConfirmacao)) return;
        
        console.log(`🔄 Tentando atualizar pedido #${pedidoSelecionado.id} para status: ${novoStatus}`);
        
        try {
            // 1. Atualiza apenas o status no banco (sem updated_at)
            const { data, error } = await supabase.from('pedidos_online')
                .update({ 
                    status: novoStatus
                })
                .eq('id', pedidoSelecionado.id)
                .select();
            
            if (error) {
                console.error('❌ Erro no Supabase:', error);
                throw error;
            }

            console.log('✅ Banco atualizado com sucesso:', data);
            mostrarMensagem(`Status do pedido #${pedidoSelecionado.id} atualizado para "${STATUS_MAP[novoStatus].title}"!`, 'success');
            
            // 2. Fecha o modal
            modalDetalhes.style.display = 'none';
            
            // 3. Atualiza o array local 'todosPedidos' (ATUALIZAÇÃO OTIMISTA)
            const pedidoAtualizado = todosPedidos.find(p => p.id === pedidoSelecionado.id);
            if (pedidoAtualizado) {
                pedidoAtualizado.status = novoStatus;
                console.log(`📝 Estado local atualizado: ${pedidoAtualizado.id} -> ${pedidoAtualizado.status}`);
            }
            
            // 4. Se o status for final, remove o pedido da lista de ativos
            if (novoStatus === 'entregue' || novoStatus === 'cancelado') {
                todosPedidos = todosPedidos.filter(p => p.id !== pedidoSelecionado.id);
                console.log(`🗑️ Pedido #${pedidoSelecionado.id} removido da lista ativa`);
                // Recarrega o histórico para incluir este novo item
                carregarHistoricoPedidos(1);
            }
            
            // 5. Atualiza a contagem do polling para evitar notificação falsa
            ultimoTotalDePedidos = todosPedidos.length;

            // 6. Re-desenha o board com os dados locais atualizados
            exibirPedidosNoBoard(todosPedidos);
            console.log(`🎨 Board redesenhado com status atualizado`);

        } catch (error) {
            console.error('❌ Erro completo ao atualizar status:', error);
            mostrarMensagem('Erro ao atualizar status: ' + error.message, 'error');
        }
    }
    
    // ================================================================
    // === NOVAS FUNÇÕES (WHATSAPP E HELPER DE STATUS) ===
    // ================================================================

    /**
     * Helper para atualizar o status sem prompt de confirmação.
     * Usado pela função de WhatsApp.
     */
    async function _atualizarStatusSemPrompt(novoStatus) {
        if (!pedidoSelecionado) return;
        
        console.log(`(Auto) Atualizando pedido #${pedidoSelecionado.id} para ${novoStatus}`);
        try {
            const { data, error } = await supabase.from('pedidos_online')
                .update({ status: novoStatus })
                .eq('id', pedidoSelecionado.id)
                .select();
            
            if (error) throw error;

            modalDetalhes.style.display = 'none';
            
            const pedidoAtualizado = todosPedidos.find(p => p.id === pedidoSelecionado.id);
            if (pedidoAtualizado) {
                pedidoAtualizado.status = novoStatus;
            }
            
            exibirPedidosNoBoard(todosPedidos);
            
        } catch (error) {
            console.error('Erro ao auto-avançar status:', error);
            mostrarMensagem('Erro ao auto-avançar status: ' + error.message, 'error');
        }
    }

    /**
     * Envia a confirmação do pedido para o WhatsApp do cliente.
     * (VERSÃO ATUALIZADA COM DETALHES DO PEDIDO E INFO DE PIX)
     */
    function enviarConfirmacaoWhatsApp() {
        if (!pedidoSelecionado) {
            mostrarMensagem('Nenhum pedido selecionado.', 'error');
            return;
        }

        const telefoneRaw = pedidoSelecionado.telefone_cliente;
        if (!telefoneRaw) {
            mostrarMensagem('Cliente não possui telefone cadastrado.', 'error');
            return;
        }

        // Formata o número: remove não-dígitos e garante o 55
        let telefoneFormatado = telefoneRaw.replace(/\D/g, '');
        // Remove o 55 se já tiver (ex: 5533...) para evitar 555533...
        if (telefoneFormatado.length > 11 && telefoneFormatado.startsWith('55')) {
             telefoneFormatado = telefoneFormatado.substring(2);
        }
        // Adiciona o 55 (código do país)
        telefoneFormatado = '55' + telefoneFormatado;

        const nomeCliente = pedidoSelecionado.nome_cliente.split(' ')[0];
        const pedidoId = pedidoSelecionado.id;
        const total = formatarMoeda(pedidoSelecionado.total);
        const tempoEntrega = configLoja.tempo_entrega || 60;

        // --- INÍCIO DAS MODIFICAÇÕES ---

        // 1. Extrair a lista de itens (usando a função 'parseItens' que já existe no delivery.js)
        // Passar 'false' para não formatar como HTML (usar \n para quebra de linha)
        const itensDoPedido = parseItens(pedidoSelecionado.observacoes, false); 
        
        // 2. Busca a chave PIX das configurações da loja
        // O valor é carregado pela função carregarConfiguracoesDaLoja()
        // <-- LINHA MODIFICADA -->
        const SUA_CHAVE_PIX = configLoja.chave_pix || "[NENHUMA CHAVE PIX CADASTRADA]"; 
        
        // 3. Monta a mensagem do PIX
        // <-- LINHA MODIFICADA -->
        const MENSAGEM_PIX = `Seu pedido foi *confirmado*! 👩‍🍳\n\nCaso prefira pagar via *PIX* (Chave: ${SUA_CHAVE_PIX}), por favor, envie o *comprovante de pagamento* aqui mesmo no WhatsApp para confirmarmos o pagamento.`;

        // 3. Montar a nova mensagem
        let mensagem = `Olá, ${nomeCliente}! 👋\n\n`;
        mensagem += `Somos da *Confeitaria Doce Criativo* e recebemos seu pedido *#${pedidoId}*.\n\n`;
        
        // Adiciona os itens
        mensagem += `*Resumo do Pedido:*\n`;
        mensagem += `${itensDoPedido}\n`; // <-- Isso é novo
        mensagem += `*Total:* ${total}\n\n`;
        
        // Adiciona a mensagem do PIX (se o pedido for 'novo')
        if (pedidoSelecionado.status === 'novo') {
            mensagem += `${MENSAGEM_PIX}\n\n`; // <-- Isso é novo
        } else {
             mensagem += `Seu pedido já está *em preparação*!\n\n`;
        }

        mensagem += `O tempo médio de entrega é de ${tempoEntrega} minutos.\n`;
        mensagem += `Agradecemos pela preferência! 😊`;
        
        // --- FIM DAS MODIFICAÇÕES ---

        const urlWhatsApp = `https://wa.me/${telefoneFormatado}?text=${encodeURIComponent(mensagem)}`;
        window.open(urlWhatsApp, '_blank');

        mostrarMensagem('WhatsApp pronto para envio!', 'success');
        
        // BÔNUS: Se o pedido era "Novo", avança automaticamente para "Preparando"
        if (pedidoSelecionado.status === 'novo') {
            setTimeout(async () => {
                mostrarMensagem('Pedido movido para "Preparando"...', 'info');
                // Chama a função helper que atualiza o status sem pedir confirmação
                await _atualizarStatusSemPrompt('preparando');
            }, 1000); // Delay de 1s para dar tempo da janela do WhatsApp abrir
        }
    }


    // --- Configurações da Loja ---
    
    async function carregarConfiguracoesDaLoja() {
        try {
            // CORREÇÃO: Usar o wildcard '*' para simplificar a consulta e evitar o erro 406/401
            const { data, error } = await supabase
                .from('config_loja')
                .select('*') 
                .eq('id', 1) 
                .single();
            
            if (error) {
                 if (error.code === 'PGRST116') { 
                    console.warn('Nenhuma configuração de loja encontrada. Usando padrões.');
                 } else {
                    throw error;
                 }
            }
            
            if (data) {
                configLoja = { ...configLoja, ...data }; // Mescla com os defaults, se necessário
                console.log('Configurações da loja carregadas:', configLoja);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar configurações da loja:', error);
            mostrarMensagem('Não foi possível carregar as config. da loja. Usando tempo padrão (60min).', 'error');
        }
    }

    function fecharModalConfiguracoes() {
        if (modalConfig) {
            modalConfig.style.display = 'none';
        }
    }

    async function abrirModalConfiguracoes() {
        if (!modalConfig) return;
        
        const data = configLoja;
        
        if (data) {
            document.getElementById('config-taxa-entrega').value = data.taxa_entrega || '';
            document.getElementById('config-tempo-entrega').value = data.tempo_entrega || '60';
            
            // <-- LINHA ADICIONADA -->
            document.getElementById('config-chave-pix').value = data.chave_pix || '';
            
            const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
            dias.forEach(dia => {
                document.getElementById(`${dia}-abertura`).value = data[`${dia}_abertura`] || '';
                document.getElementById(`${dia}-fechamento`).value = data[`${dia}_fechamento`] || '';
                document.getElementById(`${dia}-fechado`).checked = data[`${dia}_fechado`] || false;
            });
        }
            
        modalConfig.style.display = 'flex';
    }

    async function salvarConfiguracoes(e) {
        e.preventDefault();
        mostrarMensagem('Salvando...', 'info');

        try {
            const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
            // <-- OBJETO MODIFICADO -->
            const updateData = {
                id: 1, 
                taxa_entrega: parseFloat(document.getElementById('config-taxa-entrega').value) || 0,
                tempo_entrega: parseInt(document.getElementById('config-tempo-entrega').value) || 60,
                chave_pix: document.getElementById('config-chave-pix').value.trim() // <-- LINHA ADICIONADA
                // O campo 'endereco_retirada' é salvo por outra função
            };

            dias.forEach(dia => {
                const abertura = document.getElementById(`${dia}-abertura`).value;
                const fechamento = document.getElementById(`${dia}-fechamento`).value;
                const fechado = document.getElementById(`${dia}-fechado`).checked;

                updateData[`${dia}_abertura`] = abertura || null;
                updateData[`${dia}_fechamento`] = fechamento || null;
                updateData[`${dia}_fechado`] = fechado;
            });

            const { error } = await supabase
                .from('config_loja')
                .upsert(updateData, { onConflict: 'id' });

            if (error) throw error;
            
            configLoja = { ...configLoja, ...updateData }; // Atualiza o cache da configLoja
            
            mostrarMensagem('Configurações salvas com sucesso!', 'success');
            fecharModalConfiguracoes();
            atualizarTimers(); 

        } catch (error) {
            console.error('❌ Erro ao salvar configurações:', error);
            mostrarMensagem('Erro ao salvar configurações: ' + error.message, 'error');
        }
    }
    
    // NOVO: Salvar o Endereço de Retirada
    async function salvarEnderecoRetirada() {
        const novoEndereco = configEnderecoRetirada.value.trim();
        if (!novoEndereco) {
             mostrarMensagem('O endereço de retirada não pode ser vazio.', 'error');
             return;
        }
        
        mostrarMensagem('Salvando endereço...', 'info');

        try {
            const updateData = {
                id: 1, 
                endereco_retirada: novoEndereco,
            };

            const { error } = await supabase
                .from('config_loja')
                .upsert(updateData, { onConflict: 'id' });

            if (error) throw error;
            
            configLoja.endereco_retirada = novoEndereco; 
            
            mostrarMensagem('Endereço de retirada salvo com sucesso!', 'success');
        } catch (error) {
            console.error('❌ Erro ao salvar endereço de retirada:', error);
            mostrarMensagem('Erro ao salvar endereço de retirada: ' + error.message, 'error');
        }
    }
    
    // --- Funções de Polling e Timer CORRIGIDAS ---

    function tocarNotificacao() {
        audioNotificacao.play().catch(e => console.warn("Não foi possível tocar o som de notificação:", e.message));
    }

    async function verificarNovosPedidos() {
        // Esta verificação local é para o KANBAN. A notificação sonora
        // global é controlada pelo layout-loader.js
        console.log(`(Local) Verificando pedidos... (Última contagem: ${ultimoTotalDePedidos})`);
        
        try {
            const { data, error } = await supabase.from('pedidos_online')
                .select('*')
                .gte('created_at', new Date().toISOString().split('T')[0] + 'T00:00:00Z')
                .neq('status', 'entregue') 
                .neq('status', 'cancelado') 
                .order('created_at', { ascending: true });

            if (error) {
                console.error("(Local) Erro ao verificar novos pedidos:", error.message);
                return; 
            }

            const pedidosAtuais = data || [];
            
            // Se a contagem mudou, atualiza o board
            if (pedidosAtuais.length > ultimoTotalDePedidos) {
                console.log('(Local) NOVOS PEDIDOS DETECTADOS!');
                
                // O som é controlado globalmente, não precisa tocar aqui
                // tocarNotificacao(); // <-- COMENTADO
                
                mostrarMensagem(`🔔 (Local) ${pedidosAtuais.length - ultimoTotalDePedidos} novo(s) pedido(s) chegaram!`, 'success');
                
                todosPedidos = pedidosAtuais;
                exibirPedidosNoBoard(todosPedidos);
            } else if (pedidosAtuais.length < ultimoTotalDePedidos) {
                 // Alguém cancelou ou moveu um pedido
                 console.log('(Local) Pedidos removidos ou finalizados.');
                 todosPedidos = pedidosAtuais;
                 exibirPedidosNoBoard(todosPedidos);
            }
            
            ultimoTotalDePedidos = pedidosAtuais.length;

        } catch (err) {
            console.error("(Local) Erro no polling:", err);
        }
    }

    function iniciarAtualizadorDeTimers() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        timerInterval = setInterval(atualizarTimers, 15000); 
        atualizarTimers();
    }

    function atualizarTimers() {
        const agora = new Date();
        const tempoEntregaPadrao = configLoja.tempo_entrega || 60; 

        todosPedidos.forEach(pedido => {
            const timerEl = document.getElementById(`timer-pedido-${pedido.id}`);
            if (!timerEl) return;
            
            if (pedido.status === 'entregue' || pedido.status === 'cancelado') {
                timerEl.innerHTML = `<i class="fas fa-check"></i> Finalizado`;
                timerEl.className = 'card-novo-timer'; 
                return;
            }

            const criadoEm = new Date(pedido.created_at);
            const minutosPassados = (agora - criadoEm) / 60000; 
            
            const tempoRestante = tempoEntregaPadrao - minutosPassados;

            if (tempoRestante <= 0) {
                timerEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${Math.abs(tempoRestante).toFixed(0)} min ATRASADO`;
                timerEl.className = 'card-novo-timer atrasado';
            } else {
                timerEl.innerHTML = `${tempoRestante.toFixed(0)} min restantes`;
                timerEl.className = 'card-novo-timer no-prazo';
            }
        });
    }
    
    // --- Funções Auxiliares de Exibição/Ação (omissas para brevidade) ---

    // --- FUNÇÕES CRUD CIDADES ---
    
    async function carregarCidades() {
        try {
            const { data, error } = await supabase.from('cidades_entrega')
                .select('*')
                .order('nome', { ascending: true });

            if (error) throw error;
            
            todasCidades = data || [];
            preencherSelectCidades(todasCidades);
            exibirCidadesNaTabela(todasCidades);

        } catch (error) {
            console.error('❌ Erro ao carregar cidades:', error);
            mostrarMensagem('Erro ao carregar cidades. Verifique a tabela `cidades_entrega`.', 'error');
        }
    }
    
    function preencherSelectCidades(cidades) {
        if (!taxaCidadeSelect) return;
        const valorAtual = taxaCidadeSelect.value;
        taxaCidadeSelect.innerHTML = '<option value="">Selecione a Cidade</option>';
        cidades.forEach(cidade => {
            const option = document.createElement('option');
            option.value = cidade.id;
            option.textContent = cidade.nome;
            taxaCidadeSelect.appendChild(option);
        });
        taxaCidadeSelect.value = valorAtual;
    }
    
    function exibirCidadesNaTabela(cidades) {
        if (!cidadesTabelaBody) return;
        cidadesTabelaBody.innerHTML = '';
        if (cidades.length === 0) {
            cidadesTabelaBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #666;">Nenhuma cidade cadastrada.</td></tr>`;
            return;
        }
        
        cidades.forEach(cidade => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${cidade.nome}</strong></td>
                <td>
                    <button class="btn-edit btn-sm" onclick="editarCidade('${cidade.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger btn-sm" onclick="excluirCidade('${cidade.id}', '${cidade.nome}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            cidadesTabelaBody.appendChild(tr);
        });
    }

    async function salvarCidade(e) {
        e.preventDefault();
        const isEdicao = !!cidadeIdEdicao.value;
        const id = cidadeIdEdicao.value;
        const nome = cidadeNomeInput.value.trim();

        if (!nome) return mostrarMensagem('O nome da cidade é obrigatório.', 'error');
        
        try {
            if (isEdicao) {
                const { error } = await supabase.from('cidades_entrega')
                    .update({ nome: nome })
                    .eq('id', id);
                if (error) throw error;
                mostrarMensagem(`Cidade ${nome} atualizada com sucesso!`, 'success');
            } else {
                const { error } = await supabase.from('cidades_entrega')
                    .insert({ nome: nome });
                if (error) throw error;
                mostrarMensagem(`Cidade ${nome} cadastrada com sucesso!`, 'success');
            }
            
            formNovaCidade.reset();
            cidadeIdEdicao.value = '';
            document.getElementById('btn-salvar-cidade').innerHTML = '<i class="fas fa-save"></i> Salvar Cidade';
            await carregarCidades();

        } catch (error) {
            console.error('❌ Erro ao salvar cidade:', error);
            let msg = 'Erro ao cadastrar/atualizar cidade.';
            if (error.code === '23505') {
                msg = `Erro: A cidade **${nome}** já existe.`;
            } else if (error.message) {
                msg += ' Detalhe: ' + error.message;
            }
            mostrarMensagem(msg, 'error');
        }
    }
    
    window.editarCidade = function(cidadeId) {
        const cidade = todasCidades.find(c => c.id === cidadeId);
        if (cidade) {
            cidadeIdEdicao.value = cidade.id;
            cidadeNomeInput.value = cidade.nome;
            document.getElementById('btn-salvar-cidade').innerHTML = '<i class="fas fa-save"></i> Atualizar Cidade';
            cidadeNomeInput.focus();
        }
    }

    window.excluirCidade = async function(cidadeId, nome) {
        if (!confirm(`Tem certeza que deseja EXCLUIR a cidade "${nome}"?\nTodos os bairros associados a esta cidade TAMBÉM serão excluídos.`)) return;

        try {
            // A FK com CASCADE deve apagar os bairros automaticamente.
            const { error } = await supabase.from('cidades_entrega')
                .delete()
                .eq('id', cidadeId);
            
            if (error) throw error;
            
            mostrarMensagem(`Cidade ${nome} excluída com sucesso!`, 'success');
            await carregarCidades();
            await carregarTaxasEntrega();

        } catch (error) {
            console.error('❌ Erro ao excluir cidade:', error);
            mostrarMensagem('Erro ao excluir cidade: ' + error.message, 'error');
        }
    }
    
    // --- FUNÇÕES CRUD TAXAS (ATUALIZADAS COM FK) ---
    
    async function carregarTaxasEntrega() {
        if (!taxasTabelaBody) return;

        taxasTabelaBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #666;"><i class="fas fa-spinner fa-spin"></i> Carregando taxas...</td></tr>`;

        try {
            // Consulta com JOIN para obter o nome da cidade
            const { data, error } = await supabase.from('taxas_entrega')
                .select(`
                    id,
                    bairro,
                    valor,
                    cidade:cidades_entrega(id, nome)
                `)
                .order('cidade_id', { ascending: true })
                .order('bairro', { ascending: true });

            if (error) throw error;
            
            todasTaxas = data || [];
            exibirTaxasEntrega(todasTaxas);

        } catch (error) {
            console.error('❌ Erro ao carregar taxas de entrega:', error);
            mostrarMensagem('Erro ao carregar taxas de entrega. Verifique se a tabela `taxas_entrega` existe.', 'error');
            taxasTabelaBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--error-color);">Falha ao carregar taxas.</td></tr>`;
        }
    }
    

    async function salvarTaxaEntrega(e) {
        e.preventDefault();
        
        const isEdicao = !!taxaIdEdicao.value;
        const id = taxaIdEdicao.value;
        
        // NOVO: Coleta o ID da cidade do SELECT
        const cidadeId = taxaCidadeSelect.value;
        
        const bairro = taxaBairroInput.value.trim();
        const valor = parseFloat(taxaValorInput.value);
        
        // ATUALIZADO: Validação para verificar se a Cidade foi selecionada
        if (!cidadeId || !bairro || isNaN(valor) || valor < 0) {
            mostrarMensagem('Selecione a Cidade e preencha o Bairro e o Valor corretamente.', 'error');
            return;
        }
        
        const dadosTaxa = {
            cidade_id: cidadeId, // NOVO
            bairro: bairro,
            valor: valor,
        };

        try {
            if (isEdicao) {
                const { error } = await supabase.from('taxas_entrega')
                    .update(dadosTaxa)
                    .eq('id', id);
                if (error) throw error;
                mostrarMensagem(`Taxa atualizada com sucesso!`, 'success');
            } else {
                const { error } = await supabase.from('taxas_entrega')
                    .insert(dadosTaxa);
                if (error) throw error;
                mostrarMensagem(`Taxa cadastrada com sucesso!`, 'success');
            }
            
            formNovaTaxa.reset();
            taxaIdEdicao.value = '';
            document.getElementById('btn-salvar-taxa').innerHTML = '<i class="fas fa-plus-circle"></i> Adicionar/Salvar Taxa';
            await carregarTaxasEntrega();

        } catch (error) {
            console.error('❌ Erro ao salvar taxa:', error);
            let msg = 'Erro ao cadastrar/atualizar taxa.';
            // ATUALIZADO: Mensagem de erro de unicidade (bairro já existe na mesma cidade)
            if (error.code === '23505') {
                const nomeCidade = todasCidades.find(c => c.id === cidadeId)?.nome || 'Cidade Desconhecida';
                msg = `Erro: O bairro **${bairro}** na cidade **${nomeCidade}** já existe.`;
            } else if (error.message) {
                msg += ' Detalhe: ' + error.message;
            }
            mostrarMensagem(msg, 'error');
        }
    }

    window.editarTaxaEntrega = function(taxaId) {
        const taxa = todasTaxas.find(t => t.id === taxaId);
        if (taxa) {
            taxaIdEdicao.value = taxa.id;
            // Usa o ID da cidade para preencher o select
            document.getElementById('taxa-cidade-select').value = taxa.cidade?.id || ''; 
            taxaBairroInput.value = taxa.bairro;
            taxaValorInput.value = taxa.valor;
            document.getElementById('btn-salvar-taxa').innerHTML = '<i class="fas fa-save"></i> Salvar Edição';
            mostrarMensagem(`Editando taxa para ${taxa.bairro} (${taxa.cidade?.nome || 'N/A'})`, 'info');
            document.getElementById('taxa-cidade-select').focus();
        }
    }

    window.excluirTaxaEntrega = async function(taxaId, nomeCompleto) {
        if (!confirm(`Tem certeza que deseja EXCLUIR a taxa de entrega para "${nomeCompleto}"?\nEsta ação é irreversível!`)) return;

        try {
            const { error } = await supabase.from('taxas_entrega')
                .delete()
                .eq('id', taxaId);
            
            if (error) throw error;
            
            mostrarMensagem(`Taxa para ${nomeCompleto} excluída com sucesso!`, 'success');
            await carregarTaxasEntrega();

        } catch (error) {
            console.error('❌ Erro ao excluir taxa:', error);
            mostrarMensagem('Erro ao excluir taxa: ' + error.message, 'error');
        }
    }

    // --- FUNÇÕES DE PAGINAÇÃO (MOVIDAS PARA CÁ) ---
    function renderizarPaginacao() {
        if (!historicoPaginacao) return;

        const totalPaginas = Math.ceil(totalPedidosHistorico / ITENS_POR_PAGINA);
        const inicio = (paginaAtualHistorico - 1) * ITENS_POR_PAGINA + 1;
        const fim = Math.min(paginaAtualHistorico * ITENS_POR_PAGINA, totalPedidosHistorico);

        historicoPaginacao.innerHTML = `
            <div class="paginacao-info">
                Mostrando ${inicio}-${fim} de ${totalPedidosHistorico} pedidos
            </div>
            <div class="paginacao-botoes">
                <button id="btn-hist-anterior" ${paginaAtualHistorico === 1 ? 'disabled' : ''}>
                    <i class="fas fa-angle-left"></i> Anterior
                </button>
                <button id="btn-hist-proxima" ${paginaAtualHistorico >= totalPaginas ? 'disabled' : ''}>
                    Próxima <i class="fas fa-angle-right"></i>
                </button>
            </div>
        `;

        document.getElementById('btn-hist-anterior').addEventListener('click', () => {
            if (paginaAtualHistorico > 1) {
                carregarHistoricoPedidos(paginaAtualHistorico - 1);
            }
        });
        
        document.getElementById('btn-hist-proxima').addEventListener('click', () => {
            if (paginaAtualHistorico < totalPaginas) {
                carregarHistoricoPedidos(paginaAtualHistorico + 1);
            }
        });
    }

    inicializar();
});