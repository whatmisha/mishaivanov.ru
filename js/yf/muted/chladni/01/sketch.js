let mic, fft;
let resolution = 300;
let isRunning = false;
let isPaused = false; // Pause variable
let thresholdSlider; // Threshold slider
let thresholdValue = 0.2; // Maximum value for maximum contrast (was 0.01)
let invertedMode = false; // Inversion mode (white lines on black or black lines on white)
let modeXSlider, modeYSlider; // Mode sliders
let modeX = 3, modeY = 2; // Initial mode values
let sensitivitySlider; // Sensitivity slider
let sensitivity = 5.0; // Maximum microphone sensitivity
let smoothingSlider; // Smoothing slider
let smoothingValue = 0.0; // Minimum smoothing
// Smoothing parameters
let currentNX = 3;
let currentNY = 2;
let currentAmplitude = 1.0;
// Text parameters
let customText = "THE SOUND OF SILENCE";
let textSizeValue = 32; // Reduced text size by half (was 64)
let textStrokeValue = 3; // Default stroke width
let textSizeInput; // Text input for font size instead of slider
let textStrokeSlider;
let textInput;
let gradientModeCheckbox;
let useGradientMode = false; // Disable gradient mode by default (enable contrast)
let textVisible = true; // Enable text display
let myFont; // Variable to store the font
let diagLinesCheckbox; // Checkbox for diagonal lines
let showDiagLines = false; // Diagonal lines are off by default
let invertCheckbox; // Checkbox for color inversion
let lastFrameState = null; // To store the last state on pause

function preload() {
  // Load font before starting sketch
  myFont = loadFont('Rooftop Mono-Regular-Desktop.otf');
}

function setup() {
  // Create canvas and place it in the container
  const canvas = createCanvas(600, 600);
  canvas.parent('canvas-container');
  pixelDensity(1);

  // Setup audio analyzers
  mic = new p5.AudioIn();
  fft = new p5.FFT(smoothingValue, 1024); // Increased FFT size for better resolution
  fft.setInput(mic);

  noStroke();
  
  // Font setup - use loaded font
  textFont(myFont);
  textAlign(CENTER, CENTER);
  
  // Create sliders for threshold and modes
  createControlSliders();
  
  // Setup interface
  setupInterface();
  
  // Draw initial state
  drawStaticPattern(modeX, modeY);
}

function draw() {
  if (!isRunning || isPaused) {
    // If paused and we have a saved state - do nothing
    if (isPaused && lastFrameState !== null) return;
    
    // If not paused or no saved state - just exit
    if (!isPaused) return;
  }
  
  // Get audio spectrum
  let spectrum = fft.analyze();
  
  // Measure overall microphone volume
  let volume = mic.getLevel();
  
  // Get energy in different ranges
  let bass = fft.getEnergy("bass") * sensitivity;
  let lowMid = fft.getEnergy("lowMid") * sensitivity;
  let mid = fft.getEnergy("mid") * sensitivity;
  let highMid = fft.getEnergy("highMid") * sensitivity;
  let treble = fft.getEnergy("treble") * sensitivity;
  
  // Normalize values to react even to quiet sounds
  let bassNorm = normalizeEnergy(bass);
  let trebleNorm = normalizeEnergy(treble);

  // Apply more sensitive transformation of sound to wave parameters
  // Use slider values as base and add sound influence
  let targetNX = modeX + map(bassNorm, 0, 1, 0, 5); // Sound influences in range +0 to +5
  let targetNY = modeY + map(trebleNorm, 0, 1, 0, 5);
  let targetAmplitude = map(mid, 0, 255 * sensitivity, 0.5, 3);
  
  // Smooth transitions for more fluid animation
  currentNX = lerp(currentNX, targetNX, 1 - smoothingValue);
  currentNY = lerp(currentNY, targetNY, 1 - smoothingValue);
  currentAmplitude = lerp(currentAmplitude, targetAmplitude, 1 - smoothingValue);
  
  // Round wave numbers to integers
  let nX = int(currentNX);
  let nY = int(currentNY);
  
  // Minimum 1 to avoid errors
  nX = max(1, nX);
  nY = max(1, nY);
  
  // Output information about current parameters and sound level
  console.log(`Volume: ${volume.toFixed(4)}, Bass: ${bassNorm.toFixed(2)}, Treble: ${trebleNorm.toFixed(2)}, nX: ${nX}, nY: ${nY}, Amplitude: ${currentAmplitude.toFixed(2)}`);

  // Dynamically change threshold value based on volume
  let dynamicThreshold = map(volume, 0, 0.1, thresholdValue * 2, thresholdValue * 0.8);
  dynamicThreshold = constrain(dynamicThreshold, 0.01, 0.2);
  
  // Draw Chladni figure with dynamic threshold
  drawChladniPattern(nX, nY, currentAmplitude, dynamicThreshold);
  
  // Save last state for pause
  if (isRunning) {
    lastFrameState = {
      nX: nX,
      nY: nY,
      amplitude: currentAmplitude,
      threshold: dynamicThreshold
    };
  }
}

// Function to normalize sound energy with amplification of weak signals
function normalizeEnergy(energy) {
  // Non-linear transformation to amplify weak signals
  // Use square root for more even response
  return pow(constrain(energy / (255 * sensitivity), 0, 1), 0.5);
}

function createControlSliders() {
  // Create slider for threshold adjustment
  thresholdSlider = createSlider(0.01, 0.2, thresholdValue, 0.01);
  thresholdSlider.parent('threshold-slider-container');
  thresholdSlider.style('width', '100%');
  thresholdSlider.input(() => {
    thresholdValue = thresholdSlider.value();
    // Update static pattern if microphone is not active
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Create sliders for X and Y modes
  modeXSlider = createSlider(1, 15, modeX, 1);
  modeXSlider.parent('modeX-slider-container');
  modeXSlider.style('width', '100%');
  modeXSlider.input(() => {
    modeX = modeXSlider.value();
    // Update current state nX immediately
    currentNX = modeX;
    // Update image if microphone is not active
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  modeYSlider = createSlider(1, 15, modeY, 1);
  modeYSlider.parent('modeY-slider-container');
  modeYSlider.style('width', '100%');
  modeYSlider.input(() => {
    modeY = modeYSlider.value();
    // Update current state nY immediately
    currentNY = modeY;
    // Update image if microphone is not active
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Add slider for sensitivity adjustment
  sensitivitySlider = createSlider(0.5, 5, sensitivity, 0.1);
  sensitivitySlider.parent('sensitivity-slider-container');
  sensitivitySlider.style('width', '100%');
  sensitivitySlider.input(() => {
    sensitivity = sensitivitySlider.value();
  });
  
  // Add slider for smoothing adjustment
  smoothingSlider = createSlider(0, 0.95, smoothingValue, 0.05);
  smoothingSlider.parent('smoothing-slider-container');
  smoothingSlider.style('width', '100%');
  smoothingSlider.input(() => {
    smoothingValue = smoothingSlider.value();
    fft.smooth(smoothingValue);
  });
  
  // Text input field
  textInput = createInput(customText);
  textInput.parent('text-input-container');
  textInput.style('width', '100%');
  textInput.input(() => {
    customText = textInput.value();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Replace slider for text size with text input
  textSizeInput = createInput(textSizeValue.toString());
  textSizeInput.parent('text-size-input-container');
  textSizeInput.style('width', '100%');
  textSizeInput.input(() => {
    // Convert entered value to number
    let newSize = parseInt(textSizeInput.value());
    // Check if value is a number and within acceptable limits
    if (!isNaN(newSize) && newSize >= 10 && newSize <= 200) {
      textSizeValue = newSize;
      if (!isRunning) {
        drawStaticPattern(modeX, modeY);
      }
    }
  });
  
  // Slider for text stroke width
  textStrokeSlider = createSlider(0, 20, textStrokeValue, 1);
  textStrokeSlider.parent('text-stroke-slider-container');
  textStrokeSlider.style('width', '100%');
  textStrokeSlider.input(() => {
    textStrokeValue = textStrokeSlider.value();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Checkbox for gradient mode
  gradientModeCheckbox = createCheckbox('', useGradientMode);
  gradientModeCheckbox.parent('gradient-checkbox-container');
  gradientModeCheckbox.changed(() => {
    useGradientMode = gradientModeCheckbox.checked();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Checkbox for diagonal lines
  diagLinesCheckbox = createCheckbox('', showDiagLines);
  diagLinesCheckbox.parent('diag-lines-checkbox-container');
  diagLinesCheckbox.changed(() => {
    showDiagLines = diagLinesCheckbox.checked();
    if (!isRunning) {
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Checkbox for color inversion
  invertCheckbox = createCheckbox('', invertedMode);
  invertCheckbox.parent('invert-checkbox-container');
  invertCheckbox.changed(() => {
    invertedMode = invertCheckbox.checked();
    if (!isRunning || isPaused) {
      if (isPaused && lastFrameState) {
        // If paused, use last state
        drawChladniPattern(
          lastFrameState.nX, 
          lastFrameState.nY, 
          lastFrameState.amplitude, 
          lastFrameState.threshold
        );
      } else {
        drawStaticPattern(modeX, modeY);
      }
    }
  });
}

function drawChladniPattern(nX, nY, amplitude = 1, threshold = thresholdValue) {
  // Set background based on inversion mode
  background(invertedMode ? 255 : 0);
  
  loadPixels();

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = min(width, height) / 2;
  
  // Pre-calculate maximum wave value to scale contrast
  let maxWaveValue = 0;
  for (let x = 0; x < width; x += 5) { // Check every 5th pixel for speed
    for (let y = 0; y < height; y += 5) {
      let normX = (x - centerX) / scale;
      let normY = (y - centerY) / scale;
      let value = abs(realChladniFormula(normX, normY, nX, nY) * amplitude);
      maxWaveValue = max(maxWaveValue, value);
    }
  }
  maxWaveValue = max(1.0, maxWaveValue); // Avoid division by zero
  
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      // Normalize coordinates to square [-1, 1] x [-1, 1]
      let normX = (x - centerX) / scale;
      let normY = (y - centerY) / scale;
      
      // Calculate Chladni figure using formula for rectangular plate
      let value = realChladniFormula(normX, normY, nX, nY) * amplitude;
      
      // Apply threshold or use gradient
      let pixelValue;
      if (useGradientMode) {
        // Gradient mode - use value directly, without threshold
        pixelValue = map(abs(value), 0, maxWaveValue * 1.2, 0, 255);
      } else {
        // Contrast mode with threshold
        // Use dynamic threshold based on maximum value
        let dynamicThreshold = threshold * maxWaveValue;
        pixelValue = abs(value) < dynamicThreshold ? 0 : 255;
      }
      
      let index = (x + y * width) * 4;
      pixels[index] = invertedMode ? (255 - pixelValue) : pixelValue;
      pixels[index + 1] = invertedMode ? (255 - pixelValue) : pixelValue;
      pixels[index + 2] = invertedMode ? (255 - pixelValue) : pixelValue;
      pixels[index + 3] = 255;
    }
  }

  updatePixels();
  
  // If textVisible, draw the text with background rectangle
  if (textVisible) {
    drawTextWithStroke(customText, width/2, height/2);
  }
}

// New function to draw text with stroke
function drawTextWithStroke(txt, x, y) {
  push();
  
  // Calculate text dimensions
  textFont(myFont);
  textSize(textSizeValue);
  textAlign(CENTER, CENTER);
  
  // Draw the text with stroke
  textFont(myFont);
  textSize(textSizeValue);
  textAlign(CENTER, CENTER);
  
  // Draw the stroke
  if (textStrokeValue > 0) {
    fill(255); // Always white text
    stroke(255); // Always white stroke
    strokeWeight(textStrokeValue);
    strokeJoin(ROUND); // Round join for smoother corners
    strokeCap(ROUND); // Round caps for smoother endings
    text(txt, x, y);
  }
  
  // Draw the text fill
  noStroke();
  fill(255); // Always white text
  text(txt, x, y);
  
  pop();
}

function realChladniFormula(x, y, nX, nY) {
  // More realistic formula for Chladni figures on square plate
  // Use trigonometric functions with wave numbers
  
  // Relative contribution coefficient of each mode
  let ratio = 0.7;
  
  // Additional coefficient for diagonal components
  let diagRatio = showDiagLines ? 0.3 : 0.0; // If diagonal lines are off, set weight to 0
  
  // Main formula for square plate (horizontal and vertical modes)
  let term1 = sin(nX * PI * x) * sin(nY * PI * y);
  let term2 = sin(nY * PI * x) * sin(nX * PI * y);
  
  // Diagonal components (combinations x+y and x-y)
  let diagTerm1 = sin(nX * PI * (x + y) * 0.5) * sin(nY * PI * (x - y) * 0.5);
  let diagTerm2 = sin(nX * PI * (x - y) * 0.5) * sin(nY * PI * (x + y) * 0.5);
  
  // Combine all components with corresponding weights
  return ratio * (term1 + term2) + diagRatio * (diagTerm1 + diagTerm2);
}

function drawStaticPattern(nX, nY) {
  // Draw static figure for initial state
  drawChladniPattern(nX, nY, 1);
}

function setupInterface() {
  // Button setup
  const startButton = select('#start-button');
  const stopButton = select('#stop-button');
  const pauseButton = select('#pause-button'); // Pause button
  const exportPNGButton = select('#export-png-button'); // PNG export button
  const exportSVGButton = select('#export-svg-button'); // SVG export button
  
  startButton.mousePressed(() => {
    if (!isRunning) {
      // Request microphone access with enhanced parameters
      userStartAudio().then(() => {
        mic.start();
        // Set high gain level for microphone
        mic.amp(1.0);
        isRunning = true;
        isPaused = false; // Reset pause on start
        console.log('Microphone activated');
      }).catch(err => {
        console.error('Microphone access error:', err);
        alert('Failed to access microphone. Please allow access and try again.');
      });
    }
  });
  
  stopButton.mousePressed(() => {
    if (isRunning) {
      mic.stop();
      isRunning = false;
      isPaused = false; // Reset pause on stop
      console.log('Microphone stopped');
      // Draw static pattern
      drawStaticPattern(modeX, modeY);
    }
  });
  
  // Add functionality to pause button
  pauseButton.mousePressed(() => {
    if (isRunning) {
      isPaused = !isPaused;
      console.log(isPaused ? 'Pause activated' : 'Pause deactivated');
    }
  });
  
  // Add functionality to PNG export button
  exportPNGButton.mousePressed(() => {
    // Create temporary canvas with double resolution
    let tempCanvas = createGraphics(width * 2, height * 2);
    tempCanvas.pixelDensity(1);
    
    // Draw current Chladni figure on temporary canvas with double scale
    if (isPaused && lastFrameState) {
      // If paused, use last state
      drawExportChladniPattern(
        tempCanvas, 
        lastFrameState.nX, 
        lastFrameState.nY, 
        lastFrameState.amplitude, 
        lastFrameState.threshold
      );
    } else if (isRunning) {
      // If microphone is running, use current parameters
      drawExportChladniPattern(
        tempCanvas, 
        int(currentNX), 
        int(currentNY), 
        currentAmplitude, 
        thresholdValue
      );
    } else {
      // If stopped, use static parameters
      drawExportChladniPattern(tempCanvas, modeX, modeY, 1, thresholdValue);
    }
    
    // Save image
    saveCanvas(tempCanvas, 'chladni_pattern', 'png');
    
    // Remove temporary canvas
    tempCanvas.remove();
  });
  
  // Add functionality to SVG export button
  exportSVGButton.mousePressed(() => {
    try {
      console.log("Starting SVG export...");

      // Define parameters for drawing
      let params;
      if (isPaused && lastFrameState) {
        // If paused, use last state
        params = {
          nX: lastFrameState.nX,
          nY: lastFrameState.nY,
          amplitude: lastFrameState.amplitude,
          threshold: lastFrameState.threshold
        };
      } else if (isRunning) {
        // If microphone is running, use current parameters
        params = {
          nX: int(currentNX),
          nY: int(currentNY),
          amplitude: currentAmplitude,
          threshold: thresholdValue
        };
      } else {
        // If stopped, use static parameters
        params = {
          nX: modeX,
          nY: modeY,
          amplitude: 1,
          threshold: thresholdValue
        };
      }

      // Create new SVG for export - use temporary invisible container
      let svgContainer = document.createElement('div');
      svgContainer.style.position = 'absolute';
      svgContainer.style.top = '-9999px';
      document.body.appendChild(svgContainer);
      
      // Create new SVG element with required dimensions
      let svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgElement.setAttribute('width', width);
      svgElement.setAttribute('height', height);
      svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svgContainer.appendChild(svgElement);
      
      // Set SVG background
      let background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      background.setAttribute('width', width);
      background.setAttribute('height', height);
      background.setAttribute('fill', invertedMode ? 'white' : 'black');
      svgElement.appendChild(background);
      
      // Generate Chladni figure contours
      generateSVGChladniContours(svgElement, params.nX, params.nY, params.amplitude, params.threshold);
      
      // If text is visible - add it with background rectangle
      if (textVisible) {
        // Add text element
        let textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textElement.setAttribute('x', width/2);
        textElement.setAttribute('y', height/2);
        textElement.setAttribute('font-family', 'Rooftop Mono');
        textElement.setAttribute('font-size', textSizeValue);
        textElement.setAttribute('fill', 'white'); // Always white text
        textElement.setAttribute('text-anchor', 'middle');
        textElement.setAttribute('dominant-baseline', 'middle');
        
        // Add stroke if needed
        if (textStrokeValue > 0) {
          textElement.setAttribute('stroke', 'white'); // Always white stroke
          textElement.setAttribute('stroke-width', textStrokeValue);
          textElement.setAttribute('stroke-linejoin', 'round'); // Round join for smoother corners
          textElement.setAttribute('stroke-linecap', 'round'); // Round caps for smoother endings
        }
        
        textElement.textContent = customText;
        svgElement.appendChild(textElement);
      }
      
      // Get SVG as string
      let svgString = new XMLSerializer().serializeToString(svgElement);
      
      // Create and download file
      let blob = new Blob([svgString], {type: 'image/svg+xml'});
      let link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'chladni_pattern.svg';
      link.click();
      
      // Clean up resources
      URL.revokeObjectURL(link.href);
      document.body.removeChild(svgContainer);
      
      console.log("SVG exported successfully!");
    } catch (error) {
      console.error("Error during SVG export:", error);
      alert('Error occurred during SVG export: ' + error.message);
    }
  });
}

// Function to draw on exportable canvas
function drawExportChladniPattern(targetCanvas, nX, nY, amplitude, threshold) {
  // Set background based on inversion mode
  targetCanvas.background(invertedMode ? 255 : 0);
  
  // Set up font on temporary canvas
  targetCanvas.textFont(myFont);
  targetCanvas.textAlign(CENTER, CENTER);
  
  targetCanvas.loadPixels();

  const centerX = targetCanvas.width / 2;
  const centerY = targetCanvas.height / 2;
  const scale = min(targetCanvas.width, targetCanvas.height) / 2;
  
  // Pre-calculate maximum wave value to scale contrast
  let maxWaveValue = 0;
  for (let x = 0; x < targetCanvas.width; x += 10) { // Check every 10th pixel for speed
    for (let y = 0; y < targetCanvas.height; y += 10) {
      let normX = (x - centerX) / scale;
      let normY = (y - centerY) / scale;
      let value = abs(realChladniFormula(normX, normY, nX, nY) * amplitude);
      maxWaveValue = max(maxWaveValue, value);
    }
  }
  maxWaveValue = max(1.0, maxWaveValue); // Avoid division by zero
  
  for (let x = 0; x < targetCanvas.width; x++) {
    for (let y = 0; y < targetCanvas.height; y++) {
      // Normalize coordinates to square [-1, 1] x [-1, 1]
      let normX = (x - centerX) / scale;
      let normY = (y - centerY) / scale;
      
      // Calculate Chladni figure using formula for rectangular plate
      let value = realChladniFormula(normX, normY, nX, nY) * amplitude;
      
      // Apply threshold or use gradient
      let pixelValue;
      if (useGradientMode) {
        // Gradient mode - use value directly, without threshold
        pixelValue = map(abs(value), 0, maxWaveValue * 1.2, 0, 255);
      } else {
        // Contrast mode with threshold
        // Use dynamic threshold based on maximum value
        let dynamicThreshold = threshold * maxWaveValue;
        pixelValue = abs(value) < dynamicThreshold ? 0 : 255;
      }
      
      let index = (x + y * targetCanvas.width) * 4;
      targetCanvas.pixels[index] = invertedMode ? (255 - pixelValue) : pixelValue;
      targetCanvas.pixels[index + 1] = invertedMode ? (255 - pixelValue) : pixelValue;
      targetCanvas.pixels[index + 2] = invertedMode ? (255 - pixelValue) : pixelValue;
      targetCanvas.pixels[index + 3] = 255;
    }
  }

  targetCanvas.updatePixels();
  
  // If text is visible, draw the text with background rectangle
  if (textVisible) {
    targetCanvas.push();
    
    // Calculate text dimensions
    targetCanvas.textFont(myFont);
    targetCanvas.textSize(textSizeValue * 2); // Double size for export
    targetCanvas.textAlign(CENTER, CENTER);
    
    // Draw the text with stroke
    targetCanvas.textFont(myFont);
    targetCanvas.textSize(textSizeValue * 2); // Double size for export
    targetCanvas.textAlign(CENTER, CENTER);
    
    // Draw the stroke
    if (textStrokeValue > 0) {
      targetCanvas.fill(255); // Always white text
      targetCanvas.stroke(255); // Always white stroke
      targetCanvas.strokeWeight(textStrokeValue * 2); // Double stroke for export
      targetCanvas.strokeJoin(ROUND); // Round join for smoother corners
      targetCanvas.strokeCap(ROUND); // Round caps for smoother endings
      targetCanvas.text(customText, centerX, centerY);
    }
    
    // Draw the text fill
    targetCanvas.noStroke();
    targetCanvas.fill(255); // Always white text
    targetCanvas.text(customText, centerX, centerY);
    
    targetCanvas.pop();
  }
}

// Function to generate Chladni figure contours in SVG
function generateSVGChladniContours(svgElement, nX, nY, amplitude, threshold) {
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = min(width, height) / 2;
  
  // Define grid step for drawing contours
  const gridSize = 100; // Grid size (number of cells)
  const cellWidth = width / gridSize;
  const cellHeight = height / gridSize;
  
  // Pre-calculate maximum wave value for normalization
  let maxWaveValue = 0;
  for (let x = 0; x < width; x += cellWidth * 5) {
    for (let y = 0; y < height; y += cellHeight * 5) {
      let normX = (x - centerX) / scale;
      let normY = (y - centerY) / scale;
      let value = abs(realChladniFormula(normX, normY, nX, nY) * amplitude);
      maxWaveValue = max(maxWaveValue, value);
    }
  }
  maxWaveValue = max(1.0, maxWaveValue);
  
  // Threshold for determining lines
  const dynamicThreshold = threshold * maxWaveValue;
  
  // Create 2D array of values
  let valueGrid = new Array(gridSize + 1);
  for (let i = 0; i <= gridSize; i++) {
    valueGrid[i] = new Array(gridSize + 1);
    for (let j = 0; j <= gridSize; j++) {
      let x = i * cellWidth;
      let y = j * cellHeight;
      let normX = (x - centerX) / scale;
      let normY = (y - centerY) / scale;
      let value = abs(realChladniFormula(normX, normY, nX, nY) * amplitude);
      // Binary values relative to threshold
      valueGrid[i][j] = value < dynamicThreshold ? 0 : 1;
    }
  }
  
  // Contour color
  const strokeColor = invertedMode ? 'black' : 'white';
  
  // Find and draw closed contours
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      // Check each cell in grid
      if (valueGrid[i][j] !== valueGrid[i+1][j] || 
          valueGrid[i][j] !== valueGrid[i][j+1] || 
          valueGrid[i][j] !== valueGrid[i+1][j+1]) {
        
        // Create path for this cell's contour
        let contourPath = [];
        
        // Add contour points depending on value changes
        
        // Top side of cell
        if (valueGrid[i][j] !== valueGrid[i+1][j]) {
          contourPath.push([i * cellWidth, j * cellHeight, (i+1) * cellWidth, j * cellHeight]);
        }
        
        // Right side of cell
        if (valueGrid[i+1][j] !== valueGrid[i+1][j+1]) {
          contourPath.push([(i+1) * cellWidth, j * cellHeight, (i+1) * cellWidth, (j+1) * cellHeight]);
        }
        
        // Bottom side of cell
        if (valueGrid[i][j+1] !== valueGrid[i+1][j+1]) {
          contourPath.push([i * cellWidth, (j+1) * cellHeight, (i+1) * cellWidth, (j+1) * cellHeight]);
        }
        
        // Left side of cell
        if (valueGrid[i][j] !== valueGrid[i][j+1]) {
          contourPath.push([i * cellWidth, j * cellHeight, i * cellWidth, (j+1) * cellHeight]);
        }
        
        // If contour found, add it to SVG
        if (contourPath.length > 0) {
          for (let k = 0; k < contourPath.length; k++) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', contourPath[k][0]);
            line.setAttribute('y1', contourPath[k][1]);
            line.setAttribute('x2', contourPath[k][2]);
            line.setAttribute('y2', contourPath[k][3]);
            line.setAttribute('stroke', strokeColor);
            line.setAttribute('stroke-width', '1');
            svgElement.appendChild(line);
          }
        }
      }
    }
  }
}

// Function to draw Chladni contours in SVG (old version - not used)
function drawSVGChladniPattern(nX, nY, amplitude, threshold) {
  noFill();
  stroke(invertedMode ? 0 : 255);
  strokeWeight(1);
  
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = min(width, height) / 2;
  
  // Define grid step for drawing contours
  // Smaller step gives more detailed SVG, but increases file size
  const gridStep = 5;
  
  // Pre-calculate maximum wave value for normalization
  let maxWaveValue = 0;
  for (let x = 0; x < width; x += gridStep) {
    for (let y = 0; y < height; y += gridStep) {
      let normX = (x - centerX) / scale;
      let normY = (y - centerY) / scale;
      let value = abs(realChladniFormula(normX, normY, nX, nY) * amplitude);
      maxWaveValue = max(maxWaveValue, value);
    }
  }
  maxWaveValue = max(1.0, maxWaveValue);
  
  // Threshold for determining lines
  const dynamicThreshold = threshold * maxWaveValue;
  
  // Find and draw contours using contour lines
  for (let x = 0; x < width - gridStep; x += gridStep) {
    for (let y = 0; y < height - gridStep; y += gridStep) {
      // Calculate values at four corners of current cell
      const values = [];
      const positions = [
        [x, y],
        [x + gridStep, y],
        [x + gridStep, y + gridStep],
        [x, y + gridStep]
      ];
      
      for (let i = 0; i < 4; i++) {
        let px = positions[i][0];
        let py = positions[i][1];
        let normX = (px - centerX) / scale;
        let normY = (py - centerY) / scale;
        let value = abs(realChladniFormula(normX, normY, nX, nY) * amplitude);
        values.push(value < dynamicThreshold ? 0 : 1);
      }
      
      // Draw lines if there's transition through threshold
      if (values[0] !== values[1]) {
        const t = map(dynamicThreshold, values[0] * maxWaveValue, values[1] * maxWaveValue, 0, 1);
        const ix = map(t, 0, 1, positions[0][0], positions[1][0]);
        line(ix, positions[0][1], ix, positions[0][1]);
      }
      
      if (values[1] !== values[2]) {
        const t = map(dynamicThreshold, values[1] * maxWaveValue, values[2] * maxWaveValue, 0, 1);
        const iy = map(t, 0, 1, positions[1][1], positions[2][1]);
        line(positions[1][0], iy, positions[1][0], iy);
      }
      
      if (values[2] !== values[3]) {
        const t = map(dynamicThreshold, values[2] * maxWaveValue, values[3] * maxWaveValue, 0, 1);
        const ix = map(t, 0, 1, positions[2][0], positions[3][0]);
        line(ix, positions[2][1], ix, positions[2][1]);
      }
      
      if (values[3] !== values[0]) {
        const t = map(dynamicThreshold, values[3] * maxWaveValue, values[0] * maxWaveValue, 0, 1);
        const iy = map(t, 0, 1, positions[3][1], positions[0][1]);
        line(positions[3][0], iy, positions[3][0], iy);
      }
    }
  }
  
  // Add text if it's visible
  if (textVisible) {
    // In SVG we can simply draw text directly
    textFont(myFont);
    textAlign(CENTER, CENTER);
    textSize(textSizeValue);
    text(customText, width/2, height/2);
  }
} 