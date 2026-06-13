import { Navigate } from "react-router-dom";
import { isLoggedIn } from "./auth";

const PublicProtectedRoute = ({ children }) => {
  if (!isLoggedIn()) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default PublicProtectedRoute;
