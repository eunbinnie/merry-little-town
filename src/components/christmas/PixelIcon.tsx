/** A tiny pixel icon from rows of "x" (filled) and "." (empty), in the current text colour. */
export function PixelIcon({ rows, scale = 2 }: { rows: readonly string[]; scale?: number }) {
  const w = rows[0]!.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${rows.length}`}
      width={w * scale}
      height={rows.length * scale}
      shapeRendering="crispEdges"
      className="shrink-0"
      aria-hidden
    >
      {rows.flatMap((r, y) =>
        [...r].map((ch, x) =>
          ch === "x" ? (
            <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
          ) : null,
        ),
      )}
    </svg>
  );
}
