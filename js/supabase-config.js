// js/supabase-config.js
// Esta é a ÚNICA fonte de verdade para a conexão Supabase.

const SUPABASE_URL = 'https://dusbyrepkgfvpkalkhhl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1c2J5cmVwa2dmdnBrYWxraGhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDAyMDEsImV4cCI6MjA4MDk3NjIwMX0.x9tOv95v9zGroyvzGi45QKu6oOnc1J3mHho_UfNQN-U';

// 1. Verifica se a biblioteca Supabase (do CDN) foi carregada
if (typeof supabase === 'undefined') {
    console.error('Erro: A biblioteca Supabase (supabase-js@2) não foi carregada. Verifique o link CDN no HTML.');
    alert('Erro crítico de conexão. Verifique o console.');
} else {
    // 2. Cria o cliente Supabase global que todos os outros scripts usarão
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Cliente Supabase global inicializado por supabase-config.js');
}