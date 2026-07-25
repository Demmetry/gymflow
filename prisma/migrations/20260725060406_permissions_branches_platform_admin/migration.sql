-- AlterTable
ALTER TABLE "User" ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "isPlatformOwner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "permissions" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
