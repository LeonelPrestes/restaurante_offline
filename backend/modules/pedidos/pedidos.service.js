const pedidosRepository = require('./pedidos.repository');
const { getIO } = require('../../config/socket');
const PrinterService = require('../../core/services/printerService');
const printerService = new PrinterService();

exports.criarPedido = async ({ mesa, itens, observacoes }) => {
  const novoPedido = await pedidosRepository.criarPedidoDB({ mesa, itens, observacoes });
  
  const io = getIO(); // ✅ pega a instância ativa do socket
  io.emit('novo_pedido', novoPedido);

  await printerService.imprimirPedido(novoPedido);
  return novoPedido;
};
