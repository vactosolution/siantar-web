import { useState } from "react";
import { Plus, X } from "lucide-react";
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
}

export function QuickAddButton({ product, outletId, outletName }: QuickAddButtonProps) {
  const { addItem } = useCart();
  const { outlets } = useData();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string>("");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);

  const outlet = outlets.find(o => o.id === outletId);
  const hasVariants = product.variants && product.variants.length > 0;
  const hasExtras = product.extras && product.extras.length > 0;

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
    <>
      <button
        onClick={handleClick}
        disabled={!product.is_available}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          product.is_available
            ? "bg-orange-500 text-white hover:bg-orange-600"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        <Plus className="w-4 h-4" />
      </button>

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
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Tambahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
