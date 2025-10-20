import Phaser from "phaser";
import { QuantumEngine } from "./quantum/QuantumEngine.js";

class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {}

  create() {
    // Game variables
    this.gridSize = 8;
    this.row = 0;
    this.lives = 3;
    this.score = 0;
    this.streak = 0;
    this.timerMax = 5;
    this.timeLeft = this.timerMax;
    this.quantum = new QuantumEngine(this.gridSize, 8);

    // Tutorial overlay
    this.tutorial = this.add.text(100, 250, 
      "Align your players with the bright tile → Press SPACE → Reach bottom coherently!\nArrow keys: Move | SPACE: Collapse", 
      { fontSize: "18px", color: "#ffffff", align: "center" });
    this.tutorial.setDepth(10);

    this.input.keyboard.once('keydown', () => {
      this.tutorial.destroy();
    });

    // Create grid tiles
    this.tiles = [];
    for (let r = 0; r < 8; r++) {
      this.tiles[r] = [];
      for (let c = 0; c < 8; c++) {
        const tile = this.add.rectangle(c * 80 + 40, r * 80 + 40, 76, 76, 0x222222);
        this.tiles[r][c] = tile;
      }
    }

    // Players
    this.playerA = this.add.circle(40, 40, 20, 0x44ccff);
    this.playerB = this.add.circle(40, 600 - 40, 20, 0xff44cc);

    // Coherence meter / streak / score / timer
    this.meterText = this.add.text(480, 10, `Lives: ${this.lives}`, { fontSize: "16px", color: "#00ff00" });
    this.scoreText = this.add.text(480, 30, `Score: ${this.score}`, { fontSize: "16px", color: "#ffff00" });
    this.timerText = this.add.text(480, 50, `Timer: ${this.timeLeft}`, { fontSize: "16px", color: "#ffffff" });

    // Coherence streak bar
    this.streakBar = this.add.rectangle(320, 620, 0, 20, 0x00ff00);
    this.streakBar.setOrigin(0.5, 0.5);

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on("keydown-SPACE", () => this.applyGate());

    // Timer countdown
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`Timer: ${this.timeLeft}`);
        if (this.timeLeft <= 0) this.applyGate();
      }
    });
  }

  update() {
    const speed = 4;
    if (this.cursors.left.isDown) {
      this.playerA.x -= speed;
      this.playerB.x += speed;
    }
    if (this.cursors.right.isDown) {
      this.playerA.x += speed;
      this.playerB.x -= speed;
    }

    // Tile pulse animation
    let maxIntensity = 0;
    let targetColumn = 0;
    for (let c = 0; c < this.gridSize; c++) {
      const tile = this.tiles[this.row][c];
      const intensity = this.quantum.stateA[c];
      if(intensity > maxIntensity){
        maxIntensity = intensity;
        targetColumn = c;
      }
      const flicker = 0.7 + 0.3 * Math.sin(Date.now() / 150 + c);
      const color = Phaser.Display.Color.GetColor(
        20,
        Math.min(255, (100 + 155 * intensity) * flicker),
        Math.min(255, (200 + 55 * intensity) * flicker)
      );
      tile.fillColor = color;
    }

    // Highlight target tile (most probable collapse)
    const highlightTile = this.tiles[this.row][targetColumn];
    highlightTile.setStrokeStyle(4, 0xffff00);
    for (let c = 0; c < this.gridSize; c++) {
      if(c !== targetColumn) this.tiles[this.row][c].setStrokeStyle();
    }
  }

  applyGate() {
    this.quantum.applyHadamard();
    this.renderQuantum();

    this.time.delayedCall(500, () => {
      const m = this.quantum.measure();
      if (!m.coherent) {
        this.lives--;
        this.streak = 0;
      } else {
        this.streak++;
        this.score += 10 * this.streak;
      }

      this.meterText.setText(`Lives: ${this.lives}`);
      this.scoreText.setText(`Score: ${this.score}`);
      this.timeLeft = this.timerMax;

      // Update streak bar
      this.streakBar.width = 60 * this.streak;
      if(this.streakBar.width > 480) this.streakBar.width = 480;

      // Animate players to collapse positions
      this.tweens.add({ targets: this.playerA, x: m.collapseA * 80 + 40, duration: 300 });
      this.tweens.add({ targets: this.playerB, x: m.collapseB * 80 + 40, duration: 300 });

      // Tile flash + particle effect
      for (let c = 0; c < 8; c++) {
        const tile = this.tiles[this.row][c];
        tile.fillColor = c === m.collapseA ? 0x44ff44 : 0x222222;
      }
      for (let i = 0; i < 20; i++) {
        const px = this.add.rectangle(
          m.collapseA * 80 + 40 + Phaser.Math.Between(-20, 20),
          this.row * 80 + 40 + Phaser.Math.Between(-20, 20),
          4, 4,
          0x44ff44
        );
        this.tweens.add({
          targets: px,
          alpha: 0,
          duration: 400,
          onComplete: () => px.destroy()
        });
      }

      // Next row
      if (this.lives <= 0) this.endGame(false);
      else {
        this.row++;
        if (this.row >= 8) this.endGame(true);
        else this.quantum.resetRow(m.collapseA);
      }
    });
  }

  renderQuantum() {
    for (let c = 0; c < 8; c++) {
      const tile = this.tiles[this.row][c];
      const intensity = this.quantum.stateA[c];
      const color = Phaser.Display.Color.GetColor(
        20,
        100 + 155 * intensity,
        200 + 55 * intensity
      );
      tile.fillColor = color;
    }
  }

  endGame(win) {
    const overlay = this.add.rectangle(320, 320, 640, 640, 0x000000, 0.7);
    const msg = win ? `🎉 Victory! Score: ${this.score}` : `💀 Game Over! Score: ${this.score}`;
    this.add.text(100, 300, msg, { fontSize: "32px", color: "#ffffff" });
    this.scene.pause();
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  width: 640,
  height: 640,
  backgroundColor: "#000000",
  scene: [GameScene],
});
