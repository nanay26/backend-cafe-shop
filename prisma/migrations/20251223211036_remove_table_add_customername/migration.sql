/*
  Warnings:

  - You are about to drop the column `tableId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the `Table` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `customerName` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `variant` to the `OrderItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_tableId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "tableId",
ADD COLUMN     "customerName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "variant" TEXT NOT NULL;

-- DropTable
DROP TABLE "Table";
