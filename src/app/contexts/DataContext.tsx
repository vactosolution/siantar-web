import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { subscribeToTable, unsubscribe } from "../../lib/realtime";
import type { Tables, TablesInsert } from "../../lib/database.types";

// Re-export types for backward compatibility
export type Village = string;
export type OrderStatus = "pending" | "processing" | "going-to-store" | "picked-up" | "on-delivery" | "completed";

export type Outlet = Tables<"outlets">;
export type Product = Tables<"products">;
export type ProductVariant = Tables<"product_variants">;
export type ProductExtra = Tables<"product_extras">;
export type Order = Tables<"orders">;
export type OrderItem = Tables<"order_items">;
export type Profile = Tables<"profiles">;
export type PaymentAccount = Tables<"payment_accounts">;
export type FeeSetting = Tables<"fee_settings">;
export type DistanceMatrix = Tables<"distance_matrix">;

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
  loadingOutlets: boolean;

  products: ProductWithDetails[];
  addProduct: (product: TablesInsert<"products">, variants: TablesInsert<"product_variants">[], extras: TablesInsert<"product_extras">[]) => Promise<void>;
  updateProduct: (id: string, product: Partial<TablesInsert<"products">>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProductsByOutlet: (outletId: string) => ProductWithDetails[];
  refreshProducts: () => Promise<void>;
  loadingProducts: boolean;

  orders: Order[];
  addOrder: (order: TablesInsert<"orders">, items: TablesInsert<"order_items">[]) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus, changedBy?: string) => Promise<void>;
  updateOrderPayment: (orderId: string, paymentData: { payment_proof_url?: string; payment_status?: string }) => Promise<void>;
  updateOrder: (orderId: string, updates: Partial<TablesInsert<"orders">>) => Promise<void>;
  assignDriver: (orderId: string, driverId: string, driverName: string) => Promise<void>;
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

  distanceMatrix: DistanceMatrix[];
  getDistance: (fromVillage: string, toVillage: string) => number;
  getDeliveryFee: (fromVillage: string, toVillage: string) => number;
  refreshDistanceMatrix: () => Promise<void>;
  updateDriverBalance: (driverId: string, amount: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [feeSettings, setFeeSettings] = useState<Record<string, number>>({});
  const [distanceMatrix, setDistanceMatrix] = useState<DistanceMatrix[]>([]);

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

  // Fetch distance matrix
  const refreshDistanceMatrix = useCallback(async () => {
    const { data } = await supabase.from("distance_matrix").select("*");
    setDistanceMatrix(data || []);
  }, []);

  // Initial load
  useEffect(() => {
    refreshOutlets();
    refreshProducts();
    refreshOrders();
    refreshDrivers();
    refreshPaymentAccounts();
    refreshFeeSettings();
    refreshDistanceMatrix();

    // Realtime subscriptions
    const ordersChannel = subscribeToTable('orders', () => refreshOrders());
    const productsChannel = subscribeToTable('products', () => refreshProducts());
    const outletsChannel = subscribeToTable('outlets', () => refreshOutlets());
    const profilesChannel = subscribeToTable('profiles', () => refreshDrivers());

    return () => {
      unsubscribe(ordersChannel);
      unsubscribe(productsChannel);
      unsubscribe(outletsChannel);
      unsubscribe(profilesChannel);
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
    const { error } = await supabase.from("outlets").delete().eq("id", id);
    if (error) throw error;
    await refreshOutlets();
  }, [refreshOutlets]);

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

  const updateProduct = useCallback(async (id: string, product: Partial<TablesInsert<"products">>) => {
    const { error } = await supabase.from("products").update(product).eq("id", id);
    if (error) throw error;
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
      item_total: i.item_total,
      selected_variant: i.selected_variant || null,
      selected_extras: i.selected_extras || [],
    }));

    const { data: orderId, error } = await supabase.rpc('create_order', {
      p_order_id: order.id!,
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
    });

    if (error) {
      console.error("create_order RPC error:", error);
      throw error;
    }

    await refreshOrders();
    return orderId;
  }, [refreshOrders]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus, changedBy?: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) throw error;

    await supabase.from("order_status_history").insert({
      order_id: orderId,
      status,
      changed_by: changedBy || null,
    });

    await refreshOrders();
  }, [refreshOrders]);

  const updateOrderPayment = useCallback(async (orderId: string, paymentData: { payment_proof_url?: string; payment_status?: string }) => {
    const { error } = await supabase.from("orders").update(paymentData).eq("id", orderId);
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

  // Distance calculation
  const getDistance = useCallback((fromVillage: string, toVillage: string): number => {
    const entry = distanceMatrix.find(
      (d) => d.from_village === fromVillage && d.to_village === toVillage
    );
    return entry?.distance_km ?? 0;
  }, [distanceMatrix]);

  // Delivery fee lookup from distance_matrix.fee
  const getDeliveryFee = useCallback((fromVillage: string, toVillage: string): number => {
    const entry = distanceMatrix.find(
      (d) => d.from_village === fromVillage && d.to_village === toVillage
    );
    return entry?.fee ?? 0;
  }, [distanceMatrix]);

  // Update driver balance using atomic RPC (positive = top up, negative = deduct)
  const updateDriverBalance = useCallback(async (driverId: string, amount: number) => {
    const { error } = await supabase.rpc('update_driver_balance', {
      p_driver_id: driverId,
      p_amount: amount,
    });
    if (error) throw error;
    await refreshDrivers();
  }, [refreshDrivers]);

  return (
    <DataContext.Provider
      value={{
        outlets,
        addOutlet,
        updateOutlet,
        deleteOutlet,
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
        distanceMatrix,
        getDistance,
        getDeliveryFee,
        refreshDistanceMatrix,
        updateDriverBalance,
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
