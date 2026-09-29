-- CreateEnum
CREATE TYPE "PayslipStatus" AS ENUM ('DRAFT', 'FINALISED');

-- CreateTable
CREATE TABLE "PayrollConfig" (
    "id" TEXT NOT NULL,
    "transportAllowance" DOUBLE PRECISION NOT NULL,
    "housingAllowance" DOUBLE PRECISION NOT NULL,
    "medicalAllowance" DOUBLE PRECISION NOT NULL,
    "lateDeductionAmount" DOUBLE PRECISION NOT NULL,
    "overdueTaskDeductionPercent" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "transportAllowance" DOUBLE PRECISION NOT NULL,
    "housingAllowance" DOUBLE PRECISION NOT NULL,
    "medicalAllowance" DOUBLE PRECISION NOT NULL,
    "performanceBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absentDays" INTEGER NOT NULL,
    "absenceDeduction" DOUBLE PRECISION NOT NULL,
    "lateCount" INTEGER NOT NULL,
    "lateDeduction" DOUBLE PRECISION NOT NULL,
    "overdueTasksCount" INTEGER NOT NULL,
    "overdueDeduction" DOUBLE PRECISION NOT NULL,
    "grossSalary" DOUBLE PRECISION NOT NULL,
    "totalDeductions" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "status" "PayslipStatus" NOT NULL DEFAULT 'DRAFT',
    "finalisedById" TEXT,
    "finalisedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_employeeId_month_year_key" ON "Payslip"("employeeId", "month", "year");

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_finalisedById_fkey" FOREIGN KEY ("finalisedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
