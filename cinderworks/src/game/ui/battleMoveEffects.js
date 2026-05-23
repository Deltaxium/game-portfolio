import { palette } from '../config/gameData.js';

function targetPoint(scene, target) {
  return {
    x: scene.getPartyActorX(target),
    y: scene.getPartyActorY(target) - 44,
  };
}

function addTargetMarker(scene, x, y, duration) {
  const marker = scene.add.container(x, y).setDepth(4);
  const ring = scene.add.circle(0, 0, 24, palette.red, 0.05).setStrokeStyle(2, palette.amber, 0.72);
  const left = scene.add.line(0, 0, -28, -12, -16, -12, palette.amber, 0.8).setLineWidth(2);
  const right = scene.add.line(0, 0, 28, -12, 16, -12, palette.amber, 0.8).setLineWidth(2);
  const bottom = scene.add.line(0, 0, -10, 20, 10, 20, palette.amber, 0.8).setLineWidth(2);
  marker.add([ring, left, right, bottom]);
  scene.tweens.add({
    targets: marker,
    scale: 1.18,
    alpha: 0.35,
    duration,
    ease: 'Sine.easeOut',
    onComplete: () => marker.destroy(),
  });
  return marker;
}

function tweenProjectile(scene, target, from, to, duration, onImpact) {
  const travel = Math.max(160, duration - 120);
  scene.tweens.add({
    targets: target,
    x: to.x,
    y: to.y,
    duration: travel,
    ease: 'Quad.easeIn',
    delay: 90,
    onComplete: onImpact,
  });
}

function addImpact(scene, x, y, color, duration = 120) {
  const impact = scene.add.container(x, y).setDepth(5);
  const ring = scene.add.circle(0, 0, 8, color, 0.12).setStrokeStyle(2, color, 0.75);
  const sparkA = scene.add.line(0, 0, -18, 0, 18, 0, palette.amber, 0.85).setLineWidth(2);
  const sparkB = scene.add.line(0, 0, 0, -18, 0, 18, palette.copper, 0.75).setLineWidth(2);
  impact.add([ring, sparkA, sparkB]);
  scene.tweens.add({
    targets: impact,
    scale: 1.8,
    alpha: 0,
    duration,
    ease: 'Sine.easeOut',
    onComplete: () => impact.destroy(),
  });
  return impact;
}

export function spawnBattleMoveEffect(scene, { enemy, target, action, duration }) {
  const from = { x: enemy.x, y: enemy.y - 30 };
  const to = targetPoint(scene, target);
  const objects = [addTargetMarker(scene, to.x, to.y, duration)];

  if (action.id === 'clamp-bite') {
    const jaws = scene.add.container(from.x, from.y).setDepth(5);
    const upper = scene.add.arc(0, -5, 20, 200, 340, false, palette.copper, 0.2).setStrokeStyle(5, palette.amber, 0.9);
    const lower = scene.add.arc(0, 5, 20, 20, 160, false, palette.copper, 0.2).setStrokeStyle(5, palette.red, 0.8);
    const heat = scene.add.circle(0, 0, 10, palette.red, 0.22);
    jaws.add([heat, upper, lower]);
    objects.push(jaws);
    tweenProjectile(scene, jaws, from, to, duration, () => addImpact(scene, to.x, to.y, palette.red));
    scene.tweens.add({ targets: jaws, scale: 1.35, angle: 8, duration, ease: 'Sine.easeIn' });
    return objects;
  }

  if (action.id === 'gear-spike') {
    const shard = scene.add.container(from.x, from.y).setDepth(5);
    const tooth = scene.add.triangle(0, 0, -7, -12, 15, 0, -7, 12, palette.brass, 0.95)
      .setStrokeStyle(2, palette.copper, 0.85);
    const trail = scene.add.line(0, 0, -24, 0, -8, 0, palette.copper, 0.5).setLineWidth(3);
    shard.add([trail, tooth]);
    objects.push(shard);
    tweenProjectile(scene, shard, from, to, duration, () => addImpact(scene, to.x, to.y, palette.amber));
    scene.tweens.add({ targets: shard, angle: 720, duration: Math.max(180, duration - 40), ease: 'Cubic.easeIn' });
    return objects;
  }

  if (action.id === 'pressure-pop') {
    const pulse = scene.add.container(to.x, to.y).setDepth(5).setScale(0.3).setAlpha(0.2);
    const ring = scene.add.circle(0, 0, 18, palette.cream, 0.12).setStrokeStyle(3, palette.blue, 0.72);
    const steamA = scene.add.circle(-18, 8, 8, palette.smoke, 0.22);
    const steamB = scene.add.circle(16, -8, 7, palette.cream, 0.16);
    pulse.add([ring, steamA, steamB]);
    objects.push(pulse);
    scene.tweens.add({
      targets: pulse,
      scale: 1.65,
      alpha: 0.04,
      duration,
      ease: 'Back.easeOut',
      onComplete: () => {
        addImpact(scene, to.x, to.y, palette.blue);
        pulse.destroy();
      },
    });
    return objects;
  }

  if (action.id === 'soot-blind') {
    const cloud = scene.add.container(from.x, from.y).setDepth(5);
    const core = scene.add.circle(0, 0, 13, palette.coal, 0.44);
    const sootA = scene.add.circle(-10, 5, 8, palette.smoke, 0.35);
    const sootB = scene.add.circle(11, -5, 7, palette.smoke, 0.28);
    const ember = scene.add.circle(5, 3, 2, palette.amber, 0.95);
    cloud.add([core, sootA, sootB, ember]);
    objects.push(cloud);
    tweenProjectile(scene, cloud, from, to, duration, () => addImpact(scene, to.x, to.y, palette.smoke));
    scene.tweens.add({ targets: cloud, scale: 1.35, alpha: 0.7, duration, ease: 'Sine.easeIn' });
    return objects;
  }

  if (action.id === 'ratchet-lunge') {
    const ratchet = scene.add.container(from.x, from.y).setDepth(5);
    const blurA = scene.add.circle(-18, 0, 18, palette.brass, 0.08).setScale(1.4, 0.52);
    const blurB = scene.add.circle(-34, 0, 14, palette.copper, 0.06).setScale(1.7, 0.45);
    const gear = scene.add.image(0, 0, 'gear').setScale(0.55).setTint(palette.brass);
    const slash = scene.add.line(0, 0, -24, 0, 24, 0, palette.copper, 0.82).setLineWidth(4);
    const toothA = scene.add.triangle(0, -14, -6, 0, 6, 0, 0, -12, palette.amber, 0.72);
    const toothB = scene.add.triangle(0, 14, -6, 0, 6, 0, 0, 12, palette.amber, 0.72);
    ratchet.add([blurB, blurA, gear, slash, toothA, toothB]);
    objects.push(ratchet);
    tweenProjectile(scene, ratchet, from, to, duration, () => {
      addImpact(scene, to.x, to.y, palette.brass);
      const lock = scene.add.container(to.x, to.y).setDepth(5);
      const ring = scene.add.circle(0, 0, 18, palette.brass, 0.06).setStrokeStyle(3, palette.brass, 0.8);
      const barA = scene.add.line(0, 0, -22, -12, 22, 12, palette.copper, 0.8).setLineWidth(3);
      const barB = scene.add.line(0, 0, -22, 12, 22, -12, palette.amber, 0.72).setLineWidth(3);
      lock.add([ring, barA, barB]);
      scene.tweens.add({
        targets: lock,
        scale: 1.45,
        alpha: 0,
        duration: 160,
        ease: 'Sine.easeOut',
        onComplete: () => lock.destroy(),
      });
    });
    scene.tweens.add({ targets: ratchet, angle: 760, duration, ease: 'Quad.easeIn' });
    scene.tweens.add({ targets: [blurA, blurB], alpha: 0.02, duration, ease: 'Sine.easeIn' });
    return objects;
  }

  const line = scene.add.line(from.x, from.y, 0, 0, to.x - from.x, to.y - from.y, palette.amber, 0.55).setDepth(5).setLineWidth(3);
  objects.push(line);
  scene.tweens.add({ targets: line, alpha: 0, duration, onComplete: () => line.destroy() });
  return objects;
}

export function destroyBattleMoveEffectObjects(scene, objects) {
  objects.forEach((object) => {
    scene.tweens.killTweensOf(object);
    if (object.list) {
      object.list.forEach((child) => scene.tweens.killTweensOf(child));
    }
    object.destroy();
  });
  objects.clear();
}
