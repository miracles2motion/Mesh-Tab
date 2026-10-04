export type WorkspaceMode = "sample" | "blank" | "testnet";

export function storageKey(entity: string, mode: WorkspaceMode, id?: string): string {
  const activeMode = mode;
  
  if (entity === "tabs") {
    return activeMode === "sample" ? "meshTab_sample_tabs" 
         : activeMode === "testnet" ? "meshTab_testnet_tabs"
         : "meshTab_clean_tabs";
  }
  if (entity === "members" && id) {
    return activeMode === "sample" ? `meshTab_members_${id}`
         : activeMode === "testnet" ? `meshTab_testnet_members_${id}`
         : `meshTab_clean_members_${id}`;
  }
  if (entity === "expenses" && id) {
    return activeMode === "sample" ? `meshTab_expenses_${id}`
         : activeMode === "testnet" ? `meshTab_testnet_expenses_${id}`
         : `meshTab_clean_expenses_${id}`;
  }
  if (entity === "settledPayoutBalance") {
    return activeMode === "sample" ? "meshTab_settledPayoutBalance"
         : activeMode === "testnet" ? "meshTab_testnet_settledPayoutBalance"
         : "meshTab_clean_settledPayoutBalance";
  }
  if (entity === "virtualBalance") {
    // M1 split virtual balance
    return activeMode === "sample" ? "meshTab_sample_virtualBalance"
         : activeMode === "testnet" ? "meshTab_testnet_virtualBalance"
         : "meshTab_clean_virtualBalance";
  }
  if (entity === "notifications") {
    return activeMode === "sample" ? "meshTab_sample_notifications"
         : activeMode === "testnet" ? "meshTab_testnet_notifications"
         : "meshTab_clean_notifications";
  }
  if (entity === "sessionSnapshot") {
    return activeMode === "testnet" ? "meshTab_testnet_sessionSnapshot" : ""; // only valid for testnet
  }
  if (entity === "archived") {
    return activeMode === "sample" ? "meshTab_sample_archived"
         : activeMode === "testnet" ? "meshTab_testnet_archived"
         : "meshTab_clean_archived";
  }
  
  // fallback for global/un-namespaced keys
  return `meshTab_${entity}${id ? `_${id}` : ''}`;
}

export function safeSetItem(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch (error: any) {
    if (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED") {
      console.warn("Storage almost full - trying to prune synced items...");
      // TODO: Implement pruning logic in a layer above storage-keys to avoid circular imports.
      console.warn("Storage is completely full and no synced data could be pruned.");
    } else {
      throw error;
    }
  }
}
