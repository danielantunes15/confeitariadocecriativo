// js/supabase-client.js - Configuração do cliente Supabase
const SUPABASE_URL = 'https://jdfijbhlujoiuraoxivb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkZmlqYmhsdWpvaXVyYW94aXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NDE3MzgsImV4cCI6MjA3NDQxNzczOH0.yEMThoZdXPx1aNCO1a6wO-FPoMU-gTgxJlsW883rKvc';

// Inicializar Supabase
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Função para testar conexão
async function testarConexaoSupabase() {
    try {
        const { data, error } = await supabase
            .from('produtos')
            .select('count')
            .limit(1);
            
        if (error) throw error;
        
        console.log('✅ Conexão com Supabase estabelecida');
        return true;
    } catch (error) {
        console.error('❌ Erro na conexão com Supabase:', error);
        return false;
    }
}

// Exportar para uso global
window.testarConexaoSupabase = testarConexaoSupabase;