function setup() {
    createCanvas(400, 400);
    background(0);
    drawBezierCircle(200, 200, 15); // Центр круга (200, 200) и радиус 15
}

function drawBezierCircle(cx, cy, r) {
    const handleLength = r * 0.552284749831;

    fill(255);
    noStroke();
    beginShape();
    // Верхняя правая часть
    vertex(cx, cy - r);
    bezierVertex(cx + handleLength, cy - r, cx + r, cy - handleLength, cx + r, cy);
    // Нижняя правая часть
    bezierVertex(cx + r, cy + handleLength, cx + handleLength, cy + r, cx, cy + r);
    // Нижняя левая часть
    bezierVertex(cx - handleLength, cy + r, cx - r, cy + handleLength, cx - r, cy);
    // Верхняя левая часть
    bezierVertex(cx - r, cy - handleLength, cx - handleLength, cy - r, cx, cy - r);
    endShape(CLOSE);
}
