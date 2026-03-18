<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

set_time_limit(60);

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

$input = json_decode(file_get_contents('php://input'), true);
$userQuery = $input['query'] ?? '';

if (empty($userQuery)) {
    echo json_encode(['success' => false, 'error' => 'Пустой запрос']);
    exit;
}

try {
    $stmt = $pdo->query("SELECT movie_id, movie_title, movie_poster_url FROM movies ORDER BY movie_title");
    $dbMovies = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $movieTitles = array_column($dbMovies, 'movie_title');
    $movieMap = [];
    foreach ($dbMovies as $movie) {
        $movieMap[mb_strtolower($movie['movie_title'])] = $movie;
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Ошибка загрузки фильмов из БД']);
    exit;
}

$movieList = implode(', ', $movieTitles);
$systemPrompt = "Ты — помощник по поиску фильмов. У тебя есть база фильмов: {$movieList}.

ПРАВИЛА:
1. Если пользователь спрашивает про цитату или описывает сцену — используй веб-поиск чтобы точно определить фильм.
2. Если нашёл фильм и он ЕСТЬ в базе — в конце ответа добавь строку: [В_БАЗЕ]
3. Если нашёл фильм но его НЕТ в базе — в конце ответа добавь строку: [НЕТ_В_БАЗЕ]
4. Не выдумывай, ищи в интернете.
5. На приветствия отвечай коротко и дружелюбно.";

$modelResponse = askModel($userQuery, $systemPrompt);

if (!$modelResponse['success']) {
    echo json_encode($modelResponse);
    exit;
}

$reply = $modelResponse['reply'];
$hasMovie = false;

if (strpos($reply, '[В_БАЗЕ]') !== false) {
    $hasMovie = true;
    $reply = str_replace('[В_БАЗЕ]', '', $reply);
} elseif (strpos($reply, '[НЕТ_В_БАЗЕ]') !== false) {
    $hasMovie = false;
    $reply = str_replace('[НЕТ_В_БАЗЕ]', '', $reply);
}

$foundTitle = '';
preg_match('/\*\*(.+?)\*\*|«(.+?)»|"(.+?)"/u', $reply, $matches);
if (!empty($matches)) {
    $foundTitle = $matches[1] ?? $matches[2] ?? $matches[3] ?? '';
}

$matchedMovies = [];

if (!empty($foundTitle)) {
    $titleLower = mb_strtolower($foundTitle);
    
    if (isset($movieMap[$titleLower])) {
        $matchedMovies[] = $movieMap[$titleLower];
    } else {
        foreach ($movieTitles as $title) {
            if (mb_stripos($title, $foundTitle) !== false || mb_stripos($foundTitle, $title) !== false) {
                $matchedMovies[] = $movieMap[mb_strtolower($title)];
                break;
            }
        }
    }
}

if (empty($matchedMovies) && $hasMovie) {
    $words = explode(' ', $userQuery);
    foreach ($words as $word) {
        $word = trim($word);
        if (strlen($word) > 3) {
            foreach ($movieTitles as $title) {
                if (mb_stripos($title, $word) !== false) {
                    $matchedMovies[] = $movieMap[mb_strtolower($title)];
                    break 2;
                }
            }
        }
    }
}

$finalReply = trim($reply);

echo json_encode([
    'success' => true,
    'query' => $userQuery,
    'reply' => $finalReply,
    'movies' => $matchedMovies,
    'has_movie' => !empty($matchedMovies)
], JSON_UNESCAPED_UNICODE);

function askModel($userQuery, $systemPrompt) {
    $url = 'https://openrouter.ai/api/v1/chat/completions';
    $apiKey = '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';

    $models = [
        'deepseek/deepseek-v3.2'
    ];
    
    $data = [
        'messages' => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user', 'content' => $userQuery]
        ],
        'temperature' => 0.3,
        'max_tokens' => 512,
        'plugins' => [
            ['id' => 'web']
        ]
    ];

    foreach ($models as $model) {
        $data['model'] = $model;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
            'HTTP-Referer: http://localhost',
            'X-Title: Movie Finder'
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 45);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $result = json_decode($response, true);
            $text = $result['choices'][0]['message']['content'] ?? '';
            if (!empty(trim($text))) {
                return ['success' => true, 'reply' => trim($text)];
            }
        }

        if ($httpCode === 429) continue;
    }

    return ['success' => false, 'error' => 'Все модели заняты, попробуйте через минуту'];
}
?>