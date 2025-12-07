// js/header-data.js - Funcionalidades de Header (Relógio e Status)

// Variáveis de cache
let totalPedidosNovos = 0;

const formatarTituloHeader = () => {
    // A tag H1 tem o nome da página (Ex: "Vendas - Frente de Caixa")
    const headerH1 = document.querySelector('.header-content h1.logo');
    if (headerH1) {
        // Envolve o conteúdo existente em um span para aplicar estilo de design
        headerH1.innerHTML = `<i class="fas fa-chart-line"></i> <span>${headerH1.textContent.trim()}</span>`;
    }
};

const atualizarRelogioEStatus = async () => {
    const relogioElement = document.getElementById('header-relogio');
    const statusDeliveryElement = document.getElementById('status-delivery-icon');

    if (relogioElement) {
        const agora = new Date();
        // Formatação Pt-BR da hora e minutos
        const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); 
        relogioElement.textContent = horaFormatada;
    }

    if (statusDeliveryElement && window.atualizarStatusHeaderDelivery) {
        try {
            // A função em delivery.js buscará o número de pedidos 'novo'
            await window.atualizarStatusHeaderDelivery();
            
            let statusIcone = 'fa-check-circle';
            let statusCor = '#28a745'; // Verde (sem pedidos)
            let statusTitulo = 'Sem pedidos novos';

            // Usa a variável global atualizada pelo delivery.js
            if (totalPedidosNovos > 0) {
                statusIcone = 'fa-exclamation-circle'; // Atenção/Alerta
                statusCor = '#ff9800'; // Laranja
                statusTitulo = `${totalPedidosNovos} Pedido(s) Novo(s)!`;
            }
            
            // Aplica os estilos
            statusDeliveryElement.className = `fas ${statusIcone}`;
            statusDeliveryElement.style.color = statusCor;
            statusDeliveryElement.title = statusTitulo;

            // Adiciona um badge de contagem se houver pedidos
            let badgeHtml = '';
            if (totalPedidosNovos > 0) {
                badgeHtml = `<span class="delivery-badge" style="background: #f44336; color: white; border-radius: 50%; font-size: 0.7rem; padding: 2px 5px; position: absolute; top: -5px; right: -5px;">${totalPedidosNovos}</span>`;
            }
            statusDeliveryElement.innerHTML = badgeHtml;


        } catch (error) {
            console.error("Erro ao atualizar status do delivery no header:", error);
            statusDeliveryElement.className = 'fas fa-plug';
            statusDeliveryElement.style.color = '#6c757d';
            statusDeliveryElement.title = 'Erro de Conexão Delivery';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    formatarTituloHeader();
    atualizarRelogioEStatus();
    
    // Atualizar relógio e status a cada 10 segundos
    setInterval(atualizarRelogioEStatus, 10000); 
});