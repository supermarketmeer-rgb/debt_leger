`-- ============================================================
-- قاعدة بيانات: دفتر الديون الذكي (Smart Debt Ledger)
-- بيئة التشغيل: XAMPP / MySQL 8.0+ / MariaDB 10.4+ / PHP 8+
-- الترميز الموصى به: utf8mb4_unicode_ci (دعم كامل للعربية والرموز)
-- ⚠️  قاعدة البيانات نظيفة 100% - لا يوجد أي بيانات وهمية
-- ✅  يتم إنشاء الجداول تلقائياً عند أول تشغيل (CREATE TABLE IF NOT EXISTS)
-- ============================================================

CREATE DATABASE IF NOT EXISTS \`smart_debt_ledger\`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE \`smart_debt_ledger\`;

-- 1. جدول المتاجر والمؤسسات (Multi-Tenant Architecture)
CREATE TABLE IF NOT EXISTS \`tenants\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
    \`name\` VARCHAR(150) NOT NULL COMMENT 'اسم المتجر أو المؤسسة',
    \`phone\` VARCHAR(50) DEFAULT NULL,
    \`address\` VARCHAR(255) DEFAULT NULL,
    \`currency\` VARCHAR(20) DEFAULT 'د.ع',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_tenant_uuid\` (\`uuid\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. جدول إعدادات المتجر وهوية الدفتر
CREATE TABLE IF NOT EXISTS \`settings\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`tenant_id\` INT NOT NULL UNIQUE,
    \`store_name\` VARCHAR(150) NOT NULL DEFAULT 'دفتر الديون الذكي',
    \`app_name\` VARCHAR(100) NOT NULL DEFAULT 'دفتر الحسابات والديون',
    \`cover_color\` VARCHAR(30) DEFAULT '#581c1c' COMMENT 'لون جلد غلاف الدفتر',
    \`cover_texture\` VARCHAR(30) DEFAULT 'leather',
    \`logo_text\` VARCHAR(50) DEFAULT 'الدفتر الذكي',
    \`currency\` VARCHAR(20) DEFAULT 'د.ع',
    \`phone\` VARCHAR(50) DEFAULT '',
    \`address\` VARCHAR(255) DEFAULT '',
    \`date_format\` VARCHAR(30) DEFAULT 'YYYY-MM-DD',
    \`allow_credit_balance\` TINYINT(1) DEFAULT 1,
    \`auto_backup\` TINYINT(1) DEFAULT 1,
    \`last_backup_date\` VARCHAR(50) DEFAULT NULL,
    \`overdue_days_threshold\` INT DEFAULT 30,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_settings_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. جدول المستخدمين والصلاحيات
CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`tenant_id\` INT NOT NULL,
    \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
    \`username\` VARCHAR(60) NOT NULL,
    \`password_hash\` VARCHAR(255) NOT NULL,
    \`full_name\` VARCHAR(120) NOT NULL,
    \`role\` ENUM('admin', 'accountant', 'user') DEFAULT 'user',
    \`is_active\` TINYINT(1) DEFAULT 1,
    \`permissions\` LONGTEXT DEFAULT NULL COMMENT 'مصفوفة الصلاحيات بصيغة JSON',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_users_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
    UNIQUE KEY \`uq_tenant_username\` (\`tenant_id\`, \`username\`),
    INDEX \`idx_user_role\` (\`role\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. جدول دليل الزبائن والديون (فارغ - جاهز لإدخال البيانات الفعلية)
CREATE TABLE IF NOT EXISTS \`customers\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
    \`tenant_id\` INT NOT NULL,
    \`code\` VARCHAR(30) NOT NULL,
    \`name\` VARCHAR(150) NOT NULL,
    \`phone\` VARCHAR(50) DEFAULT NULL,
    \`address\` VARCHAR(255) DEFAULT NULL,
    \`notes\` TEXT DEFAULT NULL,
    \`opening_balance\` DECIMAL(15, 2) DEFAULT 0.00,
    \`balance_type\` ENUM('debit', 'credit') DEFAULT 'debit',
    \`current_balance\` DECIMAL(15, 2) DEFAULT 0.00,
    \`is_active\` TINYINT(1) DEFAULT 1,
    \`sync_status\` ENUM('synced', 'pending', 'conflict') DEFAULT 'synced',
    \`device_id\` VARCHAR(100) DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT \`fk_customers_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
    UNIQUE KEY \`uq_customer_code\` (\`tenant_id\`, \`code\`),
    INDEX \`idx_cust_phone\` (\`phone\`),
    INDEX \`idx_cust_name\` (\`name\`),
    INDEX \`idx_cust_balance\` (\`current_balance\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. جدول دليل الموردين والمستحقات (فارغ - جاهز لإدخال البيانات الفعلية)
CREATE TABLE IF NOT EXISTS \`suppliers\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
    \`tenant_id\` INT NOT NULL,
    \`code\` VARCHAR(30) NOT NULL,
    \`name\` VARCHAR(150) NOT NULL,
    \`phone\` VARCHAR(50) DEFAULT NULL,
    \`address\` VARCHAR(255) DEFAULT NULL,
    \`notes\` TEXT DEFAULT NULL,
    \`opening_balance\` DECIMAL(15, 2) DEFAULT 0.00,
    \`balance_type\` ENUM('debit', 'credit') DEFAULT 'credit',
    \`current_balance\` DECIMAL(15, 2) DEFAULT 0.00,
    \`is_active\` TINYINT(1) DEFAULT 1,
    \`sync_status\` ENUM('synced', 'pending', 'conflict') DEFAULT 'synced',
    \`device_id\` VARCHAR(100) DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT \`fk_suppliers_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
    UNIQUE KEY \`uq_supplier_code\` (\`tenant_id\`, \`code\`),
    INDEX \`idx_supp_phone\` (\`phone\`),
    INDEX \`idx_supp_name\` (\`name\`),
    INDEX \`idx_supp_balance\` (\`current_balance\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. جدول دفتر القيود والحركات الموحد (فارغ - جاهز لإدخال البيانات الفعلية)
CREATE TABLE IF NOT EXISTS \`transactions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
    \`tenant_id\` INT NOT NULL,
    \`account_type\` ENUM('customer', 'supplier') NOT NULL,
    \`account_id\` INT NOT NULL,
    \`account_code\` VARCHAR(30) NOT NULL,
    \`account_name\` VARCHAR(150) NOT NULL,
    \`type\` ENUM('sale', 'customer_payment', 'purchase', 'supplier_payment', 'opening_balance') NOT NULL,
    \`document_no\` VARCHAR(50) NOT NULL,
    \`tx_date\` DATE NOT NULL,
    \`amount\` DECIMAL(15, 2) NOT NULL,
    \`debit\` DECIMAL(15, 2) DEFAULT 0.00,
    \`credit\` DECIMAL(15, 2) DEFAULT 0.00,
    \`balance_after\` DECIMAL(15, 2) NOT NULL,
    \`payment_method\` ENUM('cash', 'bank_transfer', 'check', 'other') DEFAULT 'cash',
    \`description\` VARCHAR(255) NOT NULL,
    \`notes\` TEXT DEFAULT NULL,
    \`user_id\` INT DEFAULT NULL,
    \`user_name\` VARCHAR(120) NOT NULL,
    \`sync_status\` ENUM('synced', 'pending', 'conflict') DEFAULT 'synced',
    \`device_id\` VARCHAR(100) DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_tx_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
    INDEX \`idx_tx_account\` (\`account_type\`, \`account_id\`),
    INDEX \`idx_tx_date\` (\`tx_date\`),
    INDEX \`idx_tx_doc\` (\`document_no\`),
    INDEX \`idx_tx_type\` (\`type\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. جدول سجل الرقابة والعمليات (Audit Logs)
CREATE TABLE IF NOT EXISTS \`audit_logs\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`tenant_id\` INT NOT NULL,
    \`user_id\` INT DEFAULT NULL,
    \`user_name\` VARCHAR(100) NOT NULL,
    \`action\` VARCHAR(100) NOT NULL,
    \`details\` TEXT DEFAULT NULL,
    \`ip_address\` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_audit_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
    INDEX \`idx_audit_created\` (\`created_at\`),
    INDEX \`idx_audit_action\` (\`action\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. جدول النسخ الاحتياطية (Backups)
CREATE TABLE IF NOT EXISTS \`backups\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`tenant_id\` INT NOT NULL,
    \`filename\` VARCHAR(255) NOT NULL,
    \`size_str\` VARCHAR(50) NOT NULL,
    \`records_count\` INT DEFAULT 0,
    \`backup_type\` ENUM('manual', 'auto') DEFAULT 'manual',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_backups_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- البيانات الأولية فقط: مستأجر افتراضي + مدير النظام
-- قاعدة البيانات فارغة تماماً من أي زبائن أو موردين أو حركات
-- ============================================================

INSERT INTO \`tenants\` (\`id\`, \`uuid\`, \`name\`, \`phone\`, \`address\`, \`currency\`) VALUES
(1, 'tenant-01', 'دفتر الديون الذكي', '', '', 'د.ع')
ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);

INSERT INTO \`settings\` (\`id\`, \`tenant_id\`, \`store_name\`, \`app_name\`, \`cover_color\`, \`cover_texture\`, \`logo_text\`, \`currency\`, \`phone\`, \`address\`, \`date_format\`, \`allow_credit_balance\`, \`auto_backup\`, \`last_backup_date\`, \`overdue_days_threshold\`) VALUES
(1, 1, 'دفتر الديون الذكي', 'دفتر الحسابات والديون', '#581c1c', 'leather', 'الدفتر الذكي', 'د.ع', '', '', 'YYYY-MM-DD', 1, 1, NULL, 30)
ON DUPLICATE KEY UPDATE \`store_name\` = VALUES(\`store_name\`);

-- كلمة مرور المدير الافتراضية: admin123
INSERT INTO \`users\` (\`id\`, \`tenant_id\`, \`uuid\`, \`username\`, \`password_hash\`, \`full_name\`, \`role\`, \`is_active\`, \`permissions\`) VALUES
(1, 1, 'u-1', 'admin', '$2y$10$wK1WwzT8hX2aC5kZ5YQ9v.h6H8d3Xm9mZ9rPqWbFq9jQ0zK5a7.We', 'المدير العام (مسؤول النظام)', 'admin', 1, '{"canAccessDashboard":true,"canAccessSales":true,"canAccessPurchases":true,"canAccessCustomers":true,"canAccessSuppliers":true,"canAccessJournal":true,"canViewReports":true,"canManageBackups":true,"canEditSettings":true,"canManageUsers":true,"canDeleteRecords":true,"canExportData":true}')
ON DUPLICATE KEY UPDATE \`username\` = VALUES(\`username\`);
`
