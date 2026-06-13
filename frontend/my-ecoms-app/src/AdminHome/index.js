import AdminNav from "../AdminNav";
import HomePage from "../HomePage";
import "./index.css";

const AdminHome = () => {
  return (
    <div className="admin-home-wrapper">
      <AdminNav />
      <div className="admin-home-content">
        <HomePage isAdmin={true} />
      </div>
    </div>
  );
};

export default AdminHome;