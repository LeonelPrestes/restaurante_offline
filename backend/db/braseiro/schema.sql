/* =========================================================
   SCHEMA COMPLETO DO SISTEMA DE RESTAURANTE — ATUALIZADO
   ========================================================= */

CREATE TABLE IF NOT EXISTS categorias (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL UNIQUE,
  icone       TEXT,
  criado_em   TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS itens (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  nome                TEXT NOT NULL UNIQUE,
  categoria_id        INTEGER NOT NULL,
  ingredientes        TEXT,
  descricao           TEXT,
  imagem              TEXT,
  ordem               INTEGER DEFAULT 999,
  ativo               INTEGER DEFAULT 1 CHECK (ativo IN (0,1)),
  aceita_meia_porcao  INTEGER DEFAULT 0 CHECK (aceita_meia_porcao IN (0,1)),
  criado_em           TEXT DEFAULT (datetime('now', 'localtime')),
  atualizado_em       TEXT,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cardapios (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT NOT NULL UNIQUE,
  slug         TEXT NOT NULL UNIQUE,
  dias_validos TEXT,
  ativo        INTEGER DEFAULT 1 CHECK (ativo IN (0,1)),
  criado_em    TEXT DEFAULT (datetime('now', 'localtime'))
);

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

CREATE TABLE IF NOT EXISTS variantes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT NOT NULL UNIQUE,
  obrigatoria  INTEGER DEFAULT 0 CHECK (obrigatoria IN (0,1)),
  criado_em    TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS variantes_opcoes (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  variante_id  INTEGER NOT NULL,
  nome         TEXT NOT NULL,
  ordem        INTEGER DEFAULT 999,
  ativo        INTEGER DEFAULT 1 CHECK (ativo IN (0,1)),
  FOREIGN KEY (variante_id) REFERENCES variantes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pedidos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  mesa          INTEGER NOT NULL,
  observacoes   TEXT,
  status        TEXT CHECK(status IN ('pendente', 'em preparo', 'pronto', 'entregue', 'cancelado')) DEFAULT 'pendente',
  criado_em     TEXT DEFAULT (datetime('now', 'localtime')),
  atualizado_em TEXT
);

CREATE TABLE IF NOT EXISTS itens_pedido (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id    INTEGER NOT NULL,
  nome         TEXT NOT NULL,
  preco        REAL NOT NULL CHECK (preco >= 0),
  quantidade   INTEGER DEFAULT 1 CHECK (quantidade > 0),
  observacao   TEXT,
  adicionar    TEXT,
  retirar      TEXT,
  meia         INTEGER DEFAULT 0 CHECK (meia IN (0,1)),
  impresso     INTEGER DEFAULT 0 CHECK (impresso IN (0,1)),
  criado_em    TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);

