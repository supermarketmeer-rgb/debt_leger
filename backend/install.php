<?php
/**
 * معالج التثبيت التلقائي - Installation Wizard
 * Smart Debt Ledger
 */
$step = (int)($_GET['step'] ?? 1);
$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $step === 2) {
    $host = $_POST['db_host'] ?? 'localhost';
    $name = $_POST['db_name'] ?? 'smart_debt_ledger';
    $user = $_POST['db_user'] ?? 'root';
    $pass = $_POST['db_pass'] ?? '';

    try {
        $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `$name`");
        
        $sql = file_get_contents(__DIR__ . '/schema.sql');
        $pdo->exec($sql);

        $tenantName = $_POST['store_name'] ?? 'متجري الرئيسي';
        $pdo->prepare("INSERT INTO tenants (uuid, name) VALUES (UUID(), ?)")->execute([$tenantName]);
        $tenantId = $pdo->lastInsertId();

        $adminUser = $_POST['admin_user'] ?? 'admin';
        $adminPass = password_hash($_POST['admin_pass'] ?? 'admin123', PASSWORD_DEFAULT);
        $adminFullName = $_POST['admin_name'] ?? 'المدير العام';

        $pdo->prepare("INSERT INTO users (tenant_id, uuid, username, password_hash, full_name, role) VALUES (?, UUID(), ?, ?, ?, 'admin')")
            ->execute([$tenantId, $adminUser, $adminPass, $adminFullName]);

        $pdo->prepare("INSERT INTO settings (tenant_id, store_name, app_name) VALUES (?, ?, 'دفتر الديون الذكي')")
            ->execute([$tenantId, $tenantName]);

        $success = "تم التثبيت بنجاح! يمكنك الآن تسجيل الدخول.";
        $step = 3;
    } catch (Exception $e) {
        $error = "فشل التثبيت: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>معالج تثبيت دفتر الديون الذكي</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
    <style>
        body { background: #1c1917; font-family: 'Cairo', sans-serif; color: #f5f5f4; }
        .wizard-card { max-width: 650px; margin: 50px auto; background: #292524; border-radius: 12px; padding: 30px; border: 1px solid #44403c; }
    </style>
</head>
<body>
<div class="container">
    <div class="wizard-card shadow-lg">
        <h2 class="text-center text-warning mb-4">📖 معالج تثبيت دفتر الديون الذكي</h2>
        <?php if ($error): ?><div class="alert alert-danger"><?= htmlspecialchars($error) ?></div><?php endif; ?>
        <?php if ($step === 1): ?>
            <p class="text-stone-300">مرحبًا بك في معالج التثبيت. تأكد من توفر بيانات خادم MySQL.</p>
            <form method="POST" action="?step=2">
                <div class="mb-3">
                    <label class="form-label">خادم قاعدة البيانات (DB Host)</label>
                    <input type="text" name="db_host" class="form-control" value="localhost" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">اسم قاعدة البيانات (DB Name)</label>
                    <input type="text" name="db_name" class="form-control" value="smart_debt_ledger" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">اسم المستخدم (DB User)</label>
                    <input type="text" name="db_user" class="form-control" value="root" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">كلمة المرور (DB Password)</label>
                    <input type="password" name="db_pass" class="form-control">
                </div>
                <hr>
                <div class="mb-3">
                    <label class="form-label">اسم المتجر أو المؤسسة</label>
                    <input type="text" name="store_name" class="form-control" value="مؤسسة النور للتجارة" required>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">اسم مستخدم المدير</label>
                        <input type="text" name="admin_user" class="form-control" value="admin" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">كلمة مرور المدير</label>
                        <input type="password" name="admin_pass" class="form-control" value="admin123" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-warning w-100 py-2 fw-bold">ابدأ التثبيت الآن</button>
            </form>
        <?php elseif ($step === 3): ?>
            <div class="alert alert-success"><?= $success ?></div>
            <p>اسم المستخدم: <strong>admin</strong></p>
            <p>كلمة المرور: <strong>admin123</strong></p>
            <a href="../index.php" class="btn btn-success w-100">الانتقال للدفتر وتسجيل الدخول</a>
        <?php endif; ?>
    </div>
</div>
</body>
</html>
