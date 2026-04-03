import { useState } from "react";
import type { Tables } from "../../lib/database.types";

type Banner = Tables<"banners">;

interface BannerCarouselProps {
  banners: Banner[];
}

export function BannerCarousel({ banners }: BannerCarouselProps) {
  const [currentBanner, setCurrentBanner] = useState(0);
  const activeBanners = banners.filter((b) => b.is_active).sort((a, b) => a.sort_order - b.sort_order);

  if (activeBanners.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-xl mb-6">
      <div
        className="flex transition-transform duration-500"
        style={{ transform: `translateX(-${currentBanner * 100}%)` }}
      >
        {activeBanners.map((banner) => (
          <div key={banner.id} className="min-w-full">
            <img
              src={banner.image_url}
              alt={banner.title}
              className="w-full h-40 md:h-56 object-cover rounded-xl cursor-pointer"
              onClick={() => banner.link_url && window.open(banner.link_url, "_blank")}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {activeBanners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentBanner(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === currentBanner ? "bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
