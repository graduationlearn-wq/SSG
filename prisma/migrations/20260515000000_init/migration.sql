-- ================================================================
-- BeyondSite initial migration
-- Generated from prisma/schema.prisma (Round I, 2026-05-15)
-- Provider: MySQL 8.0
--
-- Apply with: npx prisma migrate deploy
-- After this, seed the templates table + first admin with:
--             npm run db:seed
-- ================================================================

-- CreateTable
CREATE TABLE `users` (
  `id`         VARCHAR(191) NOT NULL,
  `auth0Id`    VARCHAR(191) NOT NULL,
  `email`      VARCHAR(191) NOT NULL,
  `role`       ENUM('ADMIN', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
  `name`       VARCHAR(191) NULL,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3) NOT NULL,

  UNIQUE INDEX `users_auth0Id_key` (`auth0Id`),
  UNIQUE INDEX `users_email_key`   (`email`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `websites` (
  `id`         VARCHAR(191) NOT NULL,
  `userId`     VARCHAR(191) NOT NULL,
  `name`       VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(191) NOT NULL,
  `data`       JSON NOT NULL,
  `status`     ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3) NOT NULL,

  INDEX `websites_userId_idx` (`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `drafts` (
  `id`         VARCHAR(191) NOT NULL,
  `userId`     VARCHAR(191) NOT NULL,
  `templateId` VARCHAR(32)  NOT NULL,
  `formData`   JSON NOT NULL,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`  DATETIME(3) NOT NULL,

  UNIQUE INDEX `drafts_userId_templateId_key` (`userId`, `templateId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `downloads` (
  `id`           VARCHAR(191) NOT NULL,
  `userId`       VARCHAR(191) NOT NULL,
  `paymentId`    VARCHAR(191) NOT NULL,
  `templateId`   VARCHAR(191) NOT NULL,
  `downloadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templates` (
  `templateId`  VARCHAR(32) NOT NULL,
  `displayName` VARCHAR(191) NOT NULL,
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt`   DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`templateId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
  `id`         VARCHAR(191) NOT NULL,
  `userId`     VARCHAR(191) NULL,
  `paymentId`  VARCHAR(191) NOT NULL,
  `amount`     INT NOT NULL,
  `currency`   VARCHAR(191) NOT NULL DEFAULT 'INR',
  `status`     ENUM('CREATED', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'CREATED',
  `templateId` VARCHAR(191) NOT NULL,
  `usedAt`     DATETIME(3) NULL,
  `createdAt`  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `payments_paymentId_key` (`paymentId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `websites`  ADD CONSTRAINT `websites_userId_fkey`     FOREIGN KEY (`userId`)    REFERENCES `users`(`id`)    ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE `drafts`    ADD CONSTRAINT `drafts_userId_fkey`       FOREIGN KEY (`userId`)    REFERENCES `users`(`id`)    ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE `downloads` ADD CONSTRAINT `downloads_userId_fkey`    FOREIGN KEY (`userId`)    REFERENCES `users`(`id`)    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `downloads` ADD CONSTRAINT `downloads_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `payments`  ADD CONSTRAINT `payments_userId_fkey`     FOREIGN KEY (`userId`)    REFERENCES `users`(`id`)    ON DELETE RESTRICT ON UPDATE CASCADE;
