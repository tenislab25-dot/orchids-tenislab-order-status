"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InternalPageHeaderProps {
  title?: string;
  subtitle?: string;
}

export function InternalPageHeader({ title, subtitle }: InternalPageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        
        {title && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
        )}
      </div>

      <Button
        variant="outline"
        onClick={() => router.push("/interno")}
        className="flex items-center gap-2"
      >
        <LayoutDashboard className="w-4 h-4" />
        <span className="hidden sm:inline">Dashboard</span>
      </Button>
    </div>
  );
}
