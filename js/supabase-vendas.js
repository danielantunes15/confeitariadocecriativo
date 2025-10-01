// js/supabase-vendas.js - Configuração específica para vendas
class VendasSupabase {
    constructor() {
        this.supabase = window.supabase;
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
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
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
            return data || [];
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            return [];
        }
    }

    // Criar venda
    async criarVenda(vendaData) {
        try {
            const { data, error } = await this.supabase
                .from('vendas')
                .insert(vendaData)
                .select()
                .single();
                
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar venda:', error);
            throw error;
        }
    }

    // Criar itens da venda
    async criarItensVenda(itensData) {
        try {
            const { data, error } = await this.supabase
                .from('vendas_itens')
                .insert(itensData);
                
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao criar itens da venda:', error);
            throw error;
        }
    }

    // Atualizar estoque
    async atualizarEstoque(produtoId, novoEstoque) {
        try {
            const { error } = await this.supabase
                .from('produtos')
                .update({ estoque_atual: novoEstoque })
                .eq('id', produtoId);
                
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erro ao atualizar estoque:', error);
            throw error;
        }
    }
}

// Instância global para vendas
window.vendasSupabase = new VendasSupabase();