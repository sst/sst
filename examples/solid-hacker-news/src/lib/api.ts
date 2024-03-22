import { cache } from "@solidjs/router";
import { StoryDefinition, StoryTypes, UserDefinition } from "~/types";

const story = (path: string) => `https://node-hnapi.herokuapp.com/${path}`;
const user = (path: string) => `https://hacker-news.firebaseio.com/v0/${path}.json`;

async function fetchAPI(path: string) {
  const url = path.startsWith("user") ? user(path) : story(path);
  const headers: Record<string, string> = { "User-Agent": "chrome" };

  try {
    let response = await fetch(url, { headers });
    let text = await response.text();
    try {
      if (text === null) {
        return { error: "Not found" };
      }
      return JSON.parse(text);
    } catch (e) {
      console.error(`Received from API: ${text}`);
      console.error(e);
      return { error: e };
    }
  } catch (error) {
    return { error };
  }
}

const mapStories = {
  top: "news",
  new: "newest",
  show: "show",
  ask: "ask",
  job: "jobs"
} as const;

export const getStories = cache(async (type: StoryTypes, page: number): Promise<StoryDefinition[]> => {
  "use server";
  return fetchAPI(`${mapStories[type]}?page=${page}`);
}, "stories");

export const getStory = cache(async (id: string): Promise<StoryDefinition> => {
  "use server";
  return fetchAPI(`item/${id}`);
}, "story");

export const getUser = cache(async (id: string): Promise<UserDefinition> => {
  "use server";
  return fetchAPI(`user/${id}`);
}, "user");
