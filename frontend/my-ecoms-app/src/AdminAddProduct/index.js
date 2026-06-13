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

  const onProductAdd = (e) => {
    e.preventDefault();

    const createdProduct = {
      name,
      price,
      imageUrl,
      description,
      countInStock,
      type,
    };
    const userInfo = JSON.parse(localStorage.getItem("userInfo"));

    try {
      api.post("/api/products", createdProduct, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      });
      console.log("CREATED:", createdProduct);
      setName("");
      setPrice("");
      setImageUrl("");
      setDescription("");
      setCountInStock("");
      setType(chocotype[0].id);
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <>
      <AdminNav />
      <div className="add-product-container">
        <form className="product-form" onSubmit={onProductAdd}>
          <h2>Add Product</h2>

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              placeholder="Enter product name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Price</label>
            <input
              type="number"
              placeholder="Enter price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Image URL</label>
            <input
              type="text"
              placeholder="Enter Image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              placeholder="Enter description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Count in Stock</label>
            <input
              type="number"
              placeholder="Enter stock count"
              value={countInStock}
              onChange={(e) => setCountInStock(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {chocotype.map((each) => (
                <option key={each.id} value={each.id}>
                  {each.name}
                </option>
              ))}
            </select>
          </div>

          <button className="submit-btn">Add Item</button>
        </form>
      </div>
    </>
  );
};

export default AdminAddProduct;
