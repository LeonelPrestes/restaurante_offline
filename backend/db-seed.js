/**
 * =========================================================
 * SCRIPT DE CRIACAO E POPULACAO DO BANCO (backend/db.sqlite)
 * =========================================================
 * - Cria o arquivo db.sqlite se nao existir
 * - Cria tabelas e indices (schema completo) se nao existirem
 * - Insere categorias e itens somente se faltarem (idempotente)
 * - Categoria "Executivos" substituida por "Pratos"
 * - Todos os nomes sem acentos e sem emojis
 * =========================================================
 */

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Caminho do banco (este script deve rodar de dentro de /backend)
const DB_PATH = path.resolve(__dirname, 'db.sqlite');

// Abre/cria o banco
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao abrir/criar o banco:', err.message);
  } else {
    console.log('✅ Conectado ao SQLite:', DB_PATH);
  }
});

// ===========================
// SCHEMA COMPLETO (SQL PURO)
// ===========================
const schemaSQL = `
-- =========================================================
-- SCHEMA COMPLETO DO SISTEMA DE RESTAURANTE
-- =========================================================
-- Tabelas: categorias, itens, pedidos, itens_pedido
-- Indices: para performance em buscas comuns
-- =========================================================

-- ---------------------------
-- Tabela: categorias
-- ---------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL UNIQUE,
  icone     TEXT,
  criado_em TEXT DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_categorias_nome ON categorias (nome);

-- ---------------------------
-- Tabela: itens
-- ---------------------------
CREATE TABLE IF NOT EXISTS itens (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL,
  preco         REAL NOT NULL CHECK(preco >= 0),
  categoria_id  INTEGER NOT NULL,
  ingredientes  TEXT,
  descricao     TEXT,
  imagem        TEXT,
  criado_em     TEXT DEFAULT (datetime('now', 'localtime')),
  atualizado_em TEXT,
  FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_itens_categoria_id ON itens (categoria_id);

-- ---------------------------
-- Tabela: pedidos
-- ---------------------------
CREATE TABLE IF NOT EXISTS pedidos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  mesa        INTEGER NOT NULL,
  observacoes TEXT,
  status      TEXT CHECK(status IN ('pendente', 'em preparo', 'pronto', 'entregue', 'cancelado'))
                DEFAULT 'pendente',
  criado_em   TEXT DEFAULT (datetime('now', 'localtime')),
  atualizado_em TEXT
);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos (status);

-- ---------------------------
-- Tabela: itens_pedido
-- ---------------------------
CREATE TABLE IF NOT EXISTS itens_pedido (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id  INTEGER NOT NULL,
  nome       TEXT NOT NULL,
  preco      REAL NOT NULL CHECK(preco >= 0),
  quantidade INTEGER DEFAULT 1 CHECK(quantidade > 0),
  observacao TEXT,
  adicionar  TEXT,
  retirar    TEXT,
  impresso   INTEGER DEFAULT 0 CHECK(impresso IN (0,1)),
  criado_em  TEXT DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id ON itens_pedido (pedido_id);
`;

// ======================================
// HELPERS (promises para usar async/await)
// ======================================
function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// Busca categoria_id pelo nome
async function getCategoriaIdByNome(nome) {
  const row = await get(`SELECT id FROM categorias WHERE nome = ?`, [nome]);
  return row ? row.id : null;
}

// Insere categoria se nao existir (usa UNIQUE em categorias.nome)
async function ensureCategoria(nome, icone = null) {
  await run(
    `INSERT OR IGNORE INTO categorias (nome, icone) VALUES (?, ?)`,
    [nome, icone]
  );
}

// Insere item se nao existir (confere por nome; nao alteramos o schema para manter compatibilidade)
async function ensureItem({ nome, preco, categoriaNome, ingredientes = [] }) {
  const existing = await get(`SELECT id FROM itens WHERE nome = ?`, [nome]);
  if (existing) return; // ja existe

  const categoriaId = await getCategoriaIdByNome(categoriaNome);
  if (!categoriaId) {
    throw new Error(`Categoria nao encontrada: ${categoriaNome}`);
  }

  await run(
    `INSERT INTO itens (nome, preco, categoria_id, ingredientes)
     VALUES (?, ?, ?, ?)`,
    [nome, preco, categoriaId, JSON.stringify(ingredientes)]
  );
}

// ========================
// DADOS (SEM ACENTOS)
// ========================

// Categorias (sem emojis e sem acentos)
const CATEGORIAS = [
  { nome: 'Pratos', icone: null },
  { nome: 'Massas', icone: null },
  { nome: 'Petiscos', icone: null },
  { nome: 'Adicionais', icone: null },
  { nome: 'Bebidas', icone: null },
  { nome: 'Sobremesas', icone: null },
];

// Base de ingredientes dos "Pratos" (ex-Executivos), sem acentos
const BASE_PRATO = ['Arroz', 'Feijao', 'Fritas', 'Salada', 'Cebola', 'Tomate', 'Alface'];

// Itens: PRATOS (antes "Executivos")
const PRATOS = [
  { nome: 'Prato do Dia', preco: 22.90 },
  { nome: 'Frango Grelhado', preco: 24.90 },
  { nome: 'Frango a Milanesa', preco: 26.90 },
  { nome: 'Frango a Parmegiana', preco: 28.90 },
  { nome: 'Porco Grelhado', preco: 25.90 },
  { nome: 'Boi Grelhado', preco: 31.90 },
  { nome: 'Boi a Milanesa', preco: 33.90 },
  { nome: 'Boi a Parmegiana', preco: 35.90 },
  { nome: 'Tilapia Grelhada', preco: 31.90 },
  { nome: 'Bife de Figado', preco: 24.90 },
];

// Itens: MASSAS
const MASSAS_TIPOS = ['Penne', 'Talharim', 'Espaguete'];

// Itens: PETISCOS (LISTA ATUALIZADA PELO USUARIO)
const PETISCOS = [
  { nome: 'Torresmo Tira 100g', preco: 8.00 },
  { nome: 'Bolinho de Bacalhau (12 unidades)', preco: 39.00 },
  { nome: 'Bolinho de Bacalhau Meia (6 unidades)', preco: 23.40 },
  { nome: 'Camarao Empanado (12 unidades)', preco: 39.00 },
  { nome: 'Camarao Empanado Meia (6 unidades)', preco: 23.40 },
  { nome: 'Contra File com Fritas', preco: 49.00 },
  { nome: 'Contra File com Fritas Meia', preco: 29.40 },
  { nome: 'Fritas Porcao', preco: 28.00 },
  { nome: 'Fritas Porcao Meia', preco: 16.80 },
  { nome: 'Fritas com Linguica', preco: 34.00 },
  { nome: 'Fritas com Linguica Meia', preco: 20.40 },
  { nome: 'Figado com Jilo', preco: 32.00 },
  { nome: 'Figado com Jilo Meia', preco: 19.20 },
  { nome: 'Moelinha', preco: 34.00 },
  { nome: 'Moelinha Meia', preco: 20.40 },
  { nome: 'Lingua de Boi ao Molho de Vinho', preco: 32.00 },
  { nome: 'Lingua de Boi ao Molho de Vinho Meia', preco: 19.20 },
  { nome: 'Isca de Tilapia', preco: 49.00 },
  { nome: 'Isca de Tilapia Meia', preco: 29.40 },
  { nome: 'Pastel Queijo (12 unidades)', preco: 24.00 },
  { nome: 'Pastel Queijo Meia (6 unidades)', preco: 14.40 },
  { nome: 'Camarao Alho e Oleo', preco: 39.00 },
  { nome: 'Camarao Alho e Oleo Meia', preco: 23.40 },
  { nome: 'Provolone na Pedra', preco: 31.00 },
  { nome: 'Provolone na Pedra Meia', preco: 18.60 },
  { nome: 'Feijao Amigo Pequeno', preco: 6.00 },
];

// Itens: ADICIONAIS
const ADICIONAIS = [
  { nome: 'Ovo Frito', preco: 3.00, ingredientes: ['Ovo'] },
  { nome: 'Omelete Simples (2 ovos)', preco: 12.00, ingredientes: ['Ovo'] },
  { nome: 'Omelete (Queijo, cebola, tomate, 3 ovos)', preco: 15.00, ingredientes: ['Ovo', 'Queijo', 'Cebola', 'Tomate'] },
  { nome: 'Fritas (120g)', preco: 10.00, ingredientes: ['Batata', 'Oleo'] },
];

// ==================================
// EXECUCAO PRINCIPAL (async/await)
// ==================================
(async () => {
  try {
    console.log('🧱 Aplicando schema (criando tabelas/indices se necessario)...');
    await exec(schemaSQL);
    console.log('✅ Schema aplicado.');

    console.log('📂 Garantindo categorias...');
    for (const c of CATEGORIAS) {
      await ensureCategoria(c.nome, c.icone);
    }
    console.log('✅ Categorias OK.');

    console.log('🍽  Inserindo itens da categoria "Pratos"...');
    for (const p of PRATOS) {
      await ensureItem({
        nome: p.nome,
        preco: p.preco,
        categoriaNome: 'Pratos',
        ingredientes: BASE_PRATO,
      });
    }
    console.log('✅ Pratos OK.');

    console.log('🍝  Inserindo itens da categoria "Massas"...');
    for (const tipo of MASSAS_TIPOS) {
      await ensureItem({
        nome: `${tipo} Bolonhesa`,
        preco: 24.90,
        categoriaNome: 'Massas',
        ingredientes: ['Massa', 'Molho Bolonhesa'],
      });
      await ensureItem({
        nome: `${tipo} Ao Sugo`,
        preco: 24.90,
        categoriaNome: 'Massas',
        ingredientes: ['Massa', 'Molho ao Sugo'],
      });
    }
    console.log('✅ Massas OK.');

    console.log('🍢  Inserindo itens da categoria "Petiscos"...');
    for (const p of PETISCOS) {
      await ensureItem({
        nome: p.nome,
        preco: p.preco,
        categoriaNome: 'Petiscos',
        ingredientes: [],
      });
    }
    console.log('✅ Petiscos OK.');

    console.log('➕  Inserindo itens da categoria "Adicionais"...');
    for (const a of ADICIONAIS) {
      await ensureItem({
        nome: a.nome,
        preco: a.preco,
        categoriaNome: 'Adicionais',
        ingredientes: a.ingredientes || [],
      });
    }
    console.log('✅ Adicionais OK.');

    // As categorias "Bebidas" e "Sobremesas" estao criadas, mesmo sem itens iniciais
    console.log('🥤  Categoria "Bebidas" criada (sem itens iniciais).');
    console.log('🍰  Categoria "Sobremesas" criada (sem itens iniciais).');

    console.log('\n🎉 Banco de dados criado/atualizado com sucesso e populado sem duplicar!');
  } catch (err) {
    console.error('❌ Erro durante inicializacao do banco:', err.message);
  } finally {
    db.close(() => {
      console.log('🔒 Conexao com o banco encerrada.');
    });
  }
})();
