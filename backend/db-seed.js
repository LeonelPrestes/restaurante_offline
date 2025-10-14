/**
 * =========================================================
 * SCRIPT DE POPULAÇÃO DO BANCO (backend/db-seed.js)
 * =========================================================
 * - Cria os cardápios "SEMANA" e "FDS"
 * - Popula categorias, itens, variantes e preços específicos
 * - Aplica aceitação de meia porção em PETISCOS e A LA CARTE
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

async function ensureItem({
  nome,
  categoria_id,
  ingredientes,
  descricao,
  aceita_meia_porcao = 0,
}) {
  await run(
    `INSERT OR IGNORE INTO itens (nome, categoria_id, ingredientes, descricao, aceita_meia_porcao)
     VALUES (?, ?, ?, ?, ?)`,
    [nome, categoria_id, JSON.stringify(ingredientes || []), descricao || "", aceita_meia_porcao]
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
    const semanaId = await ensureCardapio("SEMANA", "semana", "1,2,3,4,5");
    const fdsId = await ensureCardapio("FDS", "fds", "6,0");

    // ---------------------------------
    // CATEGORIAS
    // ---------------------------------
    const categorias = [
      "PRATOS",
      "MASSAS",
      "PETISCOS",
      "ADICIONAIS",
      "BEBIDAS",
      "SOBREMESAS",
      "PRATOS FDS",
      "PRATOS A LA CARTE",
      "PRATOS LIGHTS",
      "PRATOS KIDS",
      "MASSAS FDS",
    ];

    const categoriaMap = {};
    for (const nome of categorias) {
      categoriaMap[nome] = await ensureCategoria(nome);
    }

    // ---------------------------------
    // VARIANTES (MOLHOS)
    // ---------------------------------
    const varMolho = await ensureVariante("MOLHO", 1);
    const molhos = ["AO SUGO", "BOLONHESA", "BRANCO"];
    for (let i = 0; i < molhos.length; i++) {
      await ensureVarianteOpcao(varMolho, molhos[i], i + 1);
    }

    // ---------------------------------
    // ITENS — SEMANA
    // ---------------------------------
    const BASE_PRATO = [
      "ARROZ",
      "FEIJAO",
      "FRITAS",
      "SALADA",
      "CEBOLA",
      "TOMATE",
      "ALFACE",
      "PROTEINA",
    ];

    const PRATOS = [
      { nome: "PRATO DO DIA", preco: 22.9 },
      { nome: "FEIJOADA", preco: 24.9 },
      { nome: "EXEC FRANGO GRELHADO", preco: 24.9 },
      { nome: "EXEC FRANGO A MILANESA", preco: 26.9 },
      { nome: "EXEC FRANGO A PARMEGIANA", preco: 28.9 },
      { nome: "EXEC PORCO GRELHADO", preco: 25.9 },
      { nome: "EXEC BOI GRELHADO", preco: 31.9 },
      { nome: "EXEC BOI A MILANESA", preco: 33.9 },
      { nome: "EXEC BOI A PARMEGIANA", preco: 35.9 },
      { nome: "EXEC TILAPIA GRELHADA", preco: 31.9 },
      { nome: "EXEC DE FIGADO", preco: 24.9 },
    ];

    let ordem = 1;
    for (const p of PRATOS) {
      const itemId = await ensureItem({
        nome: p.nome,
        categoria_id: categoriaMap["PRATOS"],
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
      { nome: "EXECUTIVO DE FRANGO", preco: 29.9 },
      { nome: "EXECUTIVO DE PORCO", preco: 29.9 },
      { nome: "EXECUTIVO DE BOI", preco: 37.9 },
      { nome: "EXECUTIVO DE PEIXE", preco: 35.9 },
    ];

    ordem = 1;
    for (const p of PRATOS_FDS) {
      const itemId = await ensureItem({
        nome: p.nome,
        categoria_id: categoriaMap["PRATOS FDS"],
        ingredientes: ["ARROZ", "FRITAS", "ALFACE", "TOMATE"],
      });
      await ensureItemCardapio({
        cardapio_id: fdsId,
        item_id: itemId,
        preco: p.preco,
        ordem: ordem++,
      });
    }

    // ---------------------------------
    // PRATOS A LA CARTE — TODOS ACEITAM MEIA PORÇÃO
    // ---------------------------------
    const PRATOS_A_LA_CARTE = [
      { nome: "PARMEGIANA DE FRANGO", preco: 86.0 },
      { nome: "FILE DE FRANGO C/ CHAMPIGNON", preco: 90.0 },
      { nome: "PARMEGIANA DE BOI", preco: 98.0 },
      { nome: "CONTRA FILE C/ FRITAS", preco: 92.0 },
      { nome: "FILE MIGNON C/ FRITAS", preco: 118.0 },
      { nome: "FILE MIGNON AO MOLHO MADEIRA", preco: 112.0 },
      { nome: "COSTELA DE BOI", preco: 90.0 },
      { nome: "LAGARTO MALUCO", preco: 92.0 },
      { nome: "LOMBO A MINEIRA", preco: 84.0 },
      { nome: "LOMBO C/ ABACAXI", preco: 88.0 },
      { nome: "COSTELINHA DE PORCO", preco: 82.0 },
      { nome: "FILE DE TILAPIA", preco: 96.0 },
    ];

    ordem = 1;
    for (const p of PRATOS_A_LA_CARTE) {
      const itemId = await ensureItem({
        nome: p.nome,
        categoria_id: categoriaMap["PRATOS A LA CARTE"],
        aceita_meia_porcao: 1,
      });
      await ensureItemCardapio({
        cardapio_id: fdsId,
        item_id: itemId,
        preco: p.preco,
        ordem: ordem++,
      });
    }

    // ---------------------------------
// MASSAS — SEMANA
// ---------------------------------
const MASSAS_SEMANA = [
  { nome: "PENNE", preco: 24.9 },
  { nome: "ESPAGUETE", preco: 24.9 },
  { nome: "TALHARIM", preco: 24.9 },
];

ordem = 1;
for (const m of MASSAS_SEMANA) {
  const itemId = await ensureItem({
    nome: m.nome,
    categoria_id: categoriaMap["MASSAS"],
    ingredientes: ["MASSA"],
  });

  await ensureItemCardapio({
    cardapio_id: semanaId,
    item_id: itemId,
    preco: m.preco,
    ordem: ordem++,
  });
}

// ---------------------------------
// MASSAS — FDS
// ---------------------------------
const MASSAS_FDS = [
  { nome: "PENNE", preco: 29.9 },
  { nome: "ESPAGUETE", preco: 29.9 },
  { nome: "TALHARIM", preco: 29.9 },
];

ordem = 1;
for (const m of MASSAS_FDS) {
  const itemId = await ensureItem({
    nome: m.nome,
    categoria_id: categoriaMap["MASSAS FDS"],
    ingredientes: ["MASSA"],
  });

  await ensureItemCardapio({
    cardapio_id: fdsId,
    item_id: itemId,
    preco: m.preco,
    ordem: ordem++,
  });
}

    // ---------------------------------
    // PETISCOS — ACEITAM MEIA PORÇÃO CONFORME LISTA
    // ---------------------------------
    const PETISCOS = [
      { nome: "BOLINHO DE BACALHAU", preco: 39.0, meia: 1 },
      { nome: "CAMARAO EMPANADO", preco: 39.0, meia: 1 },
      { nome: "EMPADA", preco: 9.0, meia: 0 },
      { nome: "MOELINHA", preco: 34.0, meia: 1 },
      { nome: "TORRESMO 100G", preco: 8.49, meia: 0 },
      { nome: "FRITAS", preco: 28.0, meia: 1 },
      { nome: "CONTRA FILE COM FRITAS", preco: 49.0, meia: 1 },
      { nome: "FRITAS COM LINGUICA", preco: 34.0, meia: 1 },
      { nome: "FIGADO COM JILO", preco: 32.0, meia: 1 },
      { nome: "LINGUA DE BOI AO MOLHO DE VINHO", preco: 32.0, meia: 1 },
      { nome: "TRIO MINEIRO", preco: 49.0, meia: 1 },
      { nome: "ISCA DE TILAPIA", preco: 49.0, meia: 1 },
      { nome: "CAMARAO ALHO E OLEO", preco: 39.0, meia: 1 },
      { nome: "PASTEL QUEIJO", preco: 24.0, meia: 1 },
      { nome: "PROVOLONE NA PEDRA", preco: 31.0, meia: 1 },
      { nome: "FEIJAO AMIGO", preco: 6.0, meia: 0 },
    ];

    ordem = 1;
    for (const p of PETISCOS) {
      const itemId = await ensureItem({
        nome: p.nome,
        categoria_id: categoriaMap["PETISCOS"],
        aceita_meia_porcao: p.meia,
      });
      await ensureItemCardapio({
        cardapio_id: semanaId,
        item_id: itemId,
        preco: p.preco,
        ordem,
      });
      await ensureItemCardapio({
        cardapio_id: fdsId,
        item_id: itemId,
        preco: p.preco,
        ordem: ordem++,
      });
    }

    // ---------------------------------
    // ADICIONAIS
    // ---------------------------------
    const ADICIONAIS = [
      { nome: "OVO FRITO", preco: 3.0 },
      { nome: "OMELETE SIMPLES", preco: 12.0, ingredientes: ["2 OVOS"] },
      { nome: "OMELETE", preco: 15.0, ingredientes: ["QUEIJO", "CEBOLA", "TOMATE", "3 OVOS"] },
      { nome: "FRITAS ADICIONAL", preco: 10.0 },
      { nome: "BIFE FRANGO GRELHADO", preco: 13.90 },
      { nome: "BIFE FRANGO A MILANESA", preco: 15.90 },
      { nome: "BIFE FRANGO A PARMEGIANA", preco: 17.90 },
      { nome: "BIFE DE PORCO GRELHADO", preco: 13.90 },
      { nome: "BIFE DE BOI GRELHADO", preco: 15.90 },
      { nome: "BIFE DE BOI A MILANESA", preco: 17.90 },
      { nome: "BIFE DE BOI A PARMEGIANA", preco: 19.90 },
      { nome: "BIFE DE TILAPIA GRELHADA", preco: 15.90 },
      { nome: "BIFE DE FIGADO", preco: 13.90 },
    ];

    ordem = 1;
    for (const a of ADICIONAIS) {
      const itemId = await ensureItem({
        nome: a.nome,
        categoria_id: categoriaMap["ADICIONAIS"],
        ingredientes: a.ingredientes || [],
      });
      await ensureItemCardapio({
        cardapio_id: semanaId,
        item_id: itemId,
        preco: a.preco,
        ordem: ordem++,
      });
      await ensureItemCardapio({
        cardapio_id: fdsId,
        item_id: itemId,
        preco: a.preco,
        ordem,
      });
    }

    console.log("✅ SEED APLICADO COM SUCESSO (TODOS EM MAIÚSCULO)");
  } catch (err) {
    console.error("❌ ERRO DURANTE SEED:", err);
  } finally {
    db.close(() => console.log("🔒 CONEXÃO ENCERRADA."));
  }
})();
