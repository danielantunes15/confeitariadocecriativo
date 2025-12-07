// js/rastreamento.js - Módulo de Rastreamento de Pedidos e Histórico (Corrigido)

(function() {

    // const ui = window.AppUI; // <-- REMOVIDO
    // const api = window.AppAPI; // <-- REMOVIDO
    
    /**
     * Inicia o ouvinte de Realtime do Supabase para um pedido específico.
     */
    async function iniciarRastreamento(pedidoId) {
        if (!pedidoId) return;
        
        window.app.pedidoAtivoId = pedidoId;
        console.log(`Iniciando rastreamento para o pedido: ${pedidoId}`);
        
        // Limpa a visualização do histórico enquanto rastreamos um pedido ativo
        window.AppUI.elementos.statusUltimoPedido.innerHTML = '';
        
        pararRastreamento(); 

        const pedido = await window.AppAPI.buscarPedidoParaRastreamento(pedidoId);
        if (!pedido) {
            console.log("Pedido não encontrado, limpando tracker.");
            localStorage.removeItem('pedidoAtivoId');
            window.app.pedidoAtivoId = null;
            carregarStatusUltimoPedido();
            return;
        }
        
        // CORREÇÃO: Passa o objeto completo, incluindo a data de criação
        atualizarTrackerUI(pedido); 

        // --- INÍCIO DA NOVA LÓGICA ---
        // Adiciona o listener ao botão "Ver Detalhes" do card ativo
        const btnVerDetalhesAtivo = document.getElementById('ver-detalhes-pedido-ativo');
        if (btnVerDetalhesAtivo) {
            // Remove listener antigo (se houver) para evitar duplicatas
            btnVerDetalhesAtivo.onclick = null; 
            // Adiciona o novo listener
            btnVerDetalhesAtivo.addEventListener('click', () => {
                abrirModalDetalhesPedido(pedidoId);
            });
        }
        // --- FIM DA NOVA LÓGICA ---

        window.app.supabaseChannel = window.supabase.channel(`pedido-${pedidoId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'pedidos_online',
                    filter: `id=eq.${pedidoId}`
                },
                (payload) => {
                    console.log('Status do pedido atualizado via Realtime!', payload.new);
                    atualizarTrackerUI(payload.new);
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Canal de rastreamento para ${pedidoId} iniciado.`);
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error('Erro no canal de rastreamento:', err);
                }
            });
    }

    /**
     * Para o ouvinte de Realtime atual.
     */
    function pararRastreamento() {
        if (window.app.supabaseChannel) {
            window.supabase.removeChannel(window.app.supabaseChannel);
            window.app.supabaseChannel = null;
            window.app.pedidoAtivoId = null;
            console.log("Canal de rastreamento interrompido.");
        }
    }

    /**
     * Calcula a previsão de entrega e atualiza a interface da barra de rastreamento.
     */
    function atualizarTrackerUI(pedido) {
        const elementos = window.AppUI.elementos;
        if (!pedido) {
            localStorage.removeItem('pedidoAtivoId');
            window.app.pedidoAtivoId = null;
            elementos.rastreamentoContainer.style.display = 'none';
            pararRastreamento();
            carregarStatusUltimoPedido();
            return;
        }

        const tempoEntregaMinutos = window.app.configLoja.tempo_entrega || 60;
        const criadoEm = new Date(pedido.created_at);
        const dataPrevisao = new Date(criadoEm.getTime() + tempoEntregaMinutos * 60000);
        
        const horaPrevisao = dataPrevisao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        elementos.rastreamentoPedidoId.textContent = `#${pedido.id}`;
        elementos.rastreamentoContainer.style.display = 'block';

        const steps = [elementos.stepNovo, elementos.stepPreparando, elementos.stepPronto, elementos.stepEntregue];
        steps.forEach(step => step.classList.remove('active', 'completed'));
        
        // CORREÇÃO: Reseta a customização do ícone de entrega
        elementos.stepEntregue.querySelector('i').className = 'fas fa-check-circle';
        elementos.stepEntregue.style.color = '';
        elementos.stepEntregue.querySelector('i').style.background = '';
        
        let statusText = '';
        let subtituloText = '';

        if (pedido.status === 'novo') {
            elementos.stepNovo.classList.add('active');
            statusText = 'Pedido recebido pela loja! Aguardando confirmação.';
            subtituloText = 'aguardando confirmação.';
        } else if (pedido.status === 'preparando') {
            elementos.stepNovo.classList.add('completed');
            elementos.stepPreparando.classList.add('active');
            statusText = `Seu pedido está sendo preparado! Previsão de entrega: ${horaPrevisao}.`;
            subtituloText = 'em preparo.';
        } else if (pedido.status === 'pronto') {
            elementos.stepNovo.classList.add('completed');
            elementos.stepPreparando.classList.add('completed');
            elementos.stepPronto.classList.add('active');
            statusText = `Seu pedido saiu para entrega! Previsão de chegada: ${horaPrevisao}.`;
            subtituloText = 'a caminho!';
        } else if (pedido.status === 'entregue' || pedido.status === 'cancelado') {
            
            if (pedido.status === 'entregue') {
                 steps.forEach(s => s.classList.add('completed'));
                 subtituloText = 'foi entregue.';
            }
            
            if (pedido.status === 'cancelado') {
                steps.forEach(s => s.classList.add('completed'));
                elementos.stepEntregue.classList.remove('completed'); 
                elementos.stepEntregue.classList.add('active'); 
                elementos.stepEntregue.querySelector('i').className = 'fas fa-times-circle';
                elementos.stepEntregue.style.color = '#c62828';
                elementos.stepEntregue.querySelector('i').style.background = '#c62828';
                statusText = 'Seu pedido foi cancelado.';
                subtituloText = 'foi cancelado.';
            } else {
                statusText = 'Pedido entregue! Bom apetite!';
            }

            // Acompanhamento finalizado, limpa o estado ativo após 5s
            setTimeout(() => {
                localStorage.removeItem('pedidoAtivoId');
                window.app.pedidoAtivoId = null;
                elementos.rastreamentoContainer.style.display = 'none';
                carregarStatusUltimoPedido();
            }, 5000);
            
            pararRastreamento();
        }
        
        elementos.rastreamentoStatusTexto.textContent = statusText;
        if (elementos.rastreamentoSubtitulo) elementos.rastreamentoSubtitulo.textContent = subtituloText;
    }

    /**
     * Carrega o histórico de pedidos antigos (se nenhum pedido estiver ativo).
     */
    async function carregarStatusUltimoPedido() {
        const elementos = window.AppUI.elementos;
        if (window.app.pedidoAtivoId) {
            elementos.statusUltimoPedido.innerHTML = '';
            return;
        }
        
        elementos.rastreamentoContainer.style.display = 'none';
        elementos.statusUltimoPedido.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando histórico...';
        
        if (!window.app.clienteLogado) {
            elementos.statusUltimoPedido.innerHTML = '<p>Faça login para ver o status e o histórico de pedidos.</p>';
            return;
        }

        try {
            // CORREÇÃO: A API agora busca os últimos 5 pedidos
            const pedidos = await window.AppAPI.buscarHistoricoPedidos(window.app.clientePerfil.telefone);
            window.app.historicoPedidos = pedidos;
            
            let htmlHistorico = '';
            if (pedidos.length > 0) {
                 // Novo Design: Título do histórico mais limpo
                 htmlHistorico += `
                    <div style="padding: 10px 0;">
                        <h4 style="font-size: 1rem; color: #333; margin-bottom: 5px;">Últimos ${pedidos.length} Pedidos:</h4>
                        <p style="font-size: 0.85rem; color: #666;">Clique para ver detalhes e opções.</p>
                    </div>`;

                 pedidos.forEach((p) => {
                     const dataPedido = new Date(p.created_at).toLocaleDateString('pt-BR');
                     const status = (p.status || 'novo').toUpperCase();
                     
                    // Lógica para extrair o item principal
                    let listaItens = 'Detalhes do pedido';
                    const obsLines = p.observacoes.split('\n');
                    let isItemList = false;

                    for (const line of obsLines) {
                        if (line.includes('Itens:')) {
                            isItemList = true;
                            continue;
                        }
                        if (isItemList && line.trim().startsWith('*')) { 
                            listaItens = line.replace('*', '').trim().split('(')[0].substring(0, 40) + '...';
                            break;
                        }
                        if (line.includes('Subtotal:')) break; 
                    }
                     
                    const tempoEntregaMinutos = window.app.configLoja.tempo_entrega || 60;
                    const criadoEm = new Date(p.created_at);
                    const dataPrevisao = new Date(criadoEm.getTime() + tempoEntregaMinutos * 60000);
                    const horaPrevisao = dataPrevisao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    
                    const statusAcompanhamento = ['NOVO', 'PREPARANDO', 'PRONTO'];
                    const previsaoHtml = statusAcompanhamento.includes(status)
                        ? `<span style="color: var(--warning-color); font-weight: bold;">(Previsão: ${horaPrevisao})</span>`
                        : '';
                     
                     htmlHistorico += `
                         <div class="card-pedido-historico" 
                              onclick="window.AppRastreamento.abrirModalDetalhesPedido('${p.id}')">
                             <p style="font-weight: bold; margin: 0;">Pedido #${p.id} - ${dataPedido} ${previsaoHtml}</p>
                             <p style="font-size: 0.9rem; margin: 0; color: #555;">${listaItens}</p>
                             <p style="font-size: 0.9rem; margin: 0;">Status: 
                                 <span class="status-badge-history status-${status}">
                                     ${status}
                                 </span>
                                 | Total: ${window.AppUI.formatarMoeda(p.total)}
                             </p>
                         </div>
                     `;
                 });
            } else {
                 htmlHistorico = 'Você ainda não fez nenhum pedido conosco!';
            }
            
            elementos.statusUltimoPedido.innerHTML = htmlHistorico;
            
        } catch (error) {
            elementos.statusUltimoPedido.innerHTML = 'Erro ao carregar histórico.';
            console.error('Erro ao carregar status do pedido:', error);
        }
    }
    
    /**
     * Abre o modal com os detalhes de um pedido do histórico.
     * --- FUNÇÃO TOTALMENTE REESCRITA ---
     */
    async function abrirModalDetalhesPedido(pedidoId) {
        if (!pedidoId) return;

        // 1. Mostrar loading no modal
        const elementos = window.AppUI.elementos;
        elementos.detalhesPedidoId.textContent = `#${pedidoId}`;
        elementos.detalhesPedidoContent.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Carregando detalhes...</p>';
        elementos.modalDetalhesPedido.style.display = 'flex';

        // 2. Buscar os detalhes completos do pedido pela API
        // Usamos a nova função da api.js
        const pedido = await window.AppAPI.buscarDetalhesPedidoPorId(pedidoId);

        if (!pedido) {
            elementos.detalhesPedidoContent.innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar detalhes do pedido.</p>';
            window.AppUI.mostrarMensagem('Detalhes do pedido não encontrados.', 'error');
            return;
        }
        
        // 3. (Lógica copiada da função antiga, mas usando o 'pedido' da API)
        const dataPedido = new Date(pedido.created_at).toLocaleString('pt-BR');
        const status = (pedido.status || 'novo').toUpperCase();
        
        const obsLines = pedido.observacoes.split('\n');
        let itensListHtml = '';
        let obsAdicionais = '';
        let isItemList = false;

        for (let i = 0; i < obsLines.length; i++) {
            const line = obsLines[i];
            if (line.includes('Itens:')) { isItemList = true; continue; }
            if (line.includes('Total:') || line.includes('OBSERVAÇÕES ADICIONAIS:')) {
                isItemList = false;
                if (line.includes('OBSERVAÇÕES ADICIONAIS:')) {
                    obsAdicionais = obsLines.slice(i).join('\n');
                }
                continue;
            }
            if (isItemList && line.trim() !== '') {
                itensListHtml += `<p style="margin: 3px 0; font-size: 0.9rem;">- ${line.replace('*', '').trim()}</p>`;
            }
        }
        const cleanedObsAdicionais = obsAdicionais.replace('OBSERVAÇÕES ADICIONAIS:', '').trim();
        
        // Lógica de cancelamento (só permite cancelar se status for NOVO ou PREPARANDO)
        const podeCancelar = status === 'NOVO' || status === 'PREPARANDO';
        const cancelBtnHtml = podeCancelar
            ? `<button id="btn-cancelar-pedido-cliente" data-id="${pedido.id}" class="btn-login-app" style="background: var(--error-color, #f44336); margin-top: 15px;">
                 <i class="fas fa-trash-alt"></i> Cancelar Pedido
               </button>`
            : `<p style="margin-top: 15px; font-size: 0.9rem; color: #999;">O pedido não pode mais ser cancelado. Status atual: ${status}.</p>`;

        // Previsão de entrega
        const tempoEntregaMinutos = window.app.configLoja.tempo_entrega || 60;
        const criadoEm = new Date(pedido.created_at);
        const dataPrevisao = new Date(criadoEm.getTime() + tempoEntregaMinutos * 60000);
        const horaPrevisao = dataPrevisao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        const previsaoText = (status === 'ENTREGUE' || status === 'CANCELADO') 
            ? '' 
            : `<p style="font-size: 0.9rem; margin: 5px 0;"><strong>Previsão de Entrega:</strong> <span style="color: var(--warning-color); font-weight: bold;">${horaPrevisao}</span></p>`;


        elementos.detalhesPedidoContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 15px;">
                <h4 style="margin: 0; font-size: 1.5rem;">${window.AppUI.formatarMoeda(pedido.total)}</h4>
                <span class="status-badge-history status-${status}" style="margin-top: 5px;">
                    <i class="fas fa-info-circle"></i> STATUS: ${status}
                </span>
            </div>
            
            ${previsaoText}
            
            <h5 style="border-bottom: 1px dashed #eee; padding-bottom: 5px; margin-top: 15px; font-weight: bold;">Detalhes da Entrega</h5>
            <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Data/Hora:</strong> ${dataPedido}</p>
            <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Cliente:</strong> ${pedido.nome_cliente}</p>
            <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Endereço:</strong> ${pedido.endereco_entrega}</p>
            <p style="margin: 5px 0; font-size: 0.9rem;"><strong>Pagamento:</strong> ${pedido.forma_pagamento}</p>
            
            <h5 style="border-bottom: 1px dashed #eee; padding-bottom: 5px; margin-top: 15px; font-weight: bold;">Itens Solicitados</h5>
            <div style="max-height: 150px; overflow-y: auto;">
                 ${itensListHtml || '<p style="font-size: 0.9rem; color: #999;">Nenhum item detalhado.</p>'}
            </div>
            
            ${cleanedObsAdicionais ? 
                `<h5 style="border-bottom: 1px dashed #eee; padding-bottom: 5px; margin-top: 15px; font-weight: bold;">Observações</h5>
                 <pre style="white-space: pre-wrap; font-size: 0.85rem; color: #555; background: #f9f9f9; padding: 10px; border-radius: 5px;">${cleanedObsAdicionais}</pre>` 
                : ''}
            
            ${cancelBtnHtml}
        `;
        
        if (podeCancelar) {
             document.getElementById('btn-cancelar-pedido-cliente').addEventListener('click', () => {
                 cancelarPedidoCliente(pedido.id);
             });
        }
    }
    
    /**
     * Função para o cliente solicitar o cancelamento de um pedido.
     */
    async function cancelarPedidoCliente(pedidoId) {
        if (!confirm(`Tem certeza que deseja CANCELAR o Pedido #${pedidoId}? \n\nIsto pode não ser possível se o pedido já estiver pronto ou a caminho.`)) {
            return;
        }

        try {
            // A API de cancelamento deve verificar se o status permite o cancelamento (NOVO ou PREPARANDO)
            const sucesso = await window.AppAPI.cancelarPedidoNoSupabase(pedidoId);

            if (sucesso) {
                 window.AppUI.mostrarMensagem(`Pedido #${pedidoId} cancelado!`, 'success');
            } else {
                 // Se o pedido não foi cancelado (status avançado)
                 window.AppUI.mostrarMensagem(`O pedido #${pedidoId} não pode mais ser cancelado. Por favor, contate a loja.`, 'warning');
            }
            
            window.AppUI.fecharModal(window.AppUI.elementos.modalDetalhesPedido);
            
            // Força a atualização do histórico e rastreador
            carregarStatusUltimoPedido(); 
            if (window.app.pedidoAtivoId == pedidoId) {
                // A atualização do realtime (que vem do supabase) vai lidar com a mudança de status
                // Mas podemos forçar uma verificação
                iniciarRastreamento(pedidoId);
            }

        } catch (error) {
            console.error("Erro ao cancelar pedido:", error);
            window.AppUI.mostrarMensagem('Erro ao tentar cancelar o pedido.', 'error');
        }
    }


    // Expõe as funções para o objeto global AppRastreamento
    window.AppRastreamento = {
        iniciarRastreamento,
        pararRastreamento,
        atualizarTrackerUI,
        carregarStatusUltimoPedido,
        abrirModalDetalhesPedido,
        cancelarPedidoCliente
    };

})();