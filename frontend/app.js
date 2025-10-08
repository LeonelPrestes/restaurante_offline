// Estado da aplicação
let socket;
let mesaSelecionada = null;
let menuItems = [];
let pedidoAtual = []; // itens terão: uid, id, nome, preco, quantidade, observacao, adicionar[], retirar[]
let categoriaAtiva = 'Executivos'; // categoria inicial

// extras globais e customização temporária por item
let extrasGlobal = []; // array de strings (ovo, omelete, bifes, etc)
const currentCustomizationByItem = {}; // { [itemId]: { adicionar:[], retirar:[], observacao:'' } }

// uid temporário usado para diferenciar linhas com mesma id mas observações diferentes
function generateUid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeSocket();
    loadMenuItems();
    setupEventListeners();
});

// -----------------------------
// Socket.IO (sem alteração)
// -----------------------------
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
    });
    
    socket.on('pedido_atualizado', function(pedido) {
        console.log('Pedido atualizado:', pedido);
    });
}

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

// -----------------------------
// Event listeners gerais
// -----------------------------
function setupEventListeners() {
    // Mesa selection
    document.querySelectorAll('.mesa-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            selectMesa(this.dataset.mesa);
        });
    });

    // Configurar botões do modal de observação (existem no index.html)
    const modal = document.getElementById('modalObservacao');
    if (modal) {
        const btnCancelar = document.getElementById('btnCancelarObs');
        const btnAdicionar = document.getElementById('btnAdicionarObs');
        const textarea = document.getElementById('textoObservacao');

        // cancelar fecha modal sem adicionar (descarta customização temporária)
        if (btnCancelar) btnCancelar.addEventListener('click', () => {
            const itemId = modal.dataset.itemId;
            if (itemId) {
                // descarta customização temporária para esse item (não altera pedidos já existentes)
                delete currentCustomizationByItem[itemId];
            }
            modal.style.display = 'none';
            modal.dataset.itemId = '';
            if (textarea) textarea.value = '';
            // limpar a área de customização (opcional)
            const custArea = modal.querySelector('#customizationArea');
            if (custArea) custArea.innerHTML = '';
        });

        // adicionar -> salva item ao pedido com customizações
        if (btnAdicionar) btnAdicionar.addEventListener('click', () => {
            const itemId = modal.dataset.itemId;
            const observacao = textarea ? textarea.value.trim() : '';
            if (itemId) {
                const customization = currentCustomizationByItem[itemId] || { adicionar: [], retirar: [], observacao: '' };
                customization.observacao = observacao;
                addToPedidoWithCustomization(parseInt(itemId), customization.observacao, customization.adicionar || [], customization.retirar || []);
                // opcional: limpar a customização temporária daquele item depois de adicionar
                delete currentCustomizationByItem[itemId];
            }
            modal.style.display = 'none';
            modal.dataset.itemId = '';
            if (textarea) textarea.value = '';
            const custArea = modal.querySelector('#customizationArea');
            if (custArea) custArea.innerHTML = '';
        });
    }

    // Fechar qualquer modal clicando fora (se o overlay tiver a classe 'modal')
    document.addEventListener('click', function(e) {
        if (e.target.classList && e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// -----------------------------
// Selecionar mesa / limpar mesa
// -----------------------------
function selectMesa(numeroMesa) {
    mesaSelecionada = numeroMesa;
    
    document.querySelectorAll('.mesa-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const el = document.querySelector(`[data-mesa="${numeroMesa}"]`);
    if (el) el.classList.add('selected');
    
    const mesaSelectedDiv = document.getElementById('mesaSelected');
    const mesaNumber = document.getElementById('mesaNumber');
    
    if (mesaNumber) mesaNumber.textContent = numeroMesa;
    if (mesaSelectedDiv) mesaSelectedDiv.style.display = 'flex';
    
    const menuSection = document.getElementById('menuSection');
    const pedidoSection = document.getElementById('pedidoSection');
    if (menuSection) menuSection.style.display = 'block';
    if (pedidoSection) pedidoSection.style.display = 'block';
    
    if (menuSection) menuSection.scrollIntoView({ behavior: 'smooth' });
}

function clearMesa() {
    mesaSelecionada = null;
    
    document.querySelectorAll('.mesa-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    const mesaSelectedDiv = document.getElementById('mesaSelected');
    const menuSection = document.getElementById('menuSection');
    const pedidoSection = document.getElementById('pedidoSection');

    if (mesaSelectedDiv) mesaSelectedDiv.style.display = 'none';
    if (menuSection) menuSection.style.display = 'none';
    if (pedidoSection) pedidoSection.style.display = 'none';
    
    clearPedido();
}

// -----------------------------
// Menu: carregar e renderizar
// -----------------------------
async function loadMenuItems() {
    try {
        const response = await fetch('/api/menu');
        if (!response.ok) throw new Error('Erro ao carregar menu');
        
        menuItems = await response.json();
        // construir extras global baseando-se no cardápio
        buildExtrasList();
        renderMenuCategories();
        renderMenuItems();
    } catch (error) {
        console.error('Erro ao carregar menu:', error);
        showError('Erro ao carregar o cardápio. Verifique a conexão.');
    }
}

function buildExtrasList() {
    // itens base solicitados
    const baseExtras = ['Ovo', 'Omelete', 'Omelete Simples', 'Fritas', 'Bife Frango Grelhado', 'Bife Frango a Milanesa', 'Bife Frango a Parmegiana', 'Bife Porco Grelhado', 'Bife Boi Grelhado', 'Bife Boi a Milanesa', 'Bife Boi a Parmegiana', 'Bife Tilapia Grelhada', 'Bife Figado'];
    extrasGlobal = baseExtras;
}

function renderMenuCategories() {
    const categoriesContainer = document.getElementById('menuCategories');
    if (!categoriesContainer) return;
    const categories = ['Todos', ...new Set(menuItems.map(item => item.categoria))];
    
    categoriesContainer.innerHTML = categories.map(category => 
        `<button class="category-btn ${category === categoriaAtiva ? 'active' : ''}" 
                 onclick="selectCategory('${category}')">${category}</button>`
    ).join('');
}

function selectCategory(category) {
    categoriaAtiva = category;
    renderMenuCategories();
    renderMenuItems();
}

function renderMenuItems() {
    const itemsContainer = document.getElementById('menuItems');
    if (!itemsContainer) return;

    const filteredItems = categoriaAtiva === 'Todos' 
        ? menuItems 
        : menuItems.filter(item => item.categoria === categoriaAtiva);
    
    itemsContainer.innerHTML = filteredItems.map(item => 
        `<div class="menu-item" onclick="openItemModal(${item.id})">
            <div class="menu-item-name">${item.nome}</div>
            <div class="menu-item-category">${item.categoria}</div>
            <div class="menu-item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
        </div>`
    ).join('');
}

// -----------------------------
// Modal: abrir para um item (agora com Retirar / Adicionar)
// -----------------------------
function openItemModal(itemId) {
    const modal = document.getElementById('modalObservacao');
    const textarea = document.getElementById('textoObservacao');

    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    if (!modal) {
        // fallback (manter compatibilidade)
        addToPedidoWithCustomization(itemId, '', [], []);
        return;
    }

    // preparar personalização inicial:
    // - união das customizações já presentes no pedido para esse item (para mostrar "já no pedido")
    const existentesAdicionar = Array.from(new Set(pedidoAtual
        .filter(p => p.id === itemId)
        .flatMap(p => (p.adicionar || []))
    ));
    const existentesRetirar = Array.from(new Set(pedidoAtual
        .filter(p => p.id === itemId)
        .flatMap(p => (p.retirar || []))
    ));

    // inicializa currentCustomization com as seleções existentes (usuário verá o que já foi adicionado ao pedido)
    currentCustomizationByItem[itemId] = {
        adicionar: [...existentesAdicionar], // pré-seleciona com o que já está no pedido (útil como referência)
        retirar: [...existentesRetirar],
        observacao: ''
    };

    // armazenar id no modal para o handler do botão Adicionar/Cancela
    modal.style.display = 'flex';
    modal.dataset.itemId = String(itemId);

    // limpar e preencher área de customização (coloco antes do textarea)
    let custArea = modal.querySelector('#customizationArea');
    if (!custArea) {
        custArea = document.createElement('div');
        custArea.id = 'customizationArea';
        // inserir antes do textarea (se houver)
        const modalContent = modal.querySelector('.modal-content');
        const textareaEl = modalContent.querySelector('#textoObservacao');
        modalContent.insertBefore(custArea, textareaEl);
    }
    renderCustomizationArea(item, custArea);

    // preenche textarea em branco (ou pode vir carregado)
    if (textarea) {
        textarea.value = '';
        textarea.focus();
    }
}

// renderiza a UI interna do modal para customização
function renderCustomizationArea(item, container) {
    const itemId = item.id;
    const retirarOptions = Array.isArray(item.ingredientes) && item.ingredientes.length
        ? item.ingredientes
        : ['Cebola', 'Salada', 'Tomate', 'Alface', 'Feijão', 'Arroz',]; // fallback padrão

    const adicionarOptions = extrasGlobal.slice(); // já construída em loadMenuItems()

    // obter seleção atual temporária
    const cur = currentCustomizationByItem[itemId] || { adicionar: [], retirar: [], observacao: '' };

    // montar HTML
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="accordion-btn" type="button" data-acc="retirar" style="width:100%;">Retirar ingredientes ▾</button>
        <div class="accordion-content" data-acc="retirar" style="display:none;">
          <div class="options-grid" data-acc="retirar-options">
            ${retirarOptions.map(opt => `<button class="option-btn" data-type="retirar" data-opt="${escapeHtml(opt)}" onclick="toggleCustomizationOption(${itemId}, 'retirar', '${escapeJs(opt)}')">${escapeHtml(opt)}</button>`).join('')}
          </div>
          <div class="selected-list"><strong>Selecionados:</strong> <span id="selectedRetirar">${cur.retirar.map(escapeHtml).join(', ')}</span></div>
        </div>

        <button class="accordion-btn" type="button" data-acc="adicionar" style="width:100%;">Adicionar extras ▾</button>
        <div class="accordion-content" data-acc="adicionar" style="display:none;">
          <div class="options-grid" data-acc="adicionar-options">
            ${adicionarOptions.map(opt => `<button class="option-btn" data-type="adicionar" data-opt="${escapeHtml(opt)}" onclick="toggleCustomizationOption(${itemId}, 'adicionar', '${escapeJs(opt)}')">${escapeHtml(opt)}</button>`).join('')}
          </div>
          <div class="selected-list"><strong>Selecionados:</strong> <span id="selectedAdicionar">${cur.adicionar.map(escapeHtml).join(', ')}</span></div>
        </div>

        <div class="already-in-pedido" style="text-align:left; font-size:0.9rem; color:#4a5568;">
          <strong>Já no pedido:</strong>
          <div><small>Adicionar: <span id="alreadyAdicionar">${Array.from(new Set(pedidoAtual.filter(p=>p.id===itemId).flatMap(p=>p.adicionar||[]))).map(escapeHtml).join(', ') || '—'}</span></small></div>
          <div><small>Retirar: <span id="alreadyRetirar">${Array.from(new Set(pedidoAtual.filter(p=>p.id===itemId).flatMap(p=>p.retirar||[]))).map(escapeHtml).join(', ') || '—'}</span></small></div>
        </div>
      </div>
    `;

    // inicializar estado visual (marcar botões já selecionados)
    // marcar retirar
    cur.retirar.forEach(opt => {
        const btn = container.querySelector(`.option-btn[data-type="retirar"][data-opt="${escapeHtml(opt)}"]`);
        if (btn) btn.classList.add('option-selected');
    });
    // marcar adicionar
    cur.adicionar.forEach(opt => {
        const btn = container.querySelector(`.option-btn[data-type="adicionar"][data-opt="${escapeHtml(opt)}"]`);
        if (btn) btn.classList.add('option-selected');
    });

    // configurar accordions (toggle)
    container.querySelectorAll('.accordion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const acc = btn.getAttribute('data-acc');
            const content = container.querySelector(`.accordion-content[data-acc="${acc}"]`);
            if (!content) return;
            const isHidden = content.style.display === 'none' || content.style.display === '';
            // fechar outros
            container.querySelectorAll('.accordion-content').forEach(c => c.style.display = 'none');
            content.style.display = isHidden ? 'block' : 'none';
        });
    });
}

// toggle de opção (adicionar/retirar)
function toggleCustomizationOption(itemId, type, optionName) {
    // normalizar
    optionName = String(optionName);
    const cur = currentCustomizationByItem[itemId] || { adicionar: [], retirar: [], observacao: '' };
    const list = (type === 'adicionar') ? cur.adicionar : cur.retirar;

    const idx = list.findIndex(s => s === optionName);
    if (idx === -1) {
        list.push(optionName);
    } else {
        list.splice(idx, 1);
    }

    // salvar
    currentCustomizationByItem[itemId] = cur;

    // atualizar UI: marcar/desmarcar botão
    const modal = document.getElementById('modalObservacao');
    if (!modal) return;
    const container = modal.querySelector('#customizationArea');
    if (!container) return;

    // atualizar button class
    const btn = container.querySelector(`.option-btn[data-type="${type}"][data-opt="${escapeHtml(optionName)}"]`);
    if (btn) btn.classList.toggle('option-selected');

    // atualizar lists de selecionados
    const selRet = container.querySelector('#selectedRetirar');
    const selAdd = container.querySelector('#selectedAdicionar');
    if (selRet) selRet.textContent = (cur.retirar || []).join(', ');
    if (selAdd) selAdd.textContent = (cur.adicionar || []).join(', ');
}

// -----------------------------
// Adicionar item ao pedido (mantive a função antiga como wrapper)
// -----------------------------
function addToPedido(itemId) {
    // comportamento antigo: adiciona sem observação
    addToPedidoWithCustomization(itemId, '', [], []);
}

// Nova função: adiciona item com observação, adicionar e retirar
function addToPedidoWithCustomization(itemId, observacao, adicionar = [], retirar = []) {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    // tentamos encontrar linha existente com mesma configuração (id + mesmas listas + mesma observacao)
    const existingItem = pedidoAtual.find(p => 
        p.id === itemId &&
        (p.observacao || '') === (observacao || '') &&
        arraysEqual((p.adicionar || []), (adicionar || [])) &&
        arraysEqual((p.retirar || []), (retirar || []))
    );

    if (existingItem) {
        existingItem.quantidade++;
    } else {
        pedidoAtual.push({
            uid: generateUid(),
            id: item.id,
            nome: item.nome,
            preco: item.preco,
            quantidade: 1,
            observacao: observacao || '',
            adicionar: adicionar.slice(),
            retirar: retirar.slice()
        });
    }

    renderPedido();
}

// helper para comparar arrays de strings (ordem irrelevante)
function arraysEqual(a = [], b = []) {
    if (a.length !== b.length) return false;
    const aa = [...a].map(String).sort();
    const bb = [...b].map(String).sort();
    return aa.every((v, i) => v === bb[i]);
}

// -----------------------------
// Renderizar pedido atual (com adicionar/retirar exibidos)
// -----------------------------
function renderPedido() {
    ensureUidsOnPedido();

    const pedidoContainer = document.getElementById('pedidoItems');
    const totalElement = document.getElementById('pedidoTotal');
    
    if (!pedidoContainer) return;

    if (pedidoAtual.length === 0) {
        pedidoContainer.innerHTML = '<p style="text-align: center; color: #718096; padding: 2rem;">Nenhum item no pedido</p>';
        if (totalElement) totalElement.textContent = '0,00';
        return;
    }
    
    pedidoContainer.innerHTML = pedidoAtual.map(item => {
        const retirarHtml = item.retirar && item.retirar.length ? `<div class="pedido-item-note"><small>Retirar: ${escapeHtml(item.retirar.join(', '))}</small></div>` : '';
        const adicionarHtml = item.adicionar && item.adicionar.length ? `<div class="pedido-item-note"><small>Adicionar: ${escapeHtml(item.adicionar.join(', '))}</small></div>` : '';
        const obsHtml = item.observacao ? ` — <small style="color:#718096;">Obs: ${escapeHtml(item.observacao)}</small>` : '';
        return `<div class="pedido-item">
            <div class="pedido-item-info">
                <div class="pedido-item-name">${item.nome}${obsHtml}</div>
                ${retirarHtml}
                ${adicionarHtml}
                <div class="pedido-item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
            </div>
            <div class="pedido-item-controls">
                <button class="qty-btn" onclick="decreaseQuantity('${item.uid}')">-</button>
                <span class="qty-display">${item.quantidade}</span>
                <button class="qty-btn" onclick="increaseQuantity('${item.uid}')">+</button>
                <button class="remove-btn" onclick="removeFromPedido('${item.uid}')">×</button>
            </div>
        </div>`;
    }).join('');
    
    const total = pedidoAtual.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
    if (totalElement) totalElement.textContent = total.toFixed(2).replace('.', ',');
}

// -----------------------------
// Garantir UIDs nos itens antigos
// -----------------------------
function ensureUidsOnPedido() {
    for (let item of pedidoAtual) {
        if (!item.uid) {
            item.uid = generateUid();
        }
    }
}

// -----------------------------
// Aumentar / Diminuir quantidade / Remover
// -----------------------------
function increaseQuantity(identifier) {
    let item = pedidoAtual.find(p => p.uid === identifier);
    if (!item) item = pedidoAtual.find(p => p.id == identifier);
    if (item) {
        item.quantidade++;
        renderPedido();
    }
}

function decreaseQuantity(identifier) {
    let item = pedidoAtual.find(p => p.uid === identifier);
    if (!item) item = pedidoAtual.find(p => p.id == identifier);
    if (item && item.quantidade > 1) {
        item.quantidade--;
        renderPedido();
    }
}

function removeFromPedido(identifier) {
    const byUid = pedidoAtual.some(p => p.uid === identifier);
    if (byUid) {
        pedidoAtual = pedidoAtual.filter(p => p.uid !== identifier);
    } else {
        pedidoAtual = pedidoAtual.filter(p => p.id != identifier);
    }
    renderPedido();
}

// -----------------------------
// Limpar pedido
// -----------------------------
function clearPedido() {
    pedidoAtual = [];
    const obsEl = document.getElementById('observacoes');
    if (obsEl) obsEl.value = '';
    renderPedido();
}

// -----------------------------
// Enviar pedido (sem alteração na estrutura do backend)
// -----------------------------
async function enviarPedido() {
    if (!mesaSelecionada) {
        showError('Selecione uma mesa primeiro.');
        return;
    }
    
    if (pedidoAtual.length === 0) {
        showError('Adicione pelo menos um item ao pedido.');
        return;
    }
    
    const observacoes = document.getElementById('observacoes') ? document.getElementById('observacoes').value.trim() : '';
    
    const pedidoData = {
        mesa: mesaSelecionada,
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
        
        clearPedido();
        
    } catch (error) {
        console.error('Erro ao enviar pedido:', error);
        showLoading(false);
        showError('Erro ao enviar pedido. Tente novamente.');
    }
}

// -----------------------------
// Helpers para UI (loading / modais / escape)
// -----------------------------
function showLoading(show) {
    const el = document.getElementById('loadingOverlay');
    if (el) el.style.display = show ? 'flex' : 'none';
}

function showSuccess() {
    const el = document.getElementById('successModal');
    if (el) el.style.display = 'flex';
}

function showError(message) {
    const errEl = document.getElementById('errorMessage');
    if (errEl) errEl.textContent = message;
    const el = document.getElementById('errorModal');
    if (el) el.style.display = 'flex';
}

function closeModal() {
    const success = document.getElementById('successModal');
    const error = document.getElementById('errorModal');
    if (success) success.style.display = 'none';
    if (error) error.style.display = 'none';
}

// prevenir zoom iOS (mantido)
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

// -----------------------------
// Pequena função para escapar HTML (segurança básica)
// -----------------------------
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}

// escape para usar dentro de attribute JS (simples)
function escapeJs(text) {
    if (text === undefined || text === null) return '';
    return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}
