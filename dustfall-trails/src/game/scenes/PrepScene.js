import { horseSpriteKeys, partySpriteKeys } from '../assets/sprites/index.js';
import { horseCatalog, horseStances, palette, riderStances, scenes, weaponCatalog } from '../config/gameData.js';
import { getPartySynergy } from '../systems/synergy.js';
import { drawButton, drawPanel, labelStyle, textStyle, titleStyle } from '../ui/drawing.js';
import BaseScene from './BaseScene.js';

export default class PrepScene extends BaseScene {
  constructor() {
    super(scenes.PREP);
  }

  create() {
    super.create();
    this.selectedRider = 0;
    this.viewMode = 'overview';
    this.floatingUi = [];
    this.normalizeHorseAssignments();
    this.draw();
  }

  normalizeHorseAssignments() {
    const used = new Set();
    this.getState().party.forEach((rider) => {
      rider.horseBonds ||= {};
      if (!rider.horseId) {
        rider.mounted = false;
        return;
      }
      if (used.has(rider.horseId)) {
        rider.horseId = null;
        rider.mounted = false;
        return;
      }
      used.add(rider.horseId);
      rider.mounted = Boolean(rider.mounted);
    });
  }

  draw() {
    this.children.removeAll(true);
    const state = this.getState();
    this.drawFrame('Prepare the Party', this.viewMode === 'overview' ? 'Select a rider to tune their build.' : 'Tune one rider without losing the party context.');
    this.drawPrepStats(state);
    if (this.viewMode === 'detail') this.drawRiderDetail(state.party[this.selectedRider]);
    else this.drawOverview(state.party);
  }

  transitionTo(mode, riderIndex = this.selectedRider) {
    this.selectedRider = riderIndex;
    this.cameras.main.fadeOut(110, 7, 3, 2);
    this.time.delayedCall(115, () => {
      this.viewMode = mode;
      this.draw();
      this.cameras.main.fadeIn(110, 7, 3, 2);
    });
  }

  drawPrepStats(state) {
    const stats = [
      { label: 'MONEY', value: `$${state.money}`, color: palette.green },
      { label: 'WANTED', value: state.wanted, color: palette.red },
      { label: 'SUPPLIES', value: state.supplies, color: palette.pale },
      { label: 'SHOWDOWN', value: `${Math.round(state.showdown)}%`, color: palette.yellow },
    ];
    stats.forEach((stat, index) => {
      const x = 506 + index * 104;
      this.add.rectangle(x, 34, 92, 30, palette.shadow, 0.76).setOrigin(0).setStrokeStyle(1, stat.color, 0.48);
      this.add.rectangle(x, 34, 4, 30, stat.color, 0.9).setOrigin(0);
      this.add.text(x + 12, 38, stat.label, labelStyle(9, '#ffe6a6'));
      this.add.text(x + 12, 49, `${stat.value}`, labelStyle(12, '#fff8e7'));
    });
  }

  drawOverview(party) {
    party.forEach((rider, index) => this.drawRiderCard(rider, index));
    drawButton(this, 42, 642, 180, 'Back to Town', () => this.scene.start(scenes.HUB));
    this.drawPartySynergy(party, true);
    this.drawRideOutButton(() => this.rideOut());
  }

  drawRiderCard(rider, index) {
    const x = 42 + index * 300;
    const weapon = weaponCatalog[rider.equippedWeapon] || weaponCatalog.revolver;
    const horse = horseCatalog[rider.horseId];
    const tone = this.getRiderTone(rider.id);
    drawPanel(this, x, 110, 270, 510);
    this.add.rectangle(x + 10, 120, 250, 4, tone, 0.9).setOrigin(0);
    this.add.text(x + 18, 132, rider.name, titleStyle(22));
    this.add.text(x + 18, 162, rider.role, labelStyle(12, '#f0c24f'));
    this.drawCorePortrait(x, rider, horse, tone);
    this.drawBuildTriangle(x, weapon, rider, tone);
    this.drawTalentProfile(x, rider, tone);
    this.drawHorseBond(x, rider, horse, tone);
    drawButton(this, x + 18, 568, 228, 'View Build', () => this.transitionTo('detail', index), true);
  }

  drawRiderDetail(rider) {
    const weapon = weaponCatalog[rider.equippedWeapon] || weaponCatalog.revolver;
    const horse = horseCatalog[rider.horseId];
    const tone = this.getRiderTone(rider.id);

    drawPanel(this, 38, 110, 286, 510);
    this.add.rectangle(50, 122, 262, 5, tone, 0.95).setOrigin(0);
    this.add.text(62, 138, rider.name, titleStyle(27));
    this.add.text(62, 172, rider.role, labelStyle(13, '#f0c24f'));
    this.drawLargePortrait(62, 202, rider, horse, tone);
    this.add.text(62, 326, 'Core Talent', labelStyle(10, '#f5df9b'));
    this.add.text(62, 345, rider.talent.name, { ...labelStyle(15, '#fff8e7'), wordWrap: { width: 230 } });
    this.drawTags(62, 374, rider.talent.tags || [], tone, 230);
    this.add.text(62, 400, rider.talent.description, { ...textStyle(12, '#fff1bf'), wordWrap: { width: 230 }, lineSpacing: 3 });

    drawPanel(this, 352, 110, 270, 510);
    this.add.text(374, 132, 'Build Core', titleStyle(22));
    this.drawDetailRow(374, 168, 'Arm', weapon.name, weapon.description, () => this.openWeaponMenu(rider, 490, 184));
    this.drawDetailRow(374, 258, 'Horse', horse?.name || 'No horse', horse?.personality || 'Fight on foot. Horse bonds remain with each individual horse.', () => this.openHorseMenu(rider, 490, 274));
    this.drawDetailRow(374, 348, 'Style', rider.riderStance, this.getStanceText(rider.riderStance), () => this.openRiderStyleMenu(rider, 490, 364));
    this.drawDetailRow(374, 438, 'Horse Style', rider.horseId ? rider.horseStance : 'On foot', rider.horseId ? 'Mounted behavior and combo posture.' : 'Assign a horse to use horse stances.', () => this.openHorseStyleMenu(rider, 490, 454));

    drawPanel(this, 648, 110, 274, 510);
    this.add.text(670, 132, 'Traits', titleStyle(22));
    this.add.text(670, 166, 'Combat Traits', labelStyle(11, '#f5df9b'));
    rider.combatTraits.forEach((trait, index) =>
      this.drawTraitSlot(670, 188 + index * 70, trait, tone, () => this.openTraitMenu(rider, 'combatTraits', 'combatTraitOptions', index, 708, 202 + index * 18)),
    );
    this.add.text(670, 408, 'Bond Traits', labelStyle(11, '#f5df9b'));
    rider.bondTraits.forEach((trait, index) =>
      this.drawTraitSlot(670, 430 + index * 70, trait, tone, () => this.openTraitMenu(rider, 'bondTraits', 'bondTraitOptions', index, 708, 444 + index * 18)),
    );

    drawButton(this, 42, 642, 152, 'Party View', () => this.transitionTo('overview'));
    drawButton(this, 212, 642, 152, 'Prev Rider', () => this.transitionTo('detail', (this.selectedRider + 2) % this.getState().party.length));
    drawButton(this, 382, 642, 152, 'Next Rider', () => this.transitionTo('detail', (this.selectedRider + 1) % this.getState().party.length));
    this.drawPartySynergy(this.getState().party);
    this.drawRideOutButton(() => this.rideOut());
  }

  rideOut() {
    this.getState().preparedSynergy = getPartySynergy(this.getState().party);
    this.scene.start(scenes.TRAVEL);
  }

  drawLargePortrait(x, y, rider, horse, tone) {
    this.add.rectangle(x, y, 238, 92, palette.shadow, 0.62).setOrigin(0).setStrokeStyle(1, palette.pale, 0.34);
    this.add.line(0, 0, x + 88, y + 48, x + 150, y + 48, horse ? tone : palette.leather, horse ? 0.82 : 0.34).setLineWidth(4);
    this.add.image(x + 70, y + 50, partySpriteKeys[rider.id] || 'sprite-marshal').setDisplaySize(76, 76);
    if (horse) this.add.image(x + 176, y + 52, this.getHorseSpriteKey(horse)).setDisplaySize(130, 84);
    else this.add.text(x + 176, y + 36, 'On foot', labelStyle(13, '#d8c7a0')).setOrigin(0.5, 0);
    this.add.text(x + 26, y + 78, 'Rider', labelStyle(9, '#d8c7a0'));
    this.add.text(x + 152, y + 78, horse?.name || 'No horse', labelStyle(9, horse ? '#f5df9b' : '#d8c7a0'));
  }

  drawCorePortrait(x, rider, horse, tone) {
    this.add.rectangle(x + 18, 188, 234, 62, palette.shadow, 0.62).setOrigin(0).setStrokeStyle(1, palette.pale, 0.34);
    this.add.line(0, 0, x + 103, 220, x + 168, 220, horse ? tone : palette.leather, horse ? 0.72 : 0.32).setLineWidth(3);
    this.add.image(x + 76, 219, partySpriteKeys[rider.id] || 'sprite-marshal').setDisplaySize(58, 58);
    if (horse) this.add.image(x + 180, 222, this.getHorseSpriteKey(horse)).setDisplaySize(108, 72);
    else this.add.text(x + 180, 203, 'On foot', labelStyle(10, '#d8c7a0')).setOrigin(0.5, 0);
    this.add.text(x + 32, 242, 'Rider', labelStyle(9, '#d8c7a0'));
    this.add.text(x + 156, 242, horse?.name || 'No horse', labelStyle(9, horse ? '#f5df9b' : '#d8c7a0'));
  }

  drawBuildTriangle(x, weapon, rider, tone) {
    this.add.text(x + 18, 262, 'Build Core', labelStyle(10, '#f5df9b'));
    [
      { label: 'ARM', value: weapon.name, x: x + 18, y: 282 },
      { label: 'STYLE', value: rider.riderStance, x: x + 98, y: 282 },
      { label: 'HORSE', value: rider.horseId ? rider.horseStance : 'On foot', x: x + 178, y: 282 },
    ].forEach((node) => this.drawBuildNode(node.x, node.y, node.label, node.value, tone));
  }

  getHorseSpriteKey(horse) {
    return horseSpriteKeys[horse?.id] || horseSpriteKeys.comet;
  }

  drawBuildNode(x, y, label, value, tone) {
    this.add.rectangle(x, y, 74, 48, palette.shadow, 0.66).setOrigin(0).setStrokeStyle(2, tone, 0.72);
    this.add.text(x + 8, y + 6, label, labelStyle(9, '#ffe6a6'));
    this.add.text(x + 8, y + 21, value, { ...labelStyle(10, '#fff8e7'), wordWrap: { width: 58 }, lineSpacing: 0 });
  }

  drawTalentProfile(x, rider, tone) {
    this.add.rectangle(x + 18, 342, 234, 138, palette.shadow, 0.52).setOrigin(0).setStrokeStyle(1, palette.pale, 0.28);
    this.add.text(x + 30, 348, 'Talents', labelStyle(9, '#f5df9b'));
    this.add.text(x + 30, 362, rider.talent.name, { ...labelStyle(10, '#fff8e7'), wordWrap: { width: 204 } });
    this.drawTags(x + 30, 384, rider.talent.tags || [], tone, 204);
    this.add.text(x + 30, 408, rider.talent.description, { ...textStyle(9, '#fff1bf'), wordWrap: { width: 204 }, lineSpacing: 1 });
    this.add.text(x + 30, 450, rider.combatTraits.filter(Boolean).map((trait) => trait.name).join(' / ') || 'Open trait slots', { ...textStyle(9, '#fff8e7'), wordWrap: { width: 204 }, lineSpacing: 0 });
  }

  drawTags(x, y, tags, tone, maxWidth = 180) {
    let cursorX = x;
    let cursorY = y;
    tags.slice(0, 3).forEach((tag) => {
      const chipWidth = Math.max(48, Math.min(maxWidth, tag.length * 7 + 18));
      if (cursorX > x && cursorX + chipWidth > x + maxWidth) {
        cursorX = x;
        cursorY += 18;
      }
      this.add.rectangle(cursorX, cursorY, chipWidth, 16, tone, 0.66).setOrigin(0).setStrokeStyle(1, palette.shadow, 0.45);
      this.add.text(cursorX + chipWidth / 2, cursorY + 3, tag, labelStyle(7, '#241914')).setOrigin(0.5, 0);
      cursorX += chipWidth + 5;
    });
  }

  drawHorseBond(x, rider, horse, tone) {
    if (!horse) {
      this.add.text(x + 18, 498, 'No horse assigned', labelStyle(10, '#d8c7a0'));
      this.add.text(x + 18, 526, 'On foot. Bonds stay per horse.', textStyle(8, '#fff1bf'));
      return;
    }
    const bond = this.getHorseBond(rider);
    this.add.text(x + 18, 498, `${horse.name} Bond`, labelStyle(10, '#f5df9b'));
    this.add.rectangle(x + 18, 516, 152, 8, palette.shadow, 0.92).setOrigin(0);
    this.add.rectangle(x + 18, 516, 152 * Math.max(0, Math.min(1, bond / 100)), 8, tone, 1).setOrigin(0);
    this.add.text(x + 180, 510, `${bond}%`, labelStyle(12, '#fff8e7'));
    this.add.text(x + 18, 540, 'Bond stays with this horse.', textStyle(8, '#fff1bf'));
  }

  drawDetailRow(x, y, label, value, description, onClick) {
    this.add.rectangle(x, y, 226, 80, palette.shadow, 0.58).setOrigin(0).setStrokeStyle(1, palette.pale, 0.28);
    this.add.text(x + 12, y + 8, label, labelStyle(10, '#f5df9b'));
    this.add.text(x + 12, y + 24, value, { ...labelStyle(13, '#fff8e7'), wordWrap: { width: 140 }, lineSpacing: 0 });
    this.add.text(x + 12, y + 44, description, { ...textStyle(10, '#fff1bf'), wordWrap: { width: 198 }, lineSpacing: 1 });
    this.drawMiniButton(x + 168, y + 10, 46, 'Swap', onClick);
  }

  drawTraitSlot(x, y, trait, tone, onClick) {
    this.add.rectangle(x, y, 226, 64, palette.shadow, 0.58).setOrigin(0).setStrokeStyle(1, tone, 0.42);
    this.add.text(x + 12, y + 6, trait?.name || 'No trait', { ...labelStyle(12, trait ? '#fff8e7' : '#d8c7a0'), wordWrap: { width: 130 } });
    this.add.text(x + 12, y + 24, trait?.description || 'This slot is open.', { ...textStyle(9, '#fff1bf'), wordWrap: { width: 142 }, lineSpacing: 1 });
    this.drawTraitBadge(x + 146, y + 38, trait?.tags?.[0], tone);
    this.drawMiniButton(x + 178, y + 6, 38, 'Swap', onClick);
  }

  drawTraitBadge(x, y, tag, tone) {
    if (!tag) return;
    const width = 70;
    this.add.rectangle(x, y, width, 16, tone, 0.66).setOrigin(0).setStrokeStyle(1, palette.shadow, 0.45);
    this.add.text(x + width / 2, y + 3, tag, labelStyle(7, '#241914')).setOrigin(0.5, 0);
  }

  drawMiniButton(x, y, width, label, onClick) {
    const bg = this.add.rectangle(x, y, width, 24, palette.brown, 1).setOrigin(0);
    bg.setStrokeStyle(1, palette.pale, 0.7).setInteractive({ useHandCursor: true });
    this.add.text(x + width / 2, y + 6, label, labelStyle(8, '#fff8e7')).setOrigin(0.5, 0);
    bg.on('pointerover', () => bg.setFillStyle(palette.leather, 1));
    bg.on('pointerout', () => bg.setFillStyle(palette.brown, 1));
    bg.on('pointerdown', onClick);
  }

  drawPartySynergy(party, expanded = false) {
    const identity = getPartySynergy(party);
    if (!expanded) {
      drawPanel(this, 552, 630, 150, 76, 0.88);
      this.add.text(568, 642, identity.name, labelStyle(12, '#fff8e7'));
      this.add.text(568, 660, identity.description, { ...textStyle(9, '#fff1bf'), wordWrap: { width: 118 }, lineSpacing: 1 });
      return;
    }

    drawPanel(this, 248, 630, 454, 76, 0.88);
    this.add.text(266, 644, `Synergy Effect: ${identity.name}`, labelStyle(12, '#fff8e7'));
    this.add.text(266, 664, this.getSynergyEffectText(identity), { ...textStyle(9, '#fff1bf'), wordWrap: { width: 408 }, lineSpacing: 1 });
  }

  getSynergyEffectText(identity) {
    const effects = {
      stampede: 'Mounted riders gain speed and damage. More Mounted tags raise the bonus.',
      deadeye: 'Rifle and revolver attacks hit harder outside the Front lane. Rifle/Revolver tags improve it.',
      'dust-devils': 'All riders gain speed. Throwables and attacks against Snared or Dust-Choked targets hit harder.',
      'iron-vultures': 'Bleeding targets, Wanted riders, and Grit states add damage. Bleed/Wanted/Grit tags improve it.',
      'frontier-survivors': 'Party takes less damage and healing is stronger. Tank and Support tags improve it.',
      none: 'No crew-wide combat bonus is active. Change weapons, stances, horses, or traits to form one.',
    };
    return effects[identity.id] || identity.description;
  }

  drawRideOutButton(onClick) {
    const x = 724;
    const y = 642;
    const bg = this.add.rectangle(x, y, 180, 58, palette.yellow, 1).setOrigin(0);
    bg.setStrokeStyle(3, palette.pale, 0.86).setInteractive({ useHandCursor: true });
    this.add.circle(x + 28, y + 29, 12, palette.brown, 0.9).setStrokeStyle(2, palette.shadow);
    this.add.text(x + 52, y + 10, 'Ride Out', titleStyle(20, '#241914'));
    this.add.text(x + 54, y + 36, 'Start the trail', labelStyle(9, '#4b3120'));
    bg.on('pointerover', () => bg.setFillStyle(palette.pale, 1));
    bg.on('pointerout', () => bg.setFillStyle(palette.yellow, 1));
    bg.on('pointerdown', onClick);
  }

  clearFloatingUi() {
    this.floatingUi?.forEach((object) => object.destroy());
    this.floatingUi = [];
  }

  trackFloating(objects) {
    objects.forEach((object) => {
      object.setDepth?.(120);
      this.floatingUi.push(object);
    });
  }

  openOptionMenu(x, y, title, options) {
    this.clearFloatingUi();
    const width = 234;
    const rowHeight = 32;
    const height = 42 + options.length * rowHeight;
    const menuX = Phaser.Math.Clamp(x, 38, 922 - width);
    const menuY = Phaser.Math.Clamp(y, 92, 672 - height);
    const blocker = this.add.rectangle(0, 0, 960, 720, palette.shadow, 0.28).setOrigin(0).setInteractive().setDepth(110);
    blocker.on('pointerdown', () => this.clearFloatingUi());
    const panel = drawPanel(this, menuX, menuY, width, height, 0.99).setDepth(115);
    const titleText = this.add.text(menuX + 14, menuY + 14, title, labelStyle(11, '#f5df9b')).setDepth(120);
    this.trackFloating([blocker, panel, titleText]);
    options.forEach((option, index) => {
      const rowY = menuY + 36 + index * rowHeight;
      const row = this.add.rectangle(menuX + 10, rowY, width - 20, 26, option.current ? palette.pale : palette.shadow, option.current ? 0.92 : 0.72)
        .setOrigin(0)
        .setStrokeStyle(1, option.occupied ? palette.red : palette.pale, option.occupied ? 0.7 : 0.24)
        .setInteractive({ useHandCursor: true })
        .setDepth(120);
      const label = this.add.text(menuX + 20, rowY + 7, option.label, { ...labelStyle(10, option.current ? '#241914' : '#fff8e7'), wordWrap: { width: 138 } }).setDepth(121);
      const note = option.note ? this.add.text(menuX + width - 20, rowY + 8, option.note, labelStyle(8, option.occupied ? '#ffb49e' : '#d8c7a0')).setOrigin(1, 0).setDepth(121) : null;
      row.on('pointerdown', () => {
        this.clearFloatingUi();
        option.action();
      });
      this.trackFloating([row, label, ...(note ? [note] : [])]);
    });
  }

  openConfirm(title, body, onConfirm) {
    this.clearFloatingUi();
    const panel = drawPanel(this, 290, 222, 380, 172, 0.98).setDepth(130);
    const titleText = this.add.text(314, 246, title, titleStyle(20)).setDepth(135);
    const bodyText = this.add.text(314, 282, body, { ...textStyle(12, '#fff1bf'), wordWrap: { width: 330 }, lineSpacing: 4 }).setDepth(135);
    const cancel = drawButton(this, 322, 334, 132, 'Cancel', () => this.clearFloatingUi());
    const confirm = drawButton(this, 494, 334, 132, 'Swap', () => {
      this.clearFloatingUi();
      onConfirm();
    }, true);
    this.trackFloating([panel, titleText, bodyText, ...cancel, ...confirm]);
  }

  openWeaponMenu(rider, x, y) {
    this.openOptionMenu(x, y, 'Choose Arm', Object.values(weaponCatalog).map((weapon) => ({
      label: weapon.name,
      current: rider.equippedWeapon === weapon.id,
      action: () => {
        rider.equippedWeapon = weapon.id;
        this.draw();
      },
    })));
  }

  openRiderStyleMenu(rider, x, y) {
    this.openOptionMenu(x, y, 'Choose Style', riderStances.map((stance) => ({
      label: stance,
      current: rider.riderStance === stance,
      action: () => {
        rider.riderStance = stance;
        this.draw();
      },
    })));
  }

  openHorseStyleMenu(rider, x, y) {
    if (!rider.horseId) {
      this.openOptionMenu(x, y, 'Horse Style', [{ label: 'Assign a horse first', current: true, action: () => this.draw() }]);
      return;
    }
    this.openOptionMenu(x, y, 'Horse Style', horseStances.map((stance) => ({
      label: stance,
      current: rider.horseStance === stance,
      action: () => {
        rider.horseStance = stance;
        this.draw();
      },
    })));
  }

  openHorseMenu(rider, x, y) {
    const party = this.getState().party;
    const options = [
      {
        label: 'No horse',
        current: !rider.horseId,
        action: () => {
          rider.horseId = null;
          rider.mounted = false;
          this.draw();
        },
      },
      ...Object.values(horseCatalog).map((horse) => {
        const owner = party.find((member) => member !== rider && member.horseId === horse.id);
        return {
          label: horse.name,
          note: owner ? owner.name.split(' ')[0] : '',
          occupied: Boolean(owner),
          current: rider.horseId === horse.id,
          action: () => this.chooseHorse(rider, horse.id, owner),
        };
      }),
    ];
    this.openOptionMenu(x, y, 'Choose Horse', options);
  }

  chooseHorse(rider, horseId, owner) {
    if (!owner) {
      rider.horseId = horseId;
      rider.mounted = true;
      this.draw();
      return;
    }
    const riderHorse = rider.horseId;
    this.openConfirm(
      'Swap horses?',
      `${horseCatalog[horseId].name} is with ${owner.name}. Swap ${rider.name}'s current horse with them?`,
      () => {
        owner.horseId = riderHorse;
        owner.mounted = Boolean(owner.horseId);
        rider.horseId = horseId;
        rider.mounted = true;
        this.draw();
      },
    );
  }

  openTraitMenu(rider, activeKey, optionsKey, slotIndex, x, y) {
    const active = rider[activeKey];
    const options = [
      {
        label: 'No trait',
        note: 'Open',
        current: !active[slotIndex],
        action: () => this.chooseTrait(rider, activeKey, null, slotIndex, -1),
      },
      ...rider[optionsKey].map((trait) => {
      const usedIndex = active.findIndex((current) => current?.name === trait.name);
      return {
        label: trait.name,
        note: trait.tags.slice(0, 2).join('/'),
        current: usedIndex === slotIndex,
        action: () => this.chooseTrait(rider, activeKey, trait, slotIndex, usedIndex),
      };
    })];
    this.openOptionMenu(x, y, activeKey === 'combatTraits' ? 'Combat Trait' : 'Bond Trait', options);
  }

  chooseTrait(rider, activeKey, trait, slotIndex, usedIndex) {
    const active = rider[activeKey];
    const next = trait ? { ...trait, tags: [...trait.tags] } : null;
    if (usedIndex >= 0 && usedIndex !== slotIndex) {
      active[usedIndex] = active[slotIndex];
      active[slotIndex] = next;
    } else {
      active[slotIndex] = next;
    }
    this.draw();
  }

  cycleWeapon(rider) {
    const ids = Object.keys(weaponCatalog);
    rider.equippedWeapon = ids[(ids.indexOf(rider.equippedWeapon) + 1) % ids.length];
    this.draw();
  }

  cycleHorse(rider) {
    const usedByOthers = new Set(this.getState().party.filter((member) => member !== rider && member.horseId).map((member) => member.horseId));
    const ids = [null, ...Object.keys(horseCatalog).filter((horseId) => horseId === rider.horseId || !usedByOthers.has(horseId))];
    rider.horseId = ids[(ids.indexOf(rider.horseId) + 1) % ids.length];
    rider.mounted = Boolean(rider.horseId);
    this.draw();
  }

  cycleRiderStance(rider) {
    rider.riderStance = riderStances[(riderStances.indexOf(rider.riderStance) + 1) % riderStances.length];
    this.draw();
  }

  cycleHorseStance(rider) {
    if (!rider.horseId) return;
    rider.horseStance = horseStances[(horseStances.indexOf(rider.horseStance) + 1) % horseStances.length];
    this.draw();
  }

  cycleTrait(rider, activeKey, optionsKey, slotIndex) {
    const active = rider[activeKey];
    const options = rider[optionsKey];
    const usedNames = new Set(active.map((trait, index) => (index === slotIndex ? null : trait?.name)).filter(Boolean));
    const currentIndex = options.findIndex((trait) => trait.name === active[slotIndex]?.name);
    for (let offset = 1; offset <= options.length; offset += 1) {
      const next = options[(currentIndex + offset) % options.length];
      if (!usedNames.has(next.name)) {
        active[slotIndex] = { ...next, tags: [...next.tags] };
        break;
      }
    }
    this.draw();
  }

  getHorseBond(rider) {
    if (!rider.horseId) return 0;
    rider.horseBonds ||= {};
    return rider.horseBonds[rider.horseId] || 0;
  }

  getStanceText(stance) {
    const details = {
      Gunslinger: 'Fast ATB and mid-lane pressure.',
      Sharpshooter: 'Back lane, ridges, and cover.',
      Wrangler: 'Control, lasso, and mount disruption.',
      Outlaw: 'Wounded and Wanted damage spikes.',
      'Iron Rider': 'Defensive damage reduction.',
    };
    return details[stance] || 'Combat posture.';
  }

  getBuildTone(weaponId) {
    return {
      shotgun: palette.red,
      revolver: palette.yellow,
      rifle: palette.blue,
      throwable: palette.green,
      melee: palette.pale,
    }[weaponId] || palette.yellow;
  }

  getRiderTone(riderId) {
    return {
      marshal: palette.red,
      quickdraw: palette.yellow,
      sawbones: palette.blue,
    }[riderId] || palette.pale;
  }

}
