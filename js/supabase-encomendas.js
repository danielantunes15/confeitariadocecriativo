// js/supabase-encomendas.js - Funções de integração para encomendas e clientes
class EncomendasSupabase {
    constructor() {
        this.supabase = window.supabase;
        console.log('📦 Módulo de encomendas inicializado');
    }

    // Buscar clientes
    async buscarClientes() {
        try {
            const { data, error } = await this.supabase
                .from('clientes')
                .select('*')
                .order('nome');
            
            if (error) throw error;
            console.log(`✅ ${data?.length || 0} clientes carregados para encomendas`);
            return data || [];
        } catch (error) {
            console.error('❌ Erro ao buscar clientes:', error);
            throw new Error('Falha ao carregar a lista de clientes.');
        }
    }

    // Buscar encomendas
    async buscarEncomendas() {
        try {
            const { data, error } = await this.supabase
                .from('encomendas')
                .select('*, cliente:clientes(nome)')
                .order('data_entrega', { ascending: true });
            
            if (error) throw error;
            console.log(`✅ ${data?.length || 0} encomendas carregadas`);
            return data || [];
        } catch (error) {
            console.error('❌ Erro ao buscar encomendas:', error);
            throw new Error('Falha ao carregar a lista de encomendas.');
        }
    }

    // Criar uma nova encomenda
    async criarEncomenda(encomendaData) {
        try {
            const { data, error } = await this.supabase
                .from('encomendas')
                .insert([encomendaData])
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Encomenda criada com sucesso:', data);
            return data;
        } catch (error) {
            console.error('❌ Erro ao criar encomenda:', error);
            throw new Error('Falha ao criar a encomenda.');
        }
    }
    
    // Cadastrar novo cliente
    async criarCliente(clienteData) {
        try {
            const { data, error } = await this.supabase
                .from('clientes')
                .insert([clienteData])
                .select()
                .single();
            
            if (error) throw error;
            console.log('✅ Cliente cadastrado com sucesso:', data);
            return data;
        } catch (error) {
            console.error('❌ Erro ao cadastrar cliente:', error);
            throw error;
        }
    }
    
    // Atualizar um cliente existente
    async atualizarCliente(clienteId, clienteData) {
        try {
            const { data, error } = await this.supabase
                .from('clientes')
                .update(clienteData)
                .eq('id', clienteId)
                .select()
                .single();

            if (error) throw error;
            console.log('✅ Cliente atualizado com sucesso:', data);
            return data;
        } catch (error) {
            console.error('❌ Erro ao atualizar cliente:', error);
            throw new Error('Falha ao atualizar o cliente.');
        }
    }

    // Excluir um cliente
    async excluirCliente(clienteId) {
        try {
            const { error } = await this.supabase
                .from('clientes')
                .delete()
                .eq('id', clienteId);
            
            if (error) throw error;
            console.log('✅ Cliente excluído com sucesso.');
            return true;
        } catch (error) {
            console.error('❌ Erro ao excluir cliente:', error);
            throw new Error('Falha ao excluir o cliente.');
        }
    }
    
    // Excluir uma encomenda
    async excluirEncomenda(encomendaId) {
        try {
            const { error } = await this.supabase
                .from('encomendas')
                .delete()
                .eq('id', encomendaId);

            if (error) throw error;
            console.log(`✅ Encomenda ${encomendaId} excluída com sucesso.`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao excluir encomenda:', error);
            throw new Error('Falha ao excluir a encomenda.');
        }
    }

    // Atualizar encomenda
    async atualizarEncomenda(encomendaId, encomendaData) {
        try {
            const { data, error } = await this.supabase
                .from('encomendas')
                .update(encomendaData)
                .eq('id', encomendaId)
                .select()
                .single();

            if (error) throw error;
            console.log('✅ Encomenda atualizada com sucesso:', data);
            return data;
        } catch (error) {
            console.error('❌ Erro ao atualizar encomenda:', error);
            throw new Error('Falha ao atualizar a encomenda.');
        }
    }

    // Atualizar status da encomenda
    async atualizarStatusEncomenda(encomendaId, status) {
        try {
            const { data, error } = await this.supabase
                .from('encomendas')
                .update({ status: status })
                .eq('id', encomendaId);

            if (error) throw error;
            console.log(`✅ Status da encomenda ${encomendaId} atualizado para ${status}`);
            return data;
        } catch (error) {
            console.error('❌ Erro ao atualizar status da encomenda:', error);
            throw new Error('Falha ao atualizar o status da encomenda.');
        }
    }
    
    // Registrar uma movimentação de caixa (VERSÃO REVISADA)
    async registrarMovimentacao(movimentacaoData) {
        try {
            // Verificação para garantir que os dados essenciais estão presentes
            if (!movimentacaoData.data_caixa || !movimentacaoData.tipo || !movimentacaoData.valor || !movimentacaoData.usuario_id) {
                throw new Error('Dados insuficientes para registrar movimentação no caixa.');
            }

            console.log('📦 Enviando movimentação para o Supabase (caixa_movimentacoes):', movimentacaoData);

            const { data, error } = await this.supabase
                .from('caixa_movimentacoes')
                .insert([movimentacaoData])
                .select()
                .single();
            
            if (error) {
                // Loga o erro específico retornado pelo Supabase para facilitar o diagnóstico
                console.error('❌ Erro retornado pelo Supabase ao registrar movimentação:', error);
                throw error; // Lança o erro original do Supabase
            }
            
            console.log('✅ Movimentação de caixa registrada com sucesso no Supabase:', data);
            return data;
        } catch (error) {
            // Pega qualquer erro (da verificação inicial ou do Supabase)
            console.error('❌ Falha crítica ao tentar registrar movimentação de caixa:', error.message);
            // Lança um novo erro para que a função que chamou saiba que a operação falhou
            throw new Error('Falha ao registrar movimentação no caixa.');
        }
    }
}

// Criar uma instância global para a página de encomendas
window.encomendasSupabase = new EncomendasSupabase();