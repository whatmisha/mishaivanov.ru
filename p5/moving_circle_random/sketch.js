function setup() {
    createCanvas(400, 400);
    background(0);
}

function draw() {
    noFill();
    stroke(255);
    beginShape();
    bezierVertex(100, 100, 150, 50, 200, 100);
    bezierVertex(250, 150, 250, 250, 200, 300);
    bezierVertex(150, 350, 100, 350, 50, 300);
    bezierVertex(0, 250, 0, 150, 50, 100);
    endShape(CLOSE);
}