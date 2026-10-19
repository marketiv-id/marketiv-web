import Image from "next/image";
import { cn } from "@/lib/utils";

interface TivvyAvatarProps {
  size: number;
  className?: string;
}

// Tivvy wears the Marketiv mascot's face, cropped from public/brand/maskot-umkm.webp.
export function TivvyAvatar({ size, className }: TivvyAvatarProps) {
  return (
    <span className={cn("relative block shrink-0 overflow-hidden rounded-full bg-primary-500", className)} style={{ width: size, height: size }}>
      <Image src="/brand/tivvy-avatar.webp" alt="" width={size * 2} height={size * 2} className="h-full w-full object-cover" />
    </span>
  );
}
