/**
 * =========================================================
 * 🌱 SCRIPT DE POPULAÇÃO DO BANCO DE DADOS (db.sqlite)
 * =========================================================
 * Cria as tabelas do restaurante e insere o cardápio completo
 * já organizado por categorias (Cozinha, Bebidas, Sobremesas, Bar)
 * =========================================================
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.sqlite');

db.serialize(() => {
  console.log('🧱 Criando tabelas...');

  // ---------------------------------------------------------
  // CATEGORIAS
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      icone TEXT,
      criado_em TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // ---------------------------------------------------------
  // ITENS
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL CHECK(preco >= 0),
      categoria_id INTEGER NOT NULL,
      ingredientes TEXT,
      descricao TEXT,
      imagem TEXT,
      criado_em TEXT DEFAULT (datetime('now', 'localtime')),
      atualizado_em TEXT,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
    )
  `);

  // ---------------------------------------------------------
  // PEDIDOS
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mesa INTEGER NOT NULL,
      observacoes TEXT,
      status TEXT CHECK(status IN ('pendente', 'em preparo', 'pronto', 'entregue', 'cancelado'))
        DEFAULT 'pendente',
      criado_em TEXT DEFAULT (datetime('now', 'localtime')),
      atualizado_em TEXT
    )
  `);

  // ---------------------------------------------------------
  // ITENS DO PEDIDO
  // ---------------------------------------------------------
  db.run(`
    CREATE TABLE IF NOT EXISTS itens_pedido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      preco REAL NOT NULL CHECK(preco >= 0),
      quantidade INTEGER DEFAULT 1 CHECK(quantidade > 0),
      observacao TEXT,
      adicionar TEXT,
      retirar TEXT,
      impresso INTEGER DEFAULT 0 CHECK(impresso IN (0,1)),
      criado_em TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
    )
  `);

  // ---------------------------------------------------------
  // INSERE CATEGORIAS
  // ---------------------------------------------------------
  const categorias = [
    { nome: 'Executivos', icone: '🍽️' },
    { nome: 'Massas', icone: '🍝' },
    { nome: 'Petiscos', icone: '🍢' },
    { nome: 'Adicionais', icone: '➕' },
    { nome: 'Bebidas', icone: '🥤' },
    { nome: 'Sobremesas', icone: '🍰' }
  ];

  const insertCategoria = db.prepare(`
    INSERT OR IGNORE INTO categorias (nome, icone) VALUES (?, ?)
  `);
  categorias.forEach(cat => insertCategoria.run(cat.nome, cat.icone));
  insertCategoria.finalize();

  const insertItem = db.prepare(`
    INSERT INTO itens (nome, preco, categoria_id, ingredientes)
    VALUES (?, ?, (SELECT id FROM categorias WHERE nome = ?), ?)
  `);

  // ---------------------------------------------------------
  // EXECUTIVOS
  // ---------------------------------------------------------
  const executivos = [
    { nome: 'Frango Grelhado', preco: 24.90 },
    { nome: 'Frango à Milanesa', preco: 26.90 },
    { nome: 'Frango à Parmegiana', preco: 28.90 },
    { nome: 'Porco Grelhado', preco: 25.90 },
    { nome: 'Boi Grelhado', preco: 31.90 },
    { nome: 'Boi à Milanesa', preco: 33.90 },
    { nome: 'Boi à Parmegiana', preco: 35.90 },
    { nome: 'Tilápia Grelhada', preco: 31.90 },
    { nome: 'Bife de Fígado', preco: 24.90 }
  ];

  const baseExecutivo = ['Arroz', 'Feijão', 'Fritas', 'Salada', 'Cebola', 'Tomate', 'Alface'];
  executivos.forEach(item => {
    insertItem.run(item.nome, item.preco, 'Executivos', JSON.stringify(baseExecutivo));
  });

  // ---------------------------------------------------------
  // MASSAS
  // ---------------------------------------------------------
  ['Penne', 'Talharim', 'Espaguete'].forEach(tipo => {
    insertItem.run(`${tipo} Bolonhesa`, 24.90, 'Massas', JSON.stringify(['Massa', 'Molho Bolonhesa']));
    insertItem.run(`${tipo} Ao Sugo`, 24.90, 'Massas', JSON.stringify(['Massa', 'Molho ao Sugo']));
  });

  // ---------------------------------------------------------
  // PETISCOS + MEIA PORÇÃO
  // ---------------------------------------------------------
  const petiscos = [
    { nome: 'Torresmo Tira', preco: 16.00 },
    { nome: 'Bolinho de Bacalhau (12 unidades)', preco: 39.00 },
    { nome: 'Camarão Empanado (12 unidades)', preco: 39.00 },
    { nome: 'Contra Filé com Fritas', preco: 49.00 },
    { nome: 'Fritas Porção', preco: 28.00 },
    { nome: 'Fritas com Linguiça', preco: 34.00 },
    { nome: 'Fígado com Jiló', preco: 32.00 },
    { nome: 'Moelinha', preco: 34.00 },
    { nome: 'Língua de Boi ao Molho de Vinho', preco: 32.00 },
    { nome: 'Isca de Tilápia', preco: 49.00 },
    { nome: 'Pastel (queijo, 12 unidades)', preco: 24.00 },
    { nome: 'Camarão Alho e Óleo', preco: 39.00 },
    { nome: 'Provolone na Pedra', preco: 31.00 },
    { nome: 'Feijão Amigo Pequeno', preco: 6.00 }
  ];

  petiscos.forEach(p => {
    insertItem.run(p.nome, p.preco, 'Petiscos', JSON.stringify([]));
    insertItem.run(`${p.nome} - Meia`, +(p.preco * 0.6).toFixed(2), 'Petiscos', JSON.stringify([]));
  });

  // ---------------------------------------------------------
  // ADICIONAIS
  // ---------------------------------------------------------
  const adicionais = [
    { nome: 'Ovo Frito', preco: 3.00, ingredientes: ['Ovo'] },
    { nome: 'Omelete Simples (2 ovos)', preco: 12.00, ingredientes: ['Ovo'] },
    { nome: 'Omelete (Queijo, cebola, tomate, 3 ovos)', preco: 15.00, ingredientes: ['Ovo', 'Queijo', 'Cebola', 'Tomate'] },
    { nome: 'Fritas (120g)', preco: 10.00, ingredientes: ['Batata', 'Óleo'] }
  ];

  adicionais.forEach(item => {
    insertItem.run(item.nome, item.preco, 'Adicionais', JSON.stringify(item.ingredientes));
  });

  insertItem.finalize();

  console.log('✅ Banco de dados criado e populado com sucesso!');
});

db.close();
