import { useState, useEffect } from "react";
import api from "../api/axios";
import { getToken } from "../auth";
import "./index.css";

const HomePage = ({ isAdmin = false }) => {
  const [products, setProducts] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [chocoType, setChocoType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    description: "",
    countInStock: "",
    type: "",
  });

  const onEditProduct = (product) => {
    setEditingProduct(product.id);

    setEditForm({
      name: product.name,
      price: product.price,
      description: product.description,
      countInStock: product.countInStock,
      type: product.type,
    });
  };

  const onUpdateProduct = async (id) => {
    try {
      const token = getToken();

      await api.put(`/api/products/${id}`, editForm, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setEditingProduct(null);

      getAllProducts();
    } catch (error) {
      console.log(error);
    }
  };

  const onDeleteProduct = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this product?",
    );

    if (!confirmDelete) return;

    try {
      const token = getToken();

      await api.delete(`/api/products/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      getAllProducts();

      alert("Product deleted successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete product");
    }
  };

  // ---------------- PRODUCTS ----------------
  const getAllProducts = async () => {
    try {
      setLoading(true);

      const token = getToken();
      if (!token) return;

      const { data } = await api.get("/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const updatedData = data.map((each) => ({
        id: each._id,
        name: each.name,
        price: each.price,
        imageUrl: each.imageUrl,
        description: each.description,
        countInStock: each.countInStock,
        type: each.type,
      }));

      const filtered =
        chocoType !== "all"
          ? updatedData.filter((p) => p.type === chocoType)
          : updatedData;

      setProducts(filtered);
    } catch (error) {
      console.log("PRODUCT ERROR:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- CART ----------------
  const getCartItems = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const { data } = await api.get("/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCartItems(data);
    } catch (error) {
      console.log("CART ERROR:", error);
    }
  };

  // ---------------- ADD TO CART ----------------
  const onAddToCart = async (each) => {
    try {
      const token = getToken();

      await api.post(
        "/api/cart",
        { productId: each.id },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      window.dispatchEvent(new Event("cartUpdated"));
      getCartItems();
    } catch (error) {
      console.log(error);
    }
  };

  // ---------------- INCREMENT ----------------
  const onIncrement = async (cartId) => {
    try {
      const token = getToken();

      await api.put(
        `/api/cart/increment/${cartId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      window.dispatchEvent(new Event("cartUpdated"));
      getCartItems();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to add more items");
    }
  };

  // ---------------- DECREMENT ----------------
  const onDecrement = async (cartId) => {
    try {
      const token = getToken();

      await api.put(
        `/api/cart/decrement/${cartId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      window.dispatchEvent(new Event("cartUpdated"));
      getCartItems();
    } catch (error) {
      console.log(error);
    }
  };

  // ---------------- EFFECT ----------------
  useEffect(() => {
    getAllProducts();
    getCartItems();

    const updateCart = () => getCartItems();
    window.addEventListener("cartUpdated", updateCart);

    return () => window.removeEventListener("cartUpdated", updateCart);
  }, [chocoType]);

  // ---------------- LOADING UI ----------------
  if (loading) {
    return <div className="loader">Loading Products...</div>;
  }

  return (
    <div className="home-container">
      {/* CATEGORY */}
      <div className="category-buttons">
        {["trend", "gift", "corporate", "fest", "all"].map((type) => (
          <button
            key={type}
            onClick={() => setChocoType(type)}
            className={`category-btn ${chocoType === type ? "active-btn" : ""}`}
          >
            {type === "all"
              ? "Make Your Box"
              : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* PRODUCTS */}
      <ul className="products-grid">
        {products.map((each) => {
          const cartItem = cartItems.find(
            (item) => item.product._id === each.id,
          );

          return (
            <li key={each.id} className="product-card">
              <div className="product-image-container">
                <img
                  src={each.imageUrl}
                  alt={each.name}
                  className="product-image"
                />
              </div>

              <div className="product-details">
                <h2 className="product-name">{each.name}</h2>

                <p className="product-price">₹ {each.price}</p>

                <p
                  className={
                    each.countInStock === 0 ? "stock-zero" : "product-stock"
                  }
                >
                  Stock: {each.countInStock}
                </p>

                {isAdmin && each.countInStock === 0 && (
                  <span className="out-stock-badge">Out Of Stock</span>
                )}

                <p className="product-description">{each.description}</p>
                {isAdmin && (
                  <div className="admin-product-actions">
                    <button
                      className="edit-product-btn"
                      onClick={() => onEditProduct(each)}
                    >
                      Edit
                    </button>

                    <button
                      className="delete-product-btn"
                      onClick={() => onDeleteProduct(each.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}

                {editingProduct === each.id && (
                  <div className="edit-product-box">
                    <input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="Name"
                    />

                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          price: e.target.value,
                        })
                      }
                      placeholder="Price"
                    />

                    <input
                      type="number"
                      value={editForm.countInStock}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          countInStock: e.target.value,
                        })
                      }
                      placeholder="Stock"
                    />

                    <select
                      value={editForm.type}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          type: e.target.value,
                        })
                      }
                    >
                      <option value="trend">Trending</option>

                      <option value="gift">Gift</option>

                      <option value="corporate">Corporate</option>

                      <option value="fest">Festive</option>

                      <option value="all">Make Your Box</option>
                    </select>

                    <textarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                    />

                    <button
                      className="save-product-btn"
                      onClick={() => onUpdateProduct(each.id)}
                    >
                      Update Product
                    </button>
                  </div>
                )}

                {/* USER ACTIONS */}
                {!isAdmin &&
                  (each.countInStock === 0 ? (
                    <button className="out-stock-btn" disabled>
                      Out Of Stock
                    </button>
                  ) : cartItem ? (
                    <div className="quantity-container">
                      <button
                        className="qty-btn"
                        onClick={() => onDecrement(cartItem._id)}
                      >
                        -
                      </button>

                      <span className="qty-count">{cartItem.qty}</span>

                      <button
                        className="qty-btn"
                        onClick={() => onIncrement(cartItem._id)}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      className="add-cart-btn"
                      onClick={() => onAddToCart(each)}
                    >
                      Add To Cart
                    </button>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default HomePage;
