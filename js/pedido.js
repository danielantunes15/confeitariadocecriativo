// js/pedido.js - Lógica para a página pública de pedidos via WhatsApp - ATUALIZADO (Com Auth Cliente)

document.addEventListener('DOMContentLoaded', async function() {
    
    // !!! IMPORTANTE !!!
    const NUMERO_WHATSAPP = '5573991964394'; 
    // !!! IMPORTANTE !!!
    
    // VARIÁVEIS DE AUTENTICAÇÃO DO CLIENTE (Supabase Auth)
    let clienteLogado = null;
    let clientePerfil = { nome: null, telefone: null }; 

    // Elementos do DOM
    const categoriasContainer = document.getElementById('categorias-container');
    const produtosContainer = document.getElementById('produtos-container');
    const carrinhoItens = document.getElementById('carrinho-itens');
    const totalCarrinho = document.getElementById('total-carrinho');
    const enviarPedidoBtn = document.getElementById('enviar-pedido-whatsapp');
    const finalizarDiretoBtn = document.getElementById('finalizar-pedido-direto');
    const pagamentoOpcoes = document.querySelectorAll('.pagamento-opcao');
    
    // Novos Elementos de Autenticação
    const loginGoogleBtn = document.getElementById('login-google-btn');
    const profileBtn = document.getElementById('profile-btn');
    const profileNameSpan = document.getElementById('profile-name');
    const profileModal = document.getElementById('profile-modal');
    const logoutBtnPublico = document.getElementById('logout-btn-publico');
    const closeProfileModal = document.getElementById('close-profile-modal');
    const modalUserEmail = document.getElementById('modal-user-email');

    // Elementos de Dados do Cliente
    const formCliente = document.getElementById('form-cliente');
    const nomeInputHidden = document.getElementById('cliente-nome');
    const telefoneInputHidden = document.getElementById('cliente-telefone');
    const enderecoInput = document.getElementById('cliente-endereco');
    const nomeInputManual = document.getElementById('cliente-nome-input');
    const telefoneInputManual = document.getElementById('cliente-telefone-input');
    
    // Elementos de Histórico
    const historicoMessage = document.getElementById('historico-message');
    const historicoList = document.getElementById('historico-pedidos-list');
    const pedidosHistoryBody = document.getElementById('pedidos-history-body');
    const meusPedidosTab = document.getElementById('meus-pedidos-tab');


    // Variáveis globais de Cardápio
    let categorias = [];
    let produtos = [];
    let carrinho = [];
    let categoriaSelecionada = 'todos';

    // --- FUNÇÕES DE UTENSÍLIOS ---
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    const mostrarMensagem = (mensagem, tipo = 'info') => {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.innerHTML = `<span>${mensagem}</span><button class="alert-close" onclick="this.parentElement.remove()">&times;</button>`;
        alertContainer.appendChild(alertDiv);
        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
    };

    // --- FUNÇÕES CORE: DECLARADAS COMO FUNCTION PARA GARANTIR HOISTING ---

    function adicionarAoCarrinho(produto) {
        if (produto.estoque_atual <= 0) {
            mostrarMensagem(`Desculpe, ${produto.nome} está esgotado.`, 'error');
            return;
        }
        const itemExistente = carrinho.find(item => item.produto.id === produto.id);
        if (itemExistente) {
            if (itemExistente.quantidade < produto.estoque_atual) {
                itemExistente.quantidade += 1;
            } else {
                mostrarMensagem(`Estoque máximo atingido para ${produto.nome} (${produto.estoque_atual} un.)`, 'warning');
                return;
            }
        } else {
            carrinho.push({ produto: produto, quantidade: 1 });
        }
        atualizarCarrinho();
        mostrarMensagem(`${produto.nome} adicionado à sacola!`, 'success');
    }

    function aumentarQuantidade(index) {
        const produtoEstoque = produtos.find(p => p.id === carrinho[index].produto.id).estoque_atual;
        if (carrinho[index].quantidade < produtoEstoque) {
            carrinho[index].quantidade += 1;
            atualizarCarrinho();
        } else {
            mostrarMensagem(`Estoque máximo atingido para ${carrinho[index].produto.nome} (${produtoEstoque} un.)`, 'warning');
        }
    }
    
    function removerDoCarrinho(index) {
        const produtoNome = carrinho[index].produto.nome;
        if (carrinho[index].quantidade > 1) {
            carrinho[index].quantidade -= 1;
        } else {
            carrinho.splice(index, 1);
        }
        atualizarCarrinho();
        mostrarMensagem(`${produtoNome} removido da sacola.`, 'info');
    }
    
    function atualizarCarrinho() {
        if (carrinho.length === 0) {
            carrinhoItens.innerHTML = `<p style="text-align: center; color: #666;">Sua sacola está vazia.</p>`;
            totalCarrinho.textContent = '0,00';
            enviarPedidoBtn.disabled = true;
            if (finalizarDiretoBtn) finalizarDiretoBtn.disabled = true; 
        } else {
            carrinhoItens.innerHTML = '';
            let total = 0;
            carrinho.forEach((item, index) => {
                const itemSubtotal = item.produto.preco_venda * item.quantidade;
                total += itemSubtotal;
                const itemElement = document.createElement('div');
                itemElement.className = 'carrinho-item';
                itemElement.innerHTML = `
                    <div class="carrinho-item-info">
                        <div class="carrinho-item-nome">${item.produto.nome}</div>
                        <div class="carrinho-item-preco">R$ ${item.produto.preco_venda.toFixed(2)}</div>
                    </div>
                    <div class="carrinho-item-controles">
                        <button class="btn-remover" data-index="${index}"><i class="fas fa-minus"></i></button>
                        <span class="carrinho-item-quantidade">${item.quantidade}</span>
                        <button class="btn-adicionar-carrinho" data-index="${index}"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="carrinho-item-subtotal">
                        R$ ${itemSubtotal.toFixed(2)}
                    </div>
                `;
                carrinhoItens.appendChild(itemElement);
            });
            totalCarrinho.textContent = total.toFixed(2).replace('.', ',');
            
            const isReady = carrinho.length > 0 && (clienteLogado || (nomeInputManual?.value && telefoneInputManual?.value));
            enviarPedidoBtn.disabled = !isReady;
            if (finalizarDiretoBtn) finalizarDiretoBtn.disabled = !isReady; 
            
            document.querySelectorAll('.btn-remover').forEach(btn => btn.addEventListener('click', function() {
                removerDoCarrinho(parseInt(this.getAttribute('data-index')));
            }));
            document.querySelectorAll('.btn-adicionar-carrinho').forEach(btn => btn.addEventListener('click', function() {
                aumentarQuantidade(parseInt(this.getAttribute('data-index')));
            }));
        }
    }
    
    function limparFormularioECarrinho() { 
        carrinho = [];
        atualizarCarrinho();
        if (!clienteLogado) {
            nomeInputManual.value = '';
            telefoneInputManual.value = '';
        }
        enderecoInput.value = '';
        document.querySelector('input[name="pagamento"]').checked = true;
        pagamentoOpcoes.forEach(op => op.classList.remove('selected'));
        if (pagamentoOpcoes.length > 0) pagamentoOpcoes[0].classList.add('selected');
    }

    async function carregarCategorias() {
        try {
            categorias = await window.vendasSupabase.buscarCategorias();
            exibirCategorias();
        } catch (error) {
            mostrarMensagem('Erro ao carregar categorias.', 'error');
        }
    }

    async function carregarProdutos() {
        try {
            produtos = await window.vendasSupabase.buscarProdutos();
            exibirProdutos();
        } catch (error) {
            mostrarMensagem('Erro ao carregar produtos.', 'error');
        }
    }

    function exibirCategorias() {
        categoriasContainer.innerHTML = ''; 
        const categoriaTodos = document.createElement('button');
        categoriaTodos.className = `categoria-btn active`;
        categoriaTodos.setAttribute('data-categoria', 'todos');
        categoriaTodos.innerHTML = `<i class="fas fa-th-large"></i><span>Todos</span>`;
        categoriaTodos.addEventListener('click', () => selecionarCategoria('todos'));
        categoriasContainer.appendChild(categoriaTodos);

        categorias.forEach(categoria => {
            const categoriaBtn = document.createElement('button');
            categoriaBtn.className = `categoria-btn`;
            categoriaBtn.setAttribute('data-categoria', categoria.id);
            categoriaBtn.innerHTML = `<i class="fas ${categoria.icone || 'fa-tag'}"></i><span>${categoria.nome}</span>`;
            categoriaBtn.addEventListener('click', () => selecionarCategoria(categoria.id));
            categoriasContainer.appendChild(categoriaBtn);
        });
    }

    function selecionarCategoria(categoriaId) {
        categoriaSelecionada = categoriaId;
        document.querySelectorAll('.categoria-btn').forEach(botao => {
            botao.classList.toggle('active', botao.getAttribute('data-categoria') === categoriaId);
        });
        exibirProdutos();
    }

    function exibirProdutos() {
        produtosContainer.innerHTML = ''; 
        let produtosParaExibir = produtos.filter(p => p.ativo); 

        if (categoriaSelecionada !== 'todos') {
            produtosParaExibir = produtosParaExibir.filter(p => p.categoria_id === categoriaSelecionada);
        }

        if (produtosParaExibir.length === 0) {
            produtosContainer.innerHTML = `<p style="text-align: center; color: #666; grid-column: 1 / -1;">Nenhum produto encontrado nesta categoria.</p>`;
            return;
        }

        produtosParaExibir.forEach(produto => {
            const produtoCard = document.createElement('div');
            produtoCard.className = `produto-card ${produto.estoque_atual <= 0 ? 'out-of-stock' : ''}`;
            
            produtoCard.innerHTML = `
                <div class="produto-imagem">
                    <i class="fas ${produto.icone || 'fa-cube'}"></i>
                    ${produto.estoque_atual <= 0 ? '<div class="out-of-stock-badge">ESGOTADO</div>' : ''}
                    ${(produto.estoque_atual > 0 && produto.estoque_atual <= produto.estoque_minimo) ? '<div class="low-stock-badge">ÚLTIMAS UNID.</div>' : ''}
                </div>
                <div class="produto-info">
                    <div class="produto-nome">${produto.nome}</div>
                    <div class="produto-categoria">${produto.categoria?.nome || 'Sem categoria'}</div>
                    <div class="produto-preco">R$ ${produto.preco_venda?.toFixed(2).replace('.', ',')}</div>
                    <button class="btn-adicionar" data-id="${produto.id}" ${produto.estoque_atual <= 0 ? 'disabled' : ''}>
                        ${produto.estoque_atual <= 0 ? 'Esgotado' : '<i class="fas fa-plus"></i> Adicionar'}
                    </button>
                </div>
            `;
            
            produtoCard.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-adicionar')) {
                    adicionarAoCarrinho(produto);
                }
            });
            
            produtoCard.querySelector('.btn-adicionar').addEventListener('click', (e) => {
                e.stopPropagation(); 
                adicionarAoCarrinho(produto);
            });

            produtosContainer.appendChild(produtoCard);
        });
    }

    function obterDadosCliente() {
        const endereco = enderecoInput.value.trim();
        if (clienteLogado) {
             const nome = clientePerfil.nome;
             const telefone = clientePerfil.telefone;
             
             if (!telefone) {
                mostrarMensagem('Por favor, informe seu número de WhatsApp no pop-up do Perfil antes de finalizar o pedido.', 'error');
                profileBtn.click();
                return null;
             }
             
             return {
                 nome: nome,
                 telefone: telefone,
                 endereco: endereco,
                 authId: clienteLogado.id
             };
        } else {
             const nome = nomeInputManual.value.trim();
             const telefone = telefoneInputManual.value.trim();
             
             return {
                 nome: nome,
                 telefone: telefone,
                 endereco: endereco,
                 authId: null
             };
        }
    }

    function validarDados() {
        const dadosCliente = obterDadosCliente();
        const formaPagamentoEl = document.querySelector('input[name="pagamento"]:checked');

        if (carrinho.length === 0) {
            mostrarMensagem('Sua sacola está vazia!', 'error');
            return null;
        }
        if (!dadosCliente || !dadosCliente.nome || !dadosCliente.telefone || !dadosCliente.endereco) {
            mostrarMensagem('Por favor, preencha todos os seus dados e o endereço (logado ou manualmente).', 'error');
            return null;
        }
        if (!formaPagamentoEl) {
            mostrarMensagem('Por favor, escolha uma forma de pagamento.', 'error');
            return null;
        }
        
        let total = 0;
        let listaItens = "Itens:\n";
        carrinho.forEach(item => {
            const subtotal = item.produto.preco_venda * item.quantidade;
            total += subtotal;
            listaItens += `* ${item.quantidade}x ${item.produto.nome} (R$ ${item.produto.preco_venda.toFixed(2)})\n`;
        });
        
        return {
            ...dadosCliente,
            formaPagamento: formaPagamentoEl.value,
            total: total,
            observacoes: listaItens + `\nTotal: R$ ${total.toFixed(2)}`
        };
    }

    // --- FUNÇÕES DE AUTHENTICAÇÃO DO CLIENTE ---

    async function fazerLoginGoogle() {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.href, 
                    scopes: 'email profile'
                }
            });
            if (error) throw error;
        } catch (error) {
            mostrarMensagem(`Erro no Login com Google: ${error.message}`, 'error');
        }
    }

    async function fazerLogoutPublico() {
        await supabase.auth.signOut();
        clienteLogado = null;
        clientePerfil = { nome: null, telefone: null };
        profileModal.style.display = 'none';
        gerenciarEstadoAuth();
        mostrarMensagem('Logout realizado com sucesso!', 'info');
        window.location.reload(); 
    }

    async function carregarPerfilCliente() {
        if (!clienteLogado) return;
        try {
            const { data, error } = await supabase.from('clientes')
                .select('telefone')
                .eq('auth_id', clienteLogado.id)
                .single();
                
            if (error && error.code !== 'PGRST116') throw error;
            
            if (data) {
                clientePerfil.telefone = data.telefone;
            } else {
                clientePerfil.telefone = null;
            }
            
        } catch (error) {
            console.error('Erro ao buscar perfil do cliente:', error);
            clientePerfil.telefone = null;
        }
    }

    async function gerenciarEstadoAuth() {
        const { data: { user } } = await supabase.auth.getUser();
        clienteLogado = user;

        if (clienteLogado) {
            loginGoogleBtn.style.display = 'none';
            profileBtn.style.display = 'block';
            
            const nomeCurto = clienteLogado.user_metadata?.full_name?.split(' ')[0] || clienteLogado.email.split('@')[0];
            profileNameSpan.textContent = nomeCurto;
            
            clientePerfil.nome = clienteLogado.user_metadata?.full_name || nomeCurto;
            await carregarPerfilCliente();
            
            document.getElementById('logged-in-info').style.display = 'block';
            formCliente.style.display = 'none';

            document.getElementById('cliente-nome-logado').textContent = clientePerfil.nome;
            nomeInputHidden.value = clientePerfil.nome;

            if (clientePerfil.telefone) {
                document.getElementById('cliente-telefone-logado').textContent = clientePerfil.telefone;
                telefoneInputHidden.value = clientePerfil.telefone;
            } else {
                 document.getElementById('cliente-telefone-logado').textContent = 'N/A (Clique para cadastrar o WhatsApp)';
            }
            
            if (meusPedidosTab.classList.contains('active')) {
                carregarHistoricoPedidos();
            }

        } else {
            loginGoogleBtn.style.display = 'block';
            profileBtn.style.display = 'none';
            document.getElementById('logged-in-info').style.display = 'none';
            formCliente.style.display = 'block';
            
            nomeInputManual.value = nomeInputHidden.value || '';
            telefoneInputManual.value = telefoneInputHidden.value || '';
            
            nomeInputHidden.value = '';
            telefoneInputHidden.value = '';
        }
    }

    async function carregarHistoricoPedidos() {
        pedidosHistoryBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Carregando...</td></tr>';
        historicoList.style.display = 'none';
        historicoMessage.style.display = 'block';
        historicoMessage.textContent = 'Carregando histórico...';
        
        if (!clienteLogado) {
            historicoMessage.textContent = 'Faça login para visualizar seus pedidos anteriores.';
            return;
        }
        
        try {
            const { data, error } = await supabase.from('pedidos_online')
                .select('*')
                .eq('customer_auth_id', clienteLogado.id)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            pedidosHistoryBody.innerHTML = '';
            historicoList.style.display = 'block';
            historicoMessage.style.display = 'none';

            if (data.length === 0) {
                pedidosHistoryBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum pedido encontrado.</td></tr>';
                return;
            }

            data.forEach(pedido => {
                const dataFormatada = new Date(pedido.created_at).toLocaleDateString('pt-BR');
                const statusClass = pedido.status;
                
                pedidosHistoryBody.innerHTML += `
                    <tr>
                        <td>#${pedido.id}</td>
                        <td>${dataFormatada}</td>
                        <td>${formatarMoeda(pedido.total)}</td>
                        <td><span class="status-badge-history status-${statusClass}">${pedido.status.toUpperCase()}</span></td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick="alert('Detalhes:\\n${pedido.observacoes.replace(/\n/g, '\\n')}')">
                                Ver Detalhes
                            </button>
                        </td>
                    </tr>
                `;
            });
            
        } catch (error) {
            console.error('❌ Erro ao carregar histórico:', error);
            historicoMessage.textContent = 'Erro ao carregar histórico. Tente novamente mais tarde.';
            historicoList.style.display = 'none';
        }
    }

    // --- FUNÇÕES DE AÇÃO ---

    async function finalizarPedidoDireto() {
        const dados = validarDados();
        if (!dados) return;
        
        if (!confirm(`Deseja SALVAR o pedido de ${formatarMoeda(dados.total)} diretamente no sistema?\n\nEle aparecerá como "Novo" no Painel Delivery.`)) {
            return;
        }
        
        finalizarDiretoBtn.disabled = true;
        finalizarDiretoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        
        try {
            const pedidoData = {
                nome_cliente: dados.nome,
                telefone_cliente: dados.telefone,
                endereco_entrega: dados.endereco,
                forma_pagamento: dados.formaPagamento.toLowerCase().replace(/[^a-z0-9]/g, '_'), 
                total: dados.total,
                observacoes: dados.observacoes,
                status: 'novo',
                customer_auth_id: dados.authId || null 
            };
            
            const { data, error } = await supabase.from('pedidos_online').insert([pedidoData]).select().single();
            
            if (error) throw error;
            
            mostrarMensagem(`✅ Pedido #${data.id} salvo com sucesso! Você pode acompanhá-lo na aba "Meus Pedidos".`, 'success');
            limparFormularioECarrinho();
            
        } catch (error) {
            console.error('❌ Erro ao salvar pedido direto:', error);
            mostrarMensagem('Erro ao salvar pedido no sistema. Tente novamente mais tarde.', 'error');
        } finally {
            finalizarDiretoBtn.disabled = false;
            finalizarDiretoBtn.innerHTML = '<i class="fas fa-check-circle"></i> Salvar no Sistema';
        }
    }

    async function enviarPedidoWhatsapp() {
        const dados = validarDados();
        if (!dados) return;

        if (NUMERO_WHATSAPP === '5573991964394' || NUMERO_WHATSAPP === 'SEU_NUMERO_DE_WHATSAPP') {
             mostrarMensagem('O número do WhatsApp não foi configurado. Avise o administrador.', 'error');
             alert('ERRO: O número do WhatsApp não foi configurado no arquivo js/pedido.js');
             return;
        }

        enviarPedidoBtn.disabled = true;
        enviarPedidoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando link...';

        let mensagem = `Olá, Confeitaria Doce Criativo! 🎂\n\n`;
        mensagem += `Gostaria de fazer o seguinte pedido:\n\n`;
        
        let total = 0;
        carrinho.forEach(item => {
            const subtotal = item.produto.preco_venda * item.quantidade;
            total += subtotal;
            mensagem += `*${item.quantidade}x* - ${item.produto.nome}\n`;
            mensagem += `_(Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')})_\n\n`;
        });

        mensagem += `*Total do Pedido: R$ ${total.toFixed(2).replace('.', ',')}*\n`;
        mensagem += `-----------------------------------\n`;
        mensagem += `*DADOS PARA ENTREGA:*\n`;
        mensagem += `*Nome:* ${dados.nome}\n`;
        mensagem += `*WhatsApp:* ${dados.telefone}\n`;
        mensagem += `*Endereço:* ${dados.endereco}\n\n`;
        mensagem += `*Forma de Pagamento:* ${dados.formaPagamento}\n\n`;
        mensagem += `Aguardo a confirmação do meu pedido! Obrigado(a).`;

        try {
            const mensagemCodificada = encodeURIComponent(mensagem);
            const urlWhatsapp = `https://wa.me/${NUMERO_WHATSAPP}?text=${mensagemCodificada}`;
            
            window.open(urlWhatsapp, '_blank');
            limparFormularioECarrinho();
            mostrarMensagem('Pedido enviado! Você foi redirecionado para o WhatsApp. Aguarde a confirmação!', 'success');

        } catch (error) {
            console.error('Erro ao gerar link do WhatsApp:', error);
            mostrarMensagem('Erro ao tentar enviar o pedido.', 'error');
        } finally {
            enviarPedidoBtn.disabled = false;
            enviarPedidoBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Enviar Pedido pelo WhatsApp';
        }
    }


    // --- FUNÇÕES DE EVENTOS ---

    function configurarEventListeners() {
        // Login/Logout
        if (loginGoogleBtn) loginGoogleBtn.addEventListener('click', fazerLoginGoogle);
        if (profileBtn) profileBtn.addEventListener('click', () => { 
            modalUserEmail.textContent = clienteLogado?.email || 'N/A';
            profileModal.style.display = 'flex';
        });
        if (logoutBtnPublico) logoutBtnPublico.addEventListener('click', fazerLogoutPublico);
        if (closeProfileModal) closeProfileModal.addEventListener('click', () => profileModal.style.display = 'none');
        window.addEventListener('click', (e) => { if (e.target === profileModal) profileModal.style.display = 'none'; });

        // Navegação por abas
        document.querySelectorAll('.tab-btn-cliente').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn-cliente').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content-cliente').forEach(c => c.classList.remove('active'));
                
                e.currentTarget.classList.add('active');
                const tabId = e.currentTarget.getAttribute('data-tab');
                document.getElementById(`tab-${tabId}`).classList.add('active');
                
                if (tabId === 'meus-pedidos') {
                    carregarHistoricoPedidos();
                }
            });
        });
        
        // Ações de Finalização
        if (enviarPedidoBtn) enviarPedidoBtn.addEventListener('click', enviarPedidoWhatsapp);
        if (finalizarDiretoBtn) finalizarDiretoBtn.addEventListener('click', finalizarPedidoDireto); // AGORA ESTÁ DEFINIDA!
        
        // Seleção de Pagamento
        pagamentoOpcoes.forEach(opcao => {
            opcao.addEventListener('click', () => {
                pagamentoOpcoes.forEach(op => op.classList.remove('selected'));
                opcao.classList.add('selected');
                opcao.querySelector('input[name="pagamento"]').checked = true;
            });
        });
        
        // Atualiza o carrinho quando o cliente preenche os dados manualmente
        if (!clienteLogado) {
             nomeInputManual.addEventListener('input', atualizarCarrinho);
             telefoneInputManual.addEventListener('input', atualizarCarrinho);
        }
    }


    // --- Inicialização da Página (IIFE) ---
    
    (async function() {
        try {
            if (!window.vendasSupabase) {
                 throw new Error('Módulo de vendas (supabase-vendas.js) não carregado.');
            }
            const conexaoOk = await window.vendasSupabase.testarConexao();
            if (!conexaoOk) {
                throw new Error('Não foi possível conectar ao cardápio');
            }
            
            await gerenciarEstadoAuth(); 
            await carregarCategorias(); 
            await carregarProdutos();
            configurarEventListeners();
            atualizarCarrinho(); 

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            mostrarMensagem('Erro ao carregar o cardápio: ' + error.message, 'error');
            categoriasContainer.innerHTML = '<p style="color: red;">Erro ao carregar categorias.</p>';
            produtosContainer.innerHTML = '<p style="color: red;">Erro ao carregar produtos.</p>';
        }
    })();
});