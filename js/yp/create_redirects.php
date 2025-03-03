<?php
// Включаем отображение ошибок
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Функция для получения списка версий
function getVersions() {
    $dir = __DIR__;
    $versions = [];
    
    // Получаем все директории в текущей папке
    if ($handle = opendir($dir)) {
        while (false !== ($entry = readdir($handle))) {
            if ($entry != "." && $entry != ".." && is_dir($dir . '/' . $entry)) {
                // Проверяем, что имя директории состоит только из цифр
                if (preg_match('/^\d+$/', $entry)) {
                    $versions[] = $entry;
                }
            }
        }
        closedir($handle);
    }
    
    return $versions;
}

// Получаем список версий
$versions = getVersions();

// Создаем файл index.html в каждой директории версии
foreach ($versions as $version) {
    $redirectFile = __DIR__ . '/' . $version . '/redirect.html';
    $indexFile = __DIR__ . '/' . $version . '/index.html';
    
    // Проверяем, существует ли уже файл index.html
    if (file_exists($indexFile)) {
        echo "Файл $indexFile уже существует. Пропускаем.<br>";
        continue;
    }
    
    // Создаем содержимое файла index.html
    $content = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting to Latest Version</title>
    <style>
        body {
            margin: 0;
            background: black;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: white;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            text-align: center;
        }
        .loader {
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top: 3px solid white;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 30px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
    <script>
        // Функция для получения последней версии
        async function getLatestVersion() {
            try {
                const response = await fetch('/js/yp/latest_version.php');
                if (!response.ok) {
                    throw new Error('Failed to fetch latest version');
                }
                const data = await response.json();
                return data.latest_version;
            } catch (error) {
                console.error('Error fetching latest version:', error);
                return '11'; // Возвращаем текущую версию в случае ошибки
            }
        }

        // Функция для редиректа
        async function redirect() {
            try {
                const latestVersion = await getLatestVersion();
                // Проверяем, находимся ли мы уже в актуальной версии
                const currentVersion = window.location.pathname.split('/').filter(Boolean).pop();
                if (currentVersion === latestVersion) {
                    // Если мы уже в актуальной версии, не делаем редирект
                    document.getElementById('redirect-message').innerHTML = 'You are already viewing the latest version.';
                    return;
                }
                window.location.href = `/js/yp/\${latestVersion}/`;
            } catch (error) {
                console.error('Error during redirect:', error);
                window.location.href = '/js/yp/11/'; // Редирект на текущую версию в случае ошибки
            }
        }

        // Запускаем редирект после загрузки страницы
        window.onload = function() {
            setTimeout(redirect, 1000); // Задержка в 1 секунду для отображения анимации
        }
    </script>
</head>
<body>
    <div class="container">
        <h2>Redirecting to Latest Version</h2>
        <p id="redirect-message">Please wait while we redirect you to the latest version...</p>
        <div class="loader"></div>
    </div>
</body>
</html>
HTML;
    
    // Записываем содержимое в файл
    if (file_put_contents($indexFile, $content)) {
        echo "Файл $indexFile успешно создан.<br>";
    } else {
        echo "Ошибка при создании файла $indexFile.<br>";
    }
}

echo "Готово!";
?> 