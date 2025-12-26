"use client";

import Image from "next/image";

interface LogoProps {
  variant?: "black" | "white";
  className?: string;
  width?: number;
  height?: number;
}

// Current logo URLs (Provided by user)
const LOGO_BLACK = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/IMG_8894-1766764763314.PNG?width=8000&height=8000&resize=contain";
const LOGO_WHITE = "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/IMG_8897-1766764763326.PNG?width=8000&height=8000&resize=contain";

export function Logo({ variant = "black", className, width = 160, height = 80 }: LogoProps) {
  const src = variant === "black" ? LOGO_BLACK : LOGO_WHITE;

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <Image 
        src={src}
        alt="TENISLAB Logo"
        fill
        className="object-contain"
        priority
      />
    </div>
  );
}
