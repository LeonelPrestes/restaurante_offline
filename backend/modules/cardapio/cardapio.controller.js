// backend/modules/cardapio/cardapio.controller.js
const { getItens } = require('../../config/db');

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
