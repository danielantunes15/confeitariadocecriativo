// js/supabase-client.js

// Verifica se a biblioteca Supabase foi carregada
if (!window.supabase) {
    console.error("ERRO GRAVE: window.supabase não foi inicializado. 'supabase-config.js' deve ser carregado PRIMEIRO.");
    alert("Erro crítico de inicialização. Recarregue a página.");
}
const supabaseClient = window.supabase;

// --- FUNÇÃO: Upload para o Supabase Storage ---
async function uploadImagem(file) {
    try {
        if (!file) return null;

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload para o bucket 'imagens-produtos'
        const { data, error } = await supabaseClient
            .storage
            .from('imagens-produtos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Obter a URL pública
        const { data: { publicUrl } } = supabaseClient
            .storage
            .from('imagens-produtos')
            .getPublicUrl(filePath);

        console.log('✅ Imagem enviada com sucesso:', publicUrl);
        return publicUrl;

    } catch (error) {
        console.error('❌ Erro no upload da imagem:', error);
        alert('Erro ao enviar imagem: ' + error.message);
        throw error;
    }
}

// Cache para categorias
let categoriasCache = [];

// Funções para gerenciar produtos
const produtoService = {
    // Buscar todos os produtos (SEM ÍCONE PARA EVITAR TRAVAMENTO)
    async getProdutos() {
        const { data, error } = await supabaseClient
            .from('produtos')
            .select('id, nome, descricao, preco_venda, estoque_atual, estoque_minimo, ativo, categoria_id') // SEM ICONE
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Erro ao buscar produtos:', error);
            throw error;
        }
        
        // Adicionar nome da categoria
        if (categoriasCache.length > 0) {
            data.forEach(produto => {
                const categoria = categoriasCache.find(cat => cat.id === produto.categoria_id);
                produto.nome_categoria = categoria ? categoria.nome : 'Sem Categoria';
            });
        }
        
        return data;
    },

    // Buscar produto por ID (Traz TUDO, inclusive o ícone, pois é só um item)
    async getProdutoById(id) {
        const { data, error } = await supabaseClient
            .from('produtos')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) {
            console.error('Erro ao buscar produto:', error);
            throw error;
        }
        
        if (categoriasCache.length > 0 && data.categoria_id) {
            const categoria = categoriasCache.find(cat => cat.id === data.categoria_id);
            data.nome_categoria = categoria ? categoria.nome : 'Sem Categoria';
        }
        
        return data;
    },

    async createProduto(produto) {
        const { data, error } = await supabaseClient
            .from('produtos')
            .insert([produto])
            .select()
            .single();
        
        if (error) {
            console.error('Erro ao criar produto:', error);
            throw error;
        }
        return data;
    },

    async updateProduto(id, produto) {
        const { data, error } = await supabaseClient
            .from('produtos')
            .update(produto)
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Erro ao atualizar produto:', error);
            throw error;
        }
        return data;
    },

    async deleteProduto(id) {
        const { error } = await supabaseClient
            .from('produtos')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Erro ao deletar produto:', error);
            throw error;
        }
    },

    async getCategorias() {
        const { data, error } = await supabaseClient
            .from('categorias')
            .select('*')
            .order('nome', { ascending: true });
        
        if (error) {
            console.error('Erro ao buscar categorias:', error);
            throw error;
        }
        
        categoriasCache = data;
        return data;
    },

    async getNomeCategoriaById(categoriaId) {
        if (!categoriaId) return 'Sem Categoria';
        
        const categoriaCache = categoriasCache.find(cat => cat.id === categoriaId);
        if (categoriaCache) {
            return categoriaCache.nome;
        }
        
        const { data, error } = await supabaseClient
            .from('categorias')
            .select('nome')
            .eq('id', categoriaId)
            .single();
        
        if (error) {
            console.error('Erro ao buscar categoria:', error);
            return 'Sem Categoria';
        }
        return data.nome;
    },

    async uploadImage(file, produtoId) {
        return await uploadImagem(file);
    }
};

// Função para testar a conexão
const testSupabase = {
    async testConnection() {
        try {
            console.log('🔗 Testando conexão com Supabase...');
            
            // CORREÇÃO: Testar com 'categorias' que é mais leve que 'produtos'
            const { data, error } = await supabaseClient
                .from('categorias')
                .select('count');
            
            if (error) throw error;
            console.log('✅ Conexão OK (via tabela categorias)');
            
        } catch (error) {
            console.error('❌ Erro no teste de conexão:', error);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.supabase) {
        testSupabase.testConnection();
    }
});