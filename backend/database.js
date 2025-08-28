const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, 'restaurante.db');
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Erro ao conectar com o banco de dados:', err);
          reject(err);
        } else {
          console.log('Conectado ao banco de dados SQLite');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const createPedidosTable = `
        CREATE TABLE IF NOT EXISTS pedidos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mesa INTEGER NOT NULL,
          itens TEXT NOT NULL,
          observacoes TEXT,
          status TEXT DEFAULT 'pendente',
          data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createItensTable = `
        CREATE TABLE IF NOT EXISTS itens_menu (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          preco REAL NOT NULL,
          categoria TEXT,
          disponivel BOOLEAN DEFAULT 1,
          data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      this.db.serialize(() => {
        this.db.run(createPedidosTable, (err) => {
          if (err) {
            console.error('Erro ao criar tabela pedidos:', err);
            reject(err);
            return;
          }
        });

        this.db.run(createItensTable, (err) => {
          if (err) {
            console.error('Erro ao criar tabela itens_menu:', err);
            reject(err);
            return;
          }
        });

        // Inserir alguns itens de exemplo se a tabela estiver vazia
        this.db.get("SELECT COUNT(*) as count FROM itens_menu", (err, row) => {
          if (err) {
            console.error('Erro ao verificar itens do menu:', err);
            reject(err);
            return;
          }

          if (row.count === 0) {
            this.insertSampleMenuItems().then(() => {
              console.log('Tabelas criadas e itens de exemplo inseridos');
              resolve();
            }).catch(reject);
          } else {
            console.log('Tabelas criadas');
            resolve();
          }
        });
      });
    });
  }

  async insertSampleMenuItems() {
    const sampleItems = [
      { nome: 'Prato do Dia', preco: 21.90, categoria: 'Almoço' },
      { nome: 'Executivo de Boi', preco: 29.90, categoria: 'Almoço' },
      { nome: 'Executivo de Frango', preco: 23.90, categoria: 'Almoço' },
      { nome: 'Executivo de Porco', preco: 23.90, categoria: 'Almoço' },
      { nome: 'Refrigerante Lata', preco: 5.00, categoria: 'Bebidas' },
      { nome: 'Suco DelVale', preco: 5.00, categoria: 'Bebidas' },
      { nome: 'Água Mineral', preco: 3.00, categoria: 'Bebidas' },
      { nome: 'Com Gás', preco: 4.00, categoria: 'Bebidas' }
    ];

    const promises = sampleItems.map(item => this.insertMenuItem(item));
    return Promise.all(promises);
  }

  async insertMenuItem(item) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO itens_menu (nome, preco, categoria) VALUES (?, ?, ?)`;
      this.db.run(sql, [item.nome, item.preco, item.categoria], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

 async createPedido(mesa, itens, observacoes = '') {
  return new Promise((resolve, reject) => {
    const itensJson = JSON.stringify(itens);
    const sql = `INSERT INTO pedidos (mesa, itens, observacoes) VALUES (?, ?, ?)`;
    const db = this.db; // salvar referência do db

    db.run(sql, [mesa, itensJson, observacoes], function(err) {
      if (err) {
        reject(err);
      } else {
        const pedidoId = this.lastID; // this aqui é do callback run e tem lastID
        const selectSql = `SELECT * FROM pedidos WHERE id = ?`;
        db.get(selectSql, [pedidoId], (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            row.itens = JSON.parse(row.itens);
            resolve(row);
          } else {
            reject(new Error('Pedido não encontrado após criação'));
          }
        });
      }
    });
  });
}

  async getAllPedidos() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM pedidos ORDER BY data_criacao DESC`;
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parse dos itens JSON para cada pedido
          const pedidos = rows.map(row => ({
            ...row,
            itens: JSON.parse(row.itens)
          }));
          resolve(pedidos);
        }
      });
    });
  }

  async getPedidoById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM pedidos WHERE id = ?`;
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          row.itens = JSON.parse(row.itens);
          resolve(row);
        } else {
          resolve(null);
        }
      });
    });
  }

  async updatePedidoStatus(id, status) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE pedidos SET status = ?, data_atualizacao = CURRENT_TIMESTAMP WHERE id = ?`;
      this.db.run(sql, [status, id], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          resolve(null);
        } else {
          // Buscar o pedido atualizado
          const selectSql = `SELECT * FROM pedidos WHERE id = ?`;
          this.db.get(selectSql, [id], (err, row) => {
            if (err) {
              reject(err);
            } else if (row) {
              row.itens = JSON.parse(row.itens);
              resolve(row);
            } else {
              resolve(null);
            }
          });
        }
      }.bind(this));
    });
  }

  async getMenuItems() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM itens_menu WHERE disponivel = 1 ORDER BY categoria, nome`;
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Conexão com banco de dados fechada');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = Database;

