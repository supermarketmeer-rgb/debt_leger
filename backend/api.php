<?php
/**
 * REST API - دفتر الديون الذكي
 * يدعم الاستدعاء من الويب وتطبيقات سطح المكتب (Desktop Client)
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Device-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));

$resource = $parts[1] ?? '';
$resourceId = isset($parts[2]) ? (int)$parts[2] : null;

$tenantId = 1;
$userId = $_SESSION['user_id'] ?? 1;
$userName = $_SESSION['user_name'] ?? 'مدير النظام';

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

try {
    switch ($resource) {
        case 'customers':
            if ($method === 'GET') {
                if ($resourceId) {
                    $stmt = $pdo->prepare('SELECT * FROM customers WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL');
                    $stmt->execute([$resourceId, $tenantId]);
                    $customer = $stmt->fetch();
                    if (!$customer) throw new Exception('الزبون غير موجود', 404);
                    echo json_encode(['success' => true, 'data' => $customer], JSON_UNESCAPED_UNICODE);
                } else {
                    $stmt = $pdo->prepare('SELECT * FROM customers WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC');
                    $stmt->execute([$tenantId]);
                    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
                }
            } elseif ($method === 'POST') {
                $code = $input['code'] ?? ('CUST-' . time());
                $stmt = $pdo->prepare('INSERT INTO customers (uuid, tenant_id, code, name, phone, address, notes, opening_balance, balance_type, current_balance) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $stmt->execute([$tenantId, $code, $input['name'], $input['phone'] ?? null, $input['address'] ?? null, $input['notes'] ?? null, $input['opening_balance'] ?? 0, $input['balance_type'] ?? 'debit', $input['opening_balance'] ?? 0]);
                $newId = $pdo->lastInsertId();
                recordAuditLog($pdo, $tenantId, $userId, $userName, 'إضافة زبون', "تمت إضافة الزبون: {$input['name']}");
                echo json_encode(['success' => true, 'id' => $newId, 'message' => 'تم إضافة الزبون بنجاح'], JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'PUT' && $resourceId) {
                $stmt = $pdo->prepare('UPDATE customers SET name=?, phone=?, address=?, notes=?, updated_at=NOW() WHERE id=? AND tenant_id=?');
                $stmt->execute([$input['name'], $input['phone'] ?? null, $input['address'] ?? null, $input['notes'] ?? null, $resourceId, $tenantId]);
                echo json_encode(['success' => true, 'message' => 'تم تحديث بيانات الزبون'], JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'DELETE' && $resourceId) {
                $stmt = $pdo->prepare('UPDATE customers SET deleted_at=NOW() WHERE id=? AND tenant_id=?');
                $stmt->execute([$resourceId, $tenantId]);
                echo json_encode(['success' => true, 'message' => 'تم حذف الزبون'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'suppliers':
            if ($method === 'GET') {
                $stmt = $pdo->prepare('SELECT * FROM suppliers WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC');
                $stmt->execute([$tenantId]);
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'POST') {
                $code = $input['code'] ?? ('SUP-' . time());
                $stmt = $pdo->prepare('INSERT INTO suppliers (uuid, tenant_id, code, name, phone, address, notes, opening_balance, balance_type, current_balance) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $stmt->execute([$tenantId, $code, $input['name'], $input['phone'] ?? null, $input['address'] ?? null, $input['notes'] ?? null, $input['opening_balance'] ?? 0, $input['balance_type'] ?? 'credit', $input['opening_balance'] ?? 0]);
                $newId = $pdo->lastInsertId();
                recordAuditLog($pdo, $tenantId, $userId, $userName, 'إضافة مورد', "تمت إضافة المورد: {$input['name']}");
                echo json_encode(['success' => true, 'id' => $newId, 'message' => 'تم إضافة المورد بنجاح'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'transactions':
            if ($method === 'GET') {
                $accountType = $_GET['account_type'] ?? null;
                $accountId   = $_GET['account_id'] ?? null;
                if ($accountType && $accountId) {
                    $stmt = $pdo->prepare('SELECT * FROM transactions WHERE tenant_id = ? AND account_type = ? AND account_id = ? ORDER BY tx_date ASC, id ASC');
                    $stmt->execute([$tenantId, $accountType, $accountId]);
                } else {
                    $stmt = $pdo->prepare('SELECT * FROM transactions WHERE tenant_id = ? ORDER BY tx_date DESC, id DESC');
                    $stmt->execute([$tenantId]);
                }
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'POST') {
                $pdo->beginTransaction();
                $accountType = $input['account_type'];
                $accountId   = (int)$input['account_id'];
                $type        = $input['type'];
                $amount      = (float)$input['amount'];
                $date        = $input['tx_date'] ?? date('Y-m-d');
                $description = $input['description'] ?? '';
                $notes       = $input['notes'] ?? null;
                $methodName  = $input['payment_method'] ?? 'cash';
                $docNo       = $input['document_no'] ?? ('DOC-' . time());

                $table = $accountType === 'customer' ? 'customers' : 'suppliers';
                $acc = $pdo->prepare("SELECT * FROM {$table} WHERE id = ? AND tenant_id = ?")->execute([$accountId, $tenantId]);
                $acc = $pdo->query("SELECT current_balance FROM {$table} WHERE id = {$accountId} AND tenant_id = {$tenantId}")->fetch();

                $currentBal = (float)($acc['current_balance'] ?? 0);
                $debit = $credit = 0;

                if ($accountType === 'customer') {
                    if (in_array($type, ['sale', 'opening_balance'])) { $debit = $amount; $newBal = $currentBal + $amount; }
                    else { $credit = $amount; $newBal = $currentBal - $amount; }
                } else {
                    if (in_array($type, ['purchase', 'opening_balance'])) { $credit = $amount; $newBal = $currentBal + $amount; }
                    else { $debit = $amount; $newBal = $currentBal - $amount; }
                }

                $upd = $pdo->prepare("UPDATE {$table} SET current_balance = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?");
                $upd->execute([$newBal, $accountId, $tenantId]);

                $txUuid = $input['uuid'] ?? bin2hex(random_bytes(16));
                $insTx = $pdo->prepare('INSERT INTO transactions (uuid, tenant_id, account_type, account_id, type, document_no, tx_date, amount, debit, credit, balance_after, payment_method, description, notes, user_id, user_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $insTx->execute([$txUuid, $tenantId, $accountType, $accountId, $type, $docNo, $date, $amount, $debit, $credit, $newBal, $methodName, $description, $notes, $userId, $userName]);

                recordAuditLog($pdo, $tenantId, $userId, $userName, 'حركة مالية', "تسجيل {$type} بمبلغ {$amount}");
                $pdo->commit();
                echo json_encode(['success' => true, 'new_balance' => $newBal, 'message' => 'تم حفظ الحركة بنجاح'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'sync':
            if ($method === 'POST') {
                $deviceId = $_SERVER['HTTP_X_DEVICE_ID'] ?? $input['device_id'] ?? 'unknown';
                $clientTimestamp = $input['last_sync_timestamp'] ?? '1970-01-01 00:00:00';
                $stmt = $pdo->prepare('SELECT * FROM transactions WHERE tenant_id = ? AND updated_at > ?');
                $stmt->execute([$tenantId, $clientTimestamp]);
                $serverTx = $stmt->fetchAll();
                echo json_encode([
                    'success' => true,
                    'server_timestamp' => date('Y-m-d H:i:s'),
                    'updates' => ['transactions' => $serverTx]
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Endpoint غير موجود'], JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
