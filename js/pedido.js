// js/pedido.js - Lógica para a página pública de pedidos via WhatsApp

document.addEventListener('DOMContentLoaded', async function() {
    
    // !!! IMPORTANTE !!!
    // Coloque aqui o número de WhatsApp da sua loja, em formato internacional (Ex: 5533999998888)
    const NUMERO_WHATSAPP = '5573991964394'; 
    // !!! IMPORTANTE !!!

    // Elementos do DOM
    const categoriasContainer = document.getElementById('categorias-container');
    const produtosContainer = document.getElementById('produtos-container');
    const carrinhoItens = document.getElementById('carrinho-itens');
    const totalCarrinho = document.getElementById('total-carrinho');
    const enviarPedidoBtn = document.getElementById('enviar-pedido-whatsapp');
    const pagamentoOpcoes = document.querySelectorAll('.pagamento-opcao');

    // Elementos dos Formulários
    const inputNome = document.getElementById('cliente-nome');
    const inputTelefone = document.getElementById('cliente-telefone');
    const inputEndereco = document.getElementById('cliente-endereco');
    
    // Variáveis globais
    let categorias = [];
    let produtos = [];
    let carrinho = [];
    let categoriaSelecionada = 'todos';

    // --- Funções Auxiliares (Reutilizadas de vendas-principal.js) ---

    const mostrarMensagem = (mensagem, tipo = 'info') => {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        alertDiv.innerHTML = `<span>${mensagem}</span><button class="alert-close" onclick="this.parentElement.remove()">&times;</button>`;
        alertContainer.appendChild(alertDiv);
        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
    };

    const adicionarAoCarrinho = (produto) => {
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
    };

    const atualizarCarrinho = () => {
        if (carrinho.length === 0) {
            carrinhoItens.innerHTML = `<p style="text-align: center; color: #666;">Sua sacola está vazia.</p>`;
            totalCarrinho.textContent = '0,00';
            enviarPedidoBtn.disabled = true;
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
            enviarPedidoBtn.disabled = false;
            
            // Re-vincular eventos aos botões do carrinho
            document.querySelectorAll('.btn-remover').forEach(btn => btn.addEventListener('click', function() {
                removerDoCarrinho(parseInt(this.getAttribute('data-index')));
            }));
            document.querySelectorAll('.btn-adicionar-carrinho').forEach(btn => btn.addEventListener('click', function() {
                aumentarQuantidade(parseInt(this.getAttribute('data-index')));
            }));
        }
    };

    const removerDoCarrinho = (index) => {
        const produtoNome = carrinho[index].produto.nome;
        if (carrinho[index].quantidade > 1) {
            carrinho[index].quantidade -= 1;
        } else {
            carrinho.splice(index, 1);
        }
        atualizarCarrinho();
        mostrarMensagem(`${produtoNome} removido da sacola.`, 'info');
    };

    const aumentarQuantidade = (index) => {
        const produtoEstoque = produtos.find(p => p.id === carrinho[index].produto.id).estoque_atual;
        if (carrinho[index].quantidade < produtoEstoque) {
            carrinho[index].quantidade += 1;
            atualizarCarrinho();
        } else {
            mostrarMensagem(`Estoque máximo atingido para ${carrinho[index].produto.nome} (${produtoEstoque} un.)`, 'warning');
        }
    };

    // --- Funções de Carregamento (Reutilizadas de vendas-principal.js) ---

    const carregarCategorias = async () => {
        try {
            categorias = await window.vendasSupabase.buscarCategorias();
            exibirCategorias();
        } catch (error) {
            mostrarMensagem('Erro ao carregar categorias.', 'error');
        }
    };

    const exibirCategorias = () => {
        categoriasContainer.innerHTML = ''; // Limpa o loading
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
    };
    
    const selecionarCategoria = (categoriaId) => {
        categoriaSelecionada = categoriaId;
        document.querySelectorAll('.categoria-btn').forEach(botao => {
            botao.classList.toggle('active', botao.getAttribute('data-categoria') === categoriaId);
        });
        exibirProdutos();
    };

    const carregarProdutos = async () => {
        try {
            produtos = await window.vendasSupabase.buscarProdutos();
            exibirProdutos();
        } catch (error) {
            mostrarMensagem('Erro ao carregar produtos.', 'error');
        }
    };

    const exibirProdutos = () => {
        produtosContainer.innerHTML = ''; // Limpa o loading
        let produtosParaExibir = produtos.filter(p => p.ativo); // Apenas produtos ativos

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
            
            // Adicionar ao carrinho ao clicar no card (exceto no botão)
            produtoCard.addEventListener('click', (e) => {
                if (!e.target.closest('.btn-adicionar')) {
                    adicionarAoCarrinho(produto);
                }
            });
            
            // Adicionar ao carrinho ao clicar no botão
            produtoCard.querySelector('.btn-adicionar').addEventListener('click', (e) => {
                e.stopPropagation(); // Impede o clique no card
                adicionarAoCarrinho(produto);
            });

            produtosContainer.appendChild(produtoCard);
        });
    };

    // --- NOVA LÓGICA: Enviar Pedido via WhatsApp ---

    const enviarPedidoWhatsapp = () => {
        
        if (NUMERO_WHATSAPP === 'SEU_NUMERO_DE_WHATSAPP') {
            mostrarMensagem('O sistema ainda não está configurado para enviar pedidos. Avise o administrador.', 'error');
            alert('ERRO: O número do WhatsApp não foi configurado no arquivo js/pedido.js');
            return;
        }

        // 1. Validar Formulários
        const nome = inputNome.value.trim();
        const telefone = inputTelefone.value.trim();
        const endereco = inputEndereco.value.trim();
        const formaPagamentoEl = document.querySelector('input[name="pagamento"]:checked');

        if (carrinho.length === 0) {
            mostrarMensagem('Sua sacola está vazia!', 'error');
            return;
        }
        if (!nome || !telefone || !endereco) {
            mostrarMensagem('Por favor, preencha todos os seus dados e o endereço.', 'error');
            return;
        }
        if (!formaPagamentoEl) {
            mostrarMensagem('Por favor, escolha uma forma de pagamento.', 'error');
            return;
        }

        enviarPedidoBtn.disabled = true;
        enviarPedidoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando pedido...';

        // 2. Montar a Mensagem
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
        mensagem += `*Nome:* ${nome}\n`;
        mensagem += `*WhatsApp:* ${telefone}\n`;
        mensagem += `*Endereço:* ${endereco}\n\n`;
        mensagem += `*Forma de Pagamento:* ${formaPagamentoEl.value}\n\n`;
        mensagem += `Aguardo a confirmação do meu pedido! Obrigado(a).`;

        // 3. Codificar e Abrir URL do WhatsApp
        try {
            const mensagemCodificada = encodeURIComponent(mensagem);
            const urlWhatsapp = `https://wa.me/${NUMERO_WHATSAPP}?text=${mensagemCodificada}`;
            
            // Abre em uma nova aba
            window.open(urlWhatsapp, '_blank');
            
            // Limpa o carrinho e formulários
            carrinho = [];
            atualizarCarrinho();
            inputNome.value = '';
            inputTelefone.value = '';
            inputEndereco.value = '';
            
            mostrarMensagem('Pedido enviado! Você foi redirecionado para o WhatsApp.', 'success');

        } catch (error) {
            console.error('Erro ao gerar link do WhatsApp:', error);
            mostrarMensagem('Erro ao tentar enviar o pedido.', 'error');
        } finally {
            enviarPedidoBtn.disabled = false;
            enviarPedidoBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Enviar Pedido pelo WhatsApp';
        }
    };

    // --- Configuração de Eventos ---
    
    const configurarEventListeners = () => {
        if (enviarPedidoBtn) {
            enviarPedidoBtn.addEventListener('click', enviarPedidoWhatsapp);
        }
        
        // Adiciona evento de seleção visual nos botões de pagamento
        pagamentoOpcoes.forEach(opcao => {
            opcao.addEventListener('click', () => {
                pagamentoOpcoes.forEach(op => op.classList.remove('selected'));
                opcao.classList.add('selected');
                opcao.querySelector('input[type="radio"]').checked = true;
            });
        });
    };

    // --- Inicialização da Página ---
    
    (async function() {
        try {
            // Não precisamos de login, mas testamos a conexão
            const conexaoOk = await window.vendasSupabase.testarConexao();
            if (!conexaoOk) {
                throw new Error('Não foi possível conectar ao cardápio');
            }
            
            await carregarCategorias();
            await carregarProdutos();
            configurarEventListeners();
            atualizarCarrinho(); // Inicia com carrinho vazio e botão desabilitado

            console.log('✅ Página de pedido público inicializada!');

        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            mostrarMensagem('Erro ao carregar o cardápio: ' + error.message, 'error');
            // Esconde os containers de loading se der erro
            categoriasContainer.innerHTML = '<p style="color: red;">Erro ao carregar categorias.</p>';
            produtosContainer.innerHTML = '<p style="color: red;">Erro ao carregar produtos.</p>';
        }
    })();
});