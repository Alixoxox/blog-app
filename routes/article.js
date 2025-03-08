const express = require("express");
const router = express.Router();
const sql_db = require("../models/article_db");
const slugify = require("slugify");
const marked=require('marked')
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
    return res.status(400).send("Search query is missing");
  }

  const sql = "SELECT * FROM articles WHERE title LIKE ? OR description LIKE ?";
  const searchPattern = `%${searchQuery}%`; // Search in any part of the string

  sql_db.query(sql, [searchPattern, searchPattern], (err, results) => {
    if (err) {
      console.error("Error executing search query:", err);
      return res.redirect("../");
    }
    const {title,description,markdown,slug,created_at,created_by}=results[0]
    let n_mark=marked.parse(markdown)
    res.render("articles/show", { article:{title,description,n_mark,slug,created_at,created_by}  });
  });
});

router.get("/new", authenticate, (req, res) => {
  res.render("articles/new", { article: {}, error: {} });
});

//info-detailed-article
router.get("/:slug", async (req, res) => {
  const sql = "SELECT * FROM articles WHERE slug = ?";
  sql_db.query(sql, [req.params.slug], (err, results) => {
    if (err || results.length === 0) return res.redirect("/");
    const {title,description,markdown,slug,created_at,created_by}=results[0]
    let n_mark=marked.parse(markdown)
    res.render("articles/show", { article:{title,description,n_mark,slug,created_at,created_by}  });

  });
});
//edit page
router.get("/edit/:slug", authenticate, (req, res) => {
  const sql = "SELECT * FROM articles WHERE slug = ?";
  sql_db.query(sql, [req.params.slug], (err, results) => {
    if (err || results.length === 0) return res.redirect("/");
    res.render("articles/edit", { article: results[0] });
  });
});
//update page
router.put("/:slug", authenticate, async (req, res) => {
  const slug_t = req.params.slug;
  const { title, description, markdown } = req.body;

  const new_slug_title = slugify(title, { lower: true, strict: true });
  const sql = "UPDATE articles SET title=?,description=?,markdown=?,slug=?";
  await sql_db.query(
    sql,
    [title, description, markdown, new_slug_title],
    (err, result) => {
      if (err) {
        console.error("Database Error: ", err);
        return res.status(500).send("Database Error: " + err.message);
      }
      const {title,description,markdown,slug,created_at,created_by}=result[0]
    let n_mark=marked.parse(markdown)
    res.render("articles/show", { article:{title,description,n_mark,slug,created_at,created_by}  });
    }
  );
});
//_form_field data in db
router.post("/", authenticate, async (req, res) => {
  console.log(req.body);
  const { title, description, markdown } = req.body;

  const slug = slugify(title, { lower: true, strict: true });

  const sql =
    "INSERT INTO articles (title, description, markdown, slug, created_at,created_by) VALUES (?, ?, ?, ?, NOW(),?)";

  sql_db.query(sql, [title, description, markdown, slug, req.session.user.username], (err, result) => {
    if (err) {
      console.error("Database Error: ", err);
      return res.status(500).send("Database Error: " + err.message);
    }

    res.redirect(`/articles/${slug}`);
  });
});

router.delete("/:id", authenticate, async (req, res) => {
  const sql = "DELETE FROM articles WHERE id = ?";
  const id = req.params.id;
  console.log(req.params.id); // This should print the `id` passed in the URL

  sql_db.query(sql, [id], (err, result) => {
    if (err) {
      return res.status(500).send("Error deleting article");
    }
    console.log("Article Deleted Succesfully");
    res.redirect("/");
  });
});

module.exports = router;
