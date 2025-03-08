const mysql = require("mysql");


const mysqlDB = mysql.createConnection({
    host: "tramway.proxy.rlwy.net",
    user: "root",  // Change this to "scott" if you're using that user
    password: "Tiger", // Replace with your MySQL password
    database: "blog_app", // Make sure this database exists
    port: 3306,  // Default MySQL port, update if needed
});

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
