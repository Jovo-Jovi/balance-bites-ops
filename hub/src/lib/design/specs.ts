import type { DesignType, LabelMode } from "./types";

export type DesignSpec = {
  id: DesignType;
  label: string;
  modes: LabelMode[];
  defaultMode: LabelMode;
  isTapered: boolean;
  outline: string | null;
  composite: boolean;
  hint: string;
};

export const DESIGN_SPECS: DesignSpec[] = [
  { id: "circular", label: "Circular", modes: ["circle"], defaultMode: "circle", isTapered: false, outline: "circle", composite: false, hint: "Front die-cut" },
  { id: "rect_top", label: "Rect + top", modes: ["back", "top"], defaultMode: "back", isTapered: false, outline: null, composite: false, hint: "Back label + round top" },
  { id: "taper_top", label: "Taper + top", modes: ["back", "top"], defaultMode: "back", isTapered: true, outline: null, composite: false, hint: "Cup wrap + round lid" },
  { id: "square", label: "Square", modes: ["circle"], defaultMode: "circle", isTapered: false, outline: "square", composite: false, hint: "Front die-cut" },
  { id: "pentagon", label: "Pentagon", modes: ["circle"], defaultMode: "circle", isTapered: false, outline: "pentagon", composite: false, hint: "Front die-cut" },
  { id: "hexagon", label: "Hexagon", modes: ["circle"], defaultMode: "circle", isTapered: false, outline: "hexagon", composite: false, hint: "Front die-cut" },
  { id: "octagon", label: "Octagon", modes: ["circle"], defaultMode: "circle", isTapered: false, outline: "octagon", composite: false, hint: "Front die-cut" },
  { id: "diamond", label: "Diamond", modes: ["circle"], defaultMode: "circle", isTapered: false, outline: "diamond", composite: false, hint: "Front die-cut" },
  { id: "star", label: "Star", modes: ["circle"], defaultMode: "circle", isTapered: false, outline: "star", composite: false, hint: "Front die-cut" },
  { id: "rounded_sq", label: "Rounded square", modes: ["circle"], defaultMode: "circle", isTapered: false, outline: "rounded_sq", composite: false, hint: "Front die-cut" },
  { id: "composite", label: "Composite", modes: ["circle"], defaultMode: "circle", isTapered: false, outline: null, composite: true, hint: "Multi-shape die-cut" },
];

export function getDesignSpec(id: string | null | undefined): DesignSpec {
  return DESIGN_SPECS.find((s) => s.id === id) ?? DESIGN_SPECS[1];
}

export function parseDesignType(value: unknown): DesignType {
  const id = String(value || "");
  return DESIGN_SPECS.some((s) => s.id === id) ? (id as DesignType) : "rect_top";
}
