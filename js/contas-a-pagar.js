// js/contas-a-pagar.js - Gestão de Contas a Pagar
document.addEventListener('DOMContentLoaded', function() {
    
    // --- AUTENTICAÇÃO ---
    if (!window.sistemaAuth || !window.sistemaAuth.verificarAutenticacao()) {
        window.location.href = 'login.html';
        return;
    }
    const usuario = window.sistemaAuth.usuarioLogado;
    
    // Elementos do DOM
    const alertContainer = document.getElementById('alert-container');
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');
    const contasPendentesBody = document.getElementById('contas-pendentes-body');
    const contasHistoricoBody = document.getElementById('contas-historico-body');
    const contasReceberBody = document.getElementById('contas-receber-body'); // NOVO
    const formNovaConta = document.getElementById('form-nova-conta');
    const formEditarConta = document.getElementById('form-editar-conta');
    const modalEditarConta = document.getElementById('modal-editar-conta');
    
    let todasContas = [];
    let contasAReceber = [];

    // --- FUNÇÕES AUXILIARES ---
    const mostrarMensagem = (mensagem, tipo = 'success') => {
        if (!alertContainer) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.innerHTML = `<span>${mensagem}</span><button onclick="this.parentElement.remove()">&times;</button>`;
        alertContainer.appendChild(alertDiv);
        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
    };

    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    const formatarData = (dataString) => {
        if (!dataString) return 'N/A';
        try {
             // Usa o formato ISO local 'sv-SE' para forçar a data a ser tratada como local e evitar problemas de fuso
            const [ano, mes, dia] = dataString.split('-');
            const dataObj = new Date(ano, mes - 1, dia);

            return dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (error) {
            return dataString;
        }
    }
    
    const toggleLoading = (show) => {
        loadingElement.style.display = show ? 'block' : 'none';
        contentElement.style.display = show ? 'none' : 'block';
    };
    
    // Função global para fechar modal (necessária para onclick no HTML)
    function fecharModalContas() {
        document.getElementById('modal-editar-conta').style.display = 'none';
    }
    window.fecharModalContas = fecharModalContas;
    
    // --- INICIALIZAÇÃO ---
    async function inicializarContas() {
        toggleLoading(true);
        try {
            // Teste de conexão básico
            const { error } = await supabase.from('sistema_usuarios').select('id').limit(1);
            if (error) throw error;
            
            configurarEventListeners();
            // Carrega ambas as listas
            await Promise.all([
                carregarContasAPagar(),
                carregarContasAReceber()
            ]);
            
        } catch (error) {
            console.error('Erro na inicialização do Gerencial:', error);
            toggleLoading(false);
            errorElement.style.display = 'block';
            errorElement.innerHTML = `
                <h2>Erro de Conexão</h2>
                <p>Não foi possível conectar ao banco de dados.</p>
                <p>Detalhes do erro: ${error.message}</p>
                <button onclick="location.reload()" class="btn btn-primary">Tentar Novamente</button>
            `;
        }
        toggleLoading(false);
        // Garante que a primeira aba esteja ativa ao carregar
        document.getElementById('contas-pendentes').classList.add('active');
    }

    // --- EVENT LISTENERS ---
    function configurarEventListeners() {
        if (formNovaConta) formNovaConta.addEventListener('submit', criarConta);
        if (formEditarConta) formEditarConta.addEventListener('submit', salvarEdicaoConta);
        document.getElementById('aplicar-filtro')?.addEventListener('click', carregarContasAPagar);
        
        document.getElementById('fechar-modal-editar-conta')?.addEventListener('click', fecharModalContas);
        window.addEventListener('click', (e) => {
            if (e.target === modalEditarConta) fecharModalContas();
        });
    }

    // -----------------------------------------------------------
    // --- CONTAS A PAGAR (EXISTENTE) ---
    // -----------------------------------------------------------
    
    async function carregarContasAPagar() {
        if (!contasPendentesBody || !contasHistoricoBody) return;
        
        contasPendentesBody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><div class="loading-spinner"></div> Carregando...</td></tr>';
        contasHistoricoBody.innerHTML = '<tr><td colspan="5" style="text-align: center;"><div class="loading-spinner"></div> Carregando...</td></tr>';
        
        try {
            const { data, error } = await supabase.from('contas_a_pagar')
                .select('*')
                .order('data_vencimento', { ascending: true });
                
            if (error) throw error;
            
            todasContas = data || [];
            
            // Filtros de exibição
            const filtroVencimento = document.getElementById('filtro-vencimento')?.value || 'proximo';
            const termoBusca = document.getElementById('search-contas')?.value.toLowerCase().trim() || '';

            const contasPendentes = todasContas.filter(conta => 
                !conta.data_pagamento && (!termoBusca || 
                    conta.descricao.toLowerCase().includes(termoBusca) || 
                    (conta.fornecedor || '').toLowerCase().includes(termoBusca)
                )
            );
            
            const contasPagas = todasContas.filter(conta => 
                conta.data_pagamento && (!termoBusca || 
                    conta.descricao.toLowerCase().includes(termoBusca) || 
                    (conta.fornecedor || '').toLowerCase().includes(termoBusca)
                )
            );

            exibirContasPendentes(contasPendentes, filtroVencimento);
            exibirHistorico(contasPagas);
            
        } catch (error) {
            console.error('❌ Erro ao carregar contas a pagar:', error);
            contasPendentesBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--error-color);">Erro ao carregar contas a pagar.</td></tr>';
            contasHistoricoBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--error-color);">Erro ao carregar histórico.</td></tr>';
            mostrarMensagem('Erro ao carregar contas a pagar. Verifique se a tabela `contas_a_pagar` existe.', 'error');
        }
    }

    function exibirContasPendentes(contas, filtro) {
        if (!contasPendentesBody) return;
        
        // ... (restante da lógica de exibição de contas a pagar, inalterada)
        
        // Aplica o filtro de vencimento
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const contasFiltradas = contas.filter(conta => {
            const dataVencimento = new Date(conta.data_vencimento + 'T00:00:00'); 
            
            if (filtro === 'vencido') {
                return dataVencimento < hoje;
            } else if (filtro === 'proximo') {
                const dataLimite = new Date(hoje);
                dataLimite.setDate(hoje.getDate() + 7);
                return dataVencimento >= hoje && dataVencimento <= dataLimite;
            }
            return true;
        });

        contasPendentesBody.innerHTML = '';

        if (contasFiltradas.length === 0) {
            contasPendentesBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">Nenhuma conta pendente encontrada com este filtro.</td></tr>';
            return;
        }

        contasFiltradas.forEach(conta => {
            const tr = document.createElement('tr');
            const dataVencimento = new Date(conta.data_vencimento + 'T00:00:00'); 
            let statusClass = 'pendente';
            let statusText = 'Pendente';

            if (dataVencimento < hoje) {
                statusClass = 'vencido';
                statusText = 'Vencida';
            }

            tr.innerHTML = `
                <td>${formatarData(conta.data_vencimento)}</td>
                <td>${conta.descricao}</td>
                <td>${conta.fornecedor || 'N/A'}</td>
                <td>${formatarMoeda(conta.valor)}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas fa-${statusClass === 'vencido' ? 'exclamation-circle' : 'clock'}"></i>
                        ${statusText}
                    </span>
                </td>
                <td>
                    <button class="btn-edit" onclick="editarConta('${conta.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-success" onclick="marcarComoPaga('${conta.id}')" title="Marcar como Pago">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-danger" onclick="excluirConta('${conta.id}', '${conta.descricao}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            contasPendentesBody.appendChild(tr);
        });
    }

    function exibirHistorico(contas) {
        if (!contasHistoricoBody) return;
        // ... (restante da lógica de exibição de histórico, inalterada)
        contasHistoricoBody.innerHTML = '';

        if (contas.length === 0) {
            contasHistoricoBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">Nenhuma conta paga encontrada.</td></tr>';
            return;
        }

        contas.forEach(conta => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatarData(conta.data_vencimento)}</td>
                <td>${conta.descricao}</td>
                <td>${formatarMoeda(conta.valor)}</td>
                <td>
                    <span class="status-badge pago">
                        <i class="fas fa-check-circle"></i>
                        ${formatarData(conta.data_pagamento)}
                    </span>
                </td>
                <td>
                    <button class="btn-secondary" onclick="reverterPagamento('${conta.id}', '${conta.descricao}')" title="Reverter Pagamento">
                        <i class="fas fa-undo"></i>
                    </button>
                </td>
            `;
            contasHistoricoBody.appendChild(tr);
        });
    }
    
    // ... (restante das funções de CRUD de Contas a Pagar, inalteradas)

    async function criarConta(e) {
        e.preventDefault();
        
        const descricao = document.getElementById('conta-descricao').value.trim();
        const fornecedor = document.getElementById('conta-fornecedor').value.trim();
        const valor = parseFloat(document.getElementById('conta-valor').value);
        const vencimento = document.getElementById('conta-vencimento').value;
        const observacoes = document.getElementById('conta-observacoes').value.trim();

        if (!descricao || isNaN(valor) || valor <= 0 || !vencimento) {
            mostrarMensagem('Preencha a descrição, o valor e a data de vencimento corretamente.', 'error');
            return;
        }

        try {
            const { error } = await supabase.from('contas_a_pagar').insert({
                descricao: descricao,
                fornecedor: fornecedor || null,
                valor: valor,
                data_vencimento: vencimento,
                observacoes: observacoes || null,
                usuario_cadastro_id: usuario.id
            });

            if (error) throw error;
            
            mostrarMensagem('Conta cadastrada com sucesso!', 'success');
            formNovaConta.reset();
            await carregarContasAPagar();
            // Volta para a lista
            document.querySelector('.tab-btn[data-tab="contas-pendentes"]').click(); 
        } catch (error) {
            console.error('❌ Erro ao criar conta:', error);
            mostrarMensagem('Erro ao cadastrar conta: ' + error.message, 'error');
        }
    }

    window.editarConta = async function(contaId) {
        try {
            const conta = todasContas.find(c => c.id === contaId);
            if (!conta) throw new Error('Conta não encontrada');
            
            document.getElementById('editar-conta-id').value = conta.id;
            document.getElementById('editar-conta-descricao').value = conta.descricao;
            document.getElementById('editar-conta-fornecedor').value = conta.fornecedor || '';
            document.getElementById('editar-conta-valor').value = conta.valor;
            document.getElementById('editar-conta-vencimento').value = conta.data_vencimento;
            document.getElementById('editar-conta-observacoes').value = conta.observacoes || '';
            
            modalEditarConta.style.display = 'flex';
        } catch (error) {
            console.error('Erro ao carregar conta para edição:', error);
            mostrarMensagem('Erro ao carregar dados da conta: ' + error.message, 'error');
        }
    };
    
    async function salvarEdicaoConta(e) {
        e.preventDefault();
        
        const id = document.getElementById('editar-conta-id').value;
        const descricao = document.getElementById('editar-conta-descricao').value.trim();
        const fornecedor = document.getElementById('editar-conta-fornecedor').value.trim();
        const valor = parseFloat(document.getElementById('editar-conta-valor').value);
        const vencimento = document.getElementById('editar-conta-vencimento').value;
        const observacoes = document.getElementById('editar-conta-observacoes').value.trim();

        if (!descricao || isNaN(valor) || valor <= 0 || !vencimento) {
            mostrarMensagem('Preencha a descrição, o valor e a data de vencimento corretamente.', 'error');
            return;
        }
        
        try {
            const { error } = await supabase.from('contas_a_pagar')
                .update({
                    descricao: descricao,
                    fornecedor: fornecedor || null,
                    valor: valor,
                    data_vencimento: vencimento,
                    observacoes: observacoes || null,
                    usuario_ultima_edicao_id: usuario.id
                })
                .eq('id', id);

            if (error) throw error;

            mostrarMensagem('Conta atualizada com sucesso!', 'success');
            fecharModalContas();
            await carregarContasAPagar();
        } catch (error) {
            console.error('❌ Erro ao atualizar conta:', error);
            mostrarMensagem('Erro ao atualizar conta: ' + error.message, 'error');
        }
    }

    window.marcarComoPaga = async function(contaId) {
        if (!confirm('Confirmar o pagamento desta conta?')) return;
        
        try {
            // Data de pagamento é hoje (formato ISO para o banco)
            const dataPagamento = new Date().toISOString().split('T')[0];
            
            const { error } = await supabase.from('contas_a_pagar')
                .update({ 
                    data_pagamento: dataPagamento,
                    usuario_pagamento_id: usuario.id
                })
                .eq('id', contaId);

            if (error) throw error;
            
            mostrarMensagem('Conta marcada como paga e movida para o histórico!', 'success');
            await carregarContasAPagar();
            // Abre a aba de histórico
            document.querySelector('.tab-btn[data-tab="historico"]').click();
        } catch (error) {
            console.error('❌ Erro ao marcar como paga:', error);
            mostrarMensagem('Erro ao registrar pagamento: ' + error.message, 'error');
        }
    }
    
    window.reverterPagamento = async function(contaId, descricao) {
        if (!confirm(`Tem certeza que deseja REVERTER o pagamento da conta "${descricao}"?`)) return;
        
        try {
            const { error } = await supabase.from('contas_a_pagar')
                .update({ 
                    data_pagamento: null,
                    usuario_pagamento_id: null // Limpa o usuário que pagou
                })
                .eq('id', contaId);

            if (error) throw error;
            
            mostrarMensagem('Pagamento revertido! Conta retornou para a lista de pendentes.', 'info');
            await carregarContasAPagar();
            // Abre a aba de pendentes
            document.querySelector('.tab-btn[data-tab="contas-pendentes"]').click();
        } catch (error) {
            console.error('❌ Erro ao reverter pagamento:', error);
            mostrarMensagem('Erro ao reverter pagamento: ' + error.message, 'error');
        }
    }

    window.excluirConta = async function(contaId, descricao) {
        if (!confirm(`Tem certeza que deseja EXCLUIR a conta "${descricao}"?\nEsta ação é irreversível!`)) return;
        
        try {
            const { error } = await supabase.from('contas_a_pagar')
                .delete()
                .eq('id', contaId);
                
            if (error) throw error;
            
            mostrarMensagem(`Conta "${descricao}" excluída com sucesso!`, 'success');
            await carregarContasAPagar();
        } catch (error) {
            console.error('❌ Erro ao excluir conta:', error);
            mostrarMensagem('Erro ao excluir conta: ' + error.message, 'error');
        }
    }


    // -----------------------------------------------------------
    // --- NOVO: CONTAS A RECEBER (BASEADO EM ENCOMENDAS) ---
    // -----------------------------------------------------------
    
    async function carregarContasAReceber() {
        if (!contasReceberBody) return;

        contasReceberBody.innerHTML = '<tr><td colspan="7" style="text-align: center;"><div class="loading-spinner"></div> Carregando...</td></tr>';
        
        try {
            // Busca todas as encomendas que NÃO estão como 'concluida'
            const { data, error } = await supabase.from('encomendas')
                .select('*, cliente:clientes(nome)')
                .neq('status', 'concluida') 
                .order('data_entrega', { ascending: true });
                
            if (error) throw error;

            // Filtra apenas as encomendas que têm saldo a receber
            contasAReceber = (data || []).filter(enc => (enc.valor_total - enc.sinal_pago) > 0);
            
            exibirContasAReceber(contasAReceber);

        } catch (error) {
            console.error('❌ Erro ao carregar contas a receber:', error);
            contasReceberBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--error-color);">Erro ao carregar contas a receber.</td></tr>';
            mostrarMensagem('Erro ao carregar Contas a Receber. Verifique se as tabelas `encomendas` e `clientes` existem.', 'error');
        }
    }

    function exibirContasAReceber(contas) {
        if (!contasReceberBody) return;
        contasReceberBody.innerHTML = '';

        if (contas.length === 0) {
            contasReceberBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666;">Nenhuma conta a receber pendente.</td></tr>';
            return;
        }

        contas.forEach(conta => {
            const valorAReceber = conta.valor_total - conta.sinal_pago;
            
            let statusClass = 'a-receber';
            let statusText = 'A Receber';
            
            if (conta.sinal_pago > 0 && valorAReceber > 0) {
                statusClass = 'parcialmente-pago';
                statusText = 'Parcialmente Pago';
            }
            
            // Reutiliza a data de entrega como "Vencimento" para a gestão de recebíveis
            const dataVencimento = formatarData(conta.data_entrega); 

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dataVencimento}</td>
                <td>${conta.cliente?.nome || 'N/A'}</td>
                <td>${formatarMoeda(conta.valor_total)}</td>
                <td>${formatarMoeda(conta.sinal_pago)}</td>
                <td>${formatarMoeda(valorAReceber)}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas fa-hand-holding-usd"></i>
                        ${statusText}
                    </span>
                </td>
                <td>
                    <button class="btn-primary" onclick="receberSaldo('${conta.id}', '${conta.cliente?.nome || 'N/A'}', ${valorAReceber.toFixed(2)})" title="Confirmar Recebimento">
                        <i class="fas fa-check-double"></i> Receber
                    </button>
                </td>
            `;
            contasReceberBody.appendChild(tr);
        });
    }

    window.receberSaldo = async function(encomendaId, nomeCliente, valor) {
        if (!confirm(`Deseja confirmar o recebimento de R$ ${valor.toFixed(2).replace('.', ',')} do cliente ${nomeCliente}?\n\nIsso irá registrar a entrada no caixa e marcar a encomenda como PAGA/CONCLUÍDA.`)) return;

        try {
             // 1. Atualizar o status da encomenda (usa lógica do encomendas-principal.js)
             // Eu vou simular a chamada à função que já existe em encomendas-principal.js
             if (window.encomendasSupabase?.atualizarStatusEncomenda) {
                 await window.encomendasSupabase.atualizarStatusEncomenda(encomendaId, 'paga'); // Marca como paga primeiro
                 await window.encomendasSupabase.atualizarStatusEncomenda(encomendaId, 'concluida'); // Marca como concluída
             } else {
                 throw new Error('Módulo de encomendas não carregado. Não foi possível atualizar o status.');
             }
             
             // 2. Registrar a entrada no caixa (simulando que é uma venda final, como no encomendas-principal.js)
             const vendaData = {
                 data_venda: new Date().toISOString().split('T')[0],
                 cliente: nomeCliente,
                 total: valor,
                 forma_pagamento: 'dinheiro', // Assumimos dinheiro para simplificar o registro no caixa
                 observacoes: `Recebimento Saldo Encomenda #${encomendaId}`, 
                 usuario_id: usuario.id
             };
             
             if (window.vendasSupabase?.criarVenda) {
                 await window.vendasSupabase.criarVenda(vendaData);
             } else {
                 console.warn('Módulo de vendas não carregado. O registro do caixa não foi realizado.');
             }
            
            mostrarMensagem(`Recebimento de R$ ${valor.toFixed(2)} de ${nomeCliente} confirmado!`, 'success');
            await carregarContasAReceber(); // Recarrega a lista de recebíveis

        } catch (error) {
            console.error('❌ Erro ao confirmar recebimento:', error);
            mostrarMensagem('Erro ao registrar recebimento: ' + error.message, 'error');
        }
    }


    inicializarContas();
});