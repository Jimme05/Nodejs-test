const express = require('express');
const indexRoute = require('./api/routes/index');
const authRoute = require('./api/routes/auth');
const shopRoute = require('./api/routes/shop');
const app = express();
const bodyParser = require('body-parser');
 

app.use(bodyParser.json());
app.use('/', indexRoute);
app.use('/auth', authRoute);
app.use('/shop', shopRoute);

app.use((req,res)=>{
    res.status(404);
    res.send('Service not found');
});

module.exports = app;