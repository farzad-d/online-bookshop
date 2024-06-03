import { Router } from "express";
const router = Router();
import bcrypt from "bcrypt";
import passport from "passport";
import User from "../models/User.js";

// Register Page
router.get("/register", (req, res) => {
  res.render("register", {
    errors: [],
    success_msg: req.flash("success_msg"),
    error_msg: req.flash("error_msg"),
    user: req.user || null, // Pass the user variable or null if not logged in
  });
});

// Register Handle
router.post("/register", (req, res) => {
  const {
    fullname,
    email,
    phone,
    address,
    postalCode,
    password,
    confirmPassword,
  } = req.body;
  let errors = [];

  if (
    !fullname ||
    !email ||
    !phone ||
    !address ||
    !postalCode ||
    !password ||
    !confirmPassword
  ) {
    errors.push({ msg: "Please enter all fields" });
  }

  if (password !== confirmPassword) {
    errors.push({ msg: "Passwords do not match" });
  }

  if (password.length < 6) {
    errors.push({ msg: "Password must be at least 6 characters" });
  }

  if (errors.length > 0) {
    res.render("register", {
      errors,
      fullname,
      email,
      phone,
      address,
      postalCode,
      password,
      confirmPassword,
      user: req.user || null,
    });
  } else {
    User.findOne({ email: email }).then((user) => {
      if (user) {
        errors.push({ msg: "Email already exists" });
        res.render("register", {
          errors,
          fullname,
          email,
          phone,
          address,
          postalCode,
          password,
          confirmPassword,
        });
      } else {
        const newUser = new User({
          fullname,
          email,
          phone,
          address,
          postalCode,
          password,
        });

        bcrypt.genSalt(10, (err, salt) => {
          if (err) console.log("Salt generation error:", err);
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) console.log("Hashing error:", err);
            newUser.password = hash;
            newUser
              .save()
              .then((user) => {
                req.flash(
                  "success_msg",
                  "You are now registered and can log in"
                );
                res.redirect("/login");
              })
              .catch((err) => console.log(err));
          });
        });
      }
    });
  }
});

// Login Page
router.get("/login", (req, res) => res.render("login"));

// Login Handle
router.post("/login", (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })(req, res, next);
});

export default router;
