-- CreateTable
CREATE TABLE "url" (
    "id" SERIAL NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "url_pkey" PRIMARY KEY ("id")
);
