<?php
// Функция для получения последней версии проекта
function getLatestVersion() {
    // Получаем список директорий
    $dirs = glob('./*', GLOB_ONLYDIR);
    
    // Фильтруем только директории с числовыми именами (версии)
    $versions = [];
    foreach ($dirs as $dir) {
        $dirName = basename($dir);
        // Изменяем регулярное выражение, чтобы оно принимало любое количество цифр
        if (preg_match('/^\d+$/', $dirName)) {
            $versions[] = $dirName;
        }
    }
    
    // Если версий нет, возвращаем дефолтное значение
    if (empty($versions)) {
        return "00"; // Дефолтная версия
    }
    
    // Сортируем версии по числовому значению
    usort($versions, function($a, $b) {
        // Преобразуем строки в числа для корректного сравнения
        return intval($a) - intval($b);
    });
    
    // Получаем последнюю версию
    $latestVersion = end($versions);
    
    // Форматируем версию, чтобы она имела как минимум 2 цифры
    return str_pad($latestVersion, 2, '0', STR_PAD_LEFT);
}

// Получаем последнюю версию
$latestVersion = getLatestVersion();

// Если запрос идет на конкретную версию, проверяем ее существование
$requestedVersion = isset($_GET['version']) ? $_GET['version'] : null;
if ($requestedVersion !== null) {
    // Проверяем, что запрошенная версия содержит только цифры
    if (preg_match('/^\d+$/', $requestedVersion)) {
        // Форматируем запрошенную версию
        $requestedVersion = str_pad($requestedVersion, 2, '0', STR_PAD_LEFT);
        if (is_dir('./' . $requestedVersion)) {
            $version = $requestedVersion;
        } else {
            $version = $latestVersion;
        }
    } else {
        $version = $latestVersion;
    }
} else {
    $version = $latestVersion;
}

// Перенаправляем на выбранную версию
header("Location: ./$version/");
exit;
?> 