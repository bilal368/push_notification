require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    multipleStatements: true,
    waitForConnections: true,
    connectionLimit: 300,
    queueLimit: 200,
    connectTimeout: 50000 // Set the timeout in milliseconds
});

pool.getConnection((err,connection)=> {
    if(err)
    throw err;
    //console.log('Database connected successfully');
    connection.release();
});

module.exports = pool.promise();