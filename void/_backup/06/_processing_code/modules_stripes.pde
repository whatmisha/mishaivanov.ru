    void drawStraight(float x, float y, float w, float h, float a) {
      push();
      fill(c1);
      noStroke();
      translate(x, y);
      translate(w/2, h/2);
      rotate(a);

      float w2 = (stem/2 - gap*(strokesNum-1)) / strokesNum;
      float shift = 0;
      for (int i = 0; i < strokesNum; i++) {
        rect(shift-w/2, -h/2, w2, h);
        shift += w2+gap;
      }
      pop();
    }

    void drawCentral (float x, float y, float w, float h, float a) {
      push();
      translate(x + w/2, y + h/2);
      rotate(a);
      float w2 = (stem/2 - gap*(strokesNum-1)) / strokesNum;
      float lineWidth = (strokesNum * w2) + ((strokesNum - 1) * gap);
      drawStraight(-lineWidth/2, -h/2, w, h, 0);
      pop();
    }

    void drawJoint (float x, float y, float w, float h, float a) {
      push();
      drawStraight(x, y, w, h, a);
      drawCentral(x, y, w, h, a+HALF_PI);
      pop();
    }

    void drawLink (float x, float y, float w, float h, float a) {
      drawStraight(x, y, w, h, a);
      drawStraight(x, y, w, h, a-PI/2);
    }

    void drawRound(float x, float y, float w, float h, float a) {
      push();
      translate(x, y);
      translate(w/2, h/2);
      rotate(HALF_PI + a);
      fill(0);
      noStroke();

      float w2 = (stem/2 - gap*(strokesNum-1)) / strokesNum;
      float shift = 0;

      for (int j = 0; j < strokesNum; j++) {
        float R1 = w - shift;
        float R2 = R1 - w2;
        float step = PI/2/ptNum;

        shift += w2;
        shift += gap;

        beginShape();
        for (float i = 0; i < PI/2 + 0.00001; i+= step) {
          float x1 = cos(i)*R1 - w/2;
          float y1 = sin(i)*R1 - h/2;
          vertex(x1, y1);
        }
        for (float i = PI/2; i > -0.00001; i-= step) {
          float x1 = cos(i)*R2 - w/2;
          float y1 = sin(i)*R2 - h/2;
          vertex(x1, y1);
        }
        endShape(CLOSE);
      }
      pop();
    }

    void drawBend (float x, float y, float w, float h, float a) {
      push();
      translate(x, y);
      translate(w/2, h/2);
      rotate(HALF_PI + a);
      fill(0);
      noStroke();

      float w2 = (stem/2 - gap*(strokesNum-1)) / strokesNum;
      float shift = 0;

      for (int j = 0; j < strokesNum; j++) {

        float R1 = w/2 - shift;
        float R2 = R1 - w2;
        float step = PI/2/ptNum;

        shift += w2;
        shift += gap;

        beginShape();
        for (float i = 0; i < PI/2 + 0.00001; i+= step) {
          float x1 = cos(i)*R1 - w/2;
          float y1 = sin(i)*R1 - h/2;
          vertex(x1, y1);
        }
        for (float i = PI/2; i > -0.00001; i-= step) {
          float x1 = cos(i)*R2 - w/2;
          float y1 = sin(i)*R2 - h/2;
          vertex(x1, y1);
        }
        endShape(CLOSE);
      }
      pop();
    }

    void drawEmpty (float x, float y, float w, float h, float a) {
      fill(255, 0, 0);
      noFill();
      noStroke();
      rotate(a);
      rect(x, y, stem, stem);
    }
