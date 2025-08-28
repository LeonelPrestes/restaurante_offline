const { SerialPort } = require('serialport');
const iconv = require('iconv-lite');
const os = require('os');

class PrinterService {
  constructor(portaSerial = 'COM4', baudRate = 9600) {
    this.portaSerial = portaSerial;
    this.baudRate = baudRate;
    this.porta = null;
  }

  async conectar() {
    if (!this.portaSerial) {
      throw new Error('Nenhuma porta serial definida para a impressora');
    }

    this.porta = new SerialPort({
      path: this.portaSerial,
      baudRate: this.baudRate,
      autoOpen: false
    });

    return new Promise((resolve, reject) => {
      this.porta.open((err) => {
        if (err) {
          console.error('Erro ao abrir porta serial:', err.message);
          reject(err);
        } else {
          console.log(`Conectado à impressora na porta ${this.portaSerial}`);
          resolve();
        }
      });
    });
  }

  getStatus() {
    return {
      portaSerial: this.portaSerial || 'Não definida',
      status: this.porta?.isOpen ? 'conectada' : 'não conectada',
    };
  }

formatarPedido(pedido) {
  const linhas = [];
  const adicionar = (linha) => {
    linhas.push(linha);
    linhas.push(''); // linha em branco para espaçamento
  };

  adicionar('===== PEDIDO RECEBIDO =====');
  adicionar(`Pedido nº: ${pedido.id}`);
  adicionar(`Mesa: ${pedido.mesa}`);
  adicionar(`Status: ${pedido.status}`);
  adicionar(`Data: ${new Date().toLocaleString('pt-BR')}`);
  adicionar('---------------------------');
  adicionar('Itens:');

  pedido.itens.forEach(item => {
    const nome = item.nome || 'Item';
    const qtd = item.quantidade || 1;
    adicionar(`- ${qtd}x ${nome}`);
  });

  if (pedido.observacoes && pedido.observacoes.trim() !== '') {
    adicionar('---------------------------');
    adicionar('Obs:');
    adicionar(pedido.observacoes);
  }

  adicionar('===========================');
  adicionar(' '); // linha final

  return linhas.join(os.EOL);
}

  async imprimirTexto(texto) {
    if (!this.porta || !this.porta.isOpen) {
      throw new Error('Porta serial não está aberta.');
    }

    // Comandos ESC/Bematech
    const CUT_PAPER = Buffer.from([0x1B, 0x6D]); // Corte total (Bematech)
    const AUMENTAR_FONTE = Buffer.from([0x1B, 0x57, 0x01]); // Fonte expandida: largura + altura
    // const NORMAL_FONTE = Buffer.from([0x1B, 0x57, 0x00]); // Resetar fonte, se necessário

    return new Promise((resolve, reject) => {
      try {
        const textoCodificado = iconv.encode(texto + os.EOL.repeat(4), 'win1252');

        const bufferFinal = Buffer.concat([
          AUMENTAR_FONTE,
          textoCodificado,
          CUT_PAPER
        ]);

        this.porta.write(bufferFinal, (err) => {
          if (err) {
            console.error('Erro ao imprimir texto:', err.message);
            return reject(err);
          }

          this.porta.drain(() => {
            console.log('Texto com fonte aumentada enviado com sucesso.');
            resolve();
          });
        });
      } catch (erro) {
        console.error('Erro geral na impressão:', erro.message);
        reject(erro);
      }
    });
  }

  async imprimirPedido(pedido) {
    if (!this.porta || !this.porta.isOpen) {
      console.log('Tentando conectar à impressora antes de imprimir...');
      await this.conectar();
    }

    const texto = this.formatarPedido(pedido);
    await this.imprimirTexto(texto);
  }

  async imprimirTeste() {
    const texto = [
      '=== TESTE DE IMPRESSÃO ===',
      'Sistema Restaurante Offline',
      `Data: ${new Date().toLocaleString()}`,
      '---------------------------',
      'Este é um teste de impressão.',
      'Se você está lendo isso, está tudo funcionando :)',
      '===========================',
      ' '
    ].join(os.EOL);

    await this.imprimirTexto(texto);
  }

  async desconectar() {
    if (this.porta && this.porta.isOpen) {
      return new Promise((resolve, reject) => {
        this.porta.close((err) => {
          if (err) {
            console.error('Erro ao fechar porta:', err.message);
            reject(err);
          } else {
            console.log('Porta serial fechada.');
            resolve();
          }
        });
      });
    }
  }
}

module.exports = PrinterService;
