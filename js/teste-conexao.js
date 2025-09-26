// js/teste-conexao.js - Testar conexão e estrutura do banco
async function testarConexaoCompleta() {
    try {
        console.log('=== INICIANDO TESTE DE CONEXÃO ===');
        
        // Testar conexão básica
        const { data, error } = await supabase
            .from('sistema_usuarios')
            .select('count')
            .limit(1);
            
        if (error) {
            console.error('❌ Erro na conexão:', error);
            return false;
        }
        
        console.log('✅ Conexão com Supabase estabelecida');
        
        // Verificar se a tabela de usuários existe e tem dados
        const { data: usuarios, error: errorUsuarios } = await supabase
            .from('sistema_usuarios')
            .select('*');
            
        if (errorUsuarios) {
            console.error('❌ Erro ao acessar tabela de usuários:', errorUsuarios);
            return false;
        }
        
        console.log(`✅ Tabela de usuários encontrada com ${usuarios.length} registros`);
        
        // Mostrar usuários disponíveis
        usuarios.forEach(usuario => {
            console.log(`👤 Usuário: ${usuario.username} (${usuario.nome}) - Tipo: ${usuario.tipo} - Ativo: ${usuario.ativo}`);
        });
        
        // Testar login com usuário admin
        const senhaTeste = 'admin123';
        const senhaHash = await window.sistemaAuth.hashSenha(senhaTeste);
        console.log('🔐 Hash da senha "admin123":', senhaHash);
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro no teste de conexão:', error);
        return false;
    }
}

// Executar teste quando a página carregar
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔧 Executando teste de conexão...');
    await testarConexaoCompleta();
});