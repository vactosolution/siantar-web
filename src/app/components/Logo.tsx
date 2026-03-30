import logoImage from "figma:asset/5522bec198d2c607245bbb83c121601db5647d0a.png";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
}

const sizeClasses = {
  xs: "h-6",
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-16",
};

export function Logo({ size = "md", className = "", showText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img 
        src={logoImage} 
        alt="SiAnter Logo" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
      {showText && (
        <span className="text-xl font-bold text-gray-900">SiAnter</span>
      )}
    </div>
  );
}
