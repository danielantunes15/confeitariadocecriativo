// js/supabase-vendas.js - Configuração específica para vendas (CORRIGIDA)
class VendasSupabase {
    constructor() {
        this.supabase = window.supabase;
        console.log('🛒 Sistema de vendas inicializado');
    }

    // Testar conexão
    async testarConexao() {
        try {
            const { data, error } = await this.supabase
                .from('categorias') 
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

    // Buscar categorias (CORRIGIDO: Removido 'icone')
    async buscarCategorias() {
        try {
            const { data, error } = await this.supabase
                .from('categorias')
                .select('id, nome') // <--- REMOVIDO O 'icone' AQUI
                .eq('ativo', true)
                .order('nome');
                
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Erro ao buscar categorias:', error);
            return [];
        }
    }

    // Buscar produtos
    async buscarProdutos() {
        try {
            // Aqui mantemos 'icone' pois a tabela PRODUTOS tem essa coluna
            const { data: produtos, error: erroProdutos } = await this.supabase
                .from('produtos')
                .select('id, nome, descricao, preco_venda, estoque_atual, estoque_minimo, ativo, categoria_id, icone') 
                .eq('ativo', true)
                .order('nome');
                
            if (erroProdutos) throw erroProdutos;

            const { data: categorias, error: erroCategorias } = await this.supabase
                .from('categorias')
                .select('id, nome');

            if (produtos && categorias) {
                const mapaCategorias = {};
                categorias.forEach(c => mapaCategorias[c.id] = c.nome);

                const produtosMapeados = produtos.map(p => ({
                    ...p,
                    categoria: {
                        nome: mapaCategorias[p.categoria_id] || 'Sem Categoria'
                    }
                }));

                console.log(`✅ ${produtosMapeados.length} produtos carregados com imagens.`);
                return produtosMapeados;
            }
            
            return produtos || [];

        } catch (error) {
            console.error('❌ Erro crítico ao buscar produtos:', error);
            return [];
        }
    }
    
    // Buscar clientes
    async buscarClientes() {
        try {
            const { data, error } = await this.supabase
                .from('clientes')
                .select('id, nome, telefone, cpf, endereco')
                .order('nome');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Erro ao buscar clientes:', error);
            return [];
        }
    }

    // Criar venda
    async criarVenda(vendaData) {
        try {
            if (!vendaData.data_venda || !vendaData.forma_pagamento || vendaData.total === undefined) {
                throw new Error('Dados obrigatórios da venda não fornecidos');
            }

            vendaData.total = parseFloat(vendaData.total) || 0;
            
            const dadosVenda = {
                data_venda: vendaData.data_venda,
                cliente: vendaData.cliente || 'Cliente não identificado',
                cliente_id: vendaData.cliente_id,
                total: vendaData.total,
                forma_pagamento: vendaData.forma_pagamento,
                observacoes: vendaData.observacoes || '',
                usuario_id: vendaData.usuario_id
            };

            const { data, error } = await this.supabase
                .from('vendas')
                .insert([dadosVenda])
                .select()
                .single();
                
            if (error) throw error;
            return data;

        } catch (error) {
            console.error('❌ Erro ao criar venda:', error);
            throw new Error(`Falha ao criar venda: ${error.message}`);
        }
    }

    // Criar itens da venda
    async criarItensVenda(itensData) {
        try {
            if (!itensData || !Array.isArray(itensData) || itensData.length === 0) return;

            const itensProcessados = itensData.map(item => ({
                venda_id: item.venda_id,
                produto_id: item.produto_id,
                quantidade: parseInt(item.quantidade) || 1,
                preco_unitario: parseFloat(item.preco_unitario) || 0
            }));

            const { error } = await this.supabase
                .from('vendas_itens')
                .insert(itensProcessados);
                
            if (error) throw error;

        } catch (error) {
            console.error('❌ Erro ao criar itens da venda:', error);
            throw new Error(`Falha ao criar itens: ${error.message}`);
        }
    }

    // Atualizar estoque
    async actualizarEstoque(produtoId, novoEstoque) {
        try {
            const { error } = await this.supabase
                .from('produtos')
                .update({ estoque_atual: parseInt(novoEstoque) })
                .eq('id', produtoId);
                
            if (error) throw error;
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

            if (!produto.ativo) throw new Error(`Produto ${produto.nome} está inativo`);
            if (produto.estoque_atual < quantidade) throw new Error(`Estoque insuficiente para ${produto.nome}.`);

            return true;
        } catch (error) {
            console.error('❌ Erro ao verificar estoque:', error);
            throw error;
        }
    }
}

// Instância global para vendas
window.vendasSupabase = new VendasSupabase();