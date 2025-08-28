#!/usr/bin/env node

/**
 * Script de configuração e teste da impressora Bematech MP-4200 TH
 */

const { SerialPort } = require('serialport');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class PrinterService {
  constructor() {
    this.device = null;
  }

  async listPorts() {
    console.log('\n=== PORTAS SERIAIS DISPONÍVEIS ===');
    try {
      const ports = await SerialPort.list();

      if (ports.length === 0) {
        console.log('Nenhuma porta serial encontrada.');
        return [];
      }

      ports.forEach((port, index) => {
        console.log(`${index + 1}. ${port.path}`);
        if (port.manufacturer) console.log(`   Fabricante: ${port.manufacturer}`);
        if (port.productId) console.log(`   Product ID: ${port.productId}`);
        if (port.vendorId) console.log(`   Vendor ID: ${port.vendorId}`);
        console.log('');
      });

      return ports;
    } catch (error) {
      console.error('Erro ao listar portas:', error.message);
      return [];
    }
  }

  async testConnection(portPath) {
    console.log(`\nTestando conexão na porta: ${portPath}`);

    this.device = new SerialPort({
      path: portPath,
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      autoOpen: false
    });

    return new Promise((resolve, reject) => {
      this.device.open((error) => {
        if (error) {
          console.log(`❌ Falha na conexão: ${error.message}`);
          reject(error);
          return;
        }

        console.log('✅ Conexão estabelecida com sucesso!');
        resolve(true);
      });
    });
  }

  async printTest() {
    if (!this.device || !this.device.isOpen) {
      throw new Error('Impressora não conectada');
    }

    console.log('\nImprimindo teste...');

    return new Promise((resolve, reject) => {
      const now = new Date();
      const date = now.toLocaleDateString('pt-BR');
      const time = now.toLocaleTimeString('pt-BR');

      // Texto básico para imprimir - ajuste conforme seu comando para a Bematech
      const printData = 
        'TESTE DE CONFIGURAÇÃO\n' +
        '====================\n\n' +
        `Data: ${date}\n` +
        `Hora: ${time}\n\n` +
        'Impressora: Bematech MP-4200 TH\n' +
        'Sistema: Restaurante Offline\n\n' +
        'Status da conexão:\n' +
        '✓ Porta serial: OK\n' +
        '✓ Comunicação: OK\n' +
        '✓ Impressão: OK\n\n' +
        'Configurações:\n' +
        '- Baud Rate: 9600\n' +
        '- Data Bits: 8\n' +
        '- Stop Bits: 1\n' +
        '- Parity: None\n\n' +
        '====================\n' +
        'Configuração concluída!\n\n\n' +
        '\x1D\x56\x41'; // Comando ESC/POS para corte parcial (se a impressora suportar)

      this.device.write(printData, (err) => {
        if (err) {
          console.log('❌ Erro na impressão:', err.message);
          reject(err);
          return;
        }

        // Dá um tempo para garantir que tudo foi enviado antes de fechar
        this.device.drain(() => {
          console.log('✅ Teste impresso com sucesso!');
          resolve();
        });
      });
    });
  }

  disconnect() {
    if (this.device && this.device.isOpen) {
      this.device.close((err) => {
        if (err) {
          console.error('Erro ao fechar conexão:', err.message);
        } else {
          console.log('Conexão fechada.');
        }
      });
    }
  }

  async question(prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }

  async run() {
    console.log('🖨️  CONFIGURADOR DE IMPRESSORA BEMATECH MP-4200 TH');
    console.log('================================================');

    try {
      const ports = await this.listPorts();

      if (ports.length === 0) {
        console.log('\nNenhuma porta encontrada. Verifique a conexão da impressora.');
        process.exit(1);
      }

      const portChoice = await this.question('\nDigite o número da porta para testar (ou "q" para sair): ');

      if (portChoice.toLowerCase() === 'q') {
        console.log('Saindo...');
        process.exit(0);
      }

      const portIndex = parseInt(portChoice) - 1;

      if (portIndex < 0 || portIndex >= ports.length) {
        console.log('Opção inválida.');
        process.exit(1);
      }

      const selectedPort = ports[portIndex];

      if (!selectedPort.path) {
        console.error('❌ A porta selecionada não possui caminho válido (path).');
        process.exit(1);
      }

      await this.testConnection(selectedPort.path);

      const printTest = await this.question('\nDeseja fazer um teste de impressão? (s/n): ');

      if (printTest.toLowerCase() === 's' || printTest.toLowerCase() === 'sim') {
        await this.printTest();
      }

      console.log('\n✅ Configuração concluída!');
      console.log(`\nPara usar no sistema, configure a porta: ${selectedPort.path}`);
      console.log('\nDicas para o sistema em produção:');
      console.log('- Anote a porta que funcionou para configurar no sistema');
      console.log('- Mantenha a impressora sempre ligada');
      console.log('- Verifique se o papel térmico está carregado corretamente');
      console.log('- Em caso de problemas, execute este script novamente');

    } catch (error) {
      console.error('\n❌ Erro durante a configuração:', error.message);
    } finally {
      this.disconnect();
      rl.close();
    }
  }
}

if (require.main === module) {
  const setup = new PrinterService();
  setup.run().catch(console.error);
}

module.exports = PrinterService;
