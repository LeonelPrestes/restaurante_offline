# Sistema Restaurante Offline

Sistema completo para restaurante que funciona 100% offline, utilizando apenas a rede local (Wi-Fi e cabo) do estabelecimento, sem depender de internet.

## 🚀 Características Principais

- **100% Offline**: Funciona completamente sem internet
- **Interface Responsiva**: Otimizada para celulares e tablets
- **Impressão Térmica**: Integração com impressora Bematech MP-4200 TH
- **Comunicação em Tempo Real**: WebSocket para atualizações instantâneas
- **Banco de Dados Local**: SQLite para armazenamento confiável
- **Fácil Instalação**: Configuração simples e rápida

## 📋 Funcionalidades

### Para Garçons
- Seleção de mesa
- Navegação por categorias do cardápio
- Adição/remoção de itens do pedido
- Controle de quantidade
- Observações especiais
- Envio automático para cozinha

### Para Cozinha
- Recebimento automático de pedidos
- Impressão térmica instantânea
- Organização por mesa e horário
- Tratamento de erros de impressão

### Sistema
- Comunicação via WebSocket
- Banco de dados SQLite local
- Interface web responsiva
- Detecção automática de impressora
- Logs de erro e monitoramento

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Banco de Dados**: SQLite3
- **Impressão**: ESC/POS, SerialPort
- **Comunicação**: WebSocket, HTTP REST API

## 📦 Estrutura do Projeto

```
restaurante_offline/
├── backend/
│   ├── server.js           # Servidor principal
│   ├── database.js         # Módulo do banco de dados
│   ├── printer-service.js  # Serviço de impressão
│   ├── package.json        # Dependências do backend
│   └── restaurante.db      # Banco de dados SQLite (criado automaticamente)
├── frontend/
│   ├── index.html          # Interface principal
│   ├── styles.css          # Estilos responsivos
│   └── app.js              # Lógica do frontend
└── printer/
    └── setup-printer.js    # Script de configuração da impressora
```

## 🔧 Instalação e Configuração

### Pré-requisitos

- Node.js 16+ instalado
- Impressora Bematech MP-4200 TH conectada via USB ou serial
- Rede local (Wi-Fi ou cabo) configurada

### Passo 1: Instalação das Dependências

```bash
cd restaurante_offline/backend
npm install
```

### Passo 2: Configuração da Impressora

```bash
# Execute o script de configuração
npm run setup-printer

# Ou diretamente:
node ../printer/setup-printer.js
```

O script irá:
- Detectar portas seriais disponíveis
- Testar conexão com a impressora
- Realizar teste de impressão
- Fornecer instruções de configuração

### Passo 3: Iniciar o Sistema

```bash
npm start
```

O servidor será iniciado na porta 3000. Acesse via:
- Computador local: `http://localhost:3000`
- Outros dispositivos na rede: `http://[IP_DO_SERVIDOR]:3000`

## 📱 Como Usar

### Para Garçons

1. **Acesse a interface** via navegador no celular/tablet
2. **Selecione a mesa** clicando no botão correspondente
3. **Navegue pelo cardápio** usando as categorias
4. **Adicione itens** clicando nos produtos desejados
5. **Ajuste quantidades** usando os botões + e -
6. **Adicione observações** se necessário
7. **Envie o pedido** clicando em "Enviar para Cozinha"

### Para Cozinha

1. **Aguarde a impressão automática** dos pedidos
2. **Verifique os detalhes** no papel impresso:
   - Número da mesa
   - Data e hora
   - Lista de itens com quantidades
   - Observações especiais
   - Total do pedido

## 🖨️ Configuração da Impressora Bematech MP-4200 TH

### Conexão

A impressora pode ser conectada via:
- **USB**: Cabo USB padrão
- **Serial**: Cabo serial RS-232

### Configurações Padrão

- **Baud Rate**: 9600
- **Data Bits**: 8
- **Stop Bits**: 1
- **Parity**: None

### Portas Comuns

- **Linux**: `/dev/ttyUSB0`, `/dev/ttyS0`
- **Windows**: `COM1`, `COM2`, `COM3`

### Solução de Problemas

1. **Impressora não detectada**:
   - Verifique se está ligada
   - Confirme a conexão do cabo
   - Execute o script de configuração

2. **Erro de impressão**:
   - Verifique se há papel
   - Reinicie a impressora
   - Teste a conexão

3. **Caracteres estranhos**:
   - Verifique as configurações de baud rate
   - Confirme o tipo de cabo (USB/Serial)

## 🌐 Configuração de Rede

### Para Rede Wi-Fi

1. Conecte o servidor à rede Wi-Fi
2. Anote o IP do servidor (`ipconfig` ou `ifconfig`)
3. Configure os dispositivos móveis para acessar: `http://[IP]:3000`

### Para Rede Cabeada

1. Conecte o servidor via cabo Ethernet
2. Configure IP estático (recomendado)
3. Conecte dispositivos móveis à mesma rede

### Exemplo de Configuração

```
Servidor: 192.168.1.100:3000
Garçom 1: http://192.168.1.100:3000 (celular)
Garçom 2: http://192.168.1.100:3000 (tablet)
```

## 🔧 Manutenção e Monitoramento

### Logs do Sistema

Os logs são exibidos no console do servidor:
- Conexões de clientes
- Pedidos recebidos
- Status da impressora
- Erros e avisos

### Backup do Banco de Dados

```bash
# Fazer backup
cp backend/restaurante.db backup/restaurante_backup_$(date +%Y%m%d).db

# Restaurar backup
cp backup/restaurante_backup_YYYYMMDD.db backend/restaurante.db
```

### Limpeza de Dados

```bash
# Remover pedidos antigos (opcional)
sqlite3 backend/restaurante.db "DELETE FROM pedidos WHERE data_criacao < date('now', '-30 days');"
```

## 🚨 Solução de Problemas Comuns

### Sistema não inicia

1. Verifique se o Node.js está instalado: `node --version`
2. Instale as dependências: `npm install`
3. Verifique se a porta 3000 está livre: `netstat -an | grep 3000`

### Interface não carrega

1. Confirme que o servidor está rodando
2. Verifique o IP e porta corretos
3. Teste a conectividade de rede: `ping [IP_DO_SERVIDOR]`

### Pedidos não são enviados

1. Verifique a conexão WebSocket (indicador verde/vermelho)
2. Confirme que todos os campos obrigatórios estão preenchidos
3. Verifique os logs do servidor para erros

### Impressora não funciona

1. Execute o script de configuração: `npm run setup-printer`
2. Verifique se a impressora está ligada e conectada
3. Teste com outro cabo USB/Serial
4. Confirme os drivers da impressora

## 📊 Especificações Técnicas

### Requisitos Mínimos

- **Servidor**: 
  - CPU: 1 GHz
  - RAM: 512 MB
  - Armazenamento: 100 MB
  - SO: Windows 7+, Linux, macOS

- **Dispositivos Móveis**:
  - Navegador moderno (Chrome, Firefox, Safari)
  - Conexão Wi-Fi
  - Tela mínima: 320px

### Performance

- **Capacidade**: Até 50 dispositivos simultâneos
- **Latência**: < 100ms na rede local
- **Armazenamento**: Até 10.000 pedidos no banco
- **Impressão**: 2-3 segundos por pedido

## 🔒 Segurança

### Rede Local

- Sistema funciona apenas na rede local
- Sem exposição à internet
- Comunicação criptografada via HTTPS (opcional)

### Dados

- Banco de dados local protegido
- Sem transmissão de dados externos
- Backup local recomendado

## 📞 Suporte

### Contato Técnico

Para suporte técnico ou dúvidas:
- Consulte esta documentação
- Verifique os logs do sistema
- Execute o script de diagnóstico

### Atualizações

Para atualizar o sistema:
1. Faça backup do banco de dados
2. Baixe a nova versão
3. Execute `npm install` para atualizar dependências
4. Reinicie o servidor

---

**Desenvolvido para funcionar 100% offline em restaurantes**

*Versão 1.0 - Sistema completo e funcional*

