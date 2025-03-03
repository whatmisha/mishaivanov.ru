<?php
// Получаем список всех директорий
$versions = [];
$dir = __DIR__;

// Получаем все директории в текущей папке
$items = scandir($dir);

foreach ($items as $item) {
    // Пропускаем . и .. и не-директории
    if ($item === '.' || $item === '..' || !is_dir($dir . '/' . $item)) {
        continue;
    }
    
    // Проверяем, что имя директории состоит только из цифр
    if (preg_match('/^\d+$/', $item)) {
        $versions[] = intval($item);
    }
}

// Если нет доступных версий, перенаправляем на 00
if (empty($versions)) {
    header('Location: ./00/');
    exit;
}

// Находим максимальную версию
$latestVersion = max($versions);

// Форматируем номер версии с ведущим нулем
$latestVersionStr = str_pad($latestVersion, 2, '0', STR_PAD_LEFT);

// Перенаправляем на последнюю версию
header('Location: ./' . $latestVersionStr . '/');
exit;
?> 