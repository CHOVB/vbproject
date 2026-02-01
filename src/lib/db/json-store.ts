// Memory-based Storage for Vercel Serverless
// Note: Data will not persist between function invocations on Vercel
// For production, use Vercel KV, Supabase, or another cloud database

// In-memory stores (reset on cold start)
const stores: Record<string, Record<string, unknown>> = {};

/**
 * Save data to store
 */
export async function saveData<T>(filename: string, data: T): Promise<void> {
    stores[filename] = data as Record<string, unknown>;
}

/**
 * Load data from store
 */
export async function loadData<T>(filename: string): Promise<T | null> {
    return (stores[filename] as T) || null;
}

/**
 * Check if data exists
 */
export async function dataExists(filename: string): Promise<boolean> {
    return filename in stores;
}

/**
 * Delete data
 */
export async function deleteData(filename: string): Promise<void> {
    delete stores[filename];
}

/**
 * List all data files
 */
export async function listDataFiles(): Promise<string[]> {
    return Object.keys(stores);
}
