import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/axios";
import { getToken, logout } from "../auth";
import AIAssistant from "../AIAssistant";
import "./index.css";

const Navbar = () => {
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  const getCartCount = async () => {
    try {
      const token = getToken();

      if (!token) return;

      const { data } = await api.get("/api/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCartCount(data.length);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getCartCount();

    const updateCart = () => {
      getCartCount();
    };

    window.addEventListener("cartUpdated", updateCart);

    return () => {
      window.removeEventListener("cartUpdated", updateCart);
    };
  }, []);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">🍫 MyEcoms</div>

        <div className="navbar-links">
          <Link to="/" className="nav-link">
            Home
          </Link>

          <Link to="/myOrders" className="nav-link">
            My Orders
          </Link>

          <Link to="/cart" className="nav-link">
            Cart
            <span className="cart-badge">{cartCount}</span>
          </Link>

          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>
      <AIAssistant />
    </>
  );
};

export default Navbar;
