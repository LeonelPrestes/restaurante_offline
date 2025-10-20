// backend/modules/pedidos/pedidos.controller.js
const pedidosService = require('./pedidos.service');
const { getItens } = require('../../config/db');

exports.criarPedido = async (req, res) => {
  try {
    const { mesa, itens, observacoes } = req.body;

    if (!mesa || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: "Dados inválidos do pedido" });
    }

    const novoPedido = await pedidosService.criarPedido({ mesa, itens, observacoes });
    res.status(201).json(novoPedido);
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res.status(500).json({ error: "Erro interno ao criar pedido" });
  }
};

exports.getMenu = async (req, res) => {
  try {
    const { cardapio } = req.query;
    const menu = await getItens(cardapio);
    res.json(menu);
  } catch (error) {
    console.error('Erro ao buscar cardápio:', error);
    res.status(500).json({ error: 'Erro interno ao buscar cardápio' });
  }
};


exports.getCardapioAtual = async (req, res) => {
  try {
    const dia = new Date().getDay(); // 0 = domingo, 6 = sábado
    const cardapio = (dia === 0 || dia === 6) ? 'fds' : 'semana';
    res.json({ cardapio });
  } catch (error) {
    console.error('Erro ao determinar cardápio atual:', error);
    res.status(500).json({ error: 'Erro interno ao determinar cardápio' });
  }
};
