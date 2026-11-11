import { useState } from "react";
import api from "../api/axios";
import AdminNav from "../AdminNav";
import { toast } from "react-toastify";
import "./index.css";

const chocotype = [
  { name: "Trending", id: "trend" },
  { name: "Gifting", id: "gift" },
  { name: "Festive", id: "fest" },
  { name: "Corporate", id: "corporate" },
  { name: "ChocoS", id: "all" },
];

const AdminAddProduct = () => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [countInStock, setCountInStock] = useState("");
  const [type, setType] = useState(chocotype[0].id);
  const [submitting, setSubmitting] = useState(false);

  const onProductAdd = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const createdProduct = {
      name: name.trim(),
      price: Number(price),
      imageUrl,
      description: description.trim(),
      countInStock: Number(countInStock),
      type,
    };

    try {
      setSubmitting(true);
      const userInfo = JSON.parse(localStorage.getItem("userInfo") || "null");
      await api.post("/api/products", createdProduct, {
        headers: { Authorization: `Bearer ${userInfo?.token}` },
      });
      toast.success("Product added successfully");
      setName("");
      setPrice("");
      setImageUrl("");
      setDescription("");
      setCountInStock("");
      setType(chocotype[0].id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AdminNav />
      <div className="add-product-container">
        <form className="product-form" onSubmit={onProductAdd}>
          <h2>Add Product</h2>

          <div className="form-group">
            <label htmlFor="product-name">Name</label>
            <input
              id="product-name"
              type="text"
              placeholder="Enter product name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-price">Price</label>
            <input
              id="product-price"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Enter price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-image-url">Image URL</label>
            <input
              id="product-image-url"
              type="url"
              type="text"
              placeholder="Enter Image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-description">Description</label>
            <input
              id="product-description"
              type="text"
              placeholder="Enter description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-stock">Count in Stock</label>
            <input
              id="product-stock"
              type="number"
              min="0"
              step="1"
              placeholder="Enter stock count"
              value={countInStock}
              onChange={(e) => setCountInStock(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="product-type">Type</label>
            <select id="product-type" value={type} onChange={(e) => setType(e.target.value)}>
              {chocotype.map((each) => (
                <option key={each.id} value={each.id}>
                  {each.name}
                </option>
              ))}
            </select>
          </div>

          <button className="submit-btn" disabled={submitting}>
            {submitting ? "Adding..." : "Add Item"}
          </button>
        </form>
      </div>
    </>
  );
};

export default AdminAddProduct;
