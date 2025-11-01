import { Bookmarks } from "webextension-polyfill/namespaces/bookmarks";

export interface GetAllBookmarkResponse {
  name: string;
  id: string;
}

export interface GetBookmarkItemsResponse {
  id: string;
  title: string;
  index?: number;
  url?: string;
  children?: GetBookmarkItemsResponse[];
}

/**
 * Work Hours background tracker
 * Tracks time while any browser window is focused, independent of the Tabliss tab.
 * Stores per-day totals and settings in browser.storage.local (no DB).
 */
type WorkHoursSettings = {
  dailyReset: boolean;
  days: number[]; // 0-6, Sunday=0
};

type WorkHoursState = {
  lastTick: number | null; // ms epoch of last accounted activity
  paused: boolean;
  isFocused: boolean;
};

type WorkHoursTotals = {
  // yyyy-mm-dd -> seconds
  [key: string]: number;
};

const WH_STORAGE_KEYS = {
  settings: "workhours_settings",
  state: "workhours_state",
  totals: "workhours_totals",
} as const;

const defaultSettings: WorkHoursSettings = {
  dailyReset: true,
  days: [1, 2, 3, 4, 5], // Mon-Fri
};

let whSettings: WorkHoursSettings = defaultSettings;
let whState: WorkHoursState = { lastTick: null, paused: false, isFocused: false };
let whTotals: WorkHoursTotals = {};

function whFmtDate(d = new Date()) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function whLoad() {
  const {
    [WH_STORAGE_KEYS.settings]: s,
    [WH_STORAGE_KEYS.state]: st,
    [WH_STORAGE_KEYS.totals]: t,
  } = await browser.storage.local.get([
    WH_STORAGE_KEYS.settings,
    WH_STORAGE_KEYS.state,
    WH_STORAGE_KEYS.totals,
  ]);

  whSettings = { ...defaultSettings, ...(s || {}) };
  whState = { lastTick: null, paused: false, isFocused: false, ...(st || {}) };
  whTotals = t || {};
}

async function whSaveState() {
  await browser.storage.local.set({ [WH_STORAGE_KEYS.state]: whState });
}

async function whSaveTotals() {
  await browser.storage.local.set({ [WH_STORAGE_KEYS.totals]: whTotals });
}

async function whSaveSettings() {
  await browser.storage.local.set({ [WH_STORAGE_KEYS.settings]: whSettings });
}

function whIsWorkday(d = new Date()) {
  return whSettings.days.includes(d.getDay());
}

async function whGetAnyWindowFocused(): Promise<boolean> {
  const wins = await browser.windows.getAll({ populate: false, windowTypes: ["normal"] });
  return wins.some((w) => w.focused === true);
}

let whIntervalId: number | undefined;

async function whTick() {
  if (whState.paused) {
    whState.lastTick = null;
    await whSaveState();
    return;
  }

  const focused = await whGetAnyWindowFocused();
  whState.isFocused = focused;

  if (!focused) {
    whState.lastTick = null;
    await whSaveState();
    return;
  }

  const now = Date.now();
  const nowDate = new Date(now);
  const todayKey = whFmtDate(nowDate);

  if (!whIsWorkday(nowDate)) {
    whState.lastTick = null;
    await whSaveState();
    return;
  }

  if (whSettings.dailyReset && !whTotals[todayKey]) {
    whTotals[todayKey] = 0;
    await whSaveTotals();
  }

  if (whState.lastTick != null) {
    const elapsedMs = now - whState.lastTick;
    // Cap to 5 seconds to avoid large jumps after sleep
    const boundedMs = Math.min(elapsedMs, 5000);
    const incSec = Math.floor(boundedMs / 1000);

    if (incSec > 0) {
      const prev = new Date(whState.lastTick);
      const prevKey = whFmtDate(prev);
      if (prevKey !== todayKey) {
        // Start fresh today, don't bridge across midnight for simplicity
        if (!whTotals[todayKey]) whTotals[todayKey] = 0;
        await whSaveTotals();
      } else {
        if (!whTotals[todayKey]) whTotals[todayKey] = 0;
        whTotals[todayKey] += incSec;
        await whSaveTotals();
      }
    }
  }

  whState.lastTick = now;
  await whSaveState();
}

async function whStart() {
  await whLoad();

  const todayKey = whFmtDate();
  if (whSettings.dailyReset && !whTotals[todayKey]) {
    whTotals[todayKey] = 0;
    await whSaveTotals();
  }

  if (whIntervalId) {
    clearInterval(whIntervalId);
  }
  whIntervalId = setInterval(whTick, 1000) as unknown as number;

  browser.windows.onFocusChanged.addListener(() => {
    void whTick();
  });

  const scheduleMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const ms = midnight.getTime() - now.getTime();
    setTimeout(async () => {
      const todayKey = whFmtDate();
      if (whSettings.dailyReset) {
        whTotals[todayKey] = whTotals[todayKey] || 0;
        await whSaveTotals();
      }
      whState.lastTick = null;
      await whSaveState();
      scheduleMidnight();
    }, ms);
  };
  scheduleMidnight();
}

browser.runtime.onMessage.addListener(async (message, sender) => {
  console.log({ message });
  if (message.type === "GET_ALL_BOOKMARKS") {
    let bookmarks = await getAllFolderNames();
    return bookmarks.slice(1, bookmarks.length);

  } else if (message.type === "GET_BOOKMARK_ITEMS") {
    let tree = await browser.bookmarks.getSubTree(message.id);
    if (tree.length) return await getBookmarkItems(tree[0].children!!);
    return [];

  } else if (message.type == "MOVE_BOOKMARKS") {
    return await moveBookmarks(message.changes);

  } else if (message.type == "UPDATE_BOOKMARK_ITEM") {
    let item = message.item as GetBookmarkItemsResponse;
    return await updateBookmark(item);

  } else if (message.type == "REMOVE_BOOKMARKS") {
    return await removeBookmarks(message.id);

  // WorkHours API
  } else if (message.type === "WORKHOURS_GET_TODAY") {
    const key = whFmtDate();
    return { seconds: whTotals[key] || 0, isFocused: whState.isFocused };

  } else if (message.type === "WORKHOURS_RESET_TODAY") {
    const key = whFmtDate();
    whTotals[key] = 0;
    await whSaveTotals();
    whState.lastTick = null;
    await whSaveState();
    return { ok: true };

  } else if (message.type === "WORKHOURS_GET_SETTINGS") {
    return whSettings;

  } else if (message.type === "WORKHOURS_SET_SETTINGS") {
    const next = message.settings as Partial<WorkHoursSettings>;
    whSettings = { ...whSettings, ...next };
    await whSaveSettings();
    return { ok: true, settings: whSettings };

  } else if (message.type === "WORKHOURS_PAUSE") {
    whState.paused = true;
    await whSaveState();
    return { ok: true };

  } else if (message.type === "WORKHOURS_RESUME") {
    whState.paused = false;
    await whSaveState();
    return { ok: true };
  }

  return true;
});

async function getAllFolderNames(
  tree?: Bookmarks.BookmarkTreeNode[],
  path: string = "",
): Promise<GetAllBookmarkResponse[]> {
  if (!tree) {
    tree = await browser.bookmarks.getTree();
  }

  let results: GetAllBookmarkResponse[] = [];

  for (const element of tree) {
    if (element.children) {
      const folderPath = path ? `${path}/${element.title}` : element.title;

      results.push({ name: folderPath, id: element.id });

      const childResults = await getAllFolderNames(
        element.children,
        folderPath,
      );
      results = results.concat(childResults);
    }
  }

  return results;
}

async function getBookmarkItems(
  tree: Bookmarks.BookmarkTreeNode[],
): Promise<GetBookmarkItemsResponse[]> {
  let data: GetBookmarkItemsResponse[] = [];

  for (const i of tree) {
    let d: GetBookmarkItemsResponse = {
      id: i.id,
      title: i.title,
      url: i.url,
      index: i.index,
    };

    if (i.children) d.children = await getBookmarkItems(i.children);
    data.push(d);
  }

  return data;
}

export interface BookmarkOrderChanges {
  id: string;
  newIndex: number;
}
async function moveBookmarks(changes: BookmarkOrderChanges[]) {
  for (const change of changes) {
    try {
      await browser.bookmarks.move(change.id, { index: change.newIndex });
      return true;
    } catch (err) {
      console.warn("Failed to move bookmark:", change.id, err);
      return false;
    }
  }
}

async function updateBookmark(item: GetBookmarkItemsResponse) {
  let res = await browser.bookmarks.update(item.id, {
    title: item.title,
    url: item.url,
  });
  let d: GetBookmarkItemsResponse = {
    id: res.id,
    title: res.title,
    url: res.url,
    index: res.index,
  };

  return d;
}

async function removeBookmarks(id: string) {
  await browser.bookmarks.removeTree(id);
  return true;
}

browser.bookmarks.onCreated.addListener((id, bookmark) => {
  browser.runtime.sendMessage({
    type: "BOOKMARK_CREATED_DELETED",
    bookmark,
  });
});

browser.bookmarks.onRemoved.addListener((id, bookmark) => {
  browser.runtime.sendMessage({
    type: "BOOKMARK_CREATED_DELETED",
    bookmark,
  });
});

// Start background work-hours tracker
void whStart();
