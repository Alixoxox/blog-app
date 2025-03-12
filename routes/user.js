const express = require("express");
const router = express.Router();
const user_db = require("../models/user_db");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");

// Protect the "/users" root route
router.get("/login", (req, res) => {
  res.render("users/login", { error: null });
});
router.get("/signup", async (req, res) => {
  res.render("users/signup");
});

router.get("/user", async (req, res) => {
  if (req.session.user) {
    sql = "SELECT * FROM users WHERE username=?";
    user_db.query(sql, [req.session.user.username], (err, result) => {
      if (err) {
        console.log("error on extracting user data", err);
        return res.status(500).send("Internal Server Error");
      }
      if (!result || result.length === 0) {
        return res.render("users/signup", {
          error: "Please Signup/Login First to view Account",
        }); // Handle case when user is not found
      } else {
        return res.render("users/account_p", { user: result[0], error: null });
      }
    });
  } else {
    return res.render("users/signup", {
      error: "Please Signup/Login First to view Account",
    }); // Handle case when user is not found
  }
});

router.post("/signup", async (req, res) => {
  const { fname, lname, username, email, password } = req.body;
  console.log(req.body);
  // Check for missing fields
  if (!username || !password || !fname || !email) {
    return res.render("users/signup", { error: "Enter All Required Fields" });
  }
  
  // Check password length
  if (password.length < 8) {
    return res.render("users/signup", {
      error: "Password must be greater than 8 characters",
    });
  }
  
  try {
    // Check if the username already exists
    const users_sql = "SELECT username FROM users WHERE username=?";
    user_db.query(users_sql, [username], async (err, result) => {
      if (err) {
        console.log("Database error:", err);
        return res.render("users/signup", {
          error: "Database error. Try again later.",
        });
      }
      
      if (result.length > 0) {
        return res.render("users/signup", {
          error: "Username already exists in the database.",
        });
      }
      
      // Hash the password correctly
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Insert the new user into the database
      const data_push =
      "INSERT INTO users (fname, lname, username, email, password) VALUES (?, ?, ?, ?, ?)";
      user_db.query(
        data_push,
        [fname, lname, username, email, passwordHash],
        (err) => {
          if (err) {
            return res.render("users/signup", { error: "Invalid Credentials" });
          }
          console.log("Redirecting to:", req.session.returnTo);
          req.session.user = { username };
          req.session.save(() => {
            const redirectTo = req.session.returnTo || "/";
            delete req.session.returnTo; // Remove after use
            res.redirect(redirectTo);
          });
        }
      );
    });
  } catch (error) {
    console.log("Unexpected error:", error);
    res.render("users/signup", {
      error: "Something went wrong. Try again later.",
    });
  }
});
router.get('/update', (req, res) => {
  if (!req.session.user || !req.session.user.username) {
    console.log(" No session user found");
    return res.status(403).send("Unauthorized - No session user found");
  }

  const sql = "SELECT * FROM users WHERE username = ?";
  user_db.query(sql, [req.session.user.username], (err, result) => {
      if (err) {
        console.error(" Error retrieving user data:", err);
        return res.status(500).send("Internal Server Error");
      }
      
      if (result.length === 0) {
        console.log("  User not found in DB");
        return res.status(404).send("User not found");
      }
      

      try {
          return res.render("users/update_p", { user: result[0], error: null });
        } catch (e) {
          console.error("Error rendering template:", e);
          return res.status(500).send("Error rendering page");
      }
    });
  });
  
  // Set up storage engine
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads/"); // Save files in "public/uploads"
    },
    filename: function (req, file, cb) {
        cb(null, req.session.user.username + path.extname(file.originalname)); // Use username as filename
    }
  });
  // Initialize Multer
  const upload = multer({
    storage: storage,
    
    limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
  });
  
  router.post("/update", upload.single("profile_pic"), async (req, res) => {
    const { fname, lname, username, email, password } = req.body;
    let profilePic = `/uploads/${req.file.filename}` ;
  
    if (!username || !password || !fname || !lname || !email) {
      return res.render("users/account_p", {
        error: "Enter All Fields",
        user: null,
      });
    }
  
    if (password.length < 8) {
      return res.render("users/signup", {
        error: "Password must be greater than 8 characters",
      });
    }
  
    const passwordHash = await bcrypt.hash(password, 10);
  
    const old_username = req.session.user.username || "."; //    Fixed typo: `usename` → `username`
  
    const userSql =
      "UPDATE users SET username = ?, email = ?, fname = ?, lname = ?, password = ?, profile_pic = ? WHERE username = ?;";
  
    user_db.query(
      userSql,
      [username, email, fname, lname, passwordHash, profilePic, old_username],
      (err, result) => {
        if (err) {
          console.error("Error updating user:", err);
          return res.render("users/account_p", {
            error: "Something went wrong. Please enter a unique Username.",
            user: req.session.user,
          });
        }
  
        console.log(" User updated successfully!");
  
       
        const articleSql =
          "UPDATE articles SET created_by = ? WHERE created_by = ?;";
  
        user_db.query(
          articleSql,
          [username, old_username], // Update `created_by` to new username where old username is used
          (err, result) => {
            if (err) {
              console.error("Error updating articles:", err);
              return res.render("users/account_p", {
                error: "Something went wrong while updating articles.",
                user: req.session.user,
              });
            }
  
            console.log(" Articles updated successfully!");
  
            // Update session with new user info
            req.session.user.username = username;
            res.redirect("/account/user");
          }
        );
      }
    );
  });
  

router.post("/login", async (req, res) => {
  console.log("Before login:", req.session);

  const { username, password } = req.body;

  if (!username || !password) {
    return res.render("users/login", {
      error: "Enter Both Username And Password",
    });
  }

  const sql = "SELECT username, password FROM users WHERE username=?";
  user_db.query(sql, [username], async (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.render("users/login", {
        error: "Something went wrong. Try again.",
      });
    }

    if (!result || result.length === 0) {
      return res.render("users/login", { error: "Invalid credentials" });
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      req.session.user = { username: user.username }; // Store user session

      req.session.save(() => {
        // Check if returnTo is the login page; if so, use a default value (e.g., homepage)
        let redirectTo = req.session.returnTo;
        if (redirectTo === "/account/login" || !redirectTo) {
          redirectTo = "/";
        }
        delete req.session.returnTo; // Remove after use
        res.redirect(redirectTo);
      });
    } else {
      res.render("users/login", { error: "Invalid credentials" });
    }
  });
});

// 🔹 Logout
router.post("/logout", (req, res) => {
  const sql = "SELECT * FROM articles ORDER BY created_at DESC";
  user_db.query(sql, (err, results) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).send("Database Error");
    }
    req.session.user = null;
    res.redirect(req.session.returnTo || "../");
  });
});

router.delete("/delete_User", async (req, res) => {
  if (!req.session.user) {
    console.log("No user session found!");
    let return_b = req.session.returnTo || "../";
    return res.redirect(return_b); // Redirect to home page if no session exists
  }

  const current_user = req.session.user.username;

  const sql = "DELETE FROM users WHERE username = ?";
  user_db.query(sql, [current_user], (err, result) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Something went wrong. Please try again later." });
    }

    if (result.affectedRows === 0) {
      console.log("No user found in database.");
      return res.status(404).json({
        error: "User not found. Account may have already been deleted.",
      });
    }

    let return_b = req.session.returnTo || "../"; // Use default if returnTo is undefined
    console.log("User deleted successfully!");

    req.session.destroy((err) => {
      if (err) {
        console.error("Session destroy error:", err);
        return res.status(500).json({
          error: "Account deleted, but session could not be cleared.",
        });
      }

      res.redirect(return_b);
    });
  });
});

module.exports = router;
