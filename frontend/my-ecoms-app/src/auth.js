import { clearCartState } from "./Cart/cartStore";

export const getUser = () => {
  try {
    const stored = localStorage.getItem("userInfo");
    if (!stored) return null;
    const user = JSON.parse(stored);
    if (typeof user?.token !== "string") throw new Error("Invalid session");
    const payload = JSON.parse(atob(user.token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) {
      throw new Error("Expired session");
    }
    return user;
  } catch {
    localStorage.removeItem("userInfo");
    return null;
  }
};

export const getToken = () => {
  return getUser()?.token;
};

export const isLoggedIn = () => {
  return Boolean(getToken());
};

export const isAdmin = () => {
  return getUser()?.isAdmin === true;
};

export const logout = () => {
  localStorage.removeItem("userInfo");
  clearCartState();
};
