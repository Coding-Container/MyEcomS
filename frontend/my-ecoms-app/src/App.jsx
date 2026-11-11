import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";

const PublicProtectedRoute = lazy(() => import("./PublicProtectedRoute"));
const AdminProtectedRoute = lazy(() => import("./AdminProtectedRoute"));
const AdminHome = lazy(() => import("./AdminHome"));
const AdminAddProduct = lazy(() => import("./AdminAddProduct"));
const AdminOrdersView = lazy(() => import("./AdminOrdersView"));
const OrderDetails = lazy(() => import("./AdminDetailOrderView"));
const Home = lazy(() => import("./Home"));
const CartPage = lazy(() => import("./Cart"));
const MyOrders = lazy(() => import("./Orders"));
const Loginpage = lazy(() => import("./Loginpage"));
const BizGrow = lazy(() => import("./BizGrow"));
const BizGraphs = lazy(() => import("./BizGraphs"));

const SessionExpiryRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleExpiredSession = () => navigate("/login", { replace: true });
    window.addEventListener("auth:expired", handleExpiredSession);
    return () => window.removeEventListener("auth:expired", handleExpiredSession);
  }, [navigate]);

  return null;
};

const App = () => {
  return (
    <BrowserRouter>
      <SessionExpiryRedirect />
      <Suspense fallback={<div role="status">Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Loginpage />} />

          <Route
            path="/admin/home"
            element={
              <AdminProtectedRoute>
                <AdminHome />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/orders/:id"
            element={
              <AdminProtectedRoute>
                <OrderDetails />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/AddProduct"
            element={
              <AdminProtectedRoute>
                <AdminAddProduct />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/orders"
            element={
              <AdminProtectedRoute>
                <AdminOrdersView />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/bizgrow"
            element={
              <AdminProtectedRoute>
                <BizGrow />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/admin/bizgraphs"
            element={
              <AdminProtectedRoute>
                <BizGraphs />
              </AdminProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <PublicProtectedRoute>
                <Home />
              </PublicProtectedRoute>
            }
          />

          <Route
            path="/myOrders"
            element={
              <PublicProtectedRoute>
                <MyOrders />
              </PublicProtectedRoute>
            }
          />

          <Route
            path="/cart"
            element={
              <PublicProtectedRoute>
                <CartPage />
              </PublicProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
