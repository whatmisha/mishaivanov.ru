<?php
// Включаем отображение ошибок
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Проверяем, что запрос идет именно к этому файлу
echo "<h1>Test Redirect</h1>";
echo "<p>Если вы видите это сообщение, значит редирект не сработал.</p>";

// Выводим информацию о запросе
echo "<h2>Информация о запросе:</h2>";
echo "<pre>";
echo "REQUEST_URI: " . $_SERVER['REQUEST_URI'] . "\n";
echo "SCRIPT_NAME: " . $_SERVER['SCRIPT_NAME'] . "\n";
echo "DOCUMENT_ROOT: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "SERVER_NAME: " . $_SERVER['SERVER_NAME'] . "\n";
echo "</pre>";

// Выводим список директорий
echo "<h2>Список директорий в js/yp:</h2>";
echo "<pre>";
$dirs = scandir(__DIR__);
print_r($dirs);
echo "</pre>";
?> 