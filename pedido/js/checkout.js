// js/checkout.js - Finalização de Pedido

(function() {
    
    function obterDadosCliente() {
        const elementos = window.AppUI.elementos;
        let endereco;
        let isRetirada = false;
        
        if (elementos.deliveryOptionRetirada && elementos.deliveryOptionRetirada.checked) {
            isRetirada = true;
            // Endereço fixo da loja
            endereco = "RETIRADA NA LOJA: Rua São Lourenço, 326, Centro, NANUQUE - MG";
        } else {
            endereco = window.app.clientePerfil.endereco ? window.app.clientePerfil.endereco.trim() : null;
        }
        
        const trocoPara = parseFloat(elementos.trocoParaInput?.value) || 0; 
        const observacoes = elementos.pedidoObservacoes?.value.trim() || ''; 

        if (window.app.clienteLogado) {
             const nome = window.app.clientePerfil.nome;
             const telefone = window.app.clientePerfil.telefone;
             
             if (!telefone) {
                window.AppUI.alternarView('auth-screen');
                window.AppUI.mostrarMensagem('Sua sessão expirou. Faça login novamente.', 'error');
                return null;
             }
             
             return {
                 nome, telefone, endereco, isRetirada,
                 authId: window.app.clienteLogado.id,
                 trocoPara, observacoes
             };
        } else {
             window.AppUI.alternarView('auth-screen');
             window.AppUI.mostrarMensagem('Faça login para finalizar o pedido.', 'info');
             return null;
        }
    }

    function validarDados() {
        const dadosCliente = obterDadosCliente();
        const formaPagamentoEl = document.querySelector('.opcoes-pagamento input[name="pagamento"]:checked');
        
        const subTotalProdutos = window.app.carrinho.reduce((sum, item) => sum + (item.precoFinalItem * item.quantidade), 0);
        const calculo = window.app.Carrinho.calcularTotalComAjustes(subTotalProdutos); 
        const totalPedido = calculo.totalFinal; 
        
        if (window.app.carrinho.length === 0) {
            window.AppUI.mostrarMensagem('Sua sacola está vazia!', 'error');
            return null;
        }
        
        if (!dadosCliente) return null;
        
        // Validação de Endereço (Apenas se for Entrega)
        if (!dadosCliente.isRetirada && (!dadosCliente.endereco || dadosCliente.endereco.length < 5)) {
            window.AppUI.mostrarMensagem('Endereço de entrega inválido. Por favor, edite seu endereço.', 'error');
            return null;
        }
        
        // Validação de Troco
        if (formaPagamentoEl && formaPagamentoEl.value === 'Dinheiro' && dadosCliente.trocoPara > 0 && dadosCliente.trocoPara < totalPedido) {
             window.AppUI.mostrarMensagem(`O valor do troco (R$ ${dadosCliente.trocoPara}) é menor que o total (R$ ${totalPedido.toFixed(2)}).`, 'warning');
             window.AppUI.elementos.trocoParaInput.focus();
             return null;
        }
        
        if (!formaPagamentoEl) {
            window.AppUI.mostrarMensagem('Escolha a forma de pagamento.', 'warning');
            return null;
        }
        
        let obsCompleta = montarObservacoes(dadosCliente, totalPedido, subTotalProdutos, calculo.valorDesconto, calculo.taxaEntregaAplicada);

        return {
            ...dadosCliente,
            formaPagamento: formaPagamentoEl.value,
            total: totalPedido,
            observacoes: obsCompleta,
            itens: window.app.carrinho.map(item => ({ 
                produto_id: item.produto.id,
                quantidade: item.quantidade,
                preco_unitario: item.precoFinalItem,
                nome_produto: item.produto.nome 
            }))
        };
    }

    function montarObservacoes(dadosCliente, totalPedido, subTotalProdutos, valorDesconto, taxaEntrega) {
        const formatarMoeda = window.AppUI.formatarMoeda;
        let tipoEntregaInfo = "";

        if (dadosCliente.isRetirada) {
            tipoEntregaInfo = `\n\n[RETIRADA NA LOJA]`;
        } else {
            tipoEntregaInfo = `\n\n[ENTREGA] - Tempo estimado: ${window.app.configLoja.tempo_entrega || 60} min`;
        }
        
        let listaItens = "ITENS DO PEDIDO:\n";
        window.app.carrinho.forEach(item => {
            listaItens += `• ${item.quantidade}x ${item.produto.nome} (${formatarMoeda(item.precoFinalItem)})\n`;
            if(item.opcoes) item.opcoes.forEach(op => { listaItens += `   + ${op.nome}\n`; });
            if(item.complementos) item.complementos.forEach(c => { listaItens += `   + ${c.nome}\n`; });
            if(item.observacao) listaItens += `   Obs: ${item.observacao}\n`;
        });
        
        let obsCompleta = dadosCliente.observacoes ? `Obs. Cliente: ${dadosCliente.observacoes}` : '';
        
        if (dadosCliente.trocoPara > 0) {
             obsCompleta += `\nTROCO PARA: ${window.AppUI.formatarMoeda(dadosCliente.trocoPara)}`;
        }
        
        const cupom = window.app.cupomAplicado;
        let cupomInfo = cupom ? `\nCUPOM: ${cupom.codigo}` : '';
        
        let resumoValores = `
----------------------------
Subtotal: ${formatarMoeda(subTotalProdutos)}
${valorDesconto > 0 ? `Desconto: -${formatarMoeda(valorDesconto)}` : ''}
Entrega: ${formatarMoeda(taxaEntrega)}
TOTAL: ${formatarMoeda(totalPedido)}
----------------------------`;

        return `${listaItens}${resumoValores}${tipoEntregaInfo}${cupomInfo}\n\n${obsCompleta}`;
    }

    async function aplicarCupom() {
        const uiElementos = window.AppUI.elementos;
        const codigo = uiElementos.cupomInput.value.trim().toUpperCase();
        
        if (!codigo) {
            window.app.cupomAplicado = null;
            window.app.Carrinho.atualizarCarrinho();
            return;
        }
        
        uiElementos.aplicarCupomBtn.disabled = true;
        uiElementos.aplicarCupomBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        try {
            const cupomValidado = await window.AppAPI.validarCupom(codigo);
            
            if (cupomValidado && !cupomValidado.error) {
                window.app.cupomAplicado = {
                    codigo: cupomValidado.codigo,
                    tipo: cupomValidado.tipo,
                    valor: cupomValidado.valor
                };
                window.app.Carrinho.atualizarCarrinho();
                window.AppUI.mostrarMensagem(`Cupom ${codigo} aplicado!`, 'success');
            } else {
                window.app.cupomAplicado = null;
                window.app.Carrinho.atualizarCarrinho();
                const mensagem = cupomValidado?.error || 'Cupom inválido.';
                
                if (uiElementos.cupomMessage) {
                    uiElementos.cupomMessage.textContent = mensagem;
                    uiElementos.cupomMessage.style.color = 'var(--error-color)';
                }
                window.AppUI.mostrarMensagem(mensagem, 'error');
            }
        } catch (error) {
            window.app.cupomAplicado = null;
            window.app.Carrinho.atualizarCarrinho();
            window.AppUI.mostrarMensagem('Erro ao validar cupom.', 'error');
        } finally {
            uiElementos.aplicarCupomBtn.disabled = false;
            uiElementos.aplicarCupomBtn.textContent = 'Aplicar';
        }
    }

    async function finalizarPedidoEEnviarWhatsApp() { 
        const dados = validarDados();
        if (!dados) return;
        
        const uiElementos = window.AppUI.elementos;

        window.AppUI.mostrarMensagem('Enviando pedido...', 'info');
        if (uiElementos.finalizarPedidoDireto) uiElementos.finalizarPedidoDireto.disabled = true;

        try {
            // 1. Salvar no Supabase
            const dadosPedidoSupabase = {
                nome_cliente: dados.nome,
                telefone_cliente: dados.telefone,
                endereco_entrega: dados.endereco,
                forma_pagamento: dados.formaPagamento,
                total: dados.total,
                status: 'novo',
                observacoes: dados.observacoes
            };
            const novoPedido = await window.AppAPI.finalizarPedidoNoSupabase(dadosPedidoSupabase);

            // 2. Atualizar estoque
            for (const item of window.app.carrinho) {
                const produtoNoEstoque = window.app.produtos.find(p => p.id === item.produto.id);
                const novoEstoque = produtoNoEstoque.estoque_atual - item.quantidade;
                await window.AppAPI.atualizarEstoqueNoSupabase(item.produto.id, novoEstoque);
            }

            // 3. Montar Link WhatsApp
            let mensagemZap = `*NOVO PEDIDO - #${novoPedido.id}*\n`;
            mensagemZap += dados.observacoes; // Já está formatada

            const url = `https://wa.me/${window.app.NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagemZap)}`;

            // 4. Iniciar Rastreamento
            localStorage.setItem('pedidoAtivoId', novoPedido.id);
            window.app.Rastreamento.iniciarRastreamento(novoPedido.id);
            
            // 5. Consumir Cupom
            if (window.app.cupomAplicado) {
                 await window.AppAPI.incrementarUsoCupom(window.app.cupomAplicado.codigo);
            }

            window.app.Carrinho.limparFormularioECarrinho(); 
            await window.app.Cardapio.carregarDadosCardapio(); 
            
            // 6. Mostrar Tela de Sucesso
            document.getElementById('checkout-main-view').style.display = 'none';
            document.getElementById('checkout-footer').style.display = 'none';
            document.getElementById('pedido-confirmado-section').style.display = 'block';
            
            document.getElementById('final-pedido-id').textContent = novoPedido.id;
            document.getElementById('final-total').textContent = window.AppUI.formatarMoeda(dados.total);
            document.getElementById('final-whatsapp-link').href = url;
            
            document.getElementById('final-novo-pedido-btn').onclick = () => {
                document.getElementById('pedido-confirmado-section').style.display = 'none';
                document.getElementById('checkout-main-view').style.display = 'block';
                document.getElementById('checkout-footer').style.display = 'block';
                window.AppUI.alternarView('view-cardapio');
            };
            
            // Se for SweetAlert
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'Pedido Recebido!',
                    text: 'Seu pedido foi registrado com sucesso.',
                    icon: 'success',
                    confirmButtonColor: '#ff69b4'
                });
            } else {
                window.AppUI.mostrarMensagem('Pedido registrado com sucesso!', 'success');
            }

        } catch (error) {
            console.error("Erro ao finalizar:", error);
            window.AppUI.mostrarMensagem(`Erro ao enviar: ${error.message}`, 'error');
            if (uiElementos.finalizarPedidoDireto) uiElementos.finalizarPedidoDireto.disabled = false;
        }
    }
    
    function configurarListenersSingleScreen() {
        const el = window.AppUI.elementos;

        if (el.finalizarPedidoDireto) {
            el.finalizarPedidoDireto.addEventListener('click', finalizarPedidoEEnviarWhatsApp);
        }
        
        if (el.addMoreItemsBtn) {
            el.addMoreItemsBtn.addEventListener('click', () => window.AppUI.alternarView('view-cardapio'));
        }
        
        if (el.trocarEnderecoBtn) {
            el.trocarEnderecoBtn.addEventListener('click', window.AppUI.abrirModalEditarEndereco);
        }

        if (el.limparCarrinhoBtn) {
            el.limparCarrinhoBtn.addEventListener('click', window.app.Carrinho.limparCarrinho);
        }

        if (el.aplicarCupomBtn) el.aplicarCupomBtn.addEventListener('click', aplicarCupom);
    }

    window.AppCheckout = {
        obterDadosCliente,
        validarDados,
        finalizarPedidoEEnviarWhatsApp,
        configurarListenersSingleScreen, 
        aplicarCupom 
    };

})();