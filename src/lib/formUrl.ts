export function toEmbeddableFormUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.pathname.endsWith("/viewform")) {
      url.searchParams.set("embedded", "true");
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}
