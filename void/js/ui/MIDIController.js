/**
 * MIDI Controller Support for Void Typeface
 * Interface control via MIDI controller (e.g., Teenage Engineering EP-133)
 */

export default class MIDIController {
    constructor(voidApp) {
        this.voidApp = voidApp;
        
        // MIDI access
        this.midiAccess = null;
        this.midiInput = null;
        this.midiOutput = null;
        
        // Connection state
        this.isConnected = false;
        this.deviceName = null;
        
        // MIDI CC to sliders mapping
        // EP-133 usually uses CC for buttons and encoders
        this.ccMapping = {
            // Main parameters
            1: 'moduleSize',        // CC1 - Module Size
            2: 'stemMultiplier',    // CC2 - Stem Weight
            3: 'letterSpacingMultiplier', // CC3 - Letter Spacing
            4: 'lineHeightMultiplier',    // CC4 - Line Height
            
            // Stripes/Dash parameters
            5: 'strokesNum',        // CC5 - Lines
            6: 'strokeGapRatio',   // CC6 - Contrast
            7: 'dashLength',        // CC7 - Dash Length
            8: 'gapLength',         // CC8 - Gap Length
            
            // Random parameters
            9: 'randomStemMin',    // CC9 - Random Stem Min
            10: 'randomStemMax',   // CC10 - Random Stem Max
            11: 'randomStrokesMin', // CC11 - Random Lines Min
            12: 'randomStrokesMax', // CC12 - Random Lines Max
            13: 'randomContrastMin', // CC13 - Random Contrast Min
            14: 'randomContrastMax', // CC14 - Random Contrast Max
        };
        
        // MIDI note to buttons/toggles mapping
        this.noteMapping = {
            // Rendering modes (C1-C5)
            36: { type: 'mode', value: 'fill' },      // C1 - Mono
            37: { type: 'mode', value: 'stripes' },   // C#1 - Poly
            38: { type: 'mode', value: 'dash' },      // D1 - Dash
            39: { type: 'mode', value: 'sd' },        // D#1 - PD
            40: { type: 'mode', value: 'random' },    // E1 - Rnd
            
            // Toggles (D1-D5)
            50: { type: 'toggle', setting: 'roundedCaps' },      // D2 - Round
            51: { type: 'toggle', setting: 'closeEnds' },         // D#2 - Close
            52: { type: 'toggle', setting: 'showGrid' },           // E2 - Grid
            53: { type: 'toggle', setting: 'showEndpoints' },      // F2 - Ends
            54: { type: 'toggle', setting: 'showTest' },            // F#2 - Pointer
            
            // Random toggles (E2-E5)
            64: { type: 'toggle', setting: 'randomFullRandom' },   // E3 - Chaos
            65: { type: 'toggle', setting: 'useAlternativesInRandom' }, // F3 - Alternates
            66: { type: 'toggle', setting: 'randomRounded' },       // F#3 - Random Round
            67: { type: 'toggle', setting: 'randomCloseEnds' },    // G3 - Random Close
            68: { type: 'toggle', setting: 'randomDash' },          // G#3 - Random Dash
            
            // Actions (F1-F5)
            41: { type: 'action', action: 'renew' },              // F1 - Update
            42: { type: 'action', action: 'export' },             // F#1 - Export
            43: { type: 'action', action: 'copy' },                 // G1 - Copy
        };
        
        // State for parameter control via pads (hold + repeated presses)
        this.padParameterControl = {
            active: null,  // Which parameter is currently controlled
            lastNote: null,
            lastTime: 0,
            increment: 0.1  // Change step when held
        };
        
        // State for knobs/faders (tracking rotation direction)
        this.knobState = {
            lastNote: null,
            lastTime: 0,
            direction: null,  // 'up' or 'down'
            repeatCount: 0
        };
        
        // MIDI note to parameters mapping (for EP-133 knobs/faders)
        // EP-133 sends Note On with velocity as parameter value
        this.noteParameterMapping = {
            // EP-133 pads for parameter control (notes 44-47)
            44: 'moduleSize',              // A#2 - Module Size
            45: 'stemMultiplier',          // B2 - Stem Weight
            46: 'letterSpacingMultiplier', // C3 - Letter Spacing
            47: 'strokesNum',              // C#3 - Lines (main parameter!)
            
            // Additional notes (if needed)
            60: 'moduleSize',              // C4 - Module Size
            61: 'stemMultiplier',          // C#4 - Stem Weight
            62: 'letterSpacingMultiplier', // D4 - Letter Spacing
            63: 'lineHeightMultiplier',    // D#4 - Line Height
            64: 'strokesNum',              // E4 - Lines
            65: 'strokeGapRatio',          // F4 - Contrast
            66: 'dashLength',              // F#4 - Dash Length
            67: 'gapLength',               // G4 - Gap Length
        };
        
        // Value ranges for CC
        this.ccRanges = {
            moduleSize: { min: 4, max: 64 },
            stemMultiplier: { min: 0.1, max: 3.0 },
            letterSpacingMultiplier: { min: 0, max: 16 },
            lineHeightMultiplier: { min: 0, max: 16 },
            strokesNum: { min: 1, max: 64 }, // Lines - range 1-64
            strokeGapRatio: { min: 0.1, max: 8.0 },
            dashLength: { min: 0.01, max: 8.0 },
            gapLength: { min: 0.01, max: 8.0 },
            randomStemMin: { min: 0.1, max: 3.0 },
            randomStemMax: { min: 0.1, max: 3.0 },
            randomStrokesMin: { min: 1, max: 64 },
            randomStrokesMax: { min: 1, max: 64 },
            randomContrastMin: { min: 0.1, max: 8.0 },
            randomContrastMax: { min: 0.1, max: 8.0 },
        };
        
        // Bind methods
        this.handleMIDIMessage = this.handleMIDIMessage.bind(this);
        this.handleStateChange = this.handleStateChange.bind(this);
    }
    
    /**
     * Initialize MIDI access
     */
    async init() {
        if (!navigator.requestMIDIAccess) {
            console.warn('[MIDIController] Web MIDI API not supported');
            return false;
        }
        
        try {
            this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            console.log('[MIDIController] MIDI access granted');
            
            // Listen for connected device changes
            this.midiAccess.onstatechange = this.handleStateChange;
            
            // Find and connect EP-133
            this.findAndConnectDevice();
            
            return true;
        } catch (error) {
            console.error('[MIDIController] Failed to get MIDI access:', error);
            return false;
        }
    }
    
    /**
     * Find and connect EP-133
     */
    findAndConnectDevice() {
        const inputs = this.midiAccess.inputs.values();
        const outputs = this.midiAccess.outputs.values();
        
        // Connect ALL available MIDI inputs
        const allInputs = Array.from(inputs);
        console.log(`[MIDIController] Found ${allInputs.length} MIDI input(s)`);
        
        // Connect ALL inputs for testing (EP-133 may use multiple ports)
        for (const input of allInputs) {
            if (input.state === 'connected') {
                const name = input.name.toLowerCase();
                console.log(`[MIDIController] Setting up listener for: ${input.name} (state: ${input.state})`);
                
                // Set handler for each input
                input.onmidimessage = (event) => {
                    console.log(`[MIDIController] ⚡ MIDI message received from ${input.name}:`, Array.from(event.data));
                    this.handleMIDIMessage(event);
                };
                
                // If this is EP-133, use as primary
                if (name.includes('ep-133') || name.includes('teenage') || name.includes('ko ii')) {
                    this.midiInput = input;
                    this.isConnected = true;
                    this.deviceName = input.name;
                    console.log('[MIDIController] Primary input set to:', input.name);
                }
            }
        }
        
        // If primary input not set, use first available
        if (!this.midiInput && allInputs.length > 0) {
            this.midiInput = allInputs[0];
            this.isConnected = true;
            this.deviceName = allInputs[0].name;
            console.log('[MIDIController] Using first available input as primary:', allInputs[0].name);
        }
        
        // Search for EP-133 among outputs
        for (const output of outputs) {
            const name = output.name.toLowerCase();
            if (name.includes('ep-133') || name.includes('teenage') || name.includes('ko ii')) {
                this.midiOutput = output;
                console.log('[MIDIController] Found EP-133 output:', output.name);
            }
        }
    }
    
    /**
     * Connect MIDI input (deprecated method, now uses findAndConnectDevice)
     */
    connectInput(input) {
        // This method is no longer used directly
        // All connections are made in findAndConnectDevice
        console.log('[MIDIController] connectInput called for:', input.name);
    }
    
    /**
     * Handle MIDI messages
     */
    handleMIDIMessage(event) {
        const [status, data1, data2] = event.data;
        const messageType = status & 0xF0;
        const channel = status & 0x0F;
        
        // Log all MIDI messages for debugging
        const messageTypeName = this.getMIDIMessageTypeName(messageType);
        console.log(`[MIDIController] MIDI: ${messageTypeName} (0x${messageType.toString(16)}), data1=${data1}, data2=${data2}, channel=${channel}`);
        
        // Note On (0x90)
        if (messageType === 0x90) {
            const note = data1;
            const velocity = data2;
            if (velocity > 0) {
                this.handleNoteOn(note, velocity);
            } else {
                // Note Off as Note On with velocity=0
                console.log(`[MIDIController] Note Off: ${note}`);
            }
        }
        // Note Off (0x80)
        else if (messageType === 0x80) {
            const note = data1;
            const velocity = data2;
            console.log(`[MIDIController] Note Off: ${note}, velocity=${velocity}`);
        }
        // Control Change (0xB0)
        else if (messageType === 0xB0) {
            const cc = data1;
            const value = data2;
            console.log(`[MIDIController] Control Change: CC${cc} = ${value}`);
            this.handleControlChange(cc, value);
        }
        // Pitch Bend (0xE0)
        else if (messageType === 0xE0) {
            const lsb = data1;
            const msb = data2;
            const value = (msb << 7) | lsb; // 14-bit value (0-16383)
            const normalized = (value - 8192) / 8192; // -1.0 to 1.0
            console.log(`[MIDIController] Pitch Bend: ${value} (normalized: ${normalized.toFixed(3)})`);
        }
        // Aftertouch / Channel Pressure (0xD0)
        else if (messageType === 0xD0) {
            const pressure = data1;
            console.log(`[MIDIController] Channel Pressure: ${pressure}`);
        }
        // Polyphonic Aftertouch (0xA0)
        else if (messageType === 0xA0) {
            const note = data1;
            const pressure = data2;
            console.log(`[MIDIController] Polyphonic Aftertouch: note=${note}, pressure=${pressure}`);
        }
        // Program Change (0xC0)
        else if (messageType === 0xC0) {
            const program = data1;
            console.log(`[MIDIController] Program Change: ${program}`);
        }
        // Unknown message type
        else {
            console.log(`[MIDIController] Unknown MIDI message type: 0x${messageType.toString(16)}`);
        }
    }
    
    /**
     * Get MIDI message type name
     */
    getMIDIMessageTypeName(messageType) {
        const types = {
            0x80: 'Note Off',
            0x90: 'Note On',
            0xA0: 'Polyphonic Aftertouch',
            0xB0: 'Control Change',
            0xC0: 'Program Change',
            0xD0: 'Channel Pressure',
            0xE0: 'Pitch Bend',
            0xF0: 'System Message'
        };
        return types[messageType] || `Unknown (0x${messageType.toString(16)})`;
    }
    
    /**
     * Handle Note On
     */
    handleNoteOn(note, velocity) {
        // Ignore Note Off (velocity = 0)
        if (velocity === 0) {
            return;
        }
        
        // First check if this is a parameter (knob/fader)
        const parameterSetting = this.noteParameterMapping[note];
        if (parameterSetting) {
            const range = this.ccRanges[parameterSetting];
            if (!range) {
                console.warn(`[MIDIController] No range defined for parameter: ${parameterSetting}`);
                return;
            }
            
            const currentValue = this.voidApp?.settings?.get(parameterSetting) || range.min;
            const now = Date.now();
            const timeSinceLastNote = now - this.knobState.lastTime;
            
            // Determine rotation direction based on interval between presses
            // Fast repeated presses = rotation in one direction
            // Slow or with pauses = direction change
            
            let direction = 'up'; // By default increase
            let step = (range.max - range.min) / 20; // Base step
            
            if (this.knobState.lastNote === note) {
                // Same note - continue in same direction
                if (timeSinceLastNote < 100) {
                    // Very fast repetition - accelerate
                    direction = this.knobState.direction || 'up';
                    this.knobState.repeatCount++;
                    step = step * (1 + this.knobState.repeatCount * 0.5);
                } else if (timeSinceLastNote < 300) {
                    // Medium speed - continue
                    direction = this.knobState.direction || 'up';
                    this.knobState.repeatCount = 0;
                } else {
                    // Pause - reset counter
                    this.knobState.repeatCount = 0;
                    direction = 'up';
                }
            } else {
                // New note - start over
                this.knobState.repeatCount = 0;
                direction = 'up';
            }
            
            // If reached maximum, change direction to decrease
            if (currentValue >= range.max && direction === 'up') {
                direction = 'down';
            }
            // If reached minimum, change direction to increase
            if (currentValue <= range.min && direction === 'down') {
                direction = 'up';
            }
            
            let newValue;
            if (direction === 'up') {
                newValue = Math.min(range.max, currentValue + step);
            } else {
                newValue = Math.max(range.min, currentValue - step);
            }
            
            // Update state
            this.knobState.lastNote = note;
            this.knobState.lastTime = now;
            this.knobState.direction = direction;
            
            console.log(`[MIDIController] 🎛️ Note ${note} (velocity ${velocity}) -> ${parameterSetting}: ${currentValue.toFixed(2)} → ${newValue.toFixed(2)} [${direction}]`);
            this.setParameter(parameterSetting, newValue);
            return;
        }
        
        // Check if this is parameter control via pads
        // Pads 48-55 (C3-G3) for parameter control when held
        if (note >= 48 && note <= 55) {
            const paramMap = {
                48: 'moduleSize',              // C3
                49: 'stemMultiplier',          // C#3
                50: 'letterSpacingMultiplier', // D3
                51: 'lineHeightMultiplier',    // D#3
                52: 'strokesNum',              // E3 - Lines
                53: 'strokeGapRatio',         // F3 - Contrast
                54: 'dashLength',             // F#3
                55: 'gapLength'               // G3
            };
            
            const param = paramMap[note];
            if (param) {
                const now = Date.now();
                const timeSinceLastNote = now - this.padParameterControl.lastTime;
                
                // If same note and less than 200ms passed - increase parameter
                if (this.padParameterControl.active === param && 
                    this.padParameterControl.lastNote === note && 
                    timeSinceLastNote < 200) {
                    this.incrementParameter(param, this.padParameterControl.increment);
                } else {
                    // New note - start parameter control
                    this.padParameterControl.active = param;
                    this.padParameterControl.lastNote = note;
                    this.padParameterControl.lastTime = now;
                    console.log(`[MIDIController] Pad ${note} pressed - controlling ${param}`);
                }
                return;
            }
        }
        
        // Otherwise check normal mapping (buttons/toggles)
        const mapping = this.noteMapping[note];
        if (!mapping) {
            // Log unknown notes for debugging
            console.log(`[MIDIController] Unknown note: ${note} (velocity: ${velocity})`);
            return;
        }
        
        switch (mapping.type) {
            case 'mode':
                this.setMode(mapping.value);
                break;
            case 'toggle':
                this.toggleSetting(mapping.setting);
                break;
            case 'action':
                this.executeAction(mapping.action);
                break;
        }
    }
    
    /**
     * Increment parameter by given value
     */
    incrementParameter(setting, increment) {
        const currentValue = this.voidApp?.settings?.get(setting);
        if (currentValue === undefined) return;
        
        const range = this.ccRanges[setting];
        if (!range) return;
        
        const newValue = Math.max(range.min, Math.min(range.max, currentValue + increment));
        console.log(`[MIDIController] Incrementing ${setting}: ${currentValue} -> ${newValue}`);
        this.setParameter(setting, newValue);
    }
    
    /**
     * Handle Control Change
     */
    handleControlChange(cc, value) {
        const setting = this.ccMapping[cc];
        if (!setting) return;
        
        const range = this.ccRanges[setting];
        if (!range) {
            console.warn(`[MIDIController] No range defined for setting: ${setting}`);
            return;
        }
        
        // Convert MIDI value (0-127) to parameter range
        const normalized = value / 127;
        const paramValue = range.min + (range.max - range.min) * normalized;
        
        console.log(`[MIDIController] CC${cc} -> ${setting}: ${paramValue.toFixed(2)} (MIDI: ${value})`);
        
        // Set value
        this.setParameter(setting, paramValue);
    }
    
    /**
     * Set rendering mode
     */
    setMode(mode) {
        if (!this.voidApp) return;
        
        // Find radio button for mode
        const radio = document.getElementById(`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`) || 
                     document.getElementById(`mode${mode.toUpperCase()}`);
        
        if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            // If not found by ID, try by value
            const radios = document.querySelectorAll(`input[name="renderMode"][value="${mode}"]`);
            if (radios.length > 0) {
                radios[0].checked = true;
                radios[0].dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }
    
    /**
     * Toggle setting
     */
    toggleSetting(setting) {
        if (!this.voidApp) return;
        
        // Find checkbox
        let checkbox = null;
        
        switch (setting) {
            case 'roundedCaps':
                checkbox = document.getElementById('roundedCapsCheckbox');
                break;
            case 'closeEnds':
                checkbox = document.getElementById('closeEndsCheckbox');
                break;
            case 'showGrid':
                checkbox = document.getElementById('showGridCheckbox');
                break;
            case 'showEndpoints':
                checkbox = document.getElementById('showEndpointsCheckbox');
                break;
            case 'showTest':
                checkbox = document.getElementById('showTestCheckbox');
                break;
            case 'randomFullRandom':
                checkbox = document.getElementById('randomFullRandomCheckbox');
                break;
            case 'useAlternativesInRandom':
                checkbox = document.getElementById('alternativeGlyphsCheckbox');
                break;
            case 'randomRounded':
                checkbox = document.getElementById('randomRoundedCheckbox');
                break;
            case 'randomCloseEnds':
                checkbox = document.getElementById('randomCloseEndsCheckbox');
                break;
            case 'randomDash':
                checkbox = document.getElementById('randomDashCheckbox');
                break;
        }
        
        if (checkbox) {
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
    
    /**
     * Execute action
     */
    executeAction(action) {
        if (!this.voidApp) return;
        
        let button = null;
        
        switch (action) {
            case 'renew':
                button = document.getElementById('renewBtn') || document.getElementById('renewRandomBtn');
                break;
            case 'export':
                button = document.getElementById('exportBtn');
                break;
            case 'copy':
                button = document.getElementById('copyBtn');
                break;
        }
        
        if (button) {
            button.click();
        }
    }
    
    /**
     * Set parameter
     */
    setParameter(setting, value) {
        if (!this.voidApp) return;
        
        // Determine slider ID and value formatting
        let sliderId = null;
        
        switch (setting) {
            case 'moduleSize':
                sliderId = 'moduleSizeSlider';
                value = Math.round(value);
                break;
            case 'stemMultiplier':
                sliderId = 'stemSlider';
                value = Math.round(value * 100) / 100;
                break;
            case 'letterSpacingMultiplier':
                sliderId = 'letterSpacingSlider';
                value = Math.round(value);
                break;
            case 'lineHeightMultiplier':
                sliderId = 'lineHeightSlider';
                value = Math.round(value);
                break;
            case 'strokesNum':
                sliderId = 'strokesSlider';
                value = Math.round(value);
                break;
            case 'strokeGapRatio':
                sliderId = 'strokeGapRatioSlider';
                value = Math.round(value * 10) / 10;
                break;
            case 'dashLength':
                sliderId = 'dashLengthSlider';
                value = Math.round(value * 100) / 100;
                break;
            case 'gapLength':
                sliderId = 'gapLengthSlider';
                value = Math.round(value * 100) / 100;
                break;
            // Random parameters handled via range sliders
            case 'randomStemMin':
            case 'randomStemMax':
            case 'randomStrokesMin':
            case 'randomStrokesMax':
            case 'randomContrastMin':
            case 'randomContrastMax':
            case 'randomDashLengthMin':
            case 'randomDashLengthMax':
            case 'randomGapLengthMin':
            case 'randomGapLengthMax':
                // For range sliders need to update via RangeSliderController
                if (this.voidApp.rangeSliderController) {
                    this.updateRangeSlider(setting, value);
                }
                return;
        }
        
        // Use sliderController for proper update
        if (sliderId && this.voidApp.sliderController) {
            console.log(`[MIDIController] Setting ${setting} via ${sliderId} to ${value}`);
            this.voidApp.sliderController.setValue(sliderId, value, true);
        } else {
            console.warn(`[MIDIController] Cannot set ${setting}: sliderId=${sliderId}, sliderController=${!!this.voidApp?.sliderController}`);
        }
    }
    
    /**
     * Update range slider
     */
    updateRangeSlider(setting, value) {
        if (!this.voidApp || !this.voidApp.rangeSliderController) return;
        
        // Round value depending on parameter type
        if (setting.includes('Stem') || setting.includes('Contrast') || setting.includes('DashLength') || setting.includes('GapLength')) {
            value = Math.round(value * 100) / 100;
        } else if (setting.includes('Strokes')) {
            value = Math.round(value);
        }
        
        // Determine which range slider to update and get current values
        let sliderId = null;
        let isMin = false;
        
        switch (setting) {
            case 'randomStemMin':
                sliderId = 'randomStemRangeSlider';
                isMin = true;
                break;
            case 'randomStemMax':
                sliderId = 'randomStemRangeSlider';
                isMin = false;
                break;
            case 'randomStrokesMin':
                sliderId = 'randomStrokesRangeSlider';
                isMin = true;
                break;
            case 'randomStrokesMax':
                sliderId = 'randomStrokesRangeSlider';
                isMin = false;
                break;
            case 'randomContrastMin':
                sliderId = 'randomContrastRangeSlider';
                isMin = true;
                break;
            case 'randomContrastMax':
                sliderId = 'randomContrastRangeSlider';
                isMin = false;
                break;
            case 'randomDashLengthMin':
                sliderId = 'randomDashLengthRangeSlider';
                isMin = true;
                break;
            case 'randomDashLengthMax':
                sliderId = 'randomDashLengthRangeSlider';
                isMin = false;
                break;
            case 'randomGapLengthMin':
                sliderId = 'randomGapLengthRangeSlider';
                isMin = true;
                break;
            case 'randomGapLengthMax':
                sliderId = 'randomGapLengthRangeSlider';
                isMin = false;
                break;
        }
        
        if (!sliderId) return;
        
        // Get current slider values
        const currentValues = this.voidApp.rangeSliderController.getValues(sliderId);
        if (!currentValues) return;
        
        // Update corresponding value
        if (isMin) {
            this.voidApp.rangeSliderController.setValues(sliderId, value, currentValues.max, true);
        } else {
            this.voidApp.rangeSliderController.setValues(sliderId, currentValues.min, value, true);
        }
        
        // Update settings
        this.voidApp.settings.set(setting, value);
        
        // Update renderer
        if (this.voidApp.updateRenderer) {
            this.voidApp.updateRenderer();
        }
    }
    
    /**
     * Handle MIDI device state changes
     */
    handleStateChange(event) {
        if (event.port.state === 'connected' && event.port.type === 'input') {
            const name = event.port.name.toLowerCase();
            if (name.includes('ep-133') || name.includes('teenage') || name.includes('ko ii')) {
                this.connectInput(event.port);
            }
        } else if (event.port.state === 'disconnected' && event.port === this.midiInput) {
            this.isConnected = false;
            this.deviceName = null;
            console.log('[MIDIController] MIDI device disconnected');
        }
    }
    
    /**
     * Disconnect MIDI
     */
    disconnect() {
        if (this.midiInput) {
            this.midiInput.onmidimessage = null;
            this.midiInput = null;
        }
        
        this.isConnected = false;
        this.deviceName = null;
        
        console.log('[MIDIController] Disconnected');
    }
}
