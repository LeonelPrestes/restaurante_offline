-- =========================================================
-- 🧱 SCHEMA COMPLETO DO SISTEMA DE RESTAURANTE
-- =========================================================
-- Inclui:
--   - Categorias
--   - Itens de cardápio
--   - Pedidos e itens do pedido
-- =========================================================


-- ---------------------------------------------------------
-- Tabela: categorias
-- Armazena as categorias de produtos (Ex: Cozinha, Bebidas, Sobremesas...).
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nome        TEXT NOT NULL UNIQUE,          -- Nome da categoria
    icone       TEXT,                          -- Emoji ou nome de ícone (opcional)
    criado_em   TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_categorias_nome ON categorias (nome);


-- ---------------------------------------------------------
-- Tabela: itens
-- Armazena os itens do cardápio, vinculados a uma categoria.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS itens (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    nome            TEXT NOT NULL,                              -- Nome do prato/item
    preco           REAL NOT NULL CHECK(preco >= 0),            -- Preço do item
    categoria_id    INTEGER NOT NULL,                           -- Chave estrangeira para categoria
    ingredientes    TEXT,                                       -- JSON com ingredientes
    descricao       TEXT,                                       -- Descrição opcional
    imagem          TEXT,                                       -- Caminho ou URL da imagem
    criado_em       TEXT DEFAULT (datetime('now', 'localtime')),
    atualizado_em   TEXT,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_itens_categoria_id ON itens (categoria_id);


-- ---------------------------------------------------------
-- Tabela: pedidos
-- Armazena os pedidos feitos no restaurante.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    mesa            INTEGER NOT NULL,                          -- Número da mesa
    observacoes     TEXT,                                       -- Observações gerais do pedido
    status          TEXT CHECK(status IN ('pendente', 'em preparo', 'pronto', 'entregue', 'cancelado'))
                        DEFAULT 'pendente',                     -- Status atual do pedido
    criado_em       TEXT DEFAULT (datetime('now', 'localtime')), -- Data/hora local de criação
    atualizado_em   TEXT                                        -- Data/hora da última atualização
);

CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos (status);


-- ---------------------------------------------------------
-- Tabela: itens_pedido
-- Armazena os itens que compõem cada pedido.
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS itens_pedido (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id       INTEGER NOT NULL,                           -- ID do pedido (chave estrangeira)
    nome            TEXT NOT NULL,                              -- Nome do item pedido
    preco           REAL NOT NULL CHECK(preco >= 0),            -- Preço unitário
    quantidade      INTEGER DEFAULT 1 CHECK(quantidade > 0),    -- Quantidade pedida
    observacao      TEXT,                                       -- Observação específica do item
    adicionar       TEXT,                                       -- JSON com ingredientes adicionais
    retirar         TEXT,                                       -- JSON com ingredientes removidos
    impresso        INTEGER DEFAULT 0 CHECK(impresso IN (0,1)), -- Controle de impressão (0=não, 1=sim)
    criado_em       TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido (pedido_id);
