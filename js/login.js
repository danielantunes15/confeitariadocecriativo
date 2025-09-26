// js/login.js - Lógica da página de login (SEM CREDENCIAIS DE TESTE)
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById("login-form");
    const msg = document.getElementById("login-message");
    const btnLogin = form.querySelector('button[type="submit"]');

    // Verificar se já está logado
    if (window.sistemaAuth && window.sistemaAuth.verificarAutenticacao()) {
        console.log('✅ Usuário já logado, redirecionando...');
        window.location.href = 'index.html';
        return;
    }

    // Executar diagnóstico ao carregar a página
    console.log('🔧 Iniciando diagnóstico do sistema...');
    diagnosticoCompleto().then(resultado => {
        if (resultado.success) {
            console.log('✅ Diagnóstico concluído com sucesso');
            // Não mostrar mensagem de sistema pronto (mais profissional)
        } else {
            console.error('❌ Diagnóstico falhou:', resultado.error);
            // Não mostrar erro para o usuário final (mais profissional)
        }
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Resetar mensagem
        msg.style.display = "none";
        msg.textContent = "";
        btnLogin.disabled = true;
        btnLogin.textContent = "Entrando...";
        btnLogin.style.opacity = "0.7";

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;

        // Validação básica
        if (!username || !password) {
            mostrarMensagem("Por favor, preencha todos os campos", "error");
            btnLogin.disabled = false;
            btnLogin.textContent = "Entrar";
            btnLogin.style.opacity = "1";
            return;
        }

        try {
            console.log('🔐 Tentando login para:', username);
            const resultado = await window.sistemaAuth.fazerLogin(username, password);
            
            if (resultado.success) {
                mostrarMensagem("Login realizado com sucesso! Redirecionando...", "success");
                console.log('✅ Login bem-sucedido para:', username);
                
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1500);
            } else {
                throw new Error(resultado.error);
            }
            
        } catch (err) {
            console.error("❌ Erro no login:", err);
            mostrarMensagem("Usuário ou senha incorretos", "error");
        } finally {
            btnLogin.disabled = false;
            btnLogin.textContent = "Entrar";
            btnLogin.style.opacity = "1";
        }
    });

    function mostrarMensagem(texto, tipo, tempo = 5000) {
        msg.style.display = "block";
        msg.className = "message " + tipo;
        msg.innerHTML = texto;
        
        setTimeout(() => {
            msg.style.display = "none";
        }, tempo);
    }

    // REMOVIDO: Preenchimento automático para desenvolvimento
});

// Função de diagnóstico (mantida para debug interno)
async function diagnosticoCompleto() {
    console.log('=== 🩺 DIAGNÓSTICO DO SISTEMA ===');
    
    try {
        // 1. Testar conexão básica
        console.log('1. Testando conexão com Supabase...');
        const { data, error } = await supabase.from('sistema_usuarios').select('*').limit(1);
        
        if (error) {
            console.error('❌ Falha na conexão:', error);
            return { success: false, error: error.message };
        }
        console.log('✅ Conexão OK');

        // 2. Verificar tabela e usuários
        console.log('2. Verificando usuários...');
        const { data: usuarios, error: errUsuarios } = await supabase
            .from('sistema_usuarios')
            .select('id, nome, username, tipo, ativo');
            
        if (errUsuarios) {
            console.error('❌ Erro ao buscar usuários:', errUsuarios);
            return { success: false, error: errUsuarios.message };
        }
        
        console.log(`✅ ${usuarios.length} usuário(s) encontrado(s)`);
        
        return { success: true, usuarios: usuarios };
        
    } catch (error) {
        console.error('❌ Erro no diagnóstico:', error);
        return { success: false, error: error.message };
    }
}

// Função de hash independente
async function hashSenha(senha) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(senha);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('❌ Erro no hash:', error);
        return btoa(senha);
    }
}