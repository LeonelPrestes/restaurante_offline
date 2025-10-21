const express = require("express");
const router = express.Router();
const pedidosController = require('./pedidos.controller');

router.get('/menu', pedidosController.getMenu);
router.get('/cardapio/atual', pedidosController.getCardapioAtual);

// Rota para criar um novo pedido
router.post('/', pedidosController.criarPedido);

module.exports = router;