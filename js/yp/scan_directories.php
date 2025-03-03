<?php
// Устанавливаем заголовок для JSON
header('Content-Type: application/json');

// Получаем список директорий
$dirs = glob('./*', GLOB_ONLYDIR);

// Преобразуем пути в имена директорий
$dirNames = array_map('basename', $dirs);

// Возвращаем список директорий в формате JSON
echo json_encode($dirNames);
?> 