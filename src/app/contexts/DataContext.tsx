import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { subscribeToTable, unsubscribe } from "../../lib/realtime";
import type { Tables, TablesInsert } from "../../lib/database.types";

// Re-export types for backward compatibility
export type Village = string;
export type OrderStatus = "pending" | "driver_assigned" | "processing" | "going-to-store" | "picked-up" | "on-delivery" | "completed" | "cancelled";

export type Outlet = Tables<"outlets">;
export type Product = Tables<"products">;
export type ProductVariant = Tables<"product_variants">;
export type ProductExtra = Tables<"product_extras">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;

// Extended order item with product data
export interface OrderItemWithProduct extends OrderItem {
  image_url?: string | null;
  product_name?: string;
  product_price?: number;
}
export type Profile = Tables<"profiles"> & { dana_number?: string };
export type PaymentAccount = Tables<"payment_accounts">;
export type FeeSetting = Tables<"fee_settings">;
export type AppSetting = { key: string; value: any };
export type OrderRating = {
  id: string;
  order_id: string;
  customer_phone: string;
  driver_id: string | null;
  outlet_id: string | null;
  driver_rating: number;
  outlet_rating: number;
  comment: string | null;
  created_at: string;
};

// Extended product with variants and extras
export interface ProductWithDetails extends Product {
  variants: ProductVariant[];
  extras: ProductExtra[];
}

// Extended order with items
export interface OrderWithItems extends Order {
  items: OrderItem[];
}

// Cart item
export interface CartItem {
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  selectedVariant?: ProductVariant;
  selectedExtras: ProductExtra[];
  markupAmount: number;
  price: number;
  outletId: string;
  outletName: string;
  imageUrl?: string | null;
}

interface DataContextType {
  outlets: Outlet[];
  addOutlet: (outlet: TablesInsert<"outlets">) => Promise<void>;
  updateOutlet: (id: string, outlet: Partial<TablesInsert<"outlets">>) => Promise<void>;
  deleteOutlet: (id: string) => Promise<void>;
  restoreOutlet: (id: string) => Promise<void>;
  toggleOutletOpen: (id: string) => Promise<void>;
  loadingOutlets: boolean;

  products: ProductWithDetails[];
  addProduct: (product: TablesInsert<"products">, variants: TablesInsert<"product_variants">[], extras: TablesInsert<"product_extras">[]) => Promise<void>;
  updateProduct: (
    id: string, 
    product: Partial<TablesInsert<"products">>,
    variants?: Omit<ProductVariant, "id" | "created_at">[],
    extras?: Omit<ProductExtra, "id" | "created_at">[]
  ) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProductsByOutlet: (outletId: string) => ProductWithDetails[];
  refreshProducts: () => Promise<void>;
  loadingProducts: boolean;

  orders: Order[];
  addOrder: (order: TablesInsert<"orders">, items: TablesInsert<"order_items">[]) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus, changedBy?: string) => Promise<void>;
  updateOrderPayment: (orderId: string, paymentData: { payment_proof_url?: string; payment_status?: string }) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<TablesInsert<"orders">>) => Promise<void>;
  assignDriver: (orderId: string, driverId: string, driverName: string) => Promise<string>;
  rejectOrder: (orderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  refreshOrders: () => Promise<void>;
  loadingOrders: boolean;

  drivers: Profile[];
  addDriver: (name: string, phone: string, password: string) => Promise<{ email: string; password: string }>;
  updateDriver: (id: string, driver: Partial<Profile>) => Promise<void>;
  deactivateDriver: (id: string) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  refreshDrivers: () => Promise<void>;
  loadingDrivers: boolean;

  paymentAccounts: PaymentAccount[];
  refreshPaymentAccounts: () => Promise<void>;

  feeSettings: Record<string, number>;
  refreshFeeSettings: () => Promise<void>;

  updateDriverBalance: (driverId: string, amount: number) => Promise<void>;
  driverRejectOrder: (orderId: string, driverId: string) => Promise<void>;
  toggleDriverOnline: (driverId: string) => Promise<boolean>;
  updateDriverLocation: (driverId: string, latitude: number, longitude: number) => Promise<void>;
  completeOrderWithDeduction: (orderId: string, driverId: string) => Promise<void>;

  orderItemsCache: Record<string, OrderItemWithProduct[]>;
  fetchOrderItems: (orderId: string) => Promise<OrderItemWithProduct[]>;

  appSettings: Record<string, any>;
  updateAppSetting: (key: string, value: any) => Promise<void>;
  refreshAppSettings: () => Promise<void>;

  orderRatings: OrderRating[];
  submitOrderRating: (rating: Omit<OrderRating, "id" | "created_at">) => Promise<void>;
  refreshOrderRatings: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [feeSettings, setFeeSettings] = useState<Record<string, number>>({});
  const [orderItemsCache, setOrderItemsCache] = useState<Record<string, OrderItemWithProduct[]>>({});
  const [appSettings, setAppSettings] = useState<Record<string, any>>({});
  const [orderRatings, setOrderRatings] = useState<OrderRating[]>([]);

  const [loadingOutlets, setLoadingOutlets] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(true);

  // Fetch outlets
  const refreshOutlets = useCallback(async () => {
    setLoadingOutlets(true);
    const { data } = await supabase.from("outlets").select("*").order("created_at");
    setOutlets(data || []);
    setLoadingOutlets(false);
  }, []);

  // Fetch products with variants and extras
  const refreshProducts = useCallback(async () => {
    setLoadingProducts(true);
    const { data: prods } = await supabase.from("products").select("*").order("created_at");
    const { data: variants } = await supabase.from("product_variants").select("*");
    const { data: extras } = await supabase.from("product_extras").select("*");

    const productsWithDetails: ProductWithDetails[] = (prods || []).map((p) => ({
      ...p,
      variants: (variants || []).filter((v) => v.product_id === p.id),
      extras: (extras || []).filter((e) => e.product_id === p.id),
    }));

    setProducts(productsWithDetails);
    setLoadingProducts(false);
  }, []);

  // Fetch orders
  const refreshOrders = useCallback(async () => {
    setLoadingOrders(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders(data || []);
    setLoadingOrders(false);
  }, []);

  // Fetch drivers (profiles with role=driver)
  const refreshDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    const { data } = await supabase.from("profiles").select("*").eq("role", "driver").order("created_at");
    setDrivers(data || []);
    setLoadingDrivers(false);
  }, []);

  // Fetch payment accounts
  const refreshPaymentAccounts = useCallback(async () => {
    const { data } = await supabase.from("payment_accounts").select("*").eq("is_active", true);
    setPaymentAccounts(data || []);
  }, []);

  // Fetch fee settings
  const refreshFeeSettings = useCallback(async () => {
    const { data, error } = await supabase.from("fee_settings").select("*");
    if (error) {
      console.error("Error fetching fee_settings:", error);
      return;
    }
    const settings: Record<string, number> = {};
    (data || []).forEach((s) => {
      settings[s.key] = s.value;
    });
    setFeeSettings(settings);
  }, []);

  // Fetch app settings
  const refreshAppSettings = useCallback(async () => {
    const { data } = await (supabase.from as any)("app_settings").select("*");
    const settings: Record<string, any> = {};
    (data || []).forEach((s: any) => {
      settings[s.key] = s.value;
    });
    setAppSettings(settings);
  }, []);

  // Fetch order ratings
  const refreshOrderRatings = useCallback(async () => {
    const { data } = await (supabase.from as any)("order_ratings").select("*").order("created_at", { ascending: false });
    setOrderRatings((data as any) || []);
  }, []);

  // Initial load
  useEffect(() => {
    refreshOutlets();
    refreshProducts();
    refreshOrders();
    refreshDrivers();
    refreshPaymentAccounts();
    refreshFeeSettings();
    refreshAppSettings();
    refreshOrderRatings();

    const ordersChannel = subscribeToTable('orders', (payload) => {
      if (payload.eventType === 'UPDATE') {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } as Order : o));
      } else if (payload.eventType === 'INSERT') {
        setOrders(prev => [payload.new as Order, ...prev]);
      } else if (payload.eventType === 'DELETE') {
        setOrders(prev => prev.filter(o => o.id !== payload.old.id));
      }
    });
    
    const productsChannel = subscribeToTable('products', () => refreshProducts());
    
    const outletsChannel = subscribeToTable('outlets', (payload) => {
      if (payload.eventType === 'UPDATE') {
        setOutlets(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } as Outlet : o));
      } else if (payload.eventType === 'INSERT') {
        setOutlets(prev => [...prev, payload.new as Outlet]);
      } else if (payload.eventType === 'DELETE') {
        setOutlets(prev => prev.filter(o => o.id !== payload.old.id));
      }
    });
    
    const appSettingsChannel = subscribeToTable('app_settings', () => refreshAppSettings());

    // Profiles: incremental update for driver balance/name changes
    const profilesChannel = subscribeToTable('profiles', (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new.role === 'driver') {
        setDrivers(prev => prev.map(d => d.id === payload.new.id ? { ...d, ...payload.new } as Profile : d));
      } else if (payload.eventType === 'INSERT' && payload.new.role === 'driver') {
        setDrivers(prev => [...prev, payload.new as Profile]);
      } else if (payload.eventType === 'DELETE') {
        setDrivers(prev => prev.filter(d => d.id !== payload.old.id));
      } else {
        // Fallback: full refresh for non-driver profile changes
        refreshDrivers();
      }
    });

    // Fallback Polling: DISABLED for WebSocket-only testing
    // Uncomment the lines below to enable polling every 5 seconds
    /*
    const pollingInterval = setInterval(() => {
      refreshOrders();
    }, 5000);
    */
    const pollingInterval = undefined as unknown as ReturnType<typeof setInterval>;

    return () => {
      unsubscribe(ordersChannel);
      unsubscribe(productsChannel);
      unsubscribe(outletsChannel);
      unsubscribe(profilesChannel);
      unsubscribe(appSettingsChannel);
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, []);

  // Outlet CRUD
  const addOutlet = useCallback(async (outlet: TablesInsert<"outlets">) => {
    const { error } = await supabase.from("outlets").insert(outlet);
    if (error) throw error;
    await refreshOutlets();
  }, [refreshOutlets]);

  const updateOutlet = useCallback(async (id: string, outlet: Partial<TablesInsert<"outlets">>) => {
    const { error } = await supabase.from("outlets").update(outlet).eq("id", id);
    if (error) throw error;
    await refreshOutlets();
  }, [refreshOutlets]);

  const deleteOutlet = useCallback(async (id: string) => {
    const { error } = await supabase.from("outlets").update({ is_active: false }).eq("id", id);
    if (error) throw error;
    await refreshOutlets();
  }, [refreshOutlets]);

  const restoreOutlet = useCallback(async (id: string) => {
    const { error } = await supabase.from("outlets").update({ is_active: true }).eq("id", id);
    if (error) throw error;
    await refreshOutlets();
  }, [refreshOutlets]);

  const toggleOutletOpen = useCallback(async (id: string) => {
    const outlet = outlets.find(o => o.id === id);
    if (!outlet) return;
    const { error } = await supabase.from("outlets").update({ 
      is_open: !outlet.is_open,
      is_manual_schedule: true 
    }).eq("id", id);
    if (error) throw error;
    await refreshOutlets();
  }, [refreshOutlets, outlets]);

  // Product CRUD
  const addProduct = useCallback(async (
    product: TablesInsert<"products">,
    variants: TablesInsert<"product_variants">[],
    extras: TablesInsert<"product_extras">[]
  ) => {
    const { data: newProduct, error } = await supabase
      .from("products")
      .insert(product)
      .select()
      .single();
    if (error) throw error;
    if (!newProduct) throw new Error("Failed to create product");

    if (variants.length > 0) {
      const { error: vError } = await supabase
        .from("product_variants")
        .insert(variants.map((v) => ({ ...v, product_id: newProduct.id })));
      if (vError) throw vError;
    }

    if (extras.length > 0) {
      const { error: eError } = await supabase
        .from("product_extras")
        .insert(extras.map((e) => ({ ...e, product_id: newProduct.id })));
      if (eError) throw eError;
    }

    await refreshProducts();
  }, [refreshProducts]);

  const updateProduct = useCallback(async (
    id: string, 
    product: Partial<TablesInsert<"products">>,
    variants: Omit<ProductVariant, "id" | "created_at">[] = [],
    extras: Omit<ProductExtra, "id" | "created_at">[] = []
  ) => {
    const { error } = await supabase.from("products").update(product).eq("id", id);
    if (error) throw error;

    // Sync variants: delete and re-insert
    await supabase.from("product_variants").delete().eq("product_id", id);
    if (variants.length > 0) {
      const { error: vError } = await supabase
        .from("product_variants")
        .insert(variants.map(v => ({ ...v, product_id: id })));
      if (vError) throw vError;
    }

    // Sync extras: delete and re-insert
    await supabase.from("product_extras").delete().eq("product_id", id);
    if (extras.length > 0) {
      const { error: eError } = await supabase
        .from("product_extras")
        .insert(extras.map(e => ({ ...e, product_id: id })));
      if (eError) throw eError;
    }

    await refreshProducts();
  }, [refreshProducts]);

  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    await refreshProducts();
  }, [refreshProducts]);

  const getProductsByOutlet = useCallback((outletId: string) => {
    return products.filter((p) => p.outlet_id === outletId);
  }, [products]);

  // Order CRUD
  const addOrder = useCallback(async (
    order: TablesInsert<"orders">,
    items: TablesInsert<"order_items">[]
  ): Promise<string> => {
    console.log("Creating order via RPC:", JSON.stringify(order, null, 2));
    console.log("Order items:", JSON.stringify(items, null, 2));

    // Convert items to JSON for the RPC function
    const rpcItems = items.map(i => ({
      product_id: i.product_id || null,
      name: i.name,
      price: i.price,
      quantity: i.quantity || 1,
      markup_amount: (i as any).markup_amount || 0,
      item_total: i.item_total,
      selected_variant: i.selected_variant || null,
      selected_extras: i.selected_extras || [],
    }));

    const { data: orderId, error } = await supabase.rpc('create_order', {
      p_customer_name: order.customer_name!,
      p_customer_phone: order.customer_phone!,
      p_customer_village: order.customer_village!,
      p_address: order.address!,
      p_outlet_id: order.outlet_id!,
      p_outlet_name: order.outlet_name!,
      p_subtotal: order.subtotal!,
      p_distance: order.distance || 0,
      p_charged_distance: order.charged_distance || 0,
      p_delivery_fee: order.delivery_fee!,
      p_service_fee: order.service_fee!,
      p_admin_fee: order.admin_fee || 0,
      p_total: order.total!,
      p_payment_method: order.payment_method!,
      p_payment_provider: order.payment_provider || null,
      p_unique_payment_code: order.unique_payment_code || null,
      p_final_payment_amount: order.final_payment_amount || null,
      p_payment_status: order.payment_status || 'pending',
      p_status: order.status || 'pending',
      p_is_manual_order: order.is_manual_order || false,
      p_is_delivery_service: order.is_delivery_service || false,
      p_items: rpcItems,
      p_customer_latitude: order.customer_latitude || null,
      p_customer_longitude: order.customer_longitude || null,
      p_zone: order.zone || null,
    });

    if (error) {
      console.error("create_order RPC error:", error);
      throw error;
    }

    await refreshOrders();
    return orderId;
  }, [refreshOrders]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, driverId?: string) => {
    const { error } = await supabase.rpc('update_order_status', {
      p_order_id: orderId,
      p_status: status,
      p_driver_id: driverId || null,
      p_driver_name: null
    });
    if (error) {
      console.error("updateOrderStatus error:", error);
      throw error;
    }

    await refreshOrders();
  }, [refreshOrders]);

  const updateOrderPayment = useCallback(async (orderId: string, paymentData: { payment_proof_url?: string; payment_status?: string }) => {
    const { error } = await supabase.rpc('update_order_payment', {
      p_order_id: orderId,
      p_payment_proof_url: paymentData.payment_proof_url || null,
      p_payment_status: paymentData.payment_status || null,
    });
    if (error) throw error;
    await refreshOrders();
  }, [refreshOrders]);

  const updateOrder = useCallback(async (orderId: string, updates: Partial<TablesInsert<"orders">>) => {
    const { error } = await supabase.from("orders").update(updates).eq("id", orderId);
    if (error) throw error;
    await refreshOrders();
  }, [refreshOrders]);

  const assignDriver = useCallback(async (orderId: string, driverId: string, driverName: string) => {
    const { data, error } = await supabase.rpc('assign_driver_to_order', {
      p_order_id: orderId,
      p_driver_id: driverId,
      p_driver_name: driverName,
    });
    if (error) throw error;
    await refreshOrders();
    return data;
  }, [refreshOrders]);

  const rejectOrder = useCallback(async (orderId: string) => {
    const { error } = await supabase.rpc('reject_order', { p_order_id: orderId });
    if (error) throw error;
    await refreshOrders();
  }, [refreshOrders]);

  const deleteOrder = useCallback(async (orderId: string) => {
    const { error } = await supabase.rpc('delete_order', { p_order_id: orderId });
    if (error) throw error;
    await refreshOrders();
  }, [refreshOrders]);

  // Driver CRUD
  const addDriver = useCallback(async (name: string, phone: string, password: string): Promise<{ email: string; password: string }> => {
    // Create auth user with admin API
    const email = `driver_${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@siantar.id`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
          role: "driver",
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error("Failed to create driver user");

    // Store email in profile for display and set initial balance
    await supabase
      .from("profiles")
      .update({ email, balance: 100000 } as any)
      .eq("id", data.user.id);

    await refreshDrivers();
    return { email, password };
  }, [refreshDrivers]);

  const updateDriver = useCallback(async (id: string, driver: Partial<Profile>) => {
    const { error } = await supabase.from("profiles").update(driver).eq("id", id);
    if (error) throw error;
    await refreshDrivers();
  }, [refreshDrivers]);

  const deactivateDriver = useCallback(async (id: string) => {
    const { error } = await supabase.from("profiles").update({ is_active: false }).eq("id", id);
    if (error) throw error;
    await refreshDrivers();
  }, [refreshDrivers]);

  const deleteDriver = useCallback(async (id: string) => {
    const { error } = await supabase.rpc('delete_driver', { p_driver_id: id });
    if (error) throw error;
    await refreshDrivers();
  }, [refreshDrivers]);

  // Update driver balance using atomic RPC (positive = top up, negative = deduct)
  const updateDriverBalance = useCallback(async (driverId: string, amount: number) => {
    const { error } = await supabase.rpc('update_driver_balance', {
      p_driver_id: driverId,
      p_amount: amount,
    });
    if (error) throw error;
    await refreshDrivers();
  }, [refreshDrivers]);

  // Driver rejects an assigned order (deducts Rp500 penalty)
  const driverRejectOrder = useCallback(async (orderId: string, driverIdParam: string) => {
    const { error } = await supabase.rpc('driver_reject_order', {
      p_order_id: orderId,
      p_driver_id: driverIdParam,
    });
    if (error) throw error;
    await refreshOrders();
    await refreshDrivers();
  }, [refreshOrders, refreshDrivers]);

  // Toggle driver online/offline status
  const toggleDriverOnline = useCallback(async (driverIdParam: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('toggle_driver_online', {
      p_driver_id: driverIdParam,
    });
    if (error) throw error;
    await refreshDrivers();
    return data as boolean;
  }, [refreshDrivers]);

  // Update driver GPS location (Fitur #55)
  const updateDriverLocation = useCallback(async (driverIdParam: string, latitude: number, longitude: number) => {
    const { error } = await supabase
      .from("profiles")
      .update({ 
        latitude, 
        longitude, 
        last_location_update: new Date().toISOString() 
      })
      .eq("id", driverIdParam);
    if (error) {
      console.error("updateDriverLocation error:", error);
      return;
    }
    // Update local state incrementally to avoid full refresh flicker
    setDrivers(prev => prev.map(d => d.id === driverIdParam ? { ...d, latitude, longitude, last_location_update: new Date().toISOString() } : d));
  }, []);

  // Complete order with automatic bagi hasil deduction from driver balance
  const completeOrderWithDeduction = useCallback(async (orderId: string, driverIdParam: string) => {
    const { error } = await supabase.rpc('complete_order_with_deduction', {
      p_order_id: orderId,
      p_driver_id: driverIdParam,
    });
    if (error) throw error;
    await refreshOrders();
    await refreshDrivers();
  }, [refreshOrders, refreshDrivers]);

  // Update global app setting
  const updateAppSetting = useCallback(async (key: string, value: any) => {
    const { error } = await (supabase.from as any)("app_settings").upsert({ key, value });
    if (error) throw error;
    await refreshAppSettings();
  }, [refreshAppSettings]);

  // Submit order rating
  const submitOrderRating = useCallback(async (rating: Omit<OrderRating, "id" | "created_at">) => {
    const { error } = await (supabase.from as any)("order_ratings").insert(rating);
    if (error) throw error;
    await refreshOrderRatings();
  }, [refreshOrderRatings]);

  // Fetch order items for a specific order (lazy-load with cache)
  const fetchOrderItems = useCallback(async (orderId: string): Promise<OrderItemWithProduct[]> => {
    // Return cached data if available
    if (orderItemsCache[orderId]) {
      return orderItemsCache[orderId];
    }

    const { data: items, error } = await supabase
      .from('order_items')
      .select('*, products:product_id(image_url, name, price, markup_enabled)')
      .eq('order_id', orderId)
      .order('created_at');

    if (error) {
      console.error('fetchOrderItems error:', error);
      return [];
    }

    const enrichedItems: OrderItemWithProduct[] = (items || []).map((item: any) => ({
      ...item,
      image_url: item.products?.image_url || null,
      product_name: item.products?.name || item.name,
      product_price: item.products?.price || item.price,
      markup_enabled: item.products?.markup_enabled ?? true,
      products: undefined, // Clean up the join artifact
    }));

    setOrderItemsCache(prev => ({ ...prev, [orderId]: enrichedItems }));
    return enrichedItems;
  }, [orderItemsCache]);

  return (
    <DataContext.Provider
      value={{
        outlets,
        addOutlet,
        updateOutlet,
        deleteOutlet,
        restoreOutlet,
        toggleOutletOpen,
        loadingOutlets,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        getProductsByOutlet,
        refreshProducts,
        loadingProducts,
        orders,
        addOrder,
        updateOrderStatus,
        updateOrderPayment,
        updateOrder,
        assignDriver,
        rejectOrder,
        deleteOrder,
        refreshOrders,
        loadingOrders,
        drivers,
        addDriver,
        updateDriver,
        deactivateDriver,
        deleteDriver,
        refreshDrivers,
        loadingDrivers,
        paymentAccounts,
        refreshPaymentAccounts,
        feeSettings,
        refreshFeeSettings,
        updateDriverBalance,
        driverRejectOrder,
        toggleDriverOnline,
        updateDriverLocation,
        completeOrderWithDeduction,
        orderItemsCache,
        fetchOrderItems,
        appSettings,
        updateAppSetting,
        refreshAppSettings,
        orderRatings,
        submitOrderRating,
        refreshOrderRatings,
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
