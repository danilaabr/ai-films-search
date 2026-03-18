<?php
function writeLog($query, $status, $details = []) {
    $logFile = __DIR__ . '/../logs/search.log';
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    
    $duration = $details['duration'] ?? 0;
    $moviesCount = $details['movies_count'] ?? 0;
    $errorMsg = $details['error'] ?? '';
    
    $logEntry = sprintf(
        "[%s] IP: %s | Запрос: %s | Статус: %s | Время: %.2f сек | Найдено: %d | Ошибка: %s | UA: %s\n",
        $timestamp,
        $ip,
        $query,
        $status,
        $duration,
        $moviesCount,
        $errorMsg,
        $userAgent
    );
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}
?>