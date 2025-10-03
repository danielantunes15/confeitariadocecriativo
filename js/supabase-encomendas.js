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
}

// Criar uma instância global para a página de encomendas
window.encomendasSupabase = new EncomendasSupabase();