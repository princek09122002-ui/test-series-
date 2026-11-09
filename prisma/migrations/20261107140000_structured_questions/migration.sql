CREATE TABLE "CanonicalQuestionRecord" (
  "questionId" TEXT NOT NULL REFERENCES "SourceQuestion"("id"),
  "contentVersion" INTEGER NOT NULL CHECK ("contentVersion" > 0),
  "schemaVersion" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "chapterId" TEXT REFERENCES "Chapter"("id"),
  "contentHash" TEXT NOT NULL,
  "document" JSONB NOT NULL,
  "technicalState" TEXT NOT NULL,
  "issues" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("questionId", "contentVersion")
);
CREATE INDEX "CanonicalQuestionRecord_scope" ON "CanonicalQuestionRecord"("subject", "chapterId", "technicalState");
CREATE INDEX "CanonicalQuestionRecord_duplicates" ON "CanonicalQuestionRecord"("contentHash");
CREATE TABLE "CanonicalQuestionOption" (
 "questionId" TEXT NOT NULL, "contentVersion" INTEGER NOT NULL, "optionId" TEXT NOT NULL,
 "label" TEXT NOT NULL, "content" JSONB NOT NULL, "correct" BOOLEAN NOT NULL,
 PRIMARY KEY("questionId","contentVersion","optionId"),
 UNIQUE("questionId","contentVersion","label"),
 FOREIGN KEY("questionId","contentVersion") REFERENCES "CanonicalQuestionRecord"("questionId","contentVersion")
);
CREATE TABLE "CanonicalQuestionTopic" (
 "questionId" TEXT NOT NULL, "contentVersion" INTEGER NOT NULL, "topicId" TEXT NOT NULL REFERENCES "Topic"("id"),
 "role" TEXT NOT NULL, "verified" BOOLEAN NOT NULL DEFAULT FALSE,
 PRIMARY KEY("questionId","contentVersion","topicId","role"),
 FOREIGN KEY("questionId","contentVersion") REFERENCES "CanonicalQuestionRecord"("questionId","contentVersion")
);
