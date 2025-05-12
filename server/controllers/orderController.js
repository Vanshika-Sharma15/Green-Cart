import paypal from "@paypal/checkout-server-sdk";
import { client } from "../configs/paypal.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

// Place Order COD: /api/order/cod
export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, address } = req.body;
    if (!address || items.length === 0) {
      return res.json({ success: false, message: "Invalid data" });
    }
    // Calculate Amount Using Items
    let amount = await items.reduce(async (acc, item) => {
      const product = await Product.findById(item.product);
      return (await acc) + product.offerPrice * item.quantity;
    }, 0);
    // Add Tax Charge (2%)
    amount += Math.floor(amount * 0.02);
    await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "COD",
    });
    return res.json({ success: true, message: "order placed successfully" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const createPayPalOrder = async (req, res) => {
  try {
    const { items } = req.body;

    let total = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      total += product.offerPrice * item.quantity;
    }

    total += Math.floor(total * 0.02); // Add 2% tax

    const request = new paypal.orders.OrdersCreateRequest();
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: total.toFixed(2),
          },
        },
      ],
    });

    const order = await client().execute(request);
    res.json({ success: true, orderID: order.result.id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
//webhook paypal
export const paypalWebhook = async (req, res) => {
  try {
    const webhookId = "YOUR_PAYPAL_WEBHOOK_ID"; // TODO: Replace this with your actual webhook ID from PayPal dashboard
    const transmissionId = req.headers["paypal-transmission-id"];
    const transmissionTime = req.headers["paypal-transmission-time"];
    const certUrl = req.headers["paypal-cert-url"];
    const authAlgo = req.headers["paypal-auth-algo"];
    const transmissionSig = req.headers["paypal-transmission-sig"];
    const webhookEventBody = req.body;

    // Construct the Webhook signature verification request
    const verifyReq =
      new paypal.notifications.webhookEventVerifySignatureRequest();
    verifyReq.requestBody({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: webhookEventBody,
    });

    // Verify the webhook signature to confirm the event is from PayPal
    const verifyResponse = await client().execute(verifyReq);

    if (verifyResponse.result.verification_status !== "SUCCESS") {
      // Invalid webhook signature
      return res
        .status(400)
        .json({ success: false, message: "Invalid webhook signature" });
    }

    const eventType = webhookEventBody.event_type;
    // Handle different webhook event types
    switch (eventType) {
      case "PAYMENT.CAPTURE.COMPLETED":
        // Payment capture succeeded
        const captureId = webhookEventBody.resource.id;
        // Find order by transactionId and mark as paid
        const order = await Order.findOne({ transactionId: captureId });
        if (order) {
          order.isPaid = true;
          await order.save();
          console.log(
            `Order ${order._id} marked as paid (PayPal capture ID: ${captureId})`
          );
        }
        break;

      case "PAYMENT.CAPTURE.DENIED":
        // Payment capture denied, mark order as unpaid or handle accordingly
        const deniedCaptureId = webhookEventBody.resource.id;
        const deniedOrder = await Order.findOne({
          transactionId: deniedCaptureId,
        });
        if (deniedOrder) {
          deniedOrder.isPaid = false;
          await deniedOrder.save();
          console.log(
            `Order ${deniedOrder._id} marked as unpaid (PayPal capture denied ID: ${deniedCaptureId})`
          );
        }
        break;

      // Add more event types as needed
      default:
        console.log(`Unhandled PayPal webhook event type: ${eventType}`);
    }

    // Respond 200 OK to acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error processing PayPal webhook:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Capture PayPal Order
export const capturePayPalOrder = async (req, res) => {
  try {
    const { orderID, userId, address, items } = req.body;

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const capture = await client().execute(request);

    // Calculate amount again
    let total = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      total += product.offerPrice * item.quantity;
    }

    total += Math.floor(total * 0.02);

    await Order.create({
      userId,
      items,
      amount: total,
      address,
      paymentType: "Online",
      isPaid: true,
      transactionId: orderID,
    });

    res.json({ success: true, message: "Payment captured & order placed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get Orders by User ID: /api/order/user
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.body;
    const orders = await Order.find({
      userId,
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
  I;
};

// Get All Orders (for seller / admin): /api/order/seller
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
