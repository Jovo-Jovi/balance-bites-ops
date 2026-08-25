import type { FlavorPack, LabelState } from "./types";

/** Label flavor packs — in code only. Never write these into Firestore. */
export const FLAVOR_PACKS: FlavorPack[] = [
  { id: "forest", name: "Forest Green", bg: "#2e7d32", txt: "#ffffff", sub: "#c8e6c9", logo: "#1b5e20", flavor: "#1a1a1a" },
  { id: "deep_green", name: "Deep Green", bg: "#1b5e20", txt: "#e8f5e9", sub: "#a5d6a7", logo: "#0d3b12", flavor: "#c8e6c9" },
  { id: "matcha", name: "Matcha", bg: "#558b2f", txt: "#f1f8e9", sub: "#c5e1a5", logo: "#33691e", flavor: "#1b5e20" },
  { id: "olive", name: "Olive", bg: "#827717", txt: "#f9fbe7", sub: "#e6ee9c", logo: "#5d6400", flavor: "#3e4400" },
  { id: "mint", name: "Mint", bg: "#00695c", txt: "#e0f2f1", sub: "#80cbc4", logo: "#004d40", flavor: "#004d40" },
  { id: "sage", name: "Sage", bg: "#7d9a7a", txt: "#f4f7f3", sub: "#d7e3d5", logo: "#4f6a4c", flavor: "#2f3f2d" },
  { id: "chocolate", name: "Chocolate", bg: "#4e342e", txt: "#fff8e1", sub: "#d7ccc8", logo: "#3e2723", flavor: "#3e2723" },
  { id: "cocoa", name: "Cocoa", bg: "#3e2723", txt: "#efebe9", sub: "#bcaaa4", logo: "#2a1814", flavor: "#d7ccc8" },
  { id: "caramel", name: "Caramel", bg: "#8d6e63", txt: "#efebe9", sub: "#d7ccc8", logo: "#5d4037", flavor: "#3e2723" },
  { id: "espresso", name: "Espresso", bg: "#2c1810", txt: "#f5e6d3", sub: "#c4a484", logo: "#c9a84c", flavor: "#c9a84c" },
  { id: "peanut", name: "Peanut", bg: "#a1887f", txt: "#fffde7", sub: "#efebe9", logo: "#6d4c41", flavor: "#4e342e" },
  { id: "berry", name: "Berry", bg: "#6a1b9a", txt: "#f3e5f5", sub: "#ce93d8", logo: "#4a148c", flavor: "#1a1a1a" },
  { id: "plum", name: "Plum", bg: "#4a148c", txt: "#f3e5f5", sub: "#b39ddb", logo: "#311b92", flavor: "#e1bee7" },
  { id: "grape", name: "Grape", bg: "#7b1fa2", txt: "#fce4ec", sub: "#e1bee7", logo: "#6a1b9a", flavor: "#4a148c" },
  { id: "raspberry", name: "Raspberry", bg: "#ad1457", txt: "#fce4ec", sub: "#f8bbd0", logo: "#880e4f", flavor: "#1a1a1a" },
  { id: "strawberry", name: "Strawberry", bg: "#c62828", txt: "#ffebee", sub: "#ffcdd2", logo: "#b71c1c", flavor: "#3e2723" },
  { id: "cherry", name: "Cherry", bg: "#880e4f", txt: "#fce4ec", sub: "#f48fb1", logo: "#560027", flavor: "#f8bbd0" },
  { id: "citrus", name: "Citrus", bg: "#ef6c00", txt: "#ffffff", sub: "#ffe0b2", logo: "#e65100", flavor: "#1a1a1a" },
  { id: "mango", name: "Mango", bg: "#fb8c00", txt: "#fff8e1", sub: "#ffe082", logo: "#ef6c00", flavor: "#e65100" },
  { id: "honey", name: "Honey", bg: "#f9a825", txt: "#3e2723", sub: "#fff59d", logo: "#f57f17", flavor: "#5d4037" },
  { id: "lemon", name: "Lemon", bg: "#fbc02d", txt: "#3e2723", sub: "#fff9c4", logo: "#f9a825", flavor: "#5d4037" },
  { id: "apricot", name: "Apricot", bg: "#ff8a65", txt: "#3e2723", sub: "#ffccbc", logo: "#e64a19", flavor: "#bf360c" },
  { id: "ocean", name: "Ocean", bg: "#0277bd", txt: "#e1f5fe", sub: "#81d4fa", logo: "#01579b", flavor: "#0d47a1" },
  { id: "navy", name: "Navy", bg: "#0d47a1", txt: "#e3f2fd", sub: "#90caf9", logo: "#082e6b", flavor: "#bbdefb" },
  { id: "sky", name: "Sky", bg: "#039be5", txt: "#ffffff", sub: "#b3e5fc", logo: "#0277bd", flavor: "#01579b" },
  { id: "teal", name: "Teal", bg: "#00838f", txt: "#e0f7fa", sub: "#80deea", logo: "#006064", flavor: "#004d40" },
  { id: "indigo", name: "Indigo", bg: "#303f9f", txt: "#e8eaf6", sub: "#9fa8da", logo: "#1a237e", flavor: "#c5cae9" },
  { id: "noir", name: "Noir Gold", bg: "#1a1508", txt: "#c9a84c", sub: "#a89878", logo: "#c9a84c", flavor: "#c9a84c" },
  { id: "charcoal", name: "Charcoal", bg: "#212121", txt: "#fafafa", sub: "#bdbdbd", logo: "#000000", flavor: "#eeeeee" },
  { id: "slate", name: "Slate", bg: "#37474f", txt: "#eceff1", sub: "#b0bec5", logo: "#263238", flavor: "#cfd8dc" },
  { id: "cream", name: "Cream", bg: "#f5f0e6", txt: "#3e3426", sub: "#7a6f58", logo: "#5d4e37", flavor: "#3e3426" },
  { id: "ivory", name: "Ivory", bg: "#fff8e7", txt: "#4e342e", sub: "#a1887f", logo: "#6d4c41", flavor: "#5d4037" },
  { id: "sand", name: "Sand", bg: "#e8dcc8", txt: "#3e3426", sub: "#a89878", logo: "#6b5e3a", flavor: "#5d4e37" },
  { id: "blush", name: "Blush", bg: "#f8bbd0", txt: "#4a148c", sub: "#fce4ec", logo: "#ad1457", flavor: "#880e4f" },
  { id: "lavender", name: "Lavender", bg: "#b39ddb", txt: "#311b92", sub: "#ede7f6", logo: "#5e35b1", flavor: "#4527a0" },
  { id: "coral", name: "Coral", bg: "#ff7043", txt: "#ffffff", sub: "#ffccbc", logo: "#e64a19", flavor: "#bf360c" },
  { id: "terracotta", name: "Terracotta", bg: "#bf360c", txt: "#fbe9e7", sub: "#ffab91", logo: "#8d2a0a", flavor: "#ffccbc" },
  { id: "wine", name: "Wine", bg: "#6d1b2a", txt: "#fce4ec", sub: "#e57373", logo: "#4a0f1a", flavor: "#ef9a9a" },
  { id: "bb_classic", name: "BB Classic", bg: "#2e7d32", txt: "#ffffff", sub: "#c9a84c", logo: "#1b5e20", flavor: "#c9a84c" },
  { id: "bb_dark", name: "BB Dark Gold", bg: "#0e0d0a", txt: "#c9a84c", sub: "#7a6f58", logo: "#c9a84c", flavor: "#e8dfc8" },
];

export function flavorPackById(id: string | null | undefined): FlavorPack | undefined {
  return FLAVOR_PACKS.find((p) => p.id === id);
}

export type FlavorSnapshot = {
  cLabel: string;
  cTxtMain: string;
  cTxtSub: string;
  cLogoTxt: string;
  cCFlavorClr: string;
  cLogoCircle: string;
  compositeBg: string;
  compositeTxt: string;
  partColors: Record<string, string>;
  zoneColors: Record<string, string>;
};

export function flavorSnapshot(state: LabelState): FlavorSnapshot {
  return {
    cLabel: String(state.cLabel || ""),
    cTxtMain: String(state.cTxtMain || ""),
    cTxtSub: String(state.cTxtSub || ""),
    cLogoTxt: String(state.cLogoTxt || ""),
    cCFlavorClr: String(state.cCFlavorClr || ""),
    cLogoCircle: String(state.cLogoCircle || ""),
    compositeBg: String(state._composite?.bg || ""),
    compositeTxt: String(state._composite?.txt || ""),
    partColors: Object.fromEntries(
      (state._composite?.parts || []).map((p) => [p.id, String(p.color || "")]),
    ),
    zoneColors: Object.fromEntries(
      (state._composite?.zones || []).map((z) => [z.id, String(z.color || "")]),
    ),
  };
}

export function flavorSnapshotEquals(state: LabelState, snap: FlavorSnapshot | null) {
  if (!snap) return false;
  const now = flavorSnapshot(state);
  return (
    now.cLabel === snap.cLabel &&
    now.cTxtMain === snap.cTxtMain &&
    now.cTxtSub === snap.cTxtSub &&
    now.cLogoTxt === snap.cLogoTxt &&
    now.cCFlavorClr === snap.cCFlavorClr &&
    now.cLogoCircle === snap.cLogoCircle
  );
}

export function restoreFlavorSnapshot(state: LabelState, snap: FlavorSnapshot): LabelState {
  const next: LabelState = {
    ...state,
    cLabel: snap.cLabel,
    cTxtMain: snap.cTxtMain,
    cTxtSub: snap.cTxtSub,
    cLogoTxt: snap.cLogoTxt,
    cCFlavorClr: snap.cCFlavorClr,
    cLogoCircle: snap.cLogoCircle,
  };
  if (next._composite) {
    next._composite = {
      ...next._composite,
      bg: snap.compositeBg || next._composite.bg,
      txt: snap.compositeTxt || next._composite.txt,
      parts: (next._composite.parts || []).map((p) =>
        Object.prototype.hasOwnProperty.call(snap.partColors, p.id)
          ? { ...p, color: snap.partColors[p.id] }
          : p,
      ),
      zones: (next._composite.zones || []).map((z) =>
        Object.prototype.hasOwnProperty.call(snap.zoneColors, z.id)
          ? { ...z, color: snap.zoneColors[z.id] }
          : z,
      ),
    };
  }
  return next;
}
