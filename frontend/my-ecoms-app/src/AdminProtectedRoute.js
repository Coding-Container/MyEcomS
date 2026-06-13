import { Navigate } from "react-router-dom";
import { isAdmin } from "./auth";

const AdminProtectedRoute = ({ children }) => {
  if (!isAdmin()) {
    return <Navigate to="/" />;
  }

  return children;
};

export default AdminProtectedRoute;
