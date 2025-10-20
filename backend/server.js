require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { initSocket } = require('./config/socket');
const PrinterService = require('./core/services/printerService');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/api', require('./modules/cardapio/cardapio.routes'));

// Rotas
app.use('/api/pedidos', require('./modules/pedidos/pedidos.routes'));

// Socket.io
initSocket(server);

// Inicialização
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
