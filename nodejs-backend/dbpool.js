const mysql = require('mysql');

const dbpool = mysql.createPool({
  connectionLimit: 10,
  host     : '202.28.34.197',
  user     : 'ts_66011212050',
  password : '66011212050@csmsu',
  database : 'ts_66011212050'
});

module.exports = dbpool;
