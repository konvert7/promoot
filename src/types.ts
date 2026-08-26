export type BlockRender = "ad" | "pitch" | "blank";

/** What GET /api/block/:slotId answers with. */
export type BlockPayload = {
  slot: {
    id: string;
    widthPx: number;
    heightPx: number;
    sponsoredLabel: string | null;
  };
  render: BlockRender;
  ad: {
    title: string;
    imageUrl: string;
    clickUrl: string;
    expiresAt: string | null;
  } | null;
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
