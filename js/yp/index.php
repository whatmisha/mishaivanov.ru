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
    usort($versions, function($a, $b) {
        return intval($a) - intval($b);
    });
    
    // Возвращаем последнюю версию
    return end($versions);
}

// Получаем последнюю версию
$latestVersion = getLatestVersion();

// Если запрос идет на конкретную версию, проверяем ее существование
$requestedVersion = isset($_GET['version']) ? $_GET['version'] : null;
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