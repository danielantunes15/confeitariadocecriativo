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

            // Gerar hash da senha (SEM SALT - igual ao banco)
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

            // Login bem-sucedido
            this.usuarioLogado = {
                id: usuario.id,
                nome: usuario.nome,
                username: usuario.username,
                tipo: usuario.tipo,
                ativo: usuario.ativo
            };

            localStorage.setItem('usuarioLogado', JSON.stringify(this.usuarioLogado));
            console.log('✅ Login realizado com sucesso!');
            
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
            // USAR APENAS A SENHA - SEM SALT (para coincidir com o banco)
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
        return this.usuarioLogado && this.usuarioLogado.tipo === 'admin';
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
}

// Adicionar esta função auxiliar ao auth.js (se não existir)
async function hashSenha(senha) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(senha);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('Erro ao gerar hash:', error);
        return btoa(senha);
    }
}

// Instância global
window.sistemaAuth = new SistemaAuth();