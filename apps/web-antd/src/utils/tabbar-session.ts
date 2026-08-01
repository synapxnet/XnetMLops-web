type SessionStorageLike = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

interface PersistedTab {
  fullPath?: unknown;
  path?: unknown;
}

const TRANSIENT_TASK_PATHS = new Set(['/MTP/train/job', '/MTP/train/task']);

function getTabLocation(tab: PersistedTab) {
  let location = '';
  if (typeof tab.fullPath === 'string') {
    location = tab.fullPath;
  } else if (typeof tab.path === 'string') {
    location = tab.path;
  }

  try {
    return decodeURIComponent(location);
  } catch {
    return location;
  }
}

/**
 * Drop volatile task pages and duplicate entries restored by older releases.
 * The active route is added again by the tabbar after the router is ready.
 */
export function sanitizeTabbarSession(
  namespace: string,
  storage: SessionStorageLike = sessionStorage,
) {
  const storageKey = `${namespace}-core-tabbar`;
  const rawState = storage.getItem(storageKey);
  if (!rawState) return;

  try {
    const state = JSON.parse(rawState) as { tabs?: unknown };
    if (!Array.isArray(state.tabs)) return;

    const seenLocations = new Set<string>();
    const tabs = state.tabs.filter((tab): tab is PersistedTab => {
      if (!tab || typeof tab !== 'object') return false;

      const location = getTabLocation(tab as PersistedTab);
      const routePath = location.split('?')[0];
      if (routePath && TRANSIENT_TASK_PATHS.has(routePath)) return false;

      if (location && seenLocations.has(location)) return false;
      if (location) seenLocations.add(location);
      return true;
    });

    if (tabs.length !== state.tabs.length) {
      storage.setItem(storageKey, JSON.stringify({ ...state, tabs }));
    }
  } catch {
    storage.removeItem(storageKey);
  }
}
