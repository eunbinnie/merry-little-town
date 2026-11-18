"use client";

import { useEffect, useRef } from "react";
import { COPY, GIFTS } from "@/constants/copy";
import type { GiftId } from "@/features/village/game";
import type { CardText } from "@/features/sharing/card";
import { CARD_LIMITS, clampText, graphemes } from "@/features/sharing/text";
import { ASSET_ROOT } from "@/game/world";

type Props = {
  title: string;
  body: string;
  giftId: GiftId;
  value: CardText;
  onChange: (v: CardText) => void;
  onDone: () => void;
  onLater: () => void;
  error?: string;
};

const LIMITS: Record<keyof CardText, [number, number]> = {
  to: [CARD_LIMITS.to, 1],
  from: [CARD_LIMITS.from, 1],
  message: [CARD_LIMITS.message, CARD_LIMITS.messageLines],
};

/** Keeps the editor above the on-screen keyboard (iOS Safari doesn't resize the layout). */
function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () =>
      root.style.setProperty(
        "--kb",
        `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`,
      );
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      root.style.removeProperty("--kb");
    };
  }, []);
}

/** A small handwritten note found next to the present: To / message / From. */
export function CardEditor({
  title,
  body,
  giftId,
  value,
  onChange,
  onDone,
  onLater,
  error,
}: Props) {
  useKeyboardInset();
  const composing = useRef(false);

  // limits apply after IME composition ends, so Korean syllables are never cut mid-way
  const field = (key: keyof CardText) => ({
    value: value[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const raw = e.target.value;
      onChange({ ...value, [key]: composing.current ? raw : clampText(raw, ...LIMITS[key]) });
    },
    onCompositionStart: () => (composing.current = true),
    onCompositionEnd: (e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      composing.current = false;
      onChange({ ...value, [key]: clampText(e.currentTarget.value, ...LIMITS[key]) });
    },
  });

  const ready = value.to.trim() !== "" && value.message.trim() !== "";
  const used = graphemes(value.message).length;

  return (
    <section className="card-sheet" aria-labelledby="card-title">
      <header className="ui-shadow card-heading text-center">
        <h2 id="card-title" className="text-base font-bold text-ivory">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-ivory/80">{body}</p>
      </header>

      <form
        className="paper-card unfold"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready) onDone();
        }}
      >
        <span className="washi" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ASSET_ROOT}/ui/holly.png`} alt="" className="pixel paper-holly" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ASSET_ROOT}/ui/stamp.png`} alt="" className="pixel paper-stamp" aria-hidden />
        <p className="paper-greeting" aria-hidden>
          {COPY.card.greeting}
        </p>

        <label className="paper-to">
          <span className="paper-label">{COPY.card.to}</span>
          <input
            {...field("to")}
            className="paper-input"
            placeholder={COPY.card.toPlaceholder}
            aria-label={COPY.card.toLabel}
            autoComplete="off"
            enterKeyHint="next"
          />
        </label>

        <textarea
          {...field("message")}
          className="paper-message"
          placeholder={COPY.card.messagePlaceholder}
          aria-label={COPY.card.messageLabel}
          rows={5}
        />
        {used >= CARD_LIMITS.message - 30 && (
          <p className="paper-count" aria-live="polite">
            {used}/{CARD_LIMITS.message}
          </p>
        )}

        <div className="paper-bottom">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSET_ROOT}/gifts/item-${giftId}.png`}
            alt={COPY.card.giftLabel(GIFTS[giftId].name)}
            className="pixel paper-gift"
          />
          <label className="paper-from">
            <span className="paper-label">{COPY.card.from}</span>
            <input
              {...field("from")}
              className="paper-input"
              placeholder={COPY.card.fromPlaceholder}
              aria-label={COPY.card.fromLabel}
              autoComplete="off"
              enterKeyHint="done"
            />
          </label>
        </div>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>

      {error && (
        <p className="ui-shadow text-xs text-glow" role="alert">
          {error}
        </p>
      )}
      <div className="card-actions">
        <button type="button" className="pixel-btn w-full" disabled={!ready} onClick={onDone}>
          {COPY.card.done}
        </button>
        <button type="button" className="card-later ui-shadow" onClick={onLater}>
          {COPY.card.later}
        </button>
      </div>
    </section>
  );
}
