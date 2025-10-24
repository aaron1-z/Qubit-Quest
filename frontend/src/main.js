import Phaser from "phaser";
import { runQWalk } from "./api.js";
import { QuantumEngine } from "./quantum/QuantumEngine.js";

/*
Final Qubit Quest — Turn-based Strategic Puzzle (full-feature)
Features:
 - On-board markers for H/Q/E/M/Entangle (fade after N turns)
 - Quantum memory layer (fading afterglow influencing tile tint)
 - Auto-open bottom log overlay after every action (~2.2s)
 - Clean right panel: Stats, Pattern Objective, Recent Actions
 - Centered board, black + neon aesthetic
 - Small synth tones for actions; robust backend fallback
*/

class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  preload() {}

  create() {
  const { width, height } = this.scale; 
  this.cameras.main.setBackgroundColor("#05020a");
  this.cameras.main.fadeIn(600, 0, 0, 0);

    this.cameras.main.setBackgroundColor("#05020a");
    this.cameras.main.fadeIn(600, 0, 0, 0);
   
    // Animated glow
    const glow = this.add.graphics();
    let glowPhase = 0;

    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        glowPhase += 0.04;
        glow.clear();
        const alpha = 0.15 + Math.sin(glowPhase) * 0.08;
        glow.fillStyle(0x00ffff, alpha);
        glow.fillCircle(width / 2, height / 2, 180 + Math.sin(glowPhase * 2) * 10);
      },
    });

    // Title
    const title = this.add.text(width / 2, height / 2 - 120, "QUBIT QUEST", {
      fontSize: "48px",
      color: "#9ff",
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height / 2 - 60, "A Quantum Field Simulation Puzzle", {
      fontSize: "18px",
      color: "#bdf",
    }).setOrigin(0.5);

    // Button
    const startBtn = this.add.text(width / 2, height / 2 + 60, "▶ Start Simulation", {
      fontSize: "24px",
      color: "#000",
      backgroundColor: "#9ff",
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on("pointerover", () => startBtn.setStyle({ backgroundColor: "#bff" }));
    startBtn.on("pointerout", () => startBtn.setStyle({ backgroundColor: "#9ff" }));

    // On click → start FinalScene
   startBtn.on("pointerdown", () => {
  this.playTone?.(440, 0.2, 0.1);

  // Fade to black
  this.cameras.main.fadeOut(600, 0, 0, 0);

  // When fade completes, start FinalScene.
  // FinalScene.create() already does a fadeIn().
  this.cameras.main.once('camerafadeoutcomplete', () => {
    this.scene.start("FinalScene");
  });
});



    // Optional: play a soft intro tone
    try {
      const ctx = this.sound.context;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = 240;
      g.gain.value = 0.05;
      o.start(); o.stop(ctx.currentTime + 1.2);
    } catch (e) {}
  }
}

class FinalScene extends Phaser.Scene {
  constructor() {
    super("FinalScene");
    this.skipTutorial = false;

    // Board config
    this.gridW = 8;
    this.tileSize = 80;
    this.boardW = this.gridW * this.tileSize;
    this.panelW = 350;
    this.canvasH = 640;
    this.patternLen = 4;

    // Action fade durations
    this.markerDurationTurns = 3; // markers show for 3 turns
    this.logPeekMs = 2200; // show log overlay after each action
  }

  preload() {}

create() {
  // resume audio after gesture (Chrome)
  this.input.once("pointerdown", () => { 
    try { if (this.sound.context.state === "suspended") this.sound.context.resume(); } catch(e){} 
  });
  this.input.keyboard.once("keydown", () => { 
    try { if (this.sound.context.state === "suspended") this.sound.context.resume(); } catch(e){} 
  });

  // layout and centering
  const minWidth = this.boardW + this.panelW + 80;
  const w = Math.max(minWidth, Math.min(window.innerWidth, 1200));
  this.scale.resize(w, this.canvasH);
  this.totalW = this.boardW + this.panelW;
  this.offsetX = Math.round((this.scale.width - this.totalW) / 2);
  this.boardX = this.offsetX;
  this.panelX = this.offsetX + this.boardW;

  // core game state
  this.turnBased = true;
  this.turnNumber = 1;
  this.actionUsedThisTurn = false;
  this.row = 0;
  this.lives = 3;
  this.score = 0;
  this.streak = 0;
  this.energy = 4;
  this.coherence = 100;
  this.currentStartPos = 0;
  this.entangleSelection = null;

  // data layers
  this.tileMeta = {};   
  this.markers = [];    
  this.memory = Array(this.gridW).fill(0); 
  this.recentActions = [];

  // quantum engine
  this.quantumEngine = new QuantumEngine(this.gridW, 0);

  // visuals
  this.cameras.main.setBackgroundColor(0x05020a);
  this.createBackground();
  this.createWaveCanvas();
  this.createParticleTexture();

  // grid + tiles
  this.tiles = [];
  this.createGrid();
  this.spawnInitialSpecialTiles();

  // players visuals (one black, one pink)
  this.createPlayers();
  this.createTrails();

  // UI panel & overlay
  this.createUI();

  // viz
  this.vizGraphics = this.add.graphics().setDepth(8);

  // log overlay (bottom)
  this.createLogOverlay();

  // input
  this.cursors = this.input.keyboard.createCursorKeys();
  this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  this.keyH = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.H);
  this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
  this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  this.keyT = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T);
  this.keyL = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
  this.input.keyboard.on("keydown-R", () => this.restart());

  // tile click
  this.input.on('pointerdown', (ptr) => {
    const px = ptr.x - this.boardX;
    if (px >= 0 && px < this.boardW && ptr.y >= 0 && ptr.y < this.canvasH) {
      const c = Math.floor(px / this.tileSize);
      const r = Math.floor(ptr.y / this.tileSize);
      this.onTileClick(r, c, ptr);
    }
  });

  // compute initial pattern
  this.quantumEngine.resetRow(0);
  this.generatePatternFromProbs(this.quantumEngine.state, this.patternLen);

  // render & update
  this.renderRowLocal();
  this.updateUI();
  this.log("Welcome to Qubit Quest — Fold the pattern coherently.");
// Handle tutorial skip on restart
const data = this.sys.settings.data || {};
this.skipTutorial = data.skipTutorial || false;

if (!this.skipTutorial) {
  this.showInteractiveTutorial();
}

  // ✅ Move fade-in here (AFTER setup)
  this.cameras.main.fadeIn(600, 0, 0, 0);
}

  showTutorialOverlay() {
  const overlay = this.add.rectangle(
    this.boardX + this.boardW / 2, this.canvasH / 2,
    this.boardW, this.canvasH, 0x000000, 0.8
  ).setDepth(500);
  const lines = [
    "🧠 Welcome to Qubit Quest: Quantum Witness",
    "Click any tile to select a column.",
    "Press H for Hadamard, Q for Phase, E to Peek.",
    "Press SPACE to Measure (collapse).",
    "Form the Pattern Objective coherently to win.",
    "Press T to toggle between Turn and Real-time modes."
  ];
  const texts = lines.map((t, i) =>
    this.add.text(this.boardX + this.boardW / 2, 160 + i * 40, t,
      { fontSize: "18px", color: "#ccf", align: "center" })
      .setOrigin(0.5).setDepth(501)
  );

  const btn = this.add.text(this.boardX + this.boardW / 2, 480, "Start Simulation", {
    fontSize: "20px", color: "#000", backgroundColor: "#9ff", padding: { x: 14, y: 8 }
  }).setOrigin(0.5).setInteractive().setDepth(502);

  btn.on("pointerdown", () => {
    overlay.destroy(); texts.forEach(t => t.destroy()); btn.destroy();
    this.log("Tutorial dismissed. Begin manipulating the field.");
  });
}
  // -------------------- Visual layers --------------------
  createBackground() {
    const w = this.scale.width, h = this.canvasH;
    const canvas = this.textures.createCanvas('bg', w, h).source[0].image;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0,0,w,h);
    grad.addColorStop(0, '#040618'); grad.addColorStop(1, '#060114');
    ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
    this.textures.addCanvas('bg', canvas);
    this.add.image(w/2,h/2,'bg').setDepth(-10);

    // scanlines
    const scan = this.textures.createCanvas('scan', w, h).source[0].image;
    const sc = scan.getContext('2d');
    for (let y=0; y<h; y+=6) { sc.fillStyle = y%12===0 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.004)'; sc.fillRect(0,y,w,1); }
    this.textures.addCanvas('scan', scan);
    this.add.image(w/2,h/2,'scan').setDepth(-5).setAlpha(0.03);
  }

  createWaveCanvas() {
    this.wave = this.textures.createCanvas('wave', this.boardW, this.canvasH);
    this.waveCtx = this.wave.source[0].image.getContext('2d');
    this.waveImage = this.add.image(this.boardX + this.boardW/2, this.canvasH/2, 'wave').setDepth(-6).setAlpha(0.8);
    this.wavePhase = 0;
    this.waveSpeed = 0.04;
  }

  createParticleTexture() {
    const g = this.make.graphics({x:0,y:0,add:false});
    g.fillStyle(0xffffff,1); g.fillRect(0,0,2,2); g.generateTexture('px',2,2); g.destroy();
  }

  // -------------------- Grid and tiles --------------------
  createGrid() {
    for (let r=0;r<this.gridW;r++) {
      this.tiles[r] = [];
      for (let c=0;c<this.gridW;c++) {
        const x = this.boardX + c*this.tileSize + this.tileSize/2;
        const y = r*this.tileSize + this.tileSize/2;
        const tile = this.add.rectangle(x,y,this.tileSize-6,this.tileSize-6,0x12384f).setStrokeStyle(3, 0x07131e).setDepth(1);
        tile._r=r; tile._c=c;
        tile.setInteractive();
        this.tiles[r][c] = tile;
        this.tileMeta[`${r}_${c}`] = { type:'normal', linked:null, markers:[] };
      }
    }
  }

  spawnInitialSpecialTiles() {
    const rand = () => Math.floor(Math.random()*this.gridW);
    // 1-2 photon gates early, some decofields
    for (let i=0;i<2;i++) this.setTileType(0, rand(), 'photonGate');
    for (let i=0;i<3;i++) this.setTileType(1, rand(), 'decoField');
    // portal pair
    let a = rand(), b = rand();
    if (a !== b) { this.setTileType(2,a,'portal'); this.setTileType(3,b,'portal'); this.linkPortal(2,a,3,b); }
    // misc sprinkling
    for (let r=0;r<2;r++){
      for (let t=0;t<2;t++){
        const c = rand();
        if (Math.random() < 0.22) this.setTileType(r,c,'power');
        else if (Math.random() < 0.38) this.setTileType(r,c,'trap');
        else if (Math.random() < 0.48) this.setTileType(r,c,'phase');
        else if (Math.random() < 0.58) this.setTileType(r,c,'hadamardBoost');
      }
    }
  }

  setTileType(r,c,type) {
    this.tileMeta[`${r}_${c}`].type = type;
    const tile = this.tiles[r][c];
    const strokes = {
      photonGate: 0xffdd66,
      decoField: 0xff6666,
      portal: 0x66ffff,
      power: 0x33ff99,
      trap: 0xff4466,
      phase: 0xffcc00,
      hadamardBoost: 0x66ffcc,
      entangler: 0xaa66ff
    };
    tile.setStrokeStyle(4, strokes[type] || 0x07131e);
  }

  linkPortal(r1,c1,r2,c2) {
    this.tileMeta[`${r1}_${c1}`].linked = { r:r2, c:c2, kind:'portal' };
    this.tileMeta[`${r2}_${c2}`].linked = { r:r1, c:c1, kind:'portal' };
  }

  linkEntangleTiles(r1,c1,r2,c2) {
    this.tileMeta[`${r1}_${c1}`].linked = { r:r2, c:c2, kind:'entangle' };
    this.tileMeta[`${r2}_${c2}`].linked = { r:r1, c:c1, kind:'entangle' };
  }

  // -------------------- Players & trails --------------------
  createPlayers() {
    this.playerA = this.add.circle(this.boardX + 40, 40, 18, 0x000000).setDepth(6);
    this.playerB = this.add.circle(this.boardX + 40, 600, 18, 0xff66cc).setDepth(6);
    this.playerA.glow = this.add.circle(this.boardX + 40, 40, 36, 0x000000, 0.06).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
    this.playerB.glow = this.add.circle(this.boardX + 40, 600, 36, 0xff66cc, 0.06).setDepth(5).setBlendMode(Phaser.BlendModes.ADD);
  }

  createTrails() {
    this.add.particles(0,0,'px', { follow:this.playerA, lifespan:420, scale:{start:0.35,end:0}, tint:0x111111, speed:0, frequency:50 });
    this.add.particles(0,0,'px', { follow:this.playerB, lifespan:420, scale:{start:0.35,end:0}, tint:0xff66cc, speed:0, frequency:50 });
  }

  // -------------------- UI & overlay --------------------
  createUI() {
    const px = this.panelX;
    this.livesText = this.add.text(px+12, 8, "", { fontSize:"16px", color:"#00ff88" }).setDepth(9);
    this.scoreText = this.add.text(px+12, 28, "", { fontSize:"16px", color:"#ffff66" }).setDepth(9);
    this.energyText = this.add.text(px+12, 48, "", { fontSize:"14px", color:"#88ccff" }).setDepth(9);
    this.coherenceText = this.add.text(px+12, 68, "", { fontSize:"14px", color:"#ffcc88" }).setDepth(9);
    this.turnText = this.add.text(px+12, 88, "", { fontSize:"14px", color:"#99aaff" }).setDepth(9);
    this.modeText = this.add.text(px+12, 108, "Mode: TURN-BASED (T toggles)", { fontSize:"12px", color:"#f8a" }).setDepth(9);

    // pattern objective mini display
    this.add.text(px+12, 132, "Pattern Objective", { fontSize:"13px", color:"#9ff" }).setDepth(9);
    this.patternIcons = [];
    for (let i=0;i<this.patternLen;i++) {
      const x = px + 16 + i*44;
      const rect = this.add.rectangle(x + 18, 170, 36, 36, 0x222222).setStrokeStyle(2,0x333333).setDepth(9);
      rect._label = this.add.text(x + 10, 160, "", { fontSize:"14px", color:"#000" }).setDepth(10);
      this.patternIcons.push(rect);
    }

    // Recent actions (scrolling - update text lines)
    this.add.text(px+12, 220, "Recent Actions", { fontSize:"13px", color:"#9ff" }).setDepth(9);
    this.recentActionTexts = [];
    for (let i=0;i<8;i++) {
      const t = this.add.text(px+12, 246 + i*18, "", { fontSize:"12px", color:"#ddd" }).setDepth(9);
      this.recentActionTexts.push(t);
    }

    // end turn button
    this.endTurnBtn = this.add.text(px+12, 520, "End Turn", { fontSize:"16px", color:"#000", backgroundColor:"#9ff", padding:{x:8,y:6} }).setInteractive().setDepth(9);
    this.endTurnBtn.on('pointerdown', ()=> this.endTurn());
  }

  createLogOverlay() {
    // overlay rectangle semi-transparent bottom panel
    this.logOpen = false;
    const w = this.totalW;
    const h = 180;
    this.logGroup = this.add.container(this.boardX, this.canvasH - h).setDepth(60);
    const bg = this.add.rectangle(this.boardX + this.boardW/2, this.canvasH - h/2, this.boardW, h, 0x000000, 0.85).setDepth(61);
    this.logText = this.add.text(this.boardX + 14, this.canvasH - h + 12, "", { fontSize:"12px", color:"#cde", wordWrap:{ width:this.boardW - 28 } }).setDepth(62);
    this.logGroup.add([bg, this.logText]);
    this.logGroup.setAlpha(0);
    // toggle key L
    this.input.keyboard.on('keydown-L', ()=> {
      this.showLogOverlay(!this.logOpen, 220);
    });
  }
showInteractiveTutorial() {
  // dark overlay
  const overlay = this.add.rectangle(
    this.boardX + this.boardW / 2,
    this.canvasH / 2,
    this.boardW,
    this.canvasH,
    0x000000,
    0.85
  ).setDepth(500);

  // Lines of tutorial text
  const lines = [
    "🧠 Welcome to Qubit Quest!",
    "",
    "🎯 Goal: Collapse columns in the order of the Pattern Objective.",
    "",
    "Controls:",
    "• Click a column → select it.",
    "• Press H for Hadamard (mix amplitudes).",
    "• Press Q for Phase (stabilize pattern).",
    "• Press E for Peek (reveal brightest column).",
    "• Press SPACE to Measure (collapse).",
    "• SHIFT + Click 2 tiles = Entangle them.",
    "• Press 'End Turn' to continue the simulation.",
    "",
    "✨ Coherence = stability of the quantum field.",
    "⚡ Energy = resource to perform operations.",
    "",
    "Click anywhere to begin your journey..."
  ];

  const textObjects = [];
  let currentLine = 0;
  let currentChar = 0;
  const lineDelay = 600; // delay between lines
  const charDelay = 22;  // speed of typewriter effect per character

  // “Typewriter” animation
  const typeNextLine = () => {
    if (currentLine >= lines.length) {
      overlay.setInteractive().once('pointerdown', () => {
  overlay.destroy();
  textObjects.forEach(t => t.destroy());
  if (clickText) clickText.destroy(); // 🧩 destroy the prompt
  this.playTone(640, 0.1, 0.1);
  this.log("Tutorial closed. Manipulate the field wisely!");
});
      // Add “Click to continue” pulse
      const clickText = this.add.text(
        this.boardX + this.boardW / 2,
        this.canvasH - 80,
        "▼ Click to begin ▼",
        { fontSize: "18px", color: "#9ff" }
      ).setOrigin(0.5).setDepth(501);
      this.tweens.add({
        targets: clickText,
        alpha: { from: 0.6, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1
      });
      return;
    }

    const line = lines[currentLine];
    const text = this.add.text(
      this.boardX + this.boardW / 2,
      100 + currentLine * 30,
      "",
      { fontSize: "18px", color: "#ccf", fontFamily: "monospace", align: "center" }
    ).setOrigin(0.5).setDepth(501);

    textObjects.push(text);

    const addChar = () => {
      if (currentChar < line.length) {
        text.setText(line.substring(0, currentChar + 1));
        this.playTone(200 + (Math.random() * 400), 0.02, 0.015);
        currentChar++;
        this.time.delayedCall(charDelay, addChar);
      } else {
        currentChar = 0;
        currentLine++;
        this.time.delayedCall(lineDelay, typeNextLine);
      }
    };

    addChar();
  };
  // Subtle glow flicker before tutorial starts
this.tweens.add({
  targets: overlay,
  alpha: { from: 0.6, to: 0.85 },
  duration: 1000,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut'
});

  typeNextLine(); // Start typing sequence
}

  showLogOverlay(show=true, duration=220) {
    if (show === this.logOpen) return;
    this.logOpen = show;
    if (show) {
      this.logGroup.setVisible(true);
      this.tweens.add({ targets:this.logGroup, alpha:1, duration });
    } else {
      this.tweens.add({ targets:this.logGroup, alpha:0, duration, onComplete: ()=> this.logGroup.setVisible(false) });
    }
  }

  autoPeekLog() {
    // show overlay for a short time after each action
    this.showLogOverlay(true, 160);
    if (this._logTimer) clearTimeout(this._logTimer);
    this._logTimer = setTimeout(()=> this.showLogOverlay(false, 400), this.logPeekMs);
  }

  // -------------------- Input handlers --------------------
  onTileClick(r,c, ptr) {
    const shift = ptr.event.shiftKey;
    if (shift) {
      if (!this.entangleSelection) {
        this.entangleSelection = { r,c };
        this.tiles[r][c].setStrokeStyle(5, 0xffff66);
        this.recordAction('Entangle-select', `(${r},${c})`);
        this.log(`Entangle: first tile selected (${r},${c}). SHIFT+click another to entangle.`);
      } else {
        const a = this.entangleSelection;
        if (a.r === r && a.c === c) {
          this.tiles[a.r][a.c].setStrokeStyle(3, 0x07131e);
          this.entangleSelection = null;
          this.log("Entangle selection canceled.");
        } else {
          this.tryEntangle(a.r, a.c, r, c);
          this.tiles[a.r][a.c].setStrokeStyle(3, 0x07131e);
          this.entangleSelection = null;
        }
      }
      return;
    }

    // select column for Q/H operations
    this.selectedCol = c;
    this.recordAction('Select', `col ${c}`);
    this.log(`Selected column ${c}. Press Q (Phase) or H (Local H) to operate.`);
    // selector visual
    if (this.selector) this.selector.destroy();
    this.selector = this.add.rectangle(this.boardX + c*this.tileSize + this.tileSize/2, 12, this.tileSize-12, 8, 0xffff88).setDepth(9);
    this.time.delayedCall(800, ()=> { if (this.selector) this.selector.destroy(); });
  }

  tryEntangle(r1,c1,r2,c2) {
    if (this.energy < 3) { this.log("Not enough energy to entangle."); this.recordAction('Entangle-fail','energy'); return; }
    this.energy -= 3;
    this.linkEntangleTiles(r1,c1,r2,c2);
    this.tiles[r1][c1].setStrokeStyle(4, 0xaa66ff);
    this.tiles[r2][c2].setStrokeStyle(4, 0xaa66ff);
    // visual beam between two tiles
    const x1 = this.boardX + c1*this.tileSize + this.tileSize/2, y1 = r1*this.tileSize + this.tileSize/2;
    const x2 = this.boardX + c2*this.tileSize + this.tileSize/2, y2 = r2*this.tileSize + this.tileSize/2;
    const beam = this.add.line(0,0,x1,y1,x2,y2,0xff66ff).setOrigin(0).setLineWidth(3).setDepth(7);
    this.time.delayedCall(1100, ()=> beam.destroy());
    this.log(`Entangled (${r1},${c1}) ↔ (${r2},${c2}).`);
    this.recordAction('Entangle', `(${r1},${c1})↔(${r2},${c2})`);
    this.addMarker(r1,c1,'⇆',0xff66ff);
    this.addMarker(r2,c2,'⇆',0xff66ff);
    this.playTone(560, 0.14, 0.09);
    this.actionUsedThisTurn = true;
    if (this.turnBased) this.endTurnIfActionUsed();
  }

  // -------------------- Actions (Q/H/E/M) --------------------
 async applyPhase() {
  if (this._ending) return;
  if (this.energy < 1) {
    this.log("Need 1 energy for Phase operation.");
    this.recordAction("Q-fail", "energy");
    return;
  }
  if (this.selectedCol === undefined) {
    this.log("Select a column first by clicking a tile.");
    this.recordAction("Q-fail", "no-select");
    return;
  }

  this.energy -= 1;
  const c = this.selectedCol;
  this.log(`Applied Phase gate to column ${c}.`);
  this.recordAction("Q", `col ${c}`);

  // Subtle amplitude phase shift (stabilizes state)
  const factor = 0.88 + Math.random() * 0.1;
  this.quantumEngine.state[c] *= factor;

  // Re-normalize
  const s = this.quantumEngine.state.reduce((a, b) => a + b, 0) || 1;
  this.quantumEngine.state = this.quantumEngine.state.map(v => v / s);

  // Phase reduces coherence slightly but improves alignment
  this.coherence = Math.max(0, this.coherence - 2 + Math.random() * 1.5);
  this.score += 5; // small reward for stability tuning

  this.visualizeProbs(this.quantumEngine.state);
  this.addMarker(this.row, c, "Q", 0xffcc00);
  this.playTone(720, 0.12, 0.06);
  this.actionUsedThisTurn = true;
  this.autoPeekLog();
  if (this.turnBased) this.endTurnIfActionUsed();
}

  async applyLocalHadamard() {
  if (this._ending) return;
  if (this.energy < 2) {
    this.log("Need 2 energy for local Hadamard.");
    this.recordAction("H-fail", "energy");
    return;
  }
  if (this.selectedCol === undefined) {
    this.log("Select a column first by clicking a tile.");
    this.recordAction("H-fail", "no-select");
    return;
  }

  this.energy -= 2;
  const c = this.selectedCol;
  const left = (c - 1 + this.gridW) % this.gridW;
  const right = (c + 1) % this.gridW;
  const arr = this.quantumEngine.state.slice();

  // Local interference: balance nearby amplitudes
  const avg = (arr[left] + arr[c] + arr[right]) / 3;
  arr[c] = (arr[c] + avg) / 2;

  const s = arr.reduce((a, b) => a + b, 0) || 1;
  this.quantumEngine.state = arr.map(v => v / s);

  // Hadamard boosts coherence (if stable)
  if (Math.random() > 0.2) {
    this.coherence = Math.min(100, this.coherence + 4);
    this.log(`Local Hadamard at column ${c} increased coherence.`);
  } else {
    this.coherence = Math.max(0, this.coherence - 5);
    this.log(`Hadamard misalignment caused coherence loss.`);
  }

  this.score += 10; // small reward
  this.visualizeProbs(this.quantumEngine.state);
  this.addMarker(this.row, c, "H", 0x44ffee);
  this.playTone(980, 0.11, 0.08);
  this.actionUsedThisTurn = true;
  this.autoPeekLog();
  if (this.turnBased) this.endTurnIfActionUsed();
}


  async peek() {
  if (this.energy < 1) {
    this.log("Need 1 energy to peek.");
    this.recordAction('E-fail', 'energy');
    return;
  }
  this.energy -= 1;
  this.coherence = Math.max(0, this.coherence - 1.5); // 👈 new line

  const res = await runQWalk({
    n_positions: this.gridW,
    steps: 1,
    coin: 'hadamard',
    start_pos: this.currentStartPos,
    custom_coin_angles: []
  });

  const probs = res && !res.error ? res.probabilities : this.quantumEngine.state;
  const b = probs.indexOf(Math.max(...probs));

  this.log(`Peek: brightest column ${b}.`);
  this.recordAction('E', `col ${b}`);
  this.addMarker(this.row, b, 'E', 0xaa66ff);

  this.tiles[this.row][b].setStrokeStyle(5, 0xffff00);
  this.time.delayedCall(700, () => this.tiles[this.row][b].setStrokeStyle(3, 0x07131e));

  this.playTone(420, 0.08, 0.06);
  this.actionUsedThisTurn = true;
  this.autoPeekLog();
  if (this.turnBased) this.endTurnIfActionUsed();
}

 async measure() {
  if (this._ending) return;

  // Cannot measure with no energy
  if (this.energy <= 0) {
    this.flashEnergyWarning();
    return;
  }

  // Deduct small energy cost for measuring
  this.energy -= 1;

  this.log("🔍 Measuring quantum field...");
  this.recordAction('M', `row ${this.row}`);

  // Measurement success depends on coherence
  const coherenceRisk = Math.max(0, 60 - this.coherence);
  const failChance = coherenceRisk / 100;

  this.cameras.main.flash(150, 100, 200, 255);

  // Failed measurement (decoherence)
  if (Math.random() < failChance) {
    this.coherence = Math.max(0, this.coherence - 20);
    this.lives -= 1;
    this.log("💀 Decoherence! The field destabilized.");
    this.playTone(200, 0.1, 0.2);
    this.showFloatingText("Decoherence!", this.boardX + this.boardW / 2, this.canvasH / 2, "#ff6666");

    if (this.lives <= 0) {
      this.endGame(false);
      return;
    }
    this.updateUI();
    return;
  }

  // Successful measurement — fetch quantum walk
  const res = await runQWalk({ n_positions: this.gridW, steps: 1, coin: 'hadamard', start_pos: this.currentStartPos, custom_coin_angles: [] });
  const probs = res && !res.error ? res.probabilities : this.quantumEngine.state;
  const idx = this.weightedRandom(probs);
  this.addMarker(this.row, idx, 'M', 0xffffff);
  this.playTone(300, 0.08, 0.08);

  // Check pattern coherence
  const success = this.checkPattern(idx, true);
  if (success) {
    this.score += 50;
    this.coherence = Math.min(100, this.coherence + 5);
    this.showFloatingText("+50", this.boardX + this.boardW / 2, this.canvasH / 2, "#66ffcc");
  } else {
    this.coherence = Math.max(0, this.coherence - 10);
    this.energy = Math.max(0, this.energy - 1);
    this.showFloatingText("Collapse Error", this.boardX + this.boardW / 2, this.canvasH / 2, "#ffaa00");
    this.playTone(260, 0.1, 0.15);
  }

  // 👇 bonus passive energy regain for successful measurement
if (success) {
  this.energy = Math.min(4, this.energy + 1);
  this.log("⚛️ Energy harmonized through coherent collapse (+1).");
}


  this.updateUI();

  if (this.coherence <= 0 || this.lives <= 0) {
    this.endGame(false);
    return;
  }

  if (this.score >= 300) {
    this.endGame(true);
    return;
  }

  this.actionUsedThisTurn = true;
  this.autoPeekLog();
  if (this.turnBased) this.endTurnIfActionUsed();
}

  // -------------------- Collapse & consequences --------------------
  handleCollapse(col, coherent) {
    // animate players to collapse column
    const tx = this.boardX + col*this.tileSize + this.tileSize/2;
    this.tweens.add({ targets: [this.playerA, this.playerB], x: tx, duration: 300, ease:'Sine.easeInOut' });

    if (coherent) {
      this.streak++;
      const gain = 10 * this.streak;
      this.score += gain;
      this.coherence = Math.min(100, this.coherence + 6);
      this.flashTile(this.row, col, 0x88ff88);
      this.log(`Coherent collapse: +${gain} points (streak ${this.streak}).`);
      // memory + pattern check
      this.memory[col] += 0.28;
      this.checkPattern(col, true);
    } else {
      this.streak = 0;
      this.lives--;
      this.coherence = Math.max(0, this.coherence - 10);
      this.flashTile(this.row, col, 0xff6666);
      this.log("Decohered collapse: lost a life.");
      this.memory[col] = Math.max(0, this.memory[col] - 0.12);
      this.checkPattern(col, false);
    }

    this.updateUI();

    if (this.lives <= 0) return this.endGame(false);
    this.row++;
    if (this.row >= this.gridW) return this.endGame(true);

    this.currentStartPos = col;
    this.placeRowSpecials(this.row);
    this.quantumEngine.resetRow(col);
    this.renderRowLocal();
  }

  flashTile(r,c,color) {
    const tile = this.tiles[r][c];
    const orig = tile.fillColor;
    tile.setFillStyle(color);
    this.time.delayedCall(260, ()=> tile.setFillStyle(orig));
    for (let i=0;i<12;i++){
      const px = this.add.rectangle(this.boardX + c*this.tileSize + Phaser.Math.Between(20,60), r*this.tileSize + Phaser.Math.Between(20,60), 4,4, color).setDepth(7);
      this.tweens.add({ targets:px, alpha:0, duration:380, onComplete: ()=> px.destroy() });
    }
  }

  // -------------------- Markers and Memory --------------------
  addMarker(r, c, symbol, color) {
  const key = `${r}_${c}`;
  const existing = this.markers.filter(m => m.r === r && m.c === c);
  // remove older ones first
  existing.forEach(m => { if (m.display && m.display.destroy) m.display.destroy(); });
  this.markers = this.markers.filter(m => !(m.r === r && m.c === c));

  const mx = this.boardX + c * this.tileSize + this.tileSize / 2;
  const my = r * this.tileSize + this.tileSize / 2;
  const txt = this.add.text(mx, my, symbol, {
    fontSize: "26px",
    color: Phaser.Display.Color.IntegerToColor(color).rgba
  }).setOrigin(0.5).setDepth(12);
  txt.setAlpha(0.85);

  // fade animation
  this.tweens.add({ targets: txt, alpha: 0, duration: this.markerDurationTurns * 800, onComplete: () => txt.destroy() });

  this.markers.push({ r, c, symbol, color, turnPlaced: this.turnNumber, display: txt });
  this.tileMeta[key].markers.push({ symbol, color, turn: this.turnNumber });
}


  decayMarkers() {
    // destroy markers older than markerDurationTurns
    const keep = [];
    for (const m of this.markers) {
      if (this.turnNumber - m.turnPlaced >= this.markerDurationTurns) {
        if (m.display && m.display.destroy) m.display.destroy();
      } else keep.push(m);
    }
    this.markers = keep;
    // also decay memory layer slightly each turn
    for (let i=0;i<this.memory.length;i++) this.memory[i] = Math.max(0, this.memory[i] - 0.08);
  }

  // -------------------- Pattern objective --------------------
  generatePatternFromProbs(probs,len) {
    const idxs = probs.map((p,i)=>({p,i})).sort((a,b)=>b.p - a.p).slice(0, Math.min(len+1, probs.length)).map(x=>x.i);
    while (idxs.length < len) {
      const r = Math.floor(Math.random()*this.gridW);
      if (!idxs.includes(r)) idxs.push(r);
    }
    // shuffle to make puzzle (but keep solvable)
    for (let i=idxs.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    this.targetPattern = idxs.slice(0,len);
    this.patternIndex = 0;
    this.updatePatternUI();
  }

  checkPattern(col, coherent) {
    if (!this.targetPattern) return;
    const expected = this.targetPattern[this.patternIndex];
    if (coherent && col === expected) {
      this.patternIndex++;
      this.score += 30;
      this.log(`Pattern matched step ${this.patternIndex}/${this.targetPattern.length}.`);
      this.popText(`Pattern +30`);
      if (this.patternIndex >= this.targetPattern.length) {
        this.log("Pattern completed — Level Solved!");
        this.score += 100;
        this.endGame(true);
      }
    } else {
      if (!coherent) this.coherence = Math.max(0, this.coherence - 8);
      else if (col !== expected) { this.score = Math.max(0, this.score - 10); this.log("Pattern wrong column — -10."); }
    }
    this.updatePatternUI();
  }

 updatePatternUI() {
  for (let i = 0; i < this.patternLen; i++) {
    const rect = this.patternIcons[i];
    const col = this.targetPattern[i];

    if (i < this.patternIndex) rect.setFillStyle(0x44ff88);
    else if (i === this.patternIndex) rect.setFillStyle(0xffff66);
    else rect.setFillStyle(0x222222);

    // ✅ destroy previous label safely
    if (rect._label && rect._label.destroy) rect._label.destroy();

    rect._label = this.add.text(
      rect.x - 8,
      rect.y - 8,
      `${col}`,
      { fontSize: "14px", color: "#000" }
    ).setDepth(11);
  }
}

  // -------------------- End-turn / environment --------------------
  endTurnIfActionUsed() { this.endTurn(); }

  endTurn() {
    this.log(`End of turn ${this.turnNumber}. Environment evolves...`);
    this.turnNumber++;
    // decay coherence more aggressively for difficulty
   // ♻️ Energy regeneration
const prevEnergy = this.energy;
this.energy = Math.min(4, this.energy + 1);
if (this.energy > prevEnergy) {
  this.log("⚡ Energy cell recharged by 1.");
  this.playTone(480, 0.08, 0.04);
}

// decay coherence more aggressively for difficulty
this.coherence -= (3 + Math.floor(this.turnNumber / 7));
    // decoFields effect
    for (const k in this.tileMeta) {
      const meta = this.tileMeta[k];
      if (meta.type === 'decoField') {
        const [r,c] = k.split('_').map(Number);
        this.quantumEngine.state[c] = Math.max(0, this.quantumEngine.state[c] * 0.82);
        this.log(`DecoField active at (${r},${c})`);
      }
    }
    // photon gates small bonus
    for (const k in this.tileMeta) {
      const meta = this.tileMeta[k];
      if (meta.type === 'photonGate') this.coherence = Math.min(100, this.coherence + 0.6);
    }

    // random event
    if (Math.random() < 0.34) this.triggerRandomEvent();

    // portals leak amplitude
    this.portalLeak();
    // decay markers & memory
    this.decayMarkers();

    // renormalize fallback state
    const s = this.quantumEngine.state.reduce((a,b)=>a+b,0)||1;
    this.quantumEngine.state = this.quantumEngine.state.map(v=>v/s);

    this.actionUsedThisTurn = false;
    this.updateUI();
    if (this.coherence <= 0) this.endGame(false);
  }

  triggerRandomEvent() {
    const r = Math.random();
    if (r < 0.33) {
      this.coherence = Math.max(0, this.coherence - 10);
      this.log("Event: Observer Drone scanned field — coherence reduced.");
      this.recordAction('Event','Observer Drone');
    } else if (r < 0.66) {
      for (let i=0;i<this.gridW;i++) this.quantumEngine.state[i] += (Math.random()-0.5) * 0.03;
      const s = this.quantumEngine.state.reduce((a,b)=>a+b,0)||1;
      this.quantumEngine.state = this.quantumEngine.state.map(v=>Math.max(0,v/s));
      this.log("Event: Vacuum fluctuation distorted amplitudes.");
      this.recordAction('Event','Vacuum Fluctuation');
    } else {
      this.randomizeEntanglement();
      this.log("Event: Quantum Storm — entanglement rearranged!");
      this.recordAction('Event','Quantum Storm');
    }
    this.renderRowLocal();
  }

  portalLeak() {
    for (const k in this.tileMeta) {
      const meta = this.tileMeta[k];
      if (meta.type === 'portal' && meta.linked) {
        const [r,c] = k.split('_').map(Number);
        const linked = meta.linked;
        const frac = 0.06 * Math.random();
        const source = this.quantumEngine.state[c];
        const transfer = source * frac;
        this.quantumEngine.state[c] = Math.max(0, source - transfer);
        this.quantumEngine.state[linked.c] += transfer;
        if (Math.random() < 0.16) {
          const sx = this.boardX + c*this.tileSize + this.tileSize/2, sy = r*this.tileSize + this.tileSize/2;
          const tx = this.boardX + linked.c*this.tileSize + this.tileSize/2, ty = linked.r*this.tileSize + this.tileSize/2;
          const beam = this.add.rectangle(sx,sy,6,6,0x66ffff).setDepth(7);
          this.tweens.add({ targets: beam, x: tx, y: ty, duration:420, onComplete: ()=> beam.destroy() });
        }
      }
    }
  }

  randomizeEntanglement() {
    const keys = Object.keys(this.tileMeta);
    if (keys.length < 2) return;
    const a = keys[Math.floor(Math.random()*keys.length)];
    const b = keys[Math.floor(Math.random()*keys.length)];
    if (a===b) return;
    const tmp = this.tileMeta[a].linked;
    this.tileMeta[a].linked = this.tileMeta[b].linked;
    this.tileMeta[b].linked = tmp;
  }

  // ---------------- Visualization: probabilities, wavefield, memory ----------------
  visualizeProbs(probs) {
    // clear old labels
    if (!this._labelGroup) this._labelGroup = [];
    this._labelGroup.forEach(t=>t.destroy());
    this._labelGroup = [];
    this.vizGraphics.clear();
    const baseY = 240, barH = 18;
    for (let i=0;i<probs.length;i++) {
      const p = probs[i];
      const y = baseY + i*(barH+6);
      const w = (this.panelW - 44) * p;
      this.vizGraphics.fillStyle(0x44aaff, 1).fillRect(this.panelX + 12, y, w, barH);
      this.vizGraphics.lineStyle(1,0x334455,0.2).strokeRect(this.panelX + 12, y, this.panelW - 44, barH);
      const lbl = this.add.text(this.panelX + 12 + (this.panelW - 44) + 8, y+1, p.toFixed(3), { fontSize: "12px", color:"#ddd" }).setDepth(9);
      this._labelGroup.push(lbl);
    }
    // color current row tiles influenced by memory and probs
    const r = this.row;
    for (let c=0;c<this.gridW;c++) {
      const intensity = probs[c] || 0;
      // tile fill influenced by memory (heat) and probability
      const mem = this.memory[c] || 0;
      const g = Math.floor(Math.min(220, 120 + 110 * intensity + 80 * mem));
      const b = Math.floor(Math.min(240, 160 + 60 * intensity));
      const color = Phaser.Display.Color.GetColor(10, g, b);
      this.tiles[r][c].setFillStyle(color);
    }
  }

  renderRowLocal() {
    const p = this.quantumEngine.state || Array(this.gridW).fill(1/this.gridW);
    this.visualizeProbs(p);
  }

  drawWaveField() {
    const ctx = this.waveCtx;
    const w = this.boardW, h = this.canvasH;
    const p = this.quantumEngine.state || Array(this.gridW).fill(0.12);
    ctx.clearRect(0,0,w,h);
    for (let x=0; x<w; x+=2) {
      const col = Math.floor(x/this.tileSize);
      const ampBase = p[col] || 0.05;
      const yCenter = h/2;
      const y = yCenter + Math.sin((x*0.015) + this.wavePhase + col*0.5) * (30*ampBase + 8);
      const grad = ctx.createLinearGradient(x,0,x,h);
      grad.addColorStop(0, `rgba(70,160,255,${0.003 + ampBase*0.02})`);
      grad.addColorStop(1, `rgba(120,30,255,${0.002 + ampBase*0.01})`);
      ctx.fillStyle = grad; ctx.fillRect(x,0,2,h);
    }
    const grd = ctx.createRadialGradient(w/2, h/2, 40, w/2, h/2, 400);
    const glowAlpha = 0.02 + Math.min(0.22, this.streak * 0.02);
    grd.addColorStop(0, `rgba(120,220,255,${glowAlpha})`);
    grd.addColorStop(1, `rgba(6,6,12,0)`);
    ctx.fillStyle = grd; ctx.fillRect(0,0,w,h);
    this.textures.get('wave').refresh();
    // tint based on coherence
    const hue = Phaser.Math.Interpolation.Linear([180, 0], 1 - (this.coherence / 100));
    this.cameras.main.setBackgroundColor(`hsl(${hue}, 50%, 4%)`);
    this.wavePhase += this.waveSpeed;
  }

  // -------------------- Utility: weighted random, tones, UI ----------------
  weightedRandom(probs) {
    const s = probs.reduce((a,b)=>a+b,0)||1;
    let r = Math.random() * s;
    for (let i=0;i<probs.length;i++) { r -= probs[i]; if (r <= 0) return i; }
    return probs.length - 1;
  }

  playTone(freq=440, dur=0.12, vol=0.08) {
    try {
      const ctx = this.sound.context;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = vol;
      o.start(); o.stop(ctx.currentTime + dur);
    } catch(e) {}
  }

  recordAction(key, info) {
    const t = new Date().toLocaleTimeString();
    this.recentActions.unshift({ key, info, time: t });
    if (this.recentActions.length > 12) this.recentActions.pop();
    for (let i = 0; i < this.recentActionTexts.length; i++) {
  const act = this.recentActions[i];
  const t = this.recentActionTexts[i];
  if (!act) { t.setText(""); continue; }

  let color = "#ddd";
  if (/fail/i.test(act.key)) color = "#ff6666";
  else if (/event/i.test(act.key)) color = "#ffaa44";
  else if (/M|H|Q|E|Entangle/.test(act.key)) color = "#99ffcc";

  t.setColor(color);
  t.setText(`${act.time.split(" ")[0]} ${act.key}: ${act.info}`);
}

}

  log(msg) {
    const t = new Date().toLocaleTimeString();
    this.logText.text = `[${t}] ${msg}\n` + this.logText.text;
    const lines = this.logText.text.split('\n');
    if (lines.length > 120) this.logText.text = lines.slice(0,120).join('\n');
  }

  popText(txt) {
    const t = this.add.text(this.boardX + this.boardW/2 - 70, 200, txt, { fontSize: "20px", color:"#9ff" }).setDepth(70);
    this.tweens.add({ targets:t, y: t.y - 34, alpha:0, duration:900, onComplete: ()=> t.destroy() });
  }

  updateUI() {
    this.livesText.setText(`Lives: ${this.lives}`);
    this.scoreText.setText(`Score: ${this.score}`);
    this.energyText.setText(`Energy: ${this.energy}`);
    this.coherenceText.setText(`Coherence: ${Math.max(0, Math.round(this.coherence))}%`);
    this.turnText.setText(`Turn: ${this.turnNumber}`);
    // update recent action texts in the panel
    for (let i=0;i<this.recentActionTexts.length;i++){
      const act = this.recentActions[i];
      this.recentActionTexts[i].setText(act ? `${act.time} ${act.key}: ${act.info}` : "");
    }
  }

  // -------------------- Row specials & spawn --------------------
  placeRowSpecials(row) {
    for (let c=0;c<this.gridW;c++) {
      const p = Math.random();
      if (p < 0.06) this.setTileType(row,c,'photonGate');
      else if (p < 0.12) this.setTileType(row,c,'decoField');
      else if (p < 0.18) this.setTileType(row,c,'portal');
      else if (p < 0.24) this.setTileType(row,c,'power');
      else if (p < 0.30) this.setTileType(row,c,'trap');
      else if (p < 0.36) this.setTileType(row,c,'phase');
      else if (p < 0.40) this.setTileType(row,c,'hadamardBoost');
      else this.setTileType(row,c,'normal');
    }
    // if portals exist on the same row, link pairs
    const portals = [];
    for (let c=0;c<this.gridW;c++) if (this.tileMeta[`${row}_${c}`].type === 'portal') portals.push(c);
    if (portals.length >= 2) this.linkPortal(row, portals[0], row, portals[1]);
  }

  // -------------------- lifecycle update --------------------
 update(time, delta) {
  // player visual movement
  const speed = 4;
  if (this.cursors.left.isDown) { this.playerA.x -= speed; this.playerB.x += speed; }
  if (this.cursors.right.isDown) { this.playerA.x += speed; this.playerB.x -= speed; }
  this.playerA.x = Phaser.Math.Clamp(this.playerA.x, this.boardX + 20, this.boardX + this.boardW - 20);
  this.playerB.x = Phaser.Math.Clamp(this.playerB.x, this.boardX + 20, this.boardX + this.boardW - 20);

  // input keys — block H/Q/E if out of energy
  if (this.energy > 0) {
    if (Phaser.Input.Keyboard.JustDown(this.keyH)) { this.applyLocalHadamard(); this.autoPeekLog(); }
    if (Phaser.Input.Keyboard.JustDown(this.keyQ)) { this.applyPhase(); this.autoPeekLog(); }
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) { this.peek(); this.autoPeekLog(); }
  } else {
    if (
      Phaser.Input.Keyboard.JustDown(this.keyH) ||
      Phaser.Input.Keyboard.JustDown(this.keyQ) ||
      Phaser.Input.Keyboard.JustDown(this.keyE)
    ) {
      this.flashEnergyWarning();
    }
  }

  if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) { this.measure(); this.autoPeekLog(); }
  if (Phaser.Input.Keyboard.JustDown(this.keyT)) {
    this.turnBased = !this.turnBased;
    this.modeText.setText(this.turnBased ? "Mode: TURN-BASED (T toggles)" : "Mode: REAL-TIME (T toggles)");
    this.log(`Mode switched to ${this.turnBased ? 'TURN-BASED' : 'REAL-TIME'}.`);
  }
  if (Phaser.Input.Keyboard.JustDown(this.keyL)) this.showLogOverlay(!this.logOpen, 160);

  // wave field animation
  this.drawWaveField();

  // update marker positions (so they track tiles if window resized or players move)
  for (const m of this.markers) {
    if (m.display && !m.display.destroyed) {
      const mx = this.boardX + m.c * this.tileSize + this.tileSize / 2;
      const my = m.r * this.tileSize + this.tileSize / 2;
      m.display.setPosition(mx, my - 8);
    }
  }

  // update UI
  this.updatePatternUI();
  this.updateUI();
}

flashEnergyWarning() {
  const warn = this.add.text(
    this.boardX + this.boardW / 2,
    40,
    "⚡ OUT OF ENERGY ⚡",
    { fontSize: "22px", color: "#ff6688", fontStyle: "bold" }
  ).setOrigin(0.5).setDepth(200);

  this.tweens.add({
    targets: warn,
    alpha: { from: 1, to: 0 },
    y: 10,
    duration: 1000,
    onComplete: () => warn.destroy()
  });

  // Flash the screen slightly red
  this.cameras.main.flash(150, 255, 40, 60);

  this.playTone(160, 0.1, 0.15);
}

showFloatingText(text, x, y, color = "#fff") {
  const t = this.add.text(x, y, text, {
    fontSize: "20px",
    color,
    fontStyle: "bold"
  }).setOrigin(0.5).setDepth(400);

  this.tweens.add({
    targets: t,
    y: y - 40,
    alpha: 0,
    duration: 800,
    ease: "Cubic.easeOut",
    onComplete: () => t.destroy()
  });
}

  // -------------------- cleanup and end --------------------
  restart() {
  this.children.each(child => {
    if (child && child.destroy && child !== this.cameras.main) {
      child.destroy();
    }
  });
  this.scene.stop();
  this.scene.start("FinalScene");
}

endGame(win) {
  const msg = win
    ? `✨ Quantum Victory! Score ${this.score}`
    : `💀 System Decohered! Score ${this.score}`;

  if (this._ending) return;
  this._ending = true;

  // --- Overlay blocking everything
  const overlay = this.add.rectangle(
    this.boardX + this.boardW / 2,
    this.canvasH / 2,
    this.boardW,
    this.canvasH,
    0x000000,
    0.85
  ).setDepth(300);

  // --- Message text
  this.add.text(
    this.boardX + this.boardW / 2,
    this.canvasH / 2 - 30,
    msg,
    { fontSize: "28px", color: "#fff", fontStyle: "bold" }
  ).setOrigin(0.5).setDepth(301);

  // --- Celebration / failure particles
  for (let i = 0; i < 60; i++) {
    const px = this.add.circle(
      this.boardX + Phaser.Math.Between(0, this.boardW),
      Phaser.Math.Between(0, this.canvasH),
      Phaser.Math.Between(1, 3),
      win ? 0x66ffcc : 0xff6666,
      0.8
    ).setDepth(302);

    this.tweens.add({
      targets: px,
      alpha: 0,
      duration: 800 + Math.random() * 600,
      onComplete: () => px.destroy()
    });
  }

  // --- Restart button
  const btn = this.add.text(
    this.boardX + this.boardW / 2,
    this.canvasH / 2 + 40,
    "↻ Restart Quantum Field",
    {
      fontSize: "20px",
      color: "#000",
      backgroundColor: "#9ff",
      padding: { x: 14, y: 8 }
    }
  )
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setDepth(305);

  btn.on("pointerover", () => btn.setStyle({ backgroundColor: "#bff" }));
  btn.on("pointerout", () => btn.setStyle({ backgroundColor: "#9ff" }));

  
const restartGame = () => {
  btn.disableInteractive();
  this.playTone(600, 0.15, 0.1);
  this.log("🔁 Quantum Field rebooting...");

  // Fade out smoothly
  this.cameras.main.fadeOut(600, 0, 0, 0);

  this.cameras.main.once("camerafadeoutcomplete", () => {
    // Restart the scene with tutorial skipped
    this.scene.start("FinalScene", { skipTutorial: true });
  });
};

const menuBtn = this.add.text(
  this.boardX + this.boardW / 2,
  this.canvasH / 2 + 90,
  "🏠 Return to Main Menu",
  {
    fontSize: "20px",
    color: "#000",
    backgroundColor: "#9ff",
    padding: { x: 14, y: 8 }
  }
).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(305);

menuBtn.on("pointerdown", () => {
  this.playTone(400, 0.15, 0.1);
  this.cameras.main.fadeOut(600, 0, 0, 0);
  this.cameras.main.once("camerafadeoutcomplete", () => {
    this.scene.start("StartScene");
  });
});

console.log("Restart triggered → fading out...");

  btn.on("pointerdown", restartGame);

  // --- Subtle overlay breathing
  this.tweens.add({
    targets: overlay,
    alpha: { from: 0.85, to: 0.92 },
    duration: 1000,
    yoyo: true,
    repeat: -1,
    ease: "Sine.easeInOut"
  });
}
}

const config = {
  type: Phaser.AUTO,
  width: Math.max(window.innerWidth - 20, 1000),
  height: 640,
  backgroundColor: "#05020a",
  parent: "game-container",
  scene: [StartScene, FinalScene] // StartScene FIRST!
};

new Phaser.Game(config);

