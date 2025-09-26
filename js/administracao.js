// js/administracao.js - VERSÃO DEFINITIVA CORRIGIDA
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se o usuário é administrador
    if (!window.sistemaAuth || !window.sistemaAuth.requerAdmin()) {
        return;
    }

    // Elementos do DOM
    const alertContainer = document.getElementById('alert-container');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const usuariosBody = document.getElementById('usuarios-body');
    const formNovoUsuario = document.getElementById('form-novo-usuario');
    const modalEditar = document.getElementById('modal-editar');
    const formEditarUsuario = document.getElementById('form-editar-usuario');
    const closeModalBtn = document.querySelector('.close');
    const fecharModalBtn = document.getElementById('fechar-modal');

    // Diagnóstico da estrutura da tabela
    async function diagnosticarEstruturaTabela() {
        try {
            const { data: usuarios, error } = await supabase
                .from('sistema_usuarios')
                .select('*')
                .limit(1);

            if (error) {
                console.log('Erro ao diagnosticar tabela:', error);
                return null;
            }

            console.log('Estrutura da tabela sistema_usuarios:', usuarios);
            
            if (usuarios && usuarios.length > 0) {
                const campos = Object.keys(usuarios[0]);
                console.log('Campos disponíveis:', campos);
                return campos;
            }
            return null;
        } catch (error) {
            console.error('Erro no diagnóstico:', error);
            return null;
        }
    }

    // Event Listeners
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });

    if (formNovoUsuario) {
        formNovoUsuario.addEventListener('submit', criarUsuario);
    }

    if (formEditarUsuario) {
        formEditarUsuario.addEventListener('submit', salvarEdicaoUsuario);
    }

    // Modal events
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', fecharModal);
    }

    if (fecharModalBtn) {
        fecharModalBtn.addEventListener('click', fecharModal);
    }

    window.addEventListener('click', (e) => {
        if (e.target === modalEditar) {
            fecharModal();
        }
    });

    // Carregar dados iniciais
    carregarListaUsuarios();

    // Funções
    function switchTab(tabId) {
        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }

    async function carregarListaUsuarios() {
        try {
            usuariosBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Carregando...</td></tr>';

            const { data: usuarios, error } = await supabase
                .from('sistema_usuarios')
                .select('id, nome, username, tipo, ativo, created_at')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erro ao carregar usuários:', error);
                // Tentar sem ordenação
                const { data: usuariosSimples, error: errorSimples } = await supabase
                    .from('sistema_usuarios')
                    .select('id, nome, username, tipo, ativo, created_at');
                
                if (errorSimples) {
                    throw errorSimples;
                }
                
                exibirUsuarios(usuariosSimples);
                return;
            }

            exibirUsuarios(usuarios);

        } catch (error) {
            console.error('Erro completo ao carregar usuários:', error);
            usuariosBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #dc3545;">Erro ao carregar usuários: ' + error.message + '</td></tr>';
            mostrarMensagem('Erro ao carregar lista de usuários', 'error');
        }
    }

    function exibirUsuarios(usuarios) {
        usuariosBody.innerHTML = '';

        if (!usuarios || usuarios.length === 0) {
            usuariosBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum usuário encontrado</td></tr>';
            return;
        }

        console.log('Usuários carregados:', usuarios);

        usuarios.forEach(usuario => {
            const tr = document.createElement('tr');
            
            // Formatar o tipo para exibição
            const tipoDisplay = usuario.tipo === 'administrador' ? 'Administrador' : 
                              usuario.tipo === 'usuario' ? 'Usuário Normal' : usuario.tipo;
            
            tr.innerHTML = `
                <td>${usuario.nome || 'N/A'}</td>
                <td>${usuario.username}</td>
                <td>${tipoDisplay}</td>
                <td>
                    <span class="status-badge ${usuario.ativo ? 'active' : 'inactive'}">
                        ${usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td>${formatarData(usuario.created_at)}</td>
                <td>
                    <button class="btn-edit" onclick="editarUsuario('${usuario.id}')">Editar</button>
                    <button class="btn-toggle ${usuario.ativo ? 'btn-warning' : 'btn-success'}" 
                        onclick="toggleUsuario('${usuario.id}', ${usuario.ativo})">
                        ${usuario.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    ${usuario.username !== 'admin' ? 
                        `<button class="btn-danger" onclick="excluirUsuario('${usuario.id}', '${usuario.nome}')">
                            Excluir
                        </button>` : 
                        '<span style="color: #666;">-</span>'
                    }
                </td>
            `;

            usuariosBody.appendChild(tr);
        });
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
        if (!nome || !username || !senha || !confirmarSenha) {
            mostrarMensagem('Preencha todos os campos obrigatórios', 'error');
            return;
        }

        if (senha.length < 6) {
            mostrarMensagem('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        if (senha !== confirmarSenha) {
            mostrarMensagem('As senhas não coincidem', 'error');
            return;
        }

        try {
            // Verificar se username já existe
            const { data: existing, error: checkError } = await supabase
                .from('sistema_usuarios')
                .select('id')
                .eq('username', username)
                .maybeSingle();

            if (checkError) {
                console.error('Erro ao verificar username:', checkError);
                throw checkError;
            }

            if (existing) {
                mostrarMensagem('Username já está em uso', 'error');
                return;
            }

            // Fazer hash da senha
            const senhaHash = await hashSenha(senha);
            console.log('Hash da nova senha:', senhaHash);

            // Inserir usuário com os valores corretos para a constraint
            const dadosUsuario = {
                nome: nome,
                username: username,
                senha_hash: senhaHash,
                tipo: tipo, // Agora será 'usuario' ou 'administrador' (valores corretos)
                ativo: ativo
            };

            console.log('Dados a serem inseridos:', dadosUsuario);

            const { error: insertError } = await supabase
                .from('sistema_usuarios')
                .insert(dadosUsuario);

            if (insertError) {
                throw insertError;
            }

            mostrarMensagem('Usuário criado com sucesso!', 'success');
            formNovoUsuario.reset();
            await carregarListaUsuarios();
            switchTab('lista-usuarios');

        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            
            let mensagemErro = 'Erro ao criar usuário. ';
            
            if (error.message.includes('tipo_check')) {
                mensagemErro += 'Problema com o tipo de usuário. Verifique os valores permitidos.';
            } else if (error.message) {
                mensagemErro += error.message;
            } else {
                mensagemErro += 'Verifique se todos os campos estão corretos.';
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
            // Fallback simples
            return btoa(senha);
        }
    }

    // Funções globais para os botões
    window.editarUsuario = async function(userId) {
        try {
            console.log('Editando usuário:', userId);
            
            const { data: usuario, error } = await supabase
                .from('sistema_usuarios')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Erro ao buscar usuário:', error);
                throw error;
            }

            document.getElementById('editar-id').value = usuario.id;
            document.getElementById('editar-nome').value = usuario.nome || '';
            document.getElementById('editar-username').value = usuario.username || '';
            document.getElementById('editar-tipo').value = usuario.tipo;
            document.getElementById('editar-ativo').checked = usuario.ativo;

            modalEditar.style.display = 'block';

        } catch (error) {
            console.error('Erro ao carregar usuário para edição:', error);
            mostrarMensagem('Erro ao carregar dados do usuário: ' + error.message, 'error');
        }
    };

    window.toggleUsuario = async function(userId, currentlyActive) {
        if (!confirm(`Tem certeza que deseja ${currentlyActive ? 'desativar' : 'ativar'} este usuário?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('sistema_usuarios')
                .update({ 
                    ativo: !currentlyActive
                })
                .eq('id', userId);

            if (error) throw error;

            mostrarMensagem(`Usuário ${currentlyActive ? 'desativado' : 'ativado'} com sucesso!`, 'success');
            await carregarListaUsuarios();

        } catch (error) {
            console.error('Erro ao alterar status do usuário:', error);
            mostrarMensagem('Erro ao alterar status do usuário: ' + error.message, 'error');
        }
    };

    window.excluirUsuario = async function(userId, userName) {
        if (!confirm(`Tem certeza que deseja EXCLUIR o usuário "${userName}"? Esta ação não pode ser desfeita!`)) {
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
            mostrarMensagem('Erro ao excluir usuário: ' + error.message, 'error');
        }
    };

    async function salvarEdicaoUsuario(e) {
        e.preventDefault();

        const id = document.getElementById('editar-id').value;
        const nome = document.getElementById('editar-nome').value.trim();
        const username = document.getElementById('editar-username').value.trim();
        const tipo = document.getElementById('editar-tipo').value;
        const ativo = document.getElementById('editar-ativo').checked;

        if (!nome || !username) {
            mostrarMensagem('Preencha todos os campos obrigatórios', 'error');
            return;
        }

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
                mostrarMensagem('Username já está em uso', 'error');
                return;
            }

            // Atualizar usuário
            const { error } = await supabase
                .from('sistema_usuarios')
                .update({ 
                    nome: nome, 
                    username: username, 
                    tipo: tipo, 
                    ativo: ativo
                })
                .eq('id', id);

            if (error) throw error;

            mostrarMensagem('Usuário atualizado com sucesso!', 'success');
            fecharModal();
            await carregarListaUsuarios();

        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            mostrarMensagem('Erro ao atualizar usuário: ' + error.message, 'error');
        }
    }

    function fecharModal() {
        modalEditar.style.display = 'none';
        formEditarUsuario.reset();
    }

    function formatarData(dataString) {
        if (!dataString) return 'N/A';
        try {
            return new Date(dataString).toLocaleDateString('pt-BR');
        } catch (error) {
            return 'Data inválida';
        }
    }

    function mostrarMensagem(mensagem, tipo = 'success') {
        // Remover mensagens antigas
        const mensagensAntigas = document.querySelectorAll('.alert-message');
        mensagensAntigas.forEach(msg => msg.remove());

        const mensagemDiv = document.createElement('div');
        mensagemDiv.className = `alert-message ${tipo === 'error' ? 'alert-error' : 'alert-success'}`;
        mensagemDiv.innerHTML = `
            ${mensagem}
            <button class="close-alert" onclick="this.parentElement.remove()" style="float: right; background: none; border: none; cursor: pointer;">×</button>
        `;
        
        alertContainer.appendChild(mensagemDiv);

        setTimeout(() => {
            if (mensagemDiv.parentElement) {
                mensagemDiv.remove();
            }
        }, 5000);
    }

    // Executar diagnóstico ao carregar
    diagnosticarEstruturaTabela();
});