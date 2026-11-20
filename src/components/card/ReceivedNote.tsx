"use client";

import { COPY, GIFTS } from "@/constants/copy";
import type { ReceivedCard } from "@/features/sharing/link";
import { ASSET_ROOT } from "@/game/world";

type Props = { card: ReceivedCard; onReply: () => void };

/**
 * The note someone left with the gift, read-only. Text comes from the link,
 * so it is only ever rendered as text (never as HTML or a clickable link).
 */
export function ReceivedNote({ card, onReply }: Props) {
  return (
    <section className="card-sheet" aria-labelledby="received-title">
      <header className="ui-shadow card-heading text-center">
        <h2 id="received-title" className="text-base font-bold text-ivory">
          {COPY.received.title}
        </h2>
        <p className="mt-0.5 text-sm text-ivory/80">{COPY.received.body(card.from)}</p>
      </header>

      <article className="paper-card unfold">
        <span className="washi" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ASSET_ROOT}/ui/holly.png`} alt="" className="pixel paper-holly" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${ASSET_ROOT}/ui/stamp.png`} alt="" className="pixel paper-stamp" aria-hidden />
        <p className="paper-greeting" aria-hidden>
          {COPY.card.greeting}
        </p>

        <p className="paper-to">
          <span className="paper-label">{COPY.card.to}</span>
          <span className="paper-input wrap-break-word">{card.to}</span>
        </p>
        <p className="paper-message wrap-break-word whitespace-pre-wrap">{card.message}</p>
        <div className="paper-bottom">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSET_ROOT}/gifts/item-${card.giftId}.png`}
            alt={COPY.card.giftLabel(GIFTS[card.giftId].name)}
            className="pixel paper-gift"
          />
          <p className="paper-from">
            <span className="paper-label">{COPY.card.from}</span>
            <span className="paper-input wrap-break-word">
              {card.from || COPY.received.anonymous}
            </span>
          </p>
        </div>
      </article>

      <div className="card-actions pb-3">
        <button type="button" className="pixel-btn w-full" autoFocus onClick={onReply}>
          {COPY.received.reply}
        </button>
      </div>
    </section>
  );
}
