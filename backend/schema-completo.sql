/* =========================================================
   SCHEMA COMPLETO DO SISTEMA DE RESTAURANTE
   =========================================================
   - Mantém compatibilidade com sistemas existentes
   - Inclui cardápios distintos (Semana/FDS)
   - Suporte a variantes (ex: Molhos)
   - Campos de ordenação e controle de visibilidade
   ========================================================= */

/* ---------------------------
   Tabela: categorias
   --------------------------- */
CREATE TABLE IF NOT EXISTS categorias (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL UNIQUE,
  icone       TEXT,
  criado_em   TEXT DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_categorias_nome ON categorias (nome);


/* ---------------------------
   Tabela: itens
   --------------------------- */
CREATE TABLE IF NOT EXISTS itens (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL UNIQUE,
  categoria_id  INTEGER NOT NULL,
  ingredientes  TEXT,
  descricao     TEXT,
  imagem        TEXT,
  ordem         INTEGER DEFAULT 999,
  ativo         INTEGER DEFAULT 1 CHECK (ativo IN (0,1)),
  criado_em     TEXT DEFAULT (datetime('now', 'localtime')),
  atualizado_em TEXT,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_itens_categoria_id ON itens (categoria_id);


/* ---------------------------
   Tabela: cardapios
   --------------------------- */
CREATE TABLE IF NOT EXISTS cardapios (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT NOT NULL UNIQUE,   -- Ex: Semana, FDS
  slug         TEXT NOT NULL UNIQUE,   -- Ex: semana, fds
  dias_validos TEXT,                   -- Ex: '1,2,3,4,5' ou '6,0'
  ativo        INTEGER DEFAULT 1 CHECK (ativo IN (0,1)),
  criado_em    TEXT DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_cardapios_nome ON cardapios (nome);


/* ---------------------------
   Tabela: itens_cardapio
   --------------------------- */
CREATE TABLE IF NOT EXISTS itens_cardapio (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  cardapio_id  INTEGER NOT NULL,
  item_id      INTEGER NOT NULL,
  preco        REAL NOT NULL CHECK (preco >= 0),
  ordem        INTEGER DEFAULT 999,
  ativo        INTEGER DEFAULT 1 CHECK (ativo IN (0,1)),
  criado_em    TEXT DEFAULT (datetime('now', 'localtime')),
  UNIQUE (cardapio_id, item_id),
  FOREIGN KEY (cardapio_id) REFERENCES cardapios(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES itens(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_itens_cardapio_cardapio ON itens_cardapio (cardapio_id);
CREATE INDEX IF NOT EXISTS idx_itens_cardapio_item ON itens_cardapio (item_id);


/* ---------------------------
   Tabela: variantes (ex: Molho)
   --------------------------- */
CREATE TABLE IF NOT EXISTS variantes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT NOT NULL UNIQUE,   -- Ex: Molho
  obrigatoria  INTEGER DEFAULT 0 CHECK (obrigatoria IN (0,1)),
  criado_em    TEXT DEFAULT (datetime('now', 'localtime'))
);


/* ---------------------------
   Tabela: variantes_opcoes (ex: Sugo, Bolonhesa, Branco)
   --------------------------- */
CREATE TABLE IF NOT EXISTS variantes_opcoes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  variante_id  INTEGER NOT NULL,
  nome         TEXT NOT NULL,
  ordem        INTEGER DEFAULT 999,
  ativo        INTEGER DEFAULT 1 CHECK (ativo IN (0,1)),
  FOREIGN KEY (variante_id) REFERENCES variantes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_variante_opcao_variante_id ON variantes_opcoes (variante_id);


/* ---------------------------
   Tabela: pedidos
   --------------------------- */
CREATE TABLE IF NOT EXISTS pedidos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  mesa          INTEGER NOT NULL,
  observacoes   TEXT,
  status        TEXT CHECK(status IN ('pendente', 'em preparo', 'pronto', 'entregue', 'cancelado'))
                DEFAULT 'pendente',
  criado_em     TEXT DEFAULT (datetime('now', 'localtime')),
  atualizado_em TEXT
);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos (status);


/* ---------------------------
   Tabela: itens_pedido
   --------------------------- */
CREATE TABLE IF NOT EXISTS itens_pedido (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id    INTEGER NOT NULL,
  nome         TEXT NOT NULL,
  preco        REAL NOT NULL CHECK (preco >= 0),
  quantidade   INTEGER DEFAULT 1 CHECK (quantidade > 0),
  observacao   TEXT,
  adicionar    TEXT, -- JSON
  retirar      TEXT, -- JSON
  impresso     INTEGER DEFAULT 0 CHECK (impresso IN (0,1)),
  criado_em    TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido (pedido_id);

