<?php
// Включаем отображение ошибок
error_reporting(E_ALL);
ini_set('display_errors', 1);

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

// Отладочная информация
echo "Найденные версии: ";
print_r($versions);

// Если нет доступных версий, перенаправляем на 00
if (empty($versions)) {
    echo "Нет доступных версий, перенаправляем на 00";
    header('Location: ./00/');
    exit;
}

// Находим максимальную версию
$latestVersion = max($versions);
echo "Максимальная версия: " . $latestVersion;

// Форматируем номер версии с ведущим нулем
$latestVersionStr = str_pad($latestVersion, 2, '0', STR_PAD_LEFT);
echo "Форматированная версия: " . $latestVersionStr;

// Перенаправляем на последнюю версию
header('Location: ./' . $latestVersionStr . '/');
exit;
?> 