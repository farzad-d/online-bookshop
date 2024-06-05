import mongoose from "mongoose";

const BasketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  items: [
    {
      bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Book",
        required: true,
      },
      quantity: {
        type: Number,
        default: 1,
      },
    },
  ],
});

const Basket = mongoose.model("Basket", BasketSchema);

export default Basket;
