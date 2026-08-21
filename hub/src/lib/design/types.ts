export type DesignType =
  | "circular"
  | "rect_top"
  | "taper_top"
  | "square"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "diamond"
  | "star"
  | "rounded_sq"
  | "composite";

export type LabelMode = "back" | "top" | "circle";

export type ProductIdentity = {
  brand: string;
  topLogo: string;
  topLine1: string;
  topLine2: string;
  circleBrand1: string;
  circleBrand2: string;
  weight: string;
  bestBefore: string;
  productionDate: string;
  dateLabel1: string;
  dateLabel2: string;
};

export type SyncTargets = { back: boolean; top: boolean; circle: boolean };

export type CompositePart = {
  id: string;
  name?: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  z?: number;
  color?: string;
  src?: string;
  srcUrl?: string;
  pathLocal?: string;
  showImage?: boolean;
  artKey?: string;
  lock?: boolean;
  borderColor?: string;
};

export type CompositeZone = {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z?: number;
  rot?: number;
  label?: string;
  text?: string;
  field?: string;
  color?: string;
  textColor?: string;
  src?: string;
  srcUrl?: string;
  iconId?: string;
  strokeWidth?: number;
  lock?: boolean;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  fontScale?: number;
  shape?: string;
  fill?: string;
};

export type LabelStamp = {
  id: string;
  iconId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  z?: number;
  color?: string;
  strokeWidth?: number;
  sizeId?: string;
};

export type CompositeBlob = {
  version?: number;
  artboard?: { wCm: number; hCm: number };
  bg?: string;
  txt?: string;
  parts?: CompositePart[];
  zones?: CompositeZone[];
  unionPath?: string;
  presetId?: string | null;
};

export type LabelState = Record<string, unknown> & {
  _composite?: CompositeBlob;
  _stamps?: LabelStamp[];
  _fillCutWithPaper?: boolean;
  _isTapered?: boolean;
  _designType?: string;
};

export type LabelTemplate = {
  id: string;
  name: string;
  productId: string;
  flavorKey: string;
  designType: DesignType;
  designLocked: boolean;
  labelMode: LabelMode;
  isTapered: boolean;
  state: LabelState;
  productIdentity: ProductIdentity;
  syncTargets: SyncTargets;
  schemaVersion: number;
  updatedAt: string;
};

export type LabelOpen = {
  stickerId?: string;
  templateId?: string;
  productId?: string;
  recipeId?: string;
  ts?: number;
};

export type StickerSku = {
  id: string;
  name: string;
  productId?: string;
  recipeId?: string;
  templateKey?: string;
};

export type FlavorPack = {
  id: string;
  name: string;
  bg: string;
  txt: string;
  sub: string;
  logo: string;
  flavor: string;
};
