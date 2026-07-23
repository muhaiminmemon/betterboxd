/**
 * Reads a JSON body without throwing. A 500 that returns an HTML error page
 * would otherwise reject inside a handler and leave the UI frozen with no
 * message, so every fetch site goes through here.
 */
export async function readJson<T = Record<string, unknown>>(res: Response): Promise<Partial<T>> {
  try {
    return (await res.json()) as Partial<T>;
  } catch {
    return {};
  }
}

/** The error message from a failed response, or a fallback worth showing. */
export async function errorFrom(res: Response, fallback: string): Promise<string> {
  const data = await readJson<{ error: string }>(res);
  return typeof data.error === "string" && data.error ? data.error : fallback;
}
