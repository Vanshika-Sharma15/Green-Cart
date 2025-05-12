import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import toast from "react-hot-toast";
import { useAppContext } from "../../context/AppContext";

const PaypalCheckout = () => {
  const { axios, setCartItems } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const rawData = searchParams.get("data");

    try {
      if (!rawData) throw new Error("Missing payment data in URL");

      const parsed = JSON.parse(decodeURIComponent(rawData));
      const { items, address, userId } = parsed;

      if (!items || !address || !userId) {
        throw new Error("Incomplete payment data");
      }

      setPaymentData({ items, address, userId });
      setLoading(false);
    } catch (err) {
      toast.error(err.message || "Invalid payment link");
      navigate("/");
    }
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-xl font-medium">
        Loading checkout...
      </div>
    );
  }

  const { items, address, userId } = paymentData;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-2xl font-semibold mb-6">PayPal Checkout</h1>
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <PayPalScriptProvider
          options={{
            "client-id":
              "AcPT0LcR67U22EBS_T6KqQHPCVxmcBFxNchoVcsAP1lRlm8lekZUGrtxzzlMpYj0ciaYurVumoQXKrtj",
            currency: "USD",
          }}
        >
          <PayPalButtons
            style={{ layout: "vertical" }}
            createOrder={async () => {
              const res = await axios.post("/api/order/create-paypal-order", {
                items,
              });
              return res.data.orderID;
            }}
            onApprove={async (data) => {
              const res = await axios.post("/api/order/capture-paypal-order", {
                orderID: data.orderID,
                userId,
                address: address._id,
                items,
              });

              if (res.data.success) {
                toast.success(res.data.message);
                setCartItems({});
                navigate("/my-orders");
              } else {
                toast.error(res.data.message);
              }
            }}
            onError={(err) => {
              console.error(err);
              toast.error("Payment failed. Please try again.");
            }}
          />
        </PayPalScriptProvider>
      </div>
    </div>
  );
};

export default PaypalCheckout;
