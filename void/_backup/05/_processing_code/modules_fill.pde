
    void drawStraight_alt (float x, float y, float w, float h, float a) {
      push();
      fill(c1);
      noStroke();
      translate(x, y);
      translate(w/2, h/2);
      rotate(a);
      rect(-w/2, -h/2, stem/2, h);
      pop();
    }

    void drawCentral_alt (float x, float y, float w, float h, float a) {
      push();
      fill(c1);
      noStroke();
      translate(x, y);
      translate(w/2, h/2);
      rotate(a);
      rect(-stem/4, -h/2, stem/2, h);
      pop();
    }

    void drawJoint_alt (float x, float y, float w, float h, float a) {
      push();
      fill(c1);
      noStroke();
      translate(x, y);
      translate(w/2, h/2);
      rotate(a);
      rect(-w/2, -h/2, stem/2, h);
      rect(-w/2, -stem/4, w, stem/2);
      pop();
    }

    void drawLink_alt (float x, float y, float w, float h, float a) {
      push();
      fill(c1);
      noStroke();
      translate(x, y);
      translate(w/2, h/2);
      rotate(a);
      rect(-w/2, -h/2, stem/2, h);
      rect(-w/2, (h-stem)/2, w, stem/2);
      pop();
    }

    void drawRound_alt (float x, float y, float w, float h, float a) {
      push();
      noStroke();
      translate(x, y);
      translate(w/2, h/2);
      rotate(a);
      fill(c1);
      arc(w/2, -h/2, w*2, h*2, HALF_PI, PI);
      fill(c2);
      arc(w/2, -h/2, w*2-stem, h*2-stem, HALF_PI, PI);
      pop();
    }

    void drawBend_alt (float x, float y, float w, float h, float a) {
      push();
      fill(c1);
      noStroke();
      translate(x, y);
      translate(w/2, h/2);
      rotate(a);
      arc(w/2, -h/2, stem, stem, HALF_PI, PI);
      //arc (w-w/2, h-h, w, h, HALF_PI, PI); //прикольные инктрэпы
      pop();
    }

    void drawEmpty_alt (float x, float y, float w, float h, float a) {
      fill(255, 0, 0);
      noFill();
      noStroke();
      rotate(a);
      rect(x, y, stem, stem);
    }
