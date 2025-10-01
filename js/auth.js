// js/auth.js - Sistema de autenticação CORRIGIDO
class SistemaAuth {
    constructor() {
        this.usuarioLogado = null;
        this.carregarUsuarioSalvo();
    }

    // Carregar usuário do localStorage
    carregarUsuarioSalvo() {
        try {
            const usuarioSalvo = localStorage.getItem('usuarioLogado');
            if (usuarioSalvo) {
                this.usuarioLogado = JSON.parse(usuarioSalvo);
                console.log('✅ Usuário carregado do localStorage:', this.usuarioLogado.username);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar usuário:', error);
            this.usuarioLogado = null;
        }
        return this.usuarioLogado;
    }

    // Verificar autenticação
    verificarAutenticacao() {
        return this.carregarUsuarioSalvo();
    }

    // Fazer login - VERSÃO CORRIGIDA
    async fazerLogin(username, senha) {
        try {
            console.log('🔐 Tentando login para:', username);
            
            if (!username || !senha) {
                throw new Error('Usuário e senha são obrigatórios');
            }

            // Gerar hash da senha
            const senhaHash = await this.hashSenha(senha);
            console.log('📋 Hash gerado:', senhaHash);

            // Buscar usuário no banco
            console.log('🔍 Buscando usuário no banco...');
            
            const { data: usuarios, error } = await supabase
                .from('sistema_usuarios')
                .select('*')
                .eq('username', username)
                .eq('ativo', true);

            if (error) {
                console.error('❌ Erro Supabase:', error);
                throw new Error('Erro de conexão com o banco de dados');
            }

            console.log('📊 Usuários encontrados:', usuarios);

            if (!usuarios || usuarios.length === 0) {
                throw new Error('Usuário não encontrado ou inativo');
            }

            const usuario = usuarios[0];
            
            // Verificar senha
            console.log('🔍 Comparando hashes:');
            console.log('   Banco:', usuario.senha_hash);
            console.log('   Local:', senhaHash);
            
            if (usuario.senha_hash !== senhaHash) {
                throw new Error('Senha incorreta');
            }

            // Login bem-sucedido - SALVAR O ID CORRETO DO BANCO
            this.usuarioLogado = {
                id: usuario.id, // ✅ USAR O ID DO BANCO, NÃO DO SUPABASE AUTH
                nome: usuario.nome,
                username: usuario.username,
                tipo: usuario.tipo,
                ativo: usuario.ativo
            };

            localStorage.setItem('usuarioLogado', JSON.stringify(this.usuarioLogado));
            console.log('✅ Login realizado com sucesso! ID do usuário:', this.usuarioLogado.id);
            
            return { 
                success: true, 
                usuario: this.usuarioLogado,
                message: 'Login realizado com sucesso!' 
            };

        } catch (error) {
            console.error('❌ Erro no login:', error);
            return { 
                success: false, 
                error: error.message || 'Erro desconhecido no login' 
            };
        }
    }

    // Fazer logout
    fazerLogout() {
        console.log('🚪 Fazendo logout...');
        this.usuarioLogado = null;
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'login.html';
    }

    // Função de hash CORRIGIDA (SEM SALT)
    async hashSenha(senha) {
        try {
            const texto = senha;
            
            const encoder = new TextEncoder();
            const data = encoder.encode(texto);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            return hashHex;
            
        } catch (error) {
            console.error('❌ Erro no hash:', error);
            // Fallback
            return btoa(senha);
        }
    }

    // Verificar se é admin
    isAdmin() {
        return this.usuarioLogado && this.usuarioLogado.tipo === 'administrador';
    }

    // Verificar autenticação e redirecionar se necessário
    requerAutenticacao() {
        if (!this.verificarAutenticacao()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    requerAdmin() {
        if (!this.requerAutenticacao()) return false;
        if (!this.isAdmin()) {
            alert('❌ Acesso restrito a administradores');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    // NOVO MÉTODO: Verificar se o usuário existe no banco
    async verificarUsuarioNoBanco() {
        if (!this.usuarioLogado || !this.usuarioLogado.id) {
            return false;
        }

        try {
            const { data: usuario, error } = await supabase
                .from('sistema_usuarios')
                .select('id')
                .eq('id', this.usuarioLogado.id)
                .single();

            if (error || !usuario) {
                console.error('❌ Usuário não encontrado no banco:', this.usuarioLogado.id);
                return false;
            }

            console.log('✅ Usuário verificado no banco:', usuario.id);
            return true;
        } catch (error) {
            console.error('❌ Erro ao verificar usuário no banco:', error);
            return false;
        }
    }

    // NOVO MÉTODO: Sincronizar usuário com o banco
    async sincronizarUsuario() {
        if (!this.usuarioLogado) {
            return false;
        }

        try {
            const { data: usuario, error } = await supabase
                .from('sistema_usuarios')
                .select('*')
                .eq('username', this.usuarioLogado.username)
                .single();

            if (error || !usuario) {
                console.error('❌ Usuário não encontrado para sincronização');
                return false;
            }

            // Atualizar dados do usuário logado
            this.usuarioLogado = {
                id: usuario.id,
                nome: usuario.nome,
                username: usuario.username,
                tipo: usuario.tipo,
                ativo: usuario.ativo
            };

            localStorage.setItem('usuarioLogado', JSON.stringify(this.usuarioLogado));
            console.log('✅ Usuário sincronizado com banco:', this.usuarioLogado.id);
            return true;

        } catch (error) {
            console.error('❌ Erro ao sincronizar usuário:', error);
            return false;
        }
    }

    // NOVO MÉTODO: Obter usuário atualizado do banco
    async obterUsuarioAtualizado() {
        if (!this.usuarioLogado) {
            return null;
        }

        try {
            const { data: usuario, error } = await supabase
                .from('sistema_usuarios')
                .select('*')
                .eq('id', this.usuarioLogado.id)
                .single();

            if (error || !usuario) {
                console.error('❌ Erro ao obter usuário atualizado:', error);
                return null;
            }

            return usuario;
        } catch (error) {
            console.error('❌ Erro ao obter usuário atualizado:', error);
            return null;
        }
    }
}

// Função global para logout
window.fazerLogoutGlobal = function() {
    if (window.sistemaAuth) {
        window.sistemaAuth.fazerLogout();
    } else {
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'login.html';
    }
};

// Configurar event listener global para botões de logout
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.fazerLogoutGlobal();
        });
    }
    
    document.querySelectorAll('.btn-logout').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            window.fazerLogoutGlobal();
        });
    });

    // Verificar sincronização do usuário ao carregar a página
    if (window.sistemaAuth && window.sistemaAuth.usuarioLogado) {
        setTimeout(async () => {
            console.log('🔄 Verificando sincronização do usuário...');
            const sincronizado = await window.sistemaAuth.sincronizarUsuario();
            if (!sincronizado) {
                console.warn('⚠️ Usuário não sincronizado com o banco. Algumas funcionalidades podem não funcionar.');
                
                // Tentar obter usuário atualizado
                const usuarioAtualizado = await window.sistemaAuth.obterUsuarioAtualizado();
                if (!usuarioAtualizado) {
                    console.error('❌ Problema grave com usuário. Redirecionando para login...');
                    setTimeout(() => {
                        window.sistemaAuth.fazerLogout();
                    }, 2000);
                }
            } else {
                console.log('✅ Usuário sincronizado com sucesso!');
            }
        }, 1000);
    }
});

// Instância global
window.sistemaAuth = new SistemaAuth();