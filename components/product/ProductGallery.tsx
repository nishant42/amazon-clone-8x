"use client";

import Image from "next/image";
import { useState } from "react";

/** Client island: thumbnail click swaps the main image. */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex gap-3">
      <div className="flex shrink-0 flex-col gap-2">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setActive(i)}
            onMouseEnter={() => setActive(i)}
            aria-label={`Show image ${i + 1} of ${images.length}`}
            aria-current={i === active}
            className={`relative h-12 w-12 overflow-hidden rounded-[4px] border bg-white ${
              i === active
                ? "border-amazon-link ring-1 ring-amazon-link"
                : "border-[#d5d9d9] hover:border-amazon-link"
            }`}
          >
            <Image src={src} alt="" fill sizes="48px" className="object-contain" />
          </button>
        ))}
      </div>

      <div className="relative aspect-square min-w-0 flex-1 bg-white">
        <Image
          src={images[active]}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 90vw, 40vw"
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
