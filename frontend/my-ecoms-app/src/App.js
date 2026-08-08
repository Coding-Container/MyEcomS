import { BrowserRouter, Routes, Route } from "react-router-dom";

import PublicProtectedRoute from "./PublicProtectedRoute";
import AdminProtectedRoute from "./AdminProtectedRoute";

import AdminHome from "./AdminHome";
import AdminAddProduct from "./AdminAddProduct";
import AdminOrdersView from "./AdminOrdersView";
import OrderDetails from "./AdminDetailOrderView";

import Home from "./Home";
import CartPage from "./Cart";
import MyOrders from "./Orders";
import Loginpage from "./Loginpage/index";
import BizGrow from "./BizGrow";
import BizGraphs from "./BizGraphs";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Loginpage />} />

        {/* ADMIN ROUTES */}
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
    </BrowserRouter>
  );
};

export default App;
