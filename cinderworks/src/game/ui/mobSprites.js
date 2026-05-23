import { palette } from '../config/gameData.js';

const SIZE = 72;

function stampFrame(scene, key, drawFn) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ add: false });
  drawFn(g);
  g.generateTexture(key, SIZE, SIZE);
  g.destroy();
}

function drawRustHound(g, frame) {
  const bob = frame === 0 ? 0 : 1;
  const step = frame === 0 ? 0 : 2;
  const jawOpen = frame === 1 ? 3 : 0;
  const { coal, iron, copper, amber, brass, red, smoke } = palette;

  g.fillStyle(coal, 0.35);
  g.fillEllipse(35, 61, 50, 9);

  g.lineStyle(3, copper, 1);
  g.fillStyle(iron, 1);
  g.fillRoundedRect(13, 31 + bob, 38, 19, 8);
  g.strokeRoundedRect(13, 31 + bob, 38, 19, 8);
  g.fillStyle(0x4b2f24, 1);
  g.fillRoundedRect(22, 25 + bob, 25, 17, 7);
  g.fillStyle(coal, 0.72);
  g.fillRoundedRect(24, 33 + bob, 20, 8, 4);
  g.lineStyle(1, amber, 0.82);
  g.beginPath();
  g.moveTo(27, 35 + bob);
  g.lineTo(33, 39 + bob);
  g.lineTo(40, 35 + bob);
  g.strokePath();

  g.lineStyle(3, copper, 1);
  g.beginPath();
  g.moveTo(18, 34 + bob);
  g.lineTo(7, 25 + bob);
  g.lineTo(11, 39 + bob);
  g.strokePath();
  g.fillStyle(brass, 0.75);
  g.fillCircle(8, 25 + bob, 3);

  g.fillStyle(0x5a3227, 1);
  g.fillRoundedRect(46, 23 + bob, 20, 16 + jawOpen, 5);
  g.lineStyle(2, copper, 1);
  g.strokeRoundedRect(46, 23 + bob, 20, 16 + jawOpen, 5);
  g.fillStyle(red, 0.85);
  g.fillTriangle(52, 18 + bob, 57, 7 + bob, 61, 21 + bob);
  g.fillStyle(amber, 1);
  g.fillCircle(60, 28 + bob, 2.5);
  g.fillStyle(coal, 1);
  g.fillRoundedRect(58, 34 + bob, 13, 5 + jawOpen, 2);
  g.fillStyle(amber, 0.85);
  g.fillRect(60, 36 + bob, 9, 1 + jawOpen);

  g.fillStyle(copper, 1);
  g.fillRoundedRect(17, 47 + bob, 6, 14 - step, 2);
  g.fillRoundedRect(31, 48 + bob, 6, 12 + step, 2);
  g.fillRoundedRect(44, 47 + bob, 6, 14 - step, 2);
  g.fillRoundedRect(57, 44 + bob, 5, 13 + step, 2);
  g.fillStyle(coal, 1);
  g.fillRect(18, 59, 10, 3);
  g.fillRect(31, 59, 10, 3);
  g.fillRect(41, 59, 10, 3);
  g.fillRect(53, 58, 9, 3);

  g.lineStyle(2, brass, 0.72);
  g.beginPath();
  g.moveTo(24, 30 + bob);
  g.lineTo(44, 30 + bob);
  g.moveTo(26, 44 + bob);
  g.lineTo(42, 44 + bob);
  g.strokePath();
  g.fillStyle(brass, 0.75);
  g.fillCircle(29, 26 + bob, 3);
  g.fillCircle(39, 26 + bob, 3);
  g.fillCircle(20, 36 + bob, 2);
  g.fillCircle(48, 38 + bob, 2);
  g.fillStyle(iron, 1);
  g.fillRect(28, 17 + bob, 7, 10);
  g.lineStyle(1, copper, 0.8);
  g.strokeRect(28, 17 + bob, 7, 10);

  g.fillStyle(smoke, 0.32);
  g.fillCircle(16 - frame * 3, 16, 4);
  g.fillCircle(9 - frame * 2, 10, 3);
}

function drawValveImp(g, frame) {
  const hop = frame === 0 ? 0 : 2;
  const crank = frame === 0 ? -0.18 : 0.18;
  const armLift = frame === 0 ? 0 : -4;
  const { coal, iron, panelDark, red, brass, copper, amber, cream, smoke } = palette;

  g.fillStyle(coal, 0.3);
  g.fillEllipse(36, 63, 42, 8);

  g.lineStyle(4, copper, 1);
  g.fillStyle(panelDark, 1);
  g.fillEllipse(36, 39 + hop, 29, 34);
  g.strokeEllipse(36, 39 + hop, 29, 34);
  g.fillStyle(iron, 1);
  g.fillRoundedRect(25, 20 + hop, 22, 14, 5);
  g.lineStyle(2, brass, 0.95);
  g.strokeRoundedRect(25, 20 + hop, 22, 14, 5);

  g.lineStyle(4, brass, 1);
  g.strokeCircle(36, 41 + hop, 19);
  g.lineStyle(2, copper, 1);
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8 + crank;
    g.beginPath();
    g.moveTo(36 + Math.cos(a) * 7, 41 + hop + Math.sin(a) * 7);
    g.lineTo(36 + Math.cos(a) * 22, 41 + hop + Math.sin(a) * 22);
    g.strokePath();
  }
  g.fillStyle(coal, 1);
  g.fillCircle(36, 41 + hop, 7);
  g.fillStyle(red, 0.9);
  g.fillCircle(36, 41 + hop, 3);

  g.fillStyle(red, 0.86);
  g.fillTriangle(24, 22 + hop, 15, 10 + hop, 30, 18 + hop);
  g.fillTriangle(48, 22 + hop, 57, 10 + hop, 42, 18 + hop);
  g.lineStyle(3, iron, 1);
  g.beginPath();
  g.moveTo(25, 20 + hop);
  g.lineTo(15, 13 + hop);
  g.moveTo(47, 20 + hop);
  g.lineTo(57, 13 + hop);
  g.strokePath();
  g.fillStyle(brass, 1);
  g.fillCircle(15, 13 + hop, 3);
  g.fillCircle(57, 13 + hop, 3);

  g.fillStyle(cream, 1);
  g.fillCircle(31 + frame, 27 + hop, 4);
  g.fillCircle(41 - frame, 27 + hop, 4);
  g.fillStyle(amber, 1);
  g.fillCircle(31 + frame, 27 + hop, 1.7);
  g.fillCircle(41 - frame, 27 + hop, 1.7);
  g.fillStyle(coal, 1);
  g.fillTriangle(30, 32 + hop, 36, 38 + hop, 42, 32 + hop);
  g.fillStyle(cream, 0.95);
  g.fillTriangle(34, 33 + hop, 36, 36 + hop, 38, 33 + hop);

  g.lineStyle(4, iron, 1);
  g.beginPath();
  g.moveTo(23, 42 + hop);
  g.lineTo(10, 35 + hop + armLift);
  g.moveTo(49, 42 + hop);
  g.lineTo(62, 35 + hop - armLift);
  g.strokePath();
  g.fillStyle(brass, 1);
  g.fillCircle(10, 35 + hop + armLift, 4);
  g.fillCircle(62, 35 + hop - armLift, 4);
  g.lineStyle(2, copper, 1);
  g.beginPath();
  g.moveTo(6, 35 + hop + armLift);
  g.lineTo(14, 35 + hop + armLift);
  g.moveTo(62, 31 + hop - armLift);
  g.lineTo(62, 39 + hop - armLift);
  g.strokePath();

  g.lineStyle(3, copper, 1);
  g.beginPath();
  g.moveTo(29, 54 + hop);
  g.lineTo(22, 63);
  g.moveTo(43, 54 + hop);
  g.lineTo(50, 63);
  g.strokePath();
  g.fillStyle(coal, 1);
  g.fillRect(17, 62, 11, 3);
  g.fillRect(45, 62, 11, 3);

  g.fillStyle(copper, 1);
  g.fillRoundedRect(56, 18 + hop - armLift, 10, 6, 2);
  g.lineStyle(2, brass, 1);
  g.beginPath();
  g.moveTo(54, 21 + hop - armLift);
  g.lineTo(68, 21 + hop - armLift);
  g.moveTo(61, 14 + hop - armLift);
  g.lineTo(61, 28 + hop - armLift);
  g.strokePath();

  g.fillStyle(smoke, 0.28);
  g.fillCircle(13, 51 + frame, 4);
  g.fillCircle(59, 52 - frame, 3);
}

function drawSootSkitter(g, frame) {
  const crouch = frame === 0 ? 0 : 2;
  const { coal, iron, smoke, amber, copper, cream } = palette;

  g.fillStyle(coal, 0.34);
  g.fillEllipse(35, 62, 42, 8);

  g.fillStyle(smoke, 0.95);
  g.lineStyle(3, coal, 1);
  g.fillEllipse(35, 38 + crouch, 30, 24);
  g.strokeEllipse(35, 38 + crouch, 30, 24);
  g.fillStyle(coal, 0.82);
  g.fillEllipse(35, 41 + crouch, 20, 14);

  g.fillStyle(iron, 1);
  g.fillEllipse(35, 25 + crouch, 20, 14);
  g.lineStyle(2, copper, 1);
  g.strokeEllipse(35, 25 + crouch, 20, 14);
  g.fillStyle(amber, 1);
  g.fillCircle(31 + frame, 24 + crouch, 2.5);
  g.fillCircle(39 - frame, 24 + crouch, 2.5);
  g.fillStyle(amber, 0.65);
  g.fillCircle(22, 42 + crouch, 1.5);
  g.fillCircle(48, 45 + crouch, 1.4);
  g.fillCircle(38, 52 + crouch, 1.2);
  g.fillStyle(cream, 0.75);
  g.fillTriangle(35, 28 + crouch, 32, 33 + crouch, 38, 33 + crouch);

  g.lineStyle(3, copper, 0.9);
  for (let i = 0; i < 3; i += 1) {
    const y = 35 + i * 6 + crouch;
    const leftKneeX = 17 - i * 2;
    const rightKneeX = 53 + i * 2;
    const footY = y + 11 - frame * 2;
    g.beginPath();
    g.moveTo(25, y);
    g.lineTo(leftKneeX, y + 5);
    g.lineTo(8 - i, footY);
    g.moveTo(45, y);
    g.lineTo(rightKneeX, y + 5);
    g.lineTo(62 + i, footY);
    g.strokePath();
    g.fillStyle(coal, 1);
    g.fillRect(5 - i, footY, 8, 3);
    g.fillRect(59 + i, footY, 8, 3);
  }

  g.fillStyle(coal, 0.36);
  g.fillCircle(22 - frame * 2, 48, 8);
  g.fillStyle(coal, 0.48);
  g.fillCircle(49 + frame, 36, 5);
  g.fillCircle(25 - frame, 33, 4);
  g.fillStyle(smoke, 0.28);
  g.fillCircle(17 - frame * 2, 18, 5);
  g.fillCircle(10 - frame * 2, 12, 3);
}

function drawGearSpider(g, frame) {
  const lift = frame === 0 ? 0 : -3;
  const tick = frame === 0 ? -1 : 1;
  const { coal, iron, brass, copper, amber, red } = palette;

  g.fillStyle(coal, 0.3);
  g.fillEllipse(36, 62, 46, 8);

  g.lineStyle(3, copper, 1);
  for (let i = 0; i < 4; i += 1) {
    const y = 29 + i * 6;
    const leftKneeX = 17 - i;
    const rightKneeX = 55 + i;
    const footY = y + 16 + (i % 2 === frame ? lift : 0);
    g.beginPath();
    g.moveTo(28, y);
    g.lineTo(leftKneeX, y + 7);
    g.lineTo(8 + i * 2, footY);
    g.moveTo(44, y);
    g.lineTo(rightKneeX, y + 7);
    g.lineTo(64 - i * 2, footY);
    g.strokePath();
    g.fillStyle(brass, 0.9);
    g.fillCircle(leftKneeX, y + 7, 2.3);
    g.fillCircle(rightKneeX, y + 7, 2.3);
    g.fillStyle(coal, 1);
    g.fillRect(5 + i * 2, footY, 9, 3);
    g.fillRect(60 - i * 2, footY, 9, 3);
  }

  g.fillStyle(iron, 1);
  g.fillEllipse(36, 38, 32, 28);
  g.lineStyle(3, brass, 1);
  g.strokeEllipse(36, 38, 32, 28);

  g.fillStyle(brass, 1);
  for (let i = 0; i < 12; i += 1) {
    const a = (Math.PI * 2 * i) / 12 + frame * 0.16;
    g.fillTriangle(
      36 + Math.cos(a - 0.12) * 13,
      36 + Math.sin(a - 0.12) * 13,
      36 + Math.cos(a) * 19,
      36 + Math.sin(a) * 19,
      36 + Math.cos(a + 0.12) * 13,
      36 + Math.sin(a + 0.12) * 13,
    );
  }
  g.fillCircle(36, 36, 13);
  g.fillStyle(0x5a3a1f, 0.9);
  g.fillCircle(36, 36, 9);
  g.fillStyle(coal, 1);
  g.fillCircle(36, 36, 5);
  g.lineStyle(2, copper, 1);
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8 + frame * 0.16;
    g.beginPath();
    g.moveTo(36 + Math.cos(a) * 5, 36 + Math.sin(a) * 5);
    g.lineTo(36 + Math.cos(a) * 14, 36 + Math.sin(a) * 14);
    g.strokePath();
  }

  g.fillStyle(red, 0.92);
  g.fillCircle(29 + frame, 25, 3);
  g.fillCircle(43 - frame, 25, 3);
  g.fillStyle(amber, 0.9);
  g.fillCircle(29 + frame, 25, 1.1);
  g.fillCircle(43 - frame, 25, 1.1);
  g.fillStyle(amber, 0.9);
  g.fillRect(28, 49, 16, 3);
  g.lineStyle(2, copper, 0.95);
  g.beginPath();
  g.moveTo(29, 53);
  g.lineTo(34, 57 + tick);
  g.lineTo(39, 53);
  g.lineTo(44, 57 - tick);
  g.strokePath();
  g.fillStyle(copper, 1);
  g.fillRect(34, 13, 4, 14);
  g.fillRect(29, 11, 14, 4);
  g.fillCircle(31, 13, 2);
  g.fillCircle(41, 13, 2);
  g.lineStyle(1, brass, 0.9);
  g.strokeRect(34, 13, 4, 14);
}

function drawBoilerWarden(g, frame) {
  const pulse = frame === 0 ? 0 : 2;
  const vent = frame === 0 ? 0 : -3;
  const { coal, iron, panelDark, brass, copper, amber, red, smoke } = palette;

  g.fillStyle(coal, 0.38);
  g.fillEllipse(36, 63, 60, 10);

  g.lineStyle(4, copper, 1);
  g.fillStyle(panelDark, 1);
  g.fillRoundedRect(18, 20 + pulse, 36, 38, 8);
  g.strokeRoundedRect(18, 20 + pulse, 36, 38, 8);
  g.fillStyle(iron, 1);
  g.fillRoundedRect(23, 12 + pulse, 26, 16, 6);
  g.lineStyle(2, brass, 1);
  g.strokeRoundedRect(23, 12 + pulse, 26, 16, 6);

  g.fillStyle(red, 0.88);
  g.fillRoundedRect(27, 32 + pulse, 18, 16, 4);
  g.lineStyle(2, amber, 0.9);
  g.strokeRoundedRect(27, 32 + pulse, 18, 16, 4);
  g.fillStyle(amber, 0.65);
  g.fillCircle(32, 39 + pulse, 4 + pulse);
  g.fillCircle(40, 39 + pulse, 3 + pulse);

  g.lineStyle(5, copper, 1);
  g.beginPath();
  g.moveTo(19, 30 + pulse);
  g.lineTo(8, 38 + pulse);
  g.lineTo(12, 51 + pulse);
  g.moveTo(53, 30 + pulse);
  g.lineTo(64, 38 + pulse);
  g.lineTo(60, 51 + pulse);
  g.strokePath();
  g.fillStyle(brass, 1);
  g.fillCircle(11, 52 + pulse, 5);
  g.fillCircle(61, 52 + pulse, 5);

  g.fillStyle(copper, 1);
  g.fillRoundedRect(23, 54, 8, 10, 2);
  g.fillRoundedRect(41, 54, 8, 10, 2);
  g.fillStyle(coal, 1);
  g.fillRect(20, 62, 13, 3);
  g.fillRect(39, 62, 13, 3);

  g.lineStyle(2, brass, 0.9);
  g.beginPath();
  g.moveTo(28, 20 + pulse);
  g.lineTo(44, 20 + pulse);
  g.moveTo(25, 51 + pulse);
  g.lineTo(47, 51 + pulse);
  g.strokePath();
  g.fillStyle(brass, 0.92);
  g.fillCircle(28, 24 + pulse, 2.5);
  g.fillCircle(44, 24 + pulse, 2.5);

  g.fillStyle(smoke, 0.35);
  g.fillCircle(23, 8 + vent, 4);
  g.fillCircle(16, 5 + vent, 3);
  g.fillCircle(49, 7 + vent, 4);
}

export function ensureMobBattleTextures(scene) {
  stampFrame(scene, 'mob-rust-hound-a', (g) => drawRustHound(g, 0));
  stampFrame(scene, 'mob-rust-hound-b', (g) => drawRustHound(g, 1));
  stampFrame(scene, 'mob-valve-imp-a', (g) => drawValveImp(g, 0));
  stampFrame(scene, 'mob-valve-imp-b', (g) => drawValveImp(g, 1));
  stampFrame(scene, 'mob-soot-skitter-a', (g) => drawSootSkitter(g, 0));
  stampFrame(scene, 'mob-soot-skitter-b', (g) => drawSootSkitter(g, 1));
  stampFrame(scene, 'mob-gear-spider-a', (g) => drawGearSpider(g, 0));
  stampFrame(scene, 'mob-gear-spider-b', (g) => drawGearSpider(g, 1));
  stampFrame(scene, 'mob-boiler-warden-a', (g) => drawBoilerWarden(g, 0));
  stampFrame(scene, 'mob-boiler-warden-b', (g) => drawBoilerWarden(g, 1));
}

export function ensureMobBattleAnimations(scene) {
  [
    ['mob-rust-hound-idle', ['mob-rust-hound-a', 'mob-rust-hound-b'], 5],
    ['mob-valve-imp-idle', ['mob-valve-imp-a', 'mob-valve-imp-b'], 6],
    ['mob-soot-skitter-idle', ['mob-soot-skitter-a', 'mob-soot-skitter-b'], 7],
    ['mob-gear-spider-idle', ['mob-gear-spider-a', 'mob-gear-spider-b'], 5],
    ['mob-boiler-warden-idle', ['mob-boiler-warden-a', 'mob-boiler-warden-b'], 4],
  ].forEach(([key, frames, frameRate]) => {
    if (scene.anims.exists(key)) return;
    scene.anims.create({
      key,
      frames: frames.map((frameKey) => ({ key: frameKey })),
      frameRate,
      repeat: -1,
    });
  });
}
