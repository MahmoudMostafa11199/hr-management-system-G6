-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_markedById_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_shiftId_fkey";

-- AlterTable
ALTER TABLE "Attendance" ALTER COLUMN "markedById" DROP NOT NULL,
ALTER COLUMN "shiftId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "ShiftConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
