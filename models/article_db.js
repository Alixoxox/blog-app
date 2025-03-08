const mysql = require("mysql2");
require("dotenv").config()

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL is not set!');
  process.exit(1); // Stop the server
}
 
const mysqlDB= mysql.createConnection(process.env.DATABASE_URL);

mysqlDB.connect((err) => {
    if (err) {
        console.error("❌ MySQL Connection Error:", err);
        return;
    }
    
});
const Table_creation=`CREATE TABLE articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    markdown TEXT NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    FOREIGN KEY (created_by) REFERENCES users(username)
);
`

const checkTableQuery="SHOW TABLES LIKE 'articles';";

mysqlDB.query(checkTableQuery, (err, result) => {
    if (err) {
      console.error('❌ Error checking table:', err);
      return;
    }

    if (result.length > 0) {
      console.log('✅ Table "articles" already exists.');
    } else {
      console.log('🔍 Table "articles" does not exist. Creating now...');
      mysqlDB.query(Table_creation, (err, result) => {
        if (err) {
          console.error('❌ Error creating table:', err);
        } else {
          console.log('✅ Table "articles" created successfully.');
        }
      });
    }
  });

module.exports = mysqlDB;
