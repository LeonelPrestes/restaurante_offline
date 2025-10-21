// backend/modules/cardapio/cardapio.routes.js
const express = require('express');
const router = express.Router();
const { getMenu, getCardapioAtual } = require('./cardapio.controller');

router.get('/menu', getMenu);
router.get('/cardapio/atual', getCardapioAtual);

module.exports = router;
