"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { addProductToBasket } from "@/lib/basket-actions";

/**
 * Drag a product card onto a basket target. An enhancement layered on top of
 * the Add to Basket button, which is untouched and remains the primary path.
 *
 * Deliberate choices:
 *  - Pointer Events, not HTML5 drag-and-drop: HTML5 drag events never fire on
 *    touch, and pointer events cover mouse, pen and touch with one code path.
 *  - Only on a fine pointer at >= md. Below that the target is not rendered at
 *    all, rather than shipping something half-working.
 *  - A drag needs DRAG_THRESHOLD px of movement before it starts, so a normal
 *    click on the card still navigates to the product.
 *  - prefers-reduced-motion removes every transition.
 *  - Everything is wrapped so a failure here cannot break the page: on any
 *    error the layer stops and the cards behave as ordinary links.
 */

const DRAG_THRESHOLD = 6;
const CONFIRM_MS = 1400;

type Dragging = { id: string; image: string; title: string };

function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      try {
        const mq = window.matchMedia(query);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
      } catch {
        return () => {};
      }
    },
    [query],
  );
  const snapshot = useCallback(() => {
    try {
      return window.matchMedia(query).matches;
    } catch {
      return false;
    }
  }, [query]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

export function DragBasketLayer({
  basketCount,
  raised = false,
  children,
}: {
  basketCount: number;
  /** Lift clear of the compare bar, which is also fixed to the bottom. */
  raised?: boolean;
  children: React.ReactNode;
}) {
  // Media queries via useSyncExternalStore: subscribing in an effect and
  // calling setState there is a cascading render the compiler rejects. The
  // server snapshot is false, so nothing renders until the client confirms
  // the device qualifies.
  const finePointer = useMedia("(pointer: fine)");
  const wideEnough = useMedia("(min-width: 768px)");
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const enabled = finePointer && wideEnough;

  const [dragging, setDragging] = useState<Dragging | null>(null);
  const [over, setOver] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const targetRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const start = useRef<{ x: number; y: number; id: string; el: HTMLElement } | null>(null);
  const active = useRef(false);
  const justDragged = useRef(false);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
  }, []);

  const overTarget = useCallback((x: number, y: number) => {
    const rect = targetRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }, []);

  const cleanup = useCallback(() => {
    active.current = false;
    start.current = null;
    setDragging(null);
    setOver(false);
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      try {
        if (!enabled || event.button !== 0 || event.pointerType === "touch") return;
        const card = (event.target as HTMLElement).closest<HTMLElement>("[data-drag-product-id]");
        if (!card) return;
        const id = card.dataset.dragProductId;
        if (!id) return;
        start.current = { x: event.clientX, y: event.clientY, id, el: card };
      } catch {
        cleanup();
      }
    },
    [enabled, cleanup],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      try {
        if (!start.current) return;
        const dx = event.clientX - start.current.x;
        const dy = event.clientY - start.current.y;

        if (!active.current) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return; // still a click
          active.current = true;
          const card = start.current.el;
          const img = card.querySelector("img");
          setDragging({
            id: start.current.id,
            image: img?.getAttribute("src") ?? "",
            title: card.querySelector("a[href^='/product/']")?.textContent?.trim() ?? "item",
          });
          (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);

          const ghost = document.createElement("div");
          ghost.setAttribute("aria-hidden", "true");
          ghost.style.cssText =
            "position:fixed;z-index:60;width:72px;height:72px;pointer-events:none;border-radius:8px;" +
            "background:#fff;border:1px solid #d5d9d9;box-shadow:0 4px 12px rgba(0,0,0,.18);" +
            "display:flex;align-items:center;justify-content:center;overflow:hidden;";
          if (img?.getAttribute("src")) {
            const ghostImg = document.createElement("img");
            ghostImg.src = img.getAttribute("src") as string;
            ghostImg.style.cssText = "max-width:100%;max-height:100%;object-fit:contain;";
            ghost.appendChild(ghostImg);
          }
          document.body.appendChild(ghost);
          ghostRef.current = ghost;
        }

        event.preventDefault();
        if (ghostRef.current) {
          ghostRef.current.style.left = `${event.clientX - 36}px`;
          ghostRef.current.style.top = `${event.clientY - 36}px`;
        }
        setOver(overTarget(event.clientX, event.clientY));
      } catch {
        cleanup();
      }
    },
    [cleanup, overTarget],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent) => {
      try {
        if (!active.current) {
          start.current = null;
          return; // a plain click: leave it alone
        }
        const id = start.current?.id;
        const dropped = overTarget(event.clientX, event.clientY);
        justDragged.current = true;
        window.setTimeout(() => {
          justDragged.current = false;
        }, 0);
        cleanup();

        if (dropped && id) {
          void addProductToBasket(id).catch(() => {});
          setConfirmed(true);
          if (confirmTimer.current) clearTimeout(confirmTimer.current);
          confirmTimer.current = setTimeout(() => setConfirmed(false), CONFIRM_MS);
        }
      } catch {
        cleanup();
      }
    },
    [cleanup, overTarget],
  );

  // Swallow the click that follows a drag, so releasing over the target does
  // not also open the product page.
  const onClickCapture = useCallback((event: React.MouseEvent) => {
    if (justDragged.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  return (
    <div
      // Images and links start the browser's own drag-and-drop, which cancels
      // the pointer stream mid-gesture - pointerup never arrives and the drop
      // is lost. We own dragging here, so the native one is suppressed.
      onDragStart={(event) => {
        if (enabled) event.preventDefault();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={cleanup}
      onClickCapture={onClickCapture}
      style={dragging ? { touchAction: "none", userSelect: "none" } : undefined}
    >
      {children}

      {enabled ? (
        <div
          ref={targetRef}
          data-drag-basket-target=""
          aria-hidden="true"
          className={`fixed right-6 z-50 flex h-24 w-24 flex-col items-center justify-center rounded-[12px] border-2 text-center ${
            raised ? "bottom-28" : "bottom-6"
          } ${
            reducedMotion ? "" : "transition-colors"
          } ${
            over
              ? "border-amazon-link bg-[#e7f6fb] text-amazon-link"
              : dragging
                ? "border-dashed border-amazon-link bg-white text-amazon-text"
                : "border-dashed border-[#d5d9d9] bg-white/90 text-[#565959]"
          }`}
        >
          <span className="text-[12px] font-bold">{confirmed ? "Added" : "Basket"}</span>
          <span className="text-[20px] font-bold text-amazon-text">{basketCount}</span>
          <span className="px-1 text-[10px] leading-tight">
            {confirmed ? "to your basket" : dragging ? "Drop to add" : "Drag items here"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
