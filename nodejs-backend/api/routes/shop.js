
const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const dbpool = require('../../dbpool');

// ค้นหาสินค้าจากรายละเอียดและช่วงราคา ลองใช้ get ดูเพราะเห็นค้นหาเขาส่ง ผ่าน url กัน
router.get('/search', (req, res) => {
    const data = req.query;

    let sql = `SELECT * FROM product WHERE 
               product_name LIKE ? 
               AND price BETWEEN ? AND ?`;

    sql = mysql.format(sql, [`%${data.keyword}%`, data.minPrice, data.maxPrice]);

    dbpool.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        res.status(200).json(results);
    });
});


// เพิ่มสินค้าไปยังรถเข็น
router.post('/addcart', (req, res) => {
    const data = req.body;

    // ตรวจสอบว่ามีรถเข็นชื่อนี้ของลูกค้าหรือไม่
    let findCartSql = `SELECT * FROM cart WHERE customer_id = ? AND cart_name = ?`;
    dbpool.query(mysql.format(findCartSql, [data.customer_id, data.cart_name]), (err, cartResult) => {
        if (err) return res.status(500).json({ message: 'Database error' });

        if (cartResult.length === 0) {
            // ยังไม่มีรถเข็น ให้สร้างใหม่
            let createCartSql = `INSERT INTO cart (customer_id, cart_name) VALUES (?, ?)`;
            dbpool.query(mysql.format(createCartSql, [data.customer_id, data.cart_name]), (err, insertResult) => {
                if (err) return res.status(500).json({ message: 'Cannot create cart' });
                const newCartId = insertResult.insertId;
                return additem(newCartId);
            });
        } else {
            const existingCartId = cartResult[0].cart_id;
            return additem(existingCartId);
        }
    });

    // ฟังก์ชันย่อยเพิ่มหรืออัปเดตสินค้าลงในรถเข็น 
    function additem(cart_id) {
        let check = `SELECT * FROM cart_item WHERE cart_id = ? AND product_id = ?`;
        dbpool.query(mysql.format(check, [cart_id, data.product_id]), (err, itemResult) => {
            if (err) return res.status(500).json({ message: 'Database error' });

            if (itemResult.length > 0) {
                // สินค้ามีอยู่แล้วในรถเข็น เพิ่มจำนวน
                let update = `UPDATE cart_item SET quantity = quantity + ? WHERE cart_id = ? AND product_id = ?`;
                dbpool.query(mysql.format(update, [data.quantity, cart_id, data.product_id]), (err) => {
                    if (err) return res.status(500).json({ message: 'Cannot update item quantity' });
                    res.status(200).json({ message: 'Item quantity updated in cart' });
                });
            } else {
                // สินค้ายังไม่มีในรถเข็น เพิ่มใหม่
                let INSERT = `INSERT INTO cart_item (cart_id, product_id, quantity) VALUES (?, ?, ?)`;
                dbpool.query(mysql.format(INSERT, [cart_id, data.product_id, data.quantity]), (err) => {
                    if (err) return res.status(500).json({ message: 'Cannot add item to cart' });
                    res.status(200).json({ message: 'Item added to cart' });
                });
            }
        });
    }
});

router.post('/carts', (req, res) => {
    const data = req.body;


    const sql = `
        SELECT 
            c.cart_id,
            c.cart_name,
            ci.cart_item_id,
            p.product_id,
            p.product_name,
            p.description,
            p.price,
            ci.quantity,
            (p.price * ci.quantity) AS total_price
        FROM cart c
        LEFT JOIN cart_item ci ON c.cart_id = ci.cart_id
        LEFT JOIN product p ON ci.product_id = p.product_id
        WHERE c.customer_id = ?
        ORDER BY c.cart_id, ci.cart_item_id
    `;

    dbpool.query(sql, [data.customer_id], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });

        // รวมข้อมูลให้ดูง่าย (จัดกลุ่มตามรถเข็น) ใช้ ai จัดให้มันสวยจัดเองแล้วมันไม่สวย
        const carts = {};
        results.forEach(row => {
            if (!carts[row.cart_id]) {
                carts[row.cart_id] = {
                    cart_id: row.cart_id,
                    cart_name: row.cart_name,
                    items: []
                };
            }
            if (row.cart_item_id) {
                carts[row.cart_id].items.push({
                    cart_item_id: row.cart_item_id,
                    product_id: row.product_id,
                    product_name: row.product_name,
                    description: row.description,
                    price: row.price,
                    quantity: row.quantity,
                    total_price: row.total_price
                });
            }
        });
        //จัดเสร็จส่งออกไปแสดง 
        res.status(200).json(Object.values(carts));
    });
});


module.exports = router;
