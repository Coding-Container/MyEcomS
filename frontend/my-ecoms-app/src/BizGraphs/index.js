import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import AdminNav from "../AdminNav";
import { getToken } from "../auth";
import "./index.css";

const BizGraphs = () => {
  const [graphData, setGraphData] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [trendData, setTrendData] = useState([]);

  const getTrendData = useCallback(async (productName, year) => {
    try {
      const token = getToken();

      const { data } = await api.get("/api/orders/product-trend", {
        params: {
          productName,
          year,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setTrendData(data);
    } catch (error) {
      console.log(error);
    }
  }, []);

  useEffect(() => {
    getGraphData();
  }, []);
  useEffect(() => {
    if (graphData.length > 0) {
      const firstProduct = graphData[0].name;

      setSelectedProduct(firstProduct);

      getTrendData(firstProduct, selectedYear);
    }
  }, [graphData, getTrendData, selectedYear]);

  useEffect(() => {
    if (selectedProduct) {
      getTrendData(selectedProduct, selectedYear);
    }
  }, [selectedProduct, selectedYear, getTrendData]);

  const getGraphData = async () => {
    try {
      const token = getToken();

      const { data } = await api.get("/api/orders/graphs", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setGraphData(data);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <AdminNav />

      <div className="bizgraphs-container">
        <h1 className="bizgraphs-title">📊 Business Analytics Graphs</h1>

        <div className="graph-card">
          <h2 className="graph-title">🏆 Top Selling Products</h2>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip />

              <Legend />

              <Bar dataKey="sold" name="Products Sold" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="graph-card">
          <h2 className="graph-title">💰 Revenue By Product</h2>

          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="name" />

              <YAxis />

              <Tooltip />

              <Legend />

              <Bar dataKey="revenue" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="graph-card">
          <h2 className="graph-title">📈 Product Monthly Trend</h2>

          <div className="trend-filters">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="trend-select"
            >
              {graphData.map((product) => (
                <option key={product.name} value={product.name}>
                  {product.name}
                </option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="trend-select"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="month" />

              <YAxis />

              <Tooltip />

              <Legend />

              <Line
                type="monotone"
                dataKey="sold"
                name="Orders Delivered"
                strokeWidth={4}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
};

export default BizGraphs;
