const { SerialPort } = require('serialport');
const iconv = require('iconv-lite');
const os = require('os');

class PrinterService {
  constructor(portaSerial = null, baudRate = 9600) {
    this.portaSerial = portaSerial;
    this.baudRate = baudRate;
    this.porta = null;
  }

  // 🧩 Detecta automaticamente a primeira impressora serial disponível
  // 🧩 Detecta automaticamente uma impressora serial conectada
  async detectarPorta() {
    const portas = await SerialPort.list();

    if (!portas || portas.length === 0) {
      throw new Error('Nenhuma porta serial foi detectada no sistema.');
    }

    // 👇 Adicione este trecho para listar tudo no console
    console.log('🔎 Portas detectadas:');
    portas.forEach(p => {
      console.log(`- ${p.path} | ${p.manufacturer || 'Desconhecido'} | ${p.friendlyName || 'Sem nome'} | Serial: ${p.serialNumber || 'N/A'}`);
    });

    // 🔍 Filtra apenas portas que parecem estar realmente conectadas
    const portasValidas = portas.filter(p =>
      p.serialNumber && p.serialNumber !== 'N/A' && p.serialNumber.trim() !== ''
    );

    if (portasValidas.length === 0) {
      throw new Error('Nenhuma impressora conectada foi encontrada (todas as portas estão vazias).');
    }

    // 🖨️ Procura impressoras conhecidas
    const impressora = portasValidas.find(p =>
      /(bematech|elgin|daruma|epson|pos|printer)/i.test(
        `${p.manufacturer || ''} ${p.friendlyName || ''}`
      )
    );

    if (impressora) {
      console.log(`🖨️ Impressora detectada: ${impressora.friendlyName} (${impressora.path})`);
      return impressora.path;
    }

    const primeira = portasValidas[0];
    console.warn(`⚠️ Nenhuma impressora reconhecida. Usando a porta ${primeira.path}`);
    return primeira.path;
  }


  // 🔍 Lista todas as portas seriais disponíveis no sistema
  async listarPortas() {
    try {
      const portas = await SerialPort.list();

      if (!portas || portas.length === 0) {
        console.warn('Nenhuma porta serial encontrada.');
        return [];
      }

      // Simplifica o retorno, mostrando apenas informações úteis
      const listaFormatada = portas.map(p => ({
        path: p.path,
        manufacturer: p.manufacturer || 'Desconhecido',
        friendlyName: p.friendlyName || 'Sem nome',
        serialNumber: p.serialNumber || 'N/A'
      }));

      console.log('🔎 Portas seriais detectadas:', listaFormatada);
      return listaFormatada;
    } catch (error) {
      console.error('Erro ao listar portas seriais:', error.message);
      throw error;
    }
  }

  // 🔧 Conecta à impressora (automática se porta não definida)
  async conectar() {
    try {
      if (!this.portaSerial) {
        this.portaSerial = await this.detectarPorta();
      }

      this.porta = new SerialPort({
        path: this.portaSerial,
        baudRate: this.baudRate,
        autoOpen: false
      });

      await new Promise((resolve, reject) => {
        this.porta.open((err) => {
          if (err) {
            console.error('Erro ao abrir porta serial:', err.message);
            reject(err);
          } else {
            console.log(`✅ Conectado à impressora na porta ${this.portaSerial}`);
            resolve();
          }
        });
      });
    } catch (err) {
      console.error('❌ Erro ao conectar à impressora:', err.message);
      throw err;
    }
  }

  getStatus() {
    return {
      portaSerial: this.portaSerial || 'Não definida',
      status: this.porta?.isOpen ? 'conectada' : 'não conectada',
    };
  }

  sanitizeForPrint(text) {
    if (!text) return '';
    return String(text).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

formatarPedido(pedido) {
  const linhas = [];
  const add = (linha) => {
    linhas.push(this.sanitizeForPrint(linha));
  };
  const blank = () => linhas.push('');

  add('==== PEDIDO RECEBIDO ====');
  add(`Pedido N: ${pedido.id}`);
  add(`Data:${new Date().toLocaleString('pt-BR')}`);
  add('-------------------------');
  add(`Mesa: ${pedido.mesa}`);

  // percorre todos os itens do pedido
  (pedido.itens || []).forEach(item => {
    add('-------------------------');
    const nome = (item.nome || 'ITEM').toUpperCase();
    const qtd = item.quantidade || 1;

    for (let i = 0; i < qtd; i++) {
      // 🧩 Usa o nome da categoria vinda do banco
      let prefixo = '';
      const categoria = (item.categoria_nome || '').toUpperCase();

      if (categoria.includes('PETISCO')) prefixo = 'PETISCO: ';
      else if (categoria.includes('A LA CARTE')) prefixo = 'A LA CARTE: ';

      // imprime a linha do item principal
      add(`${prefixo}`)
      add(` > ${nome}${item.meia ? ' (MEIA)' : ''}`);

      // adicionais
      (item.adicionar || []).forEach(ad =>
        add(`   + ADC ${this.sanitizeForPrint(ad)}`)
      );

      // retirados
      (item.retirar || []).forEach(rt =>
        add(`   - SEM ${this.sanitizeForPrint(rt)}`)
      );

      // observações específicas do item
      if (item.observacao && item.observacao.trim()) {
        item.observacao
          .split(/\r?\n/)
          .forEach(linha => add(`   OBS: ${this.sanitizeForPrint(linha)}`));
      }

      blank(); // espaço entre unidades
    }
  });

  if (pedido.observacoes && pedido.observacoes.trim()) {
    add('-------------------------');
    add('OBS GERAIS:');
    pedido.observacoes
      .split(/\r?\n/)
      .forEach(linha => add(this.sanitizeForPrint(linha)));
    blank();
  }

  add('=========================');
  return linhas.join(os.EOL.repeat(2)); // quebra dupla de linha
}



  async imprimirTexto(texto) {
    if (!this.porta || !this.porta.isOpen) {
      throw new Error('Porta serial não está aberta.');
    }

    const CUT_PAPER = Buffer.from([0x1B, 0x6D]);
    const AUMENTAR_FONTE = Buffer.from([0x1B, 0x57, 0x01]);

    return new Promise((resolve, reject) => {
      try {
        const textoCodificado = iconv.encode(texto + os.EOL.repeat(4), 'win1252');
        const bufferFinal = Buffer.concat([AUMENTAR_FONTE, textoCodificado, CUT_PAPER]);

        this.porta.write(bufferFinal, (err) => {
          if (err) {
            console.error('Erro ao imprimir texto:', err.message);
            reject(err);
          } else {
            this.porta.drain(() => {
              console.log('🖨️ Impressão concluída com sucesso.');
              resolve();
            });
          }
        });
      } catch (erro) {
        console.error('Erro geral na impressão:', erro.message);
        reject(erro);
      }
    });
  }

  async imprimirPedido(pedido) {
    if (!this.porta || !this.porta.isOpen) {
      console.log('Tentando detectar e conectar automaticamente...');
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
            console.log('🔌 Porta serial fechada.');
            resolve();
          }
        });
      });
    }
  }
}

module.exports = PrinterService;
