const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
const { db, getItens, getItemPorId, getItensPorCategoria } = require("./db");
const PrinterService = require("./printer-service");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// =========================================================
// 🖨️ IMPRESSORA
// =========================================================
const printerService = new PrinterService();

/* =========================================================
   🔧 Helpers de banco
   ========================================================= */
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
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
   🧾 CRIA PEDIDO
   ========================================================= */
async function createPedidoDB({ mesa, itens, observacoes = "" }) {
  await runAsync("BEGIN TRANSACTION");

  try {
    const insertPedido = await runAsync(
      `INSERT INTO pedidos (mesa, observacoes, status) VALUES (?, ?, 'pendente')`,
      [mesa, observacoes]
    );
    const pedidoId = insertPedido.lastID;

    for (const it of itens) {
      const nome = it.nome || "ITEM";
      const precoOriginal = Number(it.preco || 0);
      const meia = it.meia ? 1 : 0;
      const preco = meia ? precoOriginal * 0.6 : precoOriginal; // 60% da porção inteira
      const quantidade = parseInt(it.quantidade || 1, 10);
      const observacao = it.observacao || "";

      const adicionar = Array.isArray(it.adicionar)
        ? it.adicionar
        : [];
      const retirar = Array.isArray(it.retirar)
        ? it.retirar
        : [];

      await runAsync(
        `INSERT INTO itens_pedido (pedido_id, nome, preco, quantidade, observacao, adicionar, retirar, meia)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pedidoId,
          nome,
          preco,
          quantidade,
          observacao,
          JSON.stringify(adicionar),
          JSON.stringify(retirar),
          meia
        ]
      );
    }

    await runAsync("COMMIT");
    return await getPedidoCompleto(pedidoId);
  } catch (err) {
    await runAsync("ROLLBACK");
    throw err;
  }
}

/* =========================================================
   🔍 Recuperar pedido completo
   ========================================================= */
async function getPedidoCompleto(id) {
  const pedido = await getAsync(`SELECT * FROM pedidos WHERE id = ?`, [id]);
  if (!pedido) return null;

const itens = await allAsync(`
  SELECT 
    ip.id,
    ip.nome,
    ip.preco,
    ip.quantidade,
    ip.meia,
    ip.observacao,
    ip.adicionar,
    ip.retirar,
    c.nome AS categoria_nome
  FROM itens_pedido ip
  LEFT JOIN itens i ON i.nome = ip.nome
  LEFT JOIN categorias c ON c.id = i.categoria_id
  WHERE ip.pedido_id = ?
  ORDER BY ip.id
`, [id]);


  return {
    id: pedido.id,
    mesa: pedido.mesa,
    observacoes: pedido.observacoes || "",
    status: pedido.status,
    criado_em: pedido.criado_em,
    itens: itens.map((i) => ({
      id: i.id,
      nome: i.nome,
      preco: i.preco,
      quantidade: i.quantidade,
      meia: !!i.meia,
      observacao: i.observacao || "",
      adicionar: safeParseArray(i.adicionar),
      retirar: safeParseArray(i.retirar),
      categoria_nome: i.categoria_nome || "",
    })),
  };
}

function safeParseArray(text) {
  try {
    const v = JSON.parse(text || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/* =========================================================
   🧾 TODOS OS PEDIDOS
   ========================================================= */
async function getTodosPedidos() {
  const pedidos = await allAsync(`SELECT * FROM pedidos ORDER BY id DESC`);
  const completos = [];
  for (const p of pedidos) completos.push(await getPedidoCompleto(p.id));
  return completos;
}

/* =========================================================
   🔁 Atualizar status
   ========================================================= */
async function updatePedidoStatusDB(id, status) {
  await runAsync(`UPDATE pedidos SET status = ? WHERE id = ?`, [status, id]);
  return await getPedidoCompleto(id);
}

/* =========================================================
   🍽 CARDÁPIO
   ========================================================= */
app.get("/api/menu", async (req, res) => {
  try {
    const { cardapio } = req.query;
    const menu = await getItens(cardapio);
    res.json(menu);
  } catch (error) {
    console.error("Erro ao buscar cardápio:", error);
    res.status(500).json({ error: "Erro interno ao buscar cardápio" });
  }
});
/* =========================================================
   📅 CARDÁPIO ATUAL (semana ou fds)
   ========================================================= */
app.get("/api/cardapio/atual", (req, res) => {
  try {
    const dia = new Date().getDay(); // 0 = domingo, 6 = sábado
    const cardapio = (dia === 0 || dia === 6) ? "fds" : "semana";

    res.json({ cardapio });
  } catch (error) {
    console.error("Erro ao determinar cardápio atual:", error);
    res.status(500).json({ error: "Erro interno ao determinar cardápio" });
  }
});

/* =========================================================
   🧾 PEDIDOS
   ========================================================= */
app.post("/api/pedidos", async (req, res) => {
  try {
    const { mesa, itens, observacoes } = req.body;
    if (!mesa || !Array.isArray(itens) || itens.length === 0)
      return res.status(400).json({ error: "Dados inválidos do pedido" });

    const novoPedido = await createPedidoDB({
      mesa,
      itens,
      observacoes: observacoes || "",
    });

    io.emit("novo_pedido", novoPedido);

    try {
      await imprimirPedidoInteligente(novoPedido);
    } catch (printError) {
      console.error("Erro ao imprimir pedido:", printError);
    }

    res.status(201).json(novoPedido);
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res.status(500).json({ error: "Erro interno ao criar pedido" });
  }
});

/* =========================================================
   🖨️ IMPRESSÃO USANDO SERVIÇO PADRÃO
   ========================================================= */
async function imprimirPedidoInteligente(pedido) {
  try {
    await printerService.imprimirPedido(pedido);
  } catch (err) {
    console.error("Erro ao imprimir com serviço padrão:", err);
  }
}

/* =========================================================
   🚀 INICIALIZAÇÃO
   ========================================================= */
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log("🚀 Inicializando servidor...");
    await printerService.conectar();
    console.log("🖨️ Impressora conectada com sucesso");

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Acesse: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

startServer();

process.on("SIGINT", async () => {
  console.log("Encerrando servidor...");
  try {
    db.close();
  } catch { }
  process.exit(0);
});
