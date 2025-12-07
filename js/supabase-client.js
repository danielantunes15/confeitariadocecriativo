// js/supabase-client.js

// REMOVIDO: Declarações de SUPABASE_URL, SUPABASE_ANON_KEY e createClient.

// CORREÇÃO:
// Apenas criamos um "apelido" (alias) chamado 'supabaseClient'
// para o 'window.supabase' que já foi criado pelo 'supabase-config.js'.
// O arquivo 'script.js' (usado pelo estoque.html) espera por esta variável.
if (!window.supabase) {
    console.error("ERRO GRAVE: window.supabase não foi inicializado. 'supabase-config.js' deve ser carregado PRIMEIRO.");
    alert("Erro crítico de inicialização. Recarregue a página.");
}
const supabaseClient = window.supabase;


// Função para converter imagem para Base64
function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Cache para categorias
let categoriasCache = [];

// Funções para gerenciar produtos
const produtoService = {
    // Buscar todos os produtos
    async getProdutos() {
        const { data, error } = await supabaseClient
            .from('produtos')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Erro ao buscar produtos:', error);
            throw error;
        }
        
        // Adicionar nome da categoria a cada produto
        if (categoriasCache.length > 0) {
            data.forEach(produto => {
                const categoria = categoriasCache.find(cat => cat.id === produto.categoria_id);
                produto.nome_categoria = categoria ? categoria.nome : 'Sem Categoria';
            });
        }
        
        return data;
    },

    // Buscar produto por ID
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
        
        // Adicionar nome da categoria
        if (categoriasCache.length > 0 && data.categoria_id) {
            const categoria = categoriasCache.find(cat => cat.id === data.categoria_id);
            data.nome_categoria = categoria ? categoria.nome : 'Sem Categoria';
        }
        
        return data;
    },

    // Criar novo produto
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

    // Atualizar produto
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

    // Deletar produto
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

    // Buscar todas as categorias
    async getCategorias() {
        const { data, error } = await supabaseClient
            .from('categorias')
            .select('*')
            .order('nome', { ascending: true });
        
        if (error) {
            console.error('Erro ao buscar categorias:', error);
            throw error;
        }
        
        // Atualizar cache
        categoriasCache = data;
        
        return data;
    },

    // Buscar nome da categoria pelo ID
    async getNomeCategoriaById(categoriaId) {
        if (!categoriaId) return 'Sem Categoria';
        
        // Verificar no cache primeiro
        const categoriaCache = categoriasCache.find(cat => cat.id === categoriaId);
        if (categoriaCache) {
            return categoriaCache.nome;
        }
        
        // Se não estiver no cache, buscar no banco
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

    // Upload de imagem como Base64
    async uploadImage(file, produtoId) {
        try {
            console.log('📤 Convertendo imagem para Base64...');
            console.log('📏 Tamanho do arquivo:', file.size, 'bytes');
            console.log('📝 Tipo do arquivo:', file.type);
            
            // Converter para Base64
            const base64String = await imageToBase64(file);
            
            console.log('✅ Imagem convertida para Base64');
            console.log('📊 Tamanho do Base64:', base64String.length, 'caracteres');
            
            return base64String;
            
        } catch (error) {
            console.error('❌ Erro ao converter imagem:', error);
            throw error;
        }
    }
};

// Função para testar a conexão
const testSupabase = {
    async testConnection() {
        try {
            console.log('🔗 Testando conexão com Supabase (via supabase-client.js)...');
            
            // Testar se a tabela produtos existe
            const { data: produtos, error } = await supabaseClient
                .from('produtos')
                .select('count');
            
            if (error) throw error;
            console.log('✅ Conexão com tabela produtos: OK');
            console.log('💡 Sistema pronto para usar!');
            
        } catch (error) {
            console.error('❌ Erro no teste:', error);
        }
    }
};

// Executar teste quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    // Garante que o teste só rode DEPOIS que o window.supabase existir
    if (window.supabase) {
        testSupabase.testConnection();
    }
});