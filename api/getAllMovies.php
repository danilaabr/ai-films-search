<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

$host = 'localhost';
$port = '5432';
$dbname = 'postgres';
$user = 'postgres';
$password = '2223';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Ошибка подключения к БД: ' . $e->getMessage()]);
    exit;
}

$stmt = $pdo->query("SELECT movie_id, movie_title, movie_poster_url FROM movies ORDER BY movie_title");
$movies = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'success' => true,
    'movies' => $movies,
    'count' => count($movies)
]);
?>