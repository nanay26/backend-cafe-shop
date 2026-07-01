-- Performance indexes for menu, orders, and order items
CREATE INDEX "Menu_createdAt_idx" ON "Menu"("createdAt");
CREATE INDEX "Menu_category_createdAt_idx" ON "Menu"("category", "createdAt");

CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_menuId_idx" ON "OrderItem"("menuId");
