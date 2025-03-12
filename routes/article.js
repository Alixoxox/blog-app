const express = require("express");
const router = express.Router();
const sql_db = require("../models/article_db");
const slugify = require("slugify");
const marked=require('marked')
 const multer = require("multer");
const path = require("path");

  // Set up storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/cover/"); // Save files 
  },
  filename: function (req, file, cb) {
    const articleName = req.body.articleName || 'default_article';
    
    cb(null, articleName + path.extname(file.originalname)); // Use username as filename
  }
  });
  // Initialize Multer
const upload = multer({
  storage: storage,
    });

const authenticate = (req, res, next) => {
  console.log("Session Data by authencator:", req.session); // Debugging log
  if (!req.session || !req.session.user) {
    // Only set returnTo if it’s not already set and not the login route
    if (
      !req.session.returnTo &&
      req.originalUrl !== "/account/login" &&
      req.originalUrl !== "/account/signup"
    ) {
      req.session.returnTo = req.originalUrl;
    }
    return res.status(401).render("users/login");
  }
  next();
};
router.get("/search", (req, res) => {
  const searchQuery = req.query.q; // Get the search term from URL

  if (!searchQuery) {
    return res.send("<script>alert('Please Enter something In the search Query'); window.history.back();</script>");
  }

  const sql = "SELECT * FROM articles WHERE title LIKE ?";
  const searchPattern = `%${searchQuery}%`; // Search in any part of the string

  sql_db.query(sql, [searchPattern], (err, results) => {
    if (err) {
      console.error("Error executing search query:", err);
      return res.redirect("../");
    }
    if (results.length === 0) {
      return res.redirect("../");
    }

    // Destructure result and handle missing cover_img
    const { title, description, markdown, slug, created_at, created_by, cover_img = '' } = results[0];

    let n_mark = marked.parse(markdown);
    res.render("articles/show", { article: { title, description, n_mark, slug, created_at, created_by, cover_img } });
  });
});

router.get("/new", authenticate, (req, res) => {
  res.render("articles/new", { article: {}, error: {} });
});
router.get("/:slug", async (req, res) => {
  const sql = "SELECT * FROM articles WHERE slug = ?";
  sql_db.query(sql, [req.params.slug], (err, results) => {
    if (err || results.length === 0) return res.redirect("/");

    // Destructure result and handle missing cover_img
    const { title, description, markdown, slug, created_at, created_by, cover_img = '' } = results[0];
    
    let n_mark = marked.parse(markdown);
    res.render("articles/show", { article: { title, description, n_mark, slug, created_at, created_by, cover_img } });
  });
});
//edit page
router.get("/edit/:slug", authenticate, (req, res) => {
  const loggedInUser=req.session.user.username
  const checkuser="SELECT created_by FROM articles WHERE slug = ?"
  const slug=req.params.slug
  sql_db.query(checkuser, [slug], (err, result) => {
    if (err) {
      return res.send("<script>alert('Error Deleting Article \nPlz try again later'); window.history.back();</script>");

    }if(!result.length){
      return res.send("<script>alert('You are not the user who created this article'); window.history.back();</script>");
    }
    
    const articleOwner = result[0].created_by;
    if (articleOwner !== loggedInUser) {
      return res.send("<script>alert('You are not the user who created this article'); window.history.back();</script>");
    }


    const sql = "SELECT * FROM articles WHERE slug = ?";
    sql_db.query(sql, [req.params.slug], (err, results) => {
      if (err || results.length === 0) return res.redirect("/");
       res.render("articles/edit", { article: results[0] });
  });
});})
//update page
router.put("/:slug", authenticate, upload.single("cover_img"), async (req, res) => {
  const slug_t = req.params.slug;
  const { title, description, markdown } = req.body;
  const file = req.file;

  // Fetch existing cover_img from the database
  sql_db.query("SELECT cover_img FROM articles WHERE slug = ?", [slug_t], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).send("Error fetching existing cover image.");
    }

    const oldCoverImg = results[0].cover_img; // Use existing cover if no new file
    const cover_img = file ? `/cover/${file.filename}` : oldCoverImg;

    const new_slug_title = slugify(title, { lower: true, strict: true });
    const sql = "UPDATE articles SET title=?, description=?, markdown=?, slug=?, cover_img=? WHERE slug=?";

    sql_db.query(sql, [title, description, markdown, new_slug_title, cover_img, slug_t], (err, result) => {
      if (err) {
        console.error("Database Error: ", err);
        return res.status(500).send("Database Error: " + err.message);
      }

      if (result.affectedRows === 0) {
        return res.status(404).send("Article not found or not updated.");
      }

      res.redirect(`/articles/${new_slug_title}`);
    });
  });
});

//_form_field data in db
router.post("/", authenticate,  upload.single('cover_img'),async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send("No file uploaded.");
  }
  const { title, description, markdown } = req.body;
  const cover_img = req.file ? `/cover/${req.file.filename}` : null; // Check if file is uploaded
  
  if (!cover_img) {
    return res.status(400).send("No cover image uploaded."); // Ensure cover_img is set
  }
  
  const slug = slugify(title, { lower: true, strict: true });
  
  const sql = `
    INSERT INTO articles (title, description, markdown, slug, created_at, created_by, cover_img)
    VALUES (?, ?, ?, ?, NOW(), ?, ?)
  `;
  
  sql_db.query(sql, [title, description, markdown, slug, req.session.user.username, cover_img], (err, result) => {
    if (err) {
      console.error("Database Error: ", err);
      return res.status(500).send("Database Error: " + err.message);
    }
  
    res.redirect(`/articles/${slug}`);
  });
})

router.delete("/:id", authenticate, async (req, res) => {
  const id = req.params.id;
  const loggedInUser = req.session.user.username;
  const checkuser="SELECT created_by FROM articles WHERE id = ?"
  sql_db.query(checkuser, [id], (err, result) => {
    if (err) {
      return res.send("<script>alert('Error Deleting Article \nPlz try again later'); window.history.back();</script>");

    }if(!result.length){
      return res.send("<script>alert('You are not the user who created this article'); window.history.back();</script>");
    }
    
    const articleOwner = result[0].created_by;
    if (articleOwner !== loggedInUser) {
      return res.send("<script>alert('You are not the user who created this article'); window.history.back();</script>");
    }
    const sql = "DELETE FROM articles WHERE id = ?";
    sql_db.query(sql, [id], (err, result) => {
      if (err) {
        return res.send("<script>alert('Error Deleting Article \\nPlease try again later'); window.history.back();</script>");
      }
      console.log("Article Deleted Successfully");
      res.redirect("/");
    });
  });
  });
  



module.exports = router;
