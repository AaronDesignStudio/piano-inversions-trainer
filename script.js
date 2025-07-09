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
        this.direction = 'up';
        this.currentDirection = 'up';
        this.sampler = null;
        this.isAudioReady = false;
        this.metronomeSynth = null;
        this.subdivisionInterval = null;
        this.currentSubdivision = 0;
        
        this.initializeAudio();
        this.initializePiano();
        this.attachEventListeners();
        this.updateDisplay();
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
        this.updateVolume();
        
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
        const controls = ['chord-select', 'hand-select', 'octave-range', 'direction-select'];
        controls.forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                this.reset();
                this.updateDisplay();
            });
        });
        
        document.getElementById('show-fingering').addEventListener('change', () => {
            this.updateDisplay();
        });
        
        // Volume control
        const volumeSlider = document.getElementById('volume-slider');
        volumeSlider.addEventListener('input', () => {
            this.updateVolume();
            document.getElementById('volume-display').textContent = volumeSlider.value + '%';
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
                // If playing, update the interval without restarting
                if (this.isPlaying && this.subdivisionInterval) {
                    clearInterval(this.subdivisionInterval);
                    const beatInterval = 60000 / newTempo;
                    const subdivisionInterval = beatInterval / 4;
                    // Don't reset to 0 to avoid immediate chord change
                    // Keep current subdivision position
                    
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
                        this.currentSubdivision = (this.currentSubdivision + 1) % 4;
                    }, subdivisionInterval);
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
            
            // If playing, update the interval
            if (this.isPlaying && this.subdivisionInterval) {
                clearInterval(this.subdivisionInterval);
                const beatInterval = 60000 / newTempo;
                const subdivisionInterval = beatInterval / 4;
                // Don't reset to 0 to avoid immediate chord change
                // Keep current subdivision position
                
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
                    this.currentSubdivision = (this.currentSubdivision + 1) % 4;
                }, subdivisionInterval);
            }
        });
        
        // Also handle when pressing Enter
        tempoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                tempoInput.blur(); // This will trigger the change event
            }
        });
    }
    
    updateVolume() {
        if (this.sampler) {
            const volume = parseInt(document.getElementById('volume-slider').value);
            // Convert percentage to decibels (-60 to 0)
            this.sampler.volume.value = (volume / 100) * 30 - 30;
        }
    }
    
    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.generateInversions();
        this.currentSubdivision = 0;
        
        const bpm = parseInt(document.getElementById('tempo-input').value);
        const beatInterval = 60000 / bpm; // Convert BPM to milliseconds
        const subdivisionInterval = beatInterval / 4; // 4 subdivisions per beat
        
        // Show first inversion immediately
        this.updateDisplay();
        
        // Start subdivision ticker (16th notes)
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
            this.currentSubdivision = (this.currentSubdivision + 1) % 4;
        }, subdivisionInterval);
    }
    
    pause() {
        this.isPlaying = false;
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
        const direction = document.getElementById('direction-select').value;
        
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
        const direction = document.getElementById('direction-select').value;
        
        if (direction === 'up') {
            this.currentInversionIndex++;
            if (this.currentInversionIndex >= this.inversions.length) {
                this.currentInversionIndex = 0;
            }
        } else if (direction === 'down') {
            this.currentInversionIndex--;
            if (this.currentInversionIndex < 0) {
                this.currentInversionIndex = this.inversions.length - 1;
            }
        } else if (direction === 'up-down') {
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
        }
        
        this.updateDisplay();
    }
    
    updateDisplay() {
        this.clearHighlights();
        
        if (this.inversions.length === 0 && !this.isPlaying) {
            // Show default state
            const chordSelect = document.getElementById('chord-select').value;
            const isMinor = chordSelect.includes('m');
            document.getElementById('current-chord').textContent = 
                `${chordSelect} ${isMinor ? 'Minor' : 'Major'} - Root Position`;
            document.getElementById('current-octave').textContent = 'Octave: C3';
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
        
        document.getElementById('current-chord').textContent = 
            `${current.chordName} - ${positionNames[current.position]}`;
        document.getElementById('current-octave').textContent = 
            `Octave: C${current.octave}`;
        
        // Highlight keys
        const showFingering = document.getElementById('show-fingering').checked;
        const hand = document.getElementById('hand-select').value;
        const fingering = fingeringPatterns[hand][current.chordType][current.position];
        
        current.notes.forEach((midiNote, index) => {
            const key = this.piano.querySelector(`[data-midi="${midiNote}"]`);
            if (key) {
                key.classList.add('active');
                
                if (showFingering) {
                    const fingerNumber = document.createElement('div');
                    fingerNumber.className = 'finger-number';
                    fingerNumber.textContent = fingering[index];
                    key.appendChild(fingerNumber);
                }
            }
        });
        
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
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PianoInversionsTrainer();
});