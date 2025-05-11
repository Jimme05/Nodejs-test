const express = require('express');
const router = express.Router();

router.get('/', (req, res)=>{
    res.send('Hello index.js');
});



module.exports = router;