<?php
// Включаем отображение ошибок
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Функция для получения последней версии
function getLatestVersion() {
    $dir = __DIR__;
    $versions = [];
    
    // Получаем все директории в текущей папке
    if ($handle = opendir($dir)) {
        while (false !== ($entry = readdir($handle))) {
            if ($entry != "." && $entry != ".." && is_dir($dir . '/' . $entry)) {
                // Проверяем, что имя директории состоит только из цифр
                if (preg_match('/^\d+$/', $entry)) {
                    $versions[] = intval($entry);
                }
            }
        }
        closedir($handle);
    }
    
    // Если нет доступных версий, возвращаем 00
    if (empty($versions)) {
        return "00";
    }
    
    // Находим максимальную версию
    $latestVersion = max($versions);
    
    // Форматируем номер версии с ведущим нулем
    return str_pad($latestVersion, 2, '0', STR_PAD_LEFT);
}

// Получаем последнюю версию
$latestVersion = getLatestVersion();

// Формируем URL для редиректа
$redirectUrl = './' . $latestVersion . '/';

// Выполняем редирект
header('Location: ' . $redirectUrl);
exit;
?> 