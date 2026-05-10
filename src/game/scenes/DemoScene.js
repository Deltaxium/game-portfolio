import Phaser from 'phaser';

class DemoScene extends Phaser.Scene {
  constructor() {
    super('DemoScene');
  }

  preload() {}

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x171c22);

    for (let i = 0; i < 80; i += 1) {
      const x = Phaser.Math.Between(24, width - 24);
      const y = Phaser.Math.Between(24, height - 24);
      const alpha = Phaser.Math.FloatBetween(0.16, 0.75);
      this.add.circle(x, y, Phaser.Math.Between(1, 3), 0xf3f6f8, alpha);
    }

    const marker = this.add.graphics();
    marker.fillStyle(0x7bd389, 1);
    marker.fillRoundedRect(0, 0, 34, 34, 8);
    marker.generateTexture('player-marker', 34, 34);
    marker.destroy();

    this.player = this.physics.add
      .sprite(width / 2, height / 2, 'player-marker')
      .setDisplaySize(34, 34)
      .setTint(0x7bd389);

    this.player.body.setCircle(16);
    this.player.body.setCollideWorldBounds(true);

    this.goal = this.add.circle(width * 0.78, height * 0.34, 18, 0xffd166);
    this.cursors = this.input.keyboard.createCursorKeys();

    this.add.text(32, 28, 'Use arrow keys to move', {
      color: '#f3f6f8',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: '700',
    });

    this.statusText = this.add.text(32, 62, 'Reach the signal marker', {
      color: '#9fb0bd',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: '16px',
    });
  }

  update() {
    const speed = 230;
    this.player.setVelocity(0);

    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(speed);
    }

    if (this.cursors.up.isDown) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(speed);
    }

    if (this.player.body.velocity.length() > 0) {
      this.player.body.velocity.normalize().scale(speed);
    }

    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.goal.x,
      this.goal.y,
    );

    if (distance < 38) {
      this.statusText.setText('Signal found. Add your own game scene next.');
      this.goal.setFillStyle(0x7bd389);
    }
  }
}

export default DemoScene;
