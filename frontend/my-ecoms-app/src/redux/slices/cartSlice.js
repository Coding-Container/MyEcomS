import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cartItems: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload;

      const existingItem = state.cartItems.find(
        (each) => each.id === item.id
      );

      if (existingItem) {
        existingItem.qty += 1;
      } else {
        state.cartItems.push({
          ...item,
          qty: 1,
        });
      }
    },

    incrementQty: (state, action) => {
      const item = state.cartItems.find(
        (each) => each.id === action.payload
      );

      if (item) item.qty += 1;
    },

    decrementQty: (state, action) => {
      const item = state.cartItems.find(
        (each) => each.id === action.payload
      );

      if (!item) return;

      if (item.qty === 1) {
        state.cartItems = state.cartItems.filter(
          (each) => each.id !== action.payload
        );
      } else {
        item.qty -= 1;
      }
    },
  },
});

export const {
  addToCart,
  incrementQty,
  decrementQty,
} = cartSlice.actions;

export default cartSlice.reducer;