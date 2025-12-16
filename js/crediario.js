// js/crediario.js
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Verificação de Autenticação (Qualquer usuário logado pode acessar)
    if (!window.sistemaAuth || !window.sistemaAuth.verificarAutenticacao()) {
        window.location.href = 'login.html';
        return;
    }
    const usuario = window.sistemaAuth.usuarioLogado;
    
    // Elementos DOM
    const crediarioBody = document.getElementById('crediario-devedores-body');
    const alertContainer = document.getElementById('alert-container');
    
    // Modal Elementos
    const modalPagamento = document.getElementById('modal-pagamento-crediario');
    const formPagamento = document.getElementById('form-pagamento-crediario');
    const fecharModalBtn = document.getElementById('fechar-modal-crediario');
    
    // Campos do Modal
    const inputVendaId = document.getElementById('pagamento-crediario-venda-id');
    const spanClienteNome = document.getElementById('pagamento-crediario-cliente-nome');
    const spanValor = document.getElementById('pagamento-crediario-valor');
    const selectForma = document.getElementById('pagamento-crediario-forma');

    // --- Funções Auxiliares ---
    const mostrarMensagem = (mensagem, tipo = 'success') => {
        if (!alertContainer) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert-message alert-${tipo}`;
        alertDiv.innerHTML = `
            <div class="alert-content">
                <i class="fas ${tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${mensagem}</span>
            </div>
            <button class="close-alert" onclick="this.parentElement.remove()">&times;</button>
        `;
        alertContainer.appendChild(alertDiv);
        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
    };

    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    const formatarData = (dataString) => {
        if (!dataString) return 'N/A';
        try {
            // Tenta criar data, lidando com timestamp ou apenas data
            const data = new Date(dataString);
            return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (error) {
            return dataString;
        }
    };

    // --- Lógica Principal ---

    async function carregarCrediario() {
        if (!crediarioBody) return;
        crediarioBody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><div class="loading-spinner"></div> Carregando...</td></tr>';

        try {
            // Busca vendas com forma_pagamento 'crediario' e que ainda tenham total > 0 (dívida ativa)
            const { data: vendasData, error } = await supabase
                .from('vendas')
                .select('id, data_venda, total, created_at, cliente, usuario_id, forma_pagamento')
                .eq('forma_pagamento', 'crediario')
                .neq('total', 0.00) // Se for 0, está pago
                .order('data_venda', { ascending: true });

            if (error) throw error;

            // Busca nomes dos vendedores
            const usuarioIds = [...new Set(vendasData.map(v => v.usuario_id).filter(Boolean))];
            const usuariosMap = new Map();
            
            if (usuarioIds.length > 0) {
                const { data: usuariosData } = await supabase
                    .from('sistema_usuarios')
                    .select('id, nome')
                    .in('id', usuarioIds);
                
                if (usuariosData) {
                    usuariosData.forEach(user => usuariosMap.set(user.id, user.nome));
                }
            }

            renderizarTabela(vendasData, usuariosMap);

        } catch (error) {
            console.error('Erro ao carregar crediário:', error);
            crediarioBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--error-color);">Erro ao carregar dados.</td></tr>';
            mostrarMensagem('Erro de conexão ao buscar dados.', 'error');
        }
    }

    function renderizarTabela(vendas, usuariosMap) {
        crediarioBody.innerHTML = '';

        if (!vendas || vendas.length === 0) {
            crediarioBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">Nenhuma dívida de crediário encontrada.</td></tr>';
            return;
        }

        vendas.forEach(venda => {
            const tr = document.createElement('tr');
            const vendedor = usuariosMap.get(venda.usuario_id) || 'N/A';
            
            tr.innerHTML = `
                <td>${formatarData(venda.data_venda)}</td>
                <td style="font-weight: bold;">${venda.cliente || 'Cliente Não Identificado'}</td>
                <td>${vendedor}</td>
                <td style="color: var(--error-color); font-weight: bold;">${formatarMoeda(venda.total)}</td>
                <td><span class="status-badge pendente">Pendente</span></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="abrirRecebimento('${venda.id}', '${venda.cliente}', ${venda.total})">
                        <i class="fas fa-hand-holding-usd"></i> Receber
                    </button>
                </td>
            `;
            crediarioBody.appendChild(tr);
        });
    }

    // --- Modal e Pagamento ---

    window.abrirRecebimento = function(id, cliente, valor) {
        inputVendaId.value = id;
        spanClienteNome.textContent = cliente || 'Cliente';
        spanValor.textContent = formatarMoeda(valor);
        modalPagamento.style.display = 'flex';
    };

    const fecharModal = () => {
        modalPagamento.style.display = 'none';
        formPagamento.reset();
    };

    if (fecharModalBtn) fecharModalBtn.addEventListener('click', fecharModal);
    window.addEventListener('click', (e) => { if (e.target === modalPagamento) fecharModal(); });

    formPagamento.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const vendaId = inputVendaId.value;
        const nomeCliente = spanClienteNome.textContent;
        // Extrai número do texto formatado
        const valorTexto = spanValor.textContent;
        const valor = parseFloat(valorTexto.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
        const formaPagamento = selectForma.value;

        if (!vendaId || !valor) return;

        try {
            // 1. Criar NOVA VENDA para registrar a entrada no caixa agora
            const vendaNova = {
                data_venda: new Date().toISOString().split('T')[0],
                cliente: nomeCliente,
                total: valor,
                forma_pagamento: formaPagamento,
                observacoes: `Recebimento Crediário (Ref. Venda #${vendaId})`,
                usuario_id: usuario.id
            };

            if (window.vendasSupabase?.criarVenda) {
                await window.vendasSupabase.criarVenda(vendaNova);
            } else {
                throw new Error('Erro interno: Módulo de vendas indisponível.');
            }

            // 2. Registrar Movimentação de Caixa (se disponível)
            if (window.encomendasSupabase?.registrarMovimentacao) {
                await window.encomendasSupabase.registrarMovimentacao({
                    data_caixa: new Date().toISOString().split('T')[0],
                    tipo: 'entrada',
                    valor: valor,
                    descricao: `Recebimento Crediário (${formaPagamento}) - ${nomeCliente}`,
                    usuario_id: usuario.id
                });
            }

            // 3. Baixar a dívida original (Zerar o total da venda antiga)
            const { error } = await supabase.from('vendas')
                .update({ 
                    total: 0.00,
                    observacoes: `PAGO VIA CREDIÁRIO (${formaPagamento}) em ${new Date().toLocaleDateString('pt-BR')}`
                })
                .eq('id', vendaId);

            if (error) throw error;

            mostrarMensagem(`Recebimento de ${formatarMoeda(valor)} confirmado!`, 'success');
            fecharModal();
            carregarCrediario();

        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            mostrarMensagem('Erro ao processar pagamento: ' + error.message, 'error');
        }
    });

    // Inicializar
    carregarCrediario();
});