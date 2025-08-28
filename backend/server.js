const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const Database = require('./database');
const PrinterService = require('./printer-service');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Inicializar banco de dados e serviço de impressão
const db = new Database();
const printerService = new PrinterService();

// Rotas da API
app.get('/api/menu', async (req, res) => {
  try {
    const itens = await db.getMenuItems();
    res.json(itens);
  } catch (error) {
    console.error('Erro ao buscar itens do menu:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/pedidos', async (req, res) => {
  try {
    const pedidos = await db.getAllPedidos();
    res.json(pedidos);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/pedidos', async (req, res) => {
  try {
    const { mesa, itens, observacoes } = req.body;

    if (!mesa || !itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    const pedido = await db.createPedido(mesa, itens, observacoes);

    // Emitir evento para todos os clientes conectados
    io.emit('novo_pedido', pedido);

    // Tentar imprimir o pedido
    try {
      await printerService.imprimirPedido(pedido);
      console.log('Pedido impresso com sucesso:', pedido.id);
    } catch (printError) {
      console.error('Erro ao imprimir pedido:', printError);
      // Não falha a requisição se a impressão falhar
    }

    res.status(201).json(pedido);
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/pedidos/:id', async (req, res) => {
  try {
    const pedido = await db.getPedidoById(req.params.id);
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    res.json(pedido);
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.put('/api/pedidos/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const pedido = await db.updatePedidoStatus(req.params.id, status);

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Emitir evento de atualização
    io.emit('pedido_atualizado', pedido);

    res.json(pedido);
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/printer/status', (req, res) => {
  const status = printerService.getStatus();
  res.json(status);
});

app.post('/api/printer/test', async (req, res) => {
  try {
    await printerService.imprimirTeste();
    res.json({ success: true, message: 'Teste de impressão realizado com sucesso' });
  } catch (error) {
    console.error('Erro no teste de impressão:', error);
    res.status(500).json({ error: 'Erro ao realizar teste de impressão', details: error.message });
  }
});

app.post('/api/printer/connect', async (req, res) => {
  try {
    const connected = await printerService.detectAndConnect();
    if (connected) {
      res.json({ success: true, message: 'Impressora conectada com sucesso' });
    } else {
      res.status(404).json({ error: 'Impressora não encontrada' });
    }
  } catch (error) {
    console.error('Erro ao conectar impressora:', error);
    res.status(500).json({ error: 'Erro ao conectar impressora', details: error.message });
  }
});

// Rota para servir o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// WebSocket para comunicação em tempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });

  // Evento para teste de conexão
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

// Inicializar servidor
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await db.init();
    console.log('Banco de dados inicializado');

    // Conectar à impressora ao iniciar o servidor
    await printerService.conectar();
    console.log('Impressora conectada com sucesso');

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Acesse: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Erro ao inicializar servidor:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Encerrando servidor...');
  await db.close();
  process.exit(0);
});

