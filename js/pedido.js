// js/pedido.js - Sistema Completo de Pedidos Mobile App (Login por Telefone)

document.addEventListener('DOMContentLoaded', async function() {
    
    // --- CONFIGURAÇÕES E VARIÁVEIS ---
    const NUMERO_WHATSAPP = '5573991964394'; 
    
    let clienteLogado = null;
    let clientePerfil = { nome: null, telefone: null, endereco: null }; 

    // Elementos da Interface
    const appContainer = document.getElementById('app-container');
    const authScreen = document.getElementById('auth-screen');
    const mobileNav = document.getElementById('mobile-bottom-nav');
    const navItems = document.querySelectorAll('.nav-item-app');
    
    // Elementos de Login/Cadastro
    const authTelefoneInput = document.getElementById('auth-telefone');
    const btnIniciarSessao = document.getElementById('btn-iniciar-sessao');
    const cadastroForm = document.getElementById('cadastro-form');
    const cadastroTelefoneHidden = document.getElementById('cadastro-telefone-hidden');
    const cadastroNomeInput = document.getElementById('cadastro-nome');
    
    // NOVOS ELEMENTOS DE ENDEREÇO
    const cadastroCepInput = document.getElementById('cadastro-cep');
    const cadastroRuaInput = document.getElementById('cadastro-rua');
    const cadastroNumeroInput = document.getElementById('cadastro-numero');
    const cadastroBairroInput = document.getElementById('cadastro-bairro');
    const cadastroCidadeInput = document.getElementById('cadastro-cidade');
    const cadastroEstadoInput = document.getElementById('cadastro-estado');

    const btnFinalizarCadastro = document.getElementById('btn-finalizar-cadastro');
    
    // Elementos do App Logado
    const profileDisplay = document.getElementById('profile-display');
    const profileNameSpan = document.getElementById('profile-name');
    const logoutBtnApp = document.getElementById('logout-btn-app');
    const homeClienteNome = document.getElementById('home-cliente-nome');
    const statusUltimoPedido = document.getElementById('status-ultimo-pedido');
    const homeEndereco = document.getElementById('home-endereco');

    // Elementos do Carrinho
    const categoriasContainer = document.getElementById('categorias-container');
    const produtosContainer = document.getElementById('produtos-container');
    const carrinhoItens = document.getElementById('carrinho-itens');
    const totalCarrinho = document.getElementById('total-carrinho');
    const finalizarDiretoBtn = document.getElementById('finalizar-pedido-direto');
    const carrinhoEnderecoDisplay = document.getElementById('carrinho-endereco-display');
    const carrinhoClienteNomeDisplay = document.getElementById('carrinho-cliente-nome');
    const carrinhoEnderecoInput = document.getElementById('carrinho-endereco-input');
    const enviarPedidoBtn = document.getElementById('enviar-pedido-whatsapp');
    const pagamentoOpcoesContainer = document.querySelector('#view-carrinho .opcoes-pagamento'); 

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
    
    function alternarView(viewId) {
        document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        
        navItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-view') === viewId);
        });
        
        if (viewId === 'view-carrinho') {
            atualizarCarrinhoDisplay();
        }
        if (viewId === 'view-inicio') {
            carregarStatusUltimoPedido();
        }
    }
    
    function formatarTelefone(telefone) {
        const digitos = telefone.replace(/\D/g, '');
        return digitos.length >= 12 ? digitos : '55' + digitos;
    }

    // --- FUNÇÃO DE BUSCA POR CEP ---

    window.buscarCep = async function(cep) {
        const cepLimpo = cep.replace(/\D/g, ''); 
        
        if (cepLimpo.length !== 8) {
            return;
        }

        mostrarMensagem('Buscando endereço...', 'info');

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();

            if (data.erro) {
                mostrarMensagem('CEP não encontrado ou inválido.', 'error');
                return;
            }

            cadastroRuaInput.value = data.logradouro || '';
            cadastroBairroInput.value = data.bairro || '';
            cadastroCidadeInput.value = data.localidade || '';
            cadastroEstadoInput.value = data.uf || '';
            
            cadastroNumeroInput.focus();
            mostrarMensagem('Endereço preenchido automaticamente.', 'success');

        } catch (error) {
            console.error('Erro na API ViaCEP:', error);
            mostrarMensagem('Erro ao buscar o CEP. Preencha manualmente.', 'error');
        }
    }

    // --- FUNÇÕES CORE ---

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
            
            const isReady = carrinho.length > 0 && clienteLogado; 
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
        carrinhoEnderecoInput.value = clientePerfil.endereco || '';
        cadastroForm.reset();
        document.querySelectorAll('.opcoes-pagamento input[name="pagamento"]').checked = true;
        document.querySelectorAll('.opcoes-pagamento .pagamento-opcao').forEach(op => op.classList.remove('selected'));
        if (document.querySelector('.opcoes-pagamento .pagamento-opcao')) document.querySelector('.opcoes-pagamento .pagamento-opcao').classList.add('selected');
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
        const endereco = carrinhoEnderecoInput.value.trim();
        if (clienteLogado) {
             const nome = clientePerfil.nome;
             const telefone = clientePerfil.telefone;
             
             if (!telefone) {
                mostrarMensagem('Telefone não encontrado no perfil. Refaça o login/cadastro.', 'error');
                return null;
             }
             
             return {
                 nome: nome,
                 telefone: telefone,
                 endereco: endereco,
                 authId: clienteLogado.id
             };
        } else {
             mostrarMensagem('Erro de autenticação.', 'error');
             return null;
        }
    }

    function validarDados() {
        const dadosCliente = obterDadosCliente();
        const formaPagamentoEl = document.querySelector('.opcoes-pagamento input[name="pagamento"]:checked');

        if (carrinho.length === 0) {
            mostrarMensagem('Sua sacola está vazia!', 'error');
            return null;
        }
        if (!dadosCliente || !dadosCliente.nome || !dadosCliente.telefone || !dadosCliente.endereco) {
            mostrarMensagem('Dados do cliente ou endereço incompletos. Verifique o Login/Cadastro.', 'error');
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

    // --- FUNÇÕES DE AUTHENTICAÇÃO E CADASTRO ---

    async function buscarClientePorTelefone(telefone) {
        try {
            const { data, error } = await supabase.from('clientes_delivery')
                .select('*')
                .eq('telefone', telefone);
            
            if (error) throw error;
            
            return data.length > 0 ? data[0] : null;
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            mostrarMensagem('Erro ao consultar banco de dados. Verifique a RLS.', 'error');
            return null;
        }
    }

    async function iniciarSessao(e) {
        e.preventDefault();
        const telefoneRaw = authTelefoneInput.value.trim();
        const telefone = formatarTelefone(telefoneRaw);

        if (telefone.length < 10) { 
            return mostrarMensagem('Por favor, insira um telefone válido com DDD.', 'error');
        }

        btnIniciarSessao.disabled = true;
        btnIniciarSessao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

        const cliente = await buscarClientePorTelefone(telefone);

        if (cliente) {
            clientePerfil.nome = cliente.nome;
            clientePerfil.telefone = cliente.telefone;
            clientePerfil.endereco = cliente.endereco;

            mostrarMensagem(`Bem-vindo de volta, ${cliente.nome.split(' ')[0]}!`, 'success');
            logarClienteManual();
            
        } else {
            cadastroTelefoneHidden.value = telefone;
            document.getElementById('login-form-group').style.display = 'none';
            cadastroForm.style.display = 'block';
            mostrarMensagem('Novo cliente detectado! Por favor, complete seu cadastro.', 'info');
        }

        btnIniciarSessao.disabled = false;
        btnIniciarSessao.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar ou Cadastrar';
    }

    async function finalizarCadastro(e) {
        e.preventDefault();
        const nome = cadastroNomeInput.value.trim();
        const telefone = cadastroTelefoneHidden.value;
        
        const cep = cadastroCepInput.value.trim();
        const rua = cadastroRuaInput.value.trim();
        const numero = cadastroNumeroInput.value.trim();
        const bairro = cadastroBairroInput.value.trim();
        const cidade = cadastroCidadeInput.value.trim();
        const estado = cadastroEstadoInput.value.trim();

        const enderecoCompleto = `${rua}, ${numero}, ${bairro} - ${cidade}/${estado} (CEP: ${cep})`;

        if (!nome || !rua || !numero || !bairro || !cidade || !estado) {
            return mostrarMensagem('Preencha o Nome e todos os campos de Endereço corretamente.', 'error');
        }
        
        btnFinalizarCadastro.disabled = true;
        btnFinalizarCadastro.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';

        try {
            const { data: novoCliente, error } = await supabase.from('clientes_delivery').insert({
                nome: nome,
                telefone: telefone,
                endereco: enderecoCompleto, 
                auth_id: 'guest-' + telefone 
            }).select();

            if (error) {
                if (error.code === '23505') {
                    throw new Error("Este número já está cadastrado. Por favor, use a tela inicial para Entrar.");
                }
                throw error;
            }

            clientePerfil.nome = novoCliente[0].nome;
            clientePerfil.telefone = novoCliente[0].telefone;
            clientePerfil.endereco = novoCliente[0].endereco;
            
            mostrarMensagem(`Cadastro de ${nome.split(' ')[0]} concluído!`, 'success');
            logarClienteManual();

        } catch (error) {
            console.error('Erro no cadastro:', error);
            mostrarMensagem('Erro ao finalizar cadastro: ' + error.message, 'error');
        } finally {
            btnFinalizarCadastro.disabled = false;
            btnFinalizarCadastro.innerHTML = 'Finalizar Cadastro';
        }
    }
    
    function logarClienteManual() {
        localStorage.setItem('clienteTelefone', clientePerfil.telefone);
        clienteLogado = { id: clientePerfil.telefone, email: clientePerfil.telefone }; 
        
        authScreen.classList.remove('active');
        mobileNav.style.display = 'flex';
        alternarView('view-cardapio');
        atualizarPerfilUI();
    }
    
    function fazerLogoutApp() {
        localStorage.removeItem('clienteTelefone');
        clienteLogado = null;
        clientePerfil = { nome: null, telefone: null, endereco: null };
        mobileNav.style.display = 'none';
        
        authTelefoneInput.value = '';
        cadastroForm.style.display = 'none';
        document.getElementById('login-form-group').style.display = 'block';

        mostrarMensagem('Sessão encerrada.', 'info');
        alternarView('auth-screen');
    }

    async function carregarStatusUltimoPedido() {
        statusUltimoPedido.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
        
        try {
            const { data, error } = await supabase.from('pedidos_online')
                .select('*')
                .eq('telefone_cliente', clientePerfil.telefone)
                .order('created_at', { ascending: false })
                .limit(1); 
                
            if (error) throw error;
            
            const ultimoPedido = data ? data[0] : null;
            
            if (ultimoPedido) {
                statusUltimoPedido.innerHTML = `
                    <p>Pedido #${ultimoPedido.id} - Status: 
                        <span class="status-badge-history status-${ultimoPedido.status}">
                            ${ultimoPedido.status.toUpperCase()}
                        </span>
                    </p>
                    <p style="font-size: 0.9rem;">Total: ${formatarMoeda(ultimoPedido.total)}</p>
                `;
            } else {
                 statusUltimoPedido.innerHTML = 'Você ainda não fez nenhum pedido conosco!';
            }
            
            homeEndereco.innerHTML = clientePerfil.endereco || 'Endereço não cadastrado.';
            
        } catch (error) {
            statusUltimoPedido.innerHTML = 'Erro ao carregar status.';
            console.error('Erro ao carregar status do pedido:', error);
        }
    }

    function atualizarPerfilUI() {
        profileNameSpan.textContent = clientePerfil.nome.split(' ')[0];
        homeClienteNome.textContent = clientePerfil.nome.split(' ')[0];
        carrinhoClienteNomeDisplay.textContent = clientePerfil.nome || 'N/A';
        carrinhoEnderecoDisplay.textContent = clientePerfil.endereco || 'N/A';
        carrinhoEnderecoInput.value = clientePerfil.endereco || '';
        
        const opcoesPagamentoOriginal = document.querySelector('.pagamento .opcoes-pagamento');
        if (pagamentoOpcoesContainer.children.length === 0 && opcoesPagamentoOriginal) {
            pagamentoOpcoesContainer.innerHTML = opcoesPagamentoOriginal.innerHTML;
        }
    }

    function atualizarCarrinhoDisplay() {
        carrinhoClienteNomeDisplay.textContent = clientePerfil.nome || 'N/A';
        carrinhoEnderecoDisplay.textContent = clientePerfil.endereco || 'N/A';
        carrinhoEnderecoInput.value = clientePerfil.endereco || '';
        
        atualizarCarrinho();
    }
    
    async function finalizarPedidoDireto() { 
        const dados = validarDados();

        if (!dados) return;

        mostrarMensagem('Processando pedido...', 'info');
        finalizarDiretoBtn.disabled = true;

        try {
            // 1. Criar o pedido_online
            const { error } = await supabase.from('pedidos_online').insert({
                nome_cliente: dados.nome,
                telefone_cliente: dados.telefone,
                endereco_entrega: dados.endereco,
                forma_pagamento: dados.formaPagamento,
                total: dados.total,
                status: 'novo',
                observacoes: dados.observacoes
            });

            if (error) throw error;
            
            // 2. Atualizar estoque
            for (const item of carrinho) {
                const produtoId = item.produto.id;
                const quantidade = item.quantidade;
                const novoEstoque = item.produto.estoque_atual - quantidade;

                await supabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', produtoId);
            }

            mostrarMensagem('✅ Pedido enviado e registrado com sucesso!', 'success');
            limparFormularioECarrinho();
            alternarView('view-inicio');
            carregarStatusUltimoPedido();

        } catch (error) {
            console.error("Erro ao finalizar pedido direto:", error);
            mostrarMensagem(`Erro ao enviar pedido: ${error.message}`, 'error');
        } finally {
            finalizarDiretoBtn.disabled = false;
        }
    }
    
    async function enviarPedidoWhatsapp() { 
        const dados = validarDados();

        if (!dados) return;

        let mensagem = `*PEDIDO ONLINE - DOCE CRIATIVO*\n\n`;
        mensagem += `*Cliente:* ${dados.nome}\n`;
        mensagem += `*Telefone:* ${dados.telefone}\n`;
        mensagem += `*Endereço:* ${dados.endereco}\n`;
        mensagem += `*Pagamento:* ${dados.formaPagamento}\n\n`;
        mensagem += `*TOTAL:* ${formatarMoeda(dados.total)}\n\n`;
        mensagem += dados.observacoes;

        const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
        window.open(url, '_blank');
        
        mostrarMensagem('Mensagem do pedido enviada! Aguarde a confirmação via WhatsApp.', 'info');
    }

    // --- FUNÇÕES DE EVENTOS ---

    function configurarEventListeners() {
        if (btnIniciarSessao) btnIniciarSessao.addEventListener('click', iniciarSessao);
        if (cadastroForm) cadastroForm.addEventListener('submit', finalizarCadastro);
        if (logoutBtnApp) logoutBtnApp.addEventListener('click', fazerLogoutApp);

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                alternarView(item.getAttribute('data-view'));
            });
        });
        
        if (enviarPedidoBtn) enviarPedidoBtn.addEventListener('click', enviarPedidoWhatsapp);
        if (finalizarDiretoBtn) finalizarDiretoBtn.addEventListener('click', finalizarPedidoDireto);
        
        carrinhoEnderecoInput.addEventListener('change', (e) => {
             clientePerfil.endereco = e.target.value.trim();
             carrinhoEnderecoDisplay.textContent = clientePerfil.endereco;
        });
        
        document.querySelectorAll('.opcoes-pagamento .pagamento-opcao').forEach(opcao => {
            opcao.addEventListener('click', () => {
                document.querySelectorAll('.opcoes-pagamento .pagamento-opcao').forEach(op => op.classList.remove('selected'));
                opcao.classList.add('selected');
                opcao.querySelector('input[name="pagamento"]').checked = true;
            });
        });
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
            
            const telefoneSalvo = localStorage.getItem('clienteTelefone');
            
            if (telefoneSalvo) {
                const cliente = await buscarClientePorTelefone(telefoneSalvo);
                if (cliente) {
                    clientePerfil.nome = cliente.nome;
                    clientePerfil.telefone = cliente.telefone;
                    clientePerfil.endereco = cliente.endereco;
                    logarClienteManual();
                } else {
                     alternarView('auth-screen');
                }
            } else {
                 alternarView('auth-screen');
            }
            
            await carregarCategorias(); 
            await carregarProdutos();
            configurarEventListeners();
            atualizarCarrinho();

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            mostrarMensagem('Erro ao carregar o app: ' + error.message, 'error');
            document.getElementById('auth-screen').classList.add('active');
        }
    })();
});