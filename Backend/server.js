const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose(); // Mudamos para SQLite

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com o arquivo SQLite que você enviou
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error("Erro ao abrir banco:", err.message);
    else console.log("Conectado ao banco de dados SQLite.");
});

// --- ROTAS API ---
app.get('/api/produtos', (req, res) => {
    // No SQLite usamos db.all em vez de db.query
    db.all("SELECT * FROM products WHERE stock > 0", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/venda', (req, res) => {
    const { carrinho, total } = req.body;
    
    // Inserir a venda
    db.run("INSERT INTO sales (total, date) VALUES (?, datetime('now'))", [total], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        const vendaId = this.lastID;
        const stmt = db.prepare("INSERT INTO sale_items (sale_id, product_id, qtd, price) VALUES (?, ?, ?, ?)");
        
        carrinho.forEach(item => {
            stmt.run(vendaId, item.id, item.qty, item.price);
            // Atualiza estoque
            db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [item.qty, item.id]);
        });
        
        stmt.finalize();
        res.json({ success: true, vendaId });
    });
});

app.use(express.static(path.join(__dirname, '../Frontend')));

// 2. Define a rota principal "/" explicitamente
app.get('/', (req, res) => {
    const caminhoHtml = path.join(__dirname, '../Frontend/Sistema.html');
    res.sendFile(caminhoHtml);
});

// 3. Rota de captura para qualquer outra página (Splat para Express 5)
app.get('/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/Sistema.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));