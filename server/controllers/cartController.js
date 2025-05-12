import User from "../models/User.js";
// Update User CartData : /api/cart/update
export const updateCart = async (req, res) => {
  try {
    const { cartItems, userId } = req.body;
    console.log("Updating cart for user:", userId, "with items:", cartItems); // Log the incoming data
    await User.findByIdAndUpdate(userId, { cartItems });
    res.json({ success: true, message: "Cart Updated" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
