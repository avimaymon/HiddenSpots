/** Shared atlas list paging types (kept out of "use server" modules). */
export const ATLAS_LIST_PAGE_SIZE = 200;

export type AtlasListCursor = { updatedAt: string; id: string };
