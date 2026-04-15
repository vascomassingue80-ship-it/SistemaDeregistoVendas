const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        username TEXT,
        password TEXT,
        name TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT,
        price REAL,
        barcode TEXT,
        stock INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY,
        total REAL,
        date TEXT,
        user TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY,
        sale_id INTEGER,
        product_id INTEGER,
        qtd INTEGER,
        price REAL
    )`);
});

db.run("INSERT INTO users (username,password,name) VALUES ('vasco','1234','Vasco')");

module.exports = db;