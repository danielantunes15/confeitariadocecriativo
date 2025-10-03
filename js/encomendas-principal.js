// js/encomendas-principal.js - Sistema completo de encomendas
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
    const detalhesEncomendaInput = document.getElementById('detalhes-encomenda');
    const valorTotalEncomendaInput = document.getElementById('valor-total-encomenda');
    const sinalEncomendaInput = document.getElementById('sinal-encomenda');
    const clientesTabelaBody = document.getElementById('clientes-tabela-body');
    const formCadastroCliente = document.getElementById('form-cadastro-cliente');
    const encomendasNavBtns = document.querySelectorAll('.encomendas-nav-btn');
    const tabButtons = document.querySelectorAll('.tabs-header .tab-button');
    const pageContents = document.querySelectorAll('.page-content');
    const tabContents = document.querySelectorAll('.tab-content');
    const clienteIdEdicao = document.getElementById('cliente-id-edicao');

    // Variáveis globais
    let clientes = [];
    let encomendas = [];

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
        const container = document.getElementById('lista-encomendas-container');
        if (!container) return;
        container.innerHTML = '<p class="loading-message">Carregando encomendas...</p>';

        try {
            if (!window.encomendasSupabase) throw new Error('Módulo de comunicação com o Supabase não carregado.');
            encomendas = await window.encomendasSupabase.buscarEncomendas();
            exibirListaEncomendas();
        } catch (error) {
            mostrarMensagem('Erro ao carregar a lista de encomendas: ' + error.message, 'error');
            encomendas = [];
            container.innerHTML = '<p class="empty-message">Erro ao carregar as encomendas.</p>';
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
            // Adicionar event listeners aos botões de ação
            document.querySelectorAll('.btn-acao.editar').forEach(btn => {
                btn.addEventListener('click', (e) => editarCliente(e.currentTarget.dataset.id));
            });
            document.querySelectorAll('.btn-acao.excluir').forEach(btn => {
                btn.addEventListener('click', (e) => excluirCliente(e.currentTarget.dataset.id));
            });
        }
    }

    function exibirListaEncomendas() {
        const container = document.getElementById('lista-encomendas-container');
        if (!container) return;
        container.innerHTML = '';
        if (encomendas.length === 0) {
            container.innerHTML = '<p class="empty-message">Nenhuma encomenda encontrada.</p>';
            return;
        }
        
        const tabela = document.createElement('table');
        tabela.className = 'tabela-encomendas';
        tabela.innerHTML = `
            <thead>
                <tr>
                    <th>Cliente</th>
                    <th>Data Entrega</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${encomendas.map(enc => `
                    <tr>
                        <td>${enc.cliente?.nome || 'N/A'}</td>
                        <td>${new Date(enc.data_entrega).toLocaleDateString('pt-BR')}</td>
                        <td>R$ ${enc.valor_total.toFixed(2)}</td>
                        <td><span class="status-${enc.status}">${enc.status}</span></td>
                        <td>
                            <button class="btn-acao pago" title="Marcar como Pago" data-id="${enc.id}" ${enc.status === 'paga' ? 'disabled' : ''}>
                                <i class="fas fa-check-circle"></i>
                            </button>
                            <button class="btn-acao editar" title="Editar" data-id="${enc.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-acao excluir" title="Excluir" data-id="${enc.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        container.appendChild(tabela);

        // Adicionar event listeners aos botões de ação
        tabela.querySelectorAll('.btn-acao.pago').forEach(btn => {
            btn.addEventListener('click', () => marcarEncomendaComoPaga(btn.dataset.id));
        });
    }

    // Funções de eventos e navegação
    function configurarEventListeners() {
        if (formEncomenda) formEncomenda.addEventListener('submit', criarEncomenda);
        if (formCadastroCliente) formCadastroCliente.addEventListener('submit', cadastrarOuAtualizarCliente);
        if (clienteEncomendaSearch) {
            clienteEncomendaSearch.addEventListener('input', buscarClientesNaInput);
            document.addEventListener('click', (e) => {
                if (!clienteEncomendaResults.contains(e.target) && e.target !== clienteEncomendaSearch) {
                    clienteEncomendaResults.style.display = 'none';
                }
            });
        }
        if (encomendasNavBtns) {
            encomendasNavBtns.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const page = btn.getAttribute('data-page');
                    encomendasNavBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    pageContents.forEach(p => p.style.display = 'none');
                    document.getElementById(`page-${page}`).style.display = 'block';
                    if (page === 'clientes-submenu') {
                        await carregarClientes();
                    } else if (page === 'lista-encomendas') {
                        await carregarEncomendas();
                    }
                });
            });
        }
        if (tabButtons) {
            tabButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabId = btn.getAttribute('data-tab');
                    tabButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    tabContents.forEach(c => c.style.display = 'none');
                    document.getElementById(tabId).style.display = 'block';
                });
            });
        }
        document.getElementById('logout-btn')?.addEventListener('click', () => window.sistemaAuth.fazerLogout());
    }

    function buscarClientesNaInput() {
        const termo = clienteEncomendaSearch.value.toLowerCase().trim();
        clienteEncomendaResults.innerHTML = '';
        clienteEncomendaResults.style.display = 'none';
        
        if (termo.length < 2) return;
        
        const resultados = clientes.filter(cliente => 
            cliente.nome.toLowerCase().includes(termo) || 
            (cliente.cpf && cliente.cpf.includes(termo))
        );
        
        if (resultados.length > 0) {
            resultados.forEach(cliente => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.textContent = `${cliente.nome} (${cliente.cpf || 'CPF: N/A'})`;
                div.addEventListener('click', () => selecionarCliente(cliente));
                clienteEncomendaResults.appendChild(div);
            });
            clienteEncomendaResults.style.display = 'block';
        } else {
            clienteEncomendaResults.innerHTML = '<div class="result-item">Nenhum cliente encontrado.</div>';
            clienteEncomendaResults.style.display = 'block';
        }
    }

    function selecionarCliente(cliente) {
        clienteEncomendaSearch.value = cliente.nome;
        clienteEncomendaId.value = cliente.id;
        clienteEncomendaResults.style.display = 'none';
    }

    async function marcarEncomendaComoPaga(encomendaId) {
        if (confirm('Tem certeza que deseja marcar esta encomenda como paga?')) {
            try {
                await window.encomendasSupabase.atualizarStatusEncomenda(encomendaId, 'paga');
                mostrarMensagem('Encomenda marcada como paga com sucesso!', 'success');
                await carregarEncomendas();
            } catch (error) {
                mostrarMensagem('Erro ao marcar encomenda como paga: ' + error.message, 'error');
            }
        }
    }
    
    // **NOVA FUNÇÃO** - Lógica para editar cliente
    function editarCliente(clienteId) {
        const clienteParaEditar = clientes.find(c => c.id === clienteId);
        if (clienteParaEditar) {
            // Alterna para a aba de cadastro
            document.querySelector('.tab-button[data-tab="tab-cadastrar-cliente"]').click();
            // Preenche o formulário
            document.getElementById('cliente-id-edicao').value = clienteParaEditar.id;
            document.getElementById('cliente-nome').value = clienteParaEditar.nome;
            document.getElementById('cliente-telefone').value = clienteParaEditar.telefone;
            document.getElementById('cliente-endereco').value = clienteParaEditar.endereco;
            document.getElementById('cliente-cpf').value = clienteParaEditar.cpf;
            document.getElementById('cliente-data-nascimento').value = clienteParaEditar.data_nascimento;
        } else {
            mostrarMensagem('Cliente não encontrado.', 'error');
        }
    }

    // **NOVA FUNÇÃO** - Lógica para excluir cliente
    async function excluirCliente(clienteId) {
        if (confirm('Atenção! Esta ação é irreversível. Deseja realmente excluir este cliente?')) {
            try {
                await window.encomendasSupabase.excluirCliente(clienteId);
                mostrarMensagem('Cliente excluído com sucesso!', 'success');
                await carregarClientes();
            } catch (error) {
                mostrarMensagem('Erro ao excluir cliente: ' + error.message, 'error');
            }
        }
    }

    // Lógica principal
    async function criarEncomenda(event) {
        event.preventDefault();
        const clienteId = clienteEncomendaId.value;
        const dataEntrega = dataEntregaInput.value;
        const detalhesEncomenda = detalhesEncomendaInput.value.trim();
        const valorTotalEncomenda = parseFloat(valorTotalEncomendaInput.value);
        const sinalEncomenda = parseFloat(sinalEncomendaInput.value) || 0;
        
        if (!clienteId || !dataEntrega || !detalhesEncomenda || isNaN(valorTotalEncomenda) || valorTotalEncomenda <= 0) {
            mostrarMensagem('Preencha todos os campos obrigatórios e selecione um cliente válido.', 'error');
            return;
        }

        const encomendaData = {
            cliente_id: clienteId,
            data_entrega: dataEntrega,
            detalhes: detalhesEncomenda,
            valor_total: valorTotalEncomenda,
            sinal_pago: sinalEncomenda,
            status: 'pendente',
            usuario_id: window.sistemaAuth.usuarioLogado.id
        };

        try {
            await window.encomendasSupabase.criarEncomenda(encomendaData);
            mostrarMensagem(`Encomenda para ${clienteEncomendaSearch.value} criada com sucesso!`, 'success');
            formEncomenda.reset();
            clienteEncomendaId.value = '';
            clienteEncomendaSearch.value = '';
            await carregarEncomendas();
        } catch (error) {
            mostrarMensagem('Erro ao criar a encomenda: ' + error.message, 'error');
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
        
        if (!clienteData.nome) {
            mostrarMensagem('O nome do cliente é obrigatório.', 'error');
            return;
        }
        
        try {
            mostrarMensagem(isEdicao ? 'Atualizando cliente...' : 'Cadastrando cliente...', 'info');
            if (isEdicao) {
                await window.encomendasSupabase.atualizarCliente(clienteIdEdicao.value, clienteData);
                mostrarMensagem(`Cliente atualizado com sucesso!`, 'success');
            } else {
                const novoCliente = await window.encomendasSupabase.criarCliente(clienteData);
                mostrarMensagem(`Cliente ${novoCliente.nome} cadastrado com sucesso!`, 'success');
            }
            formCadastroCliente.reset();
            clienteIdEdicao.value = ''; // Limpa o ID de edição
            await carregarClientes();
            document.querySelector('.tab-button[data-tab="tab-lista-clientes"]').click();
        } catch (error) {
            mostrarMensagem(`Erro ao ${isEdicao ? 'atualizar' : 'cadastrar'} cliente: ${error.message}`, 'error');
        }
    }
    
    inicializarEncomendas();
});