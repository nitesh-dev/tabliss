import {
  BookmarkOrderChanges,
  GetAllBookmarkResponse,
  GetBookmarkItemsResponse,
} from "../../../background";
import { delay } from "./utils";

const bookmarkItemTestData = [
  {
    id: "5",
    title:
      "Make GNOME Desktop Look Like MacOS (NEW) || GNOME Customization 2025 - YouTube",
    url: "https://www.youtube.com/watch?v=rPAqwBzHcw4",
    index: 0,
  },
  {
    id: "7",
    title: "Online Workout Planner | Free Workout Builder",
    url: "https://fitnessprogramer.com/",
    index: 1,
  },
  {
    id: "9",
    title:
      "Anime Failure Frame: I Became the Strongest and Annihilated Everything With Low-Level Spells Watch Online Free - AnimeKAI",
    url: "https://animekai.bz/watch/failure-frame-i-became-the-strongest-and-annihilated-everything-with-low-level-spells-dk3l#ep=1",
    index: 2,
  },
  {
    id: "40",
    title:
      "Anime Failure Frame: I Became the Strongest and Annihilated Everything With Low-Level Spells Watch Online Free - AnimeKAI",
    url: "https://localhost:3000",
    index: 17,
  },
  {
    id: "15",
    title: "test1",
    index: 3,
    children: [
      {
        id: "16",
        title: "sdfasdf",
        url: "https://www.google.com/?zx=1759492713205&no_sw_cr=1",
        index: 0,
      },
      {
        id: "40",
        title:
          "Anime Failure Frame: I Became the Strongest and Annihilated Everything With Low-Level Spells Watch Online Free - AnimeKAI",
        url: "https://localhost:3000",
        index: 17,
      },
      {
        id: "34",
        title: "YouTube",
        url: "https://www.youtube.com/",
        index: 1,
      },
      {
        id: "21",
        title: "ellipsis css - Google Search",
        url: "https://www.google.com/search?q=ellipsis+css&oq=ellipsis+&gs_lcrp=EgZjaHJvbWUqBwgBEAAYgAQyBggAEEUYOTIHCAEQABiABDIKCAIQABixAxiABDIHCAMQABiABDIHCAQQABiABDIHCAUQABiABDINCAYQLhjHARjRAxiABDIHCAcQABiABDIHCAgQABiABDIGCAkQLhhA0gEINjAwNmowajGoAgiwAgHxBYJGRQ5LwRc6&sourceid=chrome&ie=UTF-8",
        index: 4,
      },
      {
        id: "22",
        title: "CSS text-overflow property",
        url: "https://www.w3schools.com/cssref/css3_pr_text-overflow.php",
        index: 5,
      },
      {
        id: "23",
        title: "W3Schools Tryit Editor",
        url: "https://www.w3schools.com/cssref/tryit.php?filename=trycss3_text-overflow",
        index: 6,
      },
      {
        id: "24",
        title: "CSS Tutorial",
        url: "https://www.w3schools.com/css/default.asp",
        index: 7,
      },
      {
        id: "25",
        title: "JavaScript Tutorial",
        url: "https://www.w3schools.com/js/default.asp",
        index: 8,
      },
      {
        id: "26",
        title: "Python Tutorial",
        url: "https://www.w3schools.com/python/default.asp",
        index: 9,
      },
      {
        id: "27",
        title: "PHP Tutorial",
        url: "https://www.w3schools.com/php/default.asp",
        index: 10,
      },
      {
        id: "28",
        title: "W3Schools How TO - Code snippets for HTML, CSS and JavaScript",
        url: "https://www.w3schools.com/howto/default.asp",
        index: 11,
      },
      {
        id: "29",
        title: "W3.CSS Home",
        url: "https://www.w3schools.com/w3css/default.asp",
        index: 12,
      },
      {
        id: "30",
        title: "C++ Tutorial",
        url: "https://www.w3schools.com/cpp/default.asp",
        index: 13,
      },
      {
        id: "31",
        title: "C Tutorial",
        url: "https://www.w3schools.com/c/index.php",
        index: 14,
      },
      {
        id: "32",
        title: "Choose a Bootstrap Version (3, 4 or 5)",
        url: "https://www.w3schools.com/bootstrap/bootstrap_ver.asp",
        index: 15,
      },
      {
        id: "33",
        title: "C# Tutorial (C Sharp)",
        url: "https://www.w3schools.com/cs/index.php",
        index: 16,
      },
    ],
  },
  {
    id: "21",
    title: "ellipsis css - Google Search",
    url: "https://www.google.com/search?q=ellipsis+css&oq=ellipsis+&gs_lcrp=EgZjaHJvbWUqBwgBEAAYgAQyBggAEEUYOTIHCAEQABiABDIKCAIQABixAxiABDIHCAMQABiABDIHCAQQABiABDIHCAUQABiABDINCAYQLhjHARjRAxiABDIHCAcQABiABDIHCAgQABiABDIGCAkQLhhA0gEINjAwNmowajGoAgiwAgHxBYJGRQ5LwRc6&sourceid=chrome&ie=UTF-8",
    index: 4,
  },
  {
    id: "22",
    title: "CSS text-overflow property",
    url: "https://www.w3schools.com/cssref/css3_pr_text-overflow.php",
    index: 5,
  },
  {
    id: "23",
    title: "W3Schools Tryit Editor",
    url: "https://www.w3schools.com/cssref/tryit.php?filename=trycss3_text-overflow",
    index: 6,
  },
  {
    id: "24",
    title: "CSS Tutorial",
    url: "https://www.w3schools.com/css/default.asp",
    index: 7,
  },
  {
    id: "25",
    title: "JavaScript Tutorial",
    url: "https://www.w3schools.com/js/default.asp",
    index: 8,
  },
  {
    id: "26",
    title: "Python Tutorial",
    url: "https://www.w3schools.com/python/default.asp",
    index: 9,
  },
  {
    id: "27",
    title: "PHP Tutorial",
    url: "https://www.w3schools.com/php/default.asp",
    index: 10,
  },
  {
    id: "28",
    title: "W3Schools How TO - Code snippets for HTML, CSS and JavaScript",
    url: "https://www.w3schools.com/howto/default.asp",
    index: 11,
  },
  {
    id: "29",
    title: "W3.CSS Home",
    url: "https://www.w3schools.com/w3css/default.asp",
    index: 12,
  },
  {
    id: "30",
    title: "C++ Tutorial",
    url: "https://www.w3schools.com/cpp/default.asp",
    index: 13,
  },
  {
    id: "31",
    title: "C Tutorial",
    url: "https://www.w3schools.com/c/index.php",
    index: 14,
  },
  {
    id: "32",
    title: "Choose a Bootstrap Version (3, 4 or 5)",
    url: "https://www.w3schools.com/bootstrap/bootstrap_ver.asp",
    index: 15,
  },
  {
    id: "33",
    title: "C# Tutorial (C Sharp)",
    url: "https://hjsadhfjksahd.com",
    index: 16,
  },
];

async function sendMessageToBackground<T = any>(
  message: any,
  fallbackData: any,
): Promise<T> {
  // The API already returns a promise. You don't need to wrap it.

  if (BUILD_TARGET !== "web") return browser.runtime.sendMessage(message);

  return fallbackData;
}
export async function getAllBookmarks() {
  return await sendMessageToBackground<GetAllBookmarkResponse[]>(
    {
      type: "GET_ALL_BOOKMARKS",
    },
    [],
  );
}

export async function getBookmarkItems(id: string) {
  return await sendMessageToBackground<GetBookmarkItemsResponse[]>(
    {
      type: "GET_BOOKMARK_ITEMS",
      id,
    },
    bookmarkItemTestData,
  );
}

export async function moveChangedBookmarks(changes: BookmarkOrderChanges[]) {
  return await sendMessageToBackground<Boolean>(
    {
      type: "MOVE_BOOKMARKS",
      changes,
    },
    false,
  );
}

export async function updateBookmarkItem(item: GetBookmarkItemsResponse) {
  return await sendMessageToBackground<GetBookmarkItemsResponse>(
    {
      type: "UPDATE_BOOKMARK_ITEM",
      item,
    },
    item,
  );
}

// REMOVE_BOOKMARKS

export async function removeBookmarks(id: string) {
  return await sendMessageToBackground<boolean>(
    {
      type: "REMOVE_BOOKMARKS",
      id,
    },
    true,
  );
}

