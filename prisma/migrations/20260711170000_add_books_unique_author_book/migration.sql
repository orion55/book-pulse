DELETE FROM "Books"
WHERE "id" NOT IN (
  SELECT MIN("id")
  FROM "Books"
  GROUP BY "authorId", "bookId"
);

CREATE UNIQUE INDEX "Books_authorId_bookId_key"
ON "Books"("authorId", "bookId");
