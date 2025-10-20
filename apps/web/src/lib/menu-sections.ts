export type StoredMenuSection = {
  id: string;
  label: string;
};

const STORAGE_KEY = "feeb:menu-sections";
export const MENU_SECTIONS_EVENT = "feeb:menu-sections-updated";

export const loadSavedMenuSections = (): StoredMenuSection[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is StoredMenuSection => Boolean(item && typeof item.id === "string" && typeof item.label === "string"))
      .map((item) => ({
        id: item.id,
        label: item.label,
      }));
  } catch (error) {
    console.error("Failed to load menu sections from storage", error);
    return [];
  }
};

export const saveMenuSections = (sections: StoredMenuSection[]) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
    window.dispatchEvent(new CustomEvent<StoredMenuSection[]>(MENU_SECTIONS_EVENT, { detail: sections }));
  } catch (error) {
    console.error("Failed to persist menu sections", error);
  }
};

