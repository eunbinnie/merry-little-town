"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BUILDING_NAMES, COPY, GIFTS, HOUSE_NAMES } from "@/constants/copy";
import {
  HOUSE_IDS,
  SACK_SIZE,
  isComplete,
  type GiftId,
  type HouseId,
} from "@/features/village/game";
import { dispatch, useVillage } from "@/features/village/store";
import {
  canShareFiles,
  composePostcard,
  copyLink,
  downloadBlob,
  shareImage,
} from "@/features/sharing/postcard";
import { composeCard, type CardText } from "@/features/sharing/card";
import { ASSET_ROOT, BUILDING_IDS } from "@/game/world";
import type { Destination, GameEvent, GameHandle, SceneShot } from "@/game/types";
import { CardEditor } from "@/components/card/CardEditor";
import { PostcardSheet } from "@/components/card/PostcardSheet";
import { duckMusic, playSound, unlockSound } from "@/audio/sound";
import { SoundMenu, SoundToggle, useSoundUnlock } from "./SoundControl";

const TOTAL = HOUSE_IDS.length;
const asset = (rel: string) => `${ASSET_ROOT}/${rel}`;

type Toast = { id: number; title: string; body?: string; items?: GiftId[] };
type Photo = { url: string; blob: Blob };
/**
 * One card per delivered gift, kept in memory only (never stored or sent).
 * The delivery itself is already saved; nothing here can undo or repeat it.
 */
type Card = {
  houseId: HouseId;
  giftId: GiftId;
  fresh: boolean;
  stage: "writing" | "leaving" | "preview";
  text: CardText;
  shot: SceneShot | null; // the scene is rendered once; edits only redraw the paper
  image: Photo | null;
  error?: string;
};

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
  const [card, setCard] = useState<Card | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const restartRef = useRef<HTMLDialogElement>(null);

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
        case "card":
          playSound("paper");
          setShareStatus("");
          setCard({
            houseId: e.houseId,
            giftId: e.giftId,
            fresh: e.fresh,
            stage: "writing",
            text: { to: "", message: "", from: "" },
            shot: null,
            image: null,
          });
          setAnnouncement(
            e.fresh ? COPY.card.deliveredTitle : COPY.card.revisitTitle(HOUSE_NAMES[e.houseId]),
          );
          return;
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

  useSoundUnlock();
  // the music steps back while a card is open
  const cardOpen = card !== null;
  useEffect(() => {
    if (!cardOpen) return;
    duckMusic("card", 0.45);
    return () => duckMusic("card", null);
  }, [cardOpen]);

  // release generated images once they are replaced or closed
  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo]);
  const cardUrl = card?.image?.url;
  useEffect(() => () => void (cardUrl && URL.revokeObjectURL(cardUrl)), [cardUrl]);

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
    setShareStatus("");
    try {
      const { image, chill } = await game.current.capture();
      setPhotoState("making");
      const blob = await composePostcard(image, chill, deliveries);
      setPhoto({ url: URL.createObjectURL(blob), blob });
    } catch {
      setAnnouncement(COPY.photo.failed);
      setToast({ id: Date.now(), title: COPY.photo.failed });
    } finally {
      setPhotoState("idle");
    }
  };

  // ---- sharing (same PNG as the preview)
  const save = (blob: Blob, name?: string) => {
    downloadBlob(blob, name);
    setShareStatus(COPY.share.saved);
  };
  const share = async (blob: Blob, name?: string) => {
    setShareStatus("");
    const r = await shareImage(blob, name);
    setShareStatus(
      r === "shared"
        ? COPY.share.shared
        : r === "unsupported"
          ? COPY.share.unsupported
          : r === "failed"
            ? COPY.share.failed
            : "", // cancelled: nothing happened, nothing to say
    );
  };
  const copy = async () => {
    if (await copyLink()) setShareStatus(COPY.share.linkCopied);
  };

  // ---- the personal card
  const finishCard = async () => {
    const c = card;
    if (!c || !game.current) return;
    setCard({ ...c, stage: "leaving", error: undefined });
    try {
      const shot = c.shot ?? (await game.current.leaveHouse());
      const blob = await composeCard(shot, c.text, c.giftId);
      playSound("postcard");
      setShareStatus("");
      setCard(
        (now) =>
          now && {
            ...now,
            stage: "preview",
            shot,
            image: { blob, url: URL.createObjectURL(blob) },
          },
      );
    } catch {
      setCard((now) => now && { ...now, stage: "writing", error: COPY.card.failed });
    }
  };
  const closeCard = useCallback(() => {
    setCard(null);
    setShareStatus("");
    game.current?.endCard();
  }, []);
  const closePhoto = useCallback(() => {
    setPhoto(null);
    setShareStatus("");
  }, []);
  const cardFile = card ? `christmas-card-${card.houseId}.png` : undefined;

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
          <div className="fade-in flex w-full max-w-xs flex-col items-center gap-2">
            <button
              type="button"
              className="pixel-btn w-full text-lg"
              disabled={!ready}
              autoFocus
              onClick={() => {
                unlockSound();
                dispatch({ type: "start" });
              }}
            >
              {COPY.landing.cta}
            </button>
            <SoundToggle />
          </div>
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

      {card?.stage === "writing" && (
        <CardEditor
          title={
            card.fresh
              ? COPY.card.deliveredTitle
              : COPY.card.revisitTitle(HOUSE_NAMES[card.houseId])
          }
          body={card.fresh ? COPY.card.deliveredBody : COPY.card.revisitBody}
          giftId={card.giftId}
          value={card.text}
          onChange={(text) => setCard((c) => c && { ...c, text })}
          onDone={finishCard}
          onLater={closeCard}
          error={card.error}
        />
      )}
      {card?.stage === "leaving" && (
        <p className="ui-shadow fade-in pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+28px)] z-30 text-center text-sm text-ivory/80">
          {COPY.card.leaving}
        </p>
      )}
      {card?.stage === "preview" && card.image && (
        <PostcardSheet
          url={card.image.url}
          alt={COPY.card.alt(card.text.to)}
          title={COPY.card.previewTitle}
          body={COPY.card.previewBody}
          status={shareStatus}
          canShare={canShareFiles()}
          onShare={() => share(card.image!.blob, cardFile)}
          onSave={() => save(card.image!.blob, cardFile)}
          onEdit={() => {
            playSound("paper");
            setCard((c) => c && { ...c, stage: "writing" });
          }}
          onClose={closeCard}
          closeLabel={COPY.card.back}
          onCopyLink={copy}
        />
      )}
      {photo && (
        <PostcardSheet
          url={photo.url}
          alt={COPY.postcard.message}
          title={COPY.photo.title}
          status={shareStatus}
          canShare={canShareFiles()}
          onShare={() => share(photo.blob)}
          onSave={() => save(photo.blob)}
          onClose={closePhoto}
          closeLabel={COPY.photo.close}
          onCopyLink={copy}
        />
      )}

      {playing && village && !card && (
        <>
          <header className="pointer-events-none absolute inset-x-0 top-0 z-25 flex items-start justify-between gap-2 px-3 pt-[calc(env(safe-area-inset-top)+10px)]">
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
            <div className="flex flex-col items-end gap-2">
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
              <div className="pointer-events-auto">
                <SoundMenu />
              </div>
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
              className="toast-in pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+118px)] z-20 flex justify-center px-4"
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
