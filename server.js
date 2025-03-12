const express = require("express");
const db=require('./models/article_db')
const path=require('path')
const port = 3000;
const app = express();
const method_override=require('method-override')
const session = require('express-session')
app.use(express.urlencoded({extended:true}))
app.use(express.json());
app.use(method_override('_method'))
app.use(express.static("public"));


app.use(session({
  secret: "kakakaka",  
  resave: false,              
  saveUninitialized: false,     
  cookie: { secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 1 day session lifespan
  }
}));
const userRoutes = require('./routes/user')
const articleRouter = require("./routes/article");

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use("/account", userRoutes)
app.use("/articles", articleRouter);


app.get("/", async(req, res) => {
  const sql = "SELECT * FROM articles ORDER BY created_at DESC";
    db.query( sql,(err, results) => {
      if (err) {
       console.error("Database Error:", err);
        return res.status(500).send("Database Error");
      }
   res.render('index',{articles:results})
})});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
})


// implement dompurify,marked and turndown