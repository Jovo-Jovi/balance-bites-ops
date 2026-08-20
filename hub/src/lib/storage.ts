/**
 * Cloud Storage is off on the Spark (free) plan.
 * Label art and folder backups stay in Desktop `saved data`.
 */
export function assertStorageEnabled(): never {
  throw new Error(
    "Firebase Storage is disabled (Spark). Keep label_assets and bb_backups in the Desktop saved data folder.",
  );
}

export async function uploadLabelAsset(): Promise<string> {
  return assertStorageEnabled();
}

export async function getLabelAssetUrl(): Promise<string> {
  return assertStorageEnabled();
}

export async function deleteLabelAsset(): Promise<void> {
  return assertStorageEnabled();
}

export async function uploadBackupJson(): Promise<string> {
  return assertStorageEnabled();
}
