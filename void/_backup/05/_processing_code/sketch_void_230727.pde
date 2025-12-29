boolean altMode = false;

void mousePressed() {
  altMode = !altMode;
}

import controlP5.*;
ControlP5 stemWeight;
ControlP5 strokes;
ControlP5 poly;

StringDict alphabet = new StringDict();
int cols = 5;
int rows = 5;
float x = 12;
float y = 12;

int stem = 24;//толщина штриха
float letterSize = 60;//высота глифа
int ptNum = 24;//количество вершин в дуге
int strokesNum = 1;//количество линий, на которое разделен штрих
float gap = strokesNum++;//отступ между линиями штриха

int initialX = 12;//начальное смещение по X
int letterW = 12;//ширина буквы
float G = initialX * 5;//спейсинг
int lineHeight = 72; // интерлиньяж

color c1 = color(0);//цвет букв
color c2 = color(128);//цвет фона
color c3 = color(34, 82, 245);

void setup() {
  size(444, 478);
  pixelDensity(2);
  surface. setLocation (0, 0);

  stemWeight = new ControlP5 (this);
  stemWeight.addSlider ("stem")
    .setPosition (12, height-28)
    .setSize (100, 12)
    .setRange (1, 36)
    .setValue (12)
    .setColorCaptionLabel(color(c2))
    .setColorBackground(color(0))
    .setColorForeground(color(255))
    .setColorValue(color(c2))
    .setColorActive(color(c3));

  strokes = new ControlP5 (this);
  strokes.addSlider ("strokesNum")
    .setPosition (124, height-28)
    .setSize (100, 12)
    .setRange (1, 5)
    .setValue (2)
    .setColorCaptionLabel(color(c2))
    .setColorBackground(color(0))
    .setColorForeground(color(255))
    .setColorValue(color(c2))
    .setColorActive(color(c3));


  //poly = new ControlP5 (this);
  //strokes.addSlider ("ptNum")
  //  .setPosition (236, height-28)
  //  .setSize (100, 12)
  //  .setRange (2, 24)
  //  .setValue (24)
  //  .setColorCaptionLabel(color(c2))
  //  .setColorBackground(color(0))
  //  .setColorForeground(color(255))
  //  .setColorValue(color(c2));

  alphabet.set("A", "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2L1S1S1S1L2S0E0E0E0S2");
  alphabet.set("B", "L1S1S1S1R2L0S3S3S3R3S0E0E0B0R2S0E0E0E0S2L0S3S3S3R3");
  alphabet.set("C", "E0R1S1R2E0R1B3E0B0R2S0E0E0E0E0R0B2E0B1R3E0R0S3R3E0");
  alphabet.set("D", "L1S1S1R2E0S0E0E0B0R2S0E0E0E0S2S0E0E0B1R3L0S3S3R3E0");
  alphabet.set("E", "L1S1S1S1S1S0E0E0E0E0L1S1S1S1E0S0E0E0E0E0L0S3S3S3S3");
  alphabet.set("F", "L1S1S1S1S1S0E0E0E0E0L1S1S1S1E0S0E0E0E0E0S0E0E0E0E0");
  alphabet.set("G", "E0R1S1S1R2R1B3E0E0E0S0E0S1S1R2R0B2E0E0S2E0R0S3S3R3");
  alphabet.set("H", "S0E0E0E0S2S0E0E0E0S2L1S1S1S1L2S0E0E0E0S2S0E0E0E0S2");
  alphabet.set("I", "S1S1J1S1S1E0E0C0E0E0E0E0C0E0E0E0E0C0E0E0S3S3J3S3S3");
  alphabet.set("J", "S1S1S1S1L2E0E0E0E0S2S0E0E0E0S2R0B2E0B1R3E0R0S3R3E0");
  alphabet.set("K", "S0E0E0E0S2S0E0B1S3R3J0C1J2E0E0S0E0B0S1R2S0E0E0E0S2");
  alphabet.set("L", "S0E0E0E0E0S0E0E0E0E0S0E0E0E0E0S0E0E0E0E0L0S3S3S3S3");
  alphabet.set("M", "S0R1R2R1R2L1B3S2E0S2S0E0S2E0S2S0E0S2E0S2S0E0S2E0S2");
  alphabet.set("N", "S0R1S1S1R2L1B3E0E0S2S0E0E0E0S2S0E0E0E0S2S0E0E0E0S2");
  alphabet.set("O", "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2R0B2E0B1R3E0R0S3R3E0");
  alphabet.set("P", "L1S1S1S1R2L0B2E0E0S2S0R0S3S3R3S0E0E0E0E0S0E0E0E0E0");
  alphabet.set("Q", "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2R0B2E0E0R2E0R0S3R3S2");
  alphabet.set("R", "L1S1S1S1R2S0E0E0E0S2L0S3S3S3R3S0E0E0B0R2S0E0E0E0S2");
  alphabet.set("S", "E0R1S1R2E0R1B3E0B0R2R0S3S1S1R2R0B2E0B1R3E0R0S3R3E0");
  alphabet.set("T", "S1S1J1S1S1E0E0C0E0E0E0E0C0E0E0E0E0C0E0E0E0E0C0E0E0");
  alphabet.set("U", "S0E0E0E0S2S0E0E0E0S2S0E0E0E0S2S0E0E0E0S2R0S3S3S3R3");
  alphabet.set("V", "S0E0E0E0S2S0E0E0E0S2S0E0E0E0S2R0B2E0B1R3E0R0S3R3E0");
  alphabet.set("W", "S0E0C0E0S2S0E0C0E0S2S0B1J3B2S2S0S2E0S0S2R0R3E0R0R3");
  alphabet.set("X", "S1R2E0R1S1E0S2E0S0E0E0B0J1B3E0E0S2E0S0E0S3R3E0R0S3");
  alphabet.set("Y", "S1R2E0R1S1E0S2E0S0E0E0B0J1B3E0E0E0C0E0E0E0E0C0E0E0");
  alphabet.set("Z", "S1S1S1S1R2E0E0E0E0R3R1S1S1S1E0S0E0E0E0E0R0S3S3S3S3");
  //                 ----------|---------|---------|---------|---------
  alphabet.set(" ", "E0E0E0E00E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0");
  alphabet.set("(", "R1S1S1E0E0S0E0E0E0E0S0E0E0E0E0S0E0E0E0E0R0S3S3E0E0");
  alphabet.set(")", "E0E0S1S1R2E0E0E0E0S2E0E0E0E0S2E0E0E0E0S2E0E0S3S3R3");
  alphabet.set("{", "E0R1S1E0E0R1B3E0E0E0S0E0E0E0E0R0B2E0E0E0E0R0S3E0E0");
  alphabet.set("}", "E0E0S1R2E0E0E0E0B0R2E0E0E0E0S2E0E0E0B1R3E0E0S3R3E0");
  //                 ----------|---------|---------|---------|---------
  alphabet.set("1", "E0S1L2E0E0E0E0S2E0E0E0E0S2E0E0E0E0S2E0E0S3S3L3S3S3");
  alphabet.set("2", "R1S1S1S1R2E0E0E0E0S2E0S3S3S3R3R1E0E0E0E0R0S3S3S3S3");
  alphabet.set("3", "S1S1S1S1R2E0E0E0E0R3E0S1S1S1R2E0E0E0E0S2S3S3S3S3R3");
  alphabet.set("4", "S0E0E0E0S2S0E0E0E0S2R0S3S3S3L3E0E0E0E0S2E0E0E0E0S2");
  alphabet.set("5", "L1S1S1S1S1R0E0E0E0E0E0S1S1S1R2E0E0E0E0S2R0S3S3S3R3");
  alphabet.set("6", "R1S1S1S1S1S0E0E0E0E0S0R1S1S1R2L1B3E0E0S2R0S3S3S3R3");
  alphabet.set("7", "S1S1S1S1R2E0E0E0E0R3E0E0R1S1E0E0E0S0E0E0E0E0S0E0E0");
  alphabet.set("8", "R1S1S1S1R2R0E0E0E0R3R1S1S1S1R2S0E0E0E0S2R0S3S3S3R3");
  alphabet.set("9", "R1S1S1S1R2S0E0E0B1L3R0S3S3R3S2E0E0E0E0S2S3S3S3S3R3");
  alphabet.set("0", "E0R1S1R2E0R1B3E0B0R2S0E0C1E0S2R0B2E0B1R3E0R0S3R3E0");
  //                 ----------|---------|---------|---------|---------

  alphabet.set("А", "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2L1S1S1S1L2S0E0E0E0S2");
  alphabet.set("Б", "L1S1S1S1S1L0S3S3S3E0S0E0E0B0R2S0E0E0E0S2L0S3S3S3R3");
  alphabet.set("В", "L1S1S1S1R2L0S3S3S3R3S0E0E0B0R2S0E0E0E0S2L0S3S3S3R3");
  alphabet.set("Г", "L1S1S1S1S1S0E0E0E0E0S0E0E0E0E0S0E0E0E0E0S0E0E0E0E0");
  alphabet.set("Д", "E0R1S1R2E0R1B3E0B0R2S0E0E0E0S2R0B2E0B1R3E0R0S3R3E0");
  alphabet.set("Е", "L1S1S1S1S1S0E0E0E0E0L1S1S1S1E0S0E0E0E0E0L0S3S3S3S3");
}

void draw() {
  //if (record) {
  //  beginRecord(PDF, timestampFilename("output", "pdf"));
  //}

  //stem = map(sin(millis() / 1000.0), -1, 1, 2, 18);//анимация толщины
  background(c2);
  String[] words = {
    "АБВГДЕ",
    "ABCDEF",
    "GHIJKL",
    "MNOPQR",
    "STUVWX",
    "YZ0123",
    "456789",
  };

  //перебор массива words, вычисление положения каждой буквы
  for (int wordIndex = 0; wordIndex < words.length; wordIndex++) {
    String word = words[wordIndex];
    for (int letterIndex = 0; letterIndex < word.length(); letterIndex++) {
      float x = initialX + letterW * letterIndex + G * letterIndex;
      float currentY = y + lineHeight * wordIndex; // calculate the y position of the current line
      drawLetter(str(word.charAt(letterIndex)), x, currentY, letterSize, letterSize);
    }
  }
}

void drawLetter(String letter, float x, float y, float letW, float letH) {
  float w = letW/cols;
  float h = letH/rows;

  String code = alphabet.get(letter);

  for (int i = 0; i < cols; i++ ) {
    for (int j = 0; j < rows; j++ ) {
      int index = (i + j*cols) * 2;
      float x1 = x + w*i;
      float y1 = y + h*j;
      float a = float(code.charAt(index+1)) * PI/2;

      if (code.charAt(index) == 'S') {
        if (altMode) {
          drawStraight(x1, y1, w, h, a);
        } else {
          drawStraight_alt(x1, y1, w, h, a);
        }
      } else if (code.charAt(index) == 'C') {
        if (altMode) {
          drawCentral(x1, y1, w, h, a);
        } else {
          drawCentral_alt(x1, y1, w, h, a);
        }
      } else if (code.charAt(index) == 'J') {
        if (altMode) {
          drawJoint_alt(x1, y1, w, h, a);
        } else {
          drawJoint(x1, y1, w, h, a);
        }
      } else if (code.charAt(index) == 'L') {
        if (altMode) {
          drawLink_alt(x1, y1, w, h, a);
        } else {
          drawLink(x1, y1, w, h, a);
        }
      } else if (code.charAt(index) == 'R') {
        if (altMode) {
          drawRound_alt(x1, y1, w, h, a);
        } else {
          drawRound(x1, y1, w, h, a);
        }
      } else if (code.charAt(index) == 'B') {
        if (altMode) {
          drawBend(x1, y1, w, h, a);
        } else {
          drawBend_alt(x1, y1, w, h, a);
        }
      } else if (code.charAt(index) == 'E') {
        if (altMode) {
          drawEmpty_alt(x1, y1, w, h, a);
        } else {
          drawEmpty(x1, y1, w, h, a);
        }
      }
    }
  }
}
