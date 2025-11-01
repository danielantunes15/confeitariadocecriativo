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
    const cadastroEnderecoInput = document.getElementById('cadastro-endereco');
    const btnFinalizarCadastro = document.getElementById('btn-finalizar-cadastro');
    
    // Elementos do App Logado
    const profileDisplay = document.getElementById('profile-display');
    const profileNameSpan = document.getElementById('profile-name');
    const logoutBtnApp = document.getElementById('logout-btn-app');
    const homeClienteNome = document.getElementById('home-cliente-nome');
    const statusUltimoPedido = document.getElementById('status-ultimo-pedido');

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

    // --- FUNÇÕES DE UTILIDADE E UI ---

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
    }
    
    function formatarTelefone(telefone) {
        // Remove tudo que não for dígito e adiciona 55 para Supabase/WhatsApp
        const digitos = telefone.replace(/\D/g, '');
        return digitos.length >= 10 ? '55' + digitos : digitos;
    }


    // --- FUNÇÕES DE AUTENTICAÇÃO E CADASTRO (LÓGICA SEM SENHA) ---

    async function buscarClientePorTelefone(telefone) {
        try {
            const { data, error } = await supabase.from('clientes')
                .select('*')
                .eq('telefone', telefone)
                .single();
            
            if (error && error.code !== 'PGRST116') return null; // Cliente não encontrado
            if (error) throw error;
            
            return data;
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            mostrarMensagem('Erro ao consultar banco de dados.', 'error');
            return null;
        }
    }

    async function iniciarSessao(e) {
        e.preventDefault();
        const telefoneRaw = authTelefoneInput.value.trim();
        const telefone = formatarTelefone(telefoneRaw);

        if (telefone.length < 12) { // 55 + DDD + 8 ou 9 dígitos
            return mostrarMensagem('Por favor, insira um telefone válido com DDD (Ex: 557399...).', 'error');
        }

        btnIniciarSessao.disabled = true;
        btnIniciarSessao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

        const cliente = await buscarClientePorTelefone(telefone);

        if (cliente) {
            // LOGIN AUTOMÁTICO (Cliente já existe)
            clientePerfil.nome = cliente.nome;
            clientePerfil.telefone = cliente.telefone;
            clientePerfil.endereco = cliente.endereco;

            mostrarMensagem(`Bem-vindo de volta, ${cliente.nome.split(' ')[0]}!`, 'success');
            logarClienteManual(); // Pula o cadastro
            
        } else {
            // INICIAR CADASTRO
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
        const endereco = cadastroEnderecoInput.value.trim();
        const telefone = cadastroTelefoneHidden.value;

        if (!nome || !endereco) {
            return mostrarMensagem('Nome e Endereço são obrigatórios.', 'error');
        }
        
        btnFinalizarCadastro.disabled = true;
        btnFinalizarCadastro.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';

        try {
            // 1. Salvar o novo cliente
            const { data: novoCliente, error } = await supabase.from('clientes').insert({
                nome: nome,
                telefone: telefone,
                endereco: endereco,
                auth_id: 'guest-' + telefone // ID de Autenticação simulado para controle interno
            }).select().single();

            if (error) throw error;

            // 2. Logar o cliente
            clientePerfil.nome = novoCliente.nome;
            clientePerfil.telefone = novoCliente.telefone;
            clientePerfil.endereco = novoCliente.endereco;
            
            mostrarMensagem(`Cadastro de ${nome.split(' ')[0]} concluído!`, 'success');
            logarClienteManual();

        } catch (error) {
            console.error('Erro no cadastro:', error);
            mostrarMensagem('Erro ao finalizar cadastro.', 'error');
        } finally {
            btnFinalizarCadastro.disabled = false;
            btnFinalizarCadastro.innerHTML = 'Finalizar Cadastro';
        }
    }
    
    function logarClienteManual() {
        // Simula o estado de login para o app
        localStorage.setItem('clienteTelefone', clientePerfil.telefone);
        clienteLogado = { id: clientePerfil.telefone, email: clientePerfil.telefone }; // Usa o telefone como ID temporário
        
        // Atualiza a UI para o modo App
        authScreen.classList.remove('active');
        mobileNav.style.display = 'flex';
        alternarView('view-inicio');
        atualizarPerfilUI();
        carregarStatusUltimoPedido();
        atualizarCarrinho(); // Garante que o carrinho se habilite
    }
    
    function fazerLogoutApp() {
        localStorage.removeItem('clienteTelefone');
        clienteLogado = null;
        clientePerfil = { nome: null, telefone: null, endereco: null };
        mobileNav.style.display = 'none';
        
        // Resetar tela de auth
        authTelefoneInput.value = '';
        cadastroForm.style.display = 'none';
        document.getElementById('login-form-group').style.display = 'block';

        mostrarMensagem('Sessão encerrada.', 'info');
        alternarView('auth-screen');
    }

    // --- FUNÇÕES DE CARREGAMENTO E ATUALIZAÇÃO DO CARDÁPIO ---

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
    
    // (Funções exibirCategorias, selecionarCategoria, exibirProdutos, adicionarAoCarrinho, etc. permanecem as mesmas)

    // --- FUNÇÕES DE LÓGICA DE PEDIDOS ---

    function atualizarPerfilUI() {
        profileNameSpan.textContent = clientePerfil.nome.split(' ')[0];
        homeClienteNome.textContent = clientePerfil.nome.split(' ')[0];
        carrinhoClienteNomeDisplay.textContent = clientePerfil.nome.split(' ')[0];
        carrinhoEnderecoDisplay.textContent = clientePerfil.endereco;
        carrinhoEnderecoInput.value = clientePerfil.endereco;
        
        // Se houver endereço salvo, atualiza o display no carrinho
        const opcoesPagamentoExistentes = pagamentoOpcoesContainer.innerHTML;
        if (opcoesPagamentoExistentes === '') {
            pagamentoOpcoesContainer.innerHTML = document.querySelector('.pagamento .opcoes-pagamento')?.innerHTML || 'Opções de pagamento não carregadas.';
        }
    }

    async function carregarStatusUltimoPedido() {
        statusUltimoPedido.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
        
        try {
            const { data, error } = await supabase.from('pedidos_online')
                .select('*')
                .eq('telefone_cliente', clientePerfil.telefone)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
                
            if (error && error.code === 'PGRST116') { // Não encontrado
                statusUltimoPedido.innerHTML = 'Você ainda não fez nenhum pedido conosco!';
                return;
            }
            if (error) throw error;
            
            statusUltimoPedido.innerHTML = `
                <p>Pedido #${data.id} - Status: 
                    <span class="status-badge-history status-${data.status}">
                        ${data.status.toUpperCase()}
                    </span>
                </p>
                <p style="font-size: 0.9rem;">Total: ${formatarMoeda(data.total)}</p>
            `;
            
        } catch (error) {
            statusUltimoPedido.innerHTML = 'Erro ao carregar status.';
            console.error('Erro ao carregar status do pedido:', error);
        }
    }
    
    // (Funções validarDados, finalizarPedidoDireto, enviarPedidoWhatsapp, etc., devem ser adaptadas para usar as novas variáveis de cliente)


    // --- ADAPTAÇÃO DA LÓGICA DO CARRINHO PARA O NOVO HTML ---

    function atualizarCarrinhoDisplay() {
        // Lógica para injetar as opções de pagamento no carrinho (se necessário)
        // ...
        
        // Atualiza a exibição de dados do cliente no carrinho
        carrinhoClienteNomeDisplay.textContent = clientePerfil.nome || 'N/A';
        carrinhoEnderecoDisplay.textContent = clientePerfil.endereco || 'N/A';
        carrinhoEnderecoInput.value = clientePerfil.endereco || '';
        
        atualizarCarrinho(); // Chamada para a lógica do carrinho
    }
    
    // --- FUNÇÕES DE EVENTOS E INICIALIZAÇÃO ---

    function configurarEventListeners() {
        // Navegação de Abas
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                alternarView(item.getAttribute('data-view'));
            });
        });

        // Auth
        if (btnIniciarSessao) btnIniciarSessao.addEventListener('click', iniciarSessao);
        if (cadastroForm) cadastroForm.addEventListener('submit', finalizarCadastro);
        if (logoutBtnApp) logoutBtnApp.addEventListener('click', fazerLogoutApp);

        // Ações no Carrinho
        // Os listeners para finalizarPedidoDireto e enviarPedidoWhatsapp devem ser atualizados
        // para usar as variáveis globais 'clientePerfil' e 'carrinhoEnderecoInput.value'.
        // Exemplo:
        // if (finalizarDiretoBtn) finalizarDiretoBtn.addEventListener('click', finalizarPedidoDireto); 
        
        // Listener para atualizar o endereço no perfil ao digitar
        carrinhoEnderecoInput.addEventListener('change', (e) => {
             clientePerfil.endereco = e.target.value.trim();
             carrinhoEnderecoDisplay.textContent = clientePerfil.endereco;
             // Opcional: Salvar no banco (precisaria de uma função extra para update)
        });
        
        // Seleção inicial
        // ...
    }


    // --- Inicialização da Página ---
    
    (async function() {
        try {
            // Requer que supabase-vendas.js esteja carregado
            if (!window.vendasSupabase) throw new Error('Módulo de vendas não carregado.');
            if (!(await window.vendasSupabase.testarConexao())) throw new Error('Falha na conexão com o Supabase.');
            
            const telefoneSalvo = localStorage.getItem('clienteTelefone');
            
            if (telefoneSalvo) {
                // Tentar login automático se o telefone estiver salvo
                const cliente = await buscarClientePorTelefone(telefoneSalvo);
                if (cliente) {
                    clientePerfil.nome = cliente.nome;
                    clientePerfil.telefone = cliente.telefone;
                    clientePerfil.endereco = cliente.endereco;
                    logarClienteManual();
                }
            } else {
                 // Mostrar tela de login
                 alternarView('auth-screen');
            }
            
            await carregarCategorias(); 
            await carregarProdutos();
            configurarEventListeners();

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            mostrarMensagem('Erro ao carregar o app: ' + error.message, 'error');
            alternarView('auth-screen');
            categoriasContainer.innerHTML = '<p style="color: red;">Erro ao carregar dados.</p>';
            produtosContainer.innerHTML = '<p style="color: red;">Erro ao carregar dados.</p>';
        }
    })();

    // Funções auxiliares (exibirCategorias, selecionarCategoria, exibirProdutos, etc.)
    // ... devem ser definidas aqui ou movidas para o topo se estiverem dentro do escopo.
});