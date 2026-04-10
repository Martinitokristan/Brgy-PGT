/**
 * Centralized fetcher utility for SWR and other HTTP requests.
 * Handles JSON parsing and optional error checking.
 */

/**
 * Simple fetcher - returns JSON without error checking
 */
export const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Fetcher with error checking - throws if response is not OK
 */
export const fetcherWithError = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Failed to fetch");
    return res.json();
  });

/**
 * Fetcher with status error - throws with HTTP status code
 */
export const fetcherWithStatus = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  });
