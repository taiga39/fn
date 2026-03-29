// ============================================================
// 2D RPG Mock - Phaser 3
// Landscape, 4:3 game area centered, controls at screen edges
// ============================================================

const TILE = 32;
const MAP_COLS = 15;
const MAP_ROWS = 11;
const GAME_AREA_W = TILE * MAP_COLS; // 480
const GAME_AREA_H = TILE * MAP_ROWS; // 352 (close to 4:3 = 480:360)

// Canvas fills the whole screen; we compute layout dynamically
const SCREEN_W = 960;
const SCREEN_H = 540; // 16:9 base resolution

// --- Simple tile map (0=grass, 1=wall, 2=water, 3=house) ---
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,3,3,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,2,2,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,2,2,0,0,1],
  [1,0,0,1,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// NPCs
const NPCS = [
  { col: 4, row: 3, color: 0xff6666, name: "村人A", message: "ようこそ！\nここは始まりの村だよ。" },
  { col: 10, row: 7, color: 0x66ff66, name: "商人", message: "何か買っていくかい？\n（未実装）" },
];

const TILE_COLORS = {
  0: 0x4a8c3f,
  1: 0x666666,
  2: 0x3366cc,
  3: 0x8B6914,
};

const WALKABLE = new Set([0]);

// ============================================================
// Boot Scene
// ============================================================
class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }

  create() {
    for (const [key, color] of Object.entries(TILE_COLORS)) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(color);
      g.fillRect(0, 0, TILE, TILE);
      g.lineStyle(1, 0x00000033);
      g.strokeRect(0, 0, TILE, TILE);
      g.generateTexture(`tile_${key}`, TILE, TILE);
      g.destroy();
    }

    // grass with detail
    const gGrass = this.make.graphics({ add: false });
    gGrass.fillStyle(0x4a8c3f);
    gGrass.fillRect(0, 0, TILE, TILE);
    gGrass.fillStyle(0x55a846);
    for (let i = 0; i < 5; i++) {
      gGrass.fillRect(Phaser.Math.Between(2, TILE - 4), Phaser.Math.Between(2, TILE - 4), 2, 3);
    }
    gGrass.lineStyle(1, 0x00000022);
    gGrass.strokeRect(0, 0, TILE, TILE);
    gGrass.generateTexture("tile_0", TILE, TILE);
    gGrass.destroy();

    // player
    const pg = this.make.graphics({ add: false });
    pg.fillStyle(0x4488ff);
    pg.fillRect(4, 8, 24, 20);
    pg.fillStyle(0xffccaa);
    pg.fillRect(8, 0, 16, 14);
    pg.fillStyle(0x000000);
    pg.fillRect(12, 4, 3, 3);
    pg.fillRect(19, 4, 3, 3);
    pg.fillStyle(0x553311);
    pg.fillRect(8, 0, 16, 4);
    pg.generateTexture("player", TILE, TILE);
    pg.destroy();

    // NPCs
    NPCS.forEach((npc, i) => {
      const ng = this.make.graphics({ add: false });
      ng.fillStyle(npc.color);
      ng.fillRect(4, 8, 24, 20);
      ng.fillStyle(0xffccaa);
      ng.fillRect(8, 0, 16, 14);
      ng.fillStyle(0x000000);
      ng.fillRect(12, 4, 3, 3);
      ng.fillRect(19, 4, 3, 3);
      ng.generateTexture(`npc_${i}`, TILE, TILE);
      ng.destroy();
    });

    this.scene.start("Game");
  }
}

// ============================================================
// Game Scene - renders the 4:3 game area centered
// ============================================================
class GameScene extends Phaser.Scene {
  constructor() { super("Game"); }

  create() {
    // Offset to center the 4:3 game area
    this.offsetX = (SCREEN_W - GAME_AREA_W) / 2;
    this.offsetY = (SCREEN_H - GAME_AREA_H) / 2;

    // Dark background border
    const border = this.add.graphics();
    border.fillStyle(0x111111);
    border.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Game area background
    const areaBg = this.add.graphics();
    areaBg.fillStyle(0x000000);
    areaBg.fillRect(this.offsetX - 2, this.offsetY - 2, GAME_AREA_W + 4, GAME_AREA_H + 4);
    areaBg.lineStyle(2, 0x444444);
    areaBg.strokeRect(this.offsetX - 2, this.offsetY - 2, GAME_AREA_W + 4, GAME_AREA_H + 4);

    // Map container offset to center
    this.mapLayer = this.add.container(this.offsetX, this.offsetY);
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const t = MAP[r][c];
        const sprite = this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, `tile_${t}`);
        this.mapLayer.add(sprite);
      }
    }

    // NPCs
    this.npcSprites = NPCS.map((npc, i) => {
      const s = this.add.image(npc.col * TILE + TILE / 2, npc.row * TILE + TILE / 2, `npc_${i}`);
      this.mapLayer.add(s);
      s.setData("npcIndex", i);
      return s;
    });

    // Player
    this.playerCol = 2;
    this.playerRow = 2;
    this.player = this.add.image(
      this.playerCol * TILE + TILE / 2,
      this.playerRow * TILE + TILE / 2,
      "player"
    );
    this.mapLayer.add(this.player);

    this.playerDir = "down";
    this.dialogActive = false;
    this.isMoving = false;
    this.moveTimer = 0;
    this.moveDirection = null;
    this.moveRepeatDelay = 180;

    this.scene.launch("UI");

    // Keyboard
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
  }

  tryMove(dir) {
    if (this.dialogActive || this.isMoving) return;
    this.playerDir = dir;
    let nc = this.playerCol, nr = this.playerRow;
    if (dir === "up") nr--;
    if (dir === "down") nr++;
    if (dir === "left") nc--;
    if (dir === "right") nc++;
    if (nr < 0 || nr >= MAP_ROWS || nc < 0 || nc >= MAP_COLS) return;
    if (!WALKABLE.has(MAP[nr][nc])) return;
    if (NPCS.some(n => n.col === nc && n.row === nr)) return;

    this.isMoving = true;
    this.playerCol = nc;
    this.playerRow = nr;
    this.tweens.add({
      targets: this.player,
      x: nc * TILE + TILE / 2,
      y: nr * TILE + TILE / 2,
      duration: 140,
      ease: "Linear",
      onComplete: () => { this.isMoving = false; }
    });
  }

  pressA() {
    if (this.dialogActive) { this.closeDialog(); return; }
    let fc = this.playerCol, fr = this.playerRow;
    if (this.playerDir === "up") fr--;
    if (this.playerDir === "down") fr++;
    if (this.playerDir === "left") fc--;
    if (this.playerDir === "right") fc++;
    const npc = NPCS.find(n => n.col === fc && n.row === fr);
    if (npc) this.showDialog(npc.name, npc.message);
  }

  pressB() {
    if (this.dialogActive) { this.closeDialog(); return; }
    this.showDialog("システム", "メニュー（未実装）");
  }

  showDialog(name, message) {
    this.dialogActive = true;
    const padding = 12;
    const boxW = GAME_AREA_W - 20;
    const boxH = 80;
    const boxX = this.offsetX + 10;
    const boxY = this.offsetY + GAME_AREA_H - boxH - 10;

    this.dialogBox = this.add.graphics();
    this.dialogBox.fillStyle(0x000000, 0.85);
    this.dialogBox.fillRoundedRect(boxX, boxY, boxW, boxH, 8);
    this.dialogBox.lineStyle(2, 0xffffff, 0.8);
    this.dialogBox.strokeRoundedRect(boxX, boxY, boxW, boxH, 8);

    this.dialogNameText = this.add.text(boxX + padding, boxY + 6, name, {
      fontFamily: "monospace", fontSize: "13px", color: "#ffcc00",
    });
    this.dialogText = this.add.text(boxX + padding, boxY + 24, message, {
      fontFamily: "monospace", fontSize: "14px", color: "#ffffff",
      wordWrap: { width: boxW - padding * 2 }, lineSpacing: 4,
    });
    this.dialogIndicator = this.add.text(boxX + boxW - 24, boxY + boxH - 18, "▼", {
      fontFamily: "monospace", fontSize: "14px", color: "#ffffff",
    });
    this.tweens.add({ targets: this.dialogIndicator, alpha: 0, duration: 500, yoyo: true, repeat: -1 });
  }

  closeDialog() {
    this.dialogActive = false;
    [this.dialogBox, this.dialogText, this.dialogNameText, this.dialogIndicator]
      .forEach(o => o && o.destroy());
  }

  update(time) {
    if (this.cursors.up.isDown) this.handleDirectionHold("up", time);
    else if (this.cursors.down.isDown) this.handleDirectionHold("down", time);
    else if (this.cursors.left.isDown) this.handleDirectionHold("left", time);
    else if (this.cursors.right.isDown) this.handleDirectionHold("right", time);
    if (Phaser.Input.Keyboard.JustDown(this.keyZ)) this.pressA();
    if (Phaser.Input.Keyboard.JustDown(this.keyX)) this.pressB();
  }

  handleDirectionHold(dir, time) {
    if (this.moveDirection !== dir) {
      this.moveDirection = dir;
      this.moveTimer = 0;
      this.tryMove(dir);
    } else if (time - this.moveTimer > this.moveRepeatDelay) {
      this.moveTimer = time;
      this.tryMove(dir);
    }
  }
}

// ============================================================
// UI Scene - controls positioned from SCREEN EDGES
// ============================================================
class UIScene extends Phaser.Scene {
  constructor() { super("UI"); }

  create() {
    this.gameScene = this.scene.get("Game");
    this.activeDirection = null;
    this.dirHoldTimer = 0;

    // --- D-Pad (from LEFT-BOTTOM edge) ---
    const padCenterX = 90;
    const padCenterY = SCREEN_H - 100;
    const padRadius = 85;
    const btnSize = 52;
    const gap = 4;

    // Background circle
    const dpadBg = this.add.graphics();
    dpadBg.fillStyle(0x000000, 0.3);
    dpadBg.fillCircle(padCenterX, padCenterY, padRadius);

    // Visual arrow buttons (display only)
    const dirPositions = {
      up:    { x: padCenterX,                  y: padCenterY - btnSize - gap },
      down:  { x: padCenterX,                  y: padCenterY + btnSize + gap },
      left:  { x: padCenterX - btnSize - gap,  y: padCenterY },
      right: { x: padCenterX + btnSize + gap,  y: padCenterY },
    };
    const arrows = { up: "▲", down: "▼", left: "◀", right: "▶" };

    this.dpadGraphics = {};
    this.dpadLabels = {};
    for (const [dir, pos] of Object.entries(dirPositions)) {
      const g = this.add.graphics();
      g.fillStyle(0x333333, 0.7);
      g.fillRoundedRect(pos.x - btnSize / 2, pos.y - btnSize / 2, btnSize, btnSize, 8);
      g.lineStyle(1, 0xffffff, 0.3);
      g.strokeRoundedRect(pos.x - btnSize / 2, pos.y - btnSize / 2, btnSize, btnSize, 8);
      this.dpadGraphics[dir] = g;

      this.dpadLabels[dir] = this.add.text(pos.x, pos.y, arrows[dir], {
        fontFamily: "monospace", fontSize: "22px", color: "#cccccc",
      }).setOrigin(0.5);
    }

    // Single large touch zone covering entire D-pad area
    const dpadZone = this.add.zone(padCenterX, padCenterY, padRadius * 2, padRadius * 2)
      .setInteractive().setCircleDropZone(padRadius);
    // Need to use circle hitArea for the zone
    dpadZone.setInteractive(
      new Phaser.Geom.Circle(padRadius, padRadius, padRadius),
      Phaser.Geom.Circle.Contains
    );

    const getDirection = (px, py) => {
      const dx = px - padCenterX;
      const dy = py - padCenterY;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return null; // dead zone
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? "right" : "left";
      }
      return dy > 0 ? "down" : "up";
    };

    const highlightDir = (dir) => {
      // Reset all
      for (const [d, pos] of Object.entries(dirPositions)) {
        const g = this.dpadGraphics[d];
        g.clear();
        if (d === dir) {
          g.fillStyle(0x5588ff, 0.85);
          g.fillRoundedRect(pos.x - btnSize / 2, pos.y - btnSize / 2, btnSize, btnSize, 8);
          this.dpadLabels[d].setColor("#ffffff");
        } else {
          g.fillStyle(0x333333, 0.7);
          g.fillRoundedRect(pos.x - btnSize / 2, pos.y - btnSize / 2, btnSize, btnSize, 8);
          g.lineStyle(1, 0xffffff, 0.3);
          g.strokeRoundedRect(pos.x - btnSize / 2, pos.y - btnSize / 2, btnSize, btnSize, 8);
          this.dpadLabels[d].setColor("#cccccc");
        }
      }
    };

    const resetAll = () => {
      this.activeDirection = null;
      highlightDir(null);
    };

    dpadZone.on("pointerdown", (pointer) => {
      const dir = getDirection(pointer.x, pointer.y);
      if (dir) {
        this.activeDirection = dir;
        this.dirHoldTimer = 0;
        this.gameScene.tryMove(dir);
        highlightDir(dir);
      }
    });

    dpadZone.on("pointermove", (pointer) => {
      if (!pointer.isDown) return;
      const dir = getDirection(pointer.x, pointer.y);
      if (dir && dir !== this.activeDirection) {
        this.activeDirection = dir;
        this.dirHoldTimer = 0;
        this.gameScene.tryMove(dir);
        highlightDir(dir);
      }
    });

    dpadZone.on("pointerup", resetAll);
    dpadZone.on("pointerout", resetAll);

    // --- A / B Buttons (from RIGHT-BOTTOM edge) ---
    const aX = SCREEN_W - 70;
    const aY = SCREEN_H - 140;
    const bX = SCREEN_W - 135;
    const bY = SCREEN_H - 85;
    const abR = 32;

    this.createActionButton(aX, aY, abR, "A", 0xff4444, () => this.gameScene.pressA());
    this.createActionButton(bX, bY, abR, "B", 0x4488ff, () => this.gameScene.pressB());

    // --- Fullscreen button (top-right corner) ---
    this.createFullscreenButton();

    // --- Info text ---
    this.add.text(SCREEN_W / 2, 6, "NPCに近づいてAボタンで会話", {
      fontFamily: "monospace", fontSize: "12px", color: "#888888",
    }).setOrigin(0.5, 0);
  }

  createActionButton(x, y, r, label, color, callback) {
    const g = this.add.graphics();
    const drawNormal = () => {
      g.clear();
      g.fillStyle(color, 0.55);
      g.fillCircle(x, y, r);
      g.lineStyle(2, 0xffffff, 0.35);
      g.strokeCircle(x, y, r);
    };
    const drawPressed = () => {
      g.clear();
      g.fillStyle(color, 1.0);
      g.fillCircle(x, y, r);
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeCircle(x, y, r);
    };
    drawNormal();

    this.add.text(x, y, label, {
      fontFamily: "monospace", fontSize: "24px", fontStyle: "bold", color: "#ffffff",
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, r * 2.2, r * 2.2).setInteractive();
    zone.on("pointerdown", () => { drawPressed(); callback(); });
    zone.on("pointerup", drawNormal);
    zone.on("pointerout", drawNormal);
  }

  createFullscreenButton() {
    const x = SCREEN_W - 36;
    const y = 24;
    const size = 32;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.5);
    bg.fillRoundedRect(x - size / 2, y - size / 2, size, size, 6);
    bg.lineStyle(1, 0xffffff, 0.3);
    bg.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 6);

    // Fullscreen icon (4 corners)
    const icon = this.add.graphics();
    icon.lineStyle(2, 0xffffff, 0.8);
    const s = 5, o = 8;
    // top-left
    icon.moveTo(x - o, y - o + s); icon.lineTo(x - o, y - o); icon.lineTo(x - o + s, y - o);
    // top-right
    icon.moveTo(x + o - s, y - o); icon.lineTo(x + o, y - o); icon.lineTo(x + o, y - o + s);
    // bottom-left
    icon.moveTo(x - o, y + o - s); icon.lineTo(x - o, y + o); icon.lineTo(x - o + s, y + o);
    // bottom-right
    icon.moveTo(x + o - s, y + o); icon.lineTo(x + o, y + o); icon.lineTo(x + o, y + o - s);
    icon.strokePath();

    const zone = this.add.zone(x, y, size * 1.5, size * 1.5).setInteractive();
    zone.on("pointerdown", () => {
      if (this.scale.isFullscreen) {
        this.scale.stopFullscreen();
      } else {
        this.scale.startFullscreen();
      }
    });
  }

  update(time, delta) {
    if (this.activeDirection) {
      this.dirHoldTimer += delta;
      if (this.dirHoldTimer > 200) {
        this.dirHoldTimer -= 150;
        this.gameScene.tryMove(this.activeDirection);
      }
    }
  }
}

// ============================================================
// Phaser Config - full screen canvas
// ============================================================
const config = {
  type: Phaser.AUTO,
  width: SCREEN_W,
  height: SCREEN_H,
  parent: "game-container",
  backgroundColor: "#111111",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene, UIScene],
  input: {
    activePointers: 3,
  },
  render: {
    pixelArt: true,
  },
  fullscreenTarget: "game-container",
};

const game = new Phaser.Game(config);
