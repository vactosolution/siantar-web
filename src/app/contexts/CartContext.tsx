import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { ProductVariant, ProductExtra } from "./DataContext";

// Helper to get customer-specific storage keys
function getCustomerCartKey(): string {
  const phone = localStorage.getItem("sianter_customer_phone");
  return phone ? `siantar_cart_${phone}` : "siantar_cart_global";
}

function getCustomerNotesKey(): string {
  const phone = localStorage.getItem("sianter_customer_phone");
  return phone ? `siantar_cart_notes_${phone}` : "siantar_cart_notes_global";
}

export interface CartItem {
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  selectedVariant?: ProductVariant;
  selectedExtras: ProductExtra[];
  price: number; // Final calculated price per item
  outletId: string;
  outletName: string;
  imageUrl?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  notes: string;
  setNotes: (notes: string) => void;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(getCustomerCartKey());
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem(getCustomerNotesKey()) || "";
  });

  useEffect(() => {
    localStorage.setItem(getCustomerCartKey(), JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(getCustomerNotesKey(), notes);
  }, [notes]);

  const addItem = useCallback((newItem: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      // Check if cart is not empty and new item is from different outlet
      if (prev.length > 0 && prev[0].outletId !== newItem.outletId) {
        // Find outlet name for error message
        const existingOutlet = prev[0].outletName;
        const newOutlet = newItem.outletName;
        throw new Error(`Keranjang hanya boleh berisi produk dari satu outlet. Saat ini: "${existingOutlet}", mencoba menambahkan dari: "${newOutlet}"`);
      }

      // Check if same product with same variant and extras exists
      const existingIndex = prev.findIndex(
        (item) =>
          item.productId === newItem.productId &&
          item.selectedVariant?.id === newItem.selectedVariant?.id &&
          JSON.stringify(item.selectedExtras.map((e) => e.id).sort()) ===
            JSON.stringify(newItem.selectedExtras.map((e) => e.id).sort())
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }

      return [...prev, { ...newItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setNotes("");
  }, []);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, notes, setNotes, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
