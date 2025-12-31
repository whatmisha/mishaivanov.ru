/**
 * VoidExporter - экспорт шрифта Void в SVG
 */

import { getGlyph } from './VoidAlphabet.js';

export class VoidExporter {
    constructor(renderer) {
        this.renderer = renderer;
    }

    /**
     * Получить SVG контент (без скачивания)
     */
    getSVGContent() {
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
                
                svgContent += this.renderLetterToSVG(char, x, lineY, params);
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
    renderLetterToSVG(char, x, y, params) {
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
                
                // Для random mode генерируем случайные значения для каждого модуля
                let stem = params.stem;
                let strokesNum = params.strokesNum;
                
                if (params.mode === 'random') {
                    // Случайная толщина в пределах min-max от базовой
                    const stemMin = params.randomStemMin || 0.5;
                    const stemMax = params.randomStemMax || 2.0;
                    stem = params.stem * (stemMin + Math.random() * (stemMax - stemMin));
                    
                    // Случайное количество полосок в пределах min-max
                    const strokesMin = params.randomStrokesMin || 1;
                    const strokesMax = params.randomStrokesMax || 5;
                    strokesNum = Math.floor(strokesMin + Math.random() * (strokesMax - strokesMin + 1));
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
                    params.strokeGapRatio || 1.0
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
    renderModuleToSVG(type, rotation, x, y, w, h, stem, mode, strokesNum, strokeGapRatio) {
        if (type === 'E') return ''; // Empty

        const angle = rotation * 90;
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        let paths = '';

        if (mode === 'fill') {
            switch (type) {
                case 'S':
                    paths = this.renderStraightSVG(0, 0, w, h, stem);
                    break;
                case 'C':
                    paths = this.renderCentralSVG(0, 0, w, h, stem);
                    break;
                case 'J':
                    paths = this.renderJointSVG(0, 0, w, h, stem);
                    break;
                case 'L':
                    paths = this.renderLinkSVG(0, 0, w, h, stem);
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
                    paths = this.renderStraightSVGStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio);
                    break;
                case 'C':
                    paths = this.renderCentralSVGStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio);
                    break;
                case 'J':
                    paths = this.renderJointSVGStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio);
                    break;
                case 'L':
                    paths = this.renderLinkSVGStripes(0, 0, w, h, stem, strokesNum, strokeGapRatio);
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

    renderStraightSVG(x, y, w, h, stem) {
        return `        <rect x="${-w/2}" y="${-h/2}" width="${stem/2}" height="${h}"/>\n`;
    }

    renderCentralSVG(x, y, w, h, stem) {
        return `        <rect x="${-stem/4}" y="${-h/2}" width="${stem/2}" height="${h}"/>\n`;
    }

    renderJointSVG(x, y, w, h, stem) {
        let svg = '';
        svg += `        <rect x="${-w/2}" y="${-h/2}" width="${stem/2}" height="${h}"/>\n`;
        svg += `        <rect x="${-w/2}" y="${-stem/4}" width="${w}" height="${stem/2}"/>\n`;
        return svg;
    }

    renderLinkSVG(x, y, w, h, stem) {
        let svg = '';
        svg += `        <rect x="${-w/2}" y="${-h/2}" width="${stem/2}" height="${h}"/>\n`;
        svg += `        <rect x="${-w/2}" y="${h/2 - stem/2}" width="${w}" height="${stem/2}"/>\n`;
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

    renderStraightSVGStripes(x, y, w, h, stem, strokesNum, strokeGapRatio) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        let shift = 0;
        let svg = '';
        
        for (let i = 0; i < strokesNum; i++) {
            svg += `        <rect x="${shift - w/2}" y="${-h/2}" width="${strokeWidth}" height="${h}"/>\n`;
            shift += strokeWidth + gap;
        }
        
        return svg;
    }

    renderCentralSVGStripes(x, y, w, h, stem, strokesNum, strokeGapRatio) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        const lineWidth = (strokesNum * strokeWidth) + ((strokesNum - 1) * gap);
        let shift = -lineWidth / 2;
        let svg = '';
        
        for (let i = 0; i < strokesNum; i++) {
            svg += `        <rect x="${shift}" y="${-h/2}" width="${strokeWidth}" height="${h}"/>\n`;
            shift += strokeWidth + gap;
        }
        
        return svg;
    }

    renderJointSVGStripes(x, y, w, h, stem, strokesNum, strokeGapRatio) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        let svg = '';
        
        // Вертикальные полоски
        let shift = 0;
        for (let i = 0; i < strokesNum; i++) {
            svg += `        <rect x="${shift - w/2}" y="${-h/2}" width="${strokeWidth}" height="${h}"/>\n`;
            shift += strokeWidth + gap;
        }
        
        // Горизонтальные полоски
        const lineWidth = (strokesNum * strokeWidth) + ((strokesNum - 1) * gap);
        shift = -lineWidth / 2;
        for (let i = 0; i < strokesNum; i++) {
            svg += `        <rect x="${-w/2}" y="${shift}" width="${w}" height="${strokeWidth}"/>\n`;
            shift += strokeWidth + gap;
        }
        
        return svg;
    }

    renderLinkSVGStripes(x, y, w, h, stem, strokesNum, strokeGapRatio) {
        const totalWidth = stem / 2;
        const { gap, strokeWidth } = this.calculateGapAndStrokeWidth(totalWidth, strokesNum, strokeGapRatio);
        let svg = '';
        
        // Вертикальные полоски
        let shift = 0;
        for (let i = 0; i < strokesNum; i++) {
            svg += `        <rect x="${shift - w/2}" y="${-h/2}" width="${strokeWidth}" height="${h}"/>\n`;
            shift += strokeWidth + gap;
        }
        
        // Горизонтальные полоски (снизу)
        shift = h / 2 - stem / 2;
        for (let i = 0; i < strokesNum; i++) {
            svg += `        <rect x="${-w/2}" y="${shift}" width="${w}" height="${strokeWidth}"/>\n`;
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

