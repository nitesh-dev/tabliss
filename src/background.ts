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

async function start() {
  let tree = await browser.bookmarks.getTree();

  console.log({ tree });

  console.log(await getAllFolderNames());
}

async function getAllFolderNames(
  tree?: Bookmarks.BookmarkTreeNode[],
  path: string = "",
): Promise<GetAllBookmarkResponse[]> {
  if (!tree) {
    tree = await browser.bookmarks.getTree();
  }

  let results: GetAllBookmarkResponse[] = [];

  for (const element of tree) {
    // If it's a folder (has children)
    if (element.children) {
      const folderPath = path ? `${path}/${element.title}` : element.title;

      results.push({ name: folderPath, id: element.id });

      // Recursively add children
      const childResults = await getAllFolderNames(
        element.children,
        folderPath,
      );
      results = results.concat(childResults);
    }
  }

  return results;
}

// start();

browser.runtime.onMessage.addListener(async (message, sender) => {
  console.log({ message });
  if (message.type === "GET_ALL_BOOKMARKS") {
    let bookmarks = await getAllFolderNames();

    // Send a response back
    // sendResponse({ bookmarks });
    return bookmarks.slice(1, bookmarks.length);
  } else if (message.type === "GET_BOOKMARK_ITEMS") {
    let tree = await browser.bookmarks.getSubTree(message.id);
    // console.log({ tree });

    // await browser.bookmarks.move("5", {});

    if (tree.length) return await getBookmarkItems(tree[0].children!!);
    return [];

  } else if (message.type == "MOVE_BOOKMARKS") {
    return await moveBookmarks(message.changes);

  } else if (message.type == "UPDATE_BOOKMARK_ITEM") {
    let item = message.item as GetBookmarkItemsResponse;

    return await updateBookmark(item);
  } else if(message.type == "REMOVE_BOOKMARKS"){
    return await removeBookmarks(message.id)
  }

  return true;
});

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
    data.push(d); // ✅ Add it to the array
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
  // Send message to the new tab page
  browser.runtime.sendMessage({
    type: "BOOKMARK_CREATED_DELETED",
    bookmark,
  });
});

browser.bookmarks.onRemoved.addListener((id, bookmark) => {
  // Send message to the new tab page
  browser.runtime.sendMessage({
    type: "BOOKMARK_CREATED_DELETED",
    bookmark,
  });
});
