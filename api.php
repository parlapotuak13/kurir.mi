<?php
declare(strict_types=1);

/**
 * Router REST API Utama Eco-LogiX
 * Meneruskan setiap request ke Controller yang sesuai di dalam folder `app/Controllers/`.
 */
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/app/Models/StateModel.php';
require_once __DIR__ . '/app/Controllers/AuthController.php';
require_once __DIR__ . '/app/Controllers/ShipmentController.php';
require_once __DIR__ . '/app/Controllers/CourierController.php';
require_once __DIR__ . '/app/Controllers/VendorController.php';
require_once __DIR__ . '/app/Controllers/SystemController.php';

try {
    $pdo = getDbConnection();
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Gagal terhubung ke database MySQL: ' . $e->getMessage()]);
    exit;
}

$action   = (string) ($_GET['action'] ?? '');
$rawInput = file_get_contents('php://input');
$body     = $rawInput ? (json_decode($rawInput, true) ?? []) : $_POST;
$nowMs    = (int) round(microtime(true) * 1000);

try {
    switch ($action) {
        case 'state':
            $response = ['ok' => true, 'state' => StateModel::getFullState($pdo)];
            break;
        case 'login':
        case 'register':
            $response = AuthController::handleLoginOrRegister($pdo, $body, $action, $nowMs);
            break;
        case 'logout':
            $response = AuthController::handleLogout($pdo);
            break;
        case 'create_shipment':
            $response = ShipmentController::create($pdo, $body, $nowMs);
            break;
        case 'select_shipment':
            $response = ShipmentController::select($pdo, $body, $nowMs);
            break;
        case 'advance_shipment':
            $response = ShipmentController::advance($pdo, $body, $nowMs);
            break;
        case 'update_weights':
            $response = SystemController::updateObjectiveWeights($pdo, $body, $nowMs);
            break;
        case 'update_courier':
            $response = CourierController::updateCourierAndProgress($pdo, $body, $nowMs);
            break;
        case 'verify_otp':
            $response = CourierController::verifyOtp($pdo, $body, $nowMs);
            break;
        case 'update_vendor':
            $response = VendorController::updateSettings($pdo, $body, $nowMs);
            break;
        case 'reset_data':
            $response = SystemController::resetAll($pdo, $nowMs);
            break;
        default:
            http_response_code(400);
            $response = ['ok' => false, 'error' => 'Action tidak dikenali.'];
            break;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
