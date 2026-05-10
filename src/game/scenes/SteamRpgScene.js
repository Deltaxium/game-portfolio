import Phaser from 'phaser';

const WORLD = 'world';
const BATTLE = 'battle';
const TILE = 48;

const palette = {
  coal: 0x15110f,
  panel: 0x2a1a13,
  brass: 0xd68a25,
  amber: 0xffc04d,
  copper: 0xb94f2f,
  red: 0x9f2d24,
  cream: 0xf7d48b,
  green: 0x7fb86d,
  blue: 0x79a6b8,
  smoke: 0x4a3b34,
};

const partyTemplate = [
  {
    name: 'Ada',
    role: 'Gearblade',
    maxHp: 120,
    hp: 120,
    speed: 42,
    atb: 0,
    statuses: [],
    skills: [
      { name: 'Strike', power: 22, target: 'enemy' },
      { name: 'Overcrank', power: 34, target: 'enemy', selfStatus: 'overheated' },
    ],
  },
  {
    name: 'Brass',
    role: 'Boiler Medic',
    maxHp: 96,
    hp: 96,
    speed: 34,
    atb: 0,
    statuses: [],
    skills: [
      { name: 'Wrench', power: 18, target: 'enemy' },
      { name: 'Steam Mend', power: -32, target: 'ally' },
    ],
  },
];

const enemyTemplate = [
  {
    name: 'Rust Hound',
    maxHp: 88,
    hp: 88,
    speed: 32,
    atb: 0,
    statuses: [],
    x: 210,
    y: 260,
    tint: palette.copper,
  },
  {
    name: 'Valve Imp',
    maxHp: 72,
    hp: 72,
    speed: 46,
    atb: 0,
    statuses: [],
    x: 330,
    y: 330,
    tint: palette.red,
  },
];

function cloneBattlers(template) {
  return template.map((unit) => ({
    ...unit,
    skills: unit.skills ? unit.skills.map((skill) => ({ ...skill })) : undefined,
    statuses: [],
  }));
}

function statusLabel(unit) {
  return unit.statuses.map((status) => status.name).join(', ') || 'Normal';
}

function hasStatus(unit, name) {
  return unit.statuses.some((status) => status.name === name);
}

function damageMultiplier(unit) {
  let multiplier = 1;
  if (hasStatus(unit, 'jammed')) multiplier *= 0.55;
  if (hasStatus(unit, 'overheated')) multiplier *= 1.25;
  if (hasStatus(unit, 'burned')) multiplier *= 0.75;
  return multiplier;
}

class SteamRpgScene extends Phaser.Scene {
  constructor() {
    super('SteamRpgScene');
  }

  create() {
    this.mode = WORLD;
    this.inventory = new Set();
    this.message = 'Find the brass key, solve the valve puzzle, then open the factory gate.';
    this.party = cloneBattlers(partyTemplate);
    this.battleEnemies = [];
    this.selectedCommand = 0;
    this.activeUnitIndex = null;
    this.inMenu = false;

    this.createTextures();
    this.createWorld();
    this.createInput();
    this.renderWorld();
  }

  createTextures() {
    const gear = this.add.graphics();
    gear.fillStyle(palette.brass, 1);
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      gear.fillRect(21 + Math.cos(angle) * 18, 21 + Math.sin(angle) * 18, 10, 10);
    }
    gear.fillCircle(26, 26, 20);
    gear.fillStyle(palette.coal, 1);
    gear.fillCircle(26, 26, 8);
    gear.generateTexture('gear', 52, 52);
    gear.destroy();

    const hero = this.add.graphics();
    hero.fillStyle(palette.blue, 1);
    hero.fillRoundedRect(8, 4, 28, 36, 6);
    hero.fillStyle(palette.brass, 1);
    hero.fillCircle(22, 8, 7);
    hero.generateTexture('hero', 44, 44);
    hero.destroy();

    const enemy = this.add.graphics();
    enemy.fillStyle(palette.copper, 1);
    enemy.fillTriangle(6, 38, 42, 38, 24, 6);
    enemy.fillStyle(palette.amber, 1);
    enemy.fillCircle(24, 24, 6);
    enemy.generateTexture('enemy', 48, 48);
    enemy.destroy();
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,ENTER,ESC,UP,DOWN');

    this.input.keyboard.on('keydown-SPACE', () => this.handleConfirm());
    this.input.keyboard.on('keydown-ENTER', () => this.handleConfirm());
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.mode === BATTLE && this.inMenu) {
        this.inMenu = false;
        this.activeUnitIndex = null;
        this.message = 'Command cancelled. Time keeps moving.';
        this.renderBattle();
      }
    });
    this.input.keyboard.on('keydown-UP', () => this.moveMenu(-1));
    this.input.keyboard.on('keydown-DOWN', () => this.moveMenu(1));
  }

  createWorld() {
    this.worldTiles = [
      '####################',
      '#....K.......#.....#',
      '#............#..E..#',
      '#..####..#####.....#',
      '#..#..#............#',
      '#..#V.#....####G####',
      '#..#..#....#.......#',
      '#..####....#.......#',
      '#..........#...F...#',
      '#....P.............#',
      '####################',
    ];
    this.player = { x: 5, y: 9 };
    this.valveSolved = false;
    this.gateOpen = false;
  }

  renderWorld() {
    this.clearScene();
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x241811);

    const offsetX = 28;
    const offsetY = 14;
    for (let y = 0; y < this.worldTiles.length; y += 1) {
      for (let x = 0; x < this.worldTiles[y].length; x += 1) {
        this.drawTile(x, y, offsetX, offsetY);
      }
    }

    this.add.image(offsetX + this.player.x * TILE + 24, offsetY + this.player.y * TILE + 24, 'hero');
    this.drawWorldHud();
  }

  drawTile(x, y, offsetX, offsetY) {
    const tile = this.worldTiles[y][x];
    const px = offsetX + x * TILE;
    const py = offsetY + y * TILE;
    const base = tile === '#' ? palette.smoke : 0x3a2619;
    this.add.rectangle(px + 24, py + 24, 46, 46, base).setStrokeStyle(1, 0x5a3922);

    if (tile === 'K' && !this.inventory.has('Brass Key')) {
      this.add.image(px + 24, py + 24, 'gear').setScale(0.48).setTint(palette.amber);
    }
    if (tile === 'V' && !this.valveSolved) {
      this.add.image(px + 24, py + 24, 'gear').setScale(0.58).setTint(palette.copper);
    }
    if (tile === 'G' && !this.gateOpen) {
      this.add.rectangle(px + 24, py + 24, 38, 44, palette.red).setStrokeStyle(2, palette.amber);
    }
    if (tile === 'E') {
      this.add.image(px + 24, py + 24, 'enemy').setScale(0.72).setTint(palette.copper);
    }
    if (tile === 'F') {
      this.add.rectangle(px + 24, py + 24, 36, 36, palette.green).setStrokeStyle(2, palette.amber);
    }
    if (tile === 'P') {
      this.add.text(px + 12, py + 12, '?', this.textStyle(24, palette.amber)).setFontStyle('700');
    }
  }

  drawWorldHud() {
    this.drawPanel(24, 438, 912, 78);
    this.add.image(52, 476, 'gear').setScale(0.5).setAlpha(0.8);
    this.add.text(84, 454, this.message, this.textStyle(17, palette.cream));
    this.add.text(
      84,
      484,
      `Inventory: ${Array.from(this.inventory).join(', ') || 'empty'}   Move: arrows/WASD   Interact: Space`,
      this.textStyle(14, 0xf1a73d),
    );
  }

  update(_time, delta) {
    if (this.mode === WORLD) {
      this.updateWorldMovement();
      return;
    }

    this.updateBattle(delta);
  }

  updateWorldMovement() {
    if (this.worldMoveLocked) return;

    const direction = this.readDirection();
    if (!direction) return;

    const next = { x: this.player.x + direction.x, y: this.player.y + direction.y };
    if (!this.canWalk(next.x, next.y)) return;

    this.player = next;
    this.worldMoveLocked = true;
    this.time.delayedCall(140, () => {
      this.worldMoveLocked = false;
    });
    this.handleTileStep();
    this.renderWorld();
  }

  readDirection() {
    if (this.cursors.left.isDown || this.keys.A.isDown) return { x: -1, y: 0 };
    if (this.cursors.right.isDown || this.keys.D.isDown) return { x: 1, y: 0 };
    if (this.cursors.up.isDown || this.keys.W.isDown) return { x: 0, y: -1 };
    if (this.cursors.down.isDown || this.keys.S.isDown) return { x: 0, y: 1 };
    return null;
  }

  canWalk(x, y) {
    const tile = this.worldTiles[y]?.[x];
    if (!tile || tile === '#') return false;
    if (tile === 'G' && !this.gateOpen) {
      this.message = this.inventory.has('Brass Key')
        ? 'The gate lock needs pressure. Solve the valve puzzle first.'
        : 'The factory gate is locked. A brass key should fit it.';
      this.renderWorld();
      return false;
    }
    return true;
  }

  handleTileStep() {
    const tile = this.worldTiles[this.player.y][this.player.x];
    if (tile === 'K' && !this.inventory.has('Brass Key')) {
      this.inventory.add('Brass Key');
      this.message = 'Collected Brass Key. It smells like oil and hot metal.';
    }
    if (tile === 'E') {
      this.startBattle();
    }
    if (tile === 'F') {
      this.message = 'Factory lift reached. Prototype objective complete.';
    }
    if (tile === 'P') {
      this.message = 'Puzzle clue: key first, valve second, gate last.';
    }
  }

  handleConfirm() {
    if (this.mode === WORLD) {
      this.interactWorld();
      return;
    }

    if (this.inMenu && this.activeUnitIndex !== null) {
      this.executeCommand();
    }
  }

  interactWorld() {
    const tile = this.worldTiles[this.player.y][this.player.x];
    if (tile === 'V') {
      if (!this.inventory.has('Brass Key')) {
        this.message = 'The valve wheel is chained. Find the brass key first.';
      } else {
        this.valveSolved = true;
        this.gateOpen = true;
        this.message = 'Valve pressure equalized. The eastern gate unlocks.';
      }
      this.renderWorld();
    }
  }

  startBattle() {
    this.mode = BATTLE;
    this.inMenu = false;
    this.activeUnitIndex = null;
    this.battleEnemies = cloneBattlers(enemyTemplate);
    this.message = 'Ambushed by coal-smoke machines. ATB gauges fill while menus are open.';
    this.renderBattle();
  }

  renderBattle() {
    this.clearScene();
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x21130f);
    this.add.rectangle(width / 2, 314, width, 180, 0x332117);
    this.add.rectangle(width / 2, 360, width, 5, palette.brass);

    this.drawBattleActors();
    this.drawBattleHud();
  }

  drawBattleActors() {
    this.battleEnemies.forEach((enemy) => {
      if (enemy.hp <= 0) return;
      this.add.image(enemy.x, enemy.y, 'enemy').setScale(1.65).setTint(enemy.tint);
      this.add.text(enemy.x - 58, enemy.y + 58, enemy.name, this.textStyle(14, palette.cream));
      this.drawBar(enemy.x - 55, enemy.y + 82, 110, 10, enemy.hp / enemy.maxHp, palette.red);
    });

    this.party.forEach((hero, index) => {
      const x = 720 + index * 96;
      const y = 265 + index * 70;
      this.add.image(x, y, 'hero').setScale(1.55).setTint(index === 0 ? palette.blue : palette.green);
      this.add.text(x - 48, y + 56, hero.name, this.textStyle(14, palette.cream));
      this.drawBar(x - 54, y + 80, 108, 10, hero.hp / hero.maxHp, palette.green);
    });
  }

  drawBattleHud() {
    this.drawPanel(20, 390, 920, 130);
    this.add.image(50, 420, 'gear').setScale(0.42).setAlpha(0.75);
    this.add.text(78, 404, this.message, this.textStyle(15, palette.cream));

    this.party.forEach((unit, index) => {
      const x = 38 + index * 240;
      const y = 442;
      this.add.text(x, y, `${unit.name}  HP ${unit.hp}/${unit.maxHp}`, this.textStyle(14, palette.cream));
      this.drawBar(x, y + 25, 170, 10, unit.atb / 100, palette.amber);
      this.add.text(x, y + 42, statusLabel(unit), this.textStyle(12, 0xf2a24b));
    });

    if (this.inMenu && this.activeUnitIndex !== null) {
      const unit = this.party[this.activeUnitIndex];
      this.drawPanel(616, 404, 300, 100);
      unit.skills.forEach((skill, index) => {
        const marker = index === this.selectedCommand ? '>' : ' ';
        this.add.text(640, 424 + index * 30, `${marker} ${skill.name}`, this.textStyle(17, palette.amber));
      });
    }
  }

  updateBattle(delta) {
    if (this.party.every((unit) => unit.hp <= 0)) {
      this.message = 'The boilers go cold. Press refresh to retry.';
      this.renderBattle();
      return;
    }

    if (this.battleEnemies.every((unit) => unit.hp <= 0)) {
      this.message = 'Victory. The route ahead clears.';
      this.mode = WORLD;
      this.replaceWorldTile('E', '.');
      this.renderWorld();
      return;
    }

    [...this.party, ...this.battleEnemies].forEach((unit) => {
      if (unit.hp <= 0 || (this.inMenu && this.party.includes(unit))) return;
      unit.atb = Math.min(100, unit.atb + (unit.speed * delta) / 1000);
    });

    const readyHero = this.party.findIndex((unit) => unit.hp > 0 && unit.atb >= 100);
    if (!this.inMenu && readyHero >= 0) {
      this.inMenu = true;
      this.activeUnitIndex = readyHero;
      this.selectedCommand = 0;
      this.message = `${this.party[readyHero].name} is ready. Choose a command.`;
      this.renderBattle();
      return;
    }

    const enemy = this.battleEnemies.find((unit) => unit.hp > 0 && unit.atb >= 100);
    if (enemy && !this.enemyActing) {
      this.enemyActing = true;
      this.enemyAction(enemy);
    }
  }

  moveMenu(direction) {
    if (!this.inMenu || this.activeUnitIndex === null) return;
    const skills = this.party[this.activeUnitIndex].skills;
    this.selectedCommand = Phaser.Math.Wrap(this.selectedCommand + direction, 0, skills.length);
    this.renderBattle();
  }

  executeCommand() {
    const actor = this.party[this.activeUnitIndex];
    const skill = actor.skills[this.selectedCommand];

    if (hasStatus(actor, 'stunned')) {
      this.message = `${actor.name} is stunned and loses the action.`;
      this.consumeTurn(actor);
      return;
    }

    if (hasStatus(actor, 'jammed') && Math.random() < 0.35) {
      this.message = `${actor.name}'s gear train jams. Command fails.`;
      this.consumeTurn(actor);
      return;
    }

    if (skill.target === 'ally') {
      const target = this.party.reduce((lowest, unit) => (unit.hp < lowest.hp ? unit : lowest), this.party[0]);
      target.hp = Math.min(target.maxHp, target.hp - skill.power);
      this.message = `${actor.name} restores ${target.name}'s pressure.`;
    } else {
      const target = this.battleEnemies.find((unit) => unit.hp > 0);
      const damage = Math.round(skill.power * damageMultiplier(actor));
      target.hp = Math.max(0, target.hp - damage);
      this.message = `${actor.name} uses ${skill.name} for ${damage} damage.`;
      if (skill.selfStatus) {
        this.applyStatus(actor, skill.selfStatus, 2);
      }
    }

    this.consumeTurn(actor);
  }

  enemyAction(enemy) {
    const target = Phaser.Utils.Array.GetRandom(this.party.filter((unit) => unit.hp > 0));
    const appliesJam = enemy.name === 'Valve Imp' && Math.random() < 0.55;
    const appliesBurn = enemy.name === 'Rust Hound' && Math.random() < 0.4;
    const damage = Math.round(16 * damageMultiplier(enemy));

    target.hp = Math.max(0, target.hp - damage);
    enemy.atb = 0;
    this.tickStatuses(enemy);

    if (appliesJam) this.applyStatus(target, 'jammed', 3);
    if (appliesBurn) this.applyStatus(target, 'burned', 3);

    this.message = `${enemy.name} strikes ${target.name} for ${damage}.`;
    this.enemyActing = false;
    this.renderBattle();
  }

  consumeTurn(unit) {
    unit.atb = 0;
    this.tickStatuses(unit);
    this.inMenu = false;
    this.activeUnitIndex = null;
    this.time.delayedCall(180, () => this.renderBattle());
  }

  applyStatus(unit, name, turns) {
    const existing = unit.statuses.find((status) => status.name === name);
    if (existing) {
      existing.turns = Math.max(existing.turns, turns);
    } else {
      unit.statuses.push({ name, turns });
    }
  }

  tickStatuses(unit) {
    unit.statuses = unit.statuses
      .map((status) => ({ ...status, turns: status.turns - 1 }))
      .filter((status) => status.turns > 0);
  }

  replaceWorldTile(target, replacement) {
    this.worldTiles = this.worldTiles.map((row) => row.replace(target, replacement));
  }

  drawPanel(x, y, width, height) {
    this.add.rectangle(x + width / 2, y + height / 2, width, height, palette.panel)
      .setStrokeStyle(3, palette.brass);
    this.add.rectangle(x + width / 2, y + 8, width - 14, 3, palette.copper);
  }

  drawBar(x, y, width, height, ratio, color) {
    this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x160d09).setStrokeStyle(1, palette.brass);
    this.add.rectangle(x + (width * Phaser.Math.Clamp(ratio, 0, 1)) / 2, y + height / 2, width * Phaser.Math.Clamp(ratio, 0, 1), height, color);
  }

  textStyle(size, color) {
    return {
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: `${size}px`,
      letterSpacing: 0,
    };
  }

  clearScene() {
    this.children.removeAll();
  }
}

export default SteamRpgScene;
