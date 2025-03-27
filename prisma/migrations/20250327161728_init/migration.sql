-- CreateTable
CREATE TABLE "Books" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "authorId" INTEGER NOT NULL,
    "bookId" INTEGER NOT NULL,
    "title" TEXT NOT NULL
);
