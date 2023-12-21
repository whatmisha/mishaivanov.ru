function adjustHeaderFontSize() {
    var h1 = document.querySelector('h1');
    var viewportWidth = window.innerWidth;
    var fontSize = viewportWidth * 0.1; // You might need to adjust this ratio

    h1.style.fontSize = `${fontSize}px`;
}

// Adjust the font size when the script loads and when the window is resized.
adjustHeaderFontSize();
window.onresize = adjustHeaderFontSize;
