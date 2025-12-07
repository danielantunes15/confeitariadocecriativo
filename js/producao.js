// js/producao.js - Controle de Estoque de Produção (Dedicado)
document.addEventListener('DOMContentLoaded', async function () {

    // --- VARIÁVEIS GLOBAIS ---
    const loadingElement = document.getElementById('loading');
    const contentElement = document.getElementById('content');
    const acessoNegadoElement = document.getElementById('acesso-negado');
    const estoqueProducaoBody = document.getElementById('estoque-producao-body');
    const alertaEstoqueProducao = document.getElementById('alerta-estoque-producao');
    const recarregarEstoqueBtn = document.getElementById('recarregar-estoque-producao');
    
    // ELEMENTOS DO MODAL
    const modalEstoque = document.getElementById('modal-estoque-producao');
    const formIngrediente = document.getElementById('form-ingrediente');
    const modalTituloEstoque = document.getElementById('modal-titulo-estoque');

    let estoqueProducaoData = [];

    const toggleDisplay = (element, show) => { if (element) element.style.display = show ? 'block' : 'none'; };
    const mostrarMensagem = (mensagem, tipo = 'success') => {
        const container = document.getElementById('alert-container');
        if (!container) return;
        const alertDiv = document.createElement('div');
        // Reutilizando classes de alerta do sistema
        alertDiv.className = `alert alert-${tipo}`; 
        alertDiv.innerHTML = `<span>${mensagem}</span><button class="alert-close" onclick="this.parentElement.remove()">&times;</button>`;
        container.appendChild(alertDiv);
        setTimeout(() => { if (alertDiv.parentNode) alertDiv.remove(); }, 5000);
    };

    // Função para fechar o modal (implementada no HTML, mas usada aqui)
    function fecharModalEstoqueLocal() {
        if (modalEstoque) modalEstoque.style.display = 'none';
        if (formIngrediente) formIngrediente.reset();
        document.getElementById('ingrediente-id-edicao').value = '';
        if (modalTituloEstoque) modalTituloEstoque.innerHTML = '<i class="fas fa-plus-circle"></i> Novo Ingrediente';
    }
    

    // --- AUTENTICAÇÃO E INICIALIZAÇÃO ---
    if (!window.sistemaAuth?.verificarAutenticacao()) {
        window.location.href = 'login.html';
        return;
    }
    const usuario = window.sistemaAuth.usuarioLogado;
    const isAdminOrManager = ['usuario','administrador', 'admin', 'gerente', 'supervisor'].includes(usuario.tipo?.toLowerCase());
    
    async function inicializar() {
        toggleDisplay(loadingElement, true);

        if (!isAdminOrManager) {
            toggleDisplay(loadingElement, false);
            toggleDisplay(acessoNegadoElement, true);
            return;
        }

        configurarEventListeners();
        await carregarEstoqueProducao();

        toggleDisplay(loadingElement, false);
        toggleDisplay(contentElement, true);
    }
    
    function configurarEventListeners() {
        if (recarregarEstoqueBtn) {
            recarregarEstoqueBtn.addEventListener('click', carregarEstoqueProducao);
        }
        
        if (formIngrediente) {
            formIngrediente.addEventListener('submit', salvarIngrediente);
        }
    }


    // ----------------------------------------------------------------------
    // --- MÓDULO: ESTOQUE DE PRODUÇÃO (CRUD) ---
    // ----------------------------------------------------------------------

    async function carregarEstoqueProducao() {
        if (!estoqueProducaoBody) return;
        
        estoqueProducaoBody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><div class="spinner-moderno" style="width: 20px; height: 20px;"></div> Carregando estoque...</td></tr>';
        alertaEstoqueProducao.innerHTML = '';

        try {
            const { data, error } = await supabase.from('estoque_producao')
                .select('*')
                .order('nome');

            if (error) throw error;
            
            estoqueProducaoData = data || [];
            exibirEstoqueProducao(estoqueProducaoData);
            
            if (recarregarEstoqueBtn) {
                recarregarEstoqueBtn.classList.remove('btn-danger');
                recarregarEstoqueBtn.classList.add('btn-secondary');
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar estoque de produção:', error);
            mostrarMensagem('Erro ao carregar o estoque de produção. Verifique se a tabela foi criada corretamente.', 'error');
            estoqueProducaoBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--danger-color);">Erro ao carregar estoque.</td></tr>';
            
            if (recarregarEstoqueBtn) {
                recarregarEstoqueBtn.classList.add('btn-danger');
                recarregarEstoqueBtn.classList.remove('btn-secondary');
            }
        }
    }

    function exibirEstoqueProducao(dados) {
        if (!estoqueProducaoBody) return;

        estoqueProducaoBody.innerHTML = '';
        alertaEstoqueProducao.innerHTML = '';
        let itensParaComprar = [];

        if (dados.length === 0) {
            estoqueProducaoBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--text-color);">Nenhum ingrediente ativo cadastrado.</td></tr>';
            return;
        }

        dados.forEach(item => {
            const estoqueAtual = item.estoque_atual || 0;
            const estoqueMinimo = item.estoque_minimo || 0;
            let statusText = item.ativo ? 'Em Estoque' : 'Inativo';
            let statusClass = item.ativo ? 'success' : 'info';
            const linhaClass = item.ativo ? '' : 'style="opacity: 0.6; font-style: italic;"';

            if (item.ativo) {
                if (estoqueAtual <= 0) {
                    statusText = 'ESGOTADO';
                    statusClass = 'danger';
                    itensParaComprar.push({ item: item.nome, status: statusText, falta: estoqueMinimo, unidade_medida: item.unidade_medida });
                } else if (estoqueAtual <= estoqueMinimo) {
                    statusText = 'Estoque Baixo';
                    statusClass = 'warning';
                    itensParaComprar.push({ item: item.nome, status: statusText, falta: estoqueMinimo - estoqueAtual, unidade_medida: item.unidade_medida });
                }
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td ${linhaClass}>${item.nome}</td>
                <td ${linhaClass}>${item.unidade_medida}</td>
                <td ${linhaClass}>${estoqueAtual.toFixed(2).replace('.', ',')}</td>
                <td ${linhaClass}>${estoqueMinimo.toFixed(2).replace('.', ',')}</td>
                <td>
                    <span class="badge pdf-badge-${statusClass}" style="
                        ${statusClass === 'success' ? 'background: #d4edda; color: #155724;' : ''}
                        ${statusClass === 'warning' ? 'background: #fff3cd; color: #856404;' : ''}
                        ${statusClass === 'danger' ? 'background: #f8d7da; color: #721c24;' : ''}
                        ${statusClass === 'info' ? 'background: #e3f2fd; color: #1565c0;' : ''}
                        padding: 4px 8px; border-radius: 12px; font-size: 0.8rem;
                    ">
                        ${statusText}
                    </span>
                </td>
                <td>
                    <button class="btn btn-edit btn-sm" onclick="editarIngrediente('${item.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="excluirIngrediente('${item.id}', '${item.nome}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            estoqueProducaoBody.appendChild(tr);
        });
        
        // Exibir alertas de compra
        if (itensParaComprar.length > 0) {
            const listaAlerta = document.createElement('div');
            listaAlerta.className = 'card'
            listaAlerta.style.cssText = `background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);`;
            
            let htmlAlerta = '<p style="font-weight: bold; color: #856404; margin-bottom: 10px;">🚨 ITENS A SEREM COMPRADOS IMEDIATAMENTE:</p>';
            htmlAlerta += '<ul style="margin-left: 20px; color: #856404; font-size: 0.9rem; list-style-type: disc;">';
            
            itensParaComprar.forEach(item => {
                const acao = item.status === 'ESGOTADO' ? 'COMPRAR JÁ' : 'Comprar para reposição';
                const falta = item.falta > 0 ? item.falta.toFixed(2).replace('.', ',') : '0,00';
                
                let mensagemFalta = '';
                if (item.status === 'ESGOTADO') {
                    mensagemFalta = `(Deveria ter pelo menos ${item.falta.toFixed(2).replace('.', ',')} ${item.unidade_medida})`
                } else {
                    mensagemFalta = `(Faltam ${falta} ${item.unidade_medida} para atingir o estoque mínimo)`;
                }
                
                htmlAlerta += `<li style="margin-bottom: 5px;">
                    <strong>${item.item}:</strong> ${item.status}. 
                    ${mensagemFalta}
                    <span style="font-weight: bold; color: ${item.status === 'ESGOTADO' ? 'var(--danger-color)' : 'orange'}; margin-left: 10px;">[${acao}]</span>
                </li>`;
            });
            
            htmlAlerta += '</ul>';
            
            listaAlerta.innerHTML = htmlAlerta;
            alertaEstoqueProducao.appendChild(listaAlerta);
        }
    }
    
    // --- CRUD FUNCTIONS (Global para uso no onclick do HTML) ---
    
    async function salvarIngrediente(e) {
        e.preventDefault();
        
        const isEdicao = !!document.getElementById('ingrediente-id-edicao').value;
        const ingredienteId = document.getElementById('ingrediente-id-edicao').value;
        
        const nome = document.getElementById('ingrediente-nome').value.trim();
        const unidade_medida = document.getElementById('ingrediente-unidade').value;
        const estoque_atual = parseFloat(document.getElementById('ingrediente-atual').value);
        const estoque_minimo = parseFloat(document.getElementById('ingrediente-minimo').value);
        const ativo = document.getElementById('ingrediente-ativo').checked;
        
        if (!nome || !unidade_medida || isNaN(estoque_atual) || isNaN(estoque_minimo) || estoque_minimo < 0) {
            mostrarMensagem('Preencha todos os campos corretamente.', 'error');
            return;
        }

        const dadosIngrediente = {
            nome,
            unidade_medida,
            estoque_atual,
            estoque_minimo,
            ativo
        };
        
        try {
            if (isEdicao) {
                // Atualizar
                const { error } = await supabase.from('estoque_producao')
                    .update(dadosIngrediente)
                    .eq('id', ingredienteId);
                    
                if (error) throw error;
                mostrarMensagem('Ingrediente atualizado com sucesso!', 'success');
            } else {
                // Criar
                const { error } = await supabase.from('estoque_producao')
                    .insert([dadosIngrediente]);
                    
                if (error) throw error;
                mostrarMensagem('Ingrediente cadastrado com sucesso!', 'success');
            }
            
            fecharModalEstoqueLocal();
            await carregarEstoqueProducao();

        } catch (error) {
            console.error('❌ Erro ao salvar ingrediente:', error);
            let msg = 'Erro ao salvar ingrediente.';
            if (error.code === '23505') {
                msg = 'Erro: Já existe um ingrediente com este nome.';
            } else if (error.message) {
                msg += ' Detalhe: ' + error.message;
            }
            mostrarMensagem(msg, 'error');
        }
    }
    
    window.editarIngrediente = async function(ingredienteId) {
        try {
            const { data: ingrediente, error } = await supabase.from('estoque_producao')
                .select('*')
                .eq('id', ingredienteId)
                .single();
                
            if (error) throw error;
            
            document.getElementById('ingrediente-id-edicao').value = ingrediente.id;
            document.getElementById('ingrediente-nome').value = ingrediente.nome;
            document.getElementById('ingrediente-unidade').value = ingrediente.unidade_medida;
            document.getElementById('ingrediente-atual').value = parseFloat(ingrediente.estoque_atual).toFixed(2);
            document.getElementById('ingrediente-minimo').value = parseFloat(ingrediente.estoque_minimo).toFixed(2);
            document.getElementById('ingrediente-ativo').checked = ingrediente.ativo;
            
            if (modalTituloEstoque) modalTituloEstoque.innerHTML = '<i class="fas fa-edit"></i> Editar Ingrediente';
            if (modalEstoque) modalEstoque.style.display = 'flex';
            
        } catch (error) {
            console.error('❌ Erro ao carregar ingrediente para edição:', error);
            mostrarMensagem('Erro ao carregar dados do ingrediente.', 'error');
        }
    }

    window.excluirIngrediente = async function(ingredienteId, nomeIngrediente) {
        if (!confirm(`Tem certeza que deseja excluir o ingrediente "${nomeIngrediente}"?\nEsta ação é irreversível!`)) {
            return;
        }

        try {
            const { error } = await supabase.from('estoque_producao')
                .delete()
                .eq('id', ingredienteId);
                
            if (error) throw error;
            
            mostrarMensagem(`Ingrediente "${nomeIngrediente}" excluído com sucesso!`, 'success');
            await carregarEstoqueProducao();

        } catch (error) {
            console.error('❌ Erro ao excluir ingrediente:', error);
            mostrarMensagem('Erro ao excluir ingrediente: ' + error.message, 'error');
        }
    }

    inicializar();
});