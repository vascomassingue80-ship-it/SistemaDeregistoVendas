const express = require('express');
const router = express.Router();
const db = require('../models/db');

let sessions = {};

router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE username=? AND password=?",
        [username, password],
        (err, user) => {
            if (!user) return res.status(401).json({ error: "Login inválido" });

            const token = Math.random().toString(36);
            sessions[token] = user;

            res.json({ token, name: user.name });
        }
    );
});

module.exports = { router, sessions };