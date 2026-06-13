import { useEffect, useState } from "react";
import api from "../api/axios";
import { toast } from "react-toastify";
import Navbar from "../Navbar";
import { getToken } from "../auth";
import "./index.css";

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getOrders();
  }, []);

  const getOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        setError("Please login to view your orders");
        return;
      }

      const { data } = await api.get("/api/orders/myorders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setOrders(data);
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch orders";

      setError(message);
      toast.error(message);

      console.log("URL:", error.config?.url);
      console.log("STATUS:", error.response?.status);
      console.log("DATA:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Placed":
        return "placed";
      case "Processing":
        return "processing";
      case "Shipped":
        return "shipped";
      case "Delivered":
        return "delivered";
      default:
        return "placed";
    }
  };

  return (
    <>
      <Navbar />

      <div className="my-orders-page">
        <div className="my-orders-container">
          <div className="my-orders-topbar">
            <h1 className="my-orders-title">My Orders</h1>

            <button className="refresh-orders-btn" onClick={getOrders}>
              Refresh Orders
            </button>
          </div>

          {loading ? (
            <div className="orders-loader-wrapper">
              <div className="orders-loader"></div>
              <p>Loading your orders...</p>
            </div>
          ) : error ? (
            <div className="orders-error">
              <h3>Something went wrong</h3>
              <p>{error}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-orders">
              <h2>No Orders Yet</h2>
              <p>Looks like you haven't placed any orders yet.</p>
            </div>
          ) : (
            orders.map((order) => (
              <div className="order-card glass-card" key={order._id}>
                <div className="order-header">
                  <div>
                    <p className="order-label">Order ID</p>

                    <p className="order-id">{order._id}</p>
                  </div>

                  <div className="order-date-box">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className={`status-badge ${getStatusClass(order.status)}`}>
                  {order.status}
                </div>

                <div className="order-items">
                  {order.items.map((item) => (
                    <div className="order-item" key={item.product}>
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="order-item-image"
                      />

                      <div className="order-item-details">
                        <h3 className="order-item-name">{item.name}</h3>

                        <p className="order-item-price">Quantity: {item.qty}</p>

                        <p className="order-item-price">Price: ₹{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="order-footer">
                  <h2 className="order-total">Total: ₹{order.totalAmount}</h2>
                </div>

                <div className="shipping-address-box">
                  <h3 className="shipping-title">Delivery Address</h3>

                  <p className="shipping-name">
                    {order.shippingAddress?.fullName}
                  </p>

                  <p>{order.shippingAddress?.phone}</p>

                  <p>{order.shippingAddress?.addressLine1}</p>

                  {order.shippingAddress?.addressLine2 && (
                    <p>{order.shippingAddress?.addressLine2}</p>
                  )}

                  <p>
                    {order.shippingAddress?.city},{" "}
                    {order.shippingAddress?.state}
                  </p>

                  <p>PIN: {order.shippingAddress?.pincode}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default MyOrders;
