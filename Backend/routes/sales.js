const express = require('express');
const router = express.Router();
const db = require('../models/db');

router.post('/', (req, res) => {
    const { items, user } = req.body;

    let total = 0;
    items.forEach(i => total += i.price * i.qtd);

    db.run(
        "INSERT INTO sales (total, date, user) VALUES (?,?,?)",
        [total, new Date(), user],
        function () {

            const saleId = this.lastID;

            items.forEach(i => {
                db.run(
                    "INSERT INTO sale_items (sale_id, product_id, qtd, price) VALUES (?,?,?,?)",
                    [saleId, i.id, i.qtd, i.price]
                );

                db.run(
                    "UPDATE products SET stock = stock - ? WHERE id=?",
                    [i.qtd, i.id]
                );
            });

            res.json({ id: saleId, total });
        }
    );
});

module.exports = router;