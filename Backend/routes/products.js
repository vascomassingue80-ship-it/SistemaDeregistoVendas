const express = require('express');
const router = express.Router();
const db = require('../models/db');

router.get('/', (req, res) => {
    db.all("SELECT * FROM products", [], (err, rows) => {
        res.json(rows);
    });
});

router.get('/:barcode', (req, res) => {
    db.get(
        "SELECT * FROM products WHERE barcode=?",
        [req.params.barcode],
        (err, row) => {
            if (!row) return res.status(404).json({ error: "Não encontrado" });
            res.json(row);
        }
    );
});

router.post('/', (req, res) => {
    const { name, price, barcode, stock } = req.body;

    db.run(
        "INSERT INTO products (name, price, barcode, stock) VALUES (?,?,?,?)",
        [name, price, barcode, stock],
        function () {
            res.json({ id: this.lastID });
        }
    );
});

module.exports = router;