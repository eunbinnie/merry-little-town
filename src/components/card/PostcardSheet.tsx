"use client";

import { useEffect, useRef } from "react";
import { COPY } from "@/constants/copy";

type Props = {
  url: string;
  alt: string;
  title: string;
  body?: string;
  status: string;
  canShare: boolean;
  onShare: () => void;
  onSave: () => void;
  onEdit?: () => void;
  onClose: () => void;
  closeLabel: string;
  onCopyLink: () => void;
  linkLabel?: string;
  /** A quiet line under the link, e.g. who can read what the link carries. */
  note?: string;
};

/** The finished image is the hero: the exact PNG that gets saved or shared. */
export function PostcardSheet(p: Props) {
  const first = useRef<HTMLButtonElement>(null);
  const { onClose } = p;
  useEffect(() => {
    first.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <div
      className="postcard-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="postcard-title"
    >
      <header className="text-center">
        <h2 id="postcard-title" className="ui-shadow text-base font-bold text-ivory">
          {p.title}
        </h2>
        {p.body && <p className="ui-shadow mt-0.5 text-sm text-ivory/75">{p.body}</p>}
      </header>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.url} alt={p.alt} className="postcard-image" />
      <p className="ui-shadow min-h-5 text-center text-xs text-glow" aria-live="polite">
        {p.status || (!p.canShare ? COPY.share.holdToSave : "")}
      </p>
      <div className="grid w-full max-w-sm grid-cols-2 gap-2">
        <button
          ref={first}
          type="button"
          className="pixel-btn"
          data-variant="red"
          onClick={p.onShare}
        >
          {COPY.card.share}
        </button>
        <button type="button" className="pixel-btn" onClick={p.onSave}>
          {COPY.card.save}
        </button>
        {p.onEdit && (
          <button type="button" className="pixel-btn" data-variant="ghost" onClick={p.onEdit}>
            {COPY.card.edit}
          </button>
        )}
        <button
          type="button"
          className={`pixel-btn ${p.onEdit ? "" : "col-span-2"}`}
          data-variant="ghost"
          onClick={p.onClose}
        >
          {p.closeLabel}
        </button>
      </div>
      <button
        type="button"
        className="ui-shadow text-xs text-ivory/60 underline-offset-4 hover:underline"
        onClick={p.onCopyLink}
      >
        {p.linkLabel ?? COPY.card.copyLink}
      </button>
      {p.note && <p className="ui-shadow -mt-1 text-center text-[11px] text-ivory/50">{p.note}</p>}
    </div>
  );
}
