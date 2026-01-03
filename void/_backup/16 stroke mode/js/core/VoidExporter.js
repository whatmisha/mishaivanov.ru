/**
 * VoidExporter - экспорт шрифта Void в SVG
 */

import { getGlyph } from './VoidAlphabet.js';

export class VoidExporter {
    constructor(renderer, settings = null) {
        this.renderer = renderer;
        this.settings = settings;
        // Кэш для значений по типу модуля (для режима random byType)
        this.moduleTypeCache = {};
    }

    /**
     * Очистить кэш значений по типу модуля
     */
    clearModuleTypeCache() {
        this.moduleTypeCache = {};
    }

    /**
     * Получить случайные значения для модуля (с учетом режима рандома)
     */
    getRandomModuleValues(moduleType, params) {
        const stemMin = params.randomStemMin || 0.5;
        const stemMax = params.randomStemMax || 2.0;
        const strokesMin = params.randomStrokesMin || 1;
        const strokesMax = params.randomStrokesMax || 5;
        const contrastMin = params.randomContrastMin || 0.1;
        const contrastMax = params.randomContrastMax || 8.0;
        const randomModeType = params.randomModeType || 'byType';

        if (randomModeType === 'byType') {
            // Режим по типу модуля: генерируем значения один раз для каждого типа
            if (!this.moduleTypeCache[moduleType]) {
                const randomMultiplier = stemMin + Math.random() * (stemMax - stemMin);
                const stem = params.moduleSize * randomMultiplier * 2;
                const strokesNum = Math.floor(strokesMin + Math.random() * (strokesMax - strokesMin + 1));
                const strokeGapRatio = contrastMin + Math.random() * (contrastMax - contrastMin);
                
                this.moduleTypeCache[moduleType] = { stem, strokesNum, strokeGapRatio };
            }
            return this.moduleTypeCache[moduleType];
        } else {
            // Полный рандом: генерируем новые значения для каждого модуля
            const randomMultiplier = stemMin + Math.random() * (stemMax - stemMin);
            const stem = params.moduleSize * randomMultiplier * 2;
            const strokesNum = Math.floor(strokesMin + Math.random() * (strokesMax - strokesMin + 1));
            const strokeGapRatio = contrastMin + Math.random() * (contrastMax - contrastMin);
            
            return { stem, strokesNum, strokeGapRatio };
        }
    }

    /**
     * Получить SVG контент (без скачивания)
     */
    getSVGContent() {
        // НЕ очищаем кэш - используем те же значения, что были при рендеринге
        // this.clearModuleTypeCache();
        
        const params = this.renderer.params;
        // Получаем актуальное значение includeGridToExport из settings, если доступно
        if (this.settings) {
            params.includeGridToExport = this.settings.get('includeGridToExport') || false;
            // Также получаем renderMethod из settings, если он не установлен в params
            if (!params.renderMethod && this.settings.get('renderMethod')) {
                params.renderMethod = this.settings.get('renderMethod');
            }
        } else if (params.includeGridToExport === undefined) {
            params.includeGridToExport = false;
        }
        // Убедиться, что renderMethod установлен
        if (!params.renderMethod) {
            params.renderMethod = 'fill';
        }
        const text = params.text;
        
        if (!text) {
            return null;
        }

        const lines = text.split('\n');
        const letterW = this.renderer.cols * params.moduleSize;
        const letterH = this.renderer.rows * params.moduleSize;
        
        // Вычислить размеры контента с учетом разной ширины пробела
        let contentWidth = 0;
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                // Двойной пробел (и более) имеет ширину 5 модулей (3+2) без letter spacing между пробелами
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    // Если предыдущий символ тоже пробел, то этот пробел = 2 модуля и БЕЗ letter spacing перед ним
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * params.moduleSize;
                        addSpacing = false; // Не добавляем spacing между пробелами
                    } else {
                        charWidth = 3 * params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? params.letterSpacing : 0);
            }
            // Убрать последний отступ (если последний символ не пробел после пробела)
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= params.letterSpacing;
            }
            contentWidth = Math.max(contentWidth, lineWidth);
        }
        const contentHeight = lines.length * (letterH + params.lineHeight) - params.lineHeight;
        
        // Квадратный SVG: сторона = max(ширина, высота) + 2*moduleSize (по одному модулю с каждой стороны)
        const moduleSize = params.moduleSize;
        const maxDimension = Math.max(contentWidth, contentHeight);
        const svgSize = maxDimension + 2 * moduleSize;
        
        // Смещение контента для центрирования в квадрате
        const offsetX = (svgSize - contentWidth) / 2;
        const offsetY = (svgSize - contentHeight) / 2;
        
        // Создать SVG документ
        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
`;

        // Фон (всегда добавляем)
        svgContent += `  <g id="back">\n`;
        svgContent += `    <rect width="${svgSize}" height="${svgSize}" fill="${params.bgColor || '#000000'}"/>\n`;
        svgContent += `  </g>\n`;

        // Сетка (если включена для экспорта)
        if (params.includeGridToExport === true) {
            svgContent += this.renderGridToSVG(svgSize, svgSize, params, offsetX, offsetY);
        }

        // Группа для букв (используем цвет из настроек)
        // Для stroke method не устанавливаем fill на группе, чтобы stroke работал
        const renderMethod = params.renderMethod || 'fill';
        if (renderMethod === 'stroke') {
            svgContent += `  <g id="typo" stroke="${params.color || '#ffffff'}" fill="none">\n`;
        } else {
            svgContent += `  <g id="typo" fill="${params.color || '#ffffff'}">\n`;
        }

        // Отрисовать каждую строку
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            // Вычислить ширину строки с учетом разной ширины пробела
            let lineWidth = 0;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                // Двойной пробел (и более) имеет ширину 5 модулей (3+2) без letter spacing между пробелами
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    // Если предыдущий символ тоже пробел, то этот пробел = 2 модуля и БЕЗ letter spacing перед ним
                    if (i > 0 && line[i - 1] === ' ') {
                        charWidth = 2 * params.moduleSize;
                        addSpacing = false; // Не добавляем spacing между пробелами
                    } else {
                        charWidth = 3 * params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                lineWidth += charWidth + (addSpacing ? params.letterSpacing : 0);
            }
            // Убрать последний отступ (если последний символ не пробел после пробела)
            if (line.length > 0 && !(line[line.length - 1] === ' ' && line.length > 1 && line[line.length - 2] === ' ')) {
                lineWidth -= params.letterSpacing;
            }
            const lineX = (contentWidth - lineWidth) / 2;
            const lineY = lineIndex * (letterH + params.lineHeight);
            
            // Отрисовать каждую букву
            let currentX = offsetX + lineX;
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                // Двойной пробел (и более) имеет ширину 5 модулей (3+2) без letter spacing между пробелами
                let charWidth;
                let addSpacing = true;
                if (char === ' ') {
                    // Если предыдущий символ тоже пробел, то этот пробел = 2 модуля и БЕЗ letter spacing перед ним
                    if (charIndex > 0 && line[charIndex - 1] === ' ') {
                        charWidth = 2 * params.moduleSize;
                        addSpacing = false; // Не добавляем spacing между пробелами
                    } else {
                        charWidth = 3 * params.moduleSize;
                    }
                } else {
                    charWidth = letterW;
                }
                const y = offsetY + lineY;
                
                svgContent += this.renderLetterToSVG(char, currentX, y, params, lineIndex, charIndex);
                currentX += charWidth + (addSpacing ? params.letterSpacing : 0);
            }
        }

        svgContent += `  </g>\n`;
        svgContent += `</svg>`;

        return svgContent;
    }

    /**
     * Отрисовать сетку в SVG
     */
    renderGridToSVG(svgWidth, svgHeight, params, contentOffsetX = 0, contentOffsetY = 0) {
        const moduleSize = params.moduleSize;
        
        // Вычисляем offset для сетки - сетка должна быть кратна moduleSize
        // Используем смещение контента как базовую точку
        const offsetX = contentOffsetX % moduleSize;
        const offsetY = contentOffsetY % moduleSize;
        
        const gridColor = params.gridColor || '#333333';
        let gridSVG = `  <g id="grid" stroke="${gridColor}" stroke-width="0.5" opacity="1">\n`;
        
        // Вертикальные линии
        for (let x = offsetX; x <= svgWidth; x += moduleSize) {
            gridSVG += `    <line x1="${x}" y1="0" x2="${x}" y2="${svgHeight}"/>\n`;
        }
        
        // Горизонтальные линии
        for (let y = offsetY; y <= svgHeight; y += moduleSize) {
            gridSVG += `    <line x1="0" y1="${y}" x2="${svgWidth}" y2="${y}"/>\n`;
        }
        
        gridSVG += `  </g>\n`;
        return gridSVG;
    }

    /**
     * Экспорт текущего текста в SVG
     */
    exportToSVG() {
        const svgContent = this.getSVGContent();
        
        if (!svgContent) {
            alert('Введите текст для экспорта');
            return;
        }

        // Генерировать имя файла: void_sample_text_260101_184230.svg
        const text = this.renderer.params.text || '';
        // Берем первые 12 символов текста, заменяем пробелы и спецсимволы на подчеркивания
        const textPart = text.substring(0, 12)
            .replace(/[^a-zA-Z0-9]/g, '_')
            .toLowerCase()
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '') || 'text';
        
        // Дата и время
        const now = new Date();
        const year = now.getFullYear().toString().substring(2); // последние 2 цифры года
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const filename = `void_${textPart}_${year}${month}${day}_${hours}${minutes}${seconds}.svg`;

        // Скачать файл
        this.downloadSVG(svgContent, filename);
    }

    /**
     * Копировать SVG в буфер обмена
     */
    async copySVG() {
        const svgContent = this.getSVGContent();
        
        if (!svgContent) {
            alert('Введите текст для копирования');
            return;
        }

        try {
            await navigator.clipboard.writeText(svgContent);
            // Показать уведомление об успехе
            const btn = document.getElementById('copyBtn');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 1000);
        } catch (err) {
            console.error('Ошибка копирования:', err);
            alert('Не удалось скопировать в буфер обмена');
        }
    }

    /**
     * Отрисовать одну букву в SVG
     */
    renderLetterToSVG(char, x, y, params, lineIndex = null, charIndex = null) {
        const glyphCode = getGlyph(char);
        const moduleW = params.moduleSize;
        const moduleH = params.moduleSize;
        // Пробел имеет ширину 3 модуля (первый) или 2 модуля (второй и далее в последовательности)
        let letterCols;
        if (char === ' ') {
            // Нужно проверить предыдущий символ в строке
            const text = params.text || '';
            const lines = text.split('\n');
            if (lineIndex !== null && charIndex !== null && lineIndex < lines.length) {
                const line = lines[lineIndex];
                // Если предыдущий символ тоже пробел, то этот пробел = 2 модуля
                letterCols = (charIndex > 0 && line[charIndex - 1] === ' ') ? 2 : 3;
            } else {
                letterCols = 3; // По умолчанию 3 модуля
            }
        } else {
            letterCols = this.renderer.cols;
        }
        let svg = '';

        // Группа для буквы
        svg += `    <g>\n`;

        // Отрисовать каждый модуль в сетке 5×5 (или 3×5/2×5 для пробела)
        for (let i = 0; i < letterCols; i++) {
            for (let j = 0; j < this.renderer.rows; j++) {
                const index = (i + j * this.renderer.cols) * 2;
                const moduleType = glyphCode.charAt(index);
                const rotation = parseInt(glyphCode.charAt(index + 1));
                
                const moduleX = x + i * moduleW;
                const moduleY = y + j * moduleH;
                
                // Для random mode используем те же значения, что были при рендеринге
                let stem = params.stem;
                let strokesNum = params.strokesNum;
                let strokeGapRatio = params.strokeGapRatio || 1.0;
                
                if (params.mode === 'random') {
                    // Используем кэш из renderer вместо генерации новых значений
                    // Используем тот же ключ, что и при рендеринге (позиция в тексте + позиция в модуле)
                    const cacheKey = params.randomModeType === 'full' && lineIndex !== null && charIndex !== null
                        ? `${lineIndex}_${charIndex}_${i}_${j}` 
                        : null;
                    const randomValues = this.renderer.getRandomModuleValues(moduleType, cacheKey);
                    stem = randomValues.stem;
                    strokesNum = randomValues.strokesNum;
                    strokeGapRatio = randomValues.strokeGapRatio;
                }
                
                const moduleSVG = this.renderModuleToSVG(
                    moduleType, 
                    rotation, 
                    moduleX, 
                    moduleY, 
                    moduleW, 
                    moduleH, 
                    stem,
                    params.mode === 'random' ? 'stripes' : params.mode,
                    strokesNum,
                    strokeGapRatio,
                    params.cornerRadius || 0,
                    params.renderMethod || 'fill'
                );
                
                if (moduleSVG) {
                    svg += moduleSVG;
                }
            }
        }

        svg += `    </g>\n`;
        return svg;
    }

    /**
     * Отрисовать модуль в SVG
     */
    renderModuleToSVG(type, rotation, x, y, w, h, stem, mode, strokesNum, strokeGapRatio, cornerRadius = 0, renderMethod = 'fill') {
        if (type === 'E') return ''; // Empty

        const angle = rotation * 90;
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        let paths = '';

        if (renderMethod === 'stroke') {
            // Stroke method: используем stroke-версии методов
            if (mode === 'fill') {
                switch (type) {
                    case 'S':
                        paths = this.renderStraightSVGStroke(0, 0, w, h, stem, cornerRadius);
                        break;
                    case 'C':
                        paths = this.renderCentralSVGStroke(0, 0, w, h, stem, cornerRadius);
                        break;
                    case 'J':
                        paths = this.renderJointSVGStroke(0, 0, w, h, stem, cornerRadius);
                        break;
                    case 'L':
                        paths = this.renderLinkSVGStroke(0, 0, w, h, stem, cornerRadius);
                        break;
                    case 'R':
                        paths = this.renderRoundSVGStroke(0, 0, w, h, stem);
                        break;
                    case 'B':
                        paths = this.renderBendSVGStroke(0, 0, w, h, stem);
                        break;
                }
            } else {
                // Stripes mode для stroke
                switch (type) {
                    case 'S':
                        paths = this.renderStraightSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, cornerRadius);
                        break;
                    case 'C':
                        paths = this.renderCentralSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, cornerRadius);
                        break;
                    case 'J':
                        paths = this.renderJointSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, cornerRadius);
                        break;
                    case 'L':
                        paths = this.renderLinkSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, cornerRadius);
                        break;
                    case 'R':
                        paths = this.renderRoundSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio);
                        break;
                    case 'B':
                        paths = this.renderBendSVGStrokeStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio);
                        break;
                }
            }
        } else {
            // Fill method (оригинальный способ)
            if (mode === 'fill') {
                switch (type) {
                    case 'S':
                        paths = this.renderStraightSVG(0, 0, w, h, stem, cornerRadius);
                        break;
                    case 'C':
                        paths = this.renderCentralSVG(0, 0, w, h, stem, cornerRadius);
                        break;
                    case 'J':
                        paths = this.renderJointSVG(0, 0, w, h, stem, cornerRadius);
                        break;
                    case 'L':
                        paths = this.renderLinkSVG(0, 0, w, h, stem, cornerRadius);
                        break;
                    case 'R':
                        paths = this.renderRoundSVG(0, 0, w, h, stem);
                        break;
                    case 'B':
                        paths = this.renderBendSVG(0, 0, w, h, stem);
                        break;
                }
            } else {
                // Stripes mode
                switch (type) {
                    case 'S':
                        paths = this.renderStraightSVGStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, cornerRadius);
                        break;
                    case 'C':
                        paths = this.renderCentralSVGStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, cornerRadius);
                        break;
                    case 'J':
                        paths = this.renderJointSVGStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, cornerRadius);
                        break;
                    case 'L':
                        paths = this.renderLinkSVGStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio, cornerRadius);
                        break;
                    case 'R':
                        paths = this.renderRoundSVGStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio);
                        break;
                    case 'B':
                        paths = this.renderBendSVGStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio);
                        break;
                }
            }
        }

        if (!paths) return '';

        // Обернуть в группу с трансформацией
        return `      <g transform="translate(${centerX}, ${centerY}) rotate(${angle})">\n${paths}      </g>\n`;
    }

    /**
     * Создать SVG path для скругленного прямоугольника
     */
    createRoundedRectPath(x, y, width, height, radius) {
        if (radius <= 0) {
            return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
        }
        
        // Ограничиваем радиус половиной меньшей стороны
        const maxRadius = Math.min(width, height) / 2;
        const r = Math.min(radius, maxRadius);
        
        let path = `M ${x + r} ${y} `;
        path += `L ${x + width - r} ${y} `;
        path += `Q ${x + width} ${y} ${x + width} ${y + r} `;
        path += `L ${x + width} ${y + height - r} `;
        path += `Q ${x + width} ${y + height} ${x + width - r} ${y + height} `;
        path += `L ${x + r} ${y + height} `;
        path += `Q ${x} ${y + height} ${x} ${y + height - r} `;
        path += `L ${x} ${y + r} `;
        path += `Q ${x} ${y} ${x + r} ${y} Z`;
        
        return path;
    }

    renderStraightSVG(x, y, w, h, stem, cornerRadius = 0) {
        const path = this.createRoundedRectPath(-w/2, -h/2, stem/2, h, cornerRadius);
        return `        <path d="${path}"/>\n`;
    }

    renderCentralSVG(x, y, w, h, stem, cornerRadius = 0) {
        const path = this.createRoundedRectPath(-stem/4, -h/2, stem/2, h, cornerRadius);
        return `        <path d="${path}"/>\n`;
    }

    renderJointSVG(x, y, w, h, stem, cornerRadius = 0) {
        let svg = '';
        const path1 = this.createRoundedRectPath(-w/2, -h/2, stem/2, h, cornerRadius);
        const path2 = this.createRoundedRectPath(-w/2, -stem/4, w, stem/2, cornerRadius);
        svg += `        <path d="${path1}"/>\n`;
        svg += `        <path d="${path2}"/>\n`;
        return svg;
    }

    renderLinkSVG(x, y, w, h, stem, cornerRadius = 0) {
        let svg = '';
        const path1 = this.createRoundedRectPath(-w/2, -h/2, stem/2, h, cornerRadius);
        const path2 = this.createRoundedRectPath(-w/2, h/2 - stem/2, w, stem/2, cornerRadius);
        svg += `        <path d="${path1}"/>\n`;
        svg += `        <path d="${path2}"/>\n`;
        return svg;
    }

    renderRoundSVG(x, y, w, h, stem) {
        const outerRadius = w;
        const innerRadius = w - stem / 2;
        
        // SVG path для кольцевого сектора
        const startAngle = Math.PI / 2;
        const endAngle = Math.PI;
        
        const x1 = w/2 + outerRadius * Math.cos(startAngle);
        const y1 = -h/2 + outerRadius * Math.sin(startAngle);
        const x2 = w/2 + outerRadius * Math.cos(endAngle);
        const y2 = -h/2 + outerRadius * Math.sin(endAngle);
        
        const x3 = w/2 + innerRadius * Math.cos(endAngle);
        const y3 = -h/2 + innerRadius * Math.sin(endAngle);
        const x4 = w/2 + innerRadius * Math.cos(startAngle);
        const y4 = -h/2 + innerRadius * Math.sin(startAngle);
        
        let path = `M ${x1} ${y1} `;
        path += `A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2} `;
        path += `L ${x3} ${y3} `;
        path += `A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4} `;
        path += `Z`;
        
        return `        <path d="${path}"/>\n`;
    }

    renderBendSVG(x, y, w, h, stem) {
        const radius = stem / 2;
        
        const startAngle = Math.PI / 2;
        const endAngle = Math.PI;
        
        const x1 = w/2 + radius * Math.cos(startAngle);
        const y1 = -h/2 + radius * Math.sin(startAngle);
        const x2 = w/2 + radius * Math.cos(endAngle);
        const y2 = -h/2 + radius * Math.sin(endAngle);
        
        let path = `M ${x1} ${y1} `;
        path += `A ${radius} ${radius} 0 0 1 ${x2} ${y2} `;
        path += `L ${w/2} ${-h/2} `;
        path += `Z`;
        
        return `        <path d="${path}"/>\n`;
    }

    // ========== STRIPES MODE METHODS ==========

    /**
     * Вычислить gap и strokeWidth на основе общей ширины
     * @param {number} totalWidth - общая ширина для размещения штрихов
     * @param {number} strokesNum - количество штрихов
     * @param {number} strokeGapRatio - отношение толщины штриха к промежутку
     * @returns {Object} {gap, strokeWidth}
     */
    calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio) {
        // gap = totalWidth / (strokesNum * (strokeGapRatio + 1) - 1)
        const gap = totalWidth / (strokesNum * (strokeGapRatio + 1) - 1);
        const strokeWidth = gap * strokeGapRatio;
        return { gap, strokeWidth };
    }

    renderStraightSVGStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, cornerRadius = 0) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        let shift = 0;
        let svg = '';
        
        for (let i = 0; i < strokesNum; i++) {
            const path = this.createRoundedRectPath(shift - w/2, -h/2, strokeWidth, h, cornerRadius);
            svg += `        <path d="${path}"/>\n`;
            shift += strokeWidth + gap;
        }
        
        return svg;
    }

    renderCentralSVGStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, cornerRadius = 0) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const lineWidth = (strokesNum * strokeWidth) + ((strokesNum - 1) * gap);
        let shift = -lineWidth / 2;
        let svg = '';
        
        for (let i = 0; i < strokesNum; i++) {
            const path = this.createRoundedRectPath(shift, -h/2, strokeWidth, h, cornerRadius);
            svg += `        <path d="${path}"/>\n`;
            shift += strokeWidth + gap;
        }
        
        return svg;
    }

    renderJointSVGStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, cornerRadius = 0) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        let svg = '';
        
        // Вертикальные полоски
        let shift = 0;
        for (let i = 0; i < strokesNum; i++) {
            const path = this.createRoundedRectPath(shift - w/2, -h/2, strokeWidth, h, cornerRadius);
            svg += `        <path d="${path}"/>\n`;
            shift += strokeWidth + gap;
        }
        
        // Горизонтальные полоски
        const lineWidth = (strokesNum * strokeWidth) + ((strokesNum - 1) * gap);
        shift = -lineWidth / 2;
        for (let i = 0; i < strokesNum; i++) {
            const path = this.createRoundedRectPath(-w/2, shift, w, strokeWidth, cornerRadius);
            svg += `        <path d="${path}"/>\n`;
            shift += strokeWidth + gap;
        }
        
        return svg;
    }

    renderLinkSVGStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, cornerRadius = 0) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        let svg = '';
        
        // Вертикальные полоски
        let shift = 0;
        for (let i = 0; i < strokesNum; i++) {
            const path = this.createRoundedRectPath(shift - w/2, -h/2, strokeWidth, h, cornerRadius);
            svg += `        <path d="${path}"/>\n`;
            shift += strokeWidth + gap;
        }
        
        // Горизонтальные полоски (снизу)
        shift = h / 2 - stem / 2;
        for (let i = 0; i < strokesNum; i++) {
            const path = this.createRoundedRectPath(-w/2, shift, w, strokeWidth, cornerRadius);
            svg += `        <path d="${path}"/>\n`;
            shift += strokeWidth + gap;
        }
        
        return svg;
    }

    renderRoundSVGStripes(x, y, w, h, stem, strokesNum, strokeGapRatio) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        let shift = 0;
        let svg = '';
        
        for (let j = 0; j < strokesNum; j++) {
            const R1 = w - shift;
            const R2 = R1 - strokeWidth;
            
            if (R2 > 0) {
                const startAngle = Math.PI / 2;
                const endAngle = Math.PI;
                
                const x1 = w/2 + R1 * Math.cos(startAngle);
                const y1 = -h/2 + R1 * Math.sin(startAngle);
                const x2 = w/2 + R1 * Math.cos(endAngle);
                const y2 = -h/2 + R1 * Math.sin(endAngle);
                
                const x3 = w/2 + R2 * Math.cos(endAngle);
                const y3 = -h/2 + R2 * Math.sin(endAngle);
                const x4 = w/2 + R2 * Math.cos(startAngle);
                const y4 = -h/2 + R2 * Math.sin(startAngle);
                
                let path = `M ${x1} ${y1} `;
                path += `A ${R1} ${R1} 0 0 1 ${x2} ${y2} `;
                path += `L ${x3} ${y3} `;
                path += `A ${R2} ${R2} 0 0 0 ${x4} ${y4} `;
                path += `Z`;
                
                svg += `        <path d="${path}"/>\n`;
            }
            
            shift += strokeWidth + gap;
        }
        
        return svg;
    }

    renderBendSVGStripes(x, y, w, h, stem, strokesNum, strokeGapRatio) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        let shift = 0;
        let svg = '';
        
        for (let j = 0; j < strokesNum; j++) {
            const R1 = stem / 2 - shift;
            const R2 = R1 - strokeWidth;
            
            if (R2 >= 0 && R1 > 0) {
                const startAngle = Math.PI / 2;
                const endAngle = Math.PI;
                
                const x1 = w/2 + R1 * Math.cos(startAngle);
                const y1 = -h/2 + R1 * Math.sin(startAngle);
                const x2 = w/2 + R1 * Math.cos(endAngle);
                const y2 = -h/2 + R1 * Math.sin(endAngle);
                
                let path = `M ${x1} ${y1} `;
                path += `A ${R1} ${R1} 0 0 1 ${x2} ${y2} `;
                
                if (R2 > 0) {
                    const x3 = w/2 + R2 * Math.cos(endAngle);
                    const y3 = -h/2 + R2 * Math.sin(endAngle);
                    const x4 = w/2 + R2 * Math.cos(startAngle);
                    const y4 = -h/2 + R2 * Math.sin(startAngle);
                    
                    path += `L ${x3} ${y3} `;
                    path += `A ${R2} ${R2} 0 0 0 ${x4} ${y4} `;
                } else {
                    path += `L ${w/2} ${-h/2} `;
                }
                
                path += `Z`;
                
                svg += `        <path d="${path}"/>\n`;
            }
            
            shift += strokeWidth + gap;
        }
        
        return svg;
    }

    // ============================================
    // STROKE METHOD SVG RENDERING
    // ============================================

    /**
     * S — Straight: вертикальная линия слева (stroke)
     */
    renderStraightSVGStroke(x, y, w, h, stem, cornerRadius = 0) {
        const lineX = -w / 2 + stem / 4;
        const lineWidth = stem / 2;
        const lineCap = cornerRadius > 0 ? 'round' : 'butt';
        return `        <line x1="${lineX}" y1="${-h/2}" x2="${lineX}" y2="${h/2}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}"/>\n`;
    }

    /**
     * C — Central: вертикальная линия по центру (stroke)
     */
    renderCentralSVGStroke(x, y, w, h, stem, cornerRadius = 0) {
        const lineX = 0;
        const lineWidth = stem / 2;
        const lineCap = cornerRadius > 0 ? 'round' : 'butt';
        return `        <line x1="${lineX}" y1="${-h/2}" x2="${lineX}" y2="${h/2}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}"/>\n`;
    }

    /**
     * J — Joint: Т-образное соединение (stroke)
     */
    renderJointSVGStroke(x, y, w, h, stem, cornerRadius = 0) {
        const vertLineX = -w / 2 + stem / 4;
        const horizLineY = 0;
        const lineWidth = stem / 2;
        const lineCap = cornerRadius > 0 ? 'round' : 'butt';
        const lineJoin = cornerRadius > 0 ? 'round' : 'miter';
        let svg = '';
        svg += `        <line x1="${vertLineX}" y1="${-h/2}" x2="${vertLineX}" y2="${h/2}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}"/>\n`;
        svg += `        <line x1="${-w/2}" y1="${horizLineY}" x2="${w/2}" y2="${horizLineY}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}"/>\n`;
        return svg;
    }

    /**
     * L — Link/Corner: L-образное соединение (stroke)
     */
    renderLinkSVGStroke(x, y, w, h, stem, cornerRadius = 0) {
        const vertLineX = -w / 2 + stem / 4;
        const horizLineY = h / 2 - stem / 4;
        const lineWidth = stem / 2;
        const lineCap = cornerRadius > 0 ? 'round' : 'butt';
        const lineJoin = cornerRadius > 0 ? 'round' : 'miter';
        // Рисуем L-образное соединение одним путем
        const path = `M ${vertLineX} ${-h/2} L ${vertLineX} ${horizLineY} L ${w/2} ${horizLineY}`;
        return `        <path d="${path}" stroke-width="${lineWidth}" stroke-linecap="${lineCap}" stroke-linejoin="${lineJoin}" fill="none"/>\n`;
    }

    /**
     * R — Round: плавная дуга (stroke)
     */
    renderRoundSVGStroke(x, y, w, h, stem) {
        const arcRadius = w - stem / 4;
        const centerX = w / 2;
        const centerY = -h / 2;
        const startAngle = Math.PI / 2;
        const endAngle = Math.PI;
        
        // SVG arc: M startX startY A rx ry x-axis-rotation large-arc-flag sweep-flag endX endY
        const startX = centerX + arcRadius * Math.cos(startAngle);
        const startY = centerY + arcRadius * Math.sin(startAngle);
        const endX = centerX + arcRadius * Math.cos(endAngle);
        const endY = centerY + arcRadius * Math.sin(endAngle);
        
        const lineWidth = stem / 2;
        const path = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
        return `        <path d="${path}" stroke-width="${lineWidth}" stroke-linecap="butt" fill="none"/>\n`;
    }

    /**
     * B — Bend: крутая дуга (stroke)
     */
    renderBendSVGStroke(x, y, w, h, stem) {
        const arcRadius = stem / 4;
        const centerX = w / 2;
        const centerY = -h / 2;
        const startAngle = Math.PI / 2;
        const endAngle = Math.PI;
        
        const startX = centerX + arcRadius * Math.cos(startAngle);
        const startY = centerY + arcRadius * Math.sin(startAngle);
        const endX = centerX + arcRadius * Math.cos(endAngle);
        const endY = centerY + arcRadius * Math.sin(endAngle);
        
        const lineWidth = stem / 2;
        const path = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
        return `        <path d="${path}" stroke-width="${lineWidth}" stroke-linecap="butt" fill="none"/>\n`;
    }

    // Stripes mode для stroke

    /**
     * S — Straight: несколько параллельных линий (stroke stripes)
     */
    renderStraightSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, cornerRadius = 0) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const startX = -w / 2 + strokeWidth / 2;
        const lineCap = cornerRadius > 0 ? 'round' : 'butt';
        let svg = '';
        
        for (let i = 0; i < strokesNum; i++) {
            const lineX = startX + i * (strokeWidth + gap);
            svg += `        <line x1="${lineX}" y1="${-h/2}" x2="${lineX}" y2="${h/2}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        return svg;
    }

    /**
     * C — Central: несколько параллельных линий по центру (stroke stripes)
     */
    renderCentralSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, cornerRadius = 0) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const totalLineWidth = (strokesNum * strokeWidth) + ((strokesNum - 1) * gap);
        const startX = -totalLineWidth / 2 + strokeWidth / 2;
        const lineCap = cornerRadius > 0 ? 'round' : 'butt';
        let svg = '';
        
        for (let i = 0; i < strokesNum; i++) {
            const lineX = startX + i * (strokeWidth + gap);
            svg += `        <line x1="${lineX}" y1="${-h/2}" x2="${lineX}" y2="${h/2}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        return svg;
    }

    /**
     * J — Joint: несколько параллельных линий для каждой части (stroke stripes)
     */
    renderJointSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, cornerRadius = 0) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const lineCap = cornerRadius > 0 ? 'round' : 'butt';
        let svg = '';
        
        // Вертикальные линии
        const vertStartX = -w / 2 + strokeWidth / 2;
        for (let i = 0; i < strokesNum; i++) {
            const lineX = vertStartX + i * (strokeWidth + gap);
            svg += `        <line x1="${lineX}" y1="${-h/2}" x2="${lineX}" y2="${h/2}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        // Горизонтальные линии
        const totalLineWidth = (strokesNum * strokeWidth) + ((strokesNum - 1) * gap);
        const horizStartY = -totalLineWidth / 2 + strokeWidth / 2;
        for (let i = 0; i < strokesNum; i++) {
            const lineY = horizStartY + i * (strokeWidth + gap);
            svg += `        <line x1="${-w/2}" y1="${lineY}" x2="${w/2}" y2="${lineY}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        return svg;
    }

    /**
     * L — Link: несколько параллельных линий для каждой части (stroke stripes)
     */
    renderLinkSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio, cornerRadius = 0) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const lineCap = cornerRadius > 0 ? 'round' : 'butt';
        let svg = '';
        
        // Вертикальные линии (до самого низа)
        const vertStartX = -w / 2 + strokeWidth / 2;
        for (let i = 0; i < strokesNum; i++) {
            const lineX = vertStartX + i * (strokeWidth + gap);
            svg += `        <line x1="${lineX}" y1="${-h/2}" x2="${lineX}" y2="${h/2}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        // Горизонтальные линии снизу
        const horizStartY = h / 2 - stem / 2 + strokeWidth / 2;
        for (let i = 0; i < strokesNum; i++) {
            const lineY = horizStartY + i * (strokeWidth + gap);
            svg += `        <line x1="${-w/2}" y1="${lineY}" x2="${w/2}" y2="${lineY}" stroke-width="${strokeWidth}" stroke-linecap="${lineCap}"/>\n`;
        }
        
        return svg;
    }

    /**
     * R — Round: несколько концентрических дуг (stroke stripes)
     */
    renderRoundSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const outerRadius = w - strokeWidth / 2;
        const centerX = w / 2;
        const centerY = -h / 2;
        const startAngle = Math.PI / 2;
        const endAngle = Math.PI;
        let svg = '';
        
        for (let j = 0; j < strokesNum; j++) {
            const arcRadius = outerRadius - j * (strokeWidth + gap);
            if (arcRadius > 0) {
                const startX = centerX + arcRadius * Math.cos(startAngle);
                const startY = centerY + arcRadius * Math.sin(startAngle);
                const endX = centerX + arcRadius * Math.cos(endAngle);
                const endY = centerY + arcRadius * Math.sin(endAngle);
                
                const path = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
                svg += `        <path d="${path}" stroke-width="${strokeWidth}" stroke-linecap="butt" fill="none"/>\n`;
            }
        }
        
        return svg;
    }

    /**
     * B — Bend: несколько концентрических дуг (stroke stripes)
     */
    renderBendSVGStrokeStripes(x, y, w, h, stem, strokesNum, strokeGapRatio) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const outerRadius = stem / 2 - strokeWidth / 2;
        const centerX = w / 2;
        const centerY = -h / 2;
        const startAngle = Math.PI / 2;
        const endAngle = Math.PI;
        let svg = '';
        
        for (let j = 0; j < strokesNum; j++) {
            const arcRadius = outerRadius - j * (strokeWidth + gap);
            if (arcRadius > 0) {
                const startX = centerX + arcRadius * Math.cos(startAngle);
                const startY = centerY + arcRadius * Math.sin(startAngle);
                const endX = centerX + arcRadius * Math.cos(endAngle);
                const endY = centerY + arcRadius * Math.sin(endAngle);
                
                const path = `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
                svg += `        <path d="${path}" stroke-width="${strokeWidth}" stroke-linecap="butt" fill="none"/>\n`;
            }
        }
        
        return svg;
    }

    /**
     * Скачать SVG файл
     */
    downloadSVG(content, filename) {
        const blob = new Blob([content], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

