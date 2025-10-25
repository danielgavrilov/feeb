import {
  getRestaurantMenuSections,
  updateRestaurantMenuSections,
  type MenuSection,
  type RestaurantMenuSectionsResponse,
} from "@/lib/api";

export const ARCHIVE_SECTION_LABEL = "Archive";

export type StoredMenuSection = {
  id: number;
  label: string;
  position?: number | null;
  isArchive: boolean;
  isTemporary?: boolean;
};

export type MenuSectionsEventDetail = {
  restaurantId: number;
  sections: StoredMenuSection[];
  menuId: number;
};

const STORAGE_PREFIX = "feeb:menu-sections:";
export const MENU_SECTIONS_EVENT = "feeb:menu-sections-updated";

const TEMP_ID_BASE = -1_000_000;

const hasWindow = () => typeof window !== "undefined";

const getStorageKey = (restaurantId: number) => `${STORAGE_PREFIX}${restaurantId}`;

const toStoredSection = (section: MenuSection): StoredMenuSection => ({
  id: section.id,
  label: section.name,
  position: section.position ?? null,
  isArchive: section.is_archive,
});

const dispatchUpdate = (detail: MenuSectionsEventDetail) => {
  if (!hasWindow()) {
    return;
  }

  window.dispatchEvent(new CustomEvent<MenuSectionsEventDetail>(MENU_SECTIONS_EVENT, { detail }));
};

const writeCache = (restaurantId: number, data: { menuId: number; sections: StoredMenuSection[] }) => {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(getStorageKey(restaurantId), JSON.stringify(data));
  } catch (error) {
    console.error("Failed to persist menu sections cache", error);
  }
};

export const loadSavedMenuSections = (restaurantId: number): { menuId: number | null; sections: StoredMenuSection[] } => {
  if (!hasWindow()) {
    return { menuId: null, sections: [] };
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(restaurantId));
    if (!raw) {
      return { menuId: null, sections: [] };
    }

    const parsed = JSON.parse(raw) as { menuId?: number; sections?: StoredMenuSection[] };
    if (!parsed || !Array.isArray(parsed.sections)) {
      return { menuId: null, sections: [] };
    }

    const sections = parsed.sections
      .filter((section): section is StoredMenuSection => typeof section?.id === "number" && typeof section?.label === "string")
      .map((section) => ({
        id: section.id,
        label: section.label,
        position: section.position ?? null,
        isArchive:
          typeof section.isArchive === "boolean"
            ? section.isArchive
            : section.label.trim().toLowerCase() === ARCHIVE_SECTION_LABEL.toLowerCase(),
      }));

    return {
      menuId: typeof parsed.menuId === "number" ? parsed.menuId : null,
      sections,
    };
  } catch (error) {
    console.error("Failed to read cached menu sections", error);
    return { menuId: null, sections: [] };
  }
};

export const refreshMenuSections = async (
  restaurantId: number,
): Promise<{ menuId: number; sections: StoredMenuSection[] }> => {
  const response: RestaurantMenuSectionsResponse = await getRestaurantMenuSections(restaurantId);
  const sections = response.sections.map(toStoredSection);

  writeCache(restaurantId, { menuId: response.menu.id, sections });
  dispatchUpdate({ restaurantId, menuId: response.menu.id, sections });

  return { menuId: response.menu.id, sections };
};

export const saveMenuSections = async (
  restaurantId: number,
  sections: StoredMenuSection[],
): Promise<{ menuId: number; sections: StoredMenuSection[] }> => {
  const payload = sections.map((section, index) => ({
    id: section.isTemporary ? undefined : section.id,
    name: section.label,
    position: section.position ?? index,
  }));

  const response = await updateRestaurantMenuSections(restaurantId, payload);
  const normalized = response.sections.map(toStoredSection);

  writeCache(restaurantId, { menuId: response.menu.id, sections: normalized });
  dispatchUpdate({ restaurantId, menuId: response.menu.id, sections: normalized });

  return { menuId: response.menu.id, sections: normalized };
};

export const allocateTemporarySection = (label: string, position?: number | null): StoredMenuSection => ({
  id: TEMP_ID_BASE - Date.now(),
  label,
  position: position ?? null,
  isArchive: false,
  isTemporary: true,
});
