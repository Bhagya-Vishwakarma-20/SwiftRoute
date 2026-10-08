-- AlterTable
ALTER TABLE "Click" ADD COLUMN     "region" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "accuracyRadius" INTEGER;
