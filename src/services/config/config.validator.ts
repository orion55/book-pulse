import { AppConfig } from "@services/config/config.types";
import { z, ZodError } from "zod";

const nonEmptyStringSchema = z
  .string({ error: "должно быть непустой строкой" })
  .trim()
  .min(1, { message: "должно быть непустой строкой" });

const chatIdSchema = z.preprocess(
  (value) => (typeof value === "string" ? Number(value.trim()) : value),
  z
    .number({ error: "должно быть корректным числом" })
    .refine((value) => Number.isFinite(value) && value !== 0, {
      message: "должно быть корректным числом",
    }),
);

const bookUrlSchema = nonEmptyStringSchema.pipe(
  z.url({ error: "должно быть корректным URL" }),
);

const configSchema = z.object(
  {
    telegram: z.object(
      {
        bot_token: nonEmptyStringSchema,
        chat_id: chatIdSchema,
      },
      { error: "должно быть объектом" },
    ),
    books: z.preprocess(
      (value) =>
        value === undefined ? [] : Array.isArray(value) ? value : [value],
      z.array(bookUrlSchema),
    ),
  },
  { error: "должен быть объектом" },
);

const formatIssuePath = (pathSegments: PropertyKey[]): string =>
  pathSegments.reduce<string>((pathName, segment) => {
    if (typeof segment === "number") {
      return `${pathName}[${segment}]`;
    }

    return pathName ? `${pathName}.${String(segment)}` : String(segment);
  }, "");

const formatValidationError = (error: ZodError): string =>
  error.issues
    .map((issue) => {
      const pathName = formatIssuePath(issue.path);
      return pathName
        ? `Поле ${pathName} ${issue.message}`
        : `config.yml ${issue.message}`;
    })
    .join("; ");

export const parseConfig = (config: unknown): AppConfig =>
  configSchema.parse(config);

export const formatConfigError = (error: unknown): string =>
  error instanceof ZodError ? formatValidationError(error) : String(error);
