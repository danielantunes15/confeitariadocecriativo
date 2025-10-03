// js/supabase-vendas.js - Configuração específica para vendas CORRIGIDA
class VendasSupabase {
    constructor() {
        this.supabase = window.supabase;
        console.log('🛒 Sistema de vendas inicializado');
    }

    // Testar conexão
    async testarConexao() {
        try {
            const { data, error } = await this.supabase
                .from('produtos')
                .select('id')
                .limit(1);
                
            if (error) throw error;
            console.log('✅ Conexão com Supabase estabelecida (vendas)');
            return true;
        } catch (error) {
            console.error('❌ Erro na conexão com Supabase:', error);
            return false;
        }
    }

    // Buscar categorias
    async buscarCategorias() {
        try {
            const { data, error } = await this.supabase
                .from('categorias')
                .select('*')
                .eq('ativo', true)
                .order('nome');
                
            if (error) throw error;
            console.log(`✅ ${data?.length || 0} categorias carregadas`);
            return data || [];
        } catch (error) {
            console.error('❌ Erro ao buscar categorias:', error);
            return [];
        }
    }

    // Buscar produtos
    async buscarProdutos() {
        try {
            const { data, error } = await this.supabase
                .from('produtos')
                .select('*, categoria:categorias(nome)')
                .eq('ativo', true)
                .order('nome');
                
            if (error) throw error;
            console.log(`✅ ${data?.length || 0} produtos carregados`);
            return data || [];
        } catch (error) {
            console.error('❌ Erro ao buscar produtos:', error);
            return [];
        }
    }
    
    // Buscar clientes
    async buscarClientes() {
        try {
            const { data, error } = await this.supabase
                .from('clientes')
                .select('*')
                .order('nome');
            
            if (error) throw error;
            console.log(`✅ ${data?.length || 0} clientes carregados`);
            return data || [];
        } catch (error) {
            console.error('❌ Erro ao buscar clientes:', error);
            return [];
        }
    }

    // Cadastrar cliente
    async criarCliente(clienteData) {
        try {
            const { data, error } = await this.supabase
                .from('clientes')
                .insert([clienteData])
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Cliente cadastrado com sucesso:', data);
            return data;
        } catch (error) {
            console.error('❌ Erro ao cadastrar cliente:', error);
            throw error;
        }
    }

    // Criar venda - CORRIGIDO
    async criarVenda(vendaData) {
        try {
            console.log('📝 Tentando criar venda:', vendaData);
            
            // Validar dados obrigatórios
            if (!vendaData.data_venda || !vendaData.forma_pagamento || vendaData.total === undefined) {
                throw new Error('Dados obrigatórios da venda não fornecidos');
            }

            // Garantir que o total seja número
            vendaData.total = parseFloat(vendaData.total) || 0;
            
            if (vendaData.total <= 0) {
                throw new Error('Total da venda deve ser maior que zero');
            }

            // Preparar dados para inserção (apenas campos necessários)
            const dadosVenda = {
                data_venda: vendaData.data_venda,
                cliente: vendaData.cliente || 'Cliente não identificado',
                total: vendaData.total,
                forma_pagamento: vendaData.forma_pagamento,
                observacoes: vendaData.observacoes || '',
                usuario_id: vendaData.usuario_id
                // Não incluir created_at/updated_at - deixar o Supabase gerenciar
            };

            console.log('📦 Dados da venda para inserção:', dadosVenda);

            const { data, error } = await this.supabase
                .from('vendas')
                .insert([dadosVenda]) // Garantir que seja um array
                .select()
                .single();
                
            if (error) {
                console.error('❌ Erro detalhado ao criar venda:', error);
                
                // Tratamento específico para erro 409
                if (error.code === '23505') { // Violação de chave única
                    throw new Error('Já existe uma venda com esses dados. Tente novamente.');
                } else if (error.code === '42501') { // Permissão negada
                    throw new Error('Sem permissão para criar vendas. Verifique suas credenciais.');
                } else {
                    throw error;
                }
            }

            if (!data) {
                throw new Error('Nenhum dado retornado após criação da venda');
            }

            console.log('✅ Venda criada com sucesso:', data);
            return data;

        } catch (error) {
            console.error('❌ Erro ao criar venda:', error);
            throw new Error(`Falha ao criar venda: ${error.message}`);
        }
    }

    // Criar itens da venda - CORRIGIDO
    async criarItensVenda(itensData) {
        try {
            console.log('📦 Criando itens da venda:', itensData);

            // Validar itens
            if (!itensData || !Array.isArray(itensData) || itensData.length === 0) {
                throw new Error('Nenhum item para inserir');
            }

            // Processar cada item
            const itensProcessados = itensData.map(item => ({
                venda_id: item.venda_id,
                produto_id: item.produto_id,
                quantidade: parseInt(item.quantidade) || 1,
                preco_unitario: parseFloat(item.preco_unitario) || 0
            }));

            console.log('🛒 Itens processados:', itensProcessados);

            const { data, error } = await this.supabase
                .from('vendas_itens')
                .insert(itensProcessados);
                
            if (error) {
                console.error('❌ Erro detalhado ao criar itens:', error);
                throw error;
            }

            console.log('✅ Itens da venda criados com sucesso');
            return data;

        } catch (error) {
            console.error('❌ Erro ao criar itens da venda:', error);
            throw new Error(`Falha ao criar itens: ${error.message}`);
        }
    }

    // Atualizar estoque - CORRIGIDO
    async atualizarEstoque(produtoId, novoEstoque) {
        try {
            console.log('📊 Atualizando estoque do produto:', produtoId, 'para:', novoEstoque);

            if (!produtoId || novoEstoque === undefined || novoEstoque < 0) {
                throw new Error('Dados inválidos para atualização de estoque');
            }

            const { data, error } = await this.supabase
                .from('produtos')
                .update({ 
                    estoque_atual: parseInt(novoEstoque)
                })
                .eq('id', produtoId)
                .select()
                .single();
                
            if (error) throw error;

            console.log('✅ Estoque atualizado com sucesso:', data);
            return true;

        } catch (error) {
            console.error('❌ Erro ao atualizar estoque:', error);
            throw new Error(`Falha ao atualizar estoque: ${error.message}`);
        }
    }

    // Verificar estoque antes da venda
    async verificarEstoque(produtoId, quantidade) {
        try {
            const { data: produto, error } = await this.supabase
                .from('produtos')
                .select('estoque_atual, nome, ativo')
                .eq('id', produtoId)
                .single();

            if (error) throw error;

            if (!produto.ativo) {
                throw new Error(`Produto ${produto.nome} está inativo`);
            }

            if (produto.estoque_atual < quantidade) {
                throw new Error(`Estoque insuficiente para ${produto.nome}. Disponível: ${produto.estoque_atual}, Solicitado: ${quantidade}`);
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao verificar estoque:', error);
            throw error;
        }
    }

    // Buscar vendedores
    async buscarVendedores() {
        try {
            const { data, error } = await this.supabase
                .from('sistema_usuarios')
                .select('id, nome, username')
                .eq('ativo', true)
                .order('nome');
                
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Erro ao buscar vendedores:', error);
            return [];
        }
    }
}

// Instância global para vendas
window.vendasSupabase = new VendasSupabase();