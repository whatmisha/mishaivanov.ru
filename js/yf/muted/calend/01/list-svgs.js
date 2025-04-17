// Функция для получения списка файлов из папки source
async function getSvgFiles() {
    const result = {
        success: true,
        files: []
    };
    
    try {
        // Список SVG-файлов календаря
        const files = [
            { file: 'calend_01.svg', path: 'source/calend_01.svg', name: 'calend_01' },
            { file: 'calend_02.svg', path: 'source/calend_02.svg', name: 'calend_02' },
            { file: 'calend_03.svg', path: 'source/calend_03.svg', name: 'calend_03' },
            { file: 'calend_04.svg', path: 'source/calend_04.svg', name: 'calend_04' },
            { file: 'calend_05.svg', path: 'source/calend_05.svg', name: 'calend_05' }
        ];
        
        result.files = files;
    } catch (error) {
        result.success = false;
        result.error = error.message;
    }
    
    return result;
} 