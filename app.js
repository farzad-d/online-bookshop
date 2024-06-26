import "dotenv/config";
import express from "express";
import session from "express-session";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import flash from "connect-flash";
import passport from "passport";
import multer from "multer";
import path from "path";
import bcrypt from "bcrypt";
import userRoutes from "./routes/users.js";
import initializePassport from "./config/passport.js";
import Book from "./models/Book.js";
import Basket from "./models/Basket.js";
import User from "./models/User.js";

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// Mongoose
// const db = "mongodb://localhost:27017/bookshopDB";
const db = `mongodb+srv://admin-farzad:${process.env.DB_PASS}@cluster0.llywomm.mongodb.net/bookshopDB?retryWrites=true&w=majority&appName=Cluster0`;

mongoose
  .connect(db)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Express session
app.use(
  session({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
  })
);

// Passport middleware
initializePassport(passport);
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Multer for image uploads
const storage = multer.diskStorage({
  destination: "./public/uploads/",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 },
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  },
});

// Check file type for image upload
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
}

// Middleware to get basket item count
async function getBasketItemCount(userId) {
  const basket = await Basket.findOne({ userId: userId });
  return basket
    ? basket.items.reduce((count, item) => count + item.quantity, 0)
    : 0;
}

// Global variables and basket item count middleware
app.use(async (req, res, next) => {
  res.locals.user = req.user || null;
  if (req.user) {
    try {
      const count = await getBasketItemCount(req.user._id);
      res.locals.basketItemCount = count;
    } catch (err) {
      console.error(err);
      res.locals.basketItemCount = 0;
    }
  } else {
    res.locals.basketItemCount = 0;
  }
  next();
});

// Authentication middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error_msg", "Please log in to view that resource");
  res.redirect("/login");
}

// #################### Routes ####################

// Users
app.use("/users", userRoutes);

// Register
app.get("/register", (req, res) => {
  res.render("register", {
    errors: [],
    success_msg: req.flash("success_msg"),
    error_msg: req.flash("error_msg"),
    error: req.flash("error"),
    user: req.user || null,
  });
});

// Login
app.get("/login", (req, res) => {
  res.render("login", {
    success_msg: req.flash("success_msg"),
    error_msg: req.flash("error_msg"),
    error: req.flash("error"),
    user: req.user || null,
  });
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error(err);
      return next(err);
    }
    if (!user) {
      req.flash("error_msg", info.message);
      return res.redirect("/login");
    }
    req.login(user, (err) => {
      if (err) {
        console.error(err);
        return next(err);
      }
      // req.flash("success_msg", "You are now logged in!");
      return res.redirect("/");
    });
  })(req, res, next);
});

// Logout
app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      req.flash("error_msg", "An error occurred while logging out.");
      return res.redirect("/login");
    }
    req.flash("success_msg", "You have been logged out.");
    res.redirect("/login");
  });
});

// Add book page
app.get("/add-book", ensureAuthenticated, (req, res) => {
  res.render("add-book", {
    success_msg: req.flash("success_msg"),
    error_msg: req.flash("error_msg"),
    user: req.user || null,
  });
});

app.post("/add-book", upload.single("image"), (req, res) => {
  const {
    title,
    author,
    publisher,
    description,
    price,
    isbn,
    pages,
    categories,
    imageLink,
  } = req.body;

  const newBook = new Book({
    image: req.file ? `/uploads/${req.file.filename}` : imageLink || "",
    title,
    author,
    publisher,
    description,
    price,
    isbn,
    pages,
    categories: Array.isArray(categories) ? categories : [categories],
  });

  newBook
    .save()
    .then(() => {
      req.flash("success_msg", "Book added successfully!");
      res.redirect("/add-book");
    })
    .catch((err) => {
      console.error(err);
      req.flash("error_msg", "An error occurred while adding the book.");
      res.redirect("/add-book");
    });
});

// Home
app.get("/", (req, res) => {
  Book.find()
    .then((books) => {
      res.render("home", {
        books: books,
        user: req.user || null,
        originalUrl: req.originalUrl,
        category: "All",
      });
    })
    .catch((err) => {
      console.error(err);
      // req.flash("error_msg", "An error occurred while fetching books.");
      res.redirect("/");
    });
});

// Book details
app.get("/books/:id", (req, res) => {
  Book.findById(req.params.id)
    .then((book) => {
      if (!book) {
        req.flash("error_msg", "Book not found.");
        return res.redirect("/");
      }
      res.render("book-detail", {
        book: book,
        // success_msg: req.flash("success_msg"),
        // error_msg: req.flash("error_msg"),
        user: req.user || null,
      });
    })
    .catch((err) => {
      console.error(err);
      // req.flash("error_msg", "An error occurred while fetching the book.");
      res.redirect("/");
    });
});

// Category
app.get("/category/:category", (req, res) => {
  const category = req.params.category;
  Book.find({ categories: category })
    .then((books) => {
      res.render("category", {
        books: books,
        category: category,
        user: req.user || null,
        originalUrl: req.originalUrl,
      });
    })
    .catch((err) => {
      console.error(err);
      // req.flash("error_msg", "An error occurred while fetching books.");
      res.redirect("/");
    });
});

// Search
app.get("/search", async (req, res) => {
  try {
    const query = req.query.query;
    const books = await Book.find({ title: { $regex: query, $options: "i" } });
    res.render("search-results", {
      books,
      user: req.user || null,
      originalUrl: req.originalUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Add to Basket
app.post("/add-to-basket/:bookId", ensureAuthenticated, (req, res) => {
  const userId = req.user._id;
  const bookId = req.params.bookId;

  Basket.findOne({ userId: userId })
    .then((basket) => {
      if (!basket) {
        basket = new Basket({ userId: userId, items: [{ bookId }] });
      } else {
        const item = basket.items.find((item) => item.bookId.equals(bookId));
        if (item) {
          item.quantity += 1;
        } else {
          basket.items.push({ bookId });
        }
      }
      return basket.save();
    })
    .then(() => {
      // req.flash("success_msg", "Book added to basket");
      res.redirect(req.headers.referer);
    })
    .catch((err) => {
      console.error(err);
      // req.flash("error_msg", "Error adding book to basket");
      res.redirect(req.headers.referer);
    });
});

// Basket
app.get("/basket", ensureAuthenticated, (req, res) => {
  Basket.findOne({ userId: req.user._id })
    .populate("items.bookId")
    .then((basket) => {
      const total = basket
        ? basket.items.reduce(
            (total, item) => total + item.bookId.price * item.quantity,
            0
          )
        : 0;

      const roundedTotal = total.toFixed(2);

      const itemCount = basket
        ? basket.items.reduce((count, item) => count + item.quantity, 0)
        : 0;

      res.render("basket", {
        user: req.user || null,
        basket: basket || { items: [] },
        total: roundedTotal,
        itemCount: itemCount,
      });
    })
    .catch((err) => {
      console.error(err);
      // req.flash("error_msg", "Error fetching basket");
      res.redirect("/");
    });
});

// Remove from basket
app.post("/remove-from-basket/:bookId", ensureAuthenticated, (req, res) => {
  const userId = req.user._id;
  const bookId = req.params.bookId;

  Basket.findOne({ userId: userId })
    .then((basket) => {
      basket.items = basket.items.filter((item) => !item.bookId.equals(bookId));
      return basket.save();
    })
    .then(() => {
      // req.flash("success_msg", "Book removed from basket");
      res.redirect("/basket");
    })
    .catch((err) => {
      console.error(err);
      // req.flash("error_msg", "Error removing book from basket");
      res.redirect("/basket");
    });
});

// Clear basket
app.post("/clear-basket", ensureAuthenticated, (req, res) => {
  Basket.findOne({ userId: req.user._id })
    .then((basket) => {
      basket.items = [];
      return basket.save();
    })
    .then(() => {
      // req.flash("success_msg", "Basket cleared");
      res.redirect("/basket");
    })
    .catch((err) => {
      console.error(err);
      // req.flash("error_msg", "Error clearing basket");
      res.redirect("/basket");
    });
});

// Profile
app.get("/profile", ensureAuthenticated, (req, res) => {
  res.render("profile", {
    user: req.user,
    success_msg: req.flash("success_msg"),
    error_msg: req.flash("error_msg"),
  });
});

app.post("/profile", ensureAuthenticated, async (req, res) => {
  const { fullname, email, phone, address, postalCode } = req.body;
  try {
    const user = await User.findById(req.user._id);
    user.fullname = fullname;
    user.email = email;
    user.phone = phone;
    user.address = address;
    user.postalCode = postalCode;
    await user.save();
    req.flash("success_msg", "Profile updated successfully");
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error updating profile");
    res.redirect("/profile");
  }
});

// Update password
app.post("/profile/password", ensureAuthenticated, async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  if (newPassword !== confirmNewPassword) {
    req.flash("error_msg", "New passwords do not match");
    return res.redirect("/profile");
  }

  try {
    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      req.flash("error_msg", "Current password is incorrect");
      return res.redirect("/profile");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    req.flash("success_msg", "Password updated successfully");
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error updating password");
    res.redirect("/profile");
  }
});

// Payment
app.get("/payment", ensureAuthenticated, (req, res) => {
  res.render("payment", { user: req.user || null });
});

// About Us
app.get("/about-us", (req, res) => {
  res.render("about-us");
});

// Contact Us
app.get("/contact-us", (req, res) => {
  res.render("contact-us");
});

// ####################

// Start server
app.listen(3000, () => {
  console.log("Server started on port 3000");
});
