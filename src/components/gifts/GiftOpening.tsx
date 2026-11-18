"use client";

import { useEffect, useRef, useState } from "react";
import { COPY, GIFTS } from "@/constants/copy";
import type { DrawnGift } from "@/features/village/game";
import { asset } from "@/components/village/VillageScene";

/** Length of `n` gift-sprite pixels (see .gift-stage --g). */
const g = (n: number) => `calc(var(--g) * ${n})`;

function GiftSprite({
  src,
  x,
  y,
  w,
  h,
  className = "",
}: {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(src)}
      alt=""
      draggable={false}
      className={`pixel absolute ${className}`}
      style={{ left: g(x), top: g(y), width: g(w), height: g(h) }}
    />
  );
}

const SPARKS = [
  [-6, -6, 0],
  [26, -10, 0.4],
  [32, 10, 0.9],
  [-10, 14, 1.3],
  [10, -16, 1.7],
] as const;

type Props = { gift: DrawnGift; onOpen: () => void; onContinue: () => void };

export function GiftOpening({ gift, onOpen, onContinue }: Props) {
  // render-only stage; whether the box was opened is persisted by the store
  const [stage, setStage] = useState<"closed" | "opening" | "revealed">(
    gift.opened ? "revealed" : "closed",
  );
  const continueRef = useRef<HTMLButtonElement>(null);
  const info = GIFTS[gift.giftId];

  useEffect(() => {
    if (stage !== "opening") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setStage("revealed"), reduced ? 0 : 1100);
    return () => window.clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage === "revealed") continueRef.current?.focus();
  }, [stage]);

  const open = () => {
    if (stage !== "closed") return;
    onOpen();
    setStage("opening");
  };

  const isOpen = stage !== "closed";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gift-title"
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 bg-[rgb(10_16_29/0.8)] px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] fade-in"
    >
      <h2
        id="gift-title"
        className="ui-shadow text-center text-xl font-bold text-ivory sm:text-2xl"
      >
        {stage === "revealed" ? COPY.opening.found : COPY.opening.title}
      </h2>

      <div
        className="gift-stage relative"
        style={{ width: g(40), height: g(40), marginTop: g(22) }}
      >
        {isOpen && (
          <div
            className="rays absolute rounded-full"
            style={{ left: g(-22), top: g(-34), width: g(84), height: g(84) }}
          />
        )}
        <button
          type="button"
          autoFocus={!isOpen}
          onClick={open}
          disabled={isOpen}
          aria-label={COPY.opening.boxLabel}
          className={`absolute inset-0 outline-none focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-ivory ${isOpen ? "" : "box-idle cursor-pointer"}`}
        >
          <GiftSprite src={`gifts/box-${gift.wrapId}-body.png`} x={0} y={0} w={40} h={40} />
          <GiftSprite
            src={`gifts/box-${gift.wrapId}-lid.png`}
            x={0}
            y={0}
            w={40}
            h={40}
            className={isOpen ? "lid-off" : ""}
          />
        </button>
        {isOpen && (
          <div
            className={stage === "opening" ? "item-rise" : ""}
            style={{ position: "absolute", inset: 0 }}
          >
            <div className="item-float absolute inset-0">
              <GiftSprite src={`gifts/item-${gift.giftId}.png`} x={8} y={-16} w={24} h={24} />
            </div>
          </div>
        )}
        {isOpen &&
          SPARKS.map(([x, y, d], i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={asset(i % 2 ? "effects/sparkle.png" : "effects/sparkle-large.png")}
              alt=""
              className="pixel sparkle absolute"
              style={{
                left: g(x + 8),
                top: g(y - 6),
                width: g(i % 2 ? 5 : 9),
                height: g(i % 2 ? 5 : 9),
                animationDelay: `${0.5 + d}s`,
                animationDuration: "1.6s",
                animationIterationCount: "infinite",
              }}
            />
          ))}
      </div>

      <div
        className="flex min-h-[132px] flex-col items-center gap-3 text-center"
        aria-live="polite"
      >
        {stage === "revealed" ? (
          <>
            <p className="fade-in">
              <span className="ui-shadow block text-2xl font-bold text-glow">{info.name}</span>
              <span className="ui-shadow mt-1 block text-sm text-ivory/80">{info.note}</span>
            </p>
            <button
              ref={continueRef}
              type="button"
              className="pixel-btn fade-in mt-1 min-w-60"
              onClick={onContinue}
            >
              {COPY.opening.go}
            </button>
          </>
        ) : (
          <p className="ui-shadow text-base text-ivory/85">{COPY.opening.hint}</p>
        )}
      </div>
    </div>
  );
}
