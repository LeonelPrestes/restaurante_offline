// Estado da aplicação
let socket;
let mesaSelecionada = null;
let menuItems = [];
let pedidoAtual = []; // itens terão: uid, id, nome, preco, quantidade, observacao, adicionar[], retirar[]
let categoriaAtiva = 'PRATOS EXECUTIVOS';  // categoria inicial

// extras globais e customização temporária por item
let extrasGlobal = []; // array de strings (ovo, omelete, bifes, etc)
const currentCustomizationByItem = {}; // { [itemId]: { adicionar:[], retirar:[], observacao:'' } }

// uid temporário usado para diferenciar linhas com mesma id mas observações diferentes
function generateUid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Inicialização
document.addEventListener('DOMContentLoaded', function () {
    initializeSocket();
    loadMenuItems();
    setupEventListeners();
});

// -----------------------------
// Socket.IO (sem alteração)
// -----------------------------    
function initializeSocket() {
    socket = io();

    socket.on('connect', function () {
        updateConnectionStatus(true);
        console.log('Conectado ao servidor');
    });

    socket.on('disconnect', function () {
        updateConnectionStatus(false);
        console.log('Desconectado do servidor');
    });

    socket.on('novo_pedido', function (pedido) {
        console.log('Novo pedido recebido:', pedido);
    });

    socket.on('pedido_atualizado', function (pedido) {
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
        btn.addEventListener('click', function () {
            selectMesa(this.dataset.mesa);
        });
    });

    const modal = document.getElementById('modalObservacao');
    if (modal) {
        const btnCancelar = document.getElementById('btnCancelarObs');
        const btnAdicionar = document.getElementById('btnAdicionarObs');
        const textarea = document.getElementById('textoObservacao');

        // Cancelar modal
        if (btnCancelar) btnCancelar.addEventListener('click', () => {
            const itemId = modal.dataset.itemId;
            if (itemId) delete currentCustomizationByItem[itemId];
            if (textarea) textarea.value = '';
            const custArea = modal.querySelector('#customizationArea');
            if (custArea) custArea.innerHTML = '';
            modal.style.display = 'none';
            modal.dataset.itemId = '';
        });

        // ✅ Adicionar item ao pedido
        if (btnAdicionar) btnAdicionar.addEventListener('click', () => {
            const itemId = parseInt(modal.dataset.itemId);
            const observacao = textarea ? textarea.value.trim() : '';

            if (!itemId) {
                console.warn('⚠️ Nenhum item selecionado no modal.');
                return;
            }

            // 🔍 Busca o grupo e o item
            let item = null, grupoDoItem = null;
            for (const grupo of menuItems) {
                const encontrado = grupo.itens.find(i => i.id === itemId);
                if (encontrado) {
                    item = encontrado;
                    grupoDoItem = grupo;
                    break;
                }
            }
            if (!item) return console.warn(`⚠️ Item ID ${itemId} não encontrado.`);

            const customization = currentCustomizationByItem[itemId] || {};
            customization.observacao = observacao;

            // 🚨 MASSAS: obrigar escolha de molho
            if (grupoDoItem && (grupoDoItem.categoria === 'MASSAS' || grupoDoItem.categoria === 'MASSAS FDS')) {
                if (!customization.molho) {
                    alert('Por favor, selecione um molho antes de adicionar o prato.');
                    return;
                }
                // adiciona o molho na observação pra aparecer na impressão
                customization.observacao = (observacao ? observacao + ' | ' : '') + `MOLHO: ${customization.molho}`;
            }

            // ✅ Adiciona ao pedido
            addToPedidoWithCustomization(
                item.id,
                customization.observacao,
                customization.adicionar || [],
                customization.retirar || []
            );

            // 🔄 Fecha e limpa modal
            delete currentCustomizationByItem[itemId];
            if (textarea) textarea.value = '';
            const custArea = modal.querySelector('#customizationArea');
            if (custArea) custArea.innerHTML = '';
            modal.style.display = 'none';
            modal.dataset.itemId = '';
            renderPedido();
        });
    }


    // Fechar modal clicando fora
    document.addEventListener('click', function (e) {
        if (e.target.classList && e.target.classList.contains('modal')) {
            modal.dataset.itemId = '';
            modal.style.display = 'none';
            const custArea = modal.querySelector('#customizationArea');
            if (custArea) custArea.innerHTML = '';
            if (textarea) textarea.value = '';
        }
    });
}

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

    // 🧭 Rola suavemente até o cardápio
    if (menuSection) {
        const headerOffset = 100;
        const elementPosition = menuSection.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }

    // 🥘 Define automaticamente a categoria "PRATOS EXECUTIVOS"
    categoriaAtiva = 'PRATOS EXECUTIVOS';
    renderMenuCategories();
    renderMenuItems();
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

}

// -----------------------------
// Menu: carregar e renderizar (com cardápio dinâmico)
// -----------------------------
async function loadMenuItems() {
    try {
        // 🔍 1. Detecta qual cardápio está ativo
        const cardapioRes = await fetch('/api/cardapio/atual');
        const cardapioInfo = await cardapioRes.json();
        const cardapioSlug = cardapioInfo.cardapio?.toLowerCase() || 'fds';
        console.log('🧭 Cardápio ativo:', cardapioSlug);

        // 🥘 2. Carrega o menu correspondente
        const response = await fetch(`/api/menu?cardapio=${cardapioSlug}`);
        if (!response.ok) throw new Error('Erro ao carregar menu');

        menuItems = await response.json();

        if (!Array.isArray(menuItems) || menuItems.length === 0) {
            console.warn('⚠️ Nenhum item retornado do cardápio');
        }

        // 3. Constrói extras e renderiza categorias
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
    const baseExtras = [...menuItems.filter(g => g.categoria === 'ADICIONAIS').flatMap(g => g.itens.map(i => i.nome))];
    extrasGlobal = baseExtras;
}

function renderMenuCategories() {
    const categoriesContainer = document.getElementById("menuCategories");
    if (!categoriesContainer) return;

    // Agora menuItems é um array de grupos
    const categories = ["Todos", ...menuItems.map(g => g.categoria)];

    categoriesContainer.innerHTML = categories
        .map(category => `
      <button class="category-btn ${category === categoriaAtiva ? 'active' : ''}" 
              onclick="selectCategory('${category}')">${category}</button>
    `)
        .join("");
}


function selectCategory(category) {
    categoriaAtiva = category;
    renderMenuCategories();
    renderMenuItems();
}

function renderMenuItems() {
    const itemsContainer = document.getElementById("menuItems");
    if (!itemsContainer) return;

    // Filtra as categorias conforme o botão ativo
    let gruposFiltrados = [];
    if (categoriaAtiva === "Todos") {
        gruposFiltrados = menuItems;
    } else {
        gruposFiltrados = menuItems.filter(g => g.categoria === categoriaAtiva);
    }

    // Renderiza
    itemsContainer.innerHTML = gruposFiltrados
        .map(grupo => `
      <div class="menu-category-group">
        <h3 class="category-title">${grupo.categoria}</h3>
        <div class="menu-category-items">
          ${grupo.itens.map(item => `
            <div class="menu-item" onclick="openItemModal(${item.id})">
              <div class="menu-item-name">${item.nome}</div>
              <div class="menu-item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</div>
            </div>
          `).join("")}
        </div>
      </div>
    `).join("");
}


function openItemModal(itemId) {
    const modal = document.getElementById('modalObservacao');
    modal.querySelectorAll('.option-btn.option-selected')
        .forEach(btn => btn.classList.remove('option-selected'));
    const textarea = document.getElementById('textoObservacao');

    // 🔍 Procura o item e o grupo (categoria)
    let item = null;
    let grupoDoItem = null;
    for (const grupo of menuItems) {
        const encontrado = grupo.itens.find(i => i.id === itemId);
        if (encontrado) {
            item = encontrado;
            grupoDoItem = grupo;
            break;
        }
    }

    if (!item) {
        console.warn(`Item ID ${itemId} não encontrado no cardápio.`);
        return;
    }

    // 🔄 Inicializa estado
    currentCustomizationByItem[itemId] = {
        adicionar: [],
        retirar: [],
        observacao: '',
        meia_porção: item.preco_meia || null,
        precoAtual: item.preco
    };

    modal.style.display = 'flex';
    modal.dataset.itemId = String(itemId);

    // 🧹 Cria/limpa área de customização
    let custArea = modal.querySelector('#customizationArea');
    if (!custArea) {
        custArea = document.createElement('div');
        custArea.id = 'customizationArea';
        const modalContent = modal.querySelector('.modal-content');
        const textareaEl = modalContent.querySelector('#textoObservacao');
        modalContent.insertBefore(custArea, textareaEl);
    }

    renderCustomizationArea(item, custArea, true);

    // ==============================
    // 🧩 CASO: PETISCOS → dois botões
    // ==============================
    if (
        grupoDoItem &&
        grupoDoItem.categoria.toUpperCase().includes('PETISCOS') &&
        item.preco_meia != null
    ) {
        const porcaoDiv = document.createElement('div');
        porcaoDiv.className = 'molho-container'; // reaproveita estilo visual
        porcaoDiv.innerHTML = `
          <p style="margin-bottom:4px;font-weight:500;">Escolha o tipo de porção:</p>
          <div class="molho-buttons" style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="btn-porcao" data-tipo="INTEIRA">INTEIRA</button>
              <button class="btn-porcao" data-tipo="MEIA">MEIA</button>
          </div>
          <div style="margin-top:6px;font-weight:600;">
              <span id="precoAtual">R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
          </div>
      `;
        custArea.prepend(porcaoDiv);

        const btns = porcaoDiv.querySelectorAll('.btn-porcao');
        const precoEl = porcaoDiv.querySelector('#precoAtual');
        const cur = currentCustomizationByItem[itemId];

        // por padrão já seleciona INTEIRA
        btns[0].classList.add('ativa');
        cur.preco_meia = item.preco_meia || null;
        cur.precoAtual = item.preco;

        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('ativa'));
                btn.classList.add('ativa');
                const tipo = btn.dataset.tipo;
                cur.tipo = tipo; // 👈 armazena o tipo de porção

                if (tipo === 'MEIA' && item.preco_meia != null) {
                    cur.precoAtual = item.preco_meia;
                } else {
                    cur.precoAtual = item.preco;
                }

                precoEl.textContent = `R$ ${cur.precoAtual.toFixed(2).replace('.', ',')}`;
            });
        });
    }

    // ==============================
    // 🧩 CASO: MASSAS → seleção de molhos
    // ==============================
    if (grupoDoItem && (grupoDoItem.categoria === 'MASSAS' || grupoDoItem.categoria === 'MASSAS FDS')) {
        const molhosSemana = ['AO SUGO', 'BOLONHESA'];
        const molhosFDS = ['AO SUGO', 'BOLONHESA', 'BRANCO'];
        const molhos = (grupoDoItem.categoria === 'MASSAS FDS') ? molhosFDS : molhosSemana;

        const molhoDiv = document.createElement('div');
        molhoDiv.className = 'molho-container';
        molhoDiv.innerHTML = `
          <p style="margin-bottom:4px;font-weight:500;">Escolha o molho:</p>
          <div class="molho-buttons" style="display:flex;gap:6px;flex-wrap:wrap;">
              ${molhos.map(m => `
                  <button class="btn-molho" data-molho="${m}">${m}</button>
              `).join('')}
          </div>
      `;
        custArea.prepend(molhoDiv);

        const molhoBtns = molhoDiv.querySelectorAll('.btn-molho');
        molhoBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const cur = currentCustomizationByItem[itemId];
                cur.molho = btn.dataset.molho;
                molhoBtns.forEach(b => b.classList.remove('ativa'));
                btn.classList.add('ativa');
            });
        });
    }

    if (textarea) textarea.value = '';
}


// renderiza a UI interna do modal para customização
function renderCustomizationArea(item, container, showAlready = false) {
    const itemId = item.id;
    const retirarOptions = Array.isArray(item.ingredientes) && item.ingredientes.length
        ? item.ingredientes
        : ['Cebola', 'Salada', 'Tomate', 'Alface', 'Feijao', 'Arroz']; // fallback simples

    const adicionarOptions = extrasGlobal.slice();
    const cur = currentCustomizationByItem[itemId] || { adicionar: [], retirar: [], observacao: '' };

    // ✅ Mostra apenas como referência o que já está no pedido (sem aplicar)
    const jaNoPedidoAdicionar = Array.from(new Set(pedidoAtual
        .filter(p => p.id === itemId)
        .flatMap(p => p.adicionar || [])));
    const jaNoPedidoRetirar = Array.from(new Set(pedidoAtual
        .filter(p => p.id === itemId)
        .flatMap(p => p.retirar || [])));

    // 🧱 Monta o HTML
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="accordion-btn" type="button" data-acc="retirar" style="width:100%;">Retirar ingredientes ▾</button>
        <div class="accordion-content" data-acc="retirar" style="display:none;">
          <div class="options-grid" data-acc="retirar-options">
            ${retirarOptions.map(opt => `<button class="option-btn" data-type="retirar" data-opt="${escapeHtml(opt)}" onclick="toggleCustomizationOption(${itemId}, 'retirar', '${escapeJs(opt)}')">${escapeHtml(opt)}</button>`).join('')}
          </div>

        </div>

        <button class="accordion-btn" type="button" data-acc="adicionar" style="width:100%;">Adicionar extras ▾</button>
        <div class="accordion-content" data-acc="adicionar" style="display:none;">
          <div class="options-grid" data-acc="adicionar-options">
            ${adicionarOptions.map(opt => `<button class="option-btn" data-type="adicionar" data-opt="${escapeHtml(opt)}" onclick="toggleCustomizationOption(${itemId}, 'adicionar', '${escapeJs(opt)}')">${escapeHtml(opt)}</button>`).join('')}
          </div>
        </div>
      </div>
    `;

    // ⚙️ Accordions
    container.querySelectorAll('.accordion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const acc = btn.getAttribute('data-acc');
            const content = container.querySelector(`.accordion-content[data-acc="${acc}"]`);
            if (!content) return;
            const isHidden = content.style.display === 'none' || content.style.display === '';
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

function addToPedidoWithCustomization(itemId, observacao, adicionar = [], retirar = []) {
  let item = null;
  for (const grupo of menuItems) {
    const encontrado = grupo.itens.find(i => i.id === itemId);
    if (encontrado) {
      item = encontrado;
      break;
    }
  }
  if (!item) return console.warn(`⚠️ Item ID ${itemId} não encontrado em menuItems`);

  const cur = currentCustomizationByItem[itemId] || {};
  const tipo = cur.tipo || 'INTEIRA';
  const meia = tipo === 'MEIA';
  const precoFinal = (meia && item.preco_meia != null) ? item.preco_meia : item.preco;

  const norm = (arr = []) => [...new Set(arr.map(s => String(s).trim()).filter(Boolean))];
  const addNorm = norm(adicionar);
  const retNorm = norm(retirar);
  const obsNorm = (observacao || '').trim();

  // 🔍 Checa se já existe o mesmo item com mesmo tipo e observações
  const existingItem = pedidoAtual.find(p =>
    p.id === item.id &&
    p.tipo === tipo && // 👈 garante que o tipo (INTEIRA/MEIA) é considerado
    (p.observacao || '') === obsNorm &&
    arraysEqual(p.adicionar || [], addNorm) &&
    arraysEqual(p.retirar || [], retNorm)
  );

  if (existingItem) {
    existingItem.quantidade++;
  } else {
    pedidoAtual.push({
      uid: generateUid(),
      id: item.id,
      nome: item.nome,
      preco: precoFinal,
      quantidade: 1,
      observacao: obsNorm,
      adicionar: addNorm,
      retirar: retNorm,
      meia,
      tipo, // 👈 agora o tipo também é salvo (INTEIRA ou MEIA)
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
                <div class="pedido-item-name">${item.nome}${item.meia ? ' (MEIA)' : ''}${obsHtml}</div>
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

    // fecha ambos os modais
    if (success) success.style.display = 'none';
    if (error) error.style.display = 'none';

    // 🔄 se o modal fechado for o de sucesso, recarrega a página
    if (success && success.style.display === 'none' && (!error || error.style.display === 'none')) {
        setTimeout(() => {
            location.reload(); // recarrega após o usuário clicar em OK
        }, 300); // pequeno delay pra evitar piscar abrupto
    }
}

// prevenir zoom iOS (mantido)
document.addEventListener('touchstart', function (e) {
    if (e.touches.length > 1) {
        e.preventDefault();
    }
});

let lastTouchEnd = 0;
document.addEventListener('touchend', function (e) {
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
