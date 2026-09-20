"use client";

import { useEffect } from "react";
import { CART_STORAGE_KEY, CHECKOUT_REQUEST_STORAGE_KEY } from "@/lib/commerce/cart";

export function ClearCheckoutState() {
  useEffect(() => {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    window.localStorage.removeItem(CHECKOUT_REQUEST_STORAGE_KEY);
  }, []);
  return null;
}
