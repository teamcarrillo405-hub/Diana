import Image from "next/image";

import {
  getScreenDesignAsset,
  type ScreenDesignAssetId,
} from "@/lib/screendesign/assets";

type SourceMediaIntent =
  | {
      alt: string;
      decorative?: false;
    }
  | {
      alt?: never;
      decorative: true;
    };

type SourceMediaProps = SourceMediaIntent & {
  assetId: ScreenDesignAssetId;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
};

export function SourceMedia({
  assetId,
  width,
  height,
  className,
  sizes,
  priority,
  loading,
  ...intent
}: SourceMediaProps) {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error("SourceMedia dimensions must be positive numbers");
  }

  const decorative = intent.decorative === true;
  const alt = decorative ? "" : intent.alt.trim();
  if (!decorative && alt.length === 0) {
    throw new Error("SourceMedia content images require meaningful alt text");
  }

  const asset = getScreenDesignAsset(assetId);

  return (
    <Image
      src={asset.localPath}
      width={width}
      height={height}
      alt={alt}
      aria-hidden={decorative || undefined}
      className={["sd-source-media", className].filter(Boolean).join(" ")}
      sizes={sizes}
      priority={priority}
      loading={priority ? undefined : loading}
    />
  );
}
