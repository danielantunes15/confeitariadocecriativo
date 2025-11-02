// js/pedido.js - Sistema Completo de Pedidos Mobile App (Login por Telefone)

document.addEventListener('DOMContentLoaded', async function() {
    
    // --- CONFIGURAÇÕES E VARIÁVEIS ---
    const NUMERO_WHATSAPP = '5573991964394'; 
    const AREA_COBERTURA_INICIAL = ['45', '46']; // Exemplo: Apenas para CEPs que começam com 45 ou 46 (Bahia)
    
    let clienteLogado = null;
    let clientePerfil = { nome: null, telefone: null, endereco: null }; 

    // Elementos da Interface
    const appContainer = document.getElementById('app-container');
    const authScreen = document.getElementById('auth-screen');
    const mobileNav = document.getElementById('mobile-bottom-nav');
    const navItems = document.querySelectorAll('.nav-item-app');
    
    // Elementos de Pesquisa e Carrinho
    const carrinhoBadge = document.getElementById('carrinho-badge'); 
    const filtroBuscaProdutos = document.getElementById('filtro-busca-produtos'); 
    const pedidoObservacoes = document.getElementById('pedido-observacoes'); 
    const trocoParaInput = document.getElementById('troco-para'); 
    
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
    const pagamentoOpcoesContainer = document.querySelector('#view-carrinho .opcoes-pagamento'); 
    
    // Elementos do Modal de Edição de Endereço (NOVOS)
    const modalEditarEndereco = document.getElementById('modal-editar-endereco');
    const formEditarEndereco = document.getElementById('form-editar-endereco');
    const modalCepInput = document.getElementById('modal-cep');
    const modalRuaInput = document.getElementById('modal-rua');
    const modalNumeroInput = document.getElementById('modal-numero');
    const modalBairroInput = document.getElementById('modal-bairro');
    
    // Elementos do Modal de Detalhes (NOVOS)
    const modalDetalhesProduto = document.getElementById('modal-detalhes-produto');
    const detalhesTitulo = document.getElementById('detalhes-titulo');
    const detalhesProdutoContent = document.getElementById('detalhes-produto-content');
    const detalhesPrecoModal = document.getElementById('detalhes-preco-modal');
    const btnAdicionarModal = document.getElementById('btn-adicionar-modal');
    
    // Elementos de Repetição de Compra (NOVOS)
    const repetirCompraContainer = document.getElementById('repetir-compra-container');
    const btnRepetirCompra = document.getElementById('btn-repetir-compra');

    let categorias = [];
    let produtos = [];
    let carrinho = [];
    let categoriaSelecionada = 'todos';

    // --- FUNÇÕES DE UTENSÍLIOS ---
    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    const mostrarMensagem = (mensagem, tipo = 'info') => {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return; // CORRIGIDO: 'container' foi trocado para 'alertContainer'
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.innerHTML = `<span>${mensagem}</span><button class="alert-close" onclick="this.parentElement.remove()">&times;</button>`;
        alertContainer.appendChild(alertDiv);
        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
    };
    
    // CORREÇÃO DE ESCOPO: Função alternarView exposta globalmente
    window.alternarView = function(viewId) {
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

    // --- FUNÇÃO DE VALIDAÇÃO DE ÁREA ---
    function validarAreaEntrega(cep) {
        if (!cep) return false;
        const prefixo = cep.substring(0, 2);
        return AREA_COBERTURA_INICIAL.includes(prefixo);
    }
    
    // --- FUNÇÃO DE BUSCA POR CEP (Para Cadastro e Modal de Edição) ---
    window.buscarCep = async function(cep) {
        const cepLimpo = cep.replace(/\D/g, ''); 
        
        if (cepLimpo.length !== 8) return;

        mostrarMensagem('Buscando endereço...', 'info');

        if (!validarAreaEntrega(cepLimpo)) {
            mostrarMensagem('❌ Não entregamos nesse CEP. Por favor, verifique a área de cobertura.', 'error');
            return;
        }

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();

            if (data.erro) {
                mostrarMensagem('CEP não encontrado ou inválido.', 'error');
                return;
            }
            
            if (document.getElementById('cadastro-form').style.display === 'block') {
                cadastroRuaInput.value = data.logradouro || '';
                cadastroBairroInput.value = data.bairro || '';
                cadastroCidadeInput.value = data.localidade || '';
                cadastroEstadoInput.value = data.uf || '';
                cadastroNumeroInput.focus();
            } else if (modalEditarEndereco.style.display === 'flex') {
                modalRuaInput.value = data.logradouro || '';
                modalBairroInput.value = data.bairro || '';
                modalNumeroInput.focus();
            }

            mostrarMensagem('Endereço preenchido automaticamente.', 'success');

        } catch (error) {
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
            if (finalizarDiretoBtn) finalizarDiretoBtn.disabled = true; 
            if (carrinhoBadge) carrinhoBadge.style.display = 'none';
        } else {
            carrinhoItens.innerHTML = '';
            let total = 0;
            let totalItens = 0; 
            carrinho.forEach((item, index) => {
                const itemSubtotal = item.produto.preco_venda * item.quantidade;
                total += itemSubtotal;
                totalItens += item.quantidade; 
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
            
            // Atualiza o badge
            if (carrinhoBadge) {
                carrinhoBadge.textContent = totalItens;
                carrinhoBadge.style.display = 'block';
            }

            // Verifica se está logado para habilitar botões de finalização
            const isReady = carrinho.length > 0 && clienteLogado; 
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
        
        pedidoObservacoes.value = ''; 
        trocoParaInput.value = ''; 
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
            // Consulta de produtos completa
            const { data: produtosData, error } = await supabase
                .from('produtos')
                .select('*, categoria:categorias(nome)')
                .order('nome');

            if (error) throw error;
            
            produtos = produtosData || [];
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
        categoriaTodos.innerHTML = `<span>Todos</span>`; // <--- MODIFICADO (sem ícone)
        categoriaTodos.addEventListener('click', () => selecionarCategoria('todos'));
        categoriasContainer.appendChild(categoriaTodos);

        categorias.forEach(categoria => {
            const categoriaBtn = document.createElement('button');
            categoriaBtn.className = `categoria-btn`;
            categoriaBtn.setAttribute('data-categoria', categoria.id);
            categoriaBtn.innerHTML = `<span>${categoria.nome}</span>`; // <--- MODIFICADO (sem ícone)
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
    
    // Abre o modal de detalhes do produto
    function abrirModalDetalhesProduto(produto) {
        detalhesTitulo.textContent = produto.nome;
        detalhesPrecoModal.textContent = formatarMoeda(produto.preco_venda);
        
        let estoqueStatus = '';
        if (produto.estoque_atual <= 0) {
            estoqueStatus = '<span style="color: var(--error-color); font-weight: bold;">ESGOTADO</span>';
        } else if (produto.estoque_atual <= produto.estoque_minimo) {
            estoqueStatus = `<span style="color: var(--warning-color); font-weight: bold;">ÚLTIMAS UNID. (${produto.estoque_atual})</span>`;
        } else {
             estoqueStatus = `<span style="color: var(--success-color); font-weight: bold;">Em Estoque</span>`;
        }

        detalhesProdutoContent.innerHTML = `
            <p>${produto.descricao || 'Nenhuma descrição disponível.'}</p>
            <p><strong>Preço:</strong> ${formatarMoeda(produto.preco_venda)}</p>
            <p><strong>Disponibilidade:</strong> ${estoqueStatus}</p>
        `;
        
        btnAdicionarModal.disabled = produto.estoque_atual <= 0;
        btnAdicionarModal.onclick = () => {
            adicionarAoCarrinho(produto);
            modalDetalhesProduto.style.display = 'none';
        };
        
        modalDetalhesProduto.style.display = 'flex';
    }


    function exibirProdutos() {
        produtosContainer.innerHTML = ''; 
        let produtosParaExibir = produtos.filter(p => p.ativo); 
        const termoBusca = filtroBuscaProdutos.value.toLowerCase().trim();

        if (categoriaSelecionada !== 'todos') {
            produtosParaExibir = produtosParaExibir.filter(p => p.categoria_id === categoriaSelecionada);
        }
        
        if (termoBusca) {
             produtosParaExibir = produtosParaExibir.filter(p => p.nome.toLowerCase().includes(termoBusca));
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
            
            // Altera o comportamento do clique no Card para abrir o modal
            produtoCard.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-adicionar')) {
                    abrirModalDetalhesProduto(produto);
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
        const trocoPara = parseFloat(trocoParaInput.value) || 0; 
        const observacoes = pedidoObservacoes.value.trim(); 

        if (clienteLogado) {
             const nome = clientePerfil.nome;
             const telefone = clientePerfil.telefone;
             
             if (!telefone) {
                window.alternarView('auth-screen');
                mostrarMensagem('Sua sessão expirou. Por favor, faça login novamente.', 'error');
                return null;
             }
             
             return {
                 nome: nome,
                 telefone: telefone,
                 endereco: endereco,
                 authId: clienteLogado.id,
                 trocoPara: trocoPara,
                 observacoes: observacoes
             };
        } else {
             window.alternarView('auth-screen');
             mostrarMensagem('🚨 Você precisa estar logado para enviar o pedido. Faça login ou cadastre-se!', 'error');
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
        
        if (!dadosCliente) {
             return null;
        }
        
        if (!dadosCliente.nome || !dadosCliente.telefone || !dadosCliente.endereco) {
            mostrarMensagem('Dados do cliente ou endereço incompletos. Verifique o Login/Cadastro.', 'error');
            return null;
        }
        
        const totalPedido = carrinho.reduce((sum, item) => sum + (item.produto.preco_venda * item.quantidade), 0);
        
        if (formaPagamentoEl.value === 'Dinheiro' && dadosCliente.trocoPara > 0 && dadosCliente.trocoPara < totalPedido) {
             mostrarMensagem('O valor do troco deve ser igual ou maior que o total do pedido. Ajuste o campo "Troco Para".', 'error');
             trocoParaInput.focus();
             return null;
        }
        if (formaPagamentoEl.value !== 'Dinheiro' && dadosCliente.trocoPara > 0) {
             mostrarMensagem('Atenção: Troco só é permitido para pagamento em Dinheiro.', 'warning');
             trocoParaInput.value = 0;
        }
        
        if (!formaPagamentoEl) {
            mostrarMensagem('Por favor, escolha uma forma de pagamento.', 'error');
            return null;
        }
        
        let listaItens = "Itens:\n";
        carrinho.forEach(item => {
            listaItens += `* ${item.quantidade}x ${item.produto.nome} (R$ ${item.produto.preco_venda.toFixed(2)})\n`;
        });
        
        let obsCompleta = dadosCliente.observacoes;
        if (dadosCliente.trocoPara > 0) {
             obsCompleta += `\nTROCO NECESSÁRIO: Sim, para ${formatarMoeda(dadosCliente.trocoPara)}`;
        } else if (formaPagamentoEl.value === 'Dinheiro') {
             obsCompleta += `\nTROCO NECESSÁRIO: Não`;
        }
        obsCompleta = listaItens + `\nTotal: R$ ${totalPedido.toFixed(2)}\n\nOBSERVAÇÕES ADICIONAIS:\n` + obsCompleta;


        return {
            ...dadosCliente,
            formaPagamento: formaPagamentoEl.value,
            total: totalPedido,
            observacoes: obsCompleta
        };
    }

    // --- LÓGICA DE REPETIÇÃO DE COMPRA ---
    async function repetirUltimaCompra(e) {
        e.preventDefault();
        
        if (!clienteLogado) return;
        if (!confirm('Deseja limpar o carrinho atual e adicionar os itens da sua última compra?')) return;
        
        btnRepetirCompra.disabled = true;
        btnRepetirCompra.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adicionando...';

        try {
            // 1. Buscar a última venda com os itens
            const { data, error } = await supabase.from('vendas')
                .select(`id, itens:vendas_itens(produto_id, quantidade)`)
                .eq('cliente_id', clientePerfil.telefone) // CORRIGIDO: Usa o telefone do cliente
                .order('created_at', { ascending: false })
                .limit(1); 
            
            if (error || !data || data.length === 0) {
                mostrarMensagem('Não foi possível encontrar a última compra.', 'error');
                return;
            }

            const itensUltimaVenda = data[0].itens;
            
            if (!itensUltimaVenda || itensUltimaVenda.length === 0) {
                mostrarMensagem('A última compra não continha itens válidos.', 'error');
                return;
            }

            // 2. Limpar o carrinho atual
            carrinho = [];

            // 3. Adicionar itens ao carrinho (Verificando estoque)
            for (const item of itensUltimaVenda) {
                const produtoCompleto = produtos.find(p => p.id === item.produto_id);
                
                if (produtoCompleto && produtoCompleto.estoque_atual >= item.quantidade) {
                    carrinho.push({
                        produto: produtoCompleto,
                        quantidade: item.quantidade
                    });
                } else if (produtoCompleto) {
                     mostrarMensagem(`⚠️ ${produtoCompleto.nome} não foi adicionado: estoque insuficiente.`, 'warning');
                }
            }
            
            if (carrinho.length > 0) {
                atualizarCarrinho();
                window.alternarView('view-carrinho');
                mostrarMensagem('Itens da última compra adicionados ao carrinho!', 'success');
            } else {
                 mostrarMensagem('Nenhum item da última compra pôde ser adicionado (sem estoque).', 'error');
            }

        } catch (error) {
            console.error('Erro ao repetir compra:', error);
            mostrarMensagem('Erro ao tentar repetir a compra.', 'error');
        } finally {
             btnRepetirCompra.disabled = false;
             btnRepetirCompra.innerHTML = '<i class="fas fa-redo"></i> Repetir Última Compra';
        }
    }


    // --- FUNÇÕES DE AUTHENTICAÇÃO E CADASTRO ---

    async function buscarClientePorTelefone(telefone) {
        // ... (mantido o código de busca)
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
        
        if (!validarAreaEntrega(cep)) {
            return mostrarMensagem('❌ Não entregamos no CEP fornecido. Favor verificar a área de cobertura.', 'error');
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
        
        window.alternarView('view-cardapio');
        
        document.querySelector('.nav-item-app[data-view="view-inicio"]')?.classList.remove('active');
        document.querySelector('.nav-item-app[data-view="view-cardapio"]')?.classList.add('active');

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
        window.alternarView('auth-screen');
    }

    async function carregarStatusUltimoPedido() {
        statusUltimoPedido.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando histórico...';
        
        if (!clienteLogado || !clientePerfil.telefone) {
            statusUltimoPedido.innerHTML = '<p>Faça login para ver o status e o histórico de pedidos.</p>';
            repetirCompraContainer.style.display = 'none';
            return;
        }

        try {
            // CORREÇÃO CRÍTICA: Filtra por cliente_id (telefone) em vez do nome.
            const { data, error } = await supabase.from('vendas')
                .select(`id, created_at, total, forma_pagamento, status_pedido, itens:vendas_itens(produto_id, quantidade)`)
                .eq('cliente_id', clientePerfil.telefone) 
                .order('created_at', { ascending: false })
                .limit(3); 
                
            if (error) throw error;
            
            const pedidos = data || [];
            
            let htmlHistorico = '';
            
            if (pedidos.length > 0) {
                 htmlHistorico += '<h4>Últimos Pedidos:</h4>';
                 
                 if (pedidos[0].itens && pedidos[0].itens.length > 0) {
                     repetirCompraContainer.style.display = 'block';
                 } else {
                     repetirCompraContainer.style.display = 'none';
                 }
                 
                 pedidos.forEach((p, index) => {
                     const dataPedido = new Date(p.created_at).toLocaleDateString('pt-BR');
                     
                     let listaItens = '';
                     if (p.itens && p.itens.length > 0) {
                        listaItens = p.itens.map(item => {
                            const produto = produtos.find(prod => prod.id === item.produto_id);
                            return `${item.quantidade}x ${produto ? produto.nome : 'Produto Removido'}`;
                        }).join(', ');
                     }
                     
                     htmlHistorico += `
                         <div class="card-pedido-historico" style="padding: 10px; border-bottom: 1px dashed #ccc; margin-bottom: 5px;">
                             <p style="font-weight: bold; margin: 0;">Pedido #${p.id} - ${dataPedido}</p>
                             <p style="font-size: 0.9rem; margin: 0;">Itens: ${listaItens}</p>
                             <p style="font-size: 0.9rem; margin: 0;">Status: 
                                 <span class="status-badge-history status-${p.status_pedido || 'NOVO'}">
                                     ${(p.status_pedido || 'NOVO').toUpperCase()}
                                 </span>
                                 | Total: ${formatarMoeda(p.total)}
                             </p>
                         </div>
                     `;
                 });
            } else {
                 htmlHistorico = 'Você ainda não fez nenhum pedido conosco!';
                 repetirCompraContainer.style.display = 'none';
            }
            
            homeEndereco.innerHTML = `<strong>Endereço Atual:</strong><br>${clientePerfil.endereco || 'Endereço não cadastrado.'}`;
            statusUltimoPedido.innerHTML = htmlHistorico;
            
        } catch (error) {
            statusUltimoPedido.innerHTML = 'Erro ao carregar histórico.';
            console.error('Erro ao carregar status do pedido:', error);
        }
    }

    function atualizarPerfilUI() {
        if (clienteLogado) {
            profileNameSpan.textContent = clientePerfil.nome.split(' ')[0];
            homeClienteNome.textContent = clientePerfil.nome.split(' ')[0];
            carrinhoClienteNomeDisplay.textContent = clientePerfil.nome || 'N/A';
            carrinhoEnderecoDisplay.textContent = clientePerfil.endereco || 'N/A';
            carrinhoEnderecoInput.value = clientePerfil.endereco || '';
        } else {
            profileNameSpan.textContent = 'Visitante';
            homeClienteNome.textContent = 'Visitante';
        }
        
        const opcoesPagamentoOriginal = document.querySelector('.pagamento .opcoes-pagamento');
        if (pagamentoOpcoesContainer.children.length === 0 && opcoesPagamentoOriginal) {
            pagamentoOpcoesContainer.innerHTML = opcoesPagamentoOriginal.innerHTML;
        }
    }

    function atualizarCarrinhoDisplay() {
        atualizarPerfilUI(); 
        atualizarCarrinho();
    }
    
    // --- NOVAS FUNÇÕES DE EDIÇÃO DE ENDEREÇO ---
    
    function abrirModalEditarEndereco() {
        if (!clienteLogado) {
             window.alternarView('auth-screen');
             mostrarMensagem('Faça login para editar seu endereço.', 'error');
             return;
        }
        
        const cepMatch = clientePerfil.endereco ? clientePerfil.endereco.match(/\(CEP:\s?(\d{5}-\d{3})\)/) : null;
        modalCepInput.value = cepMatch ? cepMatch[1] : '';

        modalRuaInput.value = '';
        modalNumeroInput.value = '';
        modalBairroInput.value = '';

        modalEditarEndereco.style.display = 'flex';
    }

    async function salvarEdicaoEndereco(e) {
        e.preventDefault();
        
        const telefone = clientePerfil.telefone;
        
        const cep = modalCepInput.value.trim();
        const rua = modalRuaInput.value.trim();
        const numero = modalNumeroInput.value.trim();
        const bairro = modalBairroInput.value.trim();
        
        if (!rua || !numero || !bairro || !cep) {
            return mostrarMensagem('Preencha a Rua, Número, Bairro e CEP.', 'error');
        }
        
        if (!validarAreaEntrega(cep)) {
            return mostrarMensagem('❌ Não entregamos no novo CEP fornecido.', 'error');
        }

        const enderecoCompleto = `${rua}, ${numero}, ${bairro} (CEP: ${cep})`;

        try {
            const { error } = await supabase.from('clientes_delivery')
                .update({ endereco: enderecoCompleto })
                .eq('telefone', telefone);

            if (error) throw error;
            
            clientePerfil.endereco = enderecoCompleto;

            mostrarMensagem('✅ Endereço atualizado com sucesso!', 'success');
            modalEditarEndereco.style.display = 'none';
            atualizarPerfilUI(); 
            carregarStatusUltimoPedido(); 

        } catch (error) {
            console.error('Erro ao salvar endereço:', error);
            mostrarMensagem('Erro ao salvar endereço. Verifique sua conexão.', 'error');
        }
    }
    
    // --- FINALIZAÇÃO DE PEDIDOS (FUNÇÃO UNIFICADA) ---

    async function finalizarPedidoEEnviarWhatsApp() { 
        const dados = validarDados();

        if (!dados) return;

        mostrarMensagem('Processando pedido...', 'info');
        finalizarDiretoBtn.disabled = true;

        try {
            // 1. Criar o pedido_online (DB)
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

            // 3. ENVIAR MENSAGEM VIA WHATSAPP (Ação automática após finalizar)
            let mensagem = `*PEDIDO ONLINE - DOCE CRIATIVO*\n\n`;
            mensagem += `*Cliente:* ${dados.nome}\n`;
            mensagem += `*Telefone:* ${dados.telefone}\n`;
            mensagem += `*Endereço:* ${dados.endereco}\n`;
            mensagem += `*Pagamento:* ${dados.formaPagamento}\n`;
            mensagem += `*TOTAL:* ${formatarMoeda(dados.total)}\n\n`;
            
            mensagem += `--- DETALHES ---\n`;
            mensagem += dados.observacoes;

            const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
            window.open(url, '_blank');
            
            // Fim do envio WhatsApp

            mostrarMensagem('✅ Pedido registrado e mensagem enviada via WhatsApp!', 'success');
            limparFormularioECarrinho();
            window.alternarView('view-inicio');
            carregarStatusUltimoPedido();

        } catch (error) {
            console.error("Erro ao finalizar pedido direto:", error);
            mostrarMensagem(`Erro ao enviar pedido: ${error.message}`, 'error');
        } finally {
            finalizarDiretoBtn.disabled = false;
        }
    }

    // --- FUNÇÕES DE EVENTOS ---

    function configurarEventListeners() {
        if (btnIniciarSessao) btnIniciarSessao.addEventListener('click', iniciarSessao);
        if (cadastroForm) cadastroForm.addEventListener('submit', finalizarCadastro);
        if (logoutBtnApp) logoutBtnApp.addEventListener('click', fazerLogoutApp);
        if (formEditarEndereco) formEditarEndereco.addEventListener('submit', salvarEdicaoEndereco); 
        
        if (filtroBuscaProdutos) filtroBuscaProdutos.addEventListener('input', exibirProdutos);
        
        if (btnRepetirCompra) btnRepetirCompra.addEventListener('click', repetirUltimaCompra);
        
        document.getElementById('abrir-modal-editar-endereco')?.addEventListener('click', abrirModalEditarEndereco);
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                window.alternarView(item.getAttribute('data-view'));
            });
        });
        
        // NOVO: Apenas um listener para o botão de finalizar
        if (finalizarDiretoBtn) finalizarDiretoBtn.addEventListener('click', finalizarPedidoEEnviarWhatsApp);
        
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
            let clienteEncontrado = false;
            
            // 1. Tenta carregar o perfil logado
            if (telefoneSalvo) {
                const cliente = await buscarClientePorTelefone(telefoneSalvo);
                if (cliente) {
                    clientePerfil.nome = cliente.nome;
                    clientePerfil.telefone = cliente.telefone;
                    clientePerfil.endereco = cliente.endereco;
                    clienteLogado = { id: clientePerfil.telefone, email: clientePerfil.telefone }; 
                    clienteEncontrado = true;
                } else {
                     localStorage.removeItem('clienteTelefone');
                }
            }
            
            // 2. Configuração inicial da UI
            authScreen.classList.remove('active');
            mobileNav.style.display = 'flex';
            
            // >> ALTERAÇÃO SOLICITADA: Pula a tela de boas-vindas
            window.alternarView('view-cardapio');
            // << FIM DA ALTERAÇÃO
            
            // 3. Carrega os dados para renderizar
            await carregarCategorias(); 
            await carregarProdutos();
            
            // 4. Finaliza a configuração
            if (clienteEncontrado) {
                atualizarPerfilUI();
            } else {
                 mostrarMensagem('Faça login para salvar seu pedido e ver o histórico.', 'info');
            }
            configurarEventListeners();
            atualizarCarrinho();

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            mostrarMensagem('Erro ao carregar o app: ' + error.message, 'error');
            document.getElementById('auth-screen').classList.add('active');
        }
    })();
});