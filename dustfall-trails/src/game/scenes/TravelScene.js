import { palette, scenes } from '../config/gameData.js';
import { chooseBountyEncounter, resolveTravelChoice } from '../systems/travel.js';
import { drawButton, drawPanel, labelStyle, textStyle, titleStyle } from '../ui/drawing.js';
import BaseScene from './BaseScene.js';

export default class TravelScene extends BaseScene {
  constructor() {
    super(scenes.TRAVEL);
  }

  create() {
    super.create();
    this.message = 'The road is open. Scout carefully or push hard for outlaw rewards.';
    this.startTitleTrailMusic();
    this.draw();
  }

  draw() {
    this.children.removeAll(true);
    const state = this.getState();
    this.drawFrame('Cinder Mesa Road', 'Plan the crossing, manage risk, and decide where the crew makes its stand.');
    this.drawStats();
    this.drawRoute(state);

    drawPanel(this, 628, 112, 286, 408);
    this.add.text(650, 138, 'Trail Orders', titleStyle(22));
    this.add.text(650, 174, this.message, {
      ...textStyle(14, '#e2d9bd'),
      wordWrap: { width: 238 },
      lineSpacing: 4,
    });
    this.add.text(650, 276, `Route Progress ${state.routeProgress}%`, labelStyle(14, '#f5df9b'));
    this.add.rectangle(650, 306, 230, 12, palette.shadow, 0.68).setOrigin(0);
    this.add.rectangle(650, 306, 230 * (state.routeProgress / 100), 12, palette.green).setOrigin(0);

    drawButton(this, 650, 354, 230, 'Scout Carefully', () => this.travel(false));
    drawButton(this, 650, 402, 230, 'Push for Reward', () => this.travel(true));
    const canHuntBounty = Boolean(state.bountyActive);
    drawButton(this, 650, 450, 230, 'Hunt Bounty', () => {
      if (!state.bountyActive) {
        this.message = 'Accept a bounty at the Sheriff Station before hunting a named target.';
        this.draw();
        return;
      }
      chooseBountyEncounter(state);
      this.stopTitleTrailMusic();
      this.scene.start(scenes.BATTLE);
    }, true, 'attack', { disabled: !canHuntBounty });
    drawButton(this, 650, 544, 230, 'Return to Town', () => {
      this.stopTitleTrailMusic();
      this.scene.start(scenes.HUB);
    });
  }

  drawRoute(state) {
    const map = { x: 38, y: 112, width: 548, height: 378 };
    const route = [
      { x: 84, y: 424 },
      { x: 154, y: 386 },
      { x: 228, y: 344 },
      { x: 286, y: 292 },
      { x: 354, y: 250 },
      { x: 438, y: 206 },
      { x: 532, y: 162 },
    ];

    drawPanel(this, map.x, map.y, map.width, map.height, 0.9);
    this.add.rectangle(map.x + 18, map.y + 18, map.width - 36, map.height - 36, 0xb97832).setOrigin(0);

    const g = this.add.graphics();
    g.fillStyle(0xd19a4b, 1);
    g.fillPoints(
      [
        { x: 56, y: 144 },
        { x: 282, y: 128 },
        { x: 230, y: 230 },
        { x: 88, y: 260 },
      ],
      true,
    );
    g.fillStyle(0x865530, 1);
    g.fillPoints(
      [
        { x: 344, y: 164 },
        { x: 552, y: 140 },
        { x: 544, y: 292 },
        { x: 398, y: 282 },
      ],
      true,
    );
    g.fillStyle(0x6a3f24, 1);
    g.fillPoints(
      [
        { x: 70, y: 330 },
        { x: 196, y: 286 },
        { x: 278, y: 448 },
        { x: 92, y: 456 },
      ],
      true,
    );
    g.fillStyle(0x4f6f3f, 1);
    g.fillCircle(496, 380, 22);
    g.fillCircle(472, 404, 12);
    g.fillCircle(526, 402, 10);

    this.drawRoad(route);
    this.drawMapMarker(route[0].x, route[0].y, 'Town');
    this.drawMapMarker(286, 292, 'Dry Well');
    this.drawMapMarker(438, 206, 'Ridge Gate');
    this.drawMapMarker(route[route.length - 1].x, route[route.length - 1].y, 'Bounty');
    this.drawMapLabel(92, 164, 'Red Flats');
    this.drawMapLabel(386, 168, 'Cinder Mesa');
    this.drawMapLabel(116, 430, 'Gully Wash');
    this.drawCompass(map.x + map.width - 58, map.y + 54);

    const marker = this.interpolateRoute(route, state.routeProgress / 100);
    this.add.circle(marker.x, marker.y, 14, palette.cactus).setStrokeStyle(4, palette.white);
    this.add.circle(marker.x, marker.y, 4, palette.white, 0.9);
  }

  drawRoad(points) {
    const road = this.add.graphics();
    road.lineStyle(30, 0xe8c77d, 0.88);
    road.beginPath();
    road.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => road.lineTo(point.x, point.y));
    road.strokePath();

    road.lineStyle(2, 0x6f4a2d, 0.5);
    road.beginPath();
    road.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => road.lineTo(point.x, point.y));
    road.strokePath();

    points.forEach((point) => {
      this.add.circle(point.x, point.y, 5, palette.shadow, 0.75);
      this.add.circle(point.x, point.y, 3, palette.pale, 0.9);
    });
  }

  drawMapMarker(x, y, label) {
    this.add.circle(x, y, 11, palette.shadow, 0.82).setStrokeStyle(2, palette.pale, 0.8);
    this.add.text(x + 14, y - 9, label, labelStyle(9, '#fff8e7')).setDepth(5);
  }

  drawMapLabel(x, y, label) {
    this.add.text(x, y, label, labelStyle(11, '#3a2115')).setAlpha(0.72);
  }

  drawCompass(x, y) {
    this.add.circle(x, y, 24, palette.shadow, 0.45).setStrokeStyle(1, palette.pale, 0.5);
    this.add.text(x, y - 18, 'N', labelStyle(10, '#f5df9b')).setOrigin(0.5);
    this.add.line(0, 0, x, y + 15, x, y - 10, palette.pale, 0.75).setLineWidth(2);
    this.add.line(0, 0, x - 10, y + 4, x + 10, y + 4, palette.pale, 0.4).setLineWidth(1);
  }

  interpolateRoute(points, progress) {
    const clamped = Math.max(0, Math.min(1, progress));
    const segment = clamped * (points.length - 1);
    const index = Math.min(points.length - 2, Math.floor(segment));
    const local = segment - index;
    const start = points[index];
    const end = points[index + 1];
    return {
      x: start.x + (end.x - start.x) * local,
      y: start.y + (end.y - start.y) * local,
    };
  }

  travel(risky) {
    const state = this.getState();
    const result = resolveTravelChoice(state, risky);
    if (result.startsBattle) {
      this.stopTitleTrailMusic();
      this.scene.start(scenes.BATTLE);
      return;
    }
    this.message = result.message;
    this.draw();
  }
}
