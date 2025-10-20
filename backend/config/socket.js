let io = null;

function initSocket(server) {
  const socketIo = require('socket.io');
  io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  console.log("⚡ Socket.IO inicializado");

  io.on("connection", (socket) => {
    console.log("🟢 Novo cliente conectado:", socket.id);

    socket.on("disconnect", () => {
      console.log("🔴 Cliente desconectado:", socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.IO não inicializado!");
  return io;
}

module.exports = { initSocket, getIO };
