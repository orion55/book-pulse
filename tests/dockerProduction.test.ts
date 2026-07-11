import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";

const repoRoot = process.cwd();

test("production compose runs migrations with a separate migrator service", async () => {
  const composePath = path.join(repoRoot, "docker-compose.production.yml");
  const dockerfilePath = path.join(repoRoot, "Dockerfile");
  const workflowPath = path.join(
    repoRoot,
    ".github",
    "workflows",
    "manual-docker-build.yml",
  );

  const [composeText, dockerfileText, workflowText] = await Promise.all([
    readFile(composePath, "utf8"),
    readFile(dockerfilePath, "utf8"),
    readFile(workflowPath, "utf8"),
  ]);

  const compose = YAML.parse(composeText) as {
    services?: Record<string, { image?: string; depends_on?: unknown }>;
  };

  assert.ok(compose.services?.migrate, "migrate service is missing");
  assert.equal(
    compose.services?.migrate?.image,
    "ghcr.io/orion55/book-pulse-migrate:latest",
  );
  assert.equal(
    compose.services?.app?.image,
    "ghcr.io/orion55/book-pulse:latest",
  );
  assert.deepEqual(compose.services?.app?.depends_on, {
    migrate: { condition: "service_completed_successfully" },
  });
  assert.match(dockerfileText, /FROM node:20-alpine AS migrator/);
  assert.match(dockerfileText, /apk add --no-cache openssl su-exec/);
  assert.match(
    dockerfileText,
    /exec su-exec node prisma migrate deploy/,
  );
  assert.match(workflowText, /book-pulse-migrate/);
  assert.match(workflowText, /target: migrator/);
});
