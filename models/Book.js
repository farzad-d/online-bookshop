import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
  image: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  publisher: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  isbn: { type: String, required: true },
  pages: { type: Number, required: true },
  categories: { type: [String], required: true },
});

const Book = mongoose.model("Book", bookSchema);

export default Book;
