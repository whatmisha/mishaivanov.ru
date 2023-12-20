<?php
$dir = new DirectoryIterator(dirname(__FILE__));
foreach ($dir as $fileinfo) {
    if ($fileinfo->isDir() && !$fileinfo->isDot()) {
        $dirname = $fileinfo->getFilename();
        // Проверяем, существует ли файл index.html в подпапке
        if (file_exists($dirname . "/index.html")) {
            echo "<a href='$dirname/index.html'>$dirname</a><br>";
        }
    }
}
?>
