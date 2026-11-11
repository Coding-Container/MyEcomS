import { useSyncExternalStore } from "react";
import api from "../api/axios";
import { getToken } from "../auth";

let cartItems = [];
let requestVersion = 0;
const listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const publish = (nextItems) => {
  cartItems = nextItems;
  listeners.forEach((listener) => listener());
};

export const useCartItems = () =>
  useSyncExternalStore(subscribe, () => cartItems, () => cartItems);

export const refreshCart = async () => {
  const version = ++requestVersion;
  const token = getToken();
  if (!token) {
    publish([]);
    return [];
  }

  const { data } = await api.get("/api/cart", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (version === requestVersion) publish(data);
  return data;
};

export const clearCartState = () => {
  requestVersion += 1;
  publish([]);
};
