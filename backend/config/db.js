const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "../db/braseiro/braseiro.sqlite");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Erro ao conectar ao SQLite:", err.message);
  else console.log("✅ Banco conectado:", dbPath);
});

/* =========================================================
   🔧 Funções utilitárias
   ========================================================= */
function isFimDeSemana() {
  const dia = new Date().getDay(); // 0 = domingo, 6 = sábado
  return dia === 0 || dia === 6;
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

/* =========================================================
   🔎 Resolve o ID do cardápio atual (SEMANA ou FDS)
   ========================================================= */
async function getCardapioId(parametro = null) {
  let slug = "semana";

  if (parametro === "fds") slug = "fds";
  else if (parametro === "semana") slug = "semana";
  else slug = isFimDeSemana() ? "fds" : "semana";

  const row = await getAsync(`SELECT id FROM cardapios WHERE slug = ?`, [slug]);
  if (!row) throw new Error(`Cardápio não encontrado (${slug})`);
  return row.id;
}

/* =========================================================
   🍽 getItens() → Retorna cardápio agrupado por categoria
   ========================================================= */
async function getItens(parametroCardapio = null) {
  const cardapioId = await getCardapioId(parametroCardapio);

  // Detecta se é fim de semana (sábado ou domingo)
  const isFds = parametroCardapio === 'fds' || isFimDeSemana();

  let sql = `
    SELECT 
      c.nome AS categoria,
      i.id,
      i.nome,
      ic.preco,
      i.ingredientes,
      ic.ordem,
      ic.preco_meia
    FROM itens_cardapio ic
    JOIN itens i ON ic.item_id = i.id
    JOIN categorias c ON i.categoria_id = c.id
    WHERE ic.cardapio_id = ?
      AND ic.ativo = 1
  `;

  // 🚫 Quando for FDS → ignorar qualquer categoria "PETISCOS" que NÃO contenha "FDS"
// 🚫 Quando for FDS → ignorar categorias da semana (sem sufixo FDS)
if (isFds) {
  sql += `
    AND NOT (
      -- ignora PETISCOS da semana
      (UPPER(c.nome) LIKE 'PETISCOS' OR (UPPER(c.nome) LIKE '%PETISCOS%' AND UPPER(c.nome) NOT LIKE '%FDS%'))
      -- ignora MASSAS da semana
      OR (UPPER(c.nome) LIKE 'MASSAS' OR (UPPER(c.nome) LIKE '%MASSAS%' AND UPPER(c.nome) NOT LIKE '%FDS%'))
      -- ignora PRATOS EXECUTIVOS (sem versão FDS)
      OR (UPPER(c.nome) LIKE 'PRATOS EXECUTIVOS')
    )
  `;
}


  sql += `
    ORDER BY c.nome, ic.ordem, i.nome;
  `;

  const rows = await allAsync(sql, [cardapioId]);

  // Agrupar por categoria
  const agrupado = [];
  let grupoAtual = null;

  for (const row of rows) {
    if (!grupoAtual || grupoAtual.categoria !== row.categoria) {
      grupoAtual = { categoria: row.categoria, itens: [] };
      agrupado.push(grupoAtual);
    }

    grupoAtual.itens.push({
      id: row.id,
      nome: limparNome(row.nome),
      preco: row.preco,
      preco_meia: row.preco_meia,
      aceita_meia_porcao: row.preco_meia != null,
      ingredientes: JSON.parse(row.ingredientes || "[]"),
    });
  }

  return agrupado;
}


/* =========================================================
   🔍 getItemPorId() → Detalhe de item específico
   ========================================================= */
async function getItemPorId(id, parametroCardapio = null) {
  const cardapioId = await getCardapioId(parametroCardapio);

  const sql = `
    SELECT 
      i.id,
      i.nome,
      i.ingredientes,
      i.descricao,
      
      c.nome AS categoria,
      ic.preco,
      ic.ordem
    FROM itens i
    JOIN categorias c ON i.categoria_id = c.id
    LEFT JOIN itens_cardapio ic ON ic.item_id = i.id AND ic.cardapio_id = ?
    WHERE i.id = ?
  `;

  const row = await getAsync(sql, [cardapioId, id]);
  if (!row) return null;

  return {
    id: row.id,
    nome: limparNome(row.nome),
    preco: row.preco,
    categoria: row.categoria,
    aceita_meia_porcao: !!row.aceita_meia_porcao,
    ingredientes: JSON.parse(row.ingredientes || "[]"),
    descricao: row.descricao || "",
  };
}

/* =========================================================
   📂 getItensPorCategoria() → Itens de uma categoria específica
   ========================================================= */
async function getItensPorCategoria(categoria, parametroCardapio = null) {
  const cardapioId = await getCardapioId(parametroCardapio);

  const sql = `
    SELECT 
      i.id,
      i.nome,
      i.ingredientes,
      ic.preco,
      c.nome AS categoria,
      ic.ordem,
      i.aceita_meia_porcao
    FROM itens_cardapio ic
    JOIN itens i ON ic.item_id = i.id
    JOIN categorias c ON i.categoria_id = c.id
    WHERE ic.cardapio_id = ?
      AND c.nome = ?
      AND ic.ativo = 1
    ORDER BY ic.ordem, i.nome;
  `;

  const rows = await allAsync(sql, [cardapioId, categoria]);
  return rows.map((r) => ({
    id: r.id,
    nome: limparNome(r.nome),
    preco: r.preco,
    categoria: r.categoria,
    aceita_meia_porcao: !!r.aceita_meia_porcao,
    ingredientes: JSON.parse(r.ingredientes || "[]"),
  }));
}

function limparNome(nome) {
  return nome.replace(/\s*\[.*?\]$/, '').trim();
}

module.exports = { db, getItens, getItemPorId, getItensPorCategoria };
