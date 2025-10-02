// js/administracao.js - VERSÃO DEFINITIVA CORRIGIDA
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Iniciando módulo de administração...');

    // Verificar autenticação primeiro
    if (!window.sistemaAuth || !window.sistemaAuth.verificarAutenticacao()) {
        console.log('❌ Usuário não autenticado, redirecionando...');
        window.location.href = 'login.html';
        return;
    }

    console.log('👤 Usuário autenticado:', window.sistemaAuth.usuarioLogado);

    // Verificar se é administrador - CORREÇÃO FLEXÍVEL
    const usuario = window.sistemaAuth.usuarioLogado;
    
    // Lista de tipos que devem ter acesso administrativo
    const tiposComAcesso = ['administrador', 'admin', 'Administrador', 'ADMINISTRADOR', 'gerente', 'supervisor'];
    
    if (!usuario || !tiposComAcesso.includes(usuario.tipo)) {
        console.log('❌ Acesso negado - Tipo de usuário:', usuario.tipo);
        console.log('👤 Usuário completo:', usuario);
        
        mostrarMensagem('❌ Acesso restrito a administradores. Seu tipo: ' + usuario.tipo, 'error');
        
        // Redirecionar após 3 segundos
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        return;
    }

    console.log('✅ Acesso de administração permitido para:', usuario.nome, '- Tipo:', usuario.tipo);

    // Elementos do DOM
    const alertContainer = document.getElementById('alert-container');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const usuariosBody = document.getElementById('usuarios-body');
    const formNovoUsuario = document.getElementById('form-novo-usuario');
    const modalEditar = document.getElementById('modal-editar');
    const formEditarUsuario = document.getElementById('form-editar-usuario');
    const searchInput = document.getElementById('search-usuarios');
    const refreshBtn = document.getElementById('refresh-usuarios');

    // Estado global
    let todosUsuarios = [];
    let usuarioEditando = null;

    // Inicializar
    inicializarAdministracao();

    async function inicializarAdministracao() {
        try {
            console.log('🔄 Inicializando administração...');
            mostrarLoadingUsuarios();
            await carregarListaUsuarios();
            configurarEventListeners();
            console.log('✅ Módulo de administração inicializado com sucesso!');
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            mostrarMensagem('Erro ao inicializar módulo de administração: ' + error.message, 'error');
        }
    }

    function configurarEventListeners() {
        // Tabs
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                switchTab(tabId);
            });
        });

        // Formulários
        if (formNovoUsuario) {
            formNovoUsuario.addEventListener('submit', criarUsuario);
            formNovoUsuario.addEventListener('input', limparErrosFormulario);
        }

        if (formEditarUsuario) {
            formEditarUsuario.addEventListener('submit', salvarEdicaoUsuario);
            formEditarUsuario.addEventListener('input', limparErrosFormulario);
        }

        // Busca
        if (searchInput) {
            searchInput.addEventListener('input', filtrarUsuarios);
        }

        // Atualizar
        if (refreshBtn) {
            refreshBtn.addEventListener('click', carregarListaUsuarios);
        }

        // Modal events
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', fecharModal);
        });

        document.getElementById('fechar-modal')?.addEventListener('click', fecharModal);

        window.addEventListener('click', (e) => {
            if (e.target === modalEditar) {
                fecharModal();
            }
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            window.sistemaAuth.fazerLogout();
        });
    }

    function switchTab(tabId) {
        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        const activeBtn = document.querySelector(`[data-tab="${tabId}"]`);
        const activeContent = document.getElementById(tabId);
        
        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');

        // Limpar formulário ao mudar para nova aba
        if (tabId === 'novo-usuario') {
            formNovoUsuario?.reset();
            limparErrosFormulario();
        }
    }

    function mostrarLoadingUsuarios() {
        if (usuariosBody) {
            usuariosBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center;">
                        <div class="loading-spinner"></div>
                        Carregando usuários...
                    </td>
                </tr>
            `;
        }
    }

    async function carregarListaUsuarios() {
        try {
            mostrarLoadingUsuarios();

            const { data: usuarios, error } = await supabase
                .from('sistema_usuarios')
                .select('id, nome, username, tipo, ativo, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao carregar usuários:', error);
                throw new Error('Falha ao carregar lista de usuários');
            }

            todosUsuarios = usuarios || [];
            exibirUsuarios(todosUsuarios);

        } catch (error) {
            console.error('Erro completo ao carregar usuários:', error);
            usuariosBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle"></i>
                        Erro ao carregar usuários: ${error.message}
                    </td>
                </tr>
            `;
            mostrarMensagem('Erro ao carregar lista de usuários', 'error');
        }
    }

    function exibirUsuarios(usuarios) {
        if (!usuariosBody) return;

        usuariosBody.innerHTML = '';

        if (!usuarios || usuarios.length === 0) {
            usuariosBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #666;">
                        <i class="fas fa-users-slash"></i>
                        Nenhum usuário encontrado
                    </td>
                </tr>
            `;
            return;
        }

        console.log('👥 Usuários carregados:', usuarios);

        usuarios.forEach(usuario => {
            const tr = document.createElement('tr');
            
            const tipoDisplay = usuario.tipo === 'administrador' ? 'Administrador' : 
                              usuario.tipo === 'usuario' ? 'Usuário Normal' : usuario.tipo;
            
            const statusClass = usuario.ativo ? 'active' : 'inactive';
            const statusText = usuario.ativo ? 'Ativo' : 'Inativo';
            const statusIcon = usuario.ativo ? 'fa-check-circle' : 'fa-times-circle';

            tr.innerHTML = `
                <td>
                    <div class="user-info">
                        <i class="fas fa-user"></i>
                        <span>${usuario.nome || 'N/A'}</span>
                    </div>
                </td>
                <td>${usuario.username}</td>
                <td>
                    <span class="badge badge-${usuario.tipo}">
                        ${tipoDisplay}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        ${statusText}
                    </span>
                </td>
                <td>${formatarData(usuario.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-edit" onclick="editarUsuario('${usuario.id}')" 
                                title="Editar usuário">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-toggle ${usuario.ativo ? 'btn-warning' : 'btn-success'}" 
                                onclick="toggleUsuario('${usuario.id}', ${usuario.ativo})"
                                title="${usuario.ativo ? 'Desativar' : 'Ativar'} usuário">
                            <i class="fas ${usuario.ativo ? 'fa-ban' : 'fa-check'}"></i>
                        </button>
                        ${usuario.username !== 'admin' ? 
                            `<button class="btn-danger" 
                                    onclick="excluirUsuario('${usuario.id}', '${usuario.nome}')"
                                    title="Excluir usuário">
                                <i class="fas fa-trash"></i>
                            </button>` : 
                            '<span class="disabled-action" title="Não pode excluir">-</span>'
                        }
                    </div>
                </td>
            `;

            usuariosBody.appendChild(tr);
        });
    }

    function filtrarUsuarios() {
        const termo = searchInput.value.toLowerCase().trim();
        
        if (!termo) {
            exibirUsuarios(todosUsuarios);
            return;
        }

        const usuariosFiltrados = todosUsuarios.filter(usuario => 
            usuario.nome?.toLowerCase().includes(termo) ||
            usuario.username?.toLowerCase().includes(termo) ||
            usuario.tipo?.toLowerCase().includes(termo)
        );

        exibirUsuarios(usuariosFiltrados);
    }

    function limparErrosFormulario() {
        document.querySelectorAll('.form-error').forEach(error => {
            error.textContent = '';
        });
    }

    function mostrarErro(campoId, mensagem) {
        const errorElement = document.getElementById(`error-${campoId}`);
        if (errorElement) {
            errorElement.textContent = mensagem;
        }
    }

    async function criarUsuario(e) {
        e.preventDefault();

        const nome = document.getElementById('novo-nome').value.trim();
        const username = document.getElementById('novo-username').value.trim();
        const senha = document.getElementById('nova-senha').value;
        const confirmarSenha = document.getElementById('confirmar-senha').value;
        const tipo = document.getElementById('tipo-usuario').value;
        const ativo = document.getElementById('usuario-ativo').checked;

        // Validações
        let valido = true;
        limparErrosFormulario();

        if (!nome) {
            mostrarErro('nome', 'Nome é obrigatório');
            valido = false;
        }

        if (!username) {
            mostrarErro('username', 'Usuário é obrigatório');
            valido = false;
        }

        if (!senha) {
            mostrarErro('senha', 'Senha é obrigatória');
            valido = false;
        } else if (senha.length < 6) {
            mostrarErro('senha', 'Senha deve ter pelo menos 6 caracteres');
            valido = false;
        }

        if (!confirmarSenha) {
            mostrarErro('confirmar-senha', 'Confirmação de senha é obrigatória');
            valido = false;
        } else if (senha !== confirmarSenha) {
            mostrarErro('confirmar-senha', 'As senhas não coincidem');
            valido = false;
        }

        if (!tipo) {
            mostrarErro('tipo', 'Tipo de usuário é obrigatório');
            valido = false;
        }

        if (!valido) return;

        try {
            // Verificar se username já existe
            const { data: existing, error: checkError } = await supabase
                .from('sistema_usuarios')
                .select('id')
                .eq('username', username)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existing) {
                mostrarErro('username', 'Username já está em uso');
                return;
            }

            // Fazer hash da senha
            const senhaHash = await hashSenha(senha);

            // Inserir usuário
            const dadosUsuario = {
                nome: nome,
                username: username,
                senha_hash: senhaHash,
                tipo: tipo,
                ativo: ativo
            };

            const { error: insertError } = await supabase
                .from('sistema_usuarios')
                .insert(dadosUsuario);

            if (insertError) throw insertError;

            mostrarMensagem('Usuário criado com sucesso!', 'success');
            formNovoUsuario.reset();
            await carregarListaUsuarios();
            switchTab('lista-usuarios');

        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            let mensagemErro = 'Erro ao criar usuário. ';
            
            if (error.message.includes('tipo_check')) {
                mensagemErro += 'Problema com o tipo de usuário.';
            } else if (error.message) {
                mensagemErro += error.message;
            }
            
            mostrarMensagem(mensagemErro, 'error');
        }
    }

    // Função de hash
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

    // Funções globais para os botões
    window.editarUsuario = async function(userId) {
        try {
            usuarioEditando = userId;
            
            const { data: usuario, error } = await supabase
                .from('sistema_usuarios')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;

            document.getElementById('editar-id').value = usuario.id;
            document.getElementById('editar-nome').value = usuario.nome || '';
            document.getElementById('editar-username').value = usuario.username || '';
            document.getElementById('editar-tipo').value = usuario.tipo;
            document.getElementById('editar-ativo').checked = usuario.ativo;

            modalEditar.style.display = 'block';
            limparErrosFormulario();

        } catch (error) {
            console.error('Erro ao carregar usuário para edição:', error);
            mostrarMensagem('Erro ao carregar dados do usuário', 'error');
        }
    };

    window.toggleUsuario = async function(userId, currentlyActive) {
        const acao = currentlyActive ? 'desativar' : 'ativar';
        
        if (!confirm(`Tem certeza que deseja ${acao} este usuário?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('sistema_usuarios')
                .update({ 
                    ativo: !currentlyActive,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) throw error;

            mostrarMensagem(`Usuário ${acao}do com sucesso!`, 'success');
            await carregarListaUsuarios();

        } catch (error) {
            console.error('Erro ao alterar status do usuário:', error);
            mostrarMensagem('Erro ao alterar status do usuário', 'error');
        }
    };

    window.excluirUsuario = async function(userId, userName) {
        if (!confirm(`Tem certeza que deseja EXCLUIR o usuário "${userName}"?\n\nEsta ação não pode ser desfeita!`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('sistema_usuarios')
                .delete()
                .eq('id', userId);

            if (error) throw error;

            mostrarMensagem('Usuário excluído com sucesso!', 'success');
            await carregarListaUsuarios();

        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            mostrarMensagem('Erro ao excluir usuário', 'error');
        }
    };

    async function salvarEdicaoUsuario(e) {
        e.preventDefault();

        const id = document.getElementById('editar-id').value;
        const nome = document.getElementById('editar-nome').value.trim();
        const username = document.getElementById('editar-username').value.trim();
        const tipo = document.getElementById('editar-tipo').value;
        const ativo = document.getElementById('editar-ativo').checked;

        // Validações
        let valido = true;
        limparErrosFormulario();

        if (!nome) {
            mostrarErro('editar-nome', 'Nome é obrigatório');
            valido = false;
        }

        if (!username) {
            mostrarErro('editar-username', 'Usuário é obrigatório');
            valido = false;
        }

        if (!tipo) {
            mostrarErro('editar-tipo', 'Tipo de usuário é obrigatório');
            valido = false;
        }

        if (!valido) return;

        try {
            // Verificar se username já existe (excluindo o próprio usuário)
            const { data: existing, error: checkError } = await supabase
                .from('sistema_usuarios')
                .select('id')
                .eq('username', username)
                .neq('id', id)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existing) {
                mostrarErro('editar-username', 'Username já está em uso');
                return;
            }

            // Atualizar usuário
            const { error } = await supabase
                .from('sistema_usuarios')
                .update({ 
                    nome: nome, 
                    username: username, 
                    tipo: tipo, 
                    ativo: ativo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            mostrarMensagem('Usuário atualizado com sucesso!', 'success');
            fecharModal();
            await carregarListaUsuarios();

        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            mostrarMensagem('Erro ao atualizar usuário', 'error');
        }
    }

    function fecharModal() {
        if (modalEditar) {
            modalEditar.style.display = 'none';
        }
        if (formEditarUsuario) {
            formEditarUsuario.reset();
        }
        limparErrosFormulario();
        usuarioEditando = null;
    }

    function formatarData(dataString) {
        if (!dataString) return 'N/A';
        try {
            return new Date(dataString).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return 'Data inválida';
        }
    }

    function mostrarMensagem(mensagem, tipo = 'success') {
        if (!alertContainer) return;
        
        // Remover mensagens antigas
        const mensagensAntigas = document.querySelectorAll('.alert-message');
        mensagensAntigas.forEach(msg => msg.remove());

        const mensagemDiv = document.createElement('div');
        mensagemDiv.className = `alert-message alert-${tipo}`;
        
        const icon = tipo === 'success' ? 'fa-check-circle' : 
                   tipo === 'error' ? 'fa-exclamation-triangle' : 
                   tipo === 'warning' ? 'fa-exclamation-circle' : 'fa-info-circle';
        
        mensagemDiv.innerHTML = `
            <div class="alert-content">
                <i class="fas ${icon}"></i>
                <span>${mensagem}</span>
            </div>
            <button class="close-alert" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        alertContainer.appendChild(mensagemDiv);

        // Auto-remover
        setTimeout(() => {
            if (mensagemDiv.parentElement) {
                mensagemDiv.remove();
            }
        }, tipo === 'error' ? 8000 : 5000);
    }

    // Sincronização com outros módulos
    window.atualizarUsuarios = carregarListaUsuarios;

    // Debug function
    window.debugAdmin = function() {
        console.log('🔍 DEBUG ADMINISTRAÇÃO:', {
            usuario: window.sistemaAuth.usuarioLogado,
            tipoUsuario: window.sistemaAuth.usuarioLogado?.tipo,
            isAdmin: window.sistemaAuth.isAdmin(),
            totalUsuarios: todosUsuarios.length,
            usuarios: todosUsuarios
        });
        
        alert('🔍 Verifique o console (F12) para informações de debug');
    };
});