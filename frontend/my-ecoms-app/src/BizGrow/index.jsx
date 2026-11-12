import { useEffect, useState, useMemo } from "react";
import api from "../api/axios";
import AdminNav from "../AdminNav";
import { getToken } from "../auth";
import "./index.css";

const BizGrow = () => {
  const [analytics, setAnalytics] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("sold-desc");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 5;

  useEffect(() => {
    getAnalytics();
  }, []);

  const getAnalytics = async () => {
    try {
      const token = getToken();

      const { data } = await api.get("/api/orders/analytics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAnalytics(data);
    } catch (error) {
      console.log(error);
    }
  };

  const filteredCount = useMemo(() => {
    if (!analytics) return 0;

    switch (filter) {
      case "daily":
        return analytics.dailyOrders;

      case "weekly":
        return analytics.weeklyOrders;

      case "monthly":
        return analytics.monthlyOrders;

      case "yearly":
        return analytics.yearlyOrders;

      default:
        return analytics.totalOrders;
    }
  }, [analytics, filter]);

  if (!analytics) {
    return (
      <>
        <AdminNav />
        <div className="bizgrow-loading">Loading Analytics...</div>
      </>
    );
  }

  const filteredProducts = [...analytics.topProducts]
    .filter((product) =>
      product.name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "sold-desc":
          return b.sold - a.sold;

        case "sold-asc":
          return a.sold - b.sold;

        case "revenue-desc":
          return b.revenue - a.revenue;

        case "revenue-asc":
          return a.revenue - b.revenue;

        default:
          return 0;
      }
    });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <>
      <AdminNav />

      <div className="bizgrow-container">
        <div className="bizgrow-header">
          <h1 className="bizgrow-title">📈 BizGrow Dashboard</h1>

          <button className="refresh-btn" onClick={getAnalytics}>
            Refresh
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h4>Total Orders</h4>
            <h2>{analytics.totalOrders}</h2>
          </div>

          <div className="stat-card">
            <h4>Total Revenue</h4>
            <h2>₹{analytics.totalRevenue}</h2>
          </div>

          <div className="stat-card">
            <h4>Products Sold</h4>
            <h2>{analytics.totalProductsSold}</h2>
          </div>

          <div className="stat-card">
            <h4>Filtered Orders</h4>
            <h2>{filteredCount}</h2>
          </div>
        </div>

        <div className="filter-container">
          <button
            className={`filter-btn ${
              filter === "daily" ? "active-filter" : ""
            }`}
            onClick={() => setFilter("daily")}
          >
            Daily
          </button>

          <button
            className={`filter-btn ${
              filter === "weekly" ? "active-filter" : ""
            }`}
            onClick={() => setFilter("weekly")}
          >
            Weekly
          </button>

          <button
            className={`filter-btn ${
              filter === "monthly" ? "active-filter" : ""
            }`}
            onClick={() => setFilter("monthly")}
          >
            Monthly
          </button>

          <button
            className={`filter-btn ${
              filter === "yearly" ? "active-filter" : ""
            }`}
            onClick={() => setFilter("yearly")}
          >
            Yearly
          </button>

          <button
            className={`filter-btn ${filter === "all" ? "active-filter" : ""}`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
        </div>

        <div className="top-products-card">
          <h2 className="section-title">🏆 Top Selling Products</h2>
          <div className="table-controls">
            <input
              type="text"
              placeholder="Search Product..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="sold-desc">Most Sold</option>

              <option value="sold-asc">Least Sold</option>

              <option value="revenue-desc">Highest Revenue</option>

              <option value="revenue-asc">Lowest Revenue</option>
            </select>
          </div>

          <table className="products-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Product</th>
                <th>Sold</th>
                <th>Revenue</th>
              </tr>
            </thead>

            <tbody>
              {paginatedProducts.map((product, index) => (
                <tr key={product.name}>
                  <td>#{(currentPage - 1) * itemsPerPage + index + 1}</td>

                  <td>{product.name}</td>

                  <td>{product.sold}</td>

                  <td>₹{product.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Prev
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BizGrow;
