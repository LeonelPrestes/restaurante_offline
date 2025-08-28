// Estado da aplicação
let socket;
let mesaSelecionada = null;
let menuItems = [];
let pedidoAtual = [];
let categoriaAtiva = 'Todos';

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeSocket();
    loadMenuItems();
    setupEventListeners();
});

// Configuração do Socket.IO
function initializeSocket() {
    socket = io();
    
    socket.on('connect', function() {
        updateConnectionStatus(true);
        console.log('Conectado ao servidor');
    });
    
    socket.on('disconnect', function() {
        updateConnectionStatus(false);
        console.log('Desconectado do servidor');
    });
    
    socket.on('novo_pedido', function(pedido) {
        console.log('Novo pedido recebido:', pedido);
        // Aqui poderia mostrar uma notificação
    });
    
    socket.on('pedido_atualizado', function(pedido) {
        console.log('Pedido atualizado:', pedido);
    });
}

// Atualizar status de conexão
function updateConnectionStatus(isConnected) {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    
    if (isConnected) {
        statusIndicator.className = 'status-indicator online';
        statusText.textContent = 'Online';
    } else {
        statusIndicator.className = 'status-indicator offline';
        statusText.textContent = 'Offline';
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Mesa selection
    document.querySelectorAll('.mesa-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectMesa(this.dataset.mesa);
        });
    });
}

// Selecionar mesa
function selectMesa(numeroMesa) {
    mesaSelecionada = numeroMesa;
    
    // Atualizar UI
    document.querySelectorAll('.mesa-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.querySelector(`[data-mesa="${numeroMesa}"]`).classList.add('selected');
    
    // Mostrar mesa selecionada
    const mesaSelectedDiv = document.getElementById('mesaSelected');
    const mesaNumber = document.getElementById('mesaNumber');
    
    mesaNumber.textContent = numeroMesa;
    mesaSelectedDiv.style.display = 'flex';
    
    // Mostrar seções do menu e pedido
    document.getElementById('menuSection').style.display = 'block';
    document.getElementById('pedidoSection').style.display = 'block';
    
    // Scroll para o menu
    document.getElementById('menuSection').scrollIntoView({ behavior: 'smooth' });
}

// Limpar seleção de mesa
function clearMesa() {
    mesaSelecionada = null;
    
    document.querySelectorAll('.mesa-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    document.getElementById('mesaSelected').style.display = 'none';
    document.getElementById('menuSection').style.display = 'none';
    document.getElementById('pedidoSection').style.display = 'none';
    
    // Limpar pedido atual
    clearPedido();
}

// Carregar itens do menu
async function loadMenuItems() {
    try {
        const response = await fetch('/api/menu');
        if (!response.ok) {
            throw new Error('Erro ao carregar menu');
        }
        
        menuItems = await response.json();
        renderMenuCategories();
        renderMenuItems();
    } catch (error) {
        console.error('Erro ao carregar menu:', error);
        showError('Erro ao carregar o cardápio. Verifique a conexão.');
    }
}

// Renderizar categorias do menu
function renderMenuCategories() {
    const categoriesContainer = document.getElementById('menuCategories');
    const categories = ['Todos', ...new Set(menuItems.map(item => item.categoria))];
    
    categoriesContainer.innerHTML = categories.map(category => 
        `<button class="category-btn ${category === categoriaAtiva ? 'active' : ''}" 
                 onclick="selectCategory('${category}')">${category}</button>`
    ).join('');
}

// Selecionar categoria
function selectCategory(category) {
    categoriaAtiva = category;
    renderMenuCategories();
    renderMenuItems();
}

// Renderizar itens do menu
function renderMenuItems() {
    const itemsContainer = document.getElementById('menuItems');
    const filteredItems = categoriaAtiva === 'Todos' 
        ? menuItems 
        : menuItems.filter(item => item.categoria === categoriaAtiva);
    
    itemsContainer.innerHTML = filteredItems.map(item => 
        `<div class="menu-item" onclick="addToPedido(${item.id})">
            <div class="menu-item-name">${item.nome}</div>
            <div class="menu-item-category">${item.categoria}</div>
            <div class="menu-item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
        </div>`
    ).join('');
}

// Adicionar item ao pedido
function addToPedido(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;
    
    const existingItem = pedidoAtual.find(p => p.id === itemId);
    
    if (existingItem) {
        existingItem.quantidade++;
    } else {
        pedidoAtual.push({
            id: item.id,
            nome: item.nome,
            preco: item.preco,
            quantidade: 1
        });
    }
    
    renderPedido();
    
    // Feedback visual
    const menuItemElement = document.querySelector(`[onclick="addToPedido(${itemId})"]`);
    menuItemElement.style.transform = 'scale(0.95)';
    setTimeout(() => {
        menuItemElement.style.transform = '';
    }, 150);
}

// Renderizar pedido atual
function renderPedido() {
    const pedidoContainer = document.getElementById('pedidoItems');
    const totalElement = document.getElementById('pedidoTotal');
    
    if (pedidoAtual.length === 0) {
        pedidoContainer.innerHTML = '<p style="text-align: center; color: #718096; padding: 2rem;">Nenhum item no pedido</p>';
        totalElement.textContent = '0,00';
        return;
    }
    
    pedidoContainer.innerHTML = pedidoAtual.map(item => 
        `<div class="pedido-item">
            <div class="pedido-item-info">
                <div class="pedido-item-name">${item.nome}</div>
                <div class="pedido-item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
            </div>
            <div class="pedido-item-controls">
                <button class="qty-btn" onclick="decreaseQuantity(${item.id})">-</button>
                <span class="qty-display">${item.quantidade}</span>
                <button class="qty-btn" onclick="increaseQuantity(${item.id})">+</button>
                <button class="remove-btn" onclick="removeFromPedido(${item.id})">×</button>
            </div>
        </div>`
    ).join('');
    
    // Calcular total
    const total = pedidoAtual.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    totalElement.textContent = total.toFixed(2).replace('.', ',');
}

// Aumentar quantidade
function increaseQuantity(itemId) {
    const item = pedidoAtual.find(p => p.id === itemId);
    if (item) {
        item.quantidade++;
        renderPedido();
    }
}

// Diminuir quantidade
function decreaseQuantity(itemId) {
    const item = pedidoAtual.find(p => p.id === itemId);
    if (item && item.quantidade > 1) {
        item.quantidade--;
        renderPedido();
    }
}

// Remover item do pedido
function removeFromPedido(itemId) {
    pedidoAtual = pedidoAtual.filter(p => p.id !== itemId);
    renderPedido();
}

// Limpar pedido
function clearPedido() {
    pedidoAtual = [];
    document.getElementById('observacoes').value = '';
    renderPedido();
}

// Enviar pedido
async function enviarPedido() {
    if (!mesaSelecionada) {
        showError('Selecione uma mesa primeiro.');
        return;
    }
    
    if (pedidoAtual.length === 0) {
        showError('Adicione pelo menos um item ao pedido.');
        return;
    }
    
    const observacoes = document.getElementById('observacoes').value.trim();
    
    const pedidoData = {
        mesa: parseInt(mesaSelecionada),
        itens: pedidoAtual,
        observacoes: observacoes
    };
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/pedidos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pedidoData)
        });
        
        if (!response.ok) {
            throw new Error('Erro ao enviar pedido');
        }
        
        const result = await response.json();
        console.log('Pedido enviado:', result);
        
        showLoading(false);
        showSuccess();
        
        // Limpar pedido após envio
        clearPedido();
        
    } catch (error) {
        console.error('Erro ao enviar pedido:', error);
        showLoading(false);
        showError('Erro ao enviar pedido. Tente novamente.');
    }
}

// Mostrar loading
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

// Mostrar sucesso
function showSuccess() {
    document.getElementById('successModal').style.display = 'flex';
}

// Mostrar erro
function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').style.display = 'flex';
}

// Fechar modal
function closeModal() {
    document.getElementById('successModal').style.display = 'none';
    document.getElementById('errorModal').style.display = 'none';
}

// Fechar modal clicando fora
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});

// Prevenir zoom no iOS
document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
});

let lastTouchEnd = 0;
document.addEventListener('touchend', function(e) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

