/*
  Warnings:

  - Added the required column `fileName` to the `TaskAttachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalName` to the `TaskAttachment` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TaskAttachment" DROP CONSTRAINT "TaskAttachment_taskId_fkey";

-- AlterTable
ALTER TABLE "TaskAttachment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "originalName" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
