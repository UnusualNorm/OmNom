-- CreateTable
CREATE TABLE "Filter" (
    "id" TEXT NOT NULL,
    "guild" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filter" TEXT NOT NULL,

    PRIMARY KEY ("id", "guild", "type")
);

-- CreateTable
CREATE TABLE "Chatbot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "avatar" TEXT,
    "persona" TEXT,
    "greeting" TEXT,
    "keywords" TEXT
);

-- CreateTable
CREATE TABLE "GlobalChatbot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "ImageSafety" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "safe" BOOLEAN NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Chatbot_id_key" ON "Chatbot"("id");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalChatbot_id_key" ON "GlobalChatbot"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ImageSafety_id_key" ON "ImageSafety"("id");
