-- CreateTable
CREATE TABLE "Conversation" (
    "conversationId" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
