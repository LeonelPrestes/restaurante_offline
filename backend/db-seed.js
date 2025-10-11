/**
 * =========================================================
 * SCRIPT DE POPULAÇÃO DO BANCO (backend/db-seed.js)
 * =========================================================
 * - Cria os cardápios "Semana" e "FDS"
 * - Popula categorias, itens, variantes e preços específicos
 * - Mantém idempotência (não duplica dados)
 * =========================================================
 */

const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const DB_PATH = path.resolve(__dirname, "db.sqlite");
const db = new sqlite3.Database(DB_PATH);

console.log("🌱 Iniciando seed do banco de dados...");

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

async function ensureCategoria(nome) {
  await run(`INSERT OR IGNORE INTO categorias (nome) VALUES (?)`, [nome]);
  const row = await get(`SELECT id FROM categorias WHERE nome = ?`, [nome]);
  return row?.id;
}

async function ensureCardapio(nome, slug, dias_validos) {
  await run(
    `INSERT OR IGNORE INTO cardapios (nome, slug, dias_validos) VALUES (?, ?, ?)`,
    [nome, slug, dias_validos]
  );
  const row = await get(`SELECT id FROM cardapios WHERE slug = ?`, [slug]);
  return row?.id;
}

async function ensureItem({ nome, categoria_id, ingredientes, descricao }) {
  await run(
    `INSERT OR IGNORE INTO itens (nome, categoria_id, ingredientes, descricao) VALUES (?, ?, ?, ?)`,
    [nome, categoria_id, JSON.stringify(ingredientes || []), descricao || ""]
  );
  const row = await get(`SELECT id FROM itens WHERE nome = ?`, [nome]);
  return row?.id;
}

async function ensureItemCardapio({
  cardapio_id,
  item_id,
  preco,
  ordem,
  ativo = 1,
}) {
  await run(
    `INSERT OR IGNORE INTO itens_cardapio (cardapio_id, item_id, preco, ordem, ativo)
     VALUES (?, ?, ?, ?, ?)`,
    [cardapio_id, item_id, preco, ordem, ativo]
  );
}

async function ensureVariante(nome, obrigatoria = 0) {
  await run(
    `INSERT OR IGNORE INTO variantes (nome, obrigatoria) VALUES (?, ?)`,
    [nome, obrigatoria]
  );
  const row = await get(`SELECT id FROM variantes WHERE nome = ?`, [nome]);
  return row?.id;
}

async function ensureVarianteOpcao(variante_id, nome, ordem) {
  await run(
    `INSERT OR IGNORE INTO variantes_opcoes (variante_id, nome, ordem)
     VALUES (?, ?, ?)`,
    [variante_id, nome, ordem]
  );
}

/* =========================================================
   EXECUÇÃO PRINCIPAL
   ========================================================= */
(async () => {
  try {
    // ---------------------------------
    // CARDÁPIOS
    // ---------------------------------
    const semanaId = await ensureCardapio("Semana", "semana", "1,2,3,4,5");
    const fdsId = await ensureCardapio("FDS", "fds", "6,0");

    // ---------------------------------
    // CATEGORIAS
    // ---------------------------------
    const categorias = [
      "Pratos",
      "Massas",
      "Petiscos",
      "Adicionais",
      "Bebidas",
      "Sobremesas",
      "Pratos FDS",
      "Pratos a la carte",
      "Pratos Lights",
      "Pratos Kids",
      "Massas FDS",
    ];

    const categoriaMap = {};
    for (const nome of categorias) {
      categoriaMap[nome] = await ensureCategoria(nome);
    }

    // ---------------------------------
    // VARIANTES (Molhos)
    // ---------------------------------
    const varMolho = await ensureVariante("Molho", 1);
    const molhos = ["Ao Sugo", "Bolonhesa", "Branco"];
    for (let i = 0; i < molhos.length; i++) {
      await ensureVarianteOpcao(varMolho, molhos[i], i + 1);
    }

    // ---------------------------------
    // ITENS — SEMANA
    // ---------------------------------
    const BASE_PRATO = [
      "Arroz",
      "Feijao",
      "Fritas",
      "Salada",
      "Cebola",
      "Tomate",
      "Alface",
    ];

    const PRATOS = [
      { nome: "Prato do Dia", preco: 22.9 },
      { nome: "Feijoada", preco: 24.9 },
      { nome: "Exec Frango Grelhado", preco: 24.9 },
      { nome: "Exec Frango a Milanesa", preco: 26.9 },
      { nome: "Exec Frango a Parmegiana", preco: 28.9 },
      { nome: "Exec Porco Grelhado", preco: 25.9 },
      { nome: "Exec Boi Grelhado", preco: 31.9 },
      { nome: "Exec Boi a Milanesa", preco: 33.9 },
      { nome: "Exec Boi a Parmegiana", preco: 35.9 },
      { nome: "Exec Tilapia Grelhada", preco: 31.9 },
      { nome: "Exec de Figado", preco: 24.9 },
    ];

    let ordem = 1;
    for (const p of PRATOS) {
      const itemId = await ensureItem({
        nome: p.nome,
        categoria_id: categoriaMap["Pratos"],
        ingredientes: BASE_PRATO,
      });
      await ensureItemCardapio({
        cardapio_id: semanaId,
        item_id: itemId,
        preco: p.preco,
        ordem: ordem++,
      });
    }

    // ---------------------------------
    // ITENS — FDS
    // ---------------------------------
    const PRATOS_FDS = [
      { nome: "Executivo de Frango", preco: 29.9 },
      { nome: "Executivo de Porco", preco: 29.9 },
      { nome: "Executivo de Boi", preco: 37.9 },
      { nome: "Executivo de Peixe", preco: 35.9 },
    ];

    ordem = 1;
    for (const p of PRATOS_FDS) {
      const itemId = await ensureItem({
        nome: p.nome,
        categoria_id: categoriaMap["Pratos FDS"],
        ingredientes: ["Arroz", "Fritas", "Alface", "Tomate"],
      });
      await ensureItemCardapio({
        cardapio_id: fdsId,
        item_id: itemId,
        preco: p.preco,
        ordem: ordem++,
      });
    }

    const PRATOS_A_LA_CARTE = [
      { nome: "Parmegiana de Frango", preco: 86.0 },
      { nome: "File de Frango c/ Champignon", preco: 90.0 },
      { nome: "Parmegiana de Boi", preco: 98.0 },
      { nome: "Contra File c/ Fritas", preco: 92.0 },
      { nome: "File Mignon c/ Fritas", preco: 118.0 },
      { nome: "File Mignon ao Molho Madeira", preco: 112.0 },
      { nome: "Costela de Boi", preco: 90.0 },
      { nome: "Lagarto Maluco", preco: 92.0 },
      { nome: "Lombo a Mineira", preco: 84.0 },
      { nome: "Lombo c/ Abacaxi", preco: 88.0 },
      { nome: "Costelinha de Porco", preco: 82.0 },
      { nome: "File de Tilapia", preco: 96.0 },
    ];

    ordem = 1;
    for (const p of PRATOS_A_LA_CARTE) {
      const itemId = await ensureItem({
        nome: p.nome,
        categoria_id: categoriaMap["Pratos a la carte"],
        ingredientes: [],
      });
      await ensureItemCardapio({
        cardapio_id: fdsId,
        item_id: itemId,
        preco: p.preco,
        ordem: ordem++,
      });
    }

    const MASSAS_FDS = ["Penne", "Espaguete", "Talharim"];
    ordem = 1;
    for (const tipo of MASSAS_FDS) {
      const itemId = await ensureItem({
        nome: tipo,
        categoria_id: categoriaMap["Massas FDS"],
        ingredientes: ["Massa"],
      });
      await ensureItemCardapio({
        cardapio_id: fdsId,
        item_id: itemId,
        preco: 29.9,
        ordem: ordem++,
      });
    }

    const PRATOS_LIGHTS = [
      { nome: "Omelete Braseiro", preco: 23.9 },
      { nome: "Salada de Frango c/ Abacaxi", preco: 24.9 },
    ];
    ordem = 1;
    for (const p of PRATOS_LIGHTS) {
      const itemId = await ensureItem({
        nome: p.nome,
        categoria_id: categoriaMap["Pratos Lights"],
        ingredientes: [],
      });
      await ensureItemCardapio({
        cardapio_id: fdsId,
        item_id: itemId,
        preco: p.preco,
        ordem: ordem++,
      });
    }

    const PRATOS_KIDS = [
      { nome: "Kids Frango", preco: 24.9 },
      { nome: "Kids Ovo", preco: 21.9 },
      { nome: "Kids Massa", preco: 21.9 },
    ];
    ordem = 1;
    for (const p of PRATOS_KIDS) {
      const itemId = await ensureItem({
        nome: p.nome,
        categoria_id: categoriaMap["Pratos Kids"],
        ingredientes: ["Arroz", "Feijao", "Fritas"],
      });
      await ensureItemCardapio({
        cardapio_id: fdsId,
        item_id: itemId,
        preco: p.preco,
        ordem: ordem++,
      });
    }

    const SOBREMESAS = [
      { nome: "Pudim", preco: 8.0 },
      { nome: "Romeu e Julieta", preco: 8.0 },
      { nome: "Doce de Leite c/ Queijo", preco: 8.0 },
    ];
    ordem = 1;
    for (const s of SOBREMESAS) {
      const itemId = await ensureItem({
        nome: s.nome,
        categoria_id: categoriaMap["Sobremesas"],
      });
      await ensureItemCardapio({
        cardapio_id: fdsId,
        item_id: itemId,
        preco: s.preco,
        ordem: ordem++,
      });
    }

    console.log("✅ Seed aplicado com sucesso!");
  } catch (err) {
    console.error("❌ Erro durante seed:", err);
  } finally {
    db.close(() => console.log("🔒 Conexão encerrada."));
  }
})();
