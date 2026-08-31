import type { CSSProperties, ReactNode } from "react";
import type { BlockPayload, Creative, PitchLine } from "./types.js";

export type PromootBlockProps = {
  /** The embed URL from your Promoot dashboard, the same one the iframe uses. */
  url: string;
  /** Applied to the block's container. */
  className?: string;
  /** Applied to the block's container. */
  style?: CSSProperties;
  /** Rendered when the slot is paused, empty, or unreachable. */
  fallback?: ReactNode;
};

export function blockEndpoint(embedUrl: string): string {
  return embedUrl.replace("/embed/", "/api/block/");
}

// no-store, because a cached render keeps showing a creative whose run has
// already ended: the sponsor gets free time and the next buyer never appears.
async function loadBlock(embedUrl: string): Promise<BlockPayload | null> {
  try {
    const response = await fetch(blockEndpoint(embedUrl), { cache: "no-store" });

    return response.ok ? ((await response.json()) as BlockPayload) : null;
  } catch {
    return null;
  }
}

// A keyframe name cannot be scoped to a selector, so it carries the slot's own
// id instead, stripped to the characters a css identifier may hold.
function keyframeName(slotId: string, motion: string): string {
  return `promoot-${motion}-${slotId.replaceAll(/[^A-Za-z0-9_-]/g, "")}`;
}

const pitchMinHeightPx = 88;

const mono = "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)";

// The face the owner composed, and the ghost that shows a visitor what their own
// ad would look like in its place. Both are stacked, and hover swaps them.
function billboardCss(payload: BlockPayload, scope: string): string {
  const rest = keyframeName(payload.slot.id, "breathe-rest");
  const ghost = keyframeName(payload.slot.id, "breathe-ghost");

  return `${scope} .promoot-bb { position: relative; display: block; width: 100%; height: 100%; box-sizing: border-box; border: var(--border, 1px) solid var(--edge); border-radius: var(--radius, 10px); background: var(--surface); overflow: hidden; font-family: var(--font, inherit); }
${scope} .promoot-bb:hover { border-color: var(--edge-hover); }
${scope} .promoot-face { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 10px 16px; box-sizing: border-box; text-align: center; transition: opacity .3s ease; }
${scope} .promoot-bb:hover .promoot-rest { opacity: 0; }
${scope} .promoot-ghost { flex-direction: row; gap: 12px; text-align: left; opacity: 0; }
${scope} .promoot-bb:hover .promoot-ghost { opacity: 1; }
${scope} .promoot-spark { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 34%; pointer-events: none; }
${scope} .promoot-spark polygon { fill: var(--surface-hover); }
${scope} .promoot-spark polyline { fill: none; stroke: var(--edge); stroke-width: 1.5; }
${scope} .promoot-line { position: relative; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
${scope} .promoot-line-text { font-size: 15px; font-weight: 600; color: var(--ink); }
${scope} .promoot-line-price { font-family: ${mono}; font-size: 12.5px; font-weight: 600; color: var(--ink); }
${scope} .promoot-line-proof, ${scope} .promoot-line-domain { font-family: ${mono}; font-size: 11px; color: var(--muted); }
${scope} .promoot-plus { flex: none; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 9px; border: 1.5px dashed var(--muted); color: var(--muted); font-size: 18px; }
${scope} .promoot-ghost-title { display: block; font-size: 13.5px; font-weight: 600; color: var(--ink); }
${scope} .promoot-ghost-body { display: block; font-size: 12px; color: var(--muted); }
@media (hover: none) { ${scope} .promoot-rest { animation: ${rest} 12s ease-in-out 2s infinite; } ${scope} .promoot-ghost { animation: ${ghost} 12s ease-in-out 2s infinite; } }
@media (prefers-reduced-motion: reduce) { ${scope} .promoot-rest, ${scope} .promoot-ghost { animation: none; } ${scope} .promoot-face { transition: none; } }
@keyframes ${rest} { 0%, 55%, 100% { opacity: 1; } 70%, 85% { opacity: 0; } }
@keyframes ${ghost} { 0%, 55%, 100% { opacity: 0; } 70%, 85% { opacity: 1; } }`;
}

// Every rule is scoped to this one block, and it never declares a colour scheme
// of its own: the palette uses light-dark(), which resolves against the scheme
// inherited from the host page, so a light-only site keeps a light panel.
export function scopedCss(payload: BlockPayload): string {
  const scope = `[data-promoot-slot="${payload.slot.id}"]`;
  const arrive = keyframeName(payload.slot.id, "arrive");
  const floor = Math.min(pitchMinHeightPx, payload.slot.heightPx);

  return `${scope} { ${payload.paletteVars}; position: relative; display: block; width: 100%; max-width: ${payload.slot.widthPx}px; height: auto; max-height: ${payload.slot.heightPx}px; min-height: ${floor}px; aspect-ratio: ${payload.slot.widthPx} / ${payload.slot.heightPx}; animation: ${arrive} .5s cubic-bezier(.45,0,.25,1) both; }
@keyframes ${arrive} { from { opacity: 0; transform: scale(.985); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { ${scope} { animation: none; } }
${scope} a { text-decoration: none; }
${scope} .promoot-ad { display: block; position: relative; height: 100%; width: 100%; }
${scope} .promoot-ad > img { display: block; height: 100%; width: 100%; object-fit: cover; }
${scope} .promoot-text { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; width: 100%; height: 100%; box-sizing: border-box; padding: 6px 12px; border: var(--border, 1px) solid var(--edge); border-radius: var(--radius, 10px); background: var(--surface); overflow: hidden; text-align: center; font-family: var(--font, inherit); }
${scope} .promoot-ad:hover .promoot-text { border-color: var(--edge-hover); background: var(--surface-hover); }
${scope} .promoot-mark { position: relative; flex: none; display: grid; place-items: center; width: 24px; height: 24px; margin-bottom: 1px; border-radius: 6px; background: var(--edge); color: var(--surface); font-weight: 700; font-size: 12px; overflow: hidden; }
${scope} .promoot-mark img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
${scope} .promoot-text > span:not(.promoot-mark) { max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
${scope} .promoot-text .promoot-headline { font-size: 14px; font-weight: 600; color: var(--ink); line-height: 1.25; }
${scope} .promoot-text .promoot-desc { font-size: 12px; color: var(--muted); line-height: 1.25; }
${scope} .promoot-text .promoot-host { font-size: 11px; color: var(--muted); line-height: 1.25; }
${scope} .promoot-cta { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 100%; height: 100%; justify-content: center; padding: 0 10px; text-align: center; border: var(--border, 1px) dashed var(--edge); border-radius: var(--radius, 10px); box-sizing: border-box; color: var(--muted); background: var(--surface); font-family: var(--font, inherit); }
${scope} .promoot-cta:hover { border-color: var(--edge-hover); background: var(--surface-hover); }
${scope} .promoot-cta strong { font-size: 14px; color: var(--ink); }
${scope} .promoot-cta .promoot-pitch { font-size: 13px; color: var(--ink); }
${scope} .promoot-cta .promoot-proof { font-size: 11px; color: var(--muted); }
${scope} .promoot-cta .promoot-terms { font-size: 12px; }
${scope} .promoot-beacon { position: absolute; bottom: 0; right: 0; width: 1px; height: 1px; }
${billboardCss(payload, scope)}`;
}

// Inline, not a class: a host can restyle everything else, but the disclosure
// is not theirs to remove.
const labelStyle: CSSProperties = {
  position: "absolute",
  right: "4px",
  bottom: "4px",
  fontSize: "10px",
  lineHeight: "1.4",
  color: "#ffffff",
  background: "rgba(0,0,0,.55)",
  borderRadius: "4px",
  padding: "1px 5px",
};

// One or the other, never layered: a favicon with transparent corners would let
// the monogram show through it, and a broken image painted over the letter
// hides it anyway.
function Mark({ creative }: { creative: Extract<Creative, { kind: "TEXT" }> }) {
  return (
    <span className="promoot-mark">
      {creative.faviconUrl ? (
        <img src={creative.faviconUrl} alt="" />
      ) : (
        creative.monogram
      )}
    </span>
  );
}

function AdCreative({ creative }: { creative: Creative }) {
  if (creative.kind === "IMAGE") {
    return <img src={creative.imageUrl} alt={creative.title} />;
  }

  return (
    <span className="promoot-text">
      <Mark creative={creative} />
      {creative.headline && <span className="promoot-headline">{creative.headline}</span>}
      {creative.body && <span className="promoot-desc">{creative.body}</span>}
      <span className="promoot-host">{creative.host}</span>
    </span>
  );
}

// Oldest day first across a fixed box, which the slot's own aspect ratio then
// stretches: one path serves every size.
function sparkPoints(series: number[]): string {
  const max = Math.max(...series, 1);
  const step = series.length > 1 ? 600 / (series.length - 1) : 600;

  return series
    .map((value, index) => {
      const x = Math.round(index * step * 10) / 10;
      const y = Math.round((44 - (value / max) * 38) * 10) / 10;

      return `${x},${y}`;
    })
    .join(" ");
}

function Spark({ series }: { series: number[] }) {
  const points = sparkPoints(series);

  return (
    <svg
      className="promoot-spark"
      viewBox="0 0 600 48"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon points={`0,48 ${points} 600,48`} />
      <polyline points={points} />
    </svg>
  );
}

type Pitch = NonNullable<BlockPayload["pitch"]>;

// What the owner wrote, with a preview of somebody else's ad underneath it: the
// empty slot sells itself to the visitor who could fill it.
function Billboard({ pitch, lines }: { pitch: Pitch; lines: PitchLine[] }) {
  return (
    <a className="promoot-bb" href={pitch.purchaseUrl} target="_blank" rel="noopener">
      <span className="promoot-face promoot-rest">
        {pitch.spark?.length ? <Spark series={pitch.spark} /> : null}
        {lines.map((line, index) => (
          <span
            key={`${line.kind}-${index}`}
            className={`promoot-line promoot-line-${line.kind}`}
          >
            {line.text}
          </span>
        ))}
      </span>

      <span className="promoot-face promoot-ghost">
        <span className="promoot-plus">+</span>
        <span>
          <span className="promoot-ghost-title">
            Your product · one line your buyers read
          </span>
          <span className="promoot-ghost-body">
            This is how it would look.{pitch.price ? ` ${pitch.price}.` : ""}
          </span>
        </span>
      </span>
    </a>
  );
}

function ClassicPitch({ pitch }: { pitch: Pitch }) {
  return (
    <a className="promoot-cta" href={pitch.purchaseUrl} target="_blank" rel="noopener">
      <strong>{pitch.headline}</strong>
      {pitch.pitch && <span className="promoot-pitch">{pitch.pitch}</span>}
      {pitch.proof && <span className="promoot-proof">{pitch.proof}</span>}
      <span className="promoot-terms">{pitch.terms}</span>
    </a>
  );
}

// A server that has not learned to compose an empty state sends no lines, and
// the pitch it does send is rendered exactly as it always was.
function EmptySlot({ pitch }: { pitch: Pitch }) {
  return pitch.lines?.length ? (
    <Billboard pitch={pitch} lines={pitch.lines} />
  ) : (
    <ClassicPitch pitch={pitch} />
  );
}

export async function PromootBlock({
  url,
  className,
  style,
  fallback = null,
}: PromootBlockProps) {
  const block = await loadBlock(url);

  if (!block || block.render === "blank") {
    return <>{fallback}</>;
  }

  return (
    <div data-promoot-slot={block.slot.id} className={className} style={style}>
      <style dangerouslySetInnerHTML={{ __html: scopedCss(block) }} />

      {block.ad && (
        <a
          className="promoot-ad"
          href={block.ad.clickUrl}
          target="_blank"
          rel="noopener nofollow sponsored"
        >
          <AdCreative creative={block.ad} />
          {block.slot.sponsoredLabel && (
            <span style={labelStyle}>{block.slot.sponsoredLabel}</span>
          )}
        </a>
      )}

      {block.pitch && <EmptySlot pitch={block.pitch} />}

      {/* The count comes from the visitor's own browser, not from this server:
          an observed view rather than one claimed by the site being paid. */}
      <img
        className="promoot-beacon"
        src={block.beaconUrl}
        width={1}
        height={1}
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}
