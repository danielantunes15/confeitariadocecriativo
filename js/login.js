// js/login.js - Lógica da página de login ATUALIZADA
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById("login-form");
    const msg = document.getElementById("login-message");
    const btnLogin = form.querySelector('button[type="submit"]');

    // Verificar se já está logado
    if (window.sistemaAuth && window.sistemaAuth.verificarAutenticacao()) {
        console.log('✅ Usuário já logado, redirecionando...');
        
        // Verificar sincronização antes de redirecionar
        window.sistemaAuth.sincronizarUsuario().then(sincronizado => {
            if (sincronizado) {
                window.location.href = 'index.html';
            } else {
                console.warn('⚠️ Problema na sincronização, mantendo na página de login');
                mostrarMensagem('Problema com a conta. Faça login novamente.', 'error');
                window.sistemaAuth.fazerLogout();
            }
        });
        return;
    }

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
                // Verificar sincronização após login
                const sincronizado = await window.sistemaAuth.sincronizarUsuario();
                
                if (sincronizado) {
                    mostrarMensagem("Login realizado com sucesso! Redirecionando...", "success");
                    console.log('✅ Login e sincronização bem-sucedidos');
                    
                    setTimeout(() => {
                        window.location.href = "index.html";
                    }, 1500);
                } else {
                    throw new Error('Problema ao sincronizar conta. Tente novamente.');
                }
            } else {
                throw new Error(resultado.error);
            }
            
        } catch (err) {
            console.error("❌ Erro no login:", err);
            mostrarMensagem(err.message || "Usuário ou senha incorretos", "error");
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
});