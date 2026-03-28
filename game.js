// ============================================================
// 2D RPG Mock - Phaser 3 + Virtual D-Pad & A/B Buttons
// ============================================================

const TILE = 32;
const MAP_COLS = 15;
const MAP_ROWS = 10;
const GAME_W = TILE * MAP_COLS; // 480
const GAME_H = TILE * MAP_ROWS; // 320

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
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// NPCs
const NPCS = [
  { col: 4, row: 3, color: 0xff6666, name: "村人A", message: "ようこそ！\nここは始まりの村だよ。" },
  { col: 10, row: 7, color: 0x66ff66, name: "商人", message: "何か買っていくかい？\n（未実装）" },
];

// Tile colors
const TILE_COLORS = {
  0: 0x4a8c3f, // grass
  1: 0x666666, // wall
  2: 0x3366cc, // water
  3: 0x8B6914, // house
};

// Walkable tiles
const WALKABLE = new Set([0]);

// ============================================================
// Boot Scene - generate textures
// ============================================================
class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }

  create() {
    // tile textures
    for (const [key, color] of Object.entries(TILE_COLORS)) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(color);
      g.fillRect(0, 0, TILE, TILE);
      // grid line
      g.lineStyle(1, 0x00000033);
      g.strokeRect(0, 0, TILE, TILE);
      g.generateTexture(`tile_${key}`, TILE, TILE);
      g.destroy();
    }

    // grass detail
    const gGrass = this.make.graphics({ add: false });
    gGrass.fillStyle(0x4a8c3f);
    gGrass.fillRect(0, 0, TILE, TILE);
    gGrass.fillStyle(0x55a846);
    for (let i = 0; i < 5; i++) {
      const bx = Phaser.Math.Between(2, TILE - 4);
      const by = Phaser.Math.Between(2, TILE - 4);
      gGrass.fillRect(bx, by, 2, 3);
    }
    gGrass.lineStyle(1, 0x00000022);
    gGrass.strokeRect(0, 0, TILE, TILE);
    gGrass.generateTexture("tile_0", TILE, TILE);
    gGrass.destroy();

    // player texture (16x16 character)
    const pg = this.make.graphics({ add: false });
    // body
    pg.fillStyle(0x4488ff);
    pg.fillRect(4, 8, 24, 20);
    // head
    pg.fillStyle(0xffccaa);
    pg.fillRect(8, 0, 16, 14);
    // eyes
    pg.fillStyle(0x000000);
    pg.fillRect(12, 4, 3, 3);
    pg.fillRect(19, 4, 3, 3);
    // hair
    pg.fillStyle(0x553311);
    pg.fillRect(8, 0, 16, 4);
    pg.generateTexture("player", TILE, TILE);
    pg.destroy();

    // NPC textures
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
// Game Scene
// ============================================================
class GameScene extends Phaser.Scene {
  constructor() { super("Game"); }

  create() {
    // --- Draw map ---
    this.mapLayer = this.add.container(0, 0);
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const t = MAP[r][c];
        const sprite = this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, `tile_${t}`);
        this.mapLayer.add(sprite);
      }
    }

    // --- NPCs ---
    this.npcSprites = NPCS.map((npc, i) => {
      const s = this.add.image(npc.col * TILE + TILE / 2, npc.row * TILE + TILE / 2, `npc_${i}`);
      s.setData("npcIndex", i);
      return s;
    });

    // --- Player ---
    this.playerCol = 2;
    this.playerRow = 2;
    this.player = this.add.image(
      this.playerCol * TILE + TILE / 2,
      this.playerRow * TILE + TILE / 2,
      "player"
    );

    // --- Direction indicator ---
    this.playerDir = "down"; // up, down, left, right

    // --- Dialog state ---
    this.dialogActive = false;
    this.dialogBox = null;
    this.dialogText = null;

    // --- Movement state ---
    this.isMoving = false;
    this.moveTimer = 0;
    this.moveDirection = null;
    this.moveRepeatDelay = 180; // ms between grid moves

    // --- Virtual Pad (drawn in UI scene) ---
    this.scene.launch("UI");

    // --- Keyboard support ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
  }

  tryMove(dir) {
    if (this.dialogActive || this.isMoving) return;

    this.playerDir = dir;
    let nc = this.playerCol;
    let nr = this.playerRow;
    if (dir === "up") nr--;
    if (dir === "down") nr++;
    if (dir === "left") nc--;
    if (dir === "right") nc++;

    if (nr < 0 || nr >= MAP_ROWS || nc < 0 || nc >= MAP_COLS) return;
    if (!WALKABLE.has(MAP[nr][nc])) return;
    // NPC collision
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
    if (this.dialogActive) {
      this.closeDialog();
      return;
    }
    // Check if facing an NPC
    let fc = this.playerCol;
    let fr = this.playerRow;
    if (this.playerDir === "up") fr--;
    if (this.playerDir === "down") fr++;
    if (this.playerDir === "left") fc--;
    if (this.playerDir === "right") fc++;

    const npc = NPCS.find(n => n.col === fc && n.row === fr);
    if (npc) {
      this.showDialog(npc.name, npc.message);
    }
  }

  pressB() {
    if (this.dialogActive) {
      this.closeDialog();
      return;
    }
    // B button - placeholder
    this.showDialog("システム", "メニュー（未実装）");
  }

  showDialog(name, message) {
    this.dialogActive = true;
    const padding = 12;
    const boxW = GAME_W - 20;
    const boxH = 80;
    const boxX = 10;
    const boxY = GAME_H - boxH - 10;

    this.dialogBox = this.add.graphics();
    this.dialogBox.fillStyle(0x000000, 0.85);
    this.dialogBox.fillRoundedRect(boxX, boxY, boxW, boxH, 8);
    this.dialogBox.lineStyle(2, 0xffffff, 0.8);
    this.dialogBox.strokeRoundedRect(boxX, boxY, boxW, boxH, 8);

    this.dialogNameText = this.add.text(boxX + padding, boxY + 6, name, {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#ffcc00",
    });

    this.dialogText = this.add.text(boxX + padding, boxY + 24, message, {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff",
      wordWrap: { width: boxW - padding * 2 },
      lineSpacing: 4,
    });

    // blink indicator
    this.dialogIndicator = this.add.text(boxX + boxW - 24, boxY + boxH - 18, "▼", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#ffffff",
    });
    this.tweens.add({
      targets: this.dialogIndicator,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  closeDialog() {
    this.dialogActive = false;
    if (this.dialogBox) this.dialogBox.destroy();
    if (this.dialogText) this.dialogText.destroy();
    if (this.dialogNameText) this.dialogNameText.destroy();
    if (this.dialogIndicator) this.dialogIndicator.destroy();
  }

  update(time, delta) {
    // Keyboard
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
// UI Scene (Virtual Pad overlay)
// ============================================================
class UIScene extends Phaser.Scene {
  constructor() { super("UI"); }

  create() {
    this.gameScene = this.scene.get("Game");
    this.activeDirection = null;
    this.dirHoldTimer = 0;

    const cam = this.cameras.main;
    const sw = cam.width;
    const sh = cam.height;

    // --- D-Pad ---
    const padCenterX = 80;
    const padCenterY = sh - 90;
    const btnSize = 48;
    const gap = 4;

    this.dpadBg = this.add.graphics();
    this.dpadBg.fillStyle(0x000000, 0.25);
    this.dpadBg.fillCircle(padCenterX, padCenterY, 78);

    const dirs = [
      { dir: "up",    x: padCenterX,              y: padCenterY - btnSize - gap },
      { dir: "down",  x: padCenterX,              y: padCenterY + btnSize + gap },
      { dir: "left",  x: padCenterX - btnSize - gap, y: padCenterY },
      { dir: "right", x: padCenterX + btnSize + gap, y: padCenterY },
    ];

    const arrows = { up: "▲", down: "▼", left: "◀", right: "▶" };

    this.dpadButtons = {};
    dirs.forEach(({ dir, x, y }) => {
      const g = this.add.graphics();
      g.fillStyle(0x333333, 0.7);
      g.fillRoundedRect(x - btnSize / 2, y - btnSize / 2, btnSize, btnSize, 6);
      g.lineStyle(1, 0xffffff, 0.3);
      g.strokeRoundedRect(x - btnSize / 2, y - btnSize / 2, btnSize, btnSize, 6);

      const label = this.add.text(x, y, arrows[dir], {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#cccccc",
      }).setOrigin(0.5);

      const zone = this.add.zone(x, y, btnSize, btnSize).setInteractive();
      zone.on("pointerdown", () => {
        this.activeDirection = dir;
        this.dirHoldTimer = 0;
        this.gameScene.tryMove(dir);
        g.clear();
        g.fillStyle(0x5588ff, 0.8);
        g.fillRoundedRect(x - btnSize / 2, y - btnSize / 2, btnSize, btnSize, 6);
        label.setColor("#ffffff");
      });

      const resetBtn = () => {
        if (this.activeDirection === dir) this.activeDirection = null;
        g.clear();
        g.fillStyle(0x333333, 0.7);
        g.fillRoundedRect(x - btnSize / 2, y - btnSize / 2, btnSize, btnSize, 6);
        g.lineStyle(1, 0xffffff, 0.3);
        g.strokeRoundedRect(x - btnSize / 2, y - btnSize / 2, btnSize, btnSize, 6);
        label.setColor("#cccccc");
      };
      zone.on("pointerup", resetBtn);
      zone.on("pointerout", resetBtn);

      this.dpadButtons[dir] = { g, label, zone };
    });

    // --- A / B Buttons ---
    const abY = sh - 90;
    const abX = sw - 70;
    const abR = 30;

    this.createActionButton(abX, abY - 40, abR, "A", "#ff4444", () => this.gameScene.pressA());
    this.createActionButton(abX - 55, abY + 15, abR, "B", "#4488ff", () => this.gameScene.pressB());

    // --- Info text ---
    this.add.text(sw / 2, 8, "RPG Mock - NPCに近づいてAボタン", {
      fontFamily: "monospace",
      fontSize: "11px",
      color: "#aaaaaa",
    }).setOrigin(0.5, 0);
  }

  createActionButton(x, y, r, label, color, callback) {
    const g = this.add.graphics();
    const colorNum = Phaser.Display.Color.HexStringToColor(color).color;
    const drawNormal = () => {
      g.clear();
      g.fillStyle(colorNum, 0.6);
      g.fillCircle(x, y, r);
      g.lineStyle(2, 0xffffff, 0.4);
      g.strokeCircle(x, y, r);
    };
    const drawPressed = () => {
      g.clear();
      g.fillStyle(colorNum, 1.0);
      g.fillCircle(x, y, r);
      g.lineStyle(2, 0xffffff, 0.8);
      g.strokeCircle(x, y, r);
    };
    drawNormal();

    this.add.text(x, y, label, {
      fontFamily: "monospace",
      fontSize: "22px",
      fontStyle: "bold",
      color: "#ffffff",
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, r * 2, r * 2).setInteractive();
    zone.on("pointerdown", () => { drawPressed(); callback(); });
    zone.on("pointerup", drawNormal);
    zone.on("pointerout", drawNormal);
  }

  update(time, delta) {
    // D-pad hold to repeat movement
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
// Phaser Config
// ============================================================
const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: "game-container",
  backgroundColor: "#222222",
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
};

const game = new Phaser.Game(config);
