import { FailedUrl } from "../types/books.types";

export const formatFetchFailures = (failed: FailedUrl[]) =>
  failed
    .map(
      (fail) =>
        `URL: ${fail.url}; попыток: ${fail.attempts}; причина: ${fail.reason}`,
    )
    .join("\n");
