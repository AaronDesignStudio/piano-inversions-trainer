// Piano key mappings
const noteToMidi = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

// Chord definitions (intervals from root)
const chordIntervals = {
    'major': [0, 4, 7],
    'minor': [0, 3, 7]
};

// Fingering patterns for inversions
const fingeringPatterns = {
    'right': {
        'major': {
            'root': [1, 3, 5],
            'first': [1, 2, 5],
            'second': [1, 3, 5]
        },
        'minor': {
            'root': [1, 3, 5],
            'first': [1, 2, 5],
            'second': [1, 3, 5]
        }
    },
    'left': {
        'major': {
            'root': [5, 3, 1],
            'first': [5, 3, 1],
            'second': [5, 2, 1]
        },
        'minor': {
            'root': [5, 3, 1],
            'first': [5, 3, 1],
            'second': [5, 2, 1]
        }
    }
};

class PianoInversionsTrainer {
    constructor() {
        this.piano = document.getElementById('piano');
        this.isPlaying = false;
        this.currentInversionIndex = 0;
        this.inversions = [];
        this.metronomeInterval = null;
        this.direction = 'up-down';
        this.currentDirection = 'up';
        this.sampler = null;
        this.isAudioReady = false;
        this.metronomeSynth = null;
        this.subdivisionInterval = null;
        this.currentSubdivision = 0;
        this.chordTempos = this.loadChordTempos();
        
        // Practice timer variables
        this.practiceStartTime = null;
        this.practiceElapsedTime = 0;
        this.practiceTimerInterval = null;
        this.totalPracticeTime = this.loadTotalPracticeTime();
        this.lastCheckedDate = new Date().toDateString();
        this.midnightCheckInterval = null;
        
        this.initializeAudio();
        this.initializePiano();
        this.attachEventListeners();
        this.updateDisplay();
        this.updateChordDropdownDisplay();
        
        // Load saved tempo for initial chord and hand
        const initialChord = document.getElementById('chord-select').value;
        const initialHand = document.getElementById('hand-select').value;
        const savedTempo = this.getChordTempo(initialChord, initialHand);
        document.getElementById('tempo-input').value = savedTempo;
        
        // Update hand dropdown display
        this.updateHandDropdownDisplay();
        
        // Ensure dropdowns show clean text initially
        document.getElementById('chord-select').blur();
        document.getElementById('hand-select').blur();
        
        // Initialize timer display
        this.updatePracticeTimerDisplay();
        
        // Start checking for midnight
        this.startMidnightCheck();
    }
    
    loadChordTempos() {
        const saved = localStorage.getItem('chordHandTempos');
        return saved ? JSON.parse(saved) : {};
    }
    
    loadTotalPracticeTime() {
        // Check if we need to reset based on date
        const lastPracticeDate = localStorage.getItem('lastPracticeDate');
        const today = new Date().toDateString();
        
        if (lastPracticeDate !== today) {
            // It's a new day, reset the practice time
            localStorage.setItem('lastPracticeDate', today);
            localStorage.setItem('totalPracticeTime', '0');
            return 0;
        }
        
        const saved = localStorage.getItem('totalPracticeTime');
        return saved ? parseInt(saved) : 0;
    }
    
    saveTotalPracticeTime() {
        // Always save the current date when saving practice time
        const today = new Date().toDateString();
        localStorage.setItem('lastPracticeDate', today);
        localStorage.setItem('totalPracticeTime', this.totalPracticeTime.toString());
    }
    
    updatePracticeTimerDisplay() {
        const totalSeconds = Math.floor((this.practiceElapsedTime + this.totalPracticeTime) / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('practice-timer-display').textContent = display;
    }
    
    startMidnightCheck() {
        // Check every minute for date change
        this.midnightCheckInterval = setInterval(() => {
            const currentDate = new Date().toDateString();
            if (currentDate !== this.lastCheckedDate) {
                // It's a new day!
                this.handleMidnightReset();
                this.lastCheckedDate = currentDate;
            }
        }, 60000); // Check every minute
    }
    
    handleMidnightReset() {
        // If we're currently practicing, save the current session
        if (this.practiceStartTime) {
            this.stopPracticeTimer();
        }
        
        // Reset the total practice time for the new day
        this.totalPracticeTime = 0;
        localStorage.setItem('totalPracticeTime', '0');
        localStorage.setItem('lastPracticeDate', new Date().toDateString());
        
        // Update the display
        this.updatePracticeTimerDisplay();
        
        // If we were practicing, restart the timer for the new day
        if (this.isPlaying) {
            this.startPracticeTimer();
        }
    }
    
    startPracticeTimer() {
        if (!this.practiceStartTime) {
            this.practiceStartTime = Date.now();
            this.practiceTimerInterval = setInterval(() => {
                this.practiceElapsedTime = Date.now() - this.practiceStartTime;
                this.updatePracticeTimerDisplay();
            }, 1000);
        }
    }
    
    stopPracticeTimer() {
        if (this.practiceStartTime) {
            this.practiceElapsedTime = Date.now() - this.practiceStartTime;
            this.totalPracticeTime += this.practiceElapsedTime;
            this.saveTotalPracticeTime();
            clearInterval(this.practiceTimerInterval);
            this.practiceStartTime = null;
            this.practiceElapsedTime = 0;
            this.updatePracticeTimerDisplay();
        }
    }
    
    saveChordTempo(chord, hand, tempo) {
        const key = `${chord}-${hand}`;
        this.chordTempos[key] = tempo;
        localStorage.setItem('chordHandTempos', JSON.stringify(this.chordTempos));
        this.updateChordDropdownDisplay();
        this.updateHandDropdownDisplay();
    }
    
    getChordTempo(chord, hand) {
        const key = `${chord}-${hand}`;
        return this.chordTempos[key] || 20; // Default tempo is 20
    }
    
    updateChordDropdownDisplay() {
        const chordSelect = document.getElementById('chord-select');
        const options = chordSelect.options;
        
        for (let i = 0; i < options.length; i++) {
            const chord = options[i].value;
            // Get original chord name from data attribute or parse from value
            const isMinor = chord.includes('m') && chord.length === 2;
            const chordName = isMinor ? `${chord.replace('m', '')} Minor` : `${chord} Major`;
            
            // Store both clean and detailed versions
            options[i].textContent = chordName;
            options[i].setAttribute('data-clean-text', chordName);
            
            const leftTempo = this.getChordTempo(chord, 'left');
            const rightTempo = this.getChordTempo(chord, 'right');
            const leftDisplay = leftTempo === 20 ? '--' : leftTempo.toString().padStart(3);
            const rightDisplay = rightTempo === 20 ? '--' : rightTempo.toString().padStart(3);
            const paddedChordName = chordName.padEnd(10);
            options[i].setAttribute('data-tempo-text', `${paddedChordName} L:${leftDisplay} R:${rightDisplay}`);
        }
    }
    
    updateHandDropdownDisplay() {
        const handSelect = document.getElementById('hand-select');
        const currentChord = document.getElementById('chord-select').value;
        const options = handSelect.options;
        
        for (let i = 0; i < options.length; i++) {
            const hand = options[i].value;
            const handName = hand === 'right' ? 'Right Hand' : 'Left Hand';
            
            // Store both clean and detailed versions
            options[i].textContent = handName;
            options[i].setAttribute('data-clean-text', handName);
            
            const tempo = this.getChordTempo(currentChord, hand);
            if (tempo !== 20) {
                options[i].setAttribute('data-tempo-text', `${handName} • ${tempo} BPM`);
            } else {
                options[i].setAttribute('data-tempo-text', handName);
            }
        }
    }
    
    async initializeAudio() {
        // Create a sampler with grand piano samples
        this.sampler = new Tone.Sampler({
            urls: {
                'C4': 'C4.mp3',
                'D#4': 'Ds4.mp3',
                'F#4': 'Fs4.mp3',
                'A4': 'A4.mp3',
            },
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
            onload: () => {
                this.isAudioReady = true;
                console.log('Audio loaded successfully');
                document.getElementById('audio-status').style.display = 'none';
            }
        }).toDestination();
        
        // Set initial volume
        this.sampler.volume.value = -10; // Reduce volume slightly
        
        // Create metronome synth for tick sounds
        this.metronomeSynth = new Tone.Synth({
            oscillator: {
                type: 'sine'
            },
            envelope: {
                attack: 0.001,
                decay: 0.1,
                sustain: 0,
                release: 0.1
            }
        }).toDestination();
        
        // Set metronome volume to be subtle
        this.metronomeSynth.volume.value = -20;
    }
    
    initializePiano() {
        // Create 4 octaves of keys (C3 to B6)
        const startOctave = 3;
        const endOctave = 6;
        
        // First, create all white keys
        for (let octave = startOctave; octave <= endOctave; octave++) {
            const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
            
            whiteNotes.forEach((note) => {
                const whiteKey = this.createKey(note, octave, 'white');
                this.piano.appendChild(whiteKey);
            });
        }
        
        // Then, create black keys with proper positioning
        for (let octave = startOctave; octave <= endOctave; octave++) {
            // Black keys pattern: C# D# (gap) F# G# A#
            const blackKeyData = [
                { note: 'C#', position: 0 },
                { note: 'D#', position: 1 },
                { note: 'F#', position: 3 },
                { note: 'G#', position: 4 },
                { note: 'A#', position: 5 }
            ];
            
            blackKeyData.forEach(({ note, position }) => {
                const blackKey = this.createKey(note, octave, 'black');
                // Calculate position based on octave and key position
                const octaveOffset = (octave - startOctave) * 7;
                const keyPosition = octaveOffset + position;
                // Position between white keys (40px width per white key)
                // Shift 27.5px from the start of the white key (40px - 12.5px for half black key width)
                blackKey.style.left = `${(keyPosition + 1) * 40 - 12.5 + 5}px`;
                this.piano.appendChild(blackKey);
            });
        }
    }
    
    createKey(note, octave, color) {
        const key = document.createElement('div');
        key.className = `key ${color}-key`;
        key.dataset.note = note;
        key.dataset.octave = octave;
        key.dataset.midi = this.getMidiNumber(note, octave);
        
        const label = document.createElement('span');
        label.className = 'key-label';
        label.textContent = note;
        key.appendChild(label);
        
        // Add click event to play note
        key.addEventListener('click', () => {
            if (this.isAudioReady) {
                const noteName = note + octave;
                this.sampler.triggerAttackRelease(noteName, '8n');
            }
        });
        
        return key;
    }
    
    getMidiNumber(note, octave) {
        return (octave + 1) * 12 + noteToMidi[note];
    }
    
    attachEventListeners() {
        // Play/Pause toggle button
        const playPauseBtn = document.getElementById('play-pause-btn');
        playPauseBtn.addEventListener('click', () => {
            if (this.isPlaying) {
                this.pause();
                playPauseBtn.classList.remove('playing');
                playPauseBtn.querySelector('.play-icon').style.display = 'block';
                playPauseBtn.querySelector('.pause-icon').style.display = 'none';
            } else {
                this.play();
                playPauseBtn.classList.add('playing');
                playPauseBtn.querySelector('.play-icon').style.display = 'none';
                playPauseBtn.querySelector('.pause-icon').style.display = 'block';
            }
        });
        
        // Restart button - reset and start playing from beginning
        document.getElementById('restart-btn').addEventListener('click', () => {
            const playPauseBtn = document.getElementById('play-pause-btn');
            
            // Reset to beginning
            this.pause();
            this.currentInversionIndex = 0;
            this.currentDirection = 'up';
            this.clearHighlights();
            
            // Start playing again
            this.play();
            
            // Update button state to show pause icon
            playPauseBtn.classList.add('playing');
            playPauseBtn.querySelector('.play-icon').style.display = 'none';
            playPauseBtn.querySelector('.pause-icon').style.display = 'block';
        });
        
        // Update when settings change
        document.getElementById('octave-range').addEventListener('change', () => {
            this.reset();
            this.updateDisplay();
        });
        
        // Special handling for chord selection to load saved tempo
        const chordSelect = document.getElementById('chord-select');
        chordSelect.addEventListener('change', () => {
            const selectedChord = chordSelect.value;
            const selectedHand = document.getElementById('hand-select').value;
            const savedTempo = this.getChordTempo(selectedChord, selectedHand);
            document.getElementById('tempo-input').value = savedTempo;
            
            this.updateHandDropdownDisplay();
            this.reset();
            this.updateDisplay();
        });
        
        // Show tempo info when chord dropdown is clicked
        const showChordTempos = () => {
            const options = chordSelect.options;
            for (let i = 0; i < options.length; i++) {
                const tempoText = options[i].getAttribute('data-tempo-text');
                if (tempoText) {
                    options[i].textContent = tempoText;
                }
            }
        };
        
        chordSelect.addEventListener('mousedown', showChordTempos);
        chordSelect.addEventListener('touchstart', showChordTempos);
        
        // Hide tempo info when chord dropdown loses focus
        chordSelect.addEventListener('change', () => {
            setTimeout(() => {
                const options = chordSelect.options;
                for (let i = 0; i < options.length; i++) {
                    const cleanText = options[i].getAttribute('data-clean-text');
                    if (cleanText) {
                        options[i].textContent = cleanText;
                    }
                }
            }, 100);
        });
        
        chordSelect.addEventListener('blur', () => {
            const options = chordSelect.options;
            for (let i = 0; i < options.length; i++) {
                const cleanText = options[i].getAttribute('data-clean-text');
                if (cleanText) {
                    options[i].textContent = cleanText;
                }
            }
        });
        
        // Special handling for hand selection to load saved tempo
        const handSelect = document.getElementById('hand-select');
        handSelect.addEventListener('change', () => {
            const selectedChord = document.getElementById('chord-select').value;
            const selectedHand = handSelect.value;
            const savedTempo = this.getChordTempo(selectedChord, selectedHand);
            document.getElementById('tempo-input').value = savedTempo;
            
            this.reset();
            this.updateDisplay();
        });
        
        // Show tempo info when hand dropdown is clicked
        const showHandTempos = () => {
            const options = handSelect.options;
            for (let i = 0; i < options.length; i++) {
                const tempoText = options[i].getAttribute('data-tempo-text');
                if (tempoText) {
                    options[i].textContent = tempoText;
                }
            }
        };
        
        handSelect.addEventListener('mousedown', showHandTempos);
        handSelect.addEventListener('touchstart', showHandTempos);
        
        // Hide tempo info when hand dropdown changes or loses focus
        handSelect.addEventListener('change', () => {
            setTimeout(() => {
                const options = handSelect.options;
                for (let i = 0; i < options.length; i++) {
                    const cleanText = options[i].getAttribute('data-clean-text');
                    if (cleanText) {
                        options[i].textContent = cleanText;
                    }
                }
            }, 100);
        });
        
        handSelect.addEventListener('blur', () => {
            const options = handSelect.options;
            for (let i = 0; i < options.length; i++) {
                const cleanText = options[i].getAttribute('data-clean-text');
                if (cleanText) {
                    options[i].textContent = cleanText;
                }
            }
        });
        
        document.getElementById('show-fingering').addEventListener('change', () => {
            this.updateDisplay();
        });
        
        
        // Tempo controls
        const tempoInput = document.getElementById('tempo-input');
        const tempoDecrease = document.getElementById('tempo-decrease');
        const tempoIncrease = document.getElementById('tempo-increase');
        
        let tempoHoldInterval = null;
        let tempoHoldTimeout = null;
        let tempoHoldStartTime = null;
        
        const updateTempo = (delta) => {
            const currentTempo = parseInt(tempoInput.value);
            const newTempo = currentTempo + delta;
            const minTempo = parseInt(tempoInput.min);
            const maxTempo = parseInt(tempoInput.max);
            
            if (newTempo >= minTempo && newTempo <= maxTempo) {
                tempoInput.value = newTempo;
                // Save tempo for current chord and hand
                const currentChord = document.getElementById('chord-select').value;
                const currentHand = document.getElementById('hand-select').value;
                this.saveChordTempo(currentChord, currentHand, newTempo);
                // If playing, update the interval without restarting
                if (this.isPlaying) {
                    const subdivisions = parseInt(document.getElementById('subdivision-select').value);
                    const beatInterval = 60000 / newTempo;
                    
                    if (subdivisions === 0) {
                        // Clear subdivision interval if exists
                        if (this.subdivisionInterval) {
                            clearInterval(this.subdivisionInterval);
                            this.subdivisionInterval = null;
                        }
                        // Use regular metronome interval
                        if (this.metronomeInterval) {
                            clearInterval(this.metronomeInterval);
                        }
                        this.metronomeInterval = setInterval(() => {
                            this.nextInversion();
                        }, beatInterval);
                    } else if (this.subdivisionInterval) {
                        clearInterval(this.subdivisionInterval);
                        const subdivisionInterval = beatInterval / subdivisions;
                        
                        this.subdivisionInterval = setInterval(() => {
                            if (this.currentSubdivision === 0) {
                                this.nextInversion();
                                if (this.metronomeSynth) {
                                    this.metronomeSynth.triggerAttackRelease('C5', '16n');
                                }
                            } else {
                                if (this.metronomeSynth) {
                                    this.metronomeSynth.triggerAttackRelease('C6', '32n');
                                }
                            }
                            this.currentSubdivision = (this.currentSubdivision + 1) % subdivisions;
                        }, subdivisionInterval);
                    }
                }
            }
        };
        
        const startTempoHold = (direction) => {
            // Initial single increment
            updateTempo(direction);
            
            tempoHoldStartTime = Date.now();
            
            // Start slow repeat after 500ms
            tempoHoldTimeout = setTimeout(() => {
                tempoHoldInterval = setInterval(() => {
                    const holdDuration = Date.now() - tempoHoldStartTime;
                    
                    // Accelerate based on hold duration
                    let increment = 1;
                    if (holdDuration > 3000) {
                        // After 3 seconds, increase by 5
                        increment = 5;
                    }
                    
                    updateTempo(direction * increment);
                }, 100); // Update every 100ms
            }, 500);
        };
        
        const stopTempoHold = () => {
            if (tempoHoldTimeout) {
                clearTimeout(tempoHoldTimeout);
                tempoHoldTimeout = null;
            }
            if (tempoHoldInterval) {
                clearInterval(tempoHoldInterval);
                tempoHoldInterval = null;
            }
            tempoHoldStartTime = null;
        };
        
        // Decrease button handlers
        tempoDecrease.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startTempoHold(-1);
        });
        
        tempoDecrease.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startTempoHold(-1);
        });
        
        // Increase button handlers
        tempoIncrease.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startTempoHold(1);
        });
        
        tempoIncrease.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startTempoHold(1);
        });
        
        // Stop handlers for both buttons
        ['mouseup', 'mouseleave', 'touchend', 'touchcancel'].forEach(event => {
            tempoDecrease.addEventListener(event, stopTempoHold);
            tempoIncrease.addEventListener(event, stopTempoHold);
        });
        
        // Global mouseup to handle when mouse is released outside button
        document.addEventListener('mouseup', stopTempoHold);
        
        // Handle manual tempo input changes
        tempoInput.addEventListener('change', () => {
            // Validate and clamp the value
            let newTempo = parseInt(tempoInput.value);
            const minTempo = parseInt(tempoInput.min);
            const maxTempo = parseInt(tempoInput.max);
            
            if (isNaN(newTempo)) {
                newTempo = 20; // Default value
            } else if (newTempo < minTempo) {
                newTempo = minTempo;
            } else if (newTempo > maxTempo) {
                newTempo = maxTempo;
            }
            
            tempoInput.value = newTempo;
            
            // Save tempo for current chord and hand
            const currentChord = document.getElementById('chord-select').value;
            const currentHand = document.getElementById('hand-select').value;
            this.saveChordTempo(currentChord, currentHand, newTempo);
            
            // If playing, update the interval
            if (this.isPlaying) {
                const subdivisions = parseInt(document.getElementById('subdivision-select').value);
                const beatInterval = 60000 / newTempo;
                
                if (subdivisions === 0) {
                    // Clear subdivision interval if exists
                    if (this.subdivisionInterval) {
                        clearInterval(this.subdivisionInterval);
                        this.subdivisionInterval = null;
                    }
                    // Use regular metronome interval
                    if (this.metronomeInterval) {
                        clearInterval(this.metronomeInterval);
                    }
                    this.metronomeInterval = setInterval(() => {
                        this.nextInversion();
                    }, beatInterval);
                } else {
                    // Clear regular metronome if exists
                    if (this.metronomeInterval) {
                        clearInterval(this.metronomeInterval);
                        this.metronomeInterval = null;
                    }
                    if (this.subdivisionInterval) {
                        clearInterval(this.subdivisionInterval);
                    }
                    const subdivisionInterval = beatInterval / subdivisions;
                    
                    this.subdivisionInterval = setInterval(() => {
                        if (this.currentSubdivision === 0) {
                            this.nextInversion();
                            if (this.metronomeSynth) {
                                this.metronomeSynth.triggerAttackRelease('C5', '16n');
                            }
                        } else {
                            if (this.metronomeSynth) {
                                this.metronomeSynth.triggerAttackRelease('C6', '32n');
                            }
                        }
                        this.currentSubdivision = (this.currentSubdivision + 1) % subdivisions;
                    }, subdivisionInterval);
                }
            }
        });
        
        // Also handle when pressing Enter
        tempoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                tempoInput.blur(); // This will trigger the change event
            }
        });
        
        // Handle subdivision change
        document.getElementById('subdivision-select').addEventListener('change', () => {
            if (this.isPlaying) {
                // Update the metronome without restarting playback
                const tempoInput = document.getElementById('tempo-input');
                const newTempo = parseInt(tempoInput.value);
                const subdivisions = parseInt(document.getElementById('subdivision-select').value);
                const beatInterval = 60000 / newTempo;
                
                // Clear existing intervals
                if (this.metronomeInterval) {
                    clearInterval(this.metronomeInterval);
                    this.metronomeInterval = null;
                }
                if (this.subdivisionInterval) {
                    clearInterval(this.subdivisionInterval);
                    this.subdivisionInterval = null;
                }
                
                if (subdivisions === 0) {
                    // No metronome, just chord changes
                    this.metronomeInterval = setInterval(() => {
                        this.nextInversion();
                    }, beatInterval);
                } else {
                    // Start subdivision ticker
                    const subdivisionInterval = beatInterval / subdivisions;
                    this.currentSubdivision = 1; // Avoid immediate chord change
                    
                    this.subdivisionInterval = setInterval(() => {
                        if (this.currentSubdivision === 0) {
                            this.nextInversion();
                            if (this.metronomeSynth) {
                                this.metronomeSynth.triggerAttackRelease('C5', '16n');
                            }
                        } else {
                            if (this.metronomeSynth) {
                                this.metronomeSynth.triggerAttackRelease('C6', '32n');
                            }
                        }
                        this.currentSubdivision = (this.currentSubdivision + 1) % subdivisions;
                    }, subdivisionInterval);
                }
            }
        });
    }
    
    
    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.generateInversions();
        this.currentSubdivision = 0;
        this.startPracticeTimer();
        
        const bpm = parseInt(document.getElementById('tempo-input').value);
        const beatInterval = 60000 / bpm; // Convert BPM to milliseconds
        const subdivisions = parseInt(document.getElementById('subdivision-select').value);
        
        // Show first inversion immediately
        this.updateDisplay();
        
        if (subdivisions === 0) {
            // No metronome, just chord changes
            this.metronomeInterval = setInterval(() => {
                this.nextInversion();
            }, beatInterval);
        } else {
            // Start subdivision ticker
            const subdivisionInterval = beatInterval / subdivisions;
            // Start with subdivision 1 to avoid immediate chord change
            this.currentSubdivision = 1;
            
            this.subdivisionInterval = setInterval(() => {
                if (this.currentSubdivision === 0) {
                    // Main beat - play chord
                    this.nextInversion();
                    // Play a slightly louder tick for the downbeat
                    if (this.metronomeSynth) {
                        this.metronomeSynth.triggerAttackRelease('C5', '16n');
                    }
                } else {
                    // Subdivision ticks - just play metronome
                    if (this.metronomeSynth) {
                        this.metronomeSynth.triggerAttackRelease('C6', '32n');
                    }
                }
                
                // Increment subdivision counter
                this.currentSubdivision = (this.currentSubdivision + 1) % subdivisions;
            }, subdivisionInterval);
        }
    }
    
    pause() {
        this.isPlaying = false;
        this.stopPracticeTimer();
        if (this.metronomeInterval) {
            clearInterval(this.metronomeInterval);
            this.metronomeInterval = null;
        }
        if (this.subdivisionInterval) {
            clearInterval(this.subdivisionInterval);
            this.subdivisionInterval = null;
        }
        this.currentSubdivision = 0;
    }
    
    reset() {
        this.pause();
        this.currentInversionIndex = 0;
        this.currentDirection = 'up';
        this.inversions = [];
        this.clearHighlights();
        this.updateDisplay();
    }
    
    generateInversions() {
        this.inversions = [];
        const chordSelect = document.getElementById('chord-select').value;
        const octaveRange = parseInt(document.getElementById('octave-range').value);
        const direction = 'up-down';
        
        // Parse chord info
        const isMinor = chordSelect.includes('m');
        const rootNote = isMinor ? chordSelect.replace('m', '') : chordSelect;
        const chordType = isMinor ? 'minor' : 'major';
        
        // Generate inversions for each octave
        const startOctave = 3;
        for (let oct = 0; oct < octaveRange; oct++) {
            const currentOctave = startOctave + oct;
            
            // Root position
            this.inversions.push({
                notes: this.getChordNotes(rootNote, currentOctave, chordType, 'root'),
                position: 'root',
                octave: currentOctave,
                chordName: `${chordSelect} ${isMinor ? 'Minor' : 'Major'}`,
                chordType: chordType
            });
            
            // First inversion
            this.inversions.push({
                notes: this.getChordNotes(rootNote, currentOctave, chordType, 'first'),
                position: 'first',
                octave: currentOctave,
                chordName: `${chordSelect} ${isMinor ? 'Minor' : 'Major'}`,
                chordType: chordType
            });
            
            // Second inversion
            this.inversions.push({
                notes: this.getChordNotes(rootNote, currentOctave, chordType, 'second'),
                position: 'second',
                octave: currentOctave,
                chordName: `${chordSelect} ${isMinor ? 'Minor' : 'Major'}`,
                chordType: chordType
            });
        }
        
        this.direction = direction;
    }
    
    getChordNotes(root, octave, chordType, inversion) {
        const intervals = chordIntervals[chordType];
        const rootMidi = this.getMidiNumber(root, octave);
        
        let notes = intervals.map(interval => rootMidi + interval);
        
        // Apply inversion
        if (inversion === 'first') {
            notes = [notes[1], notes[2], notes[0] + 12];
        } else if (inversion === 'second') {
            notes = [notes[2], notes[0] + 12, notes[1] + 12];
        }
        
        return notes;
    }
    
    nextInversion() {
        // Always use up-down pattern
        if (this.currentDirection === 'up') {
            this.currentInversionIndex++;
            if (this.currentInversionIndex >= this.inversions.length) {
                this.currentInversionIndex = this.inversions.length - 2;
                this.currentDirection = 'down';
            }
        } else {
            this.currentInversionIndex--;
            if (this.currentInversionIndex < 0) {
                this.currentInversionIndex = 1;
                this.currentDirection = 'up';
            }
        }
        
        this.updateDisplay();
    }
    
    updateDisplay() {
        this.clearHighlights();
        
        if (this.inversions.length === 0 && !this.isPlaying) {
            // Show default state
            const chordSelect = document.getElementById('chord-select').value;
            const isMinor = chordSelect.includes('m');
            const hand = document.getElementById('hand-select').value;
            const handText = hand === 'right' ? 'Right Hand' : 'Left Hand';
            document.getElementById('current-chord').textContent = 
                `${chordSelect} ${isMinor ? 'Minor' : 'Major'} - ${handText}`;
            document.getElementById('inversion-label').style.display = 'none';
            return;
        }
        
        if (this.inversions.length === 0) return;
        
        const current = this.inversions[this.currentInversionIndex];
        if (!current) return;
        
        // Update status display
        const positionNames = {
            'root': 'Root Position',
            'first': 'First Inversion',
            'second': 'Second Inversion'
        };
        
        // Get the current hand
        const hand = document.getElementById('hand-select').value;
        const handText = hand === 'right' ? 'Right Hand' : 'Left Hand';
        
        // Update chord display with hand information
        document.getElementById('current-chord').textContent = `${current.chordName} - ${handText}`;
        
        // Highlight keys
        const showFingering = document.getElementById('show-fingering').checked;
        const fingering = fingeringPatterns[hand][current.chordType][current.position];
        
        // Keep track of active keys for positioning the label
        let activeKeys = [];
        
        current.notes.forEach((midiNote, index) => {
            const key = this.piano.querySelector(`[data-midi="${midiNote}"]`);
            if (key) {
                key.classList.add('active');
                activeKeys.push(key);
                
                if (showFingering) {
                    const fingerNumber = document.createElement('div');
                    fingerNumber.className = 'finger-number';
                    fingerNumber.textContent = fingering[index];
                    key.appendChild(fingerNumber);
                }
            }
        });
        
        // Position and show the inversion label
        if (activeKeys.length > 0) {
            const inversionLabel = document.getElementById('inversion-label');
            const inversionText = document.getElementById('inversion-text');
            
            // Get the leftmost and rightmost active keys
            const keyPositions = activeKeys.map(key => key.offsetLeft);
            const leftmostPos = Math.min(...keyPositions);
            const rightmostKey = activeKeys.find(key => key.offsetLeft === Math.max(...keyPositions));
            const rightmostPos = rightmostKey.offsetLeft + rightmostKey.offsetWidth;
            
            // Set label text
            inversionText.textContent = positionNames[current.position];
            
            // Position the label - account for piano centering
            const pianoOffsetLeft = this.piano.offsetLeft;
            
            inversionLabel.style.left = `${leftmostPos + pianoOffsetLeft}px`;
            inversionLabel.style.width = `${rightmostPos - leftmostPos}px`;
            inversionLabel.style.display = 'block';
        }
        
        // Play the chord if audio is ready
        if (this.isPlaying && this.isAudioReady) {
            this.playChord(current.notes);
        }
    }
    
    playChord(midiNotes) {
        if (!this.isAudioReady || !this.sampler) return;
        
        // Convert MIDI numbers to note names
        const noteNames = midiNotes.map(midi => this.midiToNoteName(midi));
        
        // Play chord as a slight arpeggio for more realistic sound
        const now = Tone.now();
        noteNames.forEach((note, index) => {
            // Slight delay between notes (0.01 seconds)
            this.sampler.triggerAttackRelease(note, '2n', now + index * 0.01);
        });
    }
    
    midiToNoteName(midi) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(midi / 12) - 1;
        const noteIndex = midi % 12;
        return notes[noteIndex] + octave;
    }
    
    clearHighlights() {
        this.piano.querySelectorAll('.key').forEach(key => {
            key.classList.remove('active');
            const fingerNumber = key.querySelector('.finger-number');
            if (fingerNumber) {
                fingerNumber.remove();
            }
        });
        // Hide the inversion label
        document.getElementById('inversion-label').style.display = 'none';
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PianoInversionsTrainer();
});