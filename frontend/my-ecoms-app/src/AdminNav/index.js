import { Link, useNavigate } from "react-router-dom";
import { logout } from "../auth";
import "./index.css";

const AdminNav = () => {
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="admin-navbar">
      <div className="admin-navbar-brand">
        <span className="admin-logo">🍫</span>
        <div>
          <h2 className="admin-brand-title">MyEcoms Admin</h2>
          <p className="admin-brand-subtitle">Management Dashboard</p>
        </div>
      </div>

      <div className="admin-navbar-links">
        <Link to="/admin/home" className="admin-nav-link">
          Dashboard
        </Link>

        <Link to="/admin/AddProduct" className="admin-nav-link">
          Add Product
        </Link>

        <Link to="/admin/orders" className="admin-nav-link">
          Orders
        </Link>
        <Link to="/admin/bizgrow" className="admin-nav-link">
          BizGrow
        </Link>
        <Link to="/admin/bizgraphs" className="admin-nav-link">
          BizGraphs
        </Link>
      </div>

      <button className="admin-logout-btn" onClick={onLogout}>
        Logout
      </button>
    </nav>
  );
};

export default AdminNav;
