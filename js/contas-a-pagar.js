// js/contas-a-pagar.js - Gestão de Contas a Pagar (MODERNA)
document.addEventListener('DOMContentLoaded', function() {
    
    // --- AUTENTICAÇÃO E SEGURANÇA ---
    if (!window.sistemaAuth || !window.sistemaAuth.verificarAutenticacao()) {
        window.location.href = 'login.html';
        return;
    }
    const usuario = window.sistemaAuth.usuarioLogado;
    
    // VERIFICAÇÃO DE ACESSO (Admin/Gerente)
    const isAdminOrManager = ['administrador', 'admin', 'gerente', 'supervisor'].includes(usuario.tipo?.toLowerCase());
    
    // Elementos do DOM
    const alertContainer = document.getElementById('alert-container');
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');
    const acessoNegadoElement = document.getElementById('acesso-negado');
    const painelGerencialContent = document.getElementById('painel-gerencial-content');
    
    const contasPendentesBody = document.getElementById('contas-pendentes-body');
    const contasHistoricoBody = document.getElementById('contas-historico-body');
    const contasReceberBody = document.getElementById('contas-receber-body');
    // NOVO ELEMENTO: Crediário
    const crediarioDevedoresBody = document.getElementById('crediario-devedores-body');
    
    const formNovaConta = document.getElementById('form-nova-conta');
    const formEditarConta = document.getElementById('form-editar-conta');
    const modalEditarConta = document.getElementById('modal-editar-conta');
    const recorrenciaSelect = document.getElementById('conta-recorrencia');
    const parcelasInput = document.getElementById('conta-parcelas');
    
    // NOVOS ELEMENTOS DO MODAL CREDÍARIO
    const modalPagamentoCrediario = document.getElementById('modal-pagamento-crediario');
    const formPagamentoCrediario = document.getElementById('form-pagamento-crediario');
    const pagamentoCrediarioVendaId = document.getElementById('pagamento-crediario-venda-id');
    const pagamentoCrediarioClienteNome = document.getElementById('pagamento-crediario-cliente-nome');
    const pagamentoCrediarioValor = document.getElementById('pagamento-crediario-valor');
    const pagamentoCrediarioForma = document.getElementById('pagamento-crediario-forma');
    
    let todasContas = [];
    let contasAReceber = [];
    let vendasCrediario = []; // NOVO: Para armazenar as vendas Crediário

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
            const [ano, mes, dia] = dataString.split('-');
            const dataObj = new Date(ano, mes - 1, dia);

            return dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (error) {
            return dataString;
        }
    }
    
    const toggleLoading = (show) => {
        if (loadingElement) loadingElement.style.display = show ? 'block' : 'none';
        if (contentElement) contentElement.style.display = show ? 'none' : 'block';
    };
    
    function fecharModalContas() {
        if (modalEditarConta) modalEditarConta.style.display = 'none';
    }
    window.fecharModalContas = fecharModalContas;
    
    // Função para abrir e fechar o modal Crediário (Definida no HTML, mas re-declarada aqui para consistência)
    window.abrirModalCrediario = (vendaId, nomeCliente, valor) => {
        if (!modalPagamentoCrediario) return;
        
        pagamentoCrediarioVendaId.value = vendaId;
        pagamentoCrediarioClienteNome.textContent = nomeCliente;
        pagamentoCrediarioValor.textContent = formatarMoeda(valor);
        modalPagamentoCrediario.style.display = 'flex';
    };
    
    function fecharModalCrediario() {
        if (modalPagamentoCrediario) modalPagamentoCrediario.style.display = 'none';
        if (formPagamentoCrediario) formPagamentoCrediario.reset();
    }
    window.fecharModalCrediario = fecharModalCrediario;
    
    // --- LÓGICA DE TROCA DE ABAS PADRONIZADA ---
    function switchTab(tabId) {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        const activeContent = document.getElementById(tabId);
        
        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');

        // Garante que o conteúdo seja recarregado ao mudar para o Receber ou Pagar
        if (tabId === 'contas-a-receber') {
            carregarContasAReceber();
        }
        if (tabId === 'contas-pendentes' || tabId === 'historico') {
            carregarContasAPagar();
        }
        // NOVO: Carregar Crediário ao mudar para a aba
        if (tabId === 'crediario-devedores') {
            carregarVendasCrediario();
        }
    }

    // --- INICIALIZAÇÃO ---
    async function inicializarContas() {
        toggleLoading(true);
        
        if (!isAdminOrManager) {
            toggleLoading(false);
            if (acessoNegadoElement) acessoNegadoElement.style.display = 'block';
            return;
        }
        
        if (painelGerencialContent) painelGerencialContent.style.display = 'block';

        try {
            const { error } = await supabase.from('sistema_usuarios').select('id').limit(1);
            if (error) throw error;
            
            configurarEventListeners();
            await Promise.all([
                carregarContasAPagar(),
                carregarContasAReceber(),
                carregarVendasCrediario() // NOVO: Carregar Crediário na inicialização
            ]);
            
        } catch (error) {
            console.error('❌ Erro na inicialização do Gerencial:', error);
            toggleLoading(false);
            if (errorElement) errorElement.style.display = 'block';
        }
        toggleLoading(false);
        // Garante que a primeira aba visível seja ativada corretamente
        switchTab('contas-pendentes');
    }

    // --- EVENT LISTENERS ---
    function configurarEventListeners() {
        // Lógica de Tabs
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
        
        if (formNovaConta) formNovaConta.addEventListener('submit', criarConta);
        if (formEditarConta) formEditarConta.addEventListener('submit', salvarEdicaoConta);
        document.getElementById('aplicar-filtro')?.addEventListener('click', carregarContasAPagar);
        
        document.getElementById('fechar-modal-editar-conta')?.addEventListener('click', fecharModalContas);
        
        // Listeners para o novo modal Crediário
        document.getElementById('fechar-modal-crediario')?.addEventListener('click', fecharModalCrediario);
        if (formPagamentoCrediario) formPagamentoCrediario.addEventListener('submit', confirmarPagamentoCrediario);
        
        window.addEventListener('click', (e) => {
            if (e.target === modalEditarConta) fecharModalContas();
            if (e.target === modalPagamentoCrediario) fecharModalCrediario();
        });
        
        if (recorrenciaSelect) {
            recorrenciaSelect.addEventListener('change', () => {
                const duracaoGroup = document.getElementById('duracao-recorrencia-group');
                const isRecorrente = recorrenciaSelect.value !== 'unica';
                duracaoGroup.style.display = isRecorrente ? 'block' : 'none';
                if (isRecorrente) {
                    parcelasInput.setAttribute('required', 'required');
                } else {
                    parcelasInput.removeAttribute('required');
                }
            });
        }
    }

    // --- DASHBOARD DE ALERTAS (NOVAS FUNÇÕES) ---
    function atualizarDashboardAlertas(contas) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const fimDaSemana = new Date(hoje);
        fimDaSemana.setDate(hoje.getDate() + 7);
        
        const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        fimDoMes.setHours(23, 59, 59, 999);

        let totalVencido = 0;
        let totalSemana = 0;
        let totalMes = 0;
        
        contas.filter(c => !c.data_pagamento).forEach(conta => {
            const dataVencimento = new Date(conta.data_vencimento + 'T00:00:00'); 
            
            // Vencidas
            if (dataVencimento < hoje) {
                totalVencido += conta.valor;
            }
            
            // A Pagar na Semana (até o fim do dia)
            if (dataVencimento >= hoje && dataVencimento <= fimDaSemana) {
                 totalSemana += conta.valor;
            }
            
            // A Pagar no Mês (até o fim do mês, inclui vencidas)
            if (dataVencimento.getMonth() === hoje.getMonth() && dataVencimento.getFullYear() === hoje.getFullYear()) {
                 totalMes += conta.valor;
            } else if (dataVencimento < hoje) {
                 // Adiciona vencidas de meses anteriores no total do mês
                 totalMes += conta.valor;
            }
        });
        
        document.getElementById('alerta-vencido-valor').textContent = formatarMoeda(totalVencido);
        document.getElementById('alerta-semana-valor').textContent = formatarMoeda(totalSemana);
        document.getElementById('alerta-mes-valor').textContent = formatarMoeda(totalMes);
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
            
            atualizarDashboardAlertas(todasContas);
            
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
                <td class="action-buttons-table">
                    <button class="btn-acao-icon btn-edit-icon" onclick="editarConta('${conta.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-acao-icon btn-pago-icon" onclick="marcarComoPaga('${conta.id}')" title="Marcar como Pago">
                        <i class="fas fa-check-circle"></i>
                    </button>
                    <button class="btn-acao-icon btn-danger-icon" onclick="excluirConta('${conta.id}', '${conta.descricao}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            contasPendentesBody.appendChild(tr);
        });
    }

    function exibirHistorico(contas) {
        if (!contasHistoricoBody) return;
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
                <td class="action-buttons-table">
                    <button class="btn-acao-icon btn-edit-icon" onclick="reverterPagamento('${conta.id}', '${conta.descricao}')" title="Reverter Pagamento">
                        <i class="fas fa-undo"></i>
                    </button>
                </td>
            `;
            contasHistoricoBody.appendChild(tr);
        });
    }

    // --- LÓGICA DE RECORRÊNCIA E CRUD ---
    async function criarConta(e) {
        e.preventDefault();
        
        const descricao = document.getElementById('conta-descricao').value.trim();
        const fornecedor = document.getElementById('conta-fornecedor').value.trim();
        const valor = parseFloat(document.getElementById('conta-valor').value);
        const vencimento = document.getElementById('conta-vencimento').value;
        const observacoes = document.getElementById('conta-observacoes').value.trim();
        
        const recorrencia = recorrenciaSelect.value;
        const parcelas = parseInt(parcelasInput.value) || 1;

        if (!descricao || isNaN(valor) || valor <= 0 || !vencimento) {
            mostrarMensagem('Preencha a descrição, o valor e a data de vencimento corretamente.', 'error');
            return;
        }
        
        if (recorrencia !== 'unica' && (isNaN(parcelas) || parcelas < 2)) {
            mostrarMensagem('Para contas recorrentes, o número de parcelas deve ser 2 ou mais.', 'error');
            return;
        }

        try {
            if (recorrencia === 'unica') {
                 await cadastrarContaSimples(descricao, fornecedor, valor, vencimento, observacoes);
            } else {
                 await cadastrarContasRecorrentes(descricao, fornecedor, valor, vencimento, observacoes, recorrencia, parcelas);
            }

            mostrarMensagem(`Conta(s) cadastrada(s) com sucesso! Total de ${recorrencia === 'unica' ? '1' : parcelas} lançamento(s).`, 'success');
            formNovaConta.reset();
            recorrenciaSelect.value = 'unica';
            document.getElementById('duracao-recorrencia-group').style.display = 'none';
            await carregarContasAPagar();
            switchTab('contas-pendentes'); 
            
        } catch (error) {
            console.error('❌ Erro ao criar conta:', error);
            mostrarMensagem('Erro ao cadastrar conta: ' + error.message, 'error');
        }
    }
    
    async function cadastrarContaSimples(descricao, fornecedor, valor, vencimento, observacoes) {
        const { error } = await supabase.from('contas_a_pagar').insert({
            descricao: descricao,
            fornecedor: fornecedor || null,
            valor: valor,
            data_vencimento: vencimento,
            observacoes: observacoes || null,
            usuario_cadastro_id: usuario.id
        });

        if (error) throw error;
    }

    async function cadastrarContasRecorrentes(descricaoBase, fornecedor, valor, primeiroVencimentoStr, observacoes, tipoRecorrencia, numParcelas) {
        let proximaData = new Date(primeiroVencimentoStr + 'T00:00:00');
        const inserts = [];

        for (let i = 0; i < numParcelas; i++) {
            const numParcela = i + 1;
            const novaDescricao = `${descricaoBase} (Parcela ${numParcela}/${numParcelas})`;
            const dataVencimento = proximaData.toISOString().split('T')[0];

            inserts.push({
                descricao: novaDescricao,
                fornecedor: fornecedor || null,
                valor: valor,
                data_vencimento: dataVencimento,
                observacoes: observacoes || null,
                recorrencia_tipo: tipoRecorrencia,
                recorrencia_parcela: numParcela,
                usuario_cadastro_id: usuario.id
            });
            
            // Calcula a próxima data de vencimento
            if (tipoRecorrencia === 'mensal') {
                proximaData.setMonth(proximaData.getMonth() + 1);
            } else if (tipoRecorrencia === 'semestral') {
                proximaData.setMonth(proximaData.getMonth() + 6);
            } else if (tipoRecorrencia === 'anual') {
                proximaData.setFullYear(proximaData.getFullYear() + 1);
            }
        }

        const { error } = await supabase.from('contas_a_pagar').insert(inserts);
        if (error) throw error;
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
            console.error('❌ Erro ao carregar conta para edição:', error);
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
            switchTab('historico');
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
                    usuario_pagamento_id: null
                })
                .eq('id', contaId);

            if (error) throw error;
            
            mostrarMensagem('Pagamento revertido! Conta retornou para a lista de pendentes.', 'info');
            await carregarContasAPagar();
            switchTab('contas-pendentes');
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
    // --- CONTAS A RECEBER (Encomendas) ---
    // -----------------------------------------------------------
    
    async function carregarContasAReceber() {
        if (!contasReceberBody) return;

        contasReceberBody.innerHTML = '<tr><td colspan="7" style="text-align: center;"><div class="loading-spinner"></div> Carregando...</td></tr>';
        
        try {
            const { data, error } = await supabase.from('encomendas')
                .select('*, cliente:clientes(nome)')
                .neq('status', 'concluida') 
                .order('data_entrega', { ascending: true });
                
            if (error) throw error;

            contasAReceber = (data || []).filter(enc => (enc.valor_total - enc.sinal_pago) > 0);
            
            exibirContasAReceber(contasAReceber);

        } catch (error) {
            console.error('❌ Erro ao carregar contas a receber:', error);
            contasReceberBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--error-color);">Erro ao carregar contas a receber.</td></tr>';
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
             if (window.encomendasSupabase?.atualizarStatusEncomenda) {
                 await window.encomendasSupabase.atualizarStatusEncomenda(encomendaId, 'paga'); 
                 await window.encomendasSupabase.atualizarStatusEncomenda(encomendaId, 'concluida'); 
             } else {
                 throw new Error('Módulo de encomendas não carregado. Não foi possível atualizar o status.');
             }
             
             const vendaData = {
                 data_venda: new Date().toISOString().split('T')[0],
                 cliente: nomeCliente,
                 total: valor,
                 forma_pagamento: 'dinheiro', 
                 observacoes: `Recebimento Saldo Encomenda #${encomendaId}`, 
                 usuario_id: usuario.id
             };
             
             if (window.vendasSupabase?.criarVenda) {
                 await window.vendasSupabase.criarVenda(vendaData);
             } else {
                 console.warn('Módulo de vendas não carregado. O registro do caixa não foi realizado.');
             }
            
            mostrarMensagem(`Recebimento de R$ ${valor.toFixed(2)} de ${nomeCliente} confirmado!`, 'success');
            await carregarContasAReceber();
            await carregarContasAPagar();
            

        } catch (error) {
            console.error('❌ Erro ao confirmar recebimento:', error);
            mostrarMensagem('Erro ao registrar recebimento: ' + error.message, 'error');
        }
    }
    
    // -----------------------------------------------------------
    // --- MÓDULO: CREDÍARIO (VENDAS A PRAZO) ---
    // -----------------------------------------------------------
    
    async function carregarVendasCrediario() {
        if (!crediarioDevedoresBody) return;
        crediarioDevedoresBody.innerHTML = '<tr><td colspan="6" style="text-align: center;"><div class="loading-spinner"></div> Carregando...</td></tr>';
        
        try {
            // **BUSCAR APENAS OS DADOS DIRETOS DA TABELA VENDAS**
            // Filtra apenas por 'crediario' e total diferente de 0.00
            const { data: vendasData, error } = await supabase
                .from('vendas')
                .select('id, data_venda, total, created_at, cliente, usuario_id, forma_pagamento, observacoes')
                .eq('forma_pagamento', 'crediario')
                .neq('total', 0.00)
                .order('data_venda', { ascending: true });
            
            if (error) throw error;

            // **BUSCAR NOMES DOS USUÁRIOS EM PARALELO**
            const usuarioIds = [...new Set(vendasData.map(v => v.usuario_id).filter(Boolean))];
            const usuariosMap = new Map();
            
            if (usuarioIds.length > 0) {
                const { data: usuariosData } = await supabase
                    .from('sistema_usuarios')
                    .select('id, nome')
                    .in('id', usuarioIds);
                
                if (usuariosData) {
                    usuariosData.forEach(usuario => {
                        usuariosMap.set(usuario.id, usuario.nome);
                    });
                }
            }

            // **PROCESSAR OS DADOS FINAIS**
            const vendasProcessadas = (vendasData || []).map(venda => ({
                id: venda.id,
                data_venda: venda.data_venda,
                total: venda.total,
                created_at: venda.created_at,
                usuario: { 
                    nome: usuariosMap.get(venda.usuario_id) || 'Usuário Não Encontrado' 
                },
                cliente: { 
                    nome: venda.cliente || 'Cliente Não Informado' 
                }
            }));

            vendasCrediario = vendasProcessadas;
            exibirVendasCrediario(vendasCrediario);

        } catch (error) {
            console.error('❌ Erro ao carregar vendas Crediário:', error);
            crediarioDevedoresBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--error-color);">Erro ao carregar vendas Crediário.</td></tr>';
            mostrarMensagem('Erro ao carregar vendas do Crediário', 'error');
        }
    }

    function exibirVendasCrediario(vendas) {
        if (!crediarioDevedoresBody) return;
        crediarioDevedoresBody.innerHTML = '';

        if (vendas.length === 0) {
            crediarioDevedoresBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">Nenhuma venda no Crediário pendente.</td></tr>';
            return;
        }

        vendas.forEach(venda => {
            const dataVenda = formatarData(venda.data_venda);
            
            // O status é "Pendente" porque o total (que representa a dívida) é > 0
            const statusClass = 'pendente';
            const statusText = 'Pendente';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dataVenda}</td>
                <td>${venda.cliente?.nome || 'Cliente Removido'}</td>
                <td>${venda.usuario?.nome || 'N/A'}</td>
                <td>${formatarMoeda(venda.total)}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas fa-hand-holding-usd"></i>
                        ${statusText}
                    </span>
                </td>
                <td class="action-buttons-table">
                    <button class="btn-primary btn-sm" onclick="confirmarRecebimentoCrediario('${venda.id}', '${venda.cliente?.nome || 'N/A'}', ${venda.total.toFixed(2)})" title="Confirmar Recebimento">
                        <i class="fas fa-check-double"></i> Receber
                    </button>
                    </td>
            `;
            crediarioDevedoresBody.appendChild(tr);
        });
    }

    // Ação do botão "Receber" na tabela - ABRE O MODAL
    window.confirmarRecebimentoCrediario = async function(vendaId, nomeCliente, valor) {
        // Abre o modal para escolher a forma de pagamento
        window.abrirModalCrediario(vendaId, nomeCliente, valor);
    }
    
    // Função para processar o pagamento no modal
    async function confirmarPagamentoCrediario(e) {
        e.preventDefault();
        
        const vendaId = pagamentoCrediarioVendaId.value;
        const nomeCliente = pagamentoCrediarioClienteNome.textContent;
        // Pega o valor do elemento P, removendo formatação
        const valorTexto = pagamentoCrediarioValor.textContent;
        // Usa o Intl.NumberFormat para garantir que a leitura do valor formatado esteja correta
        const valor = parseFloat(valorTexto.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.'));
        const formaPagamento = pagamentoCrediarioForma.value;

        try {
            // 1. Criar uma NOVA VENDA para registrar a entrada de caixa e a forma de pagamento no relatório.
            const vendaData = {
                data_venda: new Date().toISOString().split('T')[0],
                cliente: nomeCliente,
                total: valor,
                forma_pagamento: formaPagamento, // Registra a forma real de pagamento
                observacoes: `Recebimento de Dívida Crediário ref. Venda Original #${vendaId}`,
                usuario_id: usuario.id
            };
             
            if (window.vendasSupabase?.criarVenda) {
                // Cria uma nova venda que entrará no caixa/relatórios com a forma correta.
                // Não adicionamos itens aqui, é apenas um registro financeiro.
                await window.vendasSupabase.criarVenda(vendaData); 
            } else {
                 throw new Error('Módulo de vendas não carregado. O registro da venda/caixa falhou.');
            }
            
            // 1b. NOVO TRECHO: Registrar a movimentação de caixa (Entrada) para que apareça na tabela de Movimentações de Caixa.
            if (window.encomendasSupabase?.registrarMovimentacao) {
                const movimentacaoData = {
                    data_caixa: new Date().toISOString().split('T')[0],
                    tipo: 'entrada',
                    valor: valor,
                    descricao: `Recebimento Crediário (${formaPagamento.toUpperCase()}) ref. Venda Original #${vendaId}`,
                    usuario_id: usuario.id
                };
                await window.encomendasSupabase.registrarMovimentacao(movimentacaoData);
                
                // AVISO AO USUÁRIO: Informar sobre a duplicidade de Dinheiro no Saldo Final
                if (formaPagamento === 'dinheiro') {
                    mostrarMensagem(`Atenção: O recebimento em Dinheiro foi registrado na Movimentação de Caixa. O Saldo Final será duplicado, pois já é somado nas Vendas. Considere registrar uma Saída manual para balancear.`, 'warning');
                }

            } else {
                console.warn('Módulo de encomendas (registrarMovimentacao) não carregado.');
            }
             
            // 2. Zerar o valor da VENDA ORIGINAL para tirar da lista de devedores.
            const { error } = await supabase.from('vendas')
                .update({ 
                    total: 0.00, // Zera o total para tirar da lista de devedores
                    observacoes: 'DÍVIDA CREDÍARIO PAGA. Forma Final: ' + formaPagamento.toUpperCase() + ' - ' + new Date().toLocaleDateString('pt-BR')
                })
                .eq('id', vendaId);

            if (error) throw error;
            
            mostrarMensagem(`Recebimento de ${formatarMoeda(valor)} de ${nomeCliente} (${formaPagamento}) confirmado!`, 'success');
            
            fecharModalCrediario();
            await carregarVendasCrediario(); // Recarrega a lista de devedores para remover o item

        } catch (error) {
            console.error('❌ Erro ao confirmar recebimento do Crediário:', error);
            mostrarMensagem('Erro ao registrar recebimento: ' + error.message, 'error');
        }
    }


    inicializarContas();
});