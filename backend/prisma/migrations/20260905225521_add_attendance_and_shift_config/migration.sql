/*
  Warnings:

  - A unique constraint covering the columns `[employeeId,date]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `shiftId` to the `Attendance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "shiftId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ShiftConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "lateToleranceMinutes" INTEGER NOT NULL DEFAULT 15,
    "deductionRule" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "ShiftConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
