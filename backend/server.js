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

// =========================================================
// 🧱 SCHEMA: cria tabelas pedidos / itens_pedido se não existirem
// =========================================================
function ensurePedidosSchema() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `
        CREATE TABLE IF NOT EXISTS pedidos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mesa INTEGER NOT NULL,
          observacoes TEXT,
          status TEXT DEFAULT 'pendente',
          criado_em TEXT DEFAULT (datetime('now'))
        )
      `,
        (err) => {
          if (err) return reject(err);
        }
      );

      db.run(
        `
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
      `,
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  });
}

// =========================================================
// 💾 HELPERS de banco
// =========================================================
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

// =========================================================
// 🧾 FUNÇÕES DE PEDIDOS
// =========================================================
async function createPedidoDB({ mesa, itens, observacoes = "" }) {
  await runAsync("BEGIN TRANSACTION");

  try {
    const insertPedido = await runAsync(
      `INSERT INTO pedidos (mesa, observacoes, status) VALUES (?, ?, 'pendente')`,
      [mesa, observacoes]
    );
    const pedidoId = insertPedido.lastID;

    for (const it of itens) {
      const nome = it.nome || "Item";
      const preco = Number(it.preco || 0);
      const quantidade = parseInt(it.quantidade || 1, 10);
      const observacao = it.observacao || "";

      const adicionar = Array.isArray(it.adicionar)
        ? it.adicionar
        : Array.isArray(it.adicionados)
        ? it.adicionados
        : [];
      const retirar = Array.isArray(it.retirar)
        ? it.retirar
        : Array.isArray(it.retirados)
        ? it.retirados
        : [];

      await runAsync(
        `INSERT INTO itens_pedido (pedido_id, nome, preco, quantidade, observacao, adicionar, retirar)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          pedidoId,
          nome,
          preco,
          quantidade,
          observacao,
          JSON.stringify(adicionar),
          JSON.stringify(retirar),
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

async function getPedidoCompleto(id) {
  const pedido = await getAsync(`SELECT * FROM pedidos WHERE id = ?`, [id]);
  if (!pedido) return null;

  const itens = await allAsync(
    `SELECT * FROM itens_pedido WHERE pedido_id = ? ORDER BY id`,
    [id]
  );
  const itensNormalizados = itens.map((i) => ({
    id: i.id,
    nome: i.nome,
    preco: i.preco,
    quantidade: i.quantidade,
    observacao: i.observacao || "",
    adicionar: safeParseArray(i.adicionar),
    retirar: safeParseArray(i.retirar),
  }));

  return {
    id: pedido.id,
    mesa: pedido.mesa,
    observacoes: pedido.observacoes || "",
    status: pedido.status,
    criado_em: pedido.criado_em,
    itens: itensNormalizados,
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

async function getTodosPedidos() {
  const pedidos = await allAsync(`SELECT * FROM pedidos ORDER BY id DESC`);
  const completos = [];
  for (const p of pedidos) completos.push(await getPedidoCompleto(p.id));
  return completos;
}

async function updatePedidoStatusDB(id, status) {
  await runAsync(`UPDATE pedidos SET status = ? WHERE id = ?`, [status, id]);
  return await getPedidoCompleto(id);
}

// =========================================================
// 🍽 ROTAS DE CARDÁPIO (dinâmico: Semana/FDS)
// =========================================================
app.get("/api/menu", async (req, res) => {
  try {
    const { cardapio } = req.query; // opcional: ?cardapio=fds ou ?cardapio=semana
    const menu = await getItens(cardapio);
    res.json(menu);
  } catch (error) {
    console.error("Erro ao buscar cardápio:", error);
    res.status(500).json({ error: "Erro interno ao buscar cardápio" });
  }
});

app.get("/api/menu/:categoria", async (req, res) => {
  try {
    const { cardapio } = req.query;
    const categoria = req.params.categoria;
    const itens = await getItensPorCategoria(categoria, cardapio);
    res.json(itens);
  } catch (error) {
    console.error("Erro ao buscar itens por categoria:", error);
    res.status(500).json({ error: "Erro interno ao buscar categoria" });
  }
});

app.get("/api/item/:id", async (req, res) => {
  try {
    const { cardapio } = req.query;
    const item = await getItemPorId(req.params.id, cardapio);
    if (!item) return res.status(404).json({ error: "Item não encontrado" });
    res.json(item);
  } catch (error) {
    console.error("Erro ao buscar item:", error);
    res.status(500).json({ error: "Erro interno ao buscar item" });
  }
});

/* =========================================================
   🧭 DIAGNÓSTICO: qual cardápio está ativo agora?
   ========================================================= */
app.get("/api/cardapio/atual", (req, res) => {
  try {
    const dataParam = req.query.data ? new Date(req.query.data) : new Date();
    if (isNaN(dataParam)) {
      return res.status(400).json({ error: "Data inválida" });
    }

    const dia = dataParam.getDay(); // 0 = domingo, 6 = sábado
    const isFDS = dia === 0 || dia === 6;

    res.json({
      data: dataParam.toISOString().split("T")[0],
      dia_semana: [
        "Domingo", "Segunda-feira", "Terça-feira",
        "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"
      ][dia],
      cardapio: isFDS ? "FDS" : "Semana",
      descricao: isFDS
        ? "Cardápio de fim de semana ativo (sábado/domingo)."
        : "Cardápio de dias úteis ativo (segunda a sexta)."
    });
  } catch (error) {
    console.error("Erro ao verificar cardápio atual:", error);
    res.status(500).json({ error: "Erro interno ao verificar cardápio atual" });
  }
});
// =========================================================
// 🧾 ROTAS DE PEDIDOS
// =========================================================
app.get("/api/pedidos", async (req, res) => {
  try {
    const pedidos = await getTodosPedidos();
    res.json(pedidos);
  } catch (error) {
    console.error("Erro ao buscar pedidos:", error);
    res.status(500).json({ error: "Erro interno ao buscar pedidos" });
  }
});

app.get("/api/pedidos/:id", async (req, res) => {
  try {
    const pedido = await getPedidoCompleto(req.params.id);
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(pedido);
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    res.status(500).json({ error: "Erro interno ao buscar pedido" });
  }
});

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
      await printerService.imprimirPedido(novoPedido);
      console.log(`🖨️ Pedido ${novoPedido.id} impresso`);
    } catch (printError) {
      console.error("Erro ao imprimir pedido:", printError);
    }

    res.status(201).json(novoPedido);
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res.status(500).json({ error: "Erro interno ao criar pedido" });
  }
});

app.put("/api/pedidos/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status inválido" });

    const pedido = await updatePedidoStatusDB(req.params.id, status);
    if (!pedido) return res.status(404).json({ error: "Pedido não encontrado" });

    io.emit("pedido_atualizado", pedido);
    res.json(pedido);
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    res.status(500).json({ error: "Erro interno ao atualizar pedido" });
  }
});

// =========================================================
// 🖨️ ROTAS DE IMPRESSORA
// =========================================================
app.get("/api/printer/status", (req, res) => {
  res.json(printerService.getStatus());
});

app.post("/api/printer/test", async (req, res) => {
  try {
    await printerService.imprimirTeste();
    res.json({ success: true, message: "Teste de impressão realizado com sucesso" });
  } catch (error) {
    console.error("Erro no teste de impressão:", error);
    res
      .status(500)
      .json({ error: "Erro ao realizar teste de impressão", details: error.message });
  }
});

app.get("/api/printer/list", async (req, res) => {
  try {
    const portas = await printerService.listarPortas();
    res.json({ success: true, portas });
  } catch (error) {
    console.error("Erro ao listar portas seriais:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/printer/connect", async (req, res) => {
  try {
    if (typeof printerService.detectAndConnect === "function") {
      const connected = await printerService.detectAndConnect();
      if (!connected)
        return res.status(404).json({ error: "Impressora não encontrada" });
    } else {
      await printerService.conectar();
    }
    res.json({ success: true, message: "Impressora conectada com sucesso" });
  } catch (error) {
    console.error("Erro ao conectar impressora:", error);
    res
      .status(500)
      .json({ error: "Erro ao conectar impressora", details: error.message });
  }
});

// =========================================================
// 🌐 FRONTEND + SOCKETS
// =========================================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);
  socket.on("disconnect", () => console.log("Cliente desconectado:", socket.id));
  socket.on("ping", () => socket.emit("pong"));
});

// =========================================================
// 🚀 INICIALIZAÇÃO
// =========================================================
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log("🚀 Inicializando servidor...");
    await ensurePedidosSchema();
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
  } catch {}
  process.exit(0);
});
