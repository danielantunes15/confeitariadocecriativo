// js/auth.js - Módulo de Autenticação do Cliente (Corrigido e à prova de nulos)

(function() {
    
    /**
     * Verifica se há um cliente salvo no localStorage ao carregar a página.
     */
    async function verificarSessaoLocal() {
        const telefoneSalvo = localStorage.getItem('clienteTelefone');
        if (telefoneSalvo) {
            const cliente = await window.AppAPI.buscarClientePorTelefone(telefoneSalvo);
            if (cliente) {
                window.app.clientePerfil = cliente;
                window.app.clienteLogado = { id: cliente.telefone, email: cliente.telefone };
            } else {
                 localStorage.removeItem('clienteTelefone');
                 localStorage.removeItem('pedidoAtivoId');
            }
        }
    }

    /**
     * Tenta logar ou iniciar o cadastro com um número de telefone.
     */
    async function iniciarSessao(e) {
        e.preventDefault();
        const uiElementos = window.AppUI.elementos;
        const telefoneRaw = uiElementos.authTelefoneInput.value.trim();
        const telefone = window.AppUI.formatarTelefone(telefoneRaw);

        if (telefone.length < 10) { 
            return window.AppUI.mostrarMensagem('Por favor, insira um telefone válido com DDD.', 'error');
        }

        uiElementos.btnIniciarSessao.disabled = true;
        uiElementos.btnIniciarSessao.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';

        const cliente = await window.AppAPI.buscarClientePorTelefone(telefone);

        if (cliente) {
            window.app.clientePerfil = cliente;
            window.AppUI.mostrarMensagem(`Bem-vindo de volta, ${cliente.nome ? cliente.nome.split(' ')[0] : 'Cliente'}!`, 'success');
            logarClienteManual(true);
        } else {
            uiElementos.cadastroTelefoneHidden.value = telefone;
            uiElementos.loginFormGroup.style.display = 'none';
            uiElementos.cadastroForm.style.display = 'block';
            window.AppUI.mostrarMensagem('Novo cliente detectado! Complete seu cadastro.', 'info');
        }

        uiElementos.btnIniciarSessao.disabled = false;
        uiElementos.btnIniciarSessao.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar ou Cadastrar';
    }

    /**
     * Finaliza o cadastro de um novo cliente.
     */
    async function finalizarCadastro(e) {
        e.preventDefault();
        const uiElementos = window.AppUI.elementos;
        
        // --- LEITURA DOS NOVOS CAMPOS ---
        const nome = uiElementos.cadastroNomeInput.value.trim();
        const telefone = uiElementos.cadastroTelefoneHidden.value;
        const rua = uiElementos.cadastroRuaInput.value.trim();
        const numero = uiElementos.cadastroNumeroInput.value.trim();
        
        // Pega o TEXTO selecionado dos dropdowns
        const cidadeSelect = uiElementos.cadastroCidadeSelect;
        const bairroSelect = uiElementos.cadastroBairroSelect;
        
        // Verifica se os selects existem antes de tentar ler
        const cidade = (cidadeSelect && cidadeSelect.value) ? cidadeSelect.options[cidadeSelect.selectedIndex].text : '';
        const bairro = (bairroSelect && bairroSelect.value) ? bairroSelect.options[bairroSelect.selectedIndex].text : '';
        
        // --- NOVA STRING DE ENDEREÇO (SEM CEP E ESTADO) ---
        const enderecoCompleto = `${rua}, ${numero}, ${bairro} - ${cidade}`;

        // --- NOVA VALIDAÇÃO ---
        if (!nome || !rua || !numero || !bairro || !cidade) {
            return window.AppUI.mostrarMensagem('Preencha o Nome, Rua, Número, Cidade e Bairro.', 'error');
        }
        if (!cidadeSelect || !cidadeSelect.value) {
            return window.AppUI.mostrarMensagem('Por favor, selecione uma Cidade válida.', 'error');
        }
        if (!bairroSelect || !bairroSelect.value) {
             return window.AppUI.mostrarMensagem('Por favor, selecione um Bairro válido.', 'error');
        }
        // --- FIM DA VALIDAÇÃO ---
        
        uiElementos.btnFinalizarCadastro.disabled = true;
        uiElementos.btnFinalizarCadastro.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizando...';

        try {
            const dadosCliente = {
                nome: nome,
                telefone: telefone,
                endereco: enderecoCompleto, 
                auth_id: 'guest-' + telefone
            };
            const novoCliente = await window.AppAPI.finalizarCadastroNoSupabase(dadosCliente);

            window.app.clientePerfil = novoCliente;
            window.AppUI.mostrarMensagem(`Cadastro de ${nome.split(' ')[0]} concluído!`, 'success');
            logarClienteManual(true);

        } catch (error) {
            console.error('Erro no cadastro:', error);
            window.AppUI.mostrarMensagem('Erro ao finalizar cadastro: ' + error.message, 'error');
        } finally {
            uiElementos.btnFinalizarCadastro.disabled = false;
            uiElementos.btnFinalizarCadastro.innerHTML = 'Finalizar Cadastro';
        }
    }
    
    /**
     * Atualiza a UI após o login e inicia o rastreamento, se houver.
     */
    function logarClienteManual(mostrarMensagemBemVindo = true) {
        localStorage.setItem('clienteTelefone', window.app.clientePerfil.telefone);
        window.app.clienteLogado = { id: window.app.clientePerfil.telefone, email: window.app.clientePerfil.telefone }; 
        
        const uiElementos = window.AppUI.elementos;
        
        uiElementos.authScreen.classList.remove('active');
        uiElementos.mobileNav.style.display = 'flex';
        
        if(mostrarMensagemBemVindo) {
            window.AppUI.alternarView('view-cardapio');
        }
        
        uiElementos.navItems.forEach(item => item.classList.remove('active'));
        document.querySelector('.bottom-nav .nav-item[data-view="view-cardapio"]')?.classList.add('active');

        atualizarPerfilUI();
        
        const pedidoIdSalvo = localStorage.getItem('pedidoAtivoId');
        if (pedidoIdSalvo) {
            window.app.Rastreamento.iniciarRastreamento(pedidoIdSalvo);
        } else {
            window.app.Rastreamento.carregarStatusUltimoPedido();
        }
    }

    /**
     * Desloga o cliente e limpa a sessão.
     */
    function fazerLogoutApp() {
        localStorage.removeItem('clienteTelefone');
        localStorage.removeItem('pedidoAtivoId');
        
        window.app.Rastreamento.pararRastreamento();
        
        window.app.clienteLogado = null;
        window.app.clientePerfil = { nome: null, telefone: null, endereco: null };
        
        const uiElementos = window.AppUI.elementos;
        uiElementos.mobileNav.style.display = 'none';
        
        uiElementos.authTelefoneInput.value = '';
        uiElementos.cadastroForm.style.display = 'none';
        uiElementos.loginFormGroup.style.display = 'block';

        window.AppUI.mostrarMensagem('Sessão encerrada.', 'info');
        window.AppUI.alternarView('auth-screen');
    }

    // ================================================================
    // === INÍCIO DA CORREÇÃO (Função à prova de nulos) ===
    // ================================================================
    /**
     * Atualiza os elementos da UI com dados do perfil do cliente.
     * ESTA É A FUNÇÃO CORRIGIDA.
     */
    function atualizarPerfilUI() {
        const perfil = window.app.clientePerfil;
        const elementos = window.AppUI.elementos;
        
        if (window.app.clienteLogado) {
            // VERIFICAÇÃO DE NULO (NOME)
            if (elementos.homeClienteNome) {
                // Se 'perfil.nome' existir, divide; senão, usa 'Cliente'
                elementos.homeClienteNome.textContent = perfil.nome ? perfil.nome.split(' ')[0] : 'Cliente';
            }
            if (elementos.carrinhoClienteNomeDisplay) {
                elementos.carrinhoClienteNomeDisplay.textContent = perfil.nome || 'N/A';
            }

            // VERIFICAÇÃO DE NULO (ENDEREÇO)
            if (elementos.carrinhoEnderecoDisplay) {
                elementos.carrinhoEnderecoDisplay.textContent = perfil.endereco || 'N/A';
            }
            if (elementos.addressText) {
                // Usa "optional chaining" (?.). Se 'perfil.endereco' for nulo, ele para e usa o '||'
                elementos.addressText.textContent = perfil.endereco?.split(',')[0] || 'Seu Endereço';
            }
            if (elementos.carrinhoEnderecoInput) {
                elementos.carrinhoEnderecoInput.value = perfil.endereco || ''; 
            }
            if (elementos.homeEndereco) {
                elementos.homeEndereco.innerHTML = `<strong>Endereço Atual:</strong><br>${perfil.endereco || 'Endereço não cadastrado.'}`;
            }
        } else {
            // Se não estiver logado, define valores padrão
            if (elementos.homeClienteNome) elementos.homeClienteNome.textContent = 'Visitante';
            if (elementos.carrinhoClienteNomeDisplay) elementos.carrinhoClienteNomeDisplay.textContent = 'N/A';
            if (elementos.carrinhoEnderecoDisplay) elementos.carrinhoEnderecoDisplay.textContent = 'N/A';
            if (elementos.addressText) elementos.addressText.textContent = 'Seu Endereço';
        }
    }
    // ================================================================
    // === FIM DA CORREÇÃO ===
    // ================================================================
    
    // === INÍCIO DA ALTERAÇÃO (SALVAR ENDEREÇO SEM CEP) ===
    /**
     * Salva o endereço editado no modal.
     */
    async function salvarEdicaoEndereco(e) {
        e.preventDefault();
        const telefone = window.app.clientePerfil.telefone;
        const uiElementos = window.AppUI.elementos;
        
        // Novos campos
        const rua = uiElementos.modalRuaInput.value.trim();
        const numero = uiElementos.modalNumeroInput.value.trim();
        
        const cidadeSelect = uiElementos.modalCidadeSelect;
        const bairroSelect = uiElementos.modalBairroSelect;
        
        // Pega o TEXTO selecionado dos dropdowns
        const cidade = (cidadeSelect && cidadeSelect.value) ? cidadeSelect.options[cidadeSelect.selectedIndex].text : '';
        const bairro = (bairroSelect && bairroSelect.value) ? bairroSelect.options[bairroSelect.selectedIndex].text : '';

        // Validação igual ao do cadastro
        if (!rua || !numero || !bairro || !cidade) {
            return window.AppUI.mostrarMensagem('Preencha a Cidade, Bairro, Rua e Número.', 'error');
        }
        
        // Formato idêntico ao do cadastro
        const enderecoCompleto = `${rua}, ${numero}, ${bairro} - ${cidade}`;

        try {
            await window.AppAPI.salvarEdicaoEnderecoNoSupabase(telefone, enderecoCompleto);
            
            window.app.clientePerfil.endereco = enderecoCompleto;
            window.AppUI.mostrarMensagem('✅ Endereço atualizado com sucesso!', 'success');
            window.AppUI.fecharModal(uiElementos.modalEditarEndereco);
            
            atualizarPerfilUI(); 
            window.AppCarrinho.atualizarCarrinho();
            window.app.Rastreamento.carregarStatusUltimoPedido(); 

        } catch (error) {
            console.error('Erro ao salvar endereço:', error);
            window.AppUI.mostrarMensagem(`Erro ao salvar endereço: ${error.message || 'Verifique sua conexão.'}`, 'error'); 
        }
    }
    // === FIM DA ALTERAÇÃO ===

    // Expõe as funções para o objeto global AppAuth
    window.AppAuth = {
        verificarSessaoLocal,
        iniciarSessao,
        finalizarCadastro,
        logarClienteManual,
        fazerLogoutApp,
        atualizarPerfilUI,
        salvarEdicaoEndereco
    };

})();