const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho do banco
const dbPath = path.resolve(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Erro ao conectar ao banco SQLite:', err.message);
  else console.log('✅ Conectado ao banco SQLite:', dbPath);
});

// Criação automática das tabelas principais
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      categoria_id INTEGER,
      ingredientes TEXT,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mesa INTEGER NOT NULL,
      observacoes TEXT,
      status TEXT DEFAULT 'pendente',
      criado_em TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS itens_pedido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      quantidade INTEGER DEFAULT 1,
      observacao TEXT,
      adicionar TEXT,
      retirar TEXT,
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    )
  `);
});

// =======================
// Funções de consulta
// =======================
function getItens() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT i.id, i.nome, i.preco, i.ingredientes, c.nome AS categoria
       FROM itens i
       LEFT JOIN categorias c ON i.categoria_id = c.id
       ORDER BY c.nome, i.nome`,
      [],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

function getItemPorId(id) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT i.id, i.nome, i.preco, i.ingredientes, c.nome AS categoria
       FROM itens i
       LEFT JOIN categorias c ON i.categoria_id = c.id
       WHERE i.id = ?`,
      [id],
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
}

function getItensPorCategoria(categoria) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT i.id, i.nome, i.preco, i.ingredientes, c.nome AS categoria
       FROM itens i
       LEFT JOIN categorias c ON i.categoria_id = c.id
       WHERE c.nome = ?
       ORDER BY i.nome`,
      [categoria],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
}

module.exports = { db, getItens, getItemPorId, getItensPorCategoria };
