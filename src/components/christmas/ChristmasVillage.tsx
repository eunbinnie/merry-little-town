"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COPY, GIFTS, HOUSE_NAMES } from "@/constants/copy";
import { HOUSE_IDS, isComplete, type HouseId } from "@/features/village/game";
import { dispatch, useVillage } from "@/features/village/store";
import { downloadBlob, renderPostcard, sharePostcard } from "@/features/sharing/postcard";
import { VillageScene, HOUSE_META, asset } from "@/components/village/VillageScene";
import { Snowfall } from "@/components/effects/Snowfall";
import { GiftOpening } from "@/components/gifts/GiftOpening";

const TOTAL = HOUSE_IDS.length;
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Flight = {
  houseId: HouseId;
  wrap: string;
  from: DOMRect;
  to: { x: number; y: number };
  unit: number;
};
/** 0: idle · 1: last house lit, tree still dark · 2: tree lit, celebrating */
type Celebration = 0 | 1 | 2;

function Progress({ count, wraps }: { count: number; wraps: string[] }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: TOTAL }, (_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={asset(`gifts/box-${wraps[i] ?? "ivory"}-small.png`)}
            alt=""
            className={`pixel h-5 w-[22px] transition-opacity ${i < count ? "" : "opacity-25 grayscale"}`}
          />
        ))}
      </div>
      <span className="ui-shadow text-sm text-ivory" aria-live="polite">
        {COPY.village.progress(count, TOTAL)}
      </span>
    </div>
  );
}

export function ChristmasVillage() {
  const village = useVillage();
  const [selected, setSelected] = useState<HouseId | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [sparkle, setSparkle] = useState<HouseId | null>(null);
  const [celebration, setCelebration] = useState<Celebration>(0);
  const [status, setStatus] = useState(""); // visible result of save/share
  const [announcement, setAnnouncement] = useState(""); // screen readers only
  const [busy, setBusy] = useState(false);
  const flightRef = useRef<HTMLImageElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timers = useRef<number[]>([]);
  const postcard = useRef<Promise<Blob> | null>(null);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const phase = village?.phase;
  const deliveries = village?.deliveries ?? [];
  const complete = village ? isComplete(village) : false;

  const commit = (houseId: HouseId) => {
    const gift = village?.currentGift;
    const willComplete = deliveries.length + 1 === TOTAL;
    dispatch({ type: "deliver", houseId });
    setFlight(null);
    setSelected(null);
    setSparkle(houseId);
    if (gift)
      setAnnouncement(COPY.selecting.delivered(HOUSE_NAMES[houseId], GIFTS[gift.giftId].name));
    later(1800, () => setSparkle(null));
    if (willComplete) {
      const reduced = prefersReducedMotion();
      setCelebration(1);
      later(reduced ? 0 : 1200, () => setCelebration(2));
      later(reduced ? 0 : 4200, () => setCelebration(0));
    }
  };

  // gift flies from the bottom panel to the chosen doorstep, then the delivery commits
  useEffect(() => {
    const el = flightRef.current;
    if (!flight || !el) return;
    const { from, to } = flight;
    const start = { x: from.left + from.width / 2, y: from.top + from.height / 2 };
    const peak = { x: (start.x + to.x) / 2, y: Math.min(start.y, to.y) - 90 };
    const t = (p: { x: number; y: number }, s: number) =>
      `translate(${p.x}px, ${p.y}px) translate(-50%, -100%) scale(${s})`;
    const anim = el.animate(
      [
        { transform: t(start, 2.2), opacity: 0 },
        { transform: t(start, 2.2), opacity: 1, offset: 0.08 },
        { transform: t(peak, 1.6), offset: 0.55 },
        { transform: t(to, 1), opacity: 1 },
      ],
      { duration: 950, easing: "cubic-bezier(0.35, 0.1, 0.35, 1)", fill: "forwards" },
    );
    anim.onfinish = () => commit(flight.houseId);
    return () => anim.cancel();
    // only a new flight should restart the animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight]);

  const confirmDelivery = () => {
    if (!selected || !village?.currentGift || flight) return;
    const target = document.querySelector<HTMLElement>(`[data-house="${selected}"]`);
    const chip = chipRef.current;
    if (!target || !chip || prefersReducedMotion()) {
      commit(selected);
      return;
    }
    const m = HOUSE_META[selected];
    const r = target.getBoundingClientRect();
    const unit = r.width / m.w;
    setFlight({
      houseId: selected,
      wrap: village.currentGift.wrapId,
      from: chip.getBoundingClientRect(),
      to: { x: r.left + m.gift[0] * unit, y: r.top + m.gift[1] * unit },
      unit,
    });
  };

  // pre-render the card once the village is complete so "share" can call
  // navigator.share inside the click's user activation (iOS needs that)
  const showCompleteUi = phase === "complete" && celebration === 0;
  useEffect(() => {
    if (!showCompleteUi || postcard.current || !village) return;
    postcard.current = renderPostcard(village.deliveries);
    postcard.current.catch(() => (postcard.current = null));
  }, [showCompleteUi, village]);

  const getCard = () => (postcard.current ??= renderPostcard(deliveries));

  const saveCard = async () => {
    setBusy(true);
    setStatus(COPY.complete.saving);
    try {
      downloadBlob(await getCard());
      setStatus(COPY.complete.saved);
    } catch {
      postcard.current = null;
      setStatus(COPY.complete.failed);
    } finally {
      setBusy(false);
    }
  };

  const shareCard = async () => {
    setBusy(true);
    try {
      const result = await sharePostcard(await getCard());
      setStatus(
        result === "shared"
          ? COPY.complete.shared
          : result === "fallback"
            ? COPY.complete.fallback
            : "",
      );
    } catch {
      postcard.current = null;
      setStatus(COPY.complete.failed);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    dispatch({ type: "reset" });
    postcard.current = null;
    setSelected(null);
    setSparkle(null);
    setCelebration(0);
    setStatus("");
    setAnnouncement("");
  };

  const askRestart = () => {
    const unfinished =
      village && !complete && (village.deliveries.length > 0 || village.currentGift);
    if (unfinished) dialogRef.current?.showModal();
    else reset();
  };

  const treeLit = complete && celebration !== 1;
  const wraps = deliveries.map((d) => d.wrapId);
  const chill = phase === "landing" ? 0.42 : 0.34 * (1 - deliveries.length / TOTAL);

  return (
    <main className="stage">
      <VillageScene
        deliveries={deliveries}
        treeLit={treeLit}
        selectable={phase === "selecting" && !flight}
        selected={selected}
        onSelect={setSelected}
        sparkle={sparkle}
        celebrate={celebration === 2}
      />
      <div className="chill" style={{ opacity: chill }} />
      <Snowfall burst={celebration === 2} />
      {/* hides the swap from server snapshot to stored progress */}
      <div className="veil pointer-events-none absolute inset-0 z-50 bg-night" aria-hidden />

      {village && phase === "landing" && (
        <section className="absolute inset-x-0 top-0 bottom-0 z-20 flex flex-col items-center justify-between px-6 pt-[calc(env(safe-area-inset-top)+6vh)] pb-[calc(env(safe-area-inset-bottom)+40px)] text-center">
          <div className="fade-in">
            <h1 className="ui-shadow text-[clamp(1.5rem,6.4vw,2.75rem)] leading-tight font-bold text-ivory">
              {COPY.landing.titleLines[0]} <br className="sm:hidden" />
              {COPY.landing.titleLines[1]}
            </h1>
            <p className="ui-shadow mt-3 text-base text-ivory/85 sm:text-lg">
              {COPY.landing.description}
            </p>
          </div>
          <button
            type="button"
            className="pixel-btn fade-in w-full max-w-xs text-lg"
            autoFocus
            onClick={() => dispatch({ type: "start" })}
          >
            {COPY.landing.cta}
          </button>
        </section>
      )}

      {village && phase !== "landing" && (
        <>
          <header className="absolute inset-x-0 top-0 z-20 px-4 pt-[calc(env(safe-area-inset-top)+14px)] text-center">
            <div className="mx-auto max-w-md px-12">
              <h1 className="ui-shadow text-lg leading-snug font-bold text-ivory sm:text-xl">
                {phase === "complete"
                  ? COPY.complete.title
                  : phase === "selecting"
                    ? COPY.selecting.title
                    : COPY.village.title}
              </h1>
              {phase === "complete" ? (
                <p className="ui-shadow fade-in mt-1.5 text-sm leading-relaxed text-ivory/85">
                  {COPY.complete.description}
                </p>
              ) : (
                <div className="mt-2">
                  <Progress count={deliveries.length} wraps={wraps} />
                </div>
              )}
            </div>
            {phase !== "complete" && (
              <button
                type="button"
                onClick={askRestart}
                className="ui-shadow absolute top-[calc(env(safe-area-inset-top)+10px)] right-3 min-h-11 px-2 text-xs text-ivory/70 underline-offset-4 hover:text-ivory hover:underline focus-visible:outline-2 focus-visible:outline-ivory"
              >
                {COPY.village.restart}
              </button>
            )}
          </header>

          <footer className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            {phase === "village" && (
              <div className="plate fade-in flex w-full max-w-sm flex-col items-center gap-3 px-5 py-4 text-center">
                <p className="text-sm text-ivory/85">{COPY.village.taskOpen}</p>
                <button
                  type="button"
                  className="pixel-btn w-full"
                  onClick={() =>
                    dispatch({ type: "drawGift", random: Math.random(), wrapRandom: Math.random() })
                  }
                >
                  {COPY.village.open}
                </button>
              </div>
            )}

            {phase === "selecting" && village.currentGift && (
              <div className="plate fade-in flex w-full max-w-sm items-center gap-4 px-4 py-4">
                <div ref={chipRef} className="relative size-14 shrink-0" aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset(`gifts/item-${village.currentGift.giftId}.png`)}
                    alt=""
                    className={`pixel size-14 ${flight ? "opacity-30" : ""}`}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="truncate text-sm text-ivory/85">
                    <span className="font-bold text-glow">
                      {GIFTS[village.currentGift.giftId].name}
                    </span>
                    {" · "}
                    {selected ? HOUSE_NAMES[selected] : COPY.selecting.hint}
                  </p>
                  <button
                    type="button"
                    className="pixel-btn w-full"
                    disabled={!selected || Boolean(flight)}
                    onClick={confirmDelivery}
                  >
                    {COPY.selecting.confirm}
                  </button>
                </div>
              </div>
            )}

            {showCompleteUi && (
              <div className="fade-in flex w-full max-w-sm flex-col gap-2.5">
                <button
                  type="button"
                  className="pixel-btn w-full"
                  onClick={saveCard}
                  disabled={busy}
                >
                  {COPY.complete.save}
                </button>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    className="pixel-btn flex-1"
                    data-variant="red"
                    onClick={shareCard}
                    disabled={busy}
                  >
                    {COPY.complete.share}
                  </button>
                  <button
                    type="button"
                    className="pixel-btn flex-1"
                    data-variant="ghost"
                    onClick={reset}
                  >
                    {COPY.complete.again}
                  </button>
                </div>
              </div>
            )}
          </footer>

          {phase === "opening" && village.currentGift && (
            <GiftOpening
              gift={village.currentGift}
              onOpen={() => dispatch({ type: "openGift" })}
              onContinue={() => dispatch({ type: "chooseHouse" })}
            />
          )}
        </>
      )}

      {flight && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={flightRef}
          src={asset(`gifts/box-${flight.wrap}-small.png`)}
          alt=""
          className="pixel pointer-events-none fixed top-0 left-0 z-30 opacity-0"
          style={{ width: 11 * flight.unit, height: 10 * flight.unit }}
        />
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {status || announcement}
      </p>
      {status && showCompleteUi && (
        <p
          className="ui-shadow fade-in pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+132px)] z-20 text-center text-xs text-ivory"
          aria-hidden
        >
          {status}
        </p>
      )}

      <dialog
        ref={dialogRef}
        className="plate m-auto w-[min(22rem,calc(100vw-2rem))] p-6 text-center text-ivory backdrop:bg-[rgb(10_16_29/0.7)]"
        aria-labelledby="restart-title"
      >
        <h2 id="restart-title" className="text-lg font-bold">
          {COPY.restart.title}
        </h2>
        <p className="mt-2 text-sm text-ivory/80">{COPY.restart.body}</p>
        <form method="dialog" className="mt-5 flex flex-col gap-2.5">
          <button type="submit" className="pixel-btn w-full" autoFocus>
            {COPY.restart.cancel}
          </button>
          <button type="submit" className="pixel-btn w-full" data-variant="ghost" onClick={reset}>
            {COPY.restart.confirm}
          </button>
        </form>
      </dialog>
    </main>
  );
}
