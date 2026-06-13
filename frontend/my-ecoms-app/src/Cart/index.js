import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../Navbar";
import { toast } from "react-toastify";
import { getToken } from "../auth";
import "./index.css";

const CartPage = () => {
  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");

  const [showAddressForm, setShowAddressForm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [addressData, setAddressData] = useState({
    label: "Home",
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
  });

  const token = getToken();

  // ================= CART =================
  const getCartItems = async () => {
    try {
      setLoading(true);

      const token = getToken();
      if (!token) return;

      const { data } = await api.get("/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCartItems(data);
    } catch (err) {
      toast.error("Cart load failed");
    } finally {
      setLoading(false);
      setInitialLoading(false); // 🔥 ADD THIS LINE
    }
  };

  // ================= ADDRESS =================
  const getAddresses = async () => {
    if (!token) return;
    try {
      const { data } = await api.get("/api/address", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAddresses(data || []);

      const def = data?.find((a) => a.isDefault);
      if (def) setSelectedAddress(def._id);
    } catch {
      toast.error("Failed to load address");
    }
  };

  const saveAddress = async () => {
    try {
      await api.post("/api/address", addressData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Address saved");
      setShowAddressForm(false);
      getAddresses();

      setAddressData({
        label: "Home",
        fullName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        pincode: "",
      });
    } catch {
      toast.error("Address save failed");
    }
  };

  // ================= TOTAL =================
  const totalAmount = useMemo(() => {
    return cartItems.reduce(
      (acc, item) => acc + item.product.price * item.qty,
      0,
    );
  }, [cartItems]);

  // ================= REMOVE =================
  const removeItem = async (id) => {
    try {
      await api.delete(`/api/cart/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Item removed");
      getCartItems();
      window.dispatchEvent(new Event("cartUpdated"));
    } catch {
      toast.error("Remove failed");
    }
  };

  const updateQty = async (cartId, qty) => {
    try {
      const token = getToken();

      if (qty <= 0) {
        await removeItem(cartId);
        return;
      }

      await api.put(
        `/api/cart/update/${cartId}`,
        { qty },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      toast.success("Cart updated");
      getCartItems();
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      toast.error("Failed to update quantity");
    }
  };

  // ================= ORDER =================
  const placeOrderAfterPayment = async (paymentResponse) => {
    if (placingOrder) return;

    try {
      setPlacingOrder(true);

      const payload = {
        items: cartItems.map((item) => ({
          product: item.product._id,
          name: item.product.name,
          price: item.product.price,
          imageUrl: item.product.imageUrl,
          qty: item.qty,
        })),
        totalAmount,
        paymentId: paymentResponse.razorpay_payment_id,
        addressId: selectedAddress,
      };

      const { data } = await api.post("/api/orders", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data?._id) {
        // IMPORTANT: backend already clears cart → do NOT double delete

        await getCartItems(); // 🔥 DB nundi fresh cart fetch

        window.dispatchEvent(new Event("cartUpdated"));

        toast.success("Order placed successfully 🎉");
      } else {
        toast.error("Order failed");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Order failed");
    } finally {
      setPlacingOrder(false);
    }
  };

  // ================= PAYMENT =================
  const handlePayment = async () => {
    if (placingOrder) return;

    try {
      if (!cartItems.length) return toast.error("Cart empty");
      if (!selectedAddress) return toast.error("Select address");

      const { data } = await api.post(
        "/api/payment/create-order",
        { amount: totalAmount },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const options = {
        key: "rzp_test_SxAaATdcfmYPw7",
        amount: data.amount,
        currency: "INR",
        name: "MyEcoms",
        order_id: data.id,

        handler: async (response) => {
          await placeOrderAfterPayment(response);
        },
      };

      new window.Razorpay(options).open();
    } catch {
      toast.error("Payment init failed");
    }
  };

  // ================= LOAD =================
  useEffect(() => {
    getCartItems();
    getAddresses();
  }, []);

  if (initialLoading) {
    return (
      <>
        <Navbar />
        <div className="cart-loading">Loading cart...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="cart-page">
        {/* EMPTY STATE FIXED */}
        {!loading && cartItems.length === 0 ? (
          <div className="empty-cart">
            <h2>🛒 Your Cart is Empty</h2>
            <Link to="/" className="continue-shopping-btn">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* ITEMS */}
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item._id} className="cart-item-card">
                  <img
                    src={item.product.imageUrl}
                    className="cart-product-image"
                  />

                  <div className="cart-item-details">
                    <h3>{item.product.name}</h3>
                    <p>₹ {item.product.price}</p>
                    <p>Qty: {item.qty}</p>

                    <div className="qty-controls">
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(item._id, item.qty - 1)}
                        disabled={item.qty <= 1}
                      >
                        -
                      </button>

                      <span className="qty-value">{item.qty}</span>

                      <button
                        className="qty-btn"
                        onClick={() => updateQty(item._id, item.qty + 1)}
                      >
                        +
                      </button>

                      <button
                        className="remove-btn"
                        onClick={() => removeItem(item._id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ADDRESS */}
            <div className="address-section">
              <h2>Delivery Address</h2>

              {addresses.map((addr) => (
                <div key={addr._id} className="address-card">
                  <input
                    type="radio"
                    checked={selectedAddress === addr._id}
                    onChange={() => setSelectedAddress(addr._id)}
                  />

                  <div className="address-info">
                    <p className="address-name">{addr.fullName}</p>
                    <p className="address-phone">📞 {addr.phone}</p>
                    <p className="address-line">{addr.addressLine1}</p>

                    {addr.addressLine2 && (
                      <p className="address-line">{addr.addressLine2}</p>
                    )}

                    <p className="address-line">
                      {addr.city}, {addr.state} - {addr.pincode}
                    </p>

                    <span className="address-label-badge">{addr.label}</span>
                  </div>
                </div>
              ))}

              <button
                className="add-address-btn"
                onClick={() => setShowAddressForm(true)}
              >
                + Add Address
              </button>
            </div>

            {/* TOTAL */}
            <div className="cart-summary">
              <h2>Total: ₹ {totalAmount}</h2>

              <button
                className="place-order-btn small-btn"
                onClick={handlePayment}
                disabled={placingOrder}
              >
                {placingOrder ? "Processing..." : "Place Order"}
              </button>
            </div>

            {/* MODAL */}
            {showAddressForm && (
              <div className="address-modal-overlay">
                <div className="address-modal-box">
                  <h3 className="modal-title">Add Address</h3>

                  <input
                    className="modal-input"
                    placeholder="Full Name"
                    onChange={(e) =>
                      setAddressData({
                        ...addressData,
                        fullName: e.target.value,
                      })
                    }
                  />

                  <input
                    className="modal-input"
                    placeholder="Phone"
                    onChange={(e) =>
                      setAddressData({ ...addressData, phone: e.target.value })
                    }
                  />

                  <textarea
                    className="modal-input"
                    placeholder="Address Line 1"
                    onChange={(e) =>
                      setAddressData({
                        ...addressData,
                        addressLine1: e.target.value,
                      })
                    }
                  />

                  <input
                    className="modal-input"
                    placeholder="City"
                    onChange={(e) =>
                      setAddressData({ ...addressData, city: e.target.value })
                    }
                  />

                  <input
                    className="modal-input"
                    placeholder="State"
                    onChange={(e) =>
                      setAddressData({ ...addressData, state: e.target.value })
                    }
                  />

                  <input
                    className="modal-input"
                    placeholder="Pincode"
                    onChange={(e) =>
                      setAddressData({
                        ...addressData,
                        pincode: e.target.value,
                      })
                    }
                  />

                  <button className="modal-save-btn" onClick={saveAddress}>
                    Save Address
                  </button>

                  <button
                    className="modal-close-btn"
                    onClick={() => setShowAddressForm(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

export default CartPage;
