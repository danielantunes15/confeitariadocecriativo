// js/caixa.js - Funcionalidades da página de caixa
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação
    const usuario = window.sistemaAuth?.verificarAutenticacao();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos do DOM
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const errorElement = document.getElementById('error-message');

    try {
        // Mostrar loading
        if (loadingElement) loadingElement.style.display = 'block';
        if (contentElement) contentElement.style.display = 'none';
        if (errorElement) errorElement.style.display = 'none';

        // Testar conexão com Supabase
        await testarConexaoSupabase();
        
        // Esconder loading e mostrar conteúdo
        if (loadingElement) loadingElement.style.display = 'none';
        if (contentElement) contentElement.style.display = 'block';

        // Inicializar a aplicação
        await inicializarCaixa();

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

    // Função para testar conexão
    async function testarConexaoSupabase() {
        try {
            const { data, error } = await supabase
                .from('caixa_movimentacoes')
                .select('count')
                .limit(1);
                
            if (error) throw error;
            
            console.log('✅ Conexão com Supabase estabelecida (caixa)');
            return true;
        } catch (error) {
            throw new Error(`Erro Supabase: ${error.message}`);
        }
    }

    // Função para inicializar a aplicação de caixa
    async function inicializarCaixa() {
        const abrirCaixaBtn = document.getElementById('abrir-caixa');
        const fecharCaixaBtn = document.getElementById('fechar-caixa');
        const novaMovimentacaoBtn = document.getElementById('nova-movimentacao');
        const aplicarFiltroBtn = document.getElementById('aplicar-filtro');
        const modal = document.getElementById('modal-movimentacao');
        const closeBtn = document.querySelector('.close');
        const cancelarBtn = document.getElementById('cancelar-movimentacao');
        const movimentacaoForm = document.getElementById('movimentacao-form');

        try {
            // Carregar dados iniciais
            await carregarResumoCaixa();
            await carregarMovimentacoes();
            
            // Configurar event listeners
            if (abrirCaixaBtn) {
                abrirCaixaBtn.addEventListener('click', abrirCaixa);
            }
            
            if (fecharCaixaBtn) {
                fecharCaixaBtn.addEventListener('click', fecharCaixa);
            }
            
            if (novaMovimentacaoBtn) {
                novaMovimentacaoBtn.addEventListener('click', function() {
                    if (modal) modal.style.display = 'block';
                });
            }
            
            if (aplicarFiltroBtn) {
                aplicarFiltroBtn.addEventListener('click', carregarMovimentacoes);
            }
            
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    if (modal) modal.style.display = 'none';
                });
            }
            
            if (cancelarBtn) {
                cancelarBtn.addEventListener('click', function() {
                    if (modal) modal.style.display = 'none';
                    if (movimentacaoForm) movimentacaoForm.reset();
                });
            }
            
            if (movimentacaoForm) {
                movimentacaoForm.addEventListener('submit', salvarMovimentacao);
            }

            // Fechar modal ao clicar fora
            window.addEventListener('click', function(event) {
                if (event.target === modal) {
                    modal.style.display = 'none';
                    if (movimentacaoForm) movimentacaoForm.reset();
                }
            });

            console.log('✅ Módulo de caixa inicializado com sucesso!');

        } catch (error) {
            console.error('Erro na inicialização do módulo de caixa:', error);
            throw error;
        }
    }

    // Função para carregar resumo do caixa
    async function carregarResumoCaixa() {
        try {
            const hoje = new Date().toISOString().split('T')[0];
            
            // Buscar vendas do dia
            const { data: vendas, error: vendasError } = await supabase
                .from('vendas')
                .select('total')
                .eq('data_venda', hoje);
                
            if (vendasError) throw vendasError;
            
            const totalVendas = vendas.reduce((sum, venda) => sum + venda.total, 0);
            document.getElementById('vendas-dia').textContent = `R$ ${totalVendas.toFixed(2)}`;
            
            // Buscar movimentações do dia
            const { data: movimentacoes, error: movError } = await supabase
                .from('caixa_movimentacoes')
                .select('*')
                .eq('data', hoje);
                
            if (movError) throw movError;
            
            document.getElementById('total-movimentacoes').textContent = movimentacoes.length;
            
            // Calcular saldo atual (simulação)
            const saldoInicial = 1000.00; // Saldo inicial fictício
            let saldoAtual = saldoInicial + totalVendas;
            
            movimentacoes.forEach(mov => {
                if (mov.tipo === 'entrada') {
                    saldoAtual += mov.valor;
                } else {
                    saldoAtual -= mov.valor;
                }
            });
            
            document.getElementById('saldo-atual').textContent = `R$ ${saldoAtual.toFixed(2)}`;
            
        } catch (error) {
            console.error('Erro ao carregar resumo do caixa:', error);
            mostrarMensagem('Erro ao carregar resumo do caixa', 'error');
        }
    }

    // Função para carregar movimentações
    async function carregarMovimentacoes() {
        const movimentacoesList = document.getElementById('movimentacoes-list');
        if (!movimentacoesList) return;
        
        const dataFiltro = document.getElementById('data-filtro').value;
        
        try {
            const { data, error } = await supabase
                .from('caixa_movimentacoes')
                .select(`
                    *,
                    usuario:usuarios(nome)
                `)
                .eq('data', dataFiltro)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            if (data.length === 0) {
                movimentacoesList.innerHTML = '<p>Nenhuma movimentação encontrada para esta data.</p>';
                return;
            }
            
            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>Hora</th>
                            <th>Descrição</th>
                            <th>Valor</th>
                            <th>Tipo</th>
                            <th>Usuário</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            data.forEach(mov => {
                html += `
                    <tr>
                        <td>${new Date(mov.created_at).toLocaleTimeString('pt-BR')}</td>
                        <td>${mov.descricao}</td>
                        <td class="${mov.tipo}">R$ ${mov.valor.toFixed(2)}</td>
                        <td><span class="badge ${mov.tipo}">${mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                        <td>${mov.usuario?.nome || 'N/A'}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            movimentacoesList.innerHTML = html;
            
        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
            movimentacoesList.innerHTML = '<p>Erro ao carregar movimentações.</p>';
        }
    }

    // Função para abrir caixa
    async function abrirCaixa() {
        try {
            const { error } = await supabase
                .from('caixa_movimentacoes')
                .insert({
                    tipo: 'entrada',
                    valor: 0,
                    descricao: 'Abertura de caixa',
                    data: new Date().toISOString().split('T')[0],
                    usuario_id: window.sistemaAuth.usuarioLogado.id
                });
                
            if (error) throw error;
            
            mostrarMensagem('Caixa aberto com sucesso!', 'success');
            await carregarResumoCaixa();
            await carregarMovimentacoes();
            
        } catch (error) {
            console.error('Erro ao abrir caixa:', error);
            mostrarMensagem('Erro ao abrir caixa: ' + error.message, 'error');
        }
    }

    // Função para fechar caixa
    async function fecharCaixa() {
        try {
            const { error } = await supabase
                .from('caixa_movimentacoes')
                .insert({
                    tipo: 'saida',
                    valor: 0,
                    descricao: 'Fechamento de caixa',
                    data: new Date().toISOString().split('T')[0],
                    usuario_id: window.sistemaAuth.usuarioLogado.id
                });
                
            if (error) throw error;
            
            mostrarMensagem('Caixa fechado com sucesso!', 'success');
            await carregarResumoCaixa();
            await carregarMovimentacoes();
            
        } catch (error) {
            console.error('Erro ao fechar caixa:', error);
            mostrarMensagem('Erro ao fechar caixa: ' + error.message, 'error');
        }
    }

    // Função para salvar movimentação
    async function salvarMovimentacao(event) {
        event.preventDefault();
        
        const form = event.target;
        const tipo = document.getElementById('tipo-movimentacao').value;
        const valor = parseFloat(document.getElementById('valor-movimentacao').value);
        const descricao = document.getElementById('descricao-movimentacao').value;
        
        // Validar dados
        if (!tipo || !valor || !descricao) {
            mostrarMensagem('Preencha todos os campos obrigatórios', 'error');
            return;
        }
        
        if (valor <= 0) {
            mostrarMensagem('O valor deve ser maior que zero', 'error');
            return;
        }
        
        try {
            const { error } = await supabase
                .from('caixa_movimentacoes')
                .insert({
                    tipo: tipo,
                    valor: valor,
                    descricao: descricao,
                    data: new Date().toISOString().split('T')[0],
                    usuario_id: window.sistemaAuth.usuarioLogado.id
                });
                
            if (error) throw error;
            
            mostrarMensagem('Movimentação registrada com sucesso!', 'success');
            
            // Fechar modal e limpar formulário
            const modal = document.getElementById('modal-movimentacao');
            if (modal) modal.style.display = 'none';
            form.reset();
            
            // Atualizar dados
            await carregarResumoCaixa();
            await carregarMovimentacoes();
            
        } catch (error) {
            console.error('Erro ao salvar movimentação:', error);
            mostrarMensagem('Erro ao registrar movimentação: ' + error.message, 'error');
        }
    }

    // Função para mostrar mensagens
    function mostrarMensagem(mensagem, tipo) {
        // Remover mensagens existentes
        const mensagensExistentes = document.querySelectorAll('.alert-message');
        mensagensExistentes.forEach(msg => msg.remove());
        
        // Criar nova mensagem
        const mensagemElement = document.createElement('div');
        mensagemElement.className = `alert-message alert-${tipo}`;
        mensagemElement.textContent = mensagem;
        
        // Inserir antes do primeiro card
        const primeiroCard = document.querySelector('.card');
        if (primeiroCard) {
            primeiroCard.parentNode.insertBefore(mensagemElement, primeiroCard);
        }
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (mensagemElement.parentNode) {
                mensagemElement.parentNode.removeChild(mensagemElement);
            }
        }, 5000);
    }
});