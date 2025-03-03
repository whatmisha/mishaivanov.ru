<?php
// Получаем список всех директорий с версиями
$versions = [];
$dir = __DIR__;

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

// Сортируем версии по убыванию (от новых к старым)
rsort($versions);

// Определяем актуальную версию (максимальную)
$latestVersion = !empty($versions) ? max($versions) : 0;

// Форматируем версии с ведущими нулями
$formattedVersions = [];
foreach ($versions as $version) {
    $formattedVersions[] = [
        'number' => $version,
        'formatted' => str_pad($version, 2, '0', STR_PAD_LEFT)
    ];
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Меню версий</title>
    <style>
        body {
            margin: 0;
            background: black;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 40px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        h1 {
            font-size: 32px;
            margin-bottom: 20px;
        }

        ul {
            list-style-type: none;
            padding: 0;
        }

        li {
            margin-bottom: 10px;
        }

        a {
            color: white;
            text-decoration: none;
            font-size: 18px;
            display: inline-block;
            padding: 10px 15px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 5px;
            transition: all 0.3s ease;
        }

        a:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: white;
        }

        .current {
            border-color: white;
            background: rgba(255, 255, 255, 0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Меню версий</h1>
        <p>Выберите версию проекта:</p>
        <ul>
            <?php if (empty($formattedVersions)): ?>
                <li>Нет доступных версий</li>
            <?php else: ?>
                <?php foreach ($formattedVersions as $version): ?>
                    <li>
                        <a href="./<?php echo $version['formatted']; ?>/" <?php echo ($version['number'] === $latestVersion) ? 'class="current"' : ''; ?>>
                            Версия <?php echo $version['formatted']; ?>
                            <?php if ($version['number'] === $latestVersion): ?> (актуальная)<?php endif; ?>
                        </a>
                    </li>
                <?php endforeach; ?>
            <?php endif; ?>
        </ul>
    </div>
</body>
</html> 