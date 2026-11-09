-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "sourceRef" TEXT,
ADD COLUMN     "unitId" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "examYear" INTEGER;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "eligibility" TEXT NOT NULL DEFAULT 'UNVERIFIED';

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "declaredCount" INTEGER NOT NULL,
    "rightsStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "rightsEvidence" TEXT,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "SourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceQuestion" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceNumber" INTEGER NOT NULL,
    "year" INTEGER,
    "exam" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "sourceOut" BOOLEAN NOT NULL,
    "contentHash" TEXT NOT NULL,
    "extracted" JSONB NOT NULL,
    "suggestions" JSONB NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "answerStatus" TEXT NOT NULL DEFAULT 'SOURCE_MATCHED',
    "eligibility" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "eligibilityVersion" TEXT NOT NULL DEFAULT 'NEET-2027-PROVISIONAL',
    "rightsStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "rightsEvidence" TEXT,
    "reviewEvidence" TEXT,
    "solution" TEXT,
    "solutionSource" TEXT,
    "solutionReviewStatus" TEXT NOT NULL DEFAULT 'MISSING',
    "solutionPublished" BOOLEAN NOT NULL DEFAULT false,
    "questionId" TEXT,

    CONSTRAINT "SourceQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyllabusUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "classLevel" INTEGER NOT NULL,
    "subjectId" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,

    CONSTRAINT "SyllabusUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceDocument_sha256_key" ON "SourceDocument"("sha256");

-- CreateIndex
CREATE UNIQUE INDEX "SourceQuestion_questionId_key" ON "SourceQuestion"("questionId");

-- CreateIndex
CREATE INDEX "SourceQuestion_reviewStatus_year_sourceId_idx" ON "SourceQuestion"("reviewStatus", "year", "sourceId");

-- CreateIndex
CREATE INDEX "SourceQuestion_contentHash_idx" ON "SourceQuestion"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "SourceQuestion_sourceId_sourceNumber_key" ON "SourceQuestion"("sourceId", "sourceNumber");

-- CreateIndex
CREATE INDEX "Question_examYear_contentHash_idx" ON "Question"("examYear", "contentHash");

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "SyllabusUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceQuestion" ADD CONSTRAINT "SourceQuestion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceQuestion" ADD CONSTRAINT "SourceQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyllabusUnit" ADD CONSTRAINT "SyllabusUnit_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
