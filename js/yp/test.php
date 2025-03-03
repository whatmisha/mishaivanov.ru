<?php
// Включаем отображение ошибок
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Выводим информацию о PHP
echo "<h1>PHP Test</h1>";
echo "<p>PHP Version: " . phpversion() . "</p>";

// Получаем список всех директорий
$versions = [];
$dir = __DIR__;

echo "<p>Текущая директория: " . $dir . "</p>";

// Получаем все директории в текущей папке
$items = scandir($dir);

echo "<p>Содержимое директории:</p>";
echo "<pre>";
print_r($items);
echo "</pre>";

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

echo "<p>Найденные версии:</p>";
echo "<pre>";
print_r($versions);
echo "</pre>";

// Если нет доступных версий
if (empty($versions)) {
    echo "<p>Нет доступных версий</p>";
} else {
    // Находим максимальную версию
    $latestVersion = max($versions);
    echo "<p>Максимальная версия: " . $latestVersion . "</p>";

    // Форматируем номер версии с ведущим нулем
    $latestVersionStr = str_pad($latestVersion, 2, '0', STR_PAD_LEFT);
    echo "<p>Форматированная версия: " . $latestVersionStr . "</p>";
    
    echo "<p>URL для редиректа: ./" . $latestVersionStr . "/</p>";
}
?> 