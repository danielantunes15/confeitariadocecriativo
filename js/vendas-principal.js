// js/vendas-principal.js - Sistema completo de vendas CORRIGIDO
document.addEventListener('DOMContentLoaded', async function() {
    // Verificar autenticação
    const usuario = window.sistemaAuth?.verificarAutenticacao();
    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    // Elementos do DOM
    const categoriasContainer = document.getElementById('categorias-container');
    const produtosContainer = document.getElementById('produtos-container');
    const carrinhoItens = document.getElementById('carrinho-itens');
    const totalCarrinho = document.getElementById('total-carrinho');
    const finalizarPedidoBtn = document.getElementById('finalizar-pedido');
    const nomeClienteInput = document.getElementById('nome-cliente');
    const clientesList = document.getElementById('clientes-list');
    const btnCadastrarCliente = document.getElementById('btn-cadastrar-cliente');
    const modalCadastroCliente = document.getElementById('modal-cadastro-cliente');
    const formCadastroCliente = document.getElementById('form-cadastro-cliente');
    const closeModals = document.querySelectorAll('.close-modal');
    
    // Variáveis globais
    let categorias = [];
    let produtos = [];
    let clientes = [];
    let carrinho = [];
    let categoriaSelecionada = 'todos';

    // Funções auxiliares globais
    const mostrarMensagem = (mensagem, tipo = 'info') => {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) {
            console.error('Container de alertas não encontrado');
            return;
        }
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo}`;
        const cores = {
            success: { bg: '#e8f5e9', color: '#2e7d32', border: '#c8e6c9' },
            error: { bg: '#ffebee', color: '#c62828', border: '#ffcdd2' },
            warning: { bg: '#fff3e0', color: '#ef6c00', border: '#ffe0b2' },
            info: { bg: '#e3f2fd', color: '#1565c0', border: '#bbdefb' }
        };
        const cor = cores[tipo] || cores.info;
        alertDiv.style.backgroundColor = cor.bg;
        alertDiv.style.color = cor.color;
        alertDiv.style.border = `1px solid ${cor.border}`;
        alertDiv.innerHTML = `
            <div class="alert-content" style="flex: 1; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'error' ? 'fa-exclamation-circle' : tipo === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                <span>${mensagem}</span>
            </div>
            <button class="alert-close" style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: inherit; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">&times;</button>
        `;
        alertContainer.appendChild(alertDiv);
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
        alertDiv.querySelector('.alert-close').addEventListener('click', () => alertDiv.remove());
    };
    
    const adicionarAoCarrinho = (produto) => {
        const itemExistente = carrinho.find(item => item.produto.id === produto.id);
        if (itemExistente) {
            if (itemExistente.quantidade < produto.estoque_atual) {
                itemExistente.quantidade += 1;
            } else {
                mostrarMensagem(`Estoque insuficiente para ${produto.nome}. Máximo: ${produto.estoque_atual}`, 'error');
                return;
            }
        } else {
            if (produto.estoque_atual > 0) {
                carrinho.push({ produto: produto, quantidade: 1 });
            } else {
                mostrarMensagem(`Produto ${produto.nome} sem estoque disponível.`, 'error');
                return;
            }
        }
        atualizarCarrinho();
        mostrarMensagem(`${produto.nome} adicionado ao carrinho!`, 'success');
    };

    const atualizarCarrinho = () => {
        if (carrinho.length === 0) {
            carrinhoItens.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Seu carrinho está vazio</p>
                </div>
            `;
            totalCarrinho.textContent = '0,00';
            finalizarPedidoBtn.disabled = true;
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
                        <button class="btn-remover" data-index="${index}">
                            <i class="fas fa-minus"></i>
                        </button>
                        <span class="carrinho-item-quantidade">${item.quantidade}</span>
                        <button class="btn-adicionar-carrinho" data-index="${index}">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <div class="carrinho-item-subtotal">
                        R$ ${itemSubtotal.toFixed(2)}
                    </div>
                `;
                carrinhoItens.appendChild(itemElement);
            });
            totalCarrinho.textContent = total.toFixed(2);
            finalizarPedidoBtn.disabled = false;
            document.querySelectorAll('.btn-remover').forEach(btn => btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                removerDoCarrinho(index);
            }));
            document.querySelectorAll('.btn-adicionar-carrinho').forEach(btn => btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                aumentarQuantidade(index);
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
        mostrarMensagem(`${produtoNome} removido do carrinho.`, 'info');
    };

    const aumentarQuantidade = (index) => {
        if (carrinho[index].quantidade < produtos.find(p => p.id === carrinho[index].produto.id).estoque_atual) {
            carrinho[index].quantidade += 1;
            atualizarCarrinho();
        } else {
            mostrarMensagem(`Estoque insuficiente. Máximo: ${produtos.find(p => p.id === carrinho[index].produto.id).estoque_atual}`, 'error');
        }
    };

    const carregarCategorias = async () => {
        try {
            categorias = await window.vendasSupabase.buscarCategorias();
            exibirCategorias();
        } catch (error) {
            console.error('❌ Erro ao carregar categorias:', error);
            throw error;
        }
    };

    const exibirCategorias = () => {
        if (!categoriasContainer) return;
        categoriasContainer.innerHTML = '';
        const categoriaTodos = document.createElement('button');
        categoriaTodos.className = `categoria-btn ${categoriaSelecionada === 'todos' ? 'active' : ''}`;
        categoriaTodos.setAttribute('data-categoria', 'todos');
        categoriaTodos.innerHTML = `<i class="fas fa-th-large"></i><span>Todos</span>`;
        categoriaTodos.addEventListener('click', () => selecionarCategoria('todos'));
        categoriasContainer.appendChild(categoriaTodos);
        categorias.forEach(categoria => {
            const categoriaBtn = document.createElement('button');
            categoriaBtn.className = `categoria-btn ${categoriaSelecionada === categoria.id ? 'active' : ''}`;
            categoriaBtn.setAttribute('data-categoria', categoria.id);
            categoriaBtn.innerHTML = `<i class="fas ${categoria.icone || 'fa-tag'}"></i><span>${categoria.nome}</span>`;
            categoriaBtn.addEventListener('click', () => selecionarCategoria(categoria.id));
            categoriasContainer.appendChild(categoriaBtn);
        });
    };
    
    const selecionarCategoria = (categoriaId) => {
        categoriaSelecionada = categoriaId;
        document.querySelectorAll('.categoria-btn').forEach(botao => {
            if (botao.getAttribute('data-categoria') === categoriaId) {
                botao.classList.add('active');
            } else {
                botao.classList.remove('active');
            }
        });
        exibirProdutos();
    };

    const carregarProdutos = async () => {
        try {
            produtos = await window.vendasSupabase.buscarProdutos();
            exibirProdutos();
        } catch (error) {
            console.error('❌ Erro ao carregar produtos:', error);
            throw error;
        }
    };

    const exibirProdutos = () => {
        if (!produtosContainer) return;
        produtosContainer.innerHTML = '';
        let produtosParaExibir = produtos;
        if (categoriaSelecionada !== 'todos') {
            produtosParaExibir = produtos.filter(p => p.categoria_id === categoriaSelecionada);
        }
        if (!produtosParaExibir || produtosParaExibir.length === 0) {
            produtosContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666;">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Nenhum produto encontrado</h3>
                    <p>Tente selecionar outra categoria</p>
                </div>
            `;
            return;
        }
        produtosParaExibir.forEach(produto => {
            const produtoCard = document.createElement('div');
            produtoCard.className = `produto-card ${produto.estoque_atual <= 0 ? 'out-of-stock' : ''}`;
            produtoCard.innerHTML = `
                <div class="produto-imagem">
                    <i class="fas ${produto.icone || 'fa-cube'}"></i>
                    ${produto.estoque_atual <= 0 ? '<div class="out-of-stock-badge">ESGOTADO</div>' : ''}
                    ${produto.estoque_atual > 0 && produto.estoque_atual <= produto.estoque_minimo ? '<div class="low-stock-badge">ESTOQUE BAIXO</div>' : ''}
                </div>
                <div class="produto-info">
                    <div class="produto-nome">${produto.nome}</div>
                    <div class="produto-categoria">${produto.categoria?.nome || 'Sem categoria'}</div>
                    <div class="produto-preco">R$ ${produto.preco_venda?.toFixed(2) || '0.00'}</div>
                    <div class="produto-estoque">Estoque: ${produto.estoque_atual}</div>
                    <button class="btn-adicionar" data-id="${produto.id}" ${produto.estoque_atual <= 0 ? 'disabled' : ''}>
                        ${produto.estoque_atual <= 0 ? 'Sem Estoque' : 'Adicionar ao Carrinho'}
                    </button>
                </div>
            `;
            if (produto.estoque_atual > 0) {
                produtoCard.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('btn-adicionar')) {
                        adicionarAoCarrinho(produto);
                    }
                });
                const btnAdicionar = produtoCard.querySelector('.btn-adicionar');
                btnAdicionar.addEventListener('click', (e) => {
                    e.stopPropagation();
                    adicionarAoCarrinho(produto);
                });
            }
            produtosContainer.appendChild(produtoCard);
        });
    };

    const carregarClientes = async () => {
        try {
            clientes = await window.vendasSupabase.buscarClientes();
            exibirClientesNaDatalist();
        } catch (error) {
            console.error('❌ Erro ao carregar clientes:', error);
            clientes = [];
        }
    };
    
    // LÓGICA CORRIGIDA para exibir clientes na datalist
    const exibirClientesNaDatalist = () => {
        if (!clientesList) return;
        
        // Limpa a lista existente
        clientesList.innerHTML = '';

        // Adiciona a opção padrão "Cliente sem cadastro"
        const optionDefault = document.createElement('option');
        optionDefault.value = 'Cliente sem cadastro';
        optionDefault.dataset.id = null; // ID nulo para clientes sem cadastro
        clientesList.appendChild(optionDefault);
        
        // Adiciona os clientes do banco de dados
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.nome;
            option.dataset.id = cliente.id;
            clientesList.appendChild(option);
        });
        
        // Mantém o valor padrão no input
        nomeClienteInput.value = 'Cliente sem cadastro';
    };

    const cadastrarCliente = async (event) => {
        event.preventDefault();
        
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

        // Validação de CPF (se fornecido)
        if (clienteData.cpf) {
            const clienteExistente = clientes.find(c => c.cpf === clienteData.cpf);
            if (clienteExistente) {
                mostrarMensagem('Já existe um cliente cadastrado com este CPF.', 'error');
                return;
            }
        }
        
        try {
            mostrarMensagem('Cadastrando cliente...', 'info');
            const novoCliente = await window.vendasSupabase.criarCliente(clienteData);
            
            if (novoCliente) {
                mostrarMensagem(`Cliente ${novoCliente.nome} cadastrado com sucesso!`, 'success');
                modalCadastroCliente.style.display = 'none';
                formCadastroCliente.reset();
                
                await carregarClientes();
                nomeClienteInput.value = novoCliente.nome;
            }
            
        } catch (error) {
            console.error('❌ Erro ao cadastrar cliente:', error);
            mostrarMensagem(`Erro ao cadastrar cliente: ${error.message}`, 'error');
        }
    };

    const finalizarPedido = async () => {
        if (carrinho.length === 0) {
            mostrarMensagem('Adicione produtos ao carrinho antes de finalizar o pedido.', 'error');
            return;
        }
        
        const formaPagamento = document.querySelector('input[name="pagamento"]:checked');
        if (!formaPagamento) {
            mostrarMensagem('Por favor, selecione uma forma de pagamento.', 'error');
            return;
        }
        
        const nomeCliente = nomeClienteInput.value.trim() || 'Cliente sem cadastro';
        const total = carrinho.reduce((sum, item) => sum + (item.produto.preco_venda * item.quantidade), 0);

        if (!confirm(`Deseja finalizar o pedido com ${carrinho.length} item(s)?\n\nCliente: ${nomeCliente}\nForma de pagamento: ${formaPagamento.value}\n\nTotal: R$ ${total.toFixed(2)}`)) {
            return;
        }
        
        try {
            mostrarMensagem('Processando pedido...', 'info');
            finalizarPedidoBtn.disabled = true;
            finalizarPedidoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

            const usuarioValido = await window.sistemaAuth?.verificarUsuarioNoBanco();
            if (!usuarioValido) {
                const sincronizado = await window.sistemaAuth?.sincronizarUsuario();
                if (!sincronizado) {
                    throw new Error('Problema com a conta de usuário. Faça login novamente.');
                }
            }

            for (const item of carrinho) {
                await window.vendasSupabase.verificarEstoque(item.produto.id, item.quantidade);
            }

            const usuarioAtual = window.sistemaAuth.usuarioLogado;
            const vendaData = {
                data_venda: new Date().toISOString().split('T')[0],
                cliente: nomeCliente,
                total: total,
                forma_pagamento: formaPagamento.value,
                observacoes: '',
                usuario_id: usuarioAtual.id
            };

            const venda = await window.vendasSupabase.criarVenda(vendaData);
            if (!venda || !venda.id) {
                throw new Error('Falha ao criar venda - ID não retornado');
            }

            const itensVenda = carrinho.map(item => ({
                venda_id: venda.id,
                produto_id: item.produto.id,
                quantidade: item.quantidade,
                preco_unitario: item.produto.preco_venda
            }));

            await window.vendasSupabase.criarItensVenda(itensVenda);

            for (const item of carrinho) {
                const novoEstoque = item.produto.estoque_atual - item.quantidade;
                await window.vendasSupabase.atualizarEstoque(item.produto.id, novoEstoque);
            }

            let mensagem = `✅ Pedido finalizado com sucesso!\n\n`;
            mensagem += `📋 Número do Pedido: ${venda.id}\n`;
            mensagem += `👤 Cliente: ${nomeCliente}\n`;
            mensagem += `💳 Forma de pagamento: ${formaPagamento.value}\n`;
            mensagem += `👨‍💼 Vendedor: ${usuarioAtual.nome}\n\n`;
            mensagem += `🛍️ Itens do pedido:\n`;
            
            carrinho.forEach(item => {
                mensagem += `• ${item.produto.nome} (x${item.quantidade}) - R$ ${(item.produto.preco_venda * item.quantidade).toFixed(2)}\n`;
            });
            
            mensagem += `\n💰 Total: R$ ${total.toFixed(2)}`;
            alert(mensagem);
            mostrarMensagem('✅ Pedido finalizado com sucesso!', 'success');
            
            carrinho = [];
            atualizarCarrinho();
            nomeClienteInput.value = 'Cliente sem cadastro';
            document.querySelectorAll('input[name="pagamento"]').forEach(radio => radio.checked = false);
            
            await carregarProdutos();
            
        } catch (error) {
            console.error('❌ Erro ao finalizar pedido:', error);
            let mensagemErro = 'Erro ao finalizar pedido: ';
            if (error.message.includes('usuario') || error.message.includes('conta')) {
                mensagemErro = 'Problema com a conta de usuário. Faça login novamente.';
                setTimeout(() => { mostrarMensagem('Redirecionando para login...', 'warning'); setTimeout(() => window.sistemaAuth.fazerLogout(), 2000); }, 1000);
            } else if (error.message.includes('estoque')) {
                mensagemErro = error.message;
            } else {
                mensagemErro += error.message;
            }
            mostrarMensagem(mensagemErro, 'error');
            try { await carregarProdutos(); } catch (reloadError) { console.error('❌ Erro ao recarregar produtos:', reloadError); }
        } finally {
            finalizarPedidoBtn.disabled = false;
            finalizarPedidoBtn.innerHTML = 'Finalizar Pedido';
        }
    };
    
    // Configura os event listeners
    const configurarEventListeners = () => {
        if (finalizarPedidoBtn) finalizarPedidoBtn.addEventListener('click', finalizarPedido);
        if (nomeClienteInput) nomeClienteInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && carrinho.length > 0) finalizarPedido();
        });
        if (btnCadastrarCliente) btnCadastrarCliente.addEventListener('click', () => modalCadastroCliente.style.display = 'block');
        if (closeModals) closeModals.forEach(btn => btn.addEventListener('click', () => {
            modalCadastroCliente.style.display = 'none';
            formCadastroCliente.reset();
        }));
        window.addEventListener('click', (e) => {
            if (e.target === modalCadastroCliente) {
                modalCadastroCliente.style.display = 'none';
                formCadastroCliente.reset();
            }
        });
        if (formCadastroCliente) formCadastroCliente.addEventListener('submit', cadastrarCliente);
        document.getElementById('logout-btn')?.addEventListener('click', () => window.sistemaAuth.fazerLogout());
    };

    // Função de inicialização
    (async function() {
        const usuario = window.sistemaAuth?.verificarAutenticacao();
        if (!usuario) {
            window.location.href = 'login.html';
            return;
        }

        try {
            const conexaoOk = await window.vendasSupabase.testarConexao();
            if (!conexaoOk) throw new Error('Não foi possível conectar ao banco de dados');

            const usuarioValido = await window.sistemaAuth.verificarUsuarioNoBanco();
            if (!usuarioValido) await window.sistemaAuth.sincronizarUsuario();

            await carregarCategorias();
            await carregarProdutos();
            await carregarClientes();
            configurarEventListeners();
            atualizarCarrinho();

            console.log('✅ Sistema de vendas inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            mostrarMensagem('Erro ao carregar o sistema: ' + error.message, 'error');
        }
    })();
});