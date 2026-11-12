import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { getToken, logout } from "../auth";
import { refreshCart, useCartItems } from "../Cart/cartStore";
import AIAssistant from "../AIAssistant";
import "./index.css";

const Navbar = () => {
  const cartItems = useCartItems();
  const cartCount = cartItems.reduce((count, item) => count + item.qty, 0);
  const navigate = useNavigate();

  useEffect(() => {
    if (getToken()) {
      refreshCart().catch((error) => console.error("Cart load failed", error.name));
    }
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
