import fetch from "node-fetch";
import { Storage } from "./storage";

export const storageKey = "storage.json";

export async function onSchedule(storage: Storage) {
  const timestamp = new Date().getTime();
  const ip: string = (await fetchGZippedResponse()).origin;

  await storage.write(storageKey, { timestamp, ip });
}

export async function onGet(storage: Storage, param: string) {
  const json = await storage.read(storageKey);
  return { json, param };
}

async function fetchGZippedResponse() {
  const response = await fetch("https://httpbin.org/gzip"); // returns gzipped response with request info
  return await response.json();
}
