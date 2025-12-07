// js/api.js - Módulo de API (Supabase e Serviços Externos) (Corrigido)

(function() {
    
    const supabase = window.supabase;

    /**
     * Busca as configurações da loja (taxa de entrega, horários).
     */
    async function carregarConfiguracoesLoja() {
        try {
            const { data, error } = await supabase
                .from('config_loja')
                .select('taxa_entrega, tempo_entrega, seg_abertura, seg_fechamento, seg_fechado, ter_abertura, ter_fechamento, ter_fechado, qua_abertura, qua_fechamento, qua_fechado, qui_abertura, qui_fechamento, qui_fechado, sex_abertura, sex_fechamento, sex_fechado, sab_abertura, sab_fechamento, sab_fechado, dom_abertura, dom_fechamento, dom_fechado')
                .eq('id', 1)
                .single();
            
            if (error) throw error;
            console.log("Configurações da loja carregadas.");
            window.app.configLoja = data; // Salva no estado global
        } catch (error) {
            console.error("Erro ao carregar configurações da loja:", error);
            if (window.AppUI) {
                window.AppUI.mostrarMensagem('Erro ao carregar status da loja.', 'error');
            }
        }
    }

    /**
     * Busca um cliente pelo número de telefone.
     * @param {string} telefone - O telefone formatado (ex: 5533...).
     * @returns {Promise<object|null>} Os dados do cliente ou null.
     */
    async function buscarClientePorTelefone(telefone) {
        try {
            const { data, error } = await supabase.from('clientes_delivery')
                .select('*')
                .eq('telefone', telefone)
                .limit(1) 
                .maybeSingle(); 
            
            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            console.error('Erro ao buscar cliente:', error);
            if (window.AppUI) {
                window.AppUI.mostrarMensagem('Erro ao consultar banco de dados.', 'error');
            }
            return null;
        }
    }
    
    /**
     * Salva um novo cliente no banco de dados.
     * @param {object} dadosCliente - Dados do formulário de cadastro.
     * @returns {Promise<object>} Os dados do novo cliente.
     */
    async function finalizarCadastroNoSupabase(dadosCliente) {
        const { data: novoCliente, error } = await supabase.from('clientes_delivery')
            .insert(dadosCliente)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error("Este número já está cadastrado. Use a tela inicial para Entrar.");
            }
            throw error;
        }
        return novoCliente;
    }

    /**
     * Atualiza o endereço de um cliente existente.
     * @param {string} telefone - Telefone do cliente.
     * @param {string} enderecoCompleto - Novo endereço.
     */
    async function salvarEdicaoEnderecoNoSupabase(telefone, enderecoCompleto) {
        const { error } = await supabase.from('clientes_delivery')
            .update({ endereco: enderecoCompleto })
            .eq('telefone', telefone);
        
        if (error) throw error;
    }

    /**
     * Busca o endereço a partir de um CEP usando a API ViaCEP.
     * @param {string} cep - O CEP para buscar.
     */
    async function buscarCep(cep) {
        if (!window.AppUI) {
            console.error("Módulo UI não está pronto para buscar CEP.");
            return;
        }
        const uiElementos = window.AppUI.elementos;

        const cepLimpo = cep.replace(/\D/g, ''); 
        if (cepLimpo.length !== 8) return;
        window.AppUI.mostrarMensagem('Buscando endereço...', 'info');

        const isCadastro = uiElementos.cadastroForm?.style.display === 'block';
        const isModal = uiElementos.modalEditarEndereco?.style.display === 'flex';
        
        let campos = {};

        if (isCadastro) {
            campos = {
                rua: uiElementos.cadastroRuaInput,
                bairro: uiElementos.cadastroBairroInput,
                cidade: uiElementos.cadastroCidadeInput,
                estado: uiElementos.cadastroEstadoInput,
                numero: uiElementos.cadastroNumeroInput
            };
        } else if (isModal) {
            campos = {
                rua: uiElementos.modalRuaInput,
                bairro: uiElementos.modalBairroInput,
                cidade: uiElementos.modalCidadeInput,
                estado: uiElementos.modalEstadoInput,
                numero: uiElementos.modalNumeroInput
            };
        } else {
            return;
        }

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
            const data = await response.json();
            
            if (data.erro) {
                window.AppUI.mostrarMensagem('CEP não encontrado. Digite o endereço manualmente.', 'warning');
                if(campos.cidade) campos.cidade.value = '';
                if(campos.estado) campos.estado.value = '';
                campos.rua.focus();
                return;
            }
            
            if (data.logradouro) campos.rua.value = data.logradouro;
            if (data.bairro) campos.bairro.value = data.bairro;

            campos.cidade.value = data.localidade || '';
            campos.estado.value = data.uf || '';

            if (data.logradouro || data.bairro) {
                campos.numero.focus();
                window.AppUI.mostrarMensagem('Endereço preenchido. Confira os dados.', 'success');
            } else {
                campos.rua.focus();
                window.AppUI.mostrarMensagem('CEP encontrado (cidade/estado). Digite a Rua e Bairro.', 'warning');
            }

        } catch (error) {
            window.AppUI.mostrarMensagem('Erro ao buscar o CEP. Preencha manualmente.', 'error');
        }
    }

    /**
     * Carrega as categorias de produtos.
     * @returns {Promise<Array>} Lista de categorias.
     */
    async function carregarCategorias() {
        return await window.vendasSupabase.buscarCategorias();
    }

    /**
     * Carrega todos os produtos ativos.
     * @returns {Promise<Array>} Lista de produtos.
     */
    async function carregarProdutos() {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('ativo', true)
            .order('nome');
        if (error) throw error;
        return data || [];
    }
    
    /**
     * Busca produtos ativos pelo termo de busca no servidor.
     * @param {string} termo - O termo a ser buscado.
     * @returns {Promise<Array>} Lista de produtos filtrados.
     */
    async function buscarProdutosPorTermo(termo) {
         // Se o termo for vazio, retorna a lista completa (chamando carregarProdutos)
         if (!termo || termo.trim() === '') return carregarProdutos();
        
        try {
            const { data, error } = await supabase
                .from('produtos')
                .select('*')
                .eq('ativo', true)
                // NOVO: Usa a função ilike para busca parcial (case-insensitive)
                .ilike('nome', `%${termo}%`) 
                .order('nome');
                
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar produtos no servidor:', error);
            window.AppUI.mostrarMensagem('Erro na busca. Tente novamente.', 'error');
            return [];
        }
    }
    
    /**
     * Valida um cupom de desconto no servidor.
     * @param {string} codigo - O código do cupom.
     * @returns {Promise<object|null>} Os dados do cupom (se válido) ou um objeto de erro.
     */
    async function validarCupom(codigo) {
        try {
            const { data, error } = await supabase.from('cupons')
                .select('*')
                .eq('codigo', codigo.toUpperCase())
                .eq('ativo', true) 
                .single(); 
            
            if (error && error.code !== 'PGRST116') throw error; // Ignora 'not found'
            
            if (data) {
                
                // --- INÍCIO DA CORREÇÃO (FUSO HORÁRIO) ---
                // Lógica de validação de data (CORRIGIDA para Fuso Horário Local)
                const hojeDate = new Date();
                const ano = hojeDate.getFullYear();
                const mes = (hojeDate.getMonth() + 1).toString().padStart(2, '0');
                const dia = hojeDate.getDate().toString().padStart(2, '0');
                const hoje = `${ano}-${mes}-${dia}`; // Formato YYYY-MM-DD local

                if (data.data_validade && data.data_validade < hoje) {
                     return { error: 'Cupom expirado.', codigo: codigo };
                }
                // --- FIM DA CORREÇÃO ---
                
                // Lógica de validação de uso
                if (data.usos_maximos > 0 && data.usos_usados >= data.usos_maximos) {
                     return { error: 'Limite máximo de usos atingido.', codigo: codigo };
                }
                
                return data; // Cupom válido
            }
            
            return null; // Cupom não encontrado/inválido
            
        } catch (error) {
            console.error('Erro ao validar cupom:', error);
            return { error: 'Erro de conexão ao validar cupom.' };
        }
    }
    
    /**
     * Incrementa o contador de uso de um cupom.
     */
    async function incrementarUsoCupom(codigo) {
         if (!codigo) return;
         try {
            // Use rpc (Remote Procedure Call) para incrementar com segurança
            // Isso chama a função SQL 'incrementar_uso_cupom' que criamos
            const { error } = await supabase.rpc('incrementar_uso_cupom', {
                codigo_cupom: codigo.toUpperCase()
            });
            if (error) throw error;
            console.log(`Cupom ${codigo} incrementado com sucesso.`);
         } catch(error) {
             console.error("Erro ao incrementar uso do cupom:", error.message);
             // Não bloqueia o usuário, apenas loga o erro
         }
    }

    /**
     * Busca as opções de um produto (ex: Tamanhos, Sabores).
     * (Esta é uma função de placeholder, requer tabelas no Supabase)
     */
    async function buscarOpcoesProduto(produtoId) {
        // try {
        //     const { data: gruposOpcoes, error: errorGrupos } = await supabase
        //         .from('produto_opcoes_grupos') 
        //         .select(`*, opcoes:produto_opcoes(*)`)
        //         .eq('produto_id', produtoId)
        //         .order('nome');
        //     if (errorGrupos) throw errorGrupos;
        //     return gruposOpcoes;
        // } catch (error) {
        //     console.warn(`(API) Erro ao buscar opções: ${error.message}`);
        //     return [];
        // }
        return []; // Retorna vazio por enquanto
    }
    
    /**
     * Busca os complementos de um produto (ex: Adicionais).
     * (Esta é uma função de placeholder, requer tabelas no Supabase)
     */
    async function buscarComplementosProduto(produtoId) {
        // try {
        //     const { data: complementos, error: errorComps } = await supabase
        //         .from('produto_complementos')
        //         .select(`*`)
        //         .eq('produto_id', produtoId)
        //         .order('nome');
        //     if (errorComps) throw errorComps;
        //     return complementos;
        // } catch (error) {
        //     console.warn(`(API) Erro ao buscar complementos: ${error.message}`);
        //     return [];
        // }
        return []; // Retorna vazio por enquanto
    }
    
    /**
     * Carrega os produtos "mais pedidos" (lógica de destaque).
     * @returns {Promise<Array>} Lista de produtos em destaque.
     */
    async function carregarMaisPedidos() {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .eq('ativo', true)
            .order('estoque_atual', { ascending: false }) // Lógica de destaque (mais estoque)
            .limit(5);
        if (error) throw error;
        return data || [];
    }
    
    /**
     * Busca o histórico de pedidos de um cliente.
     * @param {string} telefone - Telefone do cliente.
     * @returns {Promise<Array>} Lista de pedidos.
     */
    async function buscarHistoricoPedidos(telefone) {
        const { data, error } = await supabase.from('pedidos_online')
            .select(`id, created_at, total, forma_pagamento, status, observacoes, telefone_cliente, endereco_entrega, nome_cliente`)
            .eq('telefone_cliente', telefone) 
            .order('created_at', { ascending: false })
            .limit(5); 
        if (error) throw error;
        return data || [];
    }

    /**
     * Busca o status de um pedido específico (para rastreamento).
     * @param {string} pedidoId - ID do pedido.
     * @returns {Promise<object|null>} O pedido ou null.
     */
    async function buscarPedidoParaRastreamento(pedidoId) {
        const { data: pedido, error } = await supabase.from('pedidos_online')
            .select('id, status, created_at') // CORREÇÃO: Adiciona created_at para cálculo de previsão
            .eq('id', pedidoId)
            .single();
        if (error || !pedido) return null;
        return pedido;
    }
    
    /**
     * Busca os detalhes completos de um único pedido pelo ID.
     * @param {string} pedidoId - ID do pedido.
     * @returns {Promise<object|null>} O pedido ou null.
     */
    async function buscarDetalhesPedidoPorId(pedidoId) {
        try {
            const { data, error } = await supabase.from('pedidos_online')
                .select('*') // Pega todos os detalhes
                .eq('id', pedidoId)
                .single();
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar detalhes do pedido:', error);
            return null;
        }
    }
    
    /**
     * Salva o pedido finalizado no banco.
     * @param {object} dadosPedido - Objeto com dados do pedido.
     * @returns {Promise<object>} O novo pedido criado.
     */
    async function finalizarPedidoNoSupabase(dadosPedido) {
        const { data: novoPedido, error } = await supabase.from('pedidos_online')
            .insert(dadosPedido)
            .select()
            .single();
        if (error) throw error;
        return novoPedido;
    }
    
    /**
     * Atualiza o estoque de um produto.
     * @param {string} produtoId - ID do produto.
     * @param {number} novoEstoque - Nova quantidade em estoque.
     */
    async function atualizarEstoqueNoSupabase(produtoId, novoEstoque) {
        await window.vendasSupabase.actualizarEstoque(produtoId, novoEstoque);
    }
    
    /**
     * Cliente solicita o cancelamento do pedido.
     */
    async function cancelarPedidoNoSupabase(pedidoId) {
        // 1. Verifica o status atual
        const { data: pedido, error: fetchError } = await supabase.from('pedidos_online')
            .select('status')
            .eq('id', pedidoId)
            .single();

        if (fetchError || !pedido) {
            throw new Error('Pedido não encontrado ou erro de conexão.');
        }

        const statusPermitidos = ['novo', 'preparando'];
        
        if (!statusPermitidos.includes(pedido.status)) {
            return false; 
        }

        // 2. Tenta atualizar o status para cancelado
        const { error: updateError } = await supabase
            .from('pedidos_online')
            .update({ status: 'cancelado' })
            .eq('id', pedidoId);

        if (updateError) throw updateError;
        
        return true; // Cancelamento bem-sucedido
    }


    /**
     * Busca as cidades cadastradas para entrega.
     */
    async function carregarCidadesEntrega() {
        try {
            const { data, error } = await supabase
                .from('cidades_entrega')
                .select('id, nome')
                .order('nome', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao carregar cidades de entrega:', error);
            return [];
        }
    }

    /**
     * Busca os bairros (taxas_entrega) com base no ID da cidade.
     */
    async function carregarBairrosPorCidade(cidadeId) {
        if (!cidadeId) return [];
        try {
            const { data, error } = await supabase
                .from('taxas_entrega')
                .select('bairro') // Seleciona apenas o nome do bairro
                .eq('cidade_id', cidadeId)
                .order('bairro', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Erro ao carregar bairros por cidade:', error);
            return [];
        }
    }

    // ================================================================
    // === INÍCIO DA NOVA FUNÇÃO (BUSCAR TODAS AS TAXAS) ===
    // ================================================================
    /**
     * Busca TODAS as taxas de entrega (bairros e cidades) de uma só vez.
     */
    async function carregarTodasTaxasEntrega() {
        try {
            const { data, error } = await supabase
                .from('taxas_entrega')
                .select(`
                    bairro,
                    valor,
                    cidade:cidades_entrega(nome)
                `);
            
            if (error) throw error;

            // Transforma os dados para um formato mais fácil de pesquisar:
            // { "NOME DO BAIRRO-NOME DA CIDADE": valor }
            const taxasMapeadas = (data || []).reduce((acc, taxa) => {
                if (taxa.bairro && taxa.cidade && taxa.cidade.nome) {
                    const bairroUpper = taxa.bairro.toUpperCase().trim();
                    const cidadeUpper = taxa.cidade.nome.toUpperCase().trim();
                    const chave = `${bairroUpper}-${cidadeUpper}`;
                    acc[chave] = taxa.valor;
                }
                return acc;
            }, {});
            
            return taxasMapeadas;

        } catch (error) {
            console.error('Erro ao carregar todas as taxas de entrega:', error);
            return {}; // Retorna um objeto vazio em caso de erro
        }
    }
    // ================================================================
    // === FIM DA NOVA FUNÇÃO ===
    // ================================================================


    // Expõe as funções para o objeto global AppAPI
    window.AppAPI = {
        carregarConfiguracoesLoja,
        buscarClientePorTelefone,
        finalizarCadastroNoSupabase,
        salvarEdicaoEnderecoNoSupabase,
        buscarCep,
        carregarCategorias,
        carregarProdutos,
        buscarProdutosPorTermo,
        validarCupom,
        incrementarUsoCupom,
        buscarOpcoesProduto,
        buscarComplementosProduto,
        carregarMaisPedidos,
        buscarHistoricoPedidos,
        buscarPedidoParaRastreamento,
        buscarDetalhesPedidoPorId,
        carregarCidadesEntrega,
        carregarBairrosPorCidade,
        carregarTodasTaxasEntrega, // <-- ADICIONADO
        finalizarPedidoNoSupabase,
        atualizarEstoqueNoSupabase,
        cancelarPedidoNoSupabase
    };

})();