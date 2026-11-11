import Navbar from "../Navbar";
import HomePage from "../HomePage";
import "./index.css";

const Home = () => {
  return (
    <div className="home-wrapper">
      <Navbar />
      <div className="home-content">
        <HomePage />
      </div>
    </div>
  );
};

export default Home;