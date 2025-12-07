// js/encomendas-principal.js - Sistema completo de encomendas (VERSÃO FINAL CORRIGIDA)
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação
    const usuario = window.sistemaAuth?.verificarAutenticacao();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos do DOM
    const formEncomenda = document.getElementById('form-encomenda');
    const clienteEncomendaSearch = document.getElementById('cliente-encomenda-search');
    const clienteEncomendaId = document.getElementById('cliente-encomenda-id');
    const clienteEncomendaResults = document.getElementById('cliente-encomenda-results');
    const dataEntregaInput = document.getElementById('data-entrega');
    const tipoEntregaSelect = document.getElementById('tipo-entrega');
    const enderecoEntregaGroup = document.getElementById('endereco-entrega-group');
    const enderecoEntregaInput = document.getElementById('endereco-entrega');
    const detalhesEncomendaInput = document.getElementById('detalhes-encomenda');
    const valorTotalEncomendaInput = document.getElementById('valor-total-encomenda');
    const sinalEncomendaInput = document.getElementById('sinal-encomenda');
    const clientesTabelaBody = document.getElementById('clientes-tabela-body');
    const formCadastroCliente = document.getElementById('form-cadastro-cliente');
    
    // ================================================================
    // === INÍCIO DA CORREÇÃO (Seletor dos botões principais) ===
    // ================================================================
    // Procura por .tab-button que seja filho DIRETO de .tabs-nav
    const encomendasNavBtns = document.querySelectorAll('.tabs-nav > .tab-button');
    // Procura por .tab-button DENTRO de .tabs-header (para as sub-abas de Clientes)
    const tabButtons = document.querySelectorAll('.tabs-header .tab-button');
    // ================================================================
    // === FIM DA CORREÇÃO ===
    // ================================================================
    
    const pageContents = document.querySelectorAll('.page-content');
    const tabContents = document.querySelectorAll('.tab-content');
    const clienteIdEdicao = document.getElementById('cliente-id-edicao');

    // Elementos do Modal de Edição de Encomenda
    const modalEdicaoEncomenda = document.getElementById('modal-edicao-encomenda');
    const formEdicaoEncomenda = document.getElementById('form-edicao-encomenda');
    const closeEdicaoModalBtn = document.querySelector('.close-modal-btn');
    const editEncomendaId = document.getElementById('encomenda-id-edicao');
    const editClienteNome = document.getElementById('edit-cliente-nome');
    const editDataEntrega = document.getElementById('edit-data-entrega');
    const editTipoEntrega = document.getElementById('edit-tipo-entrega');
    const editEnderecoEntregaGroup = document.getElementById('edit-endereco-entrega-group');
    const editEnderecoEntrega = document.getElementById('edit-endereco-entrega');
    const editDetalhesEncomenda = document.getElementById('edit-detalhes-encomenda');
    const editValorTotalEncomenda = document.getElementById('edit-valor-total-encomenda');
    const editSinalEncomenda = document.getElementById('edit-sinal-encomenda');

    // Variáveis globais
    let clientes = [];
    let encomendas = [];

    // Elementos e funções auxiliares para o novo modal de pagamento
    const modalPagamento = document.getElementById('modal-pagamento-encomenda');
    const formPagamento = document.getElementById('form-pagamento-encomenda');
    const pagamentoValorPendente = document.getElementById('pagamento-valor-pendente');
    const pagamentoForma = document.getElementById('pagamento-forma');
    const pagamentoEncomendaId = document.getElementById('pagamento-encomenda-id');
    
    window.fecharModalPagamento = () => {
        if (modalPagamento) modalPagamento.style.display = 'none';
        if (formPagamento) formPagamento.reset();
    };
    
    window.abrirModalPagamento = (encomendaId) => {
        const encomenda = encomendas.find(enc => enc.id === encomendaId);
        if (!encomenda) {
            mostrarMensagem('Encomenda não encontrada.', 'error');
            return;
        }

        const valorPendente = (encomenda.valor_total - encomenda.sinal_pago);
        if (valorPendente <= 0) {
             mostrarMensagem('O saldo desta encomenda já está zerado. Marque como concluída diretamente.', 'info');
             marcarEncomendaComoConcluida(encomendaId);
             return;
        }

        pagamentoEncomendaId.value = encomenda.id;
        pagamentoValorPendente.textContent = `R$ ${valorPendente.toFixed(2).replace('.', ',')}`;
        if (modalPagamento) modalPagamento.style.display = 'flex';
    };
    
    async function confirmarPagamentoSaldo(event) {
        event.preventDefault();

        const encomendaId = pagamentoEncomendaId.value;
        const formaPagamentoSaldo = pagamentoForma.value;
        
        const encomenda = encomendas.find(enc => enc.id === encomendaId);
        if (!encomenda) return mostrarMensagem('Erro: Encomenda não encontrada.', 'error');

        const valorPendente = (encomenda.valor_total - encomenda.sinal_pago);
        
        try {
            // 1. Registrar o pagamento final como Venda (APENAS se houver valor pendente)
            if (valorPendente > 0) {
                const vendaData = {
                    data_venda: new Date().toISOString().split('T')[0],
                    cliente: encomenda.cliente?.nome || 'Cliente não identificado',
                    cliente_id: encomenda.cliente_id, 
                    total: valorPendente,
                    forma_pagamento: formaPagamentoSaldo, // USAR FORMA DE PAGAMENTO DO MODAL
                    observacoes: `Pagamento Saldo ref. Encomenda #${encomenda.id}`, 
                    usuario_id: usuario.id
                };

                if (window.vendasSupabase) {
                    // Criei uma venda para que o valor entre no Caixa e Relatórios corretamente
                    await window.vendasSupabase.criarVenda(vendaData);
                    mostrarMensagem(`Saldo de R$ ${valorPendente.toFixed(2)} registrado como Venda (${formaPagamentoSaldo})!`, 'info');
                } else {
                    console.error('Módulo VendasSupabase não encontrado. Registro de caixa falhou.');
                }
            }

            // 2. Atualizar o status da encomenda para "paga"
            await window.encomendasSupabase.atualizarStatusEncomenda(encomendaId, 'paga');

            mostrarMensagem('Encomenda marcada como paga e saldo registrado com sucesso!', 'success');
            window.fecharModalPagamento();
            await carregarEncomendas();
    
        } catch (error) {
            console.error('❌ ERRO AO REGISTRAR PAGAMENTO FINAL:', error);
            mostrarMensagem('Erro ao registrar pagamento final: ' + error.message, 'error');
        }
    }

    // Funções auxiliares de UI
    const mostrarMensagem = (mensagem, tipo = 'info') => {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.innerHTML = `<span>${mensagem}</span><button onclick="this.parentElement.remove()">&times;</button>`;
        alertContainer.appendChild(alertDiv);
        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
    };

    // Função principal de inicialização
    async function inicializarEncomendas() {
        try {
            await carregarDadosIniciais();
            configurarEventListeners();
            mostrarMensagem('Sistema de encomendas carregado com sucesso!', 'success');
        } catch (error) {
            mostrarMensagem('Erro ao carregar a página de encomendas: ' + error.message, 'error');
            console.error("Erro detalhado na inicialização:", error);
        }
    }
    
    // Funções de carregamento de dados
    async function carregarDadosIniciais() {
        await carregarClientes();
        await carregarEncomendas();
    }
    
    async function carregarClientes() {
        try {
            if (!window.encomendasSupabase) throw new Error('Módulo de comunicação com o Supabase não carregado.');
            clientes = await window.encomendasSupabase.buscarClientes();
            exibirClientesNaTabela();
        } catch (error) {
            mostrarMensagem('Erro ao carregar a lista de clientes: ' + error.message, 'error');
            clientes = [];
        }
    }

    async function carregarEncomendas() {
        const pendentesContainer = document.getElementById('encomendas-pendentes-container');
        const concluidasContainer = document.getElementById('encomendas-concluidas-container');
        if (!pendentesContainer || !concluidasContainer) return;

        pendentesContainer.innerHTML = '<p class="loading-message">Carregando encomendas pendentes...</p>';
        concluidasContainer.innerHTML = '<p class="loading-message">Carregando encomendas concluídas...</p>';

        try {
            if (!window.encomendasSupabase) throw new Error('Módulo de comunicação com o Supabase não carregado.');
            encomendas = await window.encomendasSupabase.buscarEncomendas();
            
            const encomendasPendentes = encomendas.filter(enc => enc.status !== 'concluida');
            const encomendasConcluidas = encomendas.filter(enc => enc.status === 'concluida');

            exibirListaEncomendas(encomendasPendentes, pendentesContainer, 'pendentes');
            exibirListaEncomendas(encomendasConcluidas, concluidasContainer, 'concluidas');

        } catch (error) {
            mostrarMensagem('Erro ao carregar a lista de encomendas: ' + error.message, 'error');
            encomendas = [];
            pendentesContainer.innerHTML = '<p class="empty-message">Erro ao carregar as encomendas.</p>';
            concluidasContainer.innerHTML = '<p class="empty-message">Erro ao carregar as encomendas.</p>';
        }
    }
    
    // Funções de exibição de dados
    function exibirClientesNaTabela() {
        if (!clientesTabelaBody) return;
        clientesTabelaBody.innerHTML = '';
        if (clientes.length === 0) {
            clientesTabelaBody.innerHTML = '<tr><td colspan="4" class="empty-message">Nenhum cliente cadastrado.</td></tr>';
        } else {
            clientes.forEach(cliente => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${cliente.nome}</td>
                    <td>${cliente.telefone || 'N/A'}</td>
                    <td>${cliente.cpf || 'N/A'}</td>
                    <td class="text-center">
                        <button class="btn-acao editar" title="Editar" data-id="${cliente.id}"><i class="fas fa-edit"></i></button>
                        <button class="btn-acao excluir" title="Excluir" data-id="${cliente.id}"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                clientesTabelaBody.appendChild(tr);
            });
            clientesTabelaBody.querySelectorAll('.btn-acao.editar').forEach(btn => {
                btn.addEventListener('click', (e) => editarCliente(e.currentTarget.dataset.id));
            });
            clientesTabelaBody.querySelectorAll('.btn-acao.excluir').forEach(btn => {
                btn.addEventListener('click', (e) => excluirCliente(e.currentTarget.dataset.id));
            });
        }
    }

    function exibirListaEncomendas(lista, container, tipo) {
        if (!container) return;
        container.innerHTML = '';
        if (lista.length === 0) {
            container.innerHTML = `<p class="empty-message">Nenhuma encomenda ${tipo === 'pendentes' ? 'pendente' : 'concluída'} encontrada.</p>`;
            return;
        }
        
        const tabela = document.createElement('table');
        tabela.className = 'tabela-encomendas';
        tabela.innerHTML = `
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Data Entrega</th>
                    <th>Detalhes</th>
                    <th>Total</th>
                    <th>Sinal</th>
                    <th>Pendente</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${lista.map(enc => {
                    const valorPendente = (enc.valor_total - enc.sinal_pago).toFixed(2);
                    const dataEntregaFormatada = new Date(enc.data_entrega + 'T03:00:00Z').toLocaleDateString('pt-BR');
                    return `
                    <tr>
                        <td>${enc.cliente?.nome || 'N/A'}</td>
                        <td>${dataEntregaFormatada}</td>
                        <td>${enc.detalhes.substring(0, 50)}...</td>
                        <td>R$ ${enc.valor_total.toFixed(2)}</td>
                        <td>R$ ${enc.sinal_pago.toFixed(2)}</td>
                        <td>R$ ${valorPendente}</td>
                        <td><span class="status-${enc.status}">${enc.status}</span></td>
                        <td class="actions-cell">
                            <button class="btn-acao pago" title="Marcar como Pago" data-id="${enc.id}" ${enc.status === 'paga' || enc.status === 'concluida' ? 'disabled' : ''}>
                                <i class="fas fa-check-circle"></i>
                            </button>
                            <button class="btn-acao concluido" title="Marcar como Concluído" data-id="${enc.id}" ${enc.status === 'concluida' ? 'disabled' : ''}>
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn-acao editar" title="Editar" data-id="${enc.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-acao excluir" title="Excluir" data-id="${enc.id}"><i class="fas fa-trash"></i></button>
                            <button class="btn-acao imprimir" title="Imprimir Canhoto" data-id="${enc.id}"><i class="fas fa-print"></i></button>
                        </td>
                    </tr>
                `;
                }).join('')}
            </tbody>
        `;
        container.appendChild(tabela);

        tabela.querySelectorAll('.btn-acao.pago').forEach(btn => btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.abrirModalPagamento(btn.dataset.id);
        }));
        tabela.querySelectorAll('.btn-acao.concluido').forEach(btn => btn.addEventListener('click', () => marcarEncomendaComoConcluida(btn.dataset.id)));
        tabela.querySelectorAll('.btn-acao.editar').forEach(btn => btn.addEventListener('click', () => editarEncomenda(btn.dataset.id)));
        tabela.querySelectorAll('.btn-acao.excluir').forEach(btn => btn.addEventListener('click', () => excluirEncomenda(btn.dataset.id)));
        tabela.querySelectorAll('.btn-acao.imprimir').forEach(btn => btn.addEventListener('click', () => imprimirCanhoto(btn.dataset.id)));
    }

    // Funções de eventos e navegação
    function configurarEventListeners() {
        if (formEncomenda) formEncomenda.addEventListener('submit', criarEncomenda);
        if (formCadastroCliente) formCadastroCliente.addEventListener('submit', cadastrarOuAtualizarCliente);
        
        tipoEntregaSelect.addEventListener('change', () => {
            enderecoEntregaGroup.style.display = tipoEntregaSelect.value === 'entrega' ? 'block' : 'none';
        });

        if (clienteEncomendaSearch) {
            clienteEncomendaSearch.addEventListener('input', buscarClientesNaInput);
            document.addEventListener('click', (e) => {
                if (!clienteEncomendaResults.contains(e.target) && e.target !== clienteEncomendaSearch) {
                    clienteEncomendaResults.style.display = 'none';
                }
            });
        }
        
        // Listener dos botões PRINCIPAIS ("Criar", "Lista", "Clientes")
        encomendasNavBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const page = btn.getAttribute('data-page');
                encomendasNavBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                pageContents.forEach(p => p.style.display = 'none');
                document.getElementById(`page-${page}`).style.display = 'block';
                if (page === 'lista-encomendas') await carregarEncomendas();
                if (page === 'clientes-submenu') await carregarClientes();
            });
        });
        
        // Listener das SUB-ABAS (dentro de "Clientes")
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                tabContents.forEach(c => c.style.display = 'none');
                document.getElementById(tabId).style.display = 'block';
            });
        });

        document.getElementById('logout-btn')?.addEventListener('click', () => window.sistemaAuth.fazerLogout());

        if (formEdicaoEncomenda) {
            formEdicaoEncomenda.addEventListener('submit', salvarEdicaoEncomenda);
            closeEdicaoModalBtn.addEventListener('click', () => modalEdicaoEncomenda.style.display = 'none');
            window.addEventListener('click', (event) => {
                if (event.target === modalEdicaoEncomenda) modalEdicaoEncomenda.style.display = 'none';
            });
        }
        
        // NOVO: Listener para o formulário de pagamento
        if (formPagamento) {
            formPagamento.addEventListener('submit', confirmarPagamentoSaldo);
        }

        editTipoEntrega.addEventListener('change', () => {
            editEnderecoEntregaGroup.style.display = editTipoEntrega.value === 'entrega' ? 'block' : 'none';
        });
    }
    
    // Lógica principal de Ações
    async function criarEncomenda(event) {
        event.preventDefault();
        const sinalEncomenda = parseFloat(sinalEncomendaInput.value) || 0;
        // NOVO: Capturar a forma de pagamento do sinal
        const formaPagamentoSinal = document.getElementById('forma-pagamento-sinal').value;
        
        const encomendaData = {
            cliente_id: clienteEncomendaId.value,
            data_entrega: dataEntregaInput.value,
            tipo_entrega: tipoEntregaSelect.value,
            endereco_entrega: tipoEntregaSelect.value === 'entrega' ? enderecoEntregaInput.value.trim() : null,
            detalhes: detalhesEncomendaInput.value.trim(),
            valor_total: parseFloat(valorTotalEncomendaInput.value),
            sinal_pago: sinalEncomenda,
            status: 'pendente',
            usuario_id: window.sistemaAuth.usuarioLogado.id
        };
        
        if (!encomendaData.cliente_id || !encomendaData.data_entrega || !encomendaData.detalhes || isNaN(encomendaData.valor_total) || encomendaData.valor_total <= 0) {
            mostrarMensagem('Preencha todos os campos obrigatórios e selecione um cliente válido.', 'error');
            return;
        }

        try {
            // 1. Criar a encomenda
            const novaEncomenda = await window.encomendasSupabase.criarEncomenda(encomendaData);

            // 2. Registrar o sinal como Venda (APENAS se houver sinal) para aparecer no Resumo do Caixa/Relatórios.
            if (sinalEncomenda > 0) {
                const vendaData = {
                    data_venda: new Date().toISOString().split('T')[0],
                    cliente: clienteEncomendaSearch.value,
                    cliente_id: encomendaData.cliente_id, 
                    total: sinalEncomenda,
                    forma_pagamento: formaPagamentoSinal, // USAR FORMA DE PAGAMENTO DO CAMPO
                    observacoes: `Adiantamento ref. Encomenda #${novaEncomenda.id}`, // REFERENCIAR ENCOMENDA
                    usuario_id: usuario.id
                };

                if (window.vendasSupabase) {
                    await window.vendasSupabase.criarVenda(vendaData);
                    mostrarMensagem(`Sinal de R$ ${sinalEncomenda.toFixed(2)} registrado como Venda (${formaPagamentoSinal})!`, 'info');
                } else {
                    console.error('Módulo VendasSupabase não encontrado. Registro de venda falhou.');
                }
            }

            mostrarMensagem(`Encomenda para ${clienteEncomendaSearch.value} criada com sucesso!`, 'success');
            formEncomenda.reset();
            clienteEncomendaId.value = '';
            clienteEncomendaSearch.value = '';
            enderecoEntregaGroup.style.display = 'none';
            await carregarEncomendas();
        } catch (error) {
            console.error('❌ ERRO AO CRIAR ENCOMENDA OU REGISTRAR SINAL:', error);
            mostrarMensagem('Erro ao processar a encomenda: ' + error.message, 'error');
        }
    }
    
    async function marcarEncomendaComoPaga(encomendaId) {
        // Esta função agora apenas abrirá o modal de pagamento, 
        // pois a lógica de registro foi movida para confirmarPagamentoSaldo()
        window.abrirModalPagamento(encomendaId);
    }

    async function marcarEncomendaComoConcluida(encomendaId) {
        if (!confirm('Tem certeza que deseja marcar esta encomenda como concluída?')) return;
        try {
            await window.encomendasSupabase.atualizarStatusEncomenda(encomendaId, 'concluida');
            mostrarMensagem('Encomenda marcada como concluída com sucesso!', 'success');
            await carregarEncomendas();
        } catch (error) {
            mostrarMensagem('Erro ao marcar encomenda como concluída: ' + error.message, 'error');
        }
    }

    async function excluirEncomenda(encomendaId) {
        if (!confirm('Atenção! Deseja realmente excluir esta encomenda? Esta ação é irreversível.')) return;
        try {
            await window.encomendasSupabase.excluirEncomenda(encomendaId);
            mostrarMensagem('Encomenda excluída com sucesso!', 'success');
            await carregarEncomendas();
        } catch (error) {
            mostrarMensagem('Erro ao excluir encomenda: ' + error.message, 'error');
        }
    }
    
    // Funções de Clientes e Edição de Encomendas
    function buscarClientesNaInput() {
        const termo = clienteEncomendaSearch.value.toLowerCase().trim();
        clienteEncomendaResults.innerHTML = '';
        if (termo.length < 2) {
            clienteEncomendaResults.style.display = 'none';
            return;
        }
        const resultados = clientes.filter(c => c.nome.toLowerCase().includes(termo) || (c.cpf && c.cpf.includes(termo)));
        if (resultados.length > 0) {
            resultados.forEach(cliente => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.textContent = `${cliente.nome} (${cliente.cpf || 'CPF: N/A'})`;
                div.onclick = () => selecionarCliente(cliente);
                clienteEncomendaResults.appendChild(div);
            });
            clienteEncomendaResults.style.display = 'block';
        }
    }

    function selecionarCliente(cliente) {
        clienteEncomendaSearch.value = cliente.nome;
        clienteEncomendaId.value = cliente.id;
        clienteEncomendaResults.style.display = 'none';
    }

    function editarCliente(clienteId) {
        const cliente = clientes.find(c => c.id === clienteId);
        if (cliente) {
            document.querySelector('.tab-button[data-tab="tab-cadastrar-cliente"]').click();
            clienteIdEdicao.value = cliente.id;
            document.getElementById('cliente-nome').value = cliente.nome;
            document.getElementById('cliente-telefone').value = cliente.telefone;
            document.getElementById('cliente-endereco').value = cliente.endereco;
            document.getElementById('cliente-cpf').value = cliente.cpf;
            document.getElementById('cliente-data-nascimento').value = cliente.data_nascimento;
        }
    }

    async function cadastrarOuAtualizarCliente(event) {
        event.preventDefault();
        const isEdicao = !!clienteIdEdicao.value;
        const clienteData = {
            nome: document.getElementById('cliente-nome').value.trim(),
            telefone: document.getElementById('cliente-telefone').value.trim(),
            endereco: document.getElementById('cliente-endereco').value.trim(),
            cpf: document.getElementById('cliente-cpf').value.trim(),
            data_nascimento: document.getElementById('cliente-data-nascimento').value.trim() || null
        };
        if (!clienteData.nome) return mostrarMensagem('O nome do cliente é obrigatório.', 'error');
        
        try {
            if (isEdicao) {
                await window.encomendasSupabase.atualizarCliente(clienteIdEdicao.value, clienteData);
                mostrarMensagem('Cliente atualizado com sucesso!', 'success');

            } else {
                await window.encomendasSupabase.criarCliente(clienteData);
                mostrarMensagem('Cliente cadastrado com sucesso!', 'success');
            }
            formCadastroCliente.reset();
            clienteIdEdicao.value = '';
            await carregarClientes();
            document.querySelector('.tab-button[data-tab="tab-lista-clientes"]').click();
        } catch (error) {
            mostrarMensagem(`Erro ao salvar cliente: ${error.message}`, 'error');
        }
    }

    async function excluirCliente(clienteId) {
        if (!confirm('Deseja realmente excluir este cliente?')) return;
        try {
            await window.encomendasSupabase.excluirCliente(clienteId);
            mostrarMensagem('Cliente excluído com sucesso!', 'success');
            await carregarClientes();
        } catch (error) {
            mostrarMensagem('Erro ao excluir cliente: ' + error.message, 'error');
        }
    }
    
    function editarEncomenda(encomendaId) {
        const encomenda = encomendas.find(enc => enc.id === encomendaId);
        if (encomenda) {
            editEncomendaId.value = encomenda.id;
            editClienteNome.value = encomenda.cliente?.nome || 'N/A';
            editDataEntrega.value = encomenda.data_entrega;
            editTipoEntrega.value = encomenda.tipo_entrega;
            editDetalhesEncomenda.value = encomenda.detalhes;
            editValorTotalEncomenda.value = encomenda.valor_total;
            editSinalEncomenda.value = encomenda.sinal_pago;
            editEnderecoEntrega.value = encomenda.endereco_entrega || '';
            editEnderecoEntregaGroup.style.display = encomenda.tipo_entrega === 'entrega' ? 'block' : 'none';
            modalEdicaoEncomenda.style.display = 'flex';
        }
    }

    async function salvarEdicaoEncomenda(event) {
        event.preventDefault();
        const encomendaData = {
            data_entrega: editDataEntrega.value,
            tipo_entrega: editTipoEntrega.value,
            endereco_entrega: editTipoEntrega.value === 'entrega' ? editEnderecoEntrega.value.trim() : null,
            detalhes: editDetalhesEncomenda.value.trim(),
            valor_total: parseFloat(editValorTotalEncomenda.value),
            sinal_pago: parseFloat(editSinalEncomenda.value) || 0,
        };
        try {
            await window.encomendasSupabase.atualizarEncomenda(editEncomendaId.value, encomendaData);
            mostrarMensagem('Encomenda atualizada com sucesso!', 'success');
            modalEdicaoEncomenda.style.display = 'none';
            await carregarEncomendas();
        } catch (error) {
            mostrarMensagem('Erro ao salvar edição: ' + error.message, 'error');
        }
    }
    
    // === FUNÇÃO CORRIGIDA PARA IMPRESSÃO EM TÉRMICA ===
    function imprimirCanhoto(encomendaId) {
        const encomenda = encomendas.find(enc => enc.id === encomendaId);
        if (!encomenda) return mostrarMensagem('Encomenda não encontrada.', 'error');

        const valorPendente = (encomenda.valor_total - encomenda.sinal_pago).toFixed(2);
        const dataEntregaFormatada = new Date(encomenda.data_entrega + 'T03:00:00Z').toLocaleDateString('pt-BR');
        
        // Adicionei estilos inline simples e otimizados para térmica (largura e fonte menor)
        const canhotoContent = `
            <div id="canhoto-impressao" style="font-family: Arial, sans-serif; width: 300px; padding: 5px;">
                <h4 style="text-align: center; margin: 0; font-size: 14px;">Confeitaria Doces Criativos</h4>
                <hr style="border: 0.5px dashed #000; margin: 5px 0;">
                <p style="margin: 2px 0; font-size: 10px;"><strong>Pedido:</strong> #${encomenda.id.substring(0, 8)}</p>
                <p style="margin: 2px 0; font-size: 10px;"><strong>Cliente:</strong> ${encomenda.cliente?.nome || 'N/A'}</p>
                <p style="margin: 2px 0; font-size: 10px;"><strong>Data Entrega:</strong> ${dataEntregaFormatada}</p>
                <p style="margin: 2px 0; font-size: 10px;"><strong>Detalhes:</strong><br>${encomenda.detalhes.replace(/\n/g, '<br>')}</p>
                <hr style="border: 0.5px dashed #000; margin: 5px 0;">
                <p style="margin: 2px 0; font-size: 10px;"><strong>Total:</strong> R$ ${encomenda.valor_total.toFixed(2)}</p>
                <p style="margin: 2px 0; font-size: 10px;"><strong>Sinal:</strong> R$ ${encomenda.sinal_pago.toFixed(2)}</p>
                <p style="font-weight: bold; margin: 5px 0; font-size: 12px;"><strong>Pendente: R$ ${valorPendente}</strong></p>
                <p style="text-align: center; margin-top: 10px; font-size: 8px;">Obrigado pela preferência!</p>
            </div>`;

        const printWindow = window.open('', 'PrintCanhoto', 'height=600,width=400');
        
        // Define CSS otimizado para impressão térmica (ajusta a largura do corpo e remove margens)
        const thermalCss = `
            <style>
                @media print {
                    body {
                        width: 58mm !important; 
                        margin: 0;
                        padding: 0;
                        font-family: monospace;
                        font-size: 9px;
                    }
                    #canhoto-impressao {
                        width: 100%;
                        padding: 0;
                    }
                    @page {
                        margin: 0; /* Remove margens do spooler */
                    }
                }
            </style>
        `;

        printWindow.document.write('<html><head><title>Canhoto do Pedido</title>' + thermalCss + '</head><body>');
        printWindow.document.write(canhotoContent);
        
        // *** CORREÇÃO CRÍTICA (JavaScript): Remove onafterprint e usa setTimeout ***
        const fixScript = `
            <script>
                window.onload = function() {
                    window.print();
                    // O atraso de 1 segundo garante que o spooler de impressão termine
                    // antes de fechar a janela, prevenindo o loop de reimpressão.
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
    // === FIM DA FUNÇÃO CORRIGIDA ===
    
    inicializarEncomendas();
});