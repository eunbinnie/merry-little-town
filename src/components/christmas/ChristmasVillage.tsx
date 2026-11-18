"use client";

import { useEffect, useRef, useState } from "react";
import { BUILDING_NAMES, COPY, GIFTS } from "@/constants/copy";
import { HOUSE_IDS, SACK_SIZE, isComplete, type GiftId } from "@/features/village/game";
import { dispatch, useVillage } from "@/features/village/store";
import { composePostcard, downloadBlob, sharePostcard } from "@/features/sharing/postcard";
import { ASSET_ROOT, BUILDING_IDS } from "@/game/world";
import type { Destination, GameEvent, GameHandle } from "@/game/types";

const TOTAL = HOUSE_IDS.length;
const asset = (rel: string) => `${ASSET_ROOT}/${rel}`;

type Toast = { id: number; title: string; body?: string; items?: GiftId[] };
type Photo = { url: string; blob: Blob };

function Icon({
  rel,
  size = 24,
  className = "",
}: {
  rel: string;
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={asset(rel)}
      alt=""
      width={size}
      height={size}
      className={`pixel ${className}`}
      draggable={false}
    />
  );
}

export function ChristmasVillage() {
  const village = useVillage();
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<GameHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [intro, setIntro] = useState(false);
  const [busy, setBusy] = useState(false);
  const [moved, setMoved] = useState(false);
  const [near, setNear] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoState, setPhotoState] = useState<"idle" | "making" | "flash">("idle");
  const [photoStatus, setPhotoStatus] = useState("");
  const restartRef = useRef<HTMLDialogElement>(null);
  const photoRef = useRef<HTMLDialogElement>(null);

  // Phaser is loaded only in the browser, once; React state never recreates it
  useEffect(() => {
    let handle: GameHandle | null = null;
    let cancelled = false;
    const onEvent = (e: GameEvent) => {
      switch (e.type) {
        case "ready":
          return setReady(true);
        case "intro":
          return setIntro(e.playing);
        case "busy":
          return setBusy(e.busy);
        case "moved":
          return setMoved(true);
        case "near":
          return setNear(e.label);
        case "celebrate":
          return setAnnouncement(COPY.toast.complete);
        case "toast":
          setToast({ id: Date.now(), title: e.title, body: e.body, items: e.items });
          setAnnouncement([e.title, e.body].filter(Boolean).join(". "));
      }
    };
    void import("@/game/createGame").then(({ createGame }) => {
      if (cancelled || !host.current) return;
      handle = createGame(host.current, onEvent);
      game.current = handle;
    });
    return () => {
      cancelled = true;
      handle?.destroy();
      game.current = null;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.items ? 4200 : 3400);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo]);

  const started = village?.started ?? false;
  const deliveries = village?.deliveries ?? [];
  const sack = village?.sack ?? [];
  const complete = village ? isComplete(village) : false;
  const playing = ready && started && !intro;

  const hint = !playing
    ? ""
    : !moved && !village?.pos
      ? COPY.hint.move
      : complete
        ? COPY.hint.explore
        : sack.length
          ? COPY.hint.deliver
          : deliveries.length
            ? COPY.hint.reload
            : COPY.hint.load;

  const takePhoto = async () => {
    if (!game.current || photoState !== "idle") return;
    setPhotoState("flash");
    setPhotoStatus("");
    try {
      const { image, chill } = await game.current.capture();
      setPhotoState("making");
      const blob = await composePostcard(image, chill, deliveries);
      setPhoto({ url: URL.createObjectURL(blob), blob });
      photoRef.current?.showModal();
    } catch {
      setAnnouncement(COPY.photo.failed);
      setToast({ id: Date.now(), title: COPY.photo.failed });
    } finally {
      setPhotoState("idle");
    }
  };

  const savePhoto = () => {
    if (!photo) return;
    downloadBlob(photo.blob);
    setPhotoStatus(COPY.photo.saved);
  };

  const sharePhoto = async () => {
    if (!photo) return;
    try {
      const r = await sharePostcard(photo.blob);
      setPhotoStatus(
        r === "shared" ? COPY.photo.shared : r === "fallback" ? COPY.photo.fallback : "",
      );
    } catch {
      setPhotoStatus(COPY.photo.failed);
    }
  };

  const reset = () => {
    dispatch({ type: "reset" });
    setToast(null);
  };

  const go = (d: Destination) => game.current?.goTo(d);

  return (
    <main className="fixed inset-0 overflow-hidden bg-night">
      <div
        ref={host}
        className="game-host"
        role="application"
        aria-label={`${COPY.meta.title}. ${COPY.hint.move}. ${COPY.hint.moveKeys}.`}
        tabIndex={0}
      />

      {/* loading veil until Phaser has drawn the first frame */}
      {!ready && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-night">
          <p className="ui-shadow animate-pulse text-sm text-ivory/80">{COPY.loading}</p>
        </div>
      )}

      {village && !started && (
        <section className="absolute inset-0 z-30 flex flex-col items-center justify-between bg-[linear-gradient(to_bottom,rgb(10_16_29/0.55),transparent_40%,transparent_60%,rgb(10_16_29/0.7))] px-6 pt-[calc(env(safe-area-inset-top)+8vh)] pb-[calc(env(safe-area-inset-bottom)+44px)] text-center">
          <div className="fade-in">
            <h1 className="ui-shadow text-[clamp(1.6rem,6.6vw,2.9rem)] leading-tight font-bold text-ivory">
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
            disabled={!ready}
            autoFocus
            onClick={() => dispatch({ type: "start" })}
          >
            {COPY.landing.cta}
          </button>
        </section>
      )}

      {intro && (
        <button
          type="button"
          className="pixel-btn absolute right-4 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-30"
          data-variant="ghost"
          data-size="sm"
          onClick={() => game.current?.skipIntro()}
        >
          {COPY.intro.skip}
        </button>
      )}

      {playing && village && (
        <>
          <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 pt-[calc(env(safe-area-inset-top)+10px)]">
            <div className="plate pointer-events-auto flex items-center gap-2.5 px-3 py-2">
              <div
                className="flex items-center gap-1.5"
                role="img"
                aria-label={COPY.hud.progressLabel(deliveries.length, TOTAL)}
              >
                <Icon rel="gifts/box-crimson.png" size={22} />
                <span className="font-pixel text-base leading-none text-ivory">
                  {deliveries.length}
                  <span className="text-ivory/50">/{TOTAL}</span>
                </span>
              </div>
              <div
                className="flex gap-1"
                role="img"
                aria-label={
                  sack.length
                    ? COPY.hud.sackLabel(sack.map((g) => GIFTS[g.giftId].name))
                    : COPY.hud.sackEmpty
                }
              >
                {Array.from({ length: SACK_SIZE }, (_, i) => (
                  <span key={i} className="slot">
                    {sack[i] && <Icon rel={`gifts/item-${sack[i].giftId}.png`} size={24} />}
                  </span>
                ))}
              </div>
            </div>
            <div className="pointer-events-auto flex gap-2">
              <button
                type="button"
                className={`pixel-btn ${complete ? "pulse" : ""}`}
                data-variant={complete ? undefined : "ghost"}
                data-size="sm"
                onClick={takePhoto}
                disabled={busy || photoState !== "idle"}
              >
                <Icon rel="effects/sparkle-large.png" size={18} />
                {COPY.hud.photo}
              </button>
              <button
                type="button"
                className="pixel-btn"
                data-variant="ghost"
                data-size="sm"
                onClick={() =>
                  deliveries.length || sack.length ? restartRef.current?.showModal() : reset()
                }
                disabled={busy}
              >
                {COPY.hud.menu}
              </button>
            </div>
          </header>

          {/* keyboard / screen-reader shortcut list: hidden until focused */}
          <nav
            aria-label={COPY.hud.goTo}
            className="sr-only z-30 focus-within:not-sr-only focus-within:absolute focus-within:top-20 focus-within:left-3 focus-within:max-h-[70dvh] focus-within:overflow-auto"
          >
            <ul className="plate flex flex-col gap-1 p-3">
              {(["sleigh", "tree", ...BUILDING_IDS] as const).map((d) => {
                const name =
                  d === "sleigh"
                    ? COPY.hud.sleigh
                    : d === "tree"
                      ? COPY.toast.tree
                      : BUILDING_NAMES[d];
                return (
                  <li key={d}>
                    <button
                      type="button"
                      className="w-full px-2 py-1.5 text-left text-sm text-ivory hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-glow"
                      onClick={() => go(d)}
                      disabled={busy}
                    >
                      {COPY.hud.goToLabel(name)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {toast && (
            <div
              key={toast.id}
              className="toast-in pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+72px)] z-20 flex justify-center px-4"
              aria-hidden
            >
              <div className="plate flex max-w-sm items-center gap-3 px-4 py-3">
                {toast.items && (
                  <div className="flex shrink-0 gap-1">
                    {toast.items.map((g) => (
                      <Icon key={g} rel={`gifts/item-${g}.png`} size={36} />
                    ))}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-glow">{toast.title}</p>
                  {toast.body && (
                    <p className="mt-0.5 text-xs leading-relaxed text-ivory/85">{toast.body}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {(hint || near) && (
            <div className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+18px)] z-20 flex flex-col items-center gap-2 px-4">
              {near && <p className="plate px-3 py-1.5 font-pixel text-xs text-glow">{near}</p>}
              {hint && (
                <div
                  className="plate fade-in flex flex-col items-center px-4 py-2 text-center"
                  key={hint}
                >
                  <p className="flex items-center gap-2 text-sm text-ivory/90">
                    {hint === COPY.hint.move && (
                      <span
                        className="tap-hint inline-block size-3 rounded-full border-2 border-glow"
                        aria-hidden
                      />
                    )}
                    {hint}
                  </p>
                  {hint === COPY.hint.move && (
                    <p className="mt-0.5 hidden text-xs text-ivory/60 pointer-fine:block">
                      {COPY.hint.moveKeys}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {photoState === "flash" && (
        <div className="shutter pointer-events-none absolute inset-0 z-40 bg-ivory" />
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <dialog
        ref={photoRef}
        className="plate m-auto w-[min(24rem,calc(100vw-1.5rem))] p-4 text-center text-ivory backdrop:bg-[rgb(10_16_29/0.75)]"
        aria-labelledby="photo-title"
        onClose={() => setPhotoStatus("")}
      >
        <h2 id="photo-title" className="text-base font-bold">
          {COPY.photo.title}
        </h2>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.url}
            alt={COPY.postcard.message}
            className="mx-auto mt-3 aspect-[9/16] max-h-[58dvh] w-auto"
          />
        )}
        <p className="mt-2 min-h-5 text-xs text-ivory/80" aria-live="polite">
          {photoStatus}
        </p>
        <div className="mt-2 flex gap-2">
          <button type="button" className="pixel-btn flex-1" onClick={savePhoto}>
            {COPY.photo.save}
          </button>
          <button
            type="button"
            className="pixel-btn flex-1"
            data-variant="red"
            onClick={sharePhoto}
          >
            {COPY.photo.share}
          </button>
        </div>
        <form method="dialog" className="mt-2">
          <button type="submit" className="pixel-btn w-full" data-variant="ghost">
            {COPY.photo.close}
          </button>
        </form>
      </dialog>

      <dialog
        ref={restartRef}
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
