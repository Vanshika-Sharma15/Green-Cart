import express from "express";
import authUser from "../middlewares/authUser.js";
import {
  getAllOrders,
  getUserOrders,
  placeOrderCOD,
  createPayPalOrder,
  capturePayPalOrder,
} from "../controllers/orderController.js";
import authSeller from "../middlewares/authSeller.js";

const orderRouter = express.Router();
orderRouter.post("/cod", authUser, placeOrderCOD);
orderRouter.get("/user", authUser, getUserOrders);
orderRouter.get("/seller", authSeller, getAllOrders);

orderRouter.post("/create-paypal-order", createPayPalOrder);
orderRouter.post("/capture-paypal-order", capturePayPalOrder);
export default orderRouter;
