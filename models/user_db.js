const mysql = require("mysql");

const mysqlDB = mysql.createConnection({
  host: 'sql303.infinityfree.com',  // Your MySQL Hostname
  user: 'if0_38475898',             // Your MySQL Username
  password: 'Karachi9641s',         // Your MySQL Password (Change it!)
  database: 'if0_38475898_blog_app',     // Your Database Name
  port: 3306,                       // MySQL Port (Default: 3306)
});

mysqlDB.connect((err) => {
    if (err) {
        console.error("Connection Error for userDB:", err);
        return;
    }
});
const Table_creation="CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY,username VARCHAR(50) UNIQUE NOT NULL,email VARCHAR(255) UNIQUE NOT NULL,fname VARCHAR(50) NOT NULL,lname VARCHAR(50) NOT NULL,password VARCHAR(255));"

const checkTableQuery="SHOW TABLES LIKE 'users';";

mysqlDB.query(checkTableQuery, (err, result) => {
    if (err) {
      console.error('❌ Error checking table:', err);
      return;
    }

    if (result.length > 0) {
      console.log('✅ Table "users" already exists.');
    } else {
      console.log('🔍 Table "users" does not exist. Creating now...');
      mysqlDB.query(Table_creation, (err, result) => {
        if (err) {
          console.error('❌ Error creating table:', err);
        } else {
          console.log('✅ Table "users" created successfully.');
        }
      });
    }
  });

module.exports = mysqlDB;
