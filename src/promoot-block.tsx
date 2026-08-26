import type { CSSProperties, ReactNode } from "react";
import type { BlockPayload } from "./types.js";

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

// Every rule is scoped to this one block, and it never declares a colour scheme
// of its own: the palette uses light-dark(), which resolves against the scheme
// inherited from the host page, so a light-only site keeps a light panel.
export function scopedCss(payload: BlockPayload): string {
  const scope = `[data-promoot-slot="${payload.slot.id}"]`;

  return `${scope} { ${payload.paletteVars}; position: relative; display: block; width: 100%; max-width: ${payload.slot.widthPx}px; height: auto; max-height: ${payload.slot.heightPx}px; aspect-ratio: ${payload.slot.widthPx} / ${payload.slot.heightPx}; }
${scope} a { text-decoration: none; }
${scope} .promoot-ad { display: block; position: relative; height: 100%; width: 100%; }
${scope} .promoot-ad img { display: block; height: 100%; width: 100%; object-fit: cover; }
${scope} .promoot-cta { display: flex; flex-direction: column; align-items: center; gap: 3px; width: 100%; height: 100%; justify-content: center; padding: 0 10px; text-align: center; border: 1px dashed var(--edge); border-radius: 10px; box-sizing: border-box; color: var(--muted); background: var(--surface); font-family: system-ui, -apple-system, sans-serif; }
${scope} .promoot-cta:hover { border-color: var(--edge-hover); background: var(--surface-hover); }
${scope} .promoot-cta strong { font-size: 14px; color: var(--ink); }
${scope} .promoot-cta .promoot-pitch { font-size: 13px; color: var(--ink); }
${scope} .promoot-cta .promoot-proof { font-size: 11px; color: var(--muted); }
${scope} .promoot-cta .promoot-terms { font-size: 12px; }
${scope} .promoot-beacon { position: absolute; bottom: 0; right: 0; width: 1px; height: 1px; }`;
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
          <img src={block.ad.imageUrl} alt={block.ad.title} />
          {block.slot.sponsoredLabel && (
            <span style={labelStyle}>{block.slot.sponsoredLabel}</span>
          )}
        </a>
      )}

      {block.pitch && (
        <a
          className="promoot-cta"
          href={block.pitch.purchaseUrl}
          target="_blank"
          rel="noopener"
        >
          <strong>{block.pitch.headline}</strong>
          {block.pitch.pitch && <span className="promoot-pitch">{block.pitch.pitch}</span>}
          {block.pitch.proof && <span className="promoot-proof">{block.pitch.proof}</span>}
          <span className="promoot-terms">{block.pitch.terms}</span>
        </a>
      )}

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
