// js/diagnostico.js - Diagnóstico completo do sistema
async function diagnosticoCompleto() {
    console.log('=== 🩺 DIAGNÓSTICO DO SISTEMA ===');
    
    try {
        // 1. Testar conexão básica
        console.log('1. Testando conexão com Supabase...');
        const { data, error } = await supabase.from('sistema_usuarios').select('*').limit(1);
        
        if (error) {
            console.error('❌ Falha na conexão:', error);
            return false;
        }
        console.log('✅ Conexão OK');

        // 2. Verificar tabela e usuários
        console.log('2. Verificando usuários...');
        const { data: usuarios, error: errUsuarios } = await supabase
            .from('sistema_usuarios')
            .select('id, nome, username, tipo, ativo, senha_hash');
            
        if (errUsuarios) {
            console.error('❌ Erro ao buscar usuários:', errUsuarios);
            return false;
        }
        
        console.log(`✅ ${usuarios.length} usuário(s) encontrado(s):`);
        usuarios.forEach(u => {
            console.log(`   👤 ${u.username} (${u.nome}) - ${u.tipo} - ${u.ativo ? 'Ativo' : 'Inativo'}`);
            console.log(`   🔐 Hash: ${u.senha_hash}`);
        });

        // 3. Testar hash da senha 'admin123'
        console.log('3. Testando hash da senha...');
        const hashTeste = await window.sistemaAuth.hashSenha('admin123');
        console.log('🔐 Hash de "admin123":', hashTeste);

        // 4. Verificar se algum hash coincide
        const usuarioAdmin = usuarios.find(u => u.username === 'admin' && u.ativo);
        if (usuarioAdmin) {
            console.log('🔍 Comparando hashes:');
            console.log('   Banco:', usuarioAdmin.senha_hash);
            console.log('   Local:', hashTeste);
            console.log('   Coincidem?', usuarioAdmin.senha_hash === hashTeste);
        }

        return true;
        
    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
        return false;
    }
}

// Executar diagnóstico
diagnosticoCompleto().then(sucesso => {
    console.log(sucesso ? '✅ Diagnóstico completo' : '❌ Diagnóstico falhou');
});