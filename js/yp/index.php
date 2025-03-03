<?php
// Функция для получения последней версии проекта
function getLatestVersion() {
    // Получаем список директорий
    $dirs = glob('./*', GLOB_ONLYDIR);
    
    // Фильтруем только директории с числовыми именами (версии)
    $versions = [];
    foreach ($dirs as $dir) {
        $dirName = basename($dir);
        if (preg_match('/^\d+$/', $dirName)) {
            $versions[] = $dirName;
        }
    }
    
    // Если версий нет, возвращаем дефолтное значение
    if (empty($versions)) {
        return "10"; // Дефолтная версия
    }
    
    // Сортируем версии по числовому значению
    // Используем intval для правильной сортировки многозначных чисел
    usort($versions, function($a, $b) {
        return intval($a) - intval($b);
    });
    
    // Возвращаем последнюю версию
    return end($versions);
}

// Получаем последнюю версию
$latestVersion = getLatestVersion();

// Получаем запрошенный путь
$requestUri = $_SERVER['REQUEST_URI'];
$pathParts = explode('/', trim($requestUri, '/'));

// Проверяем, запрошена ли конкретная версия
$requestedVersion = null;
foreach ($pathParts as $part) {
    if (preg_match('/^\d+$/', $part)) {
        $requestedVersion = $part;
        break;
    }
}

// Если запрос идет на конкретную версию, проверяем ее существование
if ($requestedVersion && is_dir('./' . $requestedVersion)) {
    // Если запрошенная версия существует, используем ее
    $version = $requestedVersion;
} else {
    // Иначе используем последнюю версию
    $version = $latestVersion;
}

// Перенаправляем на выбранную версию
header("Location: ./$version/");
exit;
?> 