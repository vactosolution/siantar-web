import logoImg from "../../assets/siantar-aja-logo.png";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showText?: boolean;
}

const sizeClasses = {
  xs: "w-6 h-6",
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};

export function Logo({ size = "md", className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={logoImg} alt="SiAnter" className={`${sizeClasses[size]} object-contain`} />
      {showText && (
        <span className="font-bold text-gray-900">SiAnter</span>
      )}
    </div>
  );
}
