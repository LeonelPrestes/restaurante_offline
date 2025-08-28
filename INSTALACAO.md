# Guia de Instalação - Sistema Restaurante Offline

Este guia fornece instruções passo a passo para instalar e configurar o sistema de restaurante offline.

## 📋 Checklist Pré-Instalação

Antes de começar, certifique-se de ter:

- [ ] Computador para servidor (Windows, Linux ou macOS)
- [ ] Impressora Bematech MP-4200 TH
- [ ] Cabo USB ou Serial para impressora
- [ ] Roteador Wi-Fi ou switch de rede
- [ ] Dispositivos móveis (celulares/tablets) para garçons
- [ ] Acesso administrativo ao computador servidor

## 🖥️ Instalação do Servidor

### Passo 1: Instalar Node.js

#### Windows
1. Acesse [nodejs.org](https://nodejs.org)
2. Baixe a versão LTS (recomendada)
3. Execute o instalador e siga as instruções
4. Abra o Prompt de Comando e teste: `node --version`

#### Linux (Ubuntu/Debian)
```bash
# Atualizar repositórios
sudo apt update

# Instalar Node.js
sudo apt install nodejs npm

# Verificar instalação
node --version
npm --version
```

#### macOS
```bash
# Usando Homebrew
brew install node

# Verificar instalação
node --version
npm --version
```

### Passo 2: Baixar o Sistema

1. Extraia os arquivos do sistema em uma pasta, por exemplo:
   - Windows: `C:\restaurante_offline\`
   - Linux/macOS: `/home/usuario/restaurante_offline/`

### Passo 3: Instalar Dependências

```bash
# Navegar para a pasta do backend
cd restaurante_offline/backend

# Instalar dependências
npm install
```

**Aguarde a instalação concluir** (pode levar alguns minutos na primeira vez).

## 🖨️ Configuração da Impressora

### Passo 1: Conectar a Impressora

1. **Conexão USB**:
   - Conecte o cabo USB da impressora ao computador
   - Ligue a impressora
   - Aguarde o sistema reconhecer o dispositivo

2. **Conexão Serial**:
   - Conecte o cabo serial (RS-232)
   - Configure a porta serial no sistema
   - Ligue a impressora

### Passo 2: Instalar Drivers (se necessário)

#### Windows
1. Baixe os drivers da Bematech no site oficial
2. Execute o instalador dos drivers
3. Reinicie o computador se solicitado

#### Linux
```bash
# Adicionar usuário ao grupo dialout (para acesso serial)
sudo usermod -a -G dialout $USER

# Reiniciar sessão ou executar:
newgrp dialout
```

### Passo 3: Testar a Impressora

```bash
# Na pasta do backend
npm run setup-printer
```

O script irá:
1. Detectar portas disponíveis
2. Testar conexão com a impressora
3. Imprimir uma página de teste
4. Fornecer informações de configuração

**Exemplo de saída esperada:**
```
🖨️  CONFIGURADOR DE IMPRESSORA BEMATECH MP-4200 TH
================================================

=== PORTAS SERIAIS DISPONÍVEIS ===
1. /dev/ttyUSB0
2. COM3

Digite o número da porta para testar: 1

Testando conexão na porta: /dev/ttyUSB0
✅ Conexão estabelecida com sucesso!

Deseja fazer um teste de impressão? (s/n): s
Imprimindo teste...
✅ Teste impresso com sucesso!

✅ Configuração concluída!
Para usar no sistema, configure a porta: /dev/ttyUSB0
```

## 🌐 Configuração de Rede

### Opção 1: Rede Wi-Fi Existente

1. **Conectar o servidor à rede Wi-Fi**:
   ```bash
   # Linux - descobrir IP
   ip addr show
   
   # Windows - descobrir IP
   ipconfig
   
   # macOS - descobrir IP
   ifconfig
   ```

2. **Anotar o IP do servidor** (exemplo: `192.168.1.100`)

3. **Testar conectividade**:
   ```bash
   # Testar se o servidor está acessível
   ping 192.168.1.100
   ```

### Opção 2: Rede Cabeada

1. **Conectar cabo Ethernet** ao servidor
2. **Configurar IP estático** (recomendado):

#### Windows
1. Painel de Controle → Rede e Internet → Central de Rede
2. Alterar configurações do adaptador
3. Propriedades da conexão Ethernet
4. Protocolo TCP/IPv4 → Propriedades
5. Configurar:
   - IP: `192.168.1.100`
   - Máscara: `255.255.255.0`
   - Gateway: `192.168.1.1`

#### Linux
```bash
# Editar configuração de rede
sudo nano /etc/netplan/01-netcfg.yaml

# Adicionar configuração:
network:
  version: 2
  ethernets:
    eth0:
      addresses: [192.168.1.100/24]
      gateway4: 192.168.1.1

# Aplicar configuração
sudo netplan apply
```

### Opção 3: Criar Rede Própria

1. **Configurar roteador dedicado**:
   - SSID: `RestauranteWiFi`
   - Senha: `restaurante123`
   - Faixa IP: `192.168.1.x`

2. **Conectar servidor ao roteador**
3. **Configurar IP estático**: `192.168.1.100`

## 🚀 Inicialização do Sistema

### Passo 1: Iniciar o Servidor

```bash
# Na pasta do backend
cd restaurante_offline/backend
npm start
```

**Saída esperada:**
```
Conectado ao banco de dados SQLite
Tabelas criadas
Banco de dados inicializado
Servidor rodando na porta 3000
Acesse: http://localhost:3000
```

### Passo 2: Testar Localmente

1. Abra o navegador
2. Acesse: `http://localhost:3000`
3. Verifique se a interface carrega corretamente
4. Teste seleção de mesa e adição de itens

### Passo 3: Testar na Rede

1. **De outro dispositivo na mesma rede**:
   - Acesse: `http://192.168.1.100:3000` (substitua pelo IP real)
   - Teste todas as funcionalidades

2. **Teste de impressão**:
   - Faça um pedido completo
   - Verifique se imprime automaticamente

## 📱 Configuração dos Dispositivos Móveis

### Para cada celular/tablet dos garçons:

1. **Conectar à rede Wi-Fi** do restaurante
2. **Abrir navegador** (Chrome, Firefox, Safari)
3. **Acessar**: `http://[IP_DO_SERVIDOR]:3000`
4. **Adicionar à tela inicial** (opcional):
   - Chrome: Menu → Adicionar à tela inicial
   - Safari: Compartilhar → Adicionar à tela de início

### Configurações Recomendadas

- **Manter tela ligada** durante o expediente
- **Desabilitar modo economia** de energia
- **Configurar Wi-Fi** para não desconectar automaticamente
- **Testar conectividade** regularmente

## 🔧 Configuração Avançada

### Executar como Serviço (Linux)

1. **Criar arquivo de serviço**:
```bash
sudo nano /etc/systemd/system/restaurante.service
```

2. **Adicionar configuração**:
```ini
[Unit]
Description=Sistema Restaurante Offline
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/restaurante_offline/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

3. **Ativar serviço**:
```bash
sudo systemctl enable restaurante
sudo systemctl start restaurante
sudo systemctl status restaurante
```

### Executar como Serviço (Windows)

1. **Instalar PM2**:
```cmd
npm install -g pm2
npm install -g pm2-windows-service
```

2. **Configurar serviço**:
```cmd
pm2 start server.js --name "restaurante"
pm2 save
pm2-service-install
```

### Configurar Firewall

#### Windows
```cmd
# Permitir porta 3000
netsh advfirewall firewall add rule name="Restaurante" dir=in action=allow protocol=TCP localport=3000
```

#### Linux
```bash
# UFW
sudo ufw allow 3000

# iptables
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
```

## 🔍 Verificação da Instalação

### Checklist Final

- [ ] Node.js instalado e funcionando
- [ ] Dependências instaladas sem erros
- [ ] Impressora detectada e testada
- [ ] Servidor iniciando sem erros
- [ ] Interface acessível localmente
- [ ] Interface acessível na rede
- [ ] Dispositivos móveis conectados
- [ ] Teste de pedido completo realizado
- [ ] Impressão funcionando corretamente

### Comandos de Diagnóstico

```bash
# Verificar versão do Node.js
node --version

# Verificar se o servidor está rodando
netstat -an | grep 3000

# Testar conectividade
curl http://localhost:3000/api/menu

# Verificar logs do sistema
tail -f /var/log/syslog | grep restaurante
```

## 🆘 Solução de Problemas

### Erro: "Cannot find module"
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Port 3000 already in use"
```bash
# Encontrar processo usando a porta
lsof -i :3000

# Matar processo
kill -9 [PID]

# Ou usar porta diferente
PORT=3001 npm start
```

### Erro: "Permission denied" (Linux)
```bash
# Dar permissões corretas
sudo chown -R $USER:$USER restaurante_offline/
chmod +x restaurante_offline/printer/setup-printer.js
```

### Impressora não detectada
1. Verificar conexão física
2. Reinstalar drivers
3. Testar com outro cabo
4. Verificar configurações de porta

## 📞 Suporte Pós-Instalação

### Manutenção Regular

- **Backup semanal** do banco de dados
- **Verificação mensal** da impressora
- **Limpeza trimestral** de dados antigos
- **Atualização anual** do sistema

### Monitoramento

- Verificar logs diariamente
- Testar conectividade dos dispositivos
- Monitorar espaço em disco
- Verificar status da impressora

---

**Instalação concluída com sucesso!**

*Para suporte adicional, consulte o arquivo README.md ou os logs do sistema.*

