import { useState, useEffect } from "react";
import { DoorClosed, Plus, X } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { useData } from "../contexts/DataContext";
import type { ProductWithDetails, ProductVariant, ProductExtra } from "../contexts/DataContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface QuickAddButtonProps {
  product: ProductWithDetails;
  outletId: string;
  outletName: string;
  isOpen?: boolean;
  quantity?: number;
}

export function QuickAddButton({ product, outletId, outletName, isOpen = true, quantity = 0 }: QuickAddButtonProps) {
  const { addItem } = useCart();
  const { outlets } = useData();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  const outlet = outlets.find(o => o.id === outletId);
  const hasVariants = product.variants && product.variants.length > 0;
  const hasExtras = product.extras && product.extras.length > 0;

  // Auto-select first variant
  useEffect(() => {
    if (hasVariants && product.variants && !selectedVariant) {
      setSelectedVariant(product.variants[0].id);
    }
  }, [hasVariants, product.variants, selectedVariant]);

  const isMarkupEnabled = product.markup_enabled !== null 
    ? product.markup_enabled 
    : (outlet?.markup_enabled !== false);
  
  const markupAmountPerItem = isMarkupEnabled ? 1000 : 0;

  const calculatePrice = () => {
    let price = (product.discount_price ?? product.price) + markupAmountPerItem;

    if (selectedVariant) {
      const variant = product.variants?.find((v) => v.id === selectedVariant);
      if (variant) price += variant.price_adjustment;
    }

    selectedExtras.forEach((extraId) => {
      const extra = product.extras?.find((e) => e.id === extraId);
      if (extra) price += extra.price;
    });

    return price;
  };

  const handleDirectAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      basePrice: (product.discount_price ?? product.price),
      markupAmount: markupAmountPerItem,
      price: (product.discount_price ?? product.price) + markupAmountPerItem,
      outletId,
      outletName,
      imageUrl: product.image_url,
      selectedExtras: [],
    });
    toast.success(`${product.name} ditambahkan ke keranjang`);
  };

  const handleAddWithOptions = () => {
    const variant = selectedVariant
      ? product.variants?.find((v) => v.id === selectedVariant)
      : undefined;
    const extras = selectedExtras
      .map((id) => product.extras?.find((e) => e.id === id))
      .filter((e): e is ProductExtra => !!e);

    const price = calculatePrice();

    addItem({
      productId: product.id,
      name: product.name,
      basePrice: (product.discount_price ?? product.price),
      selectedVariant: variant,
      selectedExtras: extras,
      markupAmount: markupAmountPerItem,
      price,
      outletId,
      outletName,
      imageUrl: product.image_url,
    });
    toast.success(`${product.name} ditambahkan ke keranjang`);
    setShowDialog(false);
    setSelectedVariant("");
    setSelectedExtras([]);
  };

  const handleClick = () => {
    if (!product.is_available) return;

    if (hasVariants || hasExtras) {
      setShowDialog(true);
    } else {
      handleDirectAdd();
    }
  };

  const toggleExtra = (extraId: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    );
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={handleClick}
        disabled={!product.is_available || !isOpen}
        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors relative ${
          product.is_available && isOpen
            ? "bg-orange-500 text-white hover:bg-orange-600"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        {!isOpen ? <DoorClosed className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
        {isOpen && quantity > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {quantity}
          </span>
        )}
      </button>
      {isOpen && quantity > 0 && (
        <span className="text-xs text-orange-600 font-medium">
          {quantity}x
        </span>
      )}
      {!isOpen && (
        <span className="text-[10px] text-red-500 font-bold uppercase mt-1">Tutup</span>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Variant Selection */}
            {hasVariants && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Varian
                </label>
                <div className="space-y-2">
                  {product.variants?.map((variant: ProductVariant) => (
                    <label
                      key={variant.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedVariant === variant.id
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="variant"
                          checked={selectedVariant === variant.id}
                          onChange={() => setSelectedVariant(variant.id)}
                          className="w-4 h-4 text-orange-500"
                        />
                        <span className="font-medium text-sm">{variant.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {variant.price_adjustment > 0
                          ? `+Rp ${variant.price_adjustment.toLocaleString("id-ID")}`
                          : variant.price_adjustment < 0
                          ? `-Rp ${Math.abs(variant.price_adjustment).toLocaleString("id-ID")}`
                          : "Gratis"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Extras Selection */}
            {hasExtras && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tambahan (opsional)
                </label>
                <div className="space-y-2">
                  {product.extras?.map((extra: ProductExtra) => (
                    <label
                      key={extra.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedExtras.includes(extra.id)
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedExtras.includes(extra.id)}
                          onChange={() => toggleExtra(extra.id)}
                          className="w-4 h-4 text-orange-500 rounded"
                        />
                        <span className="text-sm">{extra.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        +Rp {extra.price.toLocaleString("id-ID")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Price Summary */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Total</span>
            <span className="text-lg font-bold text-orange-600">
              Rp {calculatePrice().toLocaleString("id-ID")}
            </span>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="border-gray-300"
            >
              Batal
            </Button>
            <Button
              onClick={handleAddWithOptions}
              disabled={hasVariants && !selectedVariant}
              className="bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Tambahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
