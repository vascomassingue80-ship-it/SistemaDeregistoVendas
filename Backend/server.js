const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com PostgreSQL
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// --- INICIALIZAÇÃO DO BANCO (POSTGRESQL) ---
async function initDB() {
    try {
        await db.query(`CREATE TABLE IF NOT EXISTS produtos (
            id SERIAL PRIMARY KEY,
            nome TEXT,
            preco REAL,
            stock INTEGER,
            categoria TEXT,
            emoji TEXT
        )`);

        await db.query(`CREATE TABLE IF NOT EXISTS vendas (
            id SERIAL PRIMARY KEY,
            data_venda TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total REAL,
            pago REAL,
            troco REAL
        )`);

        await db.query(`CREATE TABLE IF NOT EXISTS itens_venda (
            venda_id INTEGER REFERENCES vendas(id),
            produto_id INTEGER REFERENCES produtos(id),
            quantidade INTEGER,
            preco_unitario REAL
        )`);

        const res = await db.query("SELECT count(*) FROM produtos");
        if (parseInt(res.rows[0].count) === 0) {
            await db.query("INSERT INTO produtos (nome, preco, stock, categoria, emoji) VALUES ($1, $2, $3, $4, $5)", ["Arroz 5kg", 350.00, 50, "Mercearia", "🍚"]);
            await db.query("INSERT INTO produtos (nome, preco, stock, categoria, emoji) VALUES ($1, $2, $3, $4, $5)", ["Óleo 1L", 145.00, 30, "Mercearia", "🍶"]);
            console.log("Dados iniciais inseridos.");
        }
    } catch (err) {
        console.error("Erro ao inicializar banco:", err);
    }
}
initDB();

// --- ROTAS API ---

app.get('/api/produtos', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM produtos WHERE stock > 0");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/venda', async (req, res) => {
    const { carrinho, total, pago, troco } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');
        const vendaRes = await client.query(
            "INSERT INTO vendas (total, pago, troco) VALUES ($1, $2, $3) RETURNING id",
            [total, pago, troco]
        );
        const vendaId = vendaRes.rows[0].id;

        for (const item of carrinho) {
            await client.query(
                "INSERT INTO itens_venda (venda_id, produto_id, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)",
                [vendaId, item.id, item.qty, item.price]
            );
            await client.query(
                "UPDATE produtos SET stock = stock - $1 WHERE id = $2",
                [item.qty, item.id]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, vendaId });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: "Erro na transação" });
    } finally {
        client.release();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));