// js/rastreamento.js - Módulo de Rastreamento de Pedidos e Histórico

(function() {

    /**
     * Inicia o rastreamento em tempo real de um pedido específico.
     */
    async function iniciarRastreamento(pedidoId) {
        if (!pedidoId) return;
        
        window.app.pedidoAtivoId = pedidoId;
        console.log(`Iniciando rastreamento para o pedido: ${pedidoId}`);
        
        // Limpa a área de histórico para focar no rastreamento
        window.AppUI.elementos.statusUltimoPedido.innerHTML = '';
        
        // Para qualquer rastreamento anterior para não duplicar ouvintes
        pararRastreamento(); 

        // Busca o estado inicial do pedido
        const pedido = await window.AppAPI.buscarPedidoParaRastreamento(pedidoId);
        if (!pedido) {
            console.log("Pedido não encontrado, limpando tracker.");
            localStorage.removeItem('pedidoAtivoId');
            window.app.pedidoAtivoId = null;
            carregarStatusUltimoPedido(); // Volta para o histórico
            return;
        }
        
        // Atualiza a barra de progresso visual
        atualizarTrackerUI(pedido); 

        // Configura o botão "Ver Detalhes" que aparece no card de rastreamento
        const btnVerDetalhesAtivo = document.getElementById('ver-detalhes-pedido-ativo');
        if (btnVerDetalhesAtivo) {
            // Remove listeners antigos para evitar duplicação
            const novoBtn = btnVerDetalhesAtivo.cloneNode(true);
            btnVerDetalhesAtivo.parentNode.replaceChild(novoBtn, btnVerDetalhesAtivo);
            
            novoBtn.addEventListener('click', () => {
                abrirModalDetalhesPedido(pedidoId);
            });
        }

        // Inscreve-se no canal Realtime do Supabase
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
                    console.log('Status atualizado via Realtime!', payload.new);
                    atualizarTrackerUI(payload.new);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Rastreamento conectado para o pedido #${pedidoId}`);
                }
            });
    }

    /**
     * Remove o ouvinte do Supabase e limpa o estado.
     */
    function pararRastreamento() {
        if (window.app.supabaseChannel) {
            window.supabase.removeChannel(window.app.supabaseChannel);
            window.app.supabaseChannel = null;
        }
        // Não limpamos o pedidoAtivoId aqui para manter o estado visual até ser explicitamente fechado ou finalizado
    }

    /**
     * Atualiza a interface da barra de progresso (steps).
     */
    function atualizarTrackerUI(pedido) {
        const elementos = window.AppUI.elementos;
        
        // Se o pedido sumiu ou deu erro
        if (!pedido) {
            localStorage.removeItem('pedidoAtivoId');
            window.app.pedidoAtivoId = null;
            elementos.rastreamentoContainer.style.display = 'none';
            pararRastreamento();
            carregarStatusUltimoPedido();
            return;
        }

        // Calcula previsão de entrega
        const tempoEntregaMinutos = window.app.configLoja.tempo_entrega || 60;
        const criadoEm = new Date(pedido.created_at);
        const dataPrevisao = new Date(criadoEm.getTime() + tempoEntregaMinutos * 60000);
        const horaPrevisao = dataPrevisao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Atualiza textos
        elementos.rastreamentoPedidoId.textContent = `#${pedido.id}`;
        elementos.rastreamentoContainer.style.display = 'block';

        // Reseta classes dos steps
        const steps = [elementos.stepNovo, elementos.stepPreparando, elementos.stepPronto, elementos.stepEntregue];
        steps.forEach(step => step.classList.remove('active', 'completed'));
        
        // Reseta ícone final
        const iconeEntregue = elementos.stepEntregue.querySelector('i');
        iconeEntregue.className = 'fas fa-check-circle';
        elementos.stepEntregue.style.color = '';
        iconeEntregue.style.background = '';
        
        let statusText = '';
        let subtituloText = '';

        // Lógica de Status
        if (pedido.status === 'novo') {
            elementos.stepNovo.classList.add('active');
            statusText = 'Aguardando confirmação da loja...';
            subtituloText = 'recebido.';
        } else if (pedido.status === 'preparando') {
            elementos.stepNovo.classList.add('completed');
            elementos.stepPreparando.classList.add('active');
            statusText = `Em preparação! Previsão: ${horaPrevisao}`;
            subtituloText = 'em preparo.';
        } else if (pedido.status === 'pronto') {
            elementos.stepNovo.classList.add('completed');
            elementos.stepPreparando.classList.add('completed');
            elementos.stepPronto.classList.add('active');
            statusText = `Pronto para entrega/retirada!`;
            subtituloText = 'pronto.';
        } else if (pedido.status === 'entregue' || pedido.status === 'cancelado') {
            steps.forEach(s => s.classList.add('completed'));
            
            if (pedido.status === 'cancelado') {
                // Estilização especial para cancelado
                elementos.stepEntregue.classList.remove('completed'); 
                elementos.stepEntregue.classList.add('active'); 
                iconeEntregue.className = 'fas fa-times-circle';
                elementos.stepEntregue.style.color = '#c62828'; // Vermelho
                iconeEntregue.style.background = '#c62828';
                statusText = 'Pedido cancelado.';
                subtituloText = 'cancelado.';
            } else {
                statusText = 'Pedido entregue! Bom apetite!';
                subtituloText = 'entregue.';
            }

            // Volta para o histórico após 5 segundos
            setTimeout(() => {
                localStorage.removeItem('pedidoAtivoId');
                window.app.pedidoAtivoId = null;
                elementos.rastreamentoContainer.style.display = 'none';
                pararRastreamento();
                carregarStatusUltimoPedido();
            }, 5000);
        }
        
        elementos.rastreamentoStatusTexto.textContent = statusText;
        if(elementos.rastreamentoSubtitulo) elementos.rastreamentoSubtitulo.textContent = subtituloText;
    }

    /**
     * Carrega o histórico de pedidos e monta os CARDS bonitos.
     */
    async function carregarStatusUltimoPedido() {
        const elementos = window.AppUI.elementos;
        
        // Se estiver rastreando, não mostra histórico
        if (window.app.pedidoAtivoId) {
            elementos.statusUltimoPedido.innerHTML = '';
            return;
        }
        
        elementos.rastreamentoContainer.style.display = 'none';
        
        // Loading elegante
        elementos.statusUltimoPedido.innerHTML = `
            <div style="text-align:center; padding: 20px; color: #999;">
                <i class="fas fa-spinner fa-spin"></i> Buscando histórico...
            </div>`;
        
        if (!window.app.clienteLogado) {
            elementos.statusUltimoPedido.innerHTML = `
                <div style="text-align:center; padding: 30px; color: #666;">
                    <i class="fas fa-lock" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Faça login para ver seus pedidos anteriores.</p>
                </div>`;
            return;
        }

        try {
            const pedidos = await window.AppAPI.buscarHistoricoPedidos(window.app.clientePerfil.telefone);
            window.app.historicoPedidos = pedidos;
            
            let htmlHistorico = '';
            
            if (pedidos.length > 0) {
                 htmlHistorico += `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 0 5px;">
                        <h3 style="font-size: 1.1rem; color: #333; margin: 0;">Meus Pedidos</h3>
                        <span style="font-size: 0.8rem; background: #eee; padding: 2px 8px; border-radius: 10px; color: #666;">${pedidos.length} recentes</span>
                    </div>
                    <div class="history-container">`;

                 pedidos.forEach((p) => {
                     const dataPedido = new Date(p.created_at).toLocaleDateString('pt-BR');
                     const status = (p.status || 'novo').toLowerCase();
                     const totalFormatado = window.AppUI.formatarMoeda(p.total);
                     
                     // Configuração visual dos status
                     const statusConfig = {
                         'novo': { text: 'Aguardando', icon: 'fa-clock' },
                         'preparando': { text: 'Preparando', icon: 'fa-fire' },
                         'pronto': { text: 'Pronto', icon: 'fa-box' },
                         'entregue': { text: 'Entregue', icon: 'fa-check' },
                         'cancelado': { text: 'Cancelado', icon: 'fa-times' }
                     };
                     const label = statusConfig[status] || { text: status, icon: 'fa-circle' };

                    // Parser inteligente para resumir os itens
                    let listaItens = 'Clique para ver detalhes';
                    const obsLines = p.observacoes.split('\n');
                    let itensFound = [];
                    let capturing = false;
                    
                    for (const line of obsLines) {
                        if (line.includes('Itens:') || line.includes('ITENS DO PEDIDO:')) { capturing = true; continue; }
                        if (line.includes('Total:') || line.includes('Subtotal:') || line.includes('---')) { capturing = false; break; }
                        
                        // Captura linhas que começam com * ou •
                        if (capturing && (line.trim().startsWith('*') || line.trim().startsWith('•'))) { 
                            // Remove caracteres especiais e pega só o nome principal
                            let cleanName = line.replace(/[*•]/g, '').trim();
                            // Remove preço entre parênteses se houver
                            cleanName = cleanName.split('(')[0].trim();
                            itensFound.push(cleanName);
                        }
                    }
                    
                    if (itensFound.length > 0) {
                        // Mostra os 2 primeiros itens e "...mais X"
                        if (itensFound.length > 2) {
                            listaItens = `${itensFound[0]}, ${itensFound[1]} e mais ${itensFound.length - 2}`;
                        } else {
                            listaItens = itensFound.join(', ');
                        }
                    }
                     
                     // HTML do Card
                     htmlHistorico += `
                         <div class="history-card status-${status}" onclick="window.AppRastreamento.abrirModalDetalhesPedido('${p.id}')">
                             <div class="history-header">
                                 <span class="history-id">
                                    <i class="fas fa-receipt" style="color: var(--primary-color);"></i> #${p.id}
                                 </span>
                                 <span class="history-date">${dataPedido}</span>
                             </div>
                             <div class="history-body">
                                 <p class="history-items">${listaItens}</p>
                             </div>
                             <div class="history-footer">
                                 <div class="history-badge ${status}">
                                     <i class="fas ${label.icon}"></i> ${label.text}
                                 </div>
                                 <span class="history-total">${totalFormatado}</span>
                             </div>
                         </div>
                     `;
                 });
                 htmlHistorico += `</div>`; // fecha container
            } else {
                 // Estado Vazio (Empty State)
                 htmlHistorico = `
                    <div style="text-align: center; padding: 40px 20px; color: #999;">
                        <i class="fas fa-cookie-bite" style="font-size: 3rem; margin-bottom: 15px; color: #ffccd5;"></i>
                        <p>Você ainda não fez nenhum pedido.</p>
                        <p style="font-size: 0.85rem;">Que tal pedir um doce agora?</p>
                    </div>`;
            }
            
            // Atualiza também o display do endereço na home
            if (window.AppUI.elementos.homeEndereco) {
                window.AppUI.elementos.homeEndereco.innerHTML = `
                    <div style="background: #fff0f5; padding: 15px; border-radius: 12px; border: 1px dashed #ff69b4; display: flex; align-items: start; gap: 10px;">
                        <i class="fas fa-map-marker-alt" style="color: #ff69b4; margin-top: 3px;"></i>
                        <div>
                            <strong style="color: #db7093; display: block; margin-bottom: 3px;">Endereço Atual</strong>
                            <span style="font-size: 0.9rem; color: #555;">${window.app.clientePerfil.endereco || 'Toque em "Editar" para adicionar.'}</span>
                        </div>
                    </div>
                `;
            }
            
            elementos.statusUltimoPedido.innerHTML = htmlHistorico;
            
        } catch (error) {
            elementos.statusUltimoPedido.innerHTML = '<p style="text-align:center; color: red;">Erro ao carregar histórico.</p>';
            console.error('Erro:', error);
        }
    }
    
    /**
     * Abre o modal com detalhes completos de um pedido.
     */
    async function abrirModalDetalhesPedido(pedidoId) {
        if (!pedidoId) return;

        const elementos = window.AppUI.elementos;
        
        // Preenche info básica enquanto carrega
        elementos.detalhesPedidoId.textContent = `#${pedidoId}`;
        elementos.detalhesPedidoContent.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary-color);"></i>
                <p style="margin-top: 10px; color: #666;">Carregando detalhes...</p>
            </div>`;
        
        elementos.modalDetalhesPedido.style.display = 'flex';

        // Busca dados completos
        const pedido = await window.AppAPI.buscarDetalhesPedidoPorId(pedidoId);

        if (!pedido) {
            elementos.detalhesPedidoContent.innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar detalhes.</p>';
            return;
        }
        
        const dataPedido = new Date(pedido.created_at).toLocaleString('pt-BR');
        const status = (pedido.status || 'novo').toUpperCase();
        const total = window.AppUI.formatarMoeda(pedido.total);
        
        // Parse da observação
        const rawObs = pedido.observacoes || "";
        let itensHtml = "";
        let resumoFinanceiroHtml = "";
        
        if (rawObs.includes('Itens:') || rawObs.includes('ITENS DO PEDIDO:')) {
            // Tenta separar a parte dos itens da parte financeira
            let parts = [];
            if (rawObs.includes('Subtotal:')) parts = rawObs.split('Subtotal:');
            else if (rawObs.includes('----------------------------')) parts = rawObs.split('----------------------------');
            
            const itensPart = parts[0].replace('Itens:', '').replace('ITENS DO PEDIDO:', '').trim();
            const financeiroPart = parts.length > 1 ? parts[1] : ''; // Pega o resto
            
            // Formata itens como lista HTML
            itensHtml = itensPart.split('\n').map(line => {
                const cleanLine = line.trim();
                if(!cleanLine) return '';
                // Adiciona borda leve entre itens
                return `<li style="margin-bottom: 8px; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; color: #444;">${cleanLine}</li>`;
            }).join('');
            
            // Se tiver parte financeira, formata
            if (financeiroPart) {
                // Recupera informações de entrega, se houver
                const restante = financeiroPart.split('OBSERVAÇÕES ADICIONAIS:');
                resumoFinanceiroHtml = restante[0].trim().replace(/\n/g, '<br>');
            }
        } else {
            itensHtml = `<li>${rawObs}</li>`;
        }

        const podeCancelar = status === 'NOVO';

        // Monta o HTML final do modal
        elementos.detalhesPedidoContent.innerHTML = `
            <div style="background: #f9f9f9; padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #666; font-size: 0.9rem;">Data:</span>
                    <strong style="font-size: 0.9rem;">${dataPedido}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #666; font-size: 0.9rem;">Pagamento:</span>
                    <strong style="font-size: 0.9rem;">${pedido.forma_pagamento}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ddd;">
                    <span style="font-size: 1.1rem; color: var(--primary-dark); font-weight: 700;">Total</span>
                    <span style="font-size: 1.1rem; color: var(--primary-dark); font-weight: 700;">${total}</span>
                </div>
            </div>

            <h4 style="font-size: 1rem; margin-bottom: 15px; color: #333; border-left: 4px solid var(--primary-color); padding-left: 10px;">
                Itens do Pedido
            </h4>
            <ul style="list-style: none; padding: 0; margin: 0 0 20px 0; font-size: 0.9rem;">
                ${itensHtml}
            </ul>
            
            ${resumoFinanceiroHtml ? `
                <div style="font-size: 0.85rem; color: #666; background: #fff; border: 1px dashed #ddd; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <strong>Resumo Financeiro:</strong><br>
                    Subtotal: ${resumoFinanceiroHtml}
                </div>` : ''}

            ${podeCancelar ? `
                <button id="btn-cancelar-pedido-cliente" data-id="${pedido.id}" class="btn-login-app" style="background: white; color: var(--error-color); border: 1px solid var(--error-color); margin-top: 10px; width: 100%;">
                    <i class="fas fa-times-circle"></i> Cancelar Pedido
                </button>
                <p style="text-align: center; font-size: 0.8rem; color: #999; margin-top: 5px;">Você só pode cancelar enquanto o pedido não for aceito.</p>
            ` : ''}
        `;
        
        if (podeCancelar) {
             document.getElementById('btn-cancelar-pedido-cliente').addEventListener('click', () => {
                 cancelarPedidoCliente(pedido.id);
             });
        }
    }
    
    /**
     * Lógica para o cliente cancelar o próprio pedido.
     */
    async function cancelarPedidoCliente(pedidoId) {
        // Usa SweetAlert se disponível, senão confirm nativo
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title: 'Cancelar Pedido?',
                text: "Tem certeza que deseja cancelar? Essa ação não pode ser desfeita.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sim, cancelar',
                cancelButtonText: 'Voltar'
            });
            if (!result.isConfirmed) return;
        } else {
            if (!confirm(`Tem certeza que deseja CANCELAR o Pedido #${pedidoId}?`)) return;
        }

        try {
            const sucesso = await window.AppAPI.cancelarPedidoNoSupabase(pedidoId);

            if (sucesso) {
                 window.AppUI.mostrarMensagem(`Pedido cancelado com sucesso.`, 'success');
            } else {
                 window.AppUI.mostrarMensagem(`Não foi possível cancelar (o pedido já pode estar em preparo).`, 'warning');
            }
            
            window.AppUI.fecharModal(window.AppUI.elementos.modalDetalhesPedido);
            
            // Se o pedido cancelado era o ativo, reinicia o tracker e recarrega o histórico
            if (window.app.pedidoAtivoId == pedidoId) {
                // Ao iniciar o rastreamento novamente, ele vai detectar o status 'cancelado' e atualizar a UI
                iniciarRastreamento(pedidoId);
            } else {
                carregarStatusUltimoPedido();
            }

        } catch (error) {
            console.error("Erro ao cancelar:", error);
            window.AppUI.mostrarMensagem('Erro de conexão.', 'error');
        }
    }

    // Expõe as funções globalmente
    window.AppRastreamento = {
        iniciarRastreamento,
        pararRastreamento,
        atualizarTrackerUI,
        carregarStatusUltimoPedido,
        abrirModalDetalhesPedido,
        cancelarPedidoCliente
    };

})();