export type BlockRender = "ad" | "pitch" | "blank";

/** An ad is either artwork the sponsor uploaded, or words they wrote. */
export type Creative =
  | { kind: "IMAGE"; title: string; imageUrl: string }
  | {
      kind: "TEXT";
      /** Optional: a link alone is a complete ad, and the host stands in. */
      headline: string | null;
      body: string | null;
      /** Null when the sponsor's site has none, or it could not be captured. */
      faviconUrl: string | null;
      host: string;
      monogram: string;
    };

/** What GET /api/block/:slotId answers with. */
export type BlockPayload = {
  slot: {
    id: string;
    widthPx: number;
    heightPx: number;
    sponsoredLabel: string | null;
  };
  render: BlockRender;
  ad: ({ clickUrl: string; expiresAt: string | null } & Creative) | null;
  pitch: {
    headline: string;
    pitch: string | null;
    proof: string | null;
    terms: string;
    purchaseUrl: string;
  } | null;
  beaconUrl: string;
  paletteVars: string;
};
