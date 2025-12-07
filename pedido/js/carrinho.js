// js/carrinho.js - Módulo de Gerenciamento do Carrinho (Com Persistência)

(function() {

    /**
     * Salva o estado atual do carrinho e do cupom no localStorage.
     */
    function salvarCarrinhoLocalmente() {
        localStorage.setItem('doceCriativoCarrinho', JSON.stringify(window.app.carrinho));
        if (window.app.cupomAplicado) {
             localStorage.setItem('doceCriativoCupom', JSON.stringify(window.app.cupomAplicado));
        } else {
             localStorage.removeItem('doceCriativoCupom');
        }
    }
    
    /**
     * Carrega o carrinho e o cupom do localStorage.
     */
    function carregarCarrinhoLocalmente() {
        const carrinhoSalvo = localStorage.getItem('doceCriativoCarrinho');
        if (carrinhoSalvo) {
            try {
                window.app.carrinho = JSON.parse(carrinhoSalvo);
            } catch (e) {
                console.error("Erro ao carregar carrinho do local storage:", e);
                window.app.carrinho = [];
            }
        }
        const cupomSalvo = localStorage.getItem('doceCriativoCupom');
        if (cupomSalvo) {
            try {
                window.app.cupomAplicado = JSON.parse(cupomSalvo);
            } catch (e) {
                console.error("Erro ao carregar cupom do local storage:", e);
                window.app.cupomAplicado = null;
                localStorage.removeItem('doceCriativoCupom');
            }
        }
    }


    /**
     * Adiciona um item ao carrinho.
     */
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
                    window.AppUI.mostrarMensagem(`Estoque máximo atingido para ${produto.nome} (${produto.estoque_atual} un.)`, 'warning');
                    return;
                }
            } else {
                if (produto.estoque_atual > 0) {
                    window.app.carrinho.push({ 
                        produto: produto, 
                        quantidade: 1, 
                        precoFinalItem: produto.preco_venda 
                    });
                } else {
                    window.AppUI.mostrarMensagem(`Produto ${produto.nome} sem estoque disponível.`, 'error');
                    return;
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
        salvarCarrinhoLocalmente(); // <-- ADIÇÃO DA PERSISTÊNCIA
        window.AppUI.mostrarMensagem(`${produto.nome} adicionado à sacola!`, 'success');
    }

    /**
     * Aumenta a quantidade de um item no carrinho.
     */
    function aumentarQuantidade(index) {
        const item = window.app.carrinho[index];
        const produtoEstoque = window.app.produtos.find(p => p.id === item.produto.id).estoque_atual;
        
        if (item.quantidade < produtoEstoque) {
            item.quantidade += 1;
            atualizarCarrinho();
            salvarCarrinhoLocalmente(); // <-- ADIÇÃO DA PERSISTÊNCIA
        } else {
            window.AppUI.mostrarMensagem(`Estoque máximo atingido para ${item.produto.nome} (${produtoEstoque} un.)`, 'warning');
        }
    }
    
    /**
     * Remove ou diminui a quantidade de um item no carrinho.
     */
    function removerDoCarrinho(index) {
        const produtoNome = window.app.carrinho[index].produto.nome;
        if (window.app.carrinho[index].quantidade > 1) {
            window.app.carrinho[index].quantidade -= 1;
        } else {
            window.app.carrinho.splice(index, 1);
        }
        atualizarCarrinho();
        salvarCarrinhoLocalmente(); // <-- ADIÇÃO DA PERSISTÊNCIA
        window.AppUI.mostrarMensagem(`${produtoNome} removido da sacola.`, 'info');
    }
    
    /**
     * Limpa o carrinho e reseta o cupom.
     */
    function limparCarrinho() {
        if (!confirm("Tem certeza que deseja limpar toda a sacola?")) return;
        window.app.carrinho = [];
        window.app.cupomAplicado = null;
        if (window.AppUI.elementos.cupomInput) window.AppUI.elementos.cupomInput.value = '';
        
        localStorage.removeItem('doceCriativoCarrinho'); // <-- ADIÇÃO DA PERSISTÊNCIA
        localStorage.removeItem('doceCriativoCupom'); // <-- ADIÇÃO DA PERSISTÊNCIA

        atualizarCarrinho();
        window.AppUI.mostrarMensagem("Carrinho limpo!", "info");
    }

    // ================================================================
    // === INÍCIO DA MODIFICAÇÃO (CÁLCULO DINÂMICO DE TAXA) ===
    // ================================================================
    /**
     * Calcula o total do carrinho com desconto e taxa.
     */
    function calcularTotalComAjustes(subTotal) {
        const ajustes = window.app.cupomAplicado;
        let taxaEntrega = 0;
        
        // 1. Verifica se a opção de ENTREGA está marcada
        if (window.AppUI && window.AppUI.elementos.deliveryOptionEntrega && window.AppUI.elementos.deliveryOptionEntrega.checked) {
            
            // 2. Se for entrega, tenta encontrar a taxa do bairro
            const endereco = window.app.clientePerfil.endereco;
            if (endereco) {
                // 3. Extrai o Bairro e a Cidade do endereço (Ex: "Rua..., N..., Bairro - Cidade")
                // Esta regex captura o último texto depois de ", " antes do " - " (Bairro)
                // E o texto depois do " - " (Cidade)
                const regex = /,\s*([^,]+?)\s*-\s*([^,]+?)$/;
                const match = endereco.match(regex);
                
                if (match && match[1] && match[2]) {
                    const bairro = match[1].toUpperCase().trim();
                    const cidade = match[2].toUpperCase().trim();
                    const chave = `${bairro}-${cidade}`;
                    
                    // 4. Busca no cache de taxas carregado pelo app.js
                    if (window.app.taxasEntrega[chave] !== undefined) {
                        taxaEntrega = window.app.taxasEntrega[chave];
                    } else {
                        // Bairro não encontrado no cache de taxas
                        console.warn(`Taxa não encontrada para ${bairro} - ${cidade}. Taxa padrão (R$ 0) será aplicada.`);
                        taxaEntrega = 0; // Ou você pode usar uma taxa padrão: window.app.configLoja.taxa_entrega
                    }
                } else {
                    // Endereço mal formatado, usa a taxa global (fallback)
                    taxaEntrega = window.app.configLoja.taxa_entrega || 0;
                }
            } else {
                // Cliente sem endereço cadastrado, usa a taxa global (fallback)
                taxaEntrega = window.app.configLoja.taxa_entrega || 0;
            }
        }
        // Se a "Retirada" estiver marcada, a taxaEntrega permanece 0.
        
        // 5. Calcula o resto...
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
            subTotal: subTotal,
            totalAjustado: totalAjustado,
            valorDesconto: valorDesconto,
            taxaEntregaAplicada: taxaEntrega, // Retorna a taxa que foi de fato usada
            totalFinal: totalFinal
        };
    }
    // ================================================================
    // === FIM DA MODIFICAÇÃO ===
    // ================================================================
    
    /**
     * Atualiza todo o display do carrinho (itens, totais, badges).
     */
    function atualizarCarrinho() {
        let subTotal = 0;
        let totalItens = 0;
        
        const elementos = window.AppUI.elementos;
        const carrinho = window.app.carrinho;
        const formatarMoeda = window.AppUI.formatarMoeda;
        
        // 1. Calcula os totais (subTotal)
        carrinho.forEach(item => {
            subTotal += item.precoFinalItem * item.quantidade;
            totalItens += item.quantidade;
        });
        
        // 2. Aplica ajustes e calcula totais finais
        // ESTA FUNÇÃO AGORA RETORNA A TAXA DINÂMICA
        const calculo = calcularTotalComAjustes(subTotal);

        // 3. Renderiza Itens
        if (carrinho.length === 0) {
            elementos.carrinhoItens.innerHTML = `
                <div style="text-align: center; padding: 2rem 0; color: #666;">
                    <i class="fas fa-shopping-cart" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                    <p>Sua sacola está vazia.</p>
                </div>
            `;
            // Desabilita botões de passo
            if (elementos.finalizarPedidoDireto) elementos.finalizarPedidoDireto.disabled = true;
        } else {
            elementos.carrinhoItens.innerHTML = '';
            carrinho.forEach((item, index) => {
                const itemSubtotal = item.precoFinalItem * item.quantidade;
                
                let opcoesHtml = '';
                if (item.opcoes || item.complementos || item.observacao) {
                    opcoesHtml += '<div class="carrinho-item-opcoes">';
                    if(item.opcoes && item.opcoes.length > 0) {
                        item.opcoes.forEach(op => {
                            opcoesHtml += `<p><strong>${op.grupo}:</strong> ${op.nome}</p>`;
                        });
                    }
                    if(item.complementos && item.complementos.length > 0) {
                        opcoesHtml += `<p><strong>Adicionais:</strong> ${item.complementos.map(c => c.nome).join(', ')}</p>`;
                    }
                    if(item.observacao) {
                        opcoesHtml += `<p><strong>Obs:</strong> ${item.observacao}</p>`;
                    }
                    opcoesHtml += '</div>';
                }

                const itemElement = document.createElement('div');
                itemElement.className = 'carrinho-item';
                itemElement.innerHTML = `
                    <div class="carrinho-item-info">
                        <div class="carrinho-item-nome">${item.produto.nome}</div>
                        <div class="carrinho-item-preco">${formatarMoeda(item.precoFinalItem)} (un)</div>
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
            
            elementos.carrinhoItens.querySelectorAll('.btn-remover').forEach(btn => btn.addEventListener('click', function() {
                removerDoCarrinho(parseInt(this.getAttribute('data-index')));
            }));
            elementos.carrinhoItens.querySelectorAll('.btn-adicionar-carrinho').forEach(btn => btn.addEventListener('click', function() {
                aumentarQuantidade(parseInt(this.getAttribute('data-index')));
            }));
            
            // Habilita botões de passo
            const isLojaAberta = elementos.storeStatusText?.textContent === 'Aberto';
            const isReady = window.app.clienteLogado && isLojaAberta; 

            if (elementos.finalizarPedidoDireto) elementos.finalizarPedidoDireto.disabled = !isReady;
        }
        
        // ================== BLOCO ALTERADO ==================
        // 4. Renderiza Resumo de Valores
        if (elementos.subtotalCarrinho) elementos.subtotalCarrinho.textContent = formatarMoeda(calculo.subTotal);
        
        const temDesconto = calculo.valorDesconto > 0;
        
        if (elementos.resumoSubtotalLiquidoLinha) {
            elementos.resumoSubtotalLiquidoLinha.style.display = temDesconto ? 'flex' : 'none';
        }
        
        if (elementos.subtotalAjustadoCarrinho) {
            elementos.subtotalAjustadoCarrinho.textContent = formatarMoeda(calculo.totalAjustado);
        }
        
        // ATUALIZA AMBOS OS CAMPOS DE TAXA (O do resumo e o da opção de entrega)
        if (elementos.taxaEntregaCarrinho) elementos.taxaEntregaCarrinho.textContent = formatarMoeda(calculo.taxaEntregaAplicada);
        if (elementos.taxaEntregaDisplay) elementos.taxaEntregaDisplay.textContent = formatarMoeda(calculo.taxaEntregaAplicada); // <-- ADICIONADO
        
        if (elementos.totalCarrinho) elementos.totalCarrinho.textContent = calculo.totalFinal.toFixed(2).replace('.', ',');
        
        // 5. Renderiza Desconto 
        // ================== FIM BLOCO ALTERADO ==================
        
        if (calculo.valorDesconto > 0) {
            if (elementos.resumoDescontoLinha) elementos.resumoDescontoLinha.style.display = 'flex';
            if (elementos.descontoValorDisplay) elementos.descontoValorDisplay.textContent = `- ${formatarMoeda(calculo.valorDesconto)}`;
            if (elementos.descontoTipoDisplay) elementos.descontoTipoDisplay.textContent = window.app.cupomAplicado.tipo === 'percentual' 
                ? `${window.app.cupomAplicado.valor}%`
                : window.AppUI.formatarMoeda(window.app.cupomAplicado.valor);
            if (elementos.cupomMessage) {
                elementos.cupomMessage.textContent = `✅ Cupom ${window.app.cupomAplicado.codigo} aplicado. Desconto: ${window.AppUI.formatarMoeda(calculo.valorDesconto)}.`;
                elementos.cupomMessage.style.color = '#2e7d32';
            }
        } else {
            if (elementos.resumoDescontoLinha) elementos.resumoDescontoLinha.style.display = 'none';
            if (elementos.cupomMessage) {
                 // Verifica se a mensagem de erro de cupom inválido já está sendo mostrada
                if (!elementos.cupomMessage.textContent.startsWith('❌')) {
                    elementos.cupomMessage.textContent = 'Nenhum cupom aplicado.';
                    elementos.cupomMessage.style.color = '#999';
                }
            }
        }


        // 6. Atualiza Badges e Headers
        if (elementos.carrinhoBadge) {
            elementos.carrinhoBadge.textContent = totalItens;
            elementos.carrinhoBadge.style.display = totalItens > 0 ? 'block' : 'none';
        }
        if (elementos.cartCountNav) {
            elementos.cartCountNav.textContent = totalItens;
            elementos.cartCountNav.style.display = totalItens > 0 ? 'flex' : 'none';
        }
        if (elementos.headerCartItems) { 
            elementos.headerCartItems.textContent = totalItens === 1 ? '1 item' : `${totalItens} itens`;
        }
        if (elementos.headerCartTotal) { 
            elementos.headerCartTotal.textContent = window.AppUI.formatarMoeda(calculo.totalFinal);
        }
    }
    
    /**
     * Atualiza a UI do perfil e do carrinho com dados do cliente.
     */
    function atualizarCarrinhoDisplay() {
        // ATUALIZA OS DADOS DO PERFIL (Nome, Endereço)
        window.app.Auth.atualizarPerfilUI(); 
        
        const elementos = window.AppUI.elementos;
        
        // ATUALIZA O TEMPO DE ENTREGA (DA config_loja)
        if (elementos.tempoEntregaDisplay) {
            elementos.tempoEntregaDisplay.textContent = `${window.app.configLoja.tempo_entrega || 60} min`;
        }
        
        // REMOVIDA A ATUALIZAÇÃO DA TAXA DE ENTREGA DAQUI
        // (Será feito dinamicamente pelo 'atualizarCarrinho()')

        // ATUALIZA O CARRINHO (QUE AGORA VAI CALCULAR A TAXA CERTA)
        atualizarCarrinho();
    }
    
    /**
     * Limpa o carrinho e reseta os formulários.
     */
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
        
        document.querySelectorAll('.opcoes-pagamento input[name="pagamento"]').forEach(input => input.checked = false);
        const defaultPayment = document.querySelector('.opcoes-pagamento input[value="Dinheiro"]');
        if(defaultPayment) defaultPayment.checked = true;
        
        document.querySelectorAll('.opcoes-pagamento .pagamento-opcao').forEach(op => op.classList.remove('selected'));
        const defaultPaymentLabel = document.querySelector('.opcoes-pagamento .pagamento-opcao');
        if (defaultPaymentLabel) {
            defaultPaymentLabel.classList.add('selected');
        }
        
        if (elementos.pedidoObservacoes) elementos.pedidoObservacoes.value = ''; 
        if (elementos.trocoParaInput) elementos.trocoParaInput.value = ''; 
    }

    // Expõe as funções para o objeto global AppCarrinho
    window.AppCarrinho = {
        adicionarAoCarrinho,
        aumentarQuantidade,
        removerDoCarrinho,
        atualizarCarrinho,
        atualizarCarrinhoDisplay,
        limparFormularioECarrinho,
        calcularTotalComAjustes, 
        limparCarrinho, 
        carregarCarrinhoLocalmente // <-- EXPOSTO
    };

})();