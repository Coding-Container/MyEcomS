import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import { toast } from "react-toastify";
import AdminNav from "../AdminNav";
import { getToken } from "../auth";
import "./index.css";

const OrderDetails = () => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { id } = useParams();

  useEffect(() => {
    getOrder();
  }, []);

  const getOrder = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      const { data } = await api.get(`/api/orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setOrder(data);
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to fetch order details";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <AdminNav />

        <div className="loading-wrapper">
          <div className="loader"></div>
          <p>Loading order details...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AdminNav />

        <div className="error-wrapper">
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      </>
    );
  }

  if (!order) {
    return (
      <>
        <AdminNav />

        <div className="error-wrapper">
          <h2>Order Not Found</h2>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminNav />

      <div className="order-details-page">
        <div className="order-details-container">
          <div className="order-summary-card">
            <div className="summary-header">
              <h1 className="page-title">Order Details</h1>

              <span className={`status-badge ${order.status.toLowerCase()}`}>
                {order.status}
              </span>
            </div>

            <div className="customer-info">
              <div className="info-row">
                <span className="label">Customer :</span>
                <span className="value">{order.user?.username}</span>
              </div>

              <div className="info-row">
                <span className="label">Email :</span>
                <span className="value">{order.user?.email}</span>
              </div>

              <div className="info-row">
                <span className="label">Order Date :</span>
                <span className="value">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="info-row">
                <span className="label">Total Amount :</span>
                <span className="amount-value">₹{order.totalAmount}</span>
              </div>
            </div>

            <div className="shipping-address-card">
              <h3 className="shipping-address-title">Delivery Address</h3>

              <p className="shipping-name">{order.shippingAddress?.fullName}</p>

              <p className="shipping-phone">{order.shippingAddress?.phone}</p>

              <p className="shipping-line">
                {order.shippingAddress?.addressLine1}
              </p>

              {order.shippingAddress?.addressLine2 && (
                <p className="shipping-line">
                  {order.shippingAddress?.addressLine2}
                </p>
              )}

              <p className="shipping-city">
                {order.shippingAddress?.city}, {order.shippingAddress?.state}
              </p>

              <p className="shipping-pincode">
                PIN: {order.shippingAddress?.pincode}
              </p>
            </div>
          </div>

          <div className="products-section">
            <h2 className="items-title">Ordered Products</h2>

            <div className="items-container">
              {order.items.map((item, index) => (
                <div key={index} className="order-item-card">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="product-image"
                  />

                  <div className="product-info">
                    <h3 className="product-name">{item.name}</h3>

                    <p className="product-price">₹ {item.price}</p>

                    <p className="product-qty">Quantity: {item.qty}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderDetails;
