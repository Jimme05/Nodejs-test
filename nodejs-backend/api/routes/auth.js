
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const mysql = require('mysql')
const dbpool = require('../../dbpool');



router.post('/login', (req, res) => {
    const Data = req.body;


    let sql = 'SELECT * FROM customer WHERE email = ?';
    sql = mysql.format(sql, [Data.email]);

    dbpool.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = results[0];

        // ตรวจสอบรหัสผ่านที่ hash 
        bcrypt.compare(Data.password, user.password, (err, isMatch) => {

            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // ไม่ส่ง pwd กลับ ลบการแสดง pwd ที่ส่งมาออก
            delete user.password;

            res.status(200).json({
                message: 'Login successful',
                user: user
            });
        });
    });
});


router.post('/register', (req, res) => {
    let bodyData = req.body;
    // hash ช่อง pwd ไว้อันแรกแล้วก็ส่งข้อมูลไป
    bcrypt.hash(bodyData.password, 10, (err, hashedPassword) => {

        let sql = 'INSERT INTO customer (first_name, last_name, email, password, phone_number, address) VALUES (?, ?, ?, ?, ?, ?)';
        sql = mysql.format(sql, [
            bodyData.first_name,
            bodyData.last_name,
            bodyData.email,
            hashedPassword,
            bodyData.phone_number,
            bodyData.address
        ]);

        dbpool.query(sql, (error, results) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err });
            if (results.affectedRows === 1) {
                res.status(201).json({ message: 'Registration successful' });
            }
        });
    });
});


router.post('/change-pwd', (req, res) => {
    const Data = req.body; 
    // เช็ค email 
    let sql = 'SELECT * FROM customer WHERE email = ?';
    sql = mysql.format(sql, [Data.email]);

    dbpool.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error', error: err });
        if (results.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = results[0];

        // ตรวจสอบรหัสผ่านเดิมที่ user ส่งว่าตรงมั้ย
        bcrypt.compare(Data.oldPassword, user.password, (err, isMatch) => {

            if (!isMatch) {
                return res.status(401).json({ message: 'Old password is incorrect' });
            }

            // เข้ารหัสรหัสผ่านใหม่
            bcrypt.hash(Data.newPassword, 10, (err, hashedPassword) => {

                let updateSql = 'UPDATE customer SET password = ? WHERE email = ?';
                updateSql = mysql.format(updateSql, [hashedPassword, Data.email]);

                dbpool.query(updateSql, (err, result) => {
                    if (err) return res.status(500).json({ message: 'Database error', error: err });
                    if (result.affectedRows === 1) {
                        res.status(200).json({ message: 'Password changed successful' });
                    }
                });
            });
        });
    });
});

module.exports = router;
