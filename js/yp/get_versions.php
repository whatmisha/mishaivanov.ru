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
        $versions[] = intval($item); // Преобразуем в число для правильной сортировки
    }
}

// Сортируем версии по числовому значению в порядке убывания
rsort($versions, SORT_NUMERIC);

// Преобразуем обратно в строки с ведущими нулями
$formatted_versions = [];
foreach ($versions as $version) {
    $formatted_versions[] = str_pad($version, 2, '0', STR_PAD_LEFT);
}

echo json_encode($formatted_versions); 