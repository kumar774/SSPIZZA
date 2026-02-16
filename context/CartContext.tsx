import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, MenuItem } from '../types';

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  addItem: (item: MenuItem, restaurantId: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isOpen: boolean;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Load cart from local storage
  useEffect(() => {
    const savedCart = localStorage.getItem('cravewave_cart');
    const savedRestId = localStorage.getItem('cravewave_cart_rid');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
    if (savedRestId) setRestaurantId(savedRestId);
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('cravewave_cart', JSON.stringify(items));
    if (restaurantId) {
      localStorage.setItem('cravewave_cart_rid', restaurantId);
    } else {
      localStorage.removeItem('cravewave_cart_rid');
    }
  }, [items, restaurantId]);

  const addItem = (item: MenuItem, rid: string) => {
    // If adding from a different restaurant, clear previous cart (Simple logic)
    if (restaurantId && restaurantId !== rid) {
      if (window.confirm("Start a new basket? You have items from another restaurant.")) {
        setItems([{ ...item, quantity: 1 }]);
        setRestaurantId(rid);
        setIsOpen(true);
      }
      return;
    }

    if (!restaurantId) setRestaurantId(rid);

    setItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setIsOpen(true);
  };

  const removeItem = (itemId: string) => {
    setItems(prev => {
      const newItems = prev.filter(i => i.id !== itemId);
      if (newItems.length === 0) setRestaurantId(null);
      return newItems;
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setItems(prev => prev.map(i => {
      if (i.id === itemId) {
        const newQty = Math.max(0, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }).filter(i => i.quantity > 0));
    
    // Check if cart became empty
    if (items.length === 1 && items[0].id === itemId && items[0].quantity + delta <= 0) {
        setRestaurantId(null);
    }
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
  };

  const toggleCart = () => setIsOpen(prev => !prev);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ items, restaurantId, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isOpen, toggleCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
