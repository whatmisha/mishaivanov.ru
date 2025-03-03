<?php
header('Content-Type: application/json');

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
        $versions[] = $item;
    }
}

// Сортируем версии по числовому значению
sort($versions, SORT_NUMERIC);

echo json_encode($versions); 