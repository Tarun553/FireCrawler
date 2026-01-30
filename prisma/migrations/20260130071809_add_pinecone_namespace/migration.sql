/*
  Warnings:

  - A unique constraint covering the columns `[pineconeNamespace]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pineconeNamespace` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "pineconeNamespace" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Project_pineconeNamespace_key" ON "Project"("pineconeNamespace");
