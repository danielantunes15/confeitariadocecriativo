// js/delivery.js - Lógica do Painel de Pedidos Online - COM REALTIME E FILTROS
document.addEventListener('DOMContentLoaded', async function () {

    // --- VARIÁVEIS GLOBAIS E ELEMENTOS ---
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('delivery-board');
    const acessoNegadoElement = document.getElementById('acesso-negado');
    const recarregarBtn = document.getElementById('recarregar-pedidos');
    const filtroDataInput = document.getElementById('filtro-data');
    const filtroBuscaInput = document.getElementById('filtro-busca');
    
    const modalDetalhes = document.getElementById('modal-detalhes');
    const detalhesContent = document.getElementById('detalhes-pedido-content');
    const modalPedidoId = document.getElementById('modal-pedido-id');
    const btnAvancarStatus = document.getElementById('btn-avancar-status');
    const btnCancelarPedido = document.getElementById('btn-cancelar-pedido');
    
    // Lista completa de pedidos do banco (para re-renderizar após filtro/busca)
    let todosPedidosDoBanco = []; 
    let pedidoSelecionado = null;
    let realtimeChannel = null; // Para o canal de tempo real

    const STATUS_MAP = {
        'novo': { title: 'Novo', icon: 'fas fa-box-open', next: 'preparando', nextText: 'Iniciar Preparo', color: 'var(--primary-color)' },
        'preparando': { title: 'Preparando', icon: 'fas fa-fire-alt', next: 'pronto', nextText: 'Marcar como Pronto', color: 'var(--warning-color)' },
        'pronto': { title: 'Pronto para Envio', icon: 'fas fa-truck-loading', next: 'entregue', nextText: 'Marcar como Entregue', color: 'var(--info-color)' },
        'entregue': { title: 'Entregue/Finalizado', icon: 'fas fa-check-circle', next: null, nextText: 'Finalizado', color: 'var(--success-color)' },
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
            'cartão_(maquininha)': 'Cartão',
            'pix': 'PIX',
            'cartao_debito': 'Cartão Débito',
            'cartao_credito': 'Cartão Crédito',
            'crediario': 'Crediário'
        };
        return formas[forma] || forma;
    };
    
    const toggleDisplay = (element, show) => { if (element) element.style.display = show ? 'block' : 'none'; };
    
    /**
     * Calcula o tempo decorrido desde a criação do pedido (ou última atualização no Realtime)
     * @param {string} dateString ISO string da data
     * @returns {object} Tempo formatado e se está atrasado
     */
    const calcularTempoDecorrido = (dateString) => {
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now - past;
        
        const totalMinutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        const isOverdue = totalMinutes > 60; // Mais de 1 hora
        
        return {
            time: `${hours > 0 ? hours + 'h ' : ''}${minutes}m`,
            isOverdue: isOverdue
        };
    };

    // --- AUTENTICAÇÃO E INICIALIZAÇÃO ---
    if (!window.sistemaAuth?.verificarAutenticacao()) {
        window.location.href = 'login.html';
        return;
    }
    const usuario = window.sistemaAuth.usuarioLogado;
    const isAdminOrManager = ['administrador', 'admin', 'gerente', 'supervisor', 'usuario'].includes(usuario.tipo?.toLowerCase());
    
    async function inicializar() {
        toggleDisplay(loadingElement, true);

        if (!isAdminOrManager) {
            toggleDisplay(loadingElement, false);
            toggleDisplay(acessoNegadoElement, true);
            return;
        }

        configurarEventListeners();
        await carregarPedidosOnline();
        iniciarRealtimeSubscription(); 

        toggleDisplay(loadingElement, false);
        toggleDisplay(contentElement, true);
    }
    
    function configurarEventListeners() {
        if (recarregarBtn) {
            recarregarBtn.addEventListener('click', carregarPedidosOnline);
        }
        if (btnAvancarStatus) {
            btnAvancarStatus.addEventListener('click', avancarStatusPedido);
        }
        if (btnCancelarPedido) {
            btnCancelarPedido.addEventListener('click', () => atualizarStatusPedido('cancelado', 'Tem certeza que deseja CANCELAR este pedido?', false));
        }
        
        // NOVO: Listeners para o filtro e busca
        if (filtroDataInput) {
            filtroDataInput.addEventListener('change', carregarPedidosOnline);
        }
        if (filtroBuscaInput) {
            filtroBuscaInput.addEventListener('input', filtrarPedidos);
        }
        
        // Event listener para ações rápidas (Adicionado ao corpo para delegar eventos)
        contentElement.addEventListener('click', function(e) {
            if (e.target.closest('.quick-action-btn')) {
                const btn = e.target.closest('.quick-action-btn');
                const id = btn.getAttribute('data-id');
                const nextStatus = btn.getAttribute('data-next-status');
                
                if (id && nextStatus) {
                    // Encontra o pedido selecionado temporariamente para a confirmação
                    pedidoSelecionado = todosPedidosDoBanco.find(p => p.id === parseInt(id));
                    if (pedidoSelecionado) {
                        atualizarStatusPedido(nextStatus, `Confirma a mudança de status para "${STATUS_MAP[nextStatus].title}"?`, true);
                    }
                }
            }
        });
    }
    
    // --- LÓGICA DE REALTIME (NOVO) ---
    function iniciarRealtimeSubscription() {
        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
        }
        
        realtimeChannel = supabase.channel('pedidos_online_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'pedidos_online' },
                (payload) => {
                    console.log('Realtime change received!', payload);
                    
                    // A atualização Realtime força a recarga total no filtro atual
                    carregarPedidosOnline(false); // Chama o carregamento sem o spinner
                    
                    // Toca um som de alerta para novos pedidos (opcional, requer arquivo de áudio)
                    if (payload.eventType === 'INSERT' || (payload.eventType === 'UPDATE' && payload.new.status === 'novo')) {
                        // const audio = new Audio('audio/alerta.mp3'); 
                        // audio.play().catch(e => console.warn("Não foi possível tocar o alerta: ", e));
                        mostrarMensagem('Novo pedido recebido!', 'info');
                    }
                }
            )
            .subscribe();
        
        console.log('✅ Supabase Realtime subscription initialized for pedidos_online.');
    }


    // ----------------------------------------------------------------------
    // --- LÓGICA DE PEDIDOS ONLINE (CRUD E FILTRAGEM) ---
    // ----------------------------------------------------------------------

    async function carregarPedidosOnline(showLoading = true) {
        if (!contentElement) return;

        if (showLoading) {
            const board = document.getElementById('delivery-board');
            board.querySelectorAll('.card-list').forEach(list => list.innerHTML = `<p style="text-align: center; color: var(--text-light); font-style: italic; margin-top: 1rem;">Atualizando...</p>`);
        }
        
        const dataSelecionada = filtroDataInput.value;
        const dataInicio = dataSelecionada ? new Date(dataSelecionada + 'T00:00:00').toISOString() : null;
        const dataFim = dataSelecionada ? new Date(dataSelecionada + 'T23:59:59').toISOString() : null;
        
        try {
            let query = supabase.from('pedidos_online')
                .select('*')
                .order('created_at', { ascending: true });

            // Aplica o filtro de data 
            if (dataInicio && dataFim) {
                 query = query.gte('created_at', dataInicio)
                              .lte('created_at', dataFim);
            } else if (!dataSelecionada) {
                 // Se o campo de data estiver vazio, carrega APENAS os do dia atual como fallback seguro
                 const today = new Date().toISOString().split('T')[0];
                 const startOfDay = new Date(today + 'T00:00:00').toISOString();
                 query = query.gte('created_at', startOfDay);
            }
                

            const { data, error } = await query;

            if (error) throw error;
            
            todosPedidosDoBanco = data || [];
            filtrarPedidos(); // Aplica a busca e exibe
            
        } catch (error) {
            console.error('❌ Erro ao carregar pedidos online:', error);
            mostrarMensagem('Erro ao carregar o painel de pedidos.', 'error');
        }
    }

    function filtrarPedidos() {
        const termoBusca = filtroBuscaInput.value.toLowerCase().trim();
        
        let pedidosFiltrados = todosPedidosDoBanco;

        if (termoBusca) {
             pedidosFiltrados = todosPedidosDoBanco.filter(p => 
                 p.nome_cliente.toLowerCase().includes(termoBusca) ||
                 p.id.toString().includes(termoBusca)
             );
        }
        
        exibirPedidosNoBoard(pedidosFiltrados);
    }


    function exibirPedidosNoBoard(pedidos) {
        // Inicializa colunas para todos os status
        const colunas = { novo: [], preparando: [], pronto: [], entregue: [], cancelado: [] };
        
        pedidos.forEach(p => {
            const status = p.status || 'novo';
            if (colunas[status]) {
                colunas[status].push(p);
            }
        });
        
        Object.keys(STATUS_MAP).forEach(status => {
            const colElement = document.getElementById(`col-${status}`);
            if (!colElement) return;
            const listElement = colElement.querySelector('.card-list');
            
            colElement.querySelector('h3').innerHTML = `<i class="${STATUS_MAP[status].icon}"></i> ${STATUS_MAP[status].title} (${colunas[status].length})`;
            listElement.innerHTML = '';
            
            if (colunas[status].length === 0) {
                 listElement.innerHTML = `<p style="text-align: center; color: var(--text-light); font-style: italic; margin-top: 1rem;">Nenhum pedido</p>`;
            } else {
                colunas[status].forEach(pedido => {
                    const card = criarCardPedido(pedido);
                    listElement.appendChild(card);
                });
            }
        });
    }
    
    function criarCardPedido(pedido) {
        const card = document.createElement('div');
        const status = pedido.status || 'novo';
        card.className = `pedido-card status-${status}`;
        card.setAttribute('data-id', pedido.id);
        
        const hora = new Date(pedido.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const { time: timeElapsed, isOverdue } = calcularTempoDecorrido(pedido.created_at);
        
        // Determina a próxima ação para o botão rápido
        const nextStatusInfo = STATUS_MAP[status];
        const nextStatus = nextStatusInfo.next;
        const nextStatusText = nextStatusInfo.nextText;
        const isCancellableOrFinished = status === 'cancelado' || status === 'entregue';
        
        // Determina o tipo de entrega (Heurística simples)
        const isDelivery = pedido.endereco_entrega && pedido.endereco_entrega.toLowerCase().includes('rua'); 
        
        // Conteúdo dos itens
        let itemsHtml = (pedido.observacoes.replace('Itens: ', '')).split('\n').filter(line => line.trim() !== '').map(line => `<li>${line}</li>`).join('');
        
        // Ação rápida
        let quickActionHtml = '';
        if (nextStatus && !isCancellableOrFinished) {
            quickActionHtml = `
                <button class="quick-action-btn" 
                        data-id="${pedido.id}" 
                        data-next-status="${nextStatus}"
                        style="background-color: ${STATUS_MAP[nextStatus]?.color || 'var(--secondary-color)'};">
                    <i class="fas fa-angle-right"></i> ${nextStatusText}
                </button>
            `;
        } else if (isCancellableOrFinished) {
            quickActionHtml = `<span style="font-size: 0.8rem; color: var(--success-color); font-weight: bold;">Finalizado</span>`;
        }


        card.innerHTML = `
            <div class="pedido-header">
                <strong>Pedido #${pedido.id}</strong>
                <span class="status-badge badge-${status}">${STATUS_MAP[status].title}</span>
            </div>
            <div class="pedido-info">
                <p>👤 ${pedido.nome_cliente}</p>
                <p>
                    <i class="fas fa-clock"></i> ${hora} 
                    <span class="delivery-type-icon" title="${isDelivery ? 'Entrega' : 'Retirada na Loja'}">
                        <i class="fas ${isDelivery ? 'fa-motorcycle' : 'fa-store'}"></i>
                    </span>
                </p>
                <p class="valor">${formatarMoeda(pedido.total)}</p>
            </div>
            <div class="pedido-items">
                <ul>${itemsHtml}</ul>
            </div>
            <div class="time-indicator ${isOverdue ? 'overdue' : ''}">
                <span>Tempo no Status: <strong>${timeElapsed}</strong></span>
                ${quickActionHtml}
            </div>
        `;
        
        // Abre o modal de detalhes apenas se clicar na área que não for o botão de ação rápida
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.quick-action-btn')) {
                abrirModalDetalhes(pedido.id);
            }
        });
        return card;
    }
    
    // Funções de atualização de status (mantidas)

    window.abrirModalDetalhes = function(pedidoId) {
        pedidoSelecionado = todosPedidosDoBanco.find(p => p.id === pedidoId);
        if (!pedidoSelecionado) return;
        
        modalPedidoId.textContent = `#${pedidoId}`;
        
        const statusInfo = STATUS_MAP[pedidoSelecionado.status];
        
        // Configura o botão de avançar
        btnAvancarStatus.style.display = statusInfo.next ? 'inline-flex' : 'none';
        btnAvancarStatus.textContent = statusInfo.nextText || '';
        btnAvancarStatus.setAttribute('data-next-status', statusInfo.next);
        
        // Esconde botões se o pedido estiver em status final
        btnCancelarPedido.style.display = pedidoSelecionado.status !== 'cancelado' && pedidoSelecionado.status !== 'entregue' ? 'inline-flex' : 'none';
        btnAvancarStatus.style.display = pedidoSelecionado.status !== 'cancelado' && pedidoSelecionado.status !== 'entregue' ? btnAvancarStatus.style.display : 'none';
        
        // Define a cor do botão de próxima ação
        btnAvancarStatus.style.background = STATUS_MAP[statusInfo.next]?.color || 'var(--primary-color)';
        
        const { time: timeElapsed, isOverdue } = calcularTempoDecorrido(pedidoSelecionado.created_at);
        const isDelivery = pedidoSelecionado.endereco_entrega && pedidoSelecionado.endereco_entrega.toLowerCase().includes('rua');

        detalhesContent.innerHTML = `
            <p><strong>Status Atual:</strong> <span style="font-weight: bold; color: ${statusInfo.color}">${statusInfo.title}</span></p>
            <p><strong>Tempo no Status:</strong> <span style="font-weight: bold; color: ${isOverdue ? 'var(--error-color)' : 'var(--success-color)'}">${timeElapsed}</span></p>
            <p><strong>Cliente:</strong> ${pedidoSelecionado.nome_cliente}</p>
            <p><strong>Telefone:</strong> <a href="https://wa.me/55${pedidoSelecionado.telefone_cliente.replace(/\D/g,'')}" target="_blank">${pedidoSelecionado.telefone_cliente}</a></p>
            <p><strong>Endereço/Tipo:</strong> ${isDelivery ? pedidoSelecionado.endereco_entrega : 'Retirada na Loja'}</p>
            <p><strong>Pagamento:</strong> ${formatarFormaPagamento(pedidoSelecionado.forma_pagamento)}</p>
            <p style="font-size: 1.5rem; font-weight: bold; color: var(--primary-dark); margin-top: 1rem;">Total: ${formatarMoeda(pedidoSelecionado.total)}</p>
            
            <h4 style="margin-top: 1.5rem; border-top: 1px dashed #ccc; padding-top: 0.5rem;">Itens do Pedido:</h4>
            <p style="white-space: pre-wrap; font-size: 0.9rem;">${pedidoSelecionado.observacoes.replace('Itens: ', '')}</p>
        `;
        
        modalDetalhes.style.display = 'flex';
    }
    
    async function avancarStatusPedido() {
        const nextStatus = btnAvancarStatus.getAttribute('data-next-status');
        if (!nextStatus) return;
        // Atualiza a partir do modal
        await atualizarStatusPedido(nextStatus, `Confirma a mudança de status para "${STATUS_MAP[nextStatus].title}"?`, false);
    }

    async function atualizarStatusPedido(novoStatus, mensagemConfirmacao, isQuickAction = false) {
        if (!pedidoSelecionado || !confirm(mensagemConfirmacao)) return;
        
        try {
            const { error } = await supabase.from('pedidos_online')
                .update({ 
                    status: novoStatus,
                    // Define a data de atualização como a data de criação do novo status (para o cálculo de tempo)
                    created_at: new Date().toISOString() 
                }) 
                .eq('id', pedidoSelecionado.id);
            
            if (error) throw error;

            mostrarMensagem(`Status do pedido #${pedidoSelecionado.id} atualizado para "${STATUS_MAP[novoStatus].title}"!`, 'success');
            
            if (!isQuickAction) {
                modalDetalhes.style.display = 'none';
            } else {
                modalDetalhes.style.display = 'none';
            }
            
            // Força a recarga para atualizar o UI (Mesmo com Realtime, é um fallback seguro)
            carregarPedidosOnline(false); 

        } catch (error) {
            console.error('❌ Erro ao atualizar status:', error);
            mostrarMensagem('Erro ao atualizar status: ' + error.message, 'error');
        }
    }


    inicializar();
});