/**
 * VoidExporter - экспорт шрифта Void в SVG
 */

import { getGlyph } from './VoidAlphabet.js';

export class VoidExporter {
    constructor(renderer) {
        this.renderer = renderer;
    }

    /**
     * Экспорт текущего текста в SVG
     */
    exportToSVG() {
        const params = this.renderer.params;
        const text = params.text;
        
        if (!text) {
            alert('Введите текст для экспорта');
            return;
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

        // Скачать файл
        this.downloadSVG(svgContent, 'void-typeface.svg');
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
                
                const moduleSVG = this.renderModuleToSVG(
                    moduleType, 
                    rotation, 
                    moduleX, 
                    moduleY, 
                    moduleW, 
                    moduleH, 
                    params.stem,
                    params.mode,
                    params.strokesNum
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
    renderModuleToSVG(type, rotation, x, y, w, h, stem, mode, strokesNum) {
        if (type === 'E') return ''; // Empty

        const angle = rotation * 90;
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        let paths = '';

        // Для простоты реализуем только Fill mode в первой версии
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

