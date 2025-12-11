// js/carrinho.js - Gerenciamento da Sacola (Otimizado)

(function() {

    function salvarCarrinhoLocalmente() {
        localStorage.setItem('doceCriativoCarrinho', JSON.stringify(window.app.carrinho));
        if (window.app.cupomAplicado) {
             localStorage.setItem('doceCriativoCupom', JSON.stringify(window.app.cupomAplicado));
        } else {
             localStorage.removeItem('doceCriativoCupom');
        }
    }
    
    function carregarCarrinhoLocalmente() {
        const carrinhoSalvo = localStorage.getItem('doceCriativoCarrinho');
        if (carrinhoSalvo) {
            try {
                window.app.carrinho = JSON.parse(carrinhoSalvo);
            } catch (e) {
                console.error("Erro ao carregar carrinho:", e);
                window.app.carrinho = [];
            }
        }
        const cupomSalvo = localStorage.getItem('doceCriativoCupom');
        if (cupomSalvo) {
            try {
                window.app.cupomAplicado = JSON.parse(cupomSalvo);
            } catch (e) {
                window.app.cupomAplicado = null;
            }
        }
    }

    function adicionarAoCarrinho(produto, detalhes = null) {
        if (produto.estoque_atual <= 0) {
            window.AppUI.mostrarMensagem(`Desculpe, ${produto.nome} está esgotado.`, 'error');
            return;
        }

        if (!detalhes) {
            const itemExistente = window.app.carrinho.find(item => 
                item.produto.id === produto.id && 
                !item.opcoes && !item.complementos && !item.observacao
            );
            
            if (itemExistente) {
                if (itemExistente.quantidade < produto.estoque_atual) {
                    itemExistente.quantidade += 1;
                } else {
                    window.AppUI.mostrarMensagem(`Estoque máximo atingido para ${produto.nome}.`, 'warning');
                    return;
                }
            } else {
                if (produto.estoque_atual > 0) {
                    window.app.carrinho.push({ 
                        produto: produto, 
                        quantidade: 1, 
                        precoFinalItem: produto.preco_venda 
                    });
                }
            }
        } else {
            window.app.carrinho.push({
                produto: produto,
                quantidade: detalhes.quantidade,
                precoFinalItem: detalhes.precoFinalItem,
                opcoes: detalhes.opcoes,
                complementos: detalhes.complementos,
                observacao: detalhes.observacao
            });
        }
        
        atualizarCarrinho();
        salvarCarrinhoLocalmente();
        
        // Feedback visual mais sutil ou vibrante dependendo da config
        const msg = detalhes ? `${produto.nome} (Personalizado) adicionado!` : `${produto.nome} adicionado!`;
        window.AppUI.mostrarMensagem(msg, 'success');
    }

    function aumentarQuantidade(index) {
        const item = window.app.carrinho[index];
        const produtoEstoque = window.app.produtos.find(p => p.id === item.produto.id).estoque_atual;
        
        if (item.quantidade < produtoEstoque) {
            item.quantidade += 1;
            atualizarCarrinho();
            salvarCarrinhoLocalmente();
        } else {
            window.AppUI.mostrarMensagem(`Máximo em estoque atingido.`, 'warning');
        }
    }
    
    function removerDoCarrinho(index) {
        if (window.app.carrinho[index].quantidade > 1) {
            window.app.carrinho[index].quantidade -= 1;
        } else {
            window.app.carrinho.splice(index, 1);
        }
        atualizarCarrinho();
        salvarCarrinhoLocalmente();
    }
    
    function limparCarrinho() {
        // SweetAlert para confirmação
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Limpar sacola?',
                text: "Você perderá todos os itens selecionados.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ff69b4',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sim, limpar!',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    executarLimpeza();
                }
            });
        } else {
            if (confirm("Tem certeza que deseja limpar toda a sacola?")) {
                executarLimpeza();
            }
        }
    }

    function executarLimpeza() {
        window.app.carrinho = [];
        window.app.cupomAplicado = null;
        if (window.AppUI.elementos.cupomInput) window.AppUI.elementos.cupomInput.value = '';
        
        localStorage.removeItem('doceCriativoCarrinho');
        localStorage.removeItem('doceCriativoCupom');

        atualizarCarrinho();
        window.AppUI.mostrarMensagem("Sua sacola está vazia.", "info");
    }

    function calcularTotalComAjustes(subTotal) {
        const ajustes = window.app.cupomAplicado;
        let taxaEntrega = 0;
        
        // Verifica opção de entrega
        if (window.AppUI && window.AppUI.elementos.deliveryOptionEntrega && window.AppUI.elementos.deliveryOptionEntrega.checked) {
            const endereco = window.app.clientePerfil.endereco;
            if (endereco) {
                // Tenta extrair Bairro - Cidade
                const regex = /,\s*([^,]+?)\s*-\s*([^,]+?)$/;
                const match = endereco.match(regex);
                
                if (match && match[1] && match[2]) {
                    const bairro = match[1].toUpperCase().trim();
                    const cidade = match[2].toUpperCase().trim();
                    const chave = `${bairro}-${cidade}`;
                    
                    if (window.app.taxasEntrega[chave] !== undefined) {
                        taxaEntrega = window.app.taxasEntrega[chave];
                    } else {
                        // Taxa padrão se não achar o bairro específico
                        taxaEntrega = window.app.configLoja.taxa_entrega || 0;
                    }
                } else {
                    taxaEntrega = window.app.configLoja.taxa_entrega || 0;
                }
            } else {
                taxaEntrega = window.app.configLoja.taxa_entrega || 0;
            }
        }
        
        let totalAjustado = subTotal;
        let valorDesconto = 0;
        
        if (ajustes) {
            if (ajustes.tipo === 'percentual') {
                valorDesconto = subTotal * (ajustes.valor / 100);
                totalAjustado -= valorDesconto;
            } else if (ajustes.tipo === 'valor') {
                valorDesconto = ajustes.valor;
                totalAjustado -= valorDesconto;
            }
            totalAjustado = Math.max(0, totalAjustado);
        }
        
        const totalFinal = totalAjustado + taxaEntrega;
        
        return {
            subTotal,
            totalAjustado,
            valorDesconto,
            taxaEntregaAplicada: taxaEntrega,
            totalFinal
        };
    }
    
    function atualizarCarrinho() {
        let subTotal = 0;
        let totalItens = 0;
        
        const elementos = window.AppUI.elementos;
        const carrinho = window.app.carrinho;
        const formatarMoeda = window.AppUI.formatarMoeda;
        
        carrinho.forEach(item => {
            subTotal += item.precoFinalItem * item.quantidade;
            totalItens += item.quantidade;
        });
        
        const calculo = calcularTotalComAjustes(subTotal);

        if (carrinho.length === 0) {
            elementos.carrinhoItens.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-basket"></i>
                    <p>Sua sacola está vazia.</p>
                </div>
            `;
            if (elementos.finalizarPedidoDireto) elementos.finalizarPedidoDireto.disabled = true;
        } else {
            elementos.carrinhoItens.innerHTML = '';
            carrinho.forEach((item, index) => {
                const itemSubtotal = item.precoFinalItem * item.quantidade;
                
                let opcoesHtml = '';
                if (item.opcoes || item.complementos || item.observacao) {
                    opcoesHtml += '<div class="carrinho-item-opcoes">';
                    if(item.opcoes) {
                        item.opcoes.forEach(op => opcoesHtml += `<p>• ${op.nome}</p>`);
                    }
                    if(item.complementos) {
                        item.complementos.forEach(c => opcoesHtml += `<p>+ ${c.nome}</p>`);
                    }
                    if(item.observacao) {
                        opcoesHtml += `<p>Obs: ${item.observacao}</p>`;
                    }
                    opcoesHtml += '</div>';
                }

                const itemElement = document.createElement('div');
                itemElement.className = 'carrinho-item';
                itemElement.innerHTML = `
                    <div class="carrinho-item-info">
                        <div class="carrinho-item-nome">${item.produto.nome}</div>
                        <div class="carrinho-item-preco">${formatarMoeda(item.precoFinalItem)}</div>
                        ${opcoesHtml}
                    </div>
                    <div class="carrinho-item-controles">
                        <button class="btn-remover" data-index="${index}"><i class="fas fa-minus"></i></button>
                        <span class="carrinho-item-quantidade">${item.quantidade}</span>
                        <button class="btn-adicionar-carrinho" data-index="${index}"><i class="fas fa-plus"></i></button>
                    </div>
                    <div class="carrinho-item-subtotal">
                        ${formatarMoeda(itemSubtotal)}
                    </div>
                `;
                elementos.carrinhoItens.appendChild(itemElement);
            });
            
            // Reatribui eventos
            elementos.carrinhoItens.querySelectorAll('.btn-remover').forEach(btn => btn.addEventListener('click', function() {
                removerDoCarrinho(parseInt(this.getAttribute('data-index')));
            }));
            elementos.carrinhoItens.querySelectorAll('.btn-adicionar-carrinho').forEach(btn => btn.addEventListener('click', function() {
                aumentarQuantidade(parseInt(this.getAttribute('data-index')));
            }));
            
            const isLojaAberta = elementos.storeStatusText?.textContent === 'Aberto';
            const isReady = window.app.clienteLogado && isLojaAberta; 
            if (elementos.finalizarPedidoDireto) elementos.finalizarPedidoDireto.disabled = !isReady;
        }
        
        // Atualiza Resumos
        if (elementos.subtotalCarrinho) elementos.subtotalCarrinho.textContent = formatarMoeda(calculo.subTotal);
        
        if (elementos.resumoSubtotalLiquidoLinha) {
            elementos.resumoSubtotalLiquidoLinha.style.display = calculo.valorDesconto > 0 ? 'flex' : 'none';
        }
        if (elementos.subtotalAjustadoCarrinho) {
            elementos.subtotalAjustadoCarrinho.textContent = formatarMoeda(calculo.totalAjustado);
        }
        
        if (elementos.taxaEntregaCarrinho) elementos.taxaEntregaCarrinho.textContent = formatarMoeda(calculo.taxaEntregaAplicada);
        if (elementos.taxaEntregaDisplay) elementos.taxaEntregaDisplay.textContent = formatarMoeda(calculo.taxaEntregaAplicada);
        
        if (elementos.totalCarrinho) elementos.totalCarrinho.textContent = formatarMoeda(calculo.totalFinal);
        
        // Atualiza UI de Cupom
        if (calculo.valorDesconto > 0) {
            if (elementos.resumoDescontoLinha) elementos.resumoDescontoLinha.style.display = 'flex';
            if (elementos.descontoValorDisplay) elementos.descontoValorDisplay.textContent = `- ${formatarMoeda(calculo.valorDesconto)}`;
            if (elementos.descontoTipoDisplay) elementos.descontoTipoDisplay.textContent = window.app.cupomAplicado.tipo === 'percentual' ? `${window.app.cupomAplicado.valor}%` : formatarMoeda(window.app.cupomAplicado.valor);
            
            if (elementos.cupomMessage) {
                elementos.cupomMessage.innerHTML = `<i class="fas fa-check-circle"></i> Cupom <b>${window.app.cupomAplicado.codigo}</b> aplicado!`;
                elementos.cupomMessage.style.color = 'var(--success-color)';
            }
        } else {
            if (elementos.resumoDescontoLinha) elementos.resumoDescontoLinha.style.display = 'none';
            if (elementos.cupomMessage && !elementos.cupomMessage.textContent.includes('Inválido')) {
                elementos.cupomMessage.textContent = '';
            }
        }

        // Atualiza Badges
        const totalDisplay = totalItens > 99 ? '99+' : totalItens;
        if (elementos.carrinhoBadge) {
            elementos.carrinhoBadge.textContent = totalDisplay;
            elementos.carrinhoBadge.style.display = totalItens > 0 ? 'flex' : 'none';
        }
        if (elementos.cartCountNav) {
            elementos.cartCountNav.textContent = totalDisplay;
            elementos.cartCountNav.style.display = totalItens > 0 ? 'flex' : 'none';
        }
        // Header V2 Cart
        if (elementos.headerCartItems) elementos.headerCartItems.textContent = `${totalItens} itens`;
        if (elementos.headerCartTotal) elementos.headerCartTotal.textContent = formatarMoeda(calculo.totalFinal);
    }
    
    function atualizarCarrinhoDisplay() {
        window.app.Auth.atualizarPerfilUI(); 
        const elementos = window.AppUI.elementos;
        if (elementos.tempoEntregaDisplay) {
            elementos.tempoEntregaDisplay.textContent = `${window.app.configLoja.tempo_entrega || 60} min`;
        }
        atualizarCarrinho();
    }
    
    function limparFormularioECarrinho() { 
        window.app.carrinho = [];
        window.app.cupomAplicado = null;
        localStorage.removeItem('doceCriativoCarrinho'); 
        localStorage.removeItem('doceCriativoCupom'); 
        
        if (window.AppUI.elementos.cupomInput) window.AppUI.elementos.cupomInput.value = '';
        
        atualizarCarrinho();
        
        const elementos = window.AppUI.elementos;
        if (elementos.carrinhoEnderecoInput) elementos.carrinhoEnderecoInput.value = window.app.clientePerfil.endereco || '';
        if (elementos.cadastroForm) elementos.cadastroForm.reset();
        
        // Reseta seleção de pagamento
        document.querySelectorAll('.opcoes-pagamento input').forEach(i => i.checked = false);
        document.querySelectorAll('.pagamento-opcao').forEach(op => op.classList.remove('selected'));
        const defaultOp = document.querySelector('.pagamento-opcao:first-child');
        if(defaultOp) {
            defaultOp.classList.add('selected');
            const radio = defaultOp.querySelector('input');
            if(radio) radio.checked = true;
        }
        
        if (elementos.pedidoObservacoes) elementos.pedidoObservacoes.value = ''; 
        if (elementos.trocoParaInput) elementos.trocoParaInput.value = ''; 
    }

    window.AppCarrinho = {
        adicionarAoCarrinho,
        aumentarQuantidade,
        removerDoCarrinho,
        atualizarCarrinho,
        atualizarCarrinhoDisplay,
        limparFormularioECarrinho,
        calcularTotalComAjustes, 
        limparCarrinho, 
        carregarCarrinhoLocalmente
    };

})();