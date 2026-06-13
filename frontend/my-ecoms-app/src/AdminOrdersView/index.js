import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { toast } from "react-toastify";
import AdminNav from "../AdminNav";
import { getToken } from "../auth";
import "./index.css";

const AdminOrdersView = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    getOrders();

    const interval = setInterval(() => {
      getOrders();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      const { data } = await api.get("/api/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setOrders(data);
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch orders";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = getToken();

      await api.put(
        `/api/orders/${id}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === id ? { ...order, status } : order,
        ),
      );

      toast.success("Order status updated");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to update order status",
      );
    }
  };

  return (
    <>
      <AdminNav />

      <div className="admin-orders-page">
        <div className="admin-orders-container">
          <div className="admin-orders-header">
            <div>
              <h1 className="admin-orders-title">Order Management</h1>

              <p className="admin-orders-subtitle">
                Track and manage customer orders
              </p>
            </div>

            <button className="refresh-orders-btn" onClick={getOrders}>
              Refresh Orders
            </button>
          </div>

          {loading ? (
            <div className="orders-loader-wrapper">
              <div className="orders-loader"></div>
              <p>Loading orders...</p>
            </div>
          ) : error ? (
            <div className="orders-error">
              <h3>Unable to load orders</h3>
              <p>{error}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-orders">
              <h2>No Orders Found</h2>
              <p>Orders will appear here when customers place them.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Email</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Order Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={order._id}>
                      <td>{order.user?.username || "Unknown User"}</td>

                      <td>{order.user?.email || "N/A"}</td>

                      <td className="amount-cell">₹{order.totalAmount}</td>

                      <td>
                        <div className="status-section">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              updateStatus(order._id, e.target.value)
                            }
                            className="status-dropdown"
                          >
                            <option value="Placed">Placed</option>

                            <option value="Processing">Processing</option>

                            <option value="Shipped">Shipped</option>

                            <option value="Delivered">Delivered</option>
                          </select>

                          <span
                            className={`status-badge ${order.status.toLowerCase()}`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </td>

                      <td>{new Date(order.createdAt).toLocaleDateString()}</td>

                      <td>
                        <button
                          className="view-btn"
                          onClick={() => navigate(`/admin/orders/${order._id}`)}
                        >
                          View Order
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminOrdersView;
