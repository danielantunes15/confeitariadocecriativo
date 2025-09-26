// js/caixa-fechamento.js - Sistema completo de fechamento de caixa (CORRIGIDO)
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
    const dataFechamentoInput = document.getElementById('data-fechamento');
    const carregarDadosBtn = document.getElementById('carregar-dados');
    const gerarRelatorioBtn = document.getElementById('gerar-relatorio');
    const filtroPagamentoSelect = document.getElementById('filtro-pagamento');
    const vendasBody = document.getElementById('vendas-body');
    const movimentacoesBody = document.getElementById('movimentacoes-body');

    // Variáveis globais
    let vendasDoDia = [];
    let movimentacoesDoDia = [];
    let isAdmin = usuario.tipo === 'admin';

    // Aplicar classe admin se necessário
    if (isAdmin) {
        document.body.classList.add('is-admin');
        // Mostrar seções admin
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'block';
        });
        document.getElementById('movimentacoes-admin').style.display = 'block';
    }

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

        // Carregar dados iniciais
        await carregarFechamentoDoDia();

        // Configurar event listeners
        configurarEventListeners();

        console.log('✅ Módulo de fechamento de caixa inicializado com sucesso!');

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
                .from('vendas')
                .select('id')
                .limit(1);
                
            if (error) throw error;
            
            console.log('✅ Conexão com Supabase estabelecida (fechamento)');
            return true;
        } catch (error) {
            throw new Error(`Erro Supabase: ${error.message}`);
        }
    }

    // Configurar event listeners
    function configurarEventListeners() {
        if (carregarDadosBtn) {
            carregarDadosBtn.addEventListener('click', carregarFechamentoDoDia);
        }

        if (gerarRelatorioBtn) {
            gerarRelatorioBtn.addEventListener('click', gerarRelatorioPDF);
        }

        if (filtroPagamentoSelect) {
            filtroPagamentoSelect.addEventListener('change', filtrarVendas);
        }

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                window.sistemaAuth.fazerLogout();
            });
        }
    }

    // Função principal para carregar fechamento
    async function carregarFechamentoDoDia() {
        const dataSelecionada = dataFechamentoInput.value;
        
        if (!dataSelecionada) {
            mostrarMensagem('Selecione uma data válida', 'error');
            return;
        }

        try {
            mostrarMensagem('Carregando dados do fechamento...', 'info');
            
            // Carregar vendas da data selecionada
            await carregarVendas(dataSelecionada);
            
            // Carregar movimentações (apenas para admin)
            if (isAdmin) {
                await carregarMovimentacoes(dataSelecionada);
            }
            
            // Atualizar resumo
            atualizarResumoFinanceiro();
            
            // Atualizar relatório
            atualizarRelatorio();
            
            mostrarMensagem('Fechamento carregado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao carregar fechamento:', error);
            mostrarMensagem('Erro ao carregar fechamento: ' + error.message, 'error');
        }
    }

    // Carregar vendas do dia - VERSÃO CORRIGIDA
    async function carregarVendas(data) {
        try {
            console.log('📊 Carregando vendas para data:', data);
            
            // Primeiro, buscar as vendas básicas
            const { data: vendas, error } = await supabase
                .from('vendas')
                .select('*')
                .eq('data_venda', data)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao buscar vendas:', error);
                throw error;
            }

            console.log(`✅ Encontradas ${vendas?.length || 0} vendas`);

            // Se não há vendas, definir array vazio
            vendasDoDia = vendas || [];
            
            // Para cada venda, buscar detalhes adicionais separadamente
            if (vendasDoDia.length > 0) {
                for (let venda of vendasDoDia) {
                    try {
                        // Buscar itens da venda
                        const { data: itens, error: errorItens } = await supabase
                            .from('vendas_itens')
                            .select('*')
                            .eq('venda_id', venda.id);

                        if (!errorItens && itens) {
                            venda.itens = itens;
                            
                            // Para cada item, buscar nome do produto se possível
                            for (let item of venda.itens) {
                                try {
                                    const { data: produto, error: errorProduto } = await supabase
                                        .from('produtos')
                                        .select('nome, icone')
                                        .eq('id', item.produto_id)
                                        .single();

                                    if (!errorProduto && produto) {
                                        item.produto = produto;
                                    }
                                } catch (produtoError) {
                                    console.warn('Erro ao buscar produto:', produtoError);
                                    item.produto = { nome: 'Produto não encontrado', icone: 'fa-cube' };
                                }
                            }
                        }

                        // Buscar nome do usuário
                        if (venda.usuario_id) {
                            try {
                                const { data: usuario, error: errorUsuario } = await supabase
                                    .from('sistema_usuarios')
                                    .select('nome')
                                    .eq('id', venda.usuario_id)
                                    .single();

                                if (!errorUsuario && usuario) {
                                    venda.usuario = usuario;
                                }
                            } catch (usuarioError) {
                                console.warn('Erro ao buscar usuário:', usuarioError);
                            }
                        }
                    } catch (detalhesError) {
                        console.warn('Erro ao carregar detalhes da venda:', detalhesError);
                    }
                }
            }

            exibirVendas(vendasDoDia);

        } catch (error) {
            console.error('Erro ao carregar vendas:', error);
            // Tentar fallback mais simples
            try {
                const { data: vendasSimples, error: errorSimples } = await supabase
                    .from('vendas')
                    .select('*')
                    .eq('data_venda', data)
                    .order('created_at', { ascending: false });

                if (!errorSimples) {
                    vendasDoDia = vendasSimples || [];
                    exibirVendas(vendasDoDia);
                    mostrarMensagem('Dados carregados (modo simplificado)', 'info');
                    return;
                }
            } catch (fallbackError) {
                console.error('Erro no fallback:', fallbackError);
            }
            
            throw error;
        }
    }

    // Carregar movimentações do dia (apenas admin)
    async function carregarMovimentacoes(data) {
        try {
            const { data: movimentacoes, error } = await supabase
                .from('caixa_movimentacoes')
                .select('*')
                .eq('data', data)
                .order('created_at', { ascending: false });

            if (error) throw error;

            movimentacoesDoDia = movimentacoes || [];
            
            // Buscar nomes dos usuários para movimentações
            for (let mov of movimentacoesDoDia) {
                if (mov.usuario_id) {
                    try {
                        const { data: usuario, error: errorUsuario } = await supabase
                            .from('sistema_usuarios')
                            .select('nome')
                            .eq('id', mov.usuario_id)
                            .single();

                        if (!errorUsuario && usuario) {
                            mov.usuario = usuario;
                        }
                    } catch (usuarioError) {
                        console.warn('Erro ao buscar usuário da movimentação:', usuarioError);
                    }
                }
            }
            
            exibirMovimentacoes(movimentacoesDoDia);

        } catch (error) {
            console.error('Erro ao carregar movimentações:', error);
            // Não lançar erro para não quebrar o fluxo principal
            movimentacoesDoDia = [];
            exibirMovimentacoes(movimentacoesDoDia);
        }
    }

    // Exibir vendas na tabela
    function exibirVendas(vendas) {
        if (!vendasBody) return;

        vendasBody.innerHTML = '';

        if (vendas.length === 0) {
            vendasBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #666;">
                        Nenhuma venda encontrada para esta data
                    </td>
                </tr>
            `;
            return;
        }

        vendas.forEach(venda => {
            const tr = document.createElement('tr');
            
            // Formatar hora
            const hora = new Date(venda.created_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            // Contar itens
            const totalItens = venda.itens ? venda.itens.reduce((sum, item) => sum + item.quantidade, 0) : 0;

            tr.innerHTML = `
                <td>${hora}</td>
                <td>${venda.cliente || 'Cliente não identificado'}</td>
                <td>${totalItens} item(s)</td>
                <td>R$ ${venda.total?.toFixed(2) || '0.00'}</td>
                <td>
                    <span class="badge badge-${venda.forma_pagamento}">
                        ${formatarFormaPagamento(venda.forma_pagamento)}
                    </span>
                </td>
                <td>${venda.usuario?.nome || 'N/A'}</td>
                <td>
                    <button class="btn-detalhes" onclick="verDetalhesVenda('${venda.id}')">
                        <i class="fas fa-eye"></i> Detalhes
                    </button>
                </td>
            `;

            vendasBody.appendChild(tr);
        });
    }

    // Exibir movimentações (apenas admin)
    function exibirMovimentacoes(movimentacoes) {
        if (!movimentacoesBody || !isAdmin) return;

        movimentacoesBody.innerHTML = '';

        if (movimentacoes.length === 0) {
            movimentacoesBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #666;">
                        Nenhuma movimentação encontrada
                    </td>
                </tr>
            `;
            return;
        }

        movimentacoes.forEach(mov => {
            const tr = document.createElement('tr');
            
            const hora = new Date(mov.created_at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            });

            tr.innerHTML = `
                <td>${hora}</td>
                <td>${mov.descricao}</td>
                <td>
                    <span class="badge ${mov.tipo === 'entrada' ? 'badge-dinheiro' : 'badge-pix'}">
                        ${mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                </td>
                <td class="${mov.tipo === 'entrada' ? 'entrada' : 'saida'}">
                    R$ ${mov.valor?.toFixed(2) || '0.00'}
                </td>
                <td>${mov.usuario?.nome || 'N/A'}</td>
            `;

            movimentacoesBody.appendChild(tr);
        });
    }

    // Atualizar resumo financeiro
    function atualizarResumoFinanceiro() {
        const vendasDinheiro = vendasDoDia.filter(v => v.forma_pagamento === 'dinheiro');
        const vendasCartao = vendasDoDia.filter(v => v.forma_pagamento === 'cartao');
        const vendasPix = vendasDoDia.filter(v => v.forma_pagamento === 'pix');

        // Totais por forma de pagamento
        const totalDinheiro = vendasDinheiro.reduce((sum, v) => sum + (v.total || 0), 0);
        const totalCartao = vendasCartao.reduce((sum, v) => sum + (v.total || 0), 0);
        const totalPix = vendasPix.reduce((sum, v) => sum + (v.total || 0), 0);
        const totalGeral = totalDinheiro + totalCartao + totalPix;

        // Atualizar elementos
        document.getElementById('total-dinheiro').textContent = `R$ ${totalDinheiro.toFixed(2)}`;
        document.getElementById('qtd-dinheiro').textContent = `${vendasDinheiro.length} venda(s)`;
        
        document.getElementById('total-cartao').textContent = `R$ ${totalCartao.toFixed(2)}`;
        document.getElementById('qtd-cartao').textContent = `${vendasCartao.length} venda(s)`;
        
        document.getElementById('total-pix').textContent = `R$ ${totalPix.toFixed(2)}`;
        document.getElementById('qtd-pix').textContent = `${vendasPix.length} venda(s)`;
        
        document.getElementById('total-geral').textContent = `R$ ${totalGeral.toFixed(2)}`;
        document.getElementById('qtd-total').textContent = `${vendasDoDia.length} venda(s)`;

        // Para usuários normais, mostrar apenas dinheiro
        if (!isAdmin) {
            document.getElementById('total-cartao').textContent = 'R$ **,**';
            document.getElementById('qtd-cartao').textContent = '** venda(s)';
            document.getElementById('total-pix').textContent = 'R$ **,**';
            document.getElementById('qtd-pix').textContent = '** venda(s)';
        }
    }

    // Atualizar relatório
    function atualizarRelatorio() {
        const dataSelecionada = dataFechamentoInput.value;
        const dataFormatada = new Date(dataSelecionada).toLocaleDateString('pt-BR');
        const totalVendas = vendasDoDia.reduce((sum, v) => sum + (v.total || 0), 0);
        const ticketMedio = vendasDoDia.length > 0 ? totalVendas / vendasDoDia.length : 0;

        document.getElementById('relatorio-data').textContent = dataFormatada;
        document.getElementById('relatorio-total-vendas').textContent = `R$ ${totalVendas.toFixed(2)}`;
        document.getElementById('relatorio-qtd-vendas').textContent = vendasDoDia.length;
        document.getElementById('relatorio-ticket-medio').textContent = `R$ ${ticketMedio.toFixed(2)}`;

        // Calcular saldo final (apenas admin)
        if (isAdmin) {
            const totalEntradas = movimentacoesDoDia
                .filter(m => m.tipo === 'entrada')
                .reduce((sum, m) => sum + (m.valor || 0), 0);
            
            const totalSaidas = movimentacoesDoDia
                .filter(m => m.tipo === 'saida')
                .reduce((sum, m) => sum + (m.valor || 0), 0);
            
            const saldoFinal = totalEntradas - totalSaidas + totalVendas;
            document.getElementById('relatorio-saldo-final').textContent = `R$ ${saldoFinal.toFixed(2)}`;
            
            // Mostrar seção admin no relatório
            document.querySelector('.admin-only').style.display = 'block';
        }
    }

    // Filtrar vendas por forma de pagamento
    function filtrarVendas() {
        const filtro = filtroPagamentoSelect.value;
        
        let vendasFiltradas = vendasDoDia;
        
        if (filtro !== 'todos') {
            vendasFiltradas = vendasDoDia.filter(v => v.forma_pagamento === filtro);
        }
        
        exibirVendas(vendasFiltradas);
    }

    // Função para ver detalhes da venda
    window.verDetalhesVenda = function(vendaId) {
        const venda = vendasDoDia.find(v => v.id === vendaId);
        
        if (!venda) {
            mostrarMensagem('Venda não encontrada', 'error');
            return;
        }

        const modal = document.getElementById('modal-detalhes-venda');
        const content = document.getElementById('detalhes-venda-content');
        
        // Formatar data e hora
        const dataHora = new Date(venda.created_at).toLocaleString('pt-BR');
        
        // Construir HTML dos detalhes
        let html = `
            <div class="detalhes-venda">
                <div class="info-item">
                    <span><strong>Data/Hora:</strong></span>
                    <span>${dataHora}</span>
                </div>
                <div class="info-item">
                    <span><strong>Cliente:</strong></span>
                    <span>${venda.cliente || 'Cliente não identificado'}</span>
                </div>
                <div class="info-item">
                    <span><strong>Vendedor:</strong></span>
                    <span>${venda.usuario?.nome || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span><strong>Forma de Pagamento:</strong></span>
                    <span>${formatarFormaPagamento(venda.forma_pagamento)}</span>
                </div>
                
                <h4>Itens da Venda:</h4>
        `;

        if (venda.itens && venda.itens.length > 0) {
            venda.itens.forEach(item => {
                html += `
                    <div class="detalhes-item">
                        <div class="detalhes-produto">
                            <i class="fas ${item.produto?.icone || 'fa-cube'}"></i>
                            <div>
                                <strong>${item.produto?.nome || 'Produto não encontrado'}</strong>
                                <div>Quantidade: ${item.quantidade}</div>
                            </div>
                        </div>
                        <div>
                            <strong>R$ ${((item.preco_unitario || 0) * (item.quantidade || 0)).toFixed(2)}</strong>
                            <div>Unit: R$ ${(item.preco_unitario || 0).toFixed(2)}</div>
                        </div>
                    </div>
                `;
            });
        } else {
            html += `<p>Nenhum item encontrado para esta venda</p>`;
        }

        html += `
                <div class="detalhes-total">
                    <div class="info-item">
                        <span><strong>Total da Venda:</strong></span>
                        <span><strong>R$ ${(venda.total || 0).toFixed(2)}</strong></span>
                    </div>
                </div>
                
                ${venda.observacoes ? `
                    <div class="info-item">
                        <span><strong>Observações:</strong></span>
                        <span>${venda.observacoes}</span>
                    </div>
                ` : ''}
            </div>
        `;

        content.innerHTML = html;
        modal.style.display = 'block';
    };

    // Fechar modal
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            document.getElementById('modal-detalhes-venda').style.display = 'none';
        });
    });

    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal-detalhes-venda');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Gerar relatório PDF
    async function gerarRelatorioPDF() {
        try {
            mostrarMensagem('Gerando relatório...', 'info');
            
            const dataSelecionada = dataFechamentoInput.value;
            const dataFormatada = new Date(dataSelecionada).toLocaleDateString('pt-BR');
            
            const vendasDinheiro = vendasDoDia.filter(v => v.forma_pagamento === 'dinheiro');
            const vendasCartao = vendasDoDia.filter(v => v.forma_pagamento === 'cartao');
            const vendasPix = vendasDoDia.filter(v => v.forma_pagamento === 'pix');
            
            const totalDinheiro = vendasDinheiro.reduce((sum, v) => sum + (v.total || 0), 0);
            const totalCartao = vendasCartao.reduce((sum, v) => sum + (v.total || 0), 0);
            const totalPix = vendasPix.reduce((sum, v) => sum + (v.total || 0), 0);
            const totalGeral = totalDinheiro + totalCartao + totalPix;
            
            const relatorioWindow = window.open('', '_blank');
            relatorioWindow.document.write(`
                <html>
                    <head>
                        <title>Relatório de Fechamento - ${dataFormatada}</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            h1, h2 { color: #333; }
                            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                            .total { font-weight: bold; }
                            .assinatura { margin-top: 50px; border-top: 1px solid #000; width: 300px; }
                        </style>
                    </head>
                    <body>
                        <h1>Relatório de Fechamento</h1>
                        <h2>Confeitaria Doces Criativos</h2>
                        <p><strong>Data:</strong> ${dataFormatada}</p>
                        
                        <h3>Resumo Financeiro</h3>
                        <table>
                            <tr>
                                <th>Forma de Pagamento</th>
                                <th>Quantidade de Vendas</th>
                                <th>Valor Total</th>
                            </tr>
                            <tr>
                                <td>Dinheiro</td>
                                <td>${vendasDinheiro.length}</td>
                                <td>R$ ${totalDinheiro.toFixed(2)}</td>
                            </tr>
                            ${isAdmin ? `
                            <tr>
                                <td>Cartão</td>
                                <td>${vendasCartao.length}</td>
                                <td>R$ ${totalCartao.toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td>PIX</td>
                                <td>${vendasPix.length}</td>
                                <td>R$ ${totalPix.toFixed(2)}</td>
                            </tr>
                            ` : ''}
                            <tr class="total">
                                <td>TOTAL</td>
                                <td>${vendasDoDia.length}</td>
                                <td>R$ ${totalGeral.toFixed(2)}</td>
                            </tr>
                        </table>
                        
                        <div class="assinatura">
                            <p>Vendedor: _________________________</p>
                            ${isAdmin ? '<p>Gerente: _________________________</p>' : ''}
                        </div>
                        
                        <p><small>Relatório gerado em: ${new Date().toLocaleString('pt-BR')}</small></p>
                    </body>
                </html>
            `);
            
            relatorioWindow.document.close();
            mostrarMensagem('Relatório gerado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            mostrarMensagem('Erro ao gerar relatório: ' + error.message, 'error');
        }
    }

    // Funções auxiliares
    function formatarFormaPagamento(forma) {
        const formas = {
            'dinheiro': 'Dinheiro',
            'cartao': 'Cartão',
            'pix': 'PIX'
        };
        return formas[forma] || forma;
    }

    function mostrarMensagem(mensagem, tipo = 'info') {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${tipo}`;
        alert.innerHTML = `
            <span>${mensagem}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        alertContainer.appendChild(alert);

        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }
});

// CSS para alerts
const style = document.createElement('style');
style.textContent = `
    .alert {
        padding: 12px 16px;
        margin: 10px 0;
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        animation: slideIn 0.3s ease-out;
    }
    
    .alert-success {
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
    }
    
    .alert-error {
        background-color: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
    }
    
    .alert-info {
        background-color: #d1ecf1;
        color: #0c5460;
        border: 1px solid #bee5eb;
    }
    
    .alert button {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        margin-left: 10px;
    }
    
    @keyframes slideIn {
        from { transform: translateY(-10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    
    .entrada { color: #2e7d32; font-weight: bold; }
    .saida { color: #c62828; font-weight: bold; }
`;

document.head.appendChild(style);