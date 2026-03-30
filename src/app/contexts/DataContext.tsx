import { createContext, useContext, useState, ReactNode, useEffect } from "react";

// Village types
export type Village =
  | "Desa Air Dua"
  | "Desa Balai Riam (Pusat Kecamatan)"
  | "Desa Bangun Jaya"
  | "Desa Bukit Sungkai"
  | "Desa Jihing (Jihing Janga area)"
  | "Desa Lupu Peruca"
  | "Desa Pempaning"
  | "Desa Sekuningan Baru";

// Order status types
export type OrderStatus =
  | "pending" // Waiting for admin to assign driver
  | "processing" // Diproses - Admin assigned driver
  | "going-to-store" // Driver menuju toko
  | "picked-up" // Pesanan diambil
  | "on-delivery" // Dalam perjalanan
  | "completed"; // Selesai

// Outlet interface
export interface Outlet {
  id: string;
  name: string;
  village: Village;
  category: "food" | "drink" | "package";
  menuCount: number;
  image?: string; // Optional outlet image URL
}

// Product Extra/Addon interface
export interface ProductExtra {
  id: string;
  name: string;
  price: number;
}

// Product Size/Variant interface
export interface ProductSize {
  id: string;
  name: string; // "Small", "Medium", "Large"
  priceAdjustment: number; // Additional price
}

// Product interface
export interface Product {
  id: string;
  outletId: string;
  name: string;
  price: number;
  discountPrice?: number;
  description: string;
  category: "Makanan" | "Minuman";
  sizes: ProductSize[];
  extras: ProductExtra[];
  imageUrl?: string;
  isAvailable: boolean; // Stock availability
}

// Cart Item interface with full details
export interface CartItem {
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  selectedSize?: ProductSize;
  selectedExtras: ProductExtra[];
  price: number; // Final calculated price per item
  outletId: string;
  outletName: string;
}

// Order interface
export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerVillage: Village;
  address: string;
  outlet: Outlet;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    selectedSize?: string;
    selectedExtras?: string[];
  }>;
  subtotal: number;
  distance: number; // Actual distance between villages
  chargedDistance?: number; // Distance used for calculation (min 1 km)
  isMinimumChargeApplied?: boolean; // Whether minimum charge was applied
  deliveryFee: number;
  serviceFee: number;
  total: number;
  paymentMethod: "cod" | "transfer";
  paymentProvider?: "BRI" | "DANA"; // For transfer payments
  uniquePaymentCode?: number; // 3-digit unique code
  finalPaymentAmount?: number; // Total + unique code
  paymentProofUrl?: string; // Uploaded payment proof
  paymentStatus?: "pending" | "waiting_confirmation" | "confirmed" | "rejected"; // Payment verification status
  status: OrderStatus;
  driverId?: string;
  driverName?: string;
  timestamp: string;
  isManualOrder?: boolean; // Mark if order is created by admin
  isDeliveryService?: boolean; // Mark if order is a delivery service (kirim barang)
  deliveryData?: {
    senderName: string;
    senderPhone: string;
    fromVillage: Village;
    fromAddress: string;
    receiverName: string;
    receiverPhone: string;
    toVillage: Village;
    toAddress: string;
    packageCategory: string;
    estimatedWeight: number;
    notes?: string;
  };
}

// Driver interface
export interface Driver {
  id: string;
  name: string;
  phone: string;
  username: string;
  passwordHash: string;
  isActive: boolean;
  status: "online" | "offline";
  currentSessionId?: string;
  ordersToday: number;
  weeklyOrders: number;
  totalEarningToday: number;
  createdAt: string;
}

interface DataContextType {
  // Outlets
  outlets: Outlet[];
  addOutlet: (outlet: Omit<Outlet, "id">) => void;
  updateOutlet: (id: string, outlet: Partial<Outlet>) => void;
  deleteOutlet: (id: string) => void;

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  getProductsByOutlet: (outletId: string) => Product[];

  // Orders
  orders: Order[];
  addOrder: (order: Omit<Order, "id">) => string; // Returns the created order ID
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderPayment: (orderId: string, paymentData: { paymentProofUrl?: string; paymentStatus?: Order["paymentStatus"] }) => void;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  assignDriver: (orderId: string, driverId: string, driverName: string) => void;

  // Drivers
  drivers: Driver[];
  addDriver: (driver: Omit<Driver, "id" | "ordersToday" | "weeklyOrders" | "totalEarningToday" | "createdAt" | "status">) => Driver;
  updateDriver: (id: string, driver: Partial<Driver>) => void;
  deactivateDriver: (id: string) => void;
  resetDriverCredentials: (id: string, newUsername: string, newPasswordHash: string) => void;
  updateDriverSession: (id: string, sessionId: string) => void;
  getDriverByUsername: (username: string) => Driver | undefined;
  updateDriverStats: (driverId: string, stats: Partial<Driver>) => void;

  // Distance calculation
  getDistance: (villageA: Village, villageB: Village) => number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Distance mapping between villages (in km)
const DISTANCE_MAP: Record<Village, Record<Village, number>> = {
  "Desa Air Dua": {
    "Desa Air Dua": 0,
    "Desa Balai Riam (Pusat Kecamatan)": 6,
    "Desa Bangun Jaya": 14,
    "Desa Bukit Sungkai": 16,
    "Desa Jihing (Jihing Janga area)": 18,
    "Desa Lupu Peruca": 15,
    "Desa Pempaning": 14,
    "Desa Sekuningan Baru": 17,
  },
  "Desa Balai Riam (Pusat Kecamatan)": {
    "Desa Air Dua": 6,
    "Desa Balai Riam (Pusat Kecamatan)": 0,
    "Desa Bangun Jaya": 7.8,
    "Desa Bukit Sungkai": 10,
    "Desa Jihing (Jihing Janga area)": 12,
    "Desa Lupu Peruca": 9,
    "Desa Pempaning": 8,
    "Desa Sekuningan Baru": 11,
  },
  "Desa Bangun Jaya": {
    "Desa Air Dua": 14,
    "Desa Balai Riam (Pusat Kecamatan)": 7.8,
    "Desa Bangun Jaya": 0,
    "Desa Bukit Sungkai": 12,
    "Desa Jihing (Jihing Janga area)": 15,
    "Desa Lupu Peruca": 16,
    "Desa Pempaning": 10,
    "Desa Sekuningan Baru": 18,
  },
  "Desa Bukit Sungkai": {
    "Desa Air Dua": 16,
    "Desa Balai Riam (Pusat Kecamatan)": 10,
    "Desa Bangun Jaya": 12,
    "Desa Bukit Sungkai": 0,
    "Desa Jihing (Jihing Janga area)": 10,
    "Desa Lupu Peruca": 19,
    "Desa Pempaning": 18,
    "Desa Sekuningan Baru": 21,
  },
  "Desa Jihing (Jihing Janga area)": {
    "Desa Air Dua": 18,
    "Desa Balai Riam (Pusat Kecamatan)": 12,
    "Desa Bangun Jaya": 15,
    "Desa Bukit Sungkai": 10,
    "Desa Jihing (Jihing Janga area)": 0,
    "Desa Lupu Peruca": 21,
    "Desa Pempaning": 20,
    "Desa Sekuningan Baru": 13,
  },
  "Desa Lupu Peruca": {
    "Desa Air Dua": 15,
    "Desa Balai Riam (Pusat Kecamatan)": 9,
    "Desa Bangun Jaya": 16,
    "Desa Bukit Sungkai": 19,
    "Desa Jihing (Jihing Janga area)": 21,
    "Desa Lupu Peruca": 0,
    "Desa Pempaning": 17,
    "Desa Sekuningan Baru": 20,
  },
  "Desa Pempaning": {
    "Desa Air Dua": 14,
    "Desa Balai Riam (Pusat Kecamatan)": 8,
    "Desa Bangun Jaya": 10,
    "Desa Bukit Sungkai": 18,
    "Desa Jihing (Jihing Janga area)": 20,
    "Desa Lupu Peruca": 17,
    "Desa Pempaning": 0,
    "Desa Sekuningan Baru": 19,
  },
  "Desa Sekuningan Baru": {
    "Desa Air Dua": 17,
    "Desa Balai Riam (Pusat Kecamatan)": 11,
    "Desa Bangun Jaya": 18,
    "Desa Bukit Sungkai": 21,
    "Desa Jihing (Jihing Janga area)": 13,
    "Desa Lupu Peruca": 20,
    "Desa Pempaning": 19,
    "Desa Sekuningan Baru": 0,
  },
};

export function DataProvider({ children }: { children: ReactNode }) {
  // Initialize outlets from localStorage or use defaults
  const [outlets, setOutlets] = useState<Outlet[]>(() => {
    const saved = localStorage.getItem("sianter_outlets");
    if (saved) {
      return JSON.parse(saved);
    }
    // Default outlets
    return [
      {
        id: "outlet1",
        name: "Warung Makan Bu Siti",
        village: "Desa Balai Riam (Pusat Kecamatan)" as Village,
        category: "food" as const,
        menuCount: 12,
      },
      {
        id: "outlet2",
        name: "Kedai Kopi Pak Budi",
        village: "Desa Balai Riam (Pusat Kecamatan)" as Village,
        category: "drink" as const,
        menuCount: 8,
      },
      {
        id: "outlet3",
        name: "Ayam Geprek Mantap",
        village: "Desa Bangun Jaya" as Village,
        category: "food" as const,
        menuCount: 10,
      },
      {
        id: "outlet4",
        name: "Toko Sembako Maju",
        village: "Desa Air Dua" as Village,
        category: "package" as const,
        menuCount: 15,
      },
    ];
  });

  // Initialize products from localStorage
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem("sianter_products");
    return saved ? JSON.parse(saved) : [];
  });

  // Initialize orders from localStorage
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem("sianter_orders");
    return saved ? JSON.parse(saved) : [];
  });

  // Initialize drivers from localStorage or use defaults
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem("sianter_drivers");
    if (saved) {
      return JSON.parse(saved);
    }
    // Default drivers with hashed passwords (for demo)
    return [
      {
        id: "driver1",
        name: "Pak Ahmad",
        phone: "0812-3456-7890",
        username: "driver_ahmad",
        passwordHash: "hash_1lv3nlh", // password: "demo123"
        isActive: true,
        status: "offline" as const,
        ordersToday: 0,
        weeklyOrders: 0,
        totalEarningToday: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: "driver2",
        name: "Pak Joko",
        phone: "0813-4567-8901",
        username: "driver_joko",
        passwordHash: "hash_1lv3nlh", // password: "demo123"
        isActive: true,
        status: "offline" as const,
        ordersToday: 0,
        weeklyOrders: 0,
        totalEarningToday: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: "driver3",
        name: "Pak Budi",
        phone: "0814-5678-9012",
        username: "driver_budi",
        passwordHash: "hash_1lv3nlh", // password: "demo123"
        isActive: true,
        status: "offline" as const,
        ordersToday: 0,
        weeklyOrders: 0,
        totalEarningToday: 0,
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // Save to localStorage when data changes
  useEffect(() => {
    localStorage.setItem("sianter_outlets", JSON.stringify(outlets));
  }, [outlets]);

  useEffect(() => {
    localStorage.setItem("sianter_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("sianter_orders", JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem("sianter_drivers", JSON.stringify(drivers));
  }, [drivers]);

  // Outlet functions
  const addOutlet = (outlet: Omit<Outlet, "id">) => {
    const newOutlet: Outlet = {
      ...outlet,
      id: `outlet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
    setOutlets([...outlets, newOutlet]);
  };

  const updateOutlet = (id: string, updates: Partial<Outlet>) => {
    setOutlets(outlets.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  const deleteOutlet = (id: string) => {
    setOutlets(outlets.filter((o) => o.id !== id));
  };

  // Product functions
  const addProduct = (product: Omit<Product, "id">) => {
    const newProduct: Product = {
      ...product,
      id: `product_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
    setProducts([...products, newProduct]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts(products.filter((p) => p.id !== id));
  };

  const getProductsByOutlet = (outletId: string) => {
    return products.filter((p) => p.outletId === outletId);
  };

  // Order functions
  const addOrder = (order: Omit<Order, "id">): string => {
    const newOrder: Order = {
      ...order,
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
    };
    setOrders([newOrder, ...orders]);
    return newOrder.id;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(
      orders.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  const updateOrderPayment = (orderId: string, paymentData: { paymentProofUrl?: string; paymentStatus?: Order["paymentStatus"] }) => {
    setOrders(
      orders.map((o) =>
        o.id === orderId
          ? { ...o, ...paymentData }
          : o
      )
    );
  };

  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    setOrders(
      orders.map((o) =>
        o.id === orderId
          ? { ...o, ...updates }
          : o
      )
    );
  };

  const assignDriver = (orderId: string, driverId: string, driverName: string) => {
    // Check if order is already assigned
    const order = orders.find((o) => o.id === orderId);
    if (order?.driverId && order.driverId !== driverId) {
      throw new Error("Order sudah di-assign ke driver lain!");
    }

    setOrders(
      orders.map((o) =>
        o.id === orderId
          ? { ...o, driverId, driverName, status: "processing" as OrderStatus }
          : o
      )
    );
  };

  // Driver functions
  const addDriver = (driver: Omit<Driver, "id" | "ordersToday" | "weeklyOrders" | "totalEarningToday" | "createdAt" | "status">): Driver => {
    const newDriver: Driver = {
      ...driver,
      id: `driver_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ordersToday: 0,
      weeklyOrders: 0,
      totalEarningToday: 0,
      createdAt: new Date().toISOString(),
      status: "offline" as const,
    };
    setDrivers([...drivers, newDriver]);
    return newDriver;
  };

  const updateDriver = (id: string, driver: Partial<Driver>) => {
    setDrivers(drivers.map((d) => (d.id === id ? { ...d, ...driver } : d)));
  };

  const deactivateDriver = (id: string) => {
    setDrivers(drivers.map((d) => (d.id === id ? { ...d, isActive: false } : d)));
  };

  const resetDriverCredentials = (id: string, newUsername: string, newPasswordHash: string) => {
    setDrivers(drivers.map((d) => (d.id === id ? { ...d, username: newUsername, passwordHash: newPasswordHash } : d)));
  };

  const updateDriverSession = (id: string, sessionId: string) => {
    setDrivers(drivers.map((d) => (d.id === id ? { ...d, currentSessionId: sessionId } : d)));
  };

  const getDriverByUsername = (username: string) => {
    return drivers.find((d) => d.username === username);
  };

  const updateDriverStats = (driverId: string, stats: Partial<Driver>) => {
    setDrivers(drivers.map((d) => (d.id === driverId ? { ...d, ...stats } : d)));
  };

  // Distance calculation
  const getDistance = (villageA: Village, villageB: Village): number => {
    return DISTANCE_MAP[villageA]?.[villageB] ?? 0;
  };

  return (
    <DataContext.Provider
      value={{
        outlets,
        addOutlet,
        updateOutlet,
        deleteOutlet,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductsByOutlet,
        orders,
        addOrder,
        updateOrderStatus,
        updateOrderPayment,
        updateOrder,
        assignDriver,
        drivers,
        addDriver,
        updateDriver,
        deactivateDriver,
        resetDriverCredentials,
        updateDriverSession,
        getDriverByUsername,
        updateDriverStats,
        getDistance,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
}