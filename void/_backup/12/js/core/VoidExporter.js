/**
 * VoidExporter - экспорт шрифта Void в SVG
 */

import { getGlyph } from './VoidAlphabet.js';

export class VoidExporter {
    constructor(renderer) {
        this.renderer = renderer;
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
        const text = params.text;
        
        if (!text) {
            return null;
        }

        const lines = text.split('\n');
        const letterW = this.renderer.cols * params.moduleSize;
        const letterH = this.renderer.rows * params.moduleSize;
        
        // Вычислить размеры SVG
        const maxLineLength = Math.max(...lines.map(line => line.length));
        const svgWidth = maxLineLength * (letterW + params.letterSpacing) - params.letterSpacing;
        const svgHeight = lines.length * (letterH + params.lineHeight) - params.lineHeight;
        
        // Создать SVG документ
        let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">
`;

        // Фон (опционально)
        if (params.bgColor !== '#000000') {
            svgContent += `  <rect width="${svgWidth}" height="${svgHeight}" fill="${params.bgColor}"/>\n`;
        }

        // Группа для букв (всегда черный цвет при экспорте)
        svgContent += `  <g fill="#000000">\n`;

        // Отрисовать каждую строку
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const lineWidth = line.length * (letterW + params.letterSpacing) - params.letterSpacing;
            const lineX = (svgWidth - lineWidth) / 2;
            const lineY = lineIndex * (letterH + params.lineHeight);
            
            // Отрисовать каждую букву
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                const x = lineX + charIndex * (letterW + params.letterSpacing);
                
                svgContent += this.renderLetterToSVG(char, x, lineY, params, lineIndex, charIndex);
            }
        }

        svgContent += `  </g>\n`;
        svgContent += `</svg>`;

        return svgContent;
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

        // Скачать файл
        this.downloadSVG(svgContent, 'void-typeface.svg');
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
        let svg = '';

        // Группа для буквы
        svg += `    <g>\n`;

        // Отрисовать каждый модуль
        for (let i = 0; i < this.renderer.cols; i++) {
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
                    params.cornerRadius || 0
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
    renderModuleToSVG(type, rotation, x, y, w, h, stem, mode, strokesNum, strokeGapRatio, cornerRadius = 0) {
        if (type === 'E') return ''; // Empty

        const angle = rotation * 90;
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        let paths = '';

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

