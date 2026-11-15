type WellnessRetentionRpcClient = {
  rpc: (name: "archive_and_prune_wellness_history") => Promise<{
    error: { code?: string; message?: string } | null;
  }>;
};

/**
 * Detailed wellness entries age out after three months. The database function
 * preserves the compact daily numbers needed for year-to-date averages first.
 */
export async function maintainWellnessHistory(client: unknown): Promise<void> {
  const { error } = await (client as WellnessRetentionRpcClient).rpc(
    "archive_and_prune_wellness_history",
  );

  // A fresh local environment may not have the latest migration yet. Saving a
  // check-in must remain reliable while the database deploy catches up.
  if (error && error.code !== "PGRST202") {
    console.error("Wellness history retention could not run.", error.message);
  }
}
