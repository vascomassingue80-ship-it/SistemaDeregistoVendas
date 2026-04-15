const express = require('express');
const cors = require('cors');
const app = express();

// IMPORTANTE: Isto permite que o seu navegador aceite dados do localhost:3000
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST']
}));
app.use(express.json());

const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const db = new sqlite3.Database('./supermercado.db');

app.use(cors());
app.use(bodyParser.json());

// --- INICIALIZAÇÃO DO BANCO DE DADOS ---
db.serialize(() => {
    // Tabela de Produtos
    db.run(`CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        preco REAL,
        stock INTEGER,
        categoria TEXT,
        emoji TEXT
    )`);

    // Tabela de Vendas (Cabeçalho)
    db.run(`CREATE TABLE IF NOT EXISTS vendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
        total REAL,
        pago REAL,
        troco REAL
    )`);

    // Tabela de Itens da Venda (Detalhes)
    db.run(`CREATE TABLE IF NOT EXISTS itens_venda (
        venda_id INTEGER,
        produto_id INTEGER,
        quantidade INTEGER,
        preco_unitario REAL,
        FOREIGN KEY(venda_id) REFERENCES vendas(id)
    )`);

    // Inserir dados de teste se a tabela estiver vazia
    db.get("SELECT count(*) as count FROM produtos", (err, row) => {
        if (row.count === 0) {
            const stmt = db.prepare("INSERT INTO produtos (nome, preco, stock, categoria, emoji) VALUES (?, ?, ?, ?, ?)");
            stmt.run("Arroz 5kg", 350.00, 50, "Mercearia", "🍚");
            stmt.run("Óleo 1L", 145.00, 30, "Mercearia", "🍶");
            stmt.run("Cerveja 2M", 65.00, 100, "Bebidas", "🍺");
            stmt.finalize();
        }
    });
});

// --- ROTAS API ---

// 1. Listar todos os produtos
app.get('/api/produtos', (req, res) => {
    db.all("SELECT * FROM produtos WHERE stock > 0", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. Processar Venda (Transação completa)
app.post('/api/venda', (req, res) => {
    const { carrinho, total, pago, troco } = req.body;

    if (!carrinho || carrinho.length === 0) {
        return res.status(400).json({ error: "Carrinho vazio" });
    }

    // Iniciar Transação Manual
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        const stmtVenda = db.prepare("INSERT INTO vendas (total, pago, troco) VALUES (?, ?, ?)");
        stmtVenda.run(total, pago, troco, function(err) {
            if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ error: "Erro ao salvar venda" });
            }

            const vendaId = this.lastID;
            const stmtItem = db.prepare("INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)");
            const stmtStock = db.prepare("UPDATE produtos SET stock = stock - ? WHERE id = ?");

            carrinho.forEach(item => {
                stmtItem.run(vendaId, item.id, item.qty, item.price);
                stmtStock.run(item.qty, item.id);
            });

            stmtItem.finalize();
            stmtStock.finalize();
            
            db.run("COMMIT", (err) => {
                if (err) return res.status(500).json({ error: "Erro no commit" });
                res.json({ success: true, vendaId: vendaId });
            });
        });
    });
});

// 3. Relatório de Vendas (Para o Dashboard)
app.get('/api/relatorios', (req, res) => {
    db.all("SELECT * FROM vendas ORDER BY data_venda DESC LIMIT 10", (err, rows) => {
        res.json(rows);
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
