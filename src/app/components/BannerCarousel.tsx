import { useState, useEffect, useCallback, useRef } from "react";
import type { Tables } from "../../lib/database.types";

type Banner = Tables<"banners">;

interface BannerCarouselProps {
  banners: Banner[];
}

export function BannerCarousel({ banners }: BannerCarouselProps) {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const activeBanners = banners.filter((b) => b.is_active).sort((a, b) => a.sort_order - b.sort_order);

  const nextBanner = useCallback(() => {
    setCurrentBanner((prev) => (prev === activeBanners.length - 1 ? 0 : prev + 1));
  }, [activeBanners.length]);

  const prevBanner = useCallback(() => {
    setCurrentBanner((prev) => (prev === 0 ? activeBanners.length - 1 : prev - 1));
  }, [activeBanners.length]);

  const resetTimer = useCallback(() => {
    if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    autoSlideRef.current = setInterval(nextBanner, 4000);
  }, [nextBanner]);

  useEffect(() => {
    if (activeBanners.length > 1) {
      resetTimer();
    }
    return () => {
      if (autoSlideRef.current) clearInterval(autoSlideRef.current);
    };
  }, [activeBanners.length, resetTimer]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextBanner();
      resetTimer();
    }
    if (isRightSwipe) {
      prevBanner();
      resetTimer();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  if (activeBanners.length === 0) return null;

  return (
    <div 
      className="relative overflow-hidden rounded-xl mb-6 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentBanner * 100}%)` }}
      >
        {activeBanners.map((banner) => (
          <div key={banner.id} className="min-w-full">
            <img
              src={banner.image_url}
              alt={banner.title}
              className="w-full h-40 md:h-72 lg:h-80 object-cover rounded-xl cursor-pointer"
              onClick={() => banner.link_url && window.open(banner.link_url, "_blank")}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {activeBanners.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrentBanner(i);
              resetTimer();
            }}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              i === currentBanner ? "bg-white w-4" : "bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
