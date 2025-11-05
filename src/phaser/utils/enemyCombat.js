export function takeDamage(enemy, damage) {
    if (enemy.isDefeated) return false;

    enemy.currentHealth -= damage;
    enemy.setData('health', enemy.currentHealth);


    updateHealthBar(enemy);
    showDamageText(enemy, `-${damage}`, 0xff4444);
    playHitEffect(enemy);

    if (enemy.currentHealth <= 0) {
        defeat(enemy);
        return true;
    }

    return false;
}

export function reduceHealthByPlayer(enemy, damage = 50) {
    // Delegate to takeDamage to avoid duplicated logic and keep behavior consistent
    return takeDamage(enemy, damage);
}

function updateHealthBar(enemy) {
    const healthBar = enemy.getData('healthBar');
    if (healthBar) {
        const healthPercentage = enemy.currentHealth / enemy.maxHealth;
        healthBar.scaleX = healthPercentage;

        if (healthPercentage > 0.6) {
            healthBar.setFillStyle(0x00ff00);
        } else if (healthPercentage > 0.3) {
            healthBar.setFillStyle(0xffaa00);
        } else {
            healthBar.setFillStyle(0xff0000);
        }
    }
}

function playHitEffect(enemy) {
    enemy.setTint(0xff4444);

    enemy.scene.time.delayedCall(100, () => {
        enemy.clearTint();
    });

    enemy.scene.tweens.add({
        targets: enemy,
        x: enemy.x + Phaser.Math.Between(-3, 3),
        duration: 50,
        yoyo: true,
        repeat: 3
    });
}

function showDamageText(enemy, text, color) {
    const scene = enemy.scene;

    const damageText = scene.add.text(enemy.x, enemy.y - 30, text, {
        fontSize: '14px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold'
    });
    damageText.setOrigin(0.5);
    damageText.setDepth(30);

    scene.tweens.add({
        targets: damageText,
        y: damageText.y - 40,
        alpha: 0,
        duration: 1000,
        ease: 'Power2.easeOut',
        onComplete: () => {
            damageText.destroy();
        }
    });
}

function defeat(enemy) {
    if (enemy.isDefeated) return;

    enemy.isDefeated = true;
    enemy.setData('defeated', true);

    const healthBar = enemy.getData('healthBar');
    const healthBarBg = enemy.getData('healthBarBg');
    if (healthBar) healthBar.setVisible(false);
    if (healthBarBg) healthBarBg.setVisible(false);

    enemy.scene.tweens.add({
        targets: enemy,
        scaleX: 0,
        scaleY: 0,
        rotation: Math.PI,
        alpha: 0,
        duration: 800,
        ease: 'Power2.easeOut',
        onComplete: () => {
            enemy.setVisible(false);
        }
    });

    createDeathEffect(enemy);
    enemy.scene.events.emit('enemyDefeated', enemy);
}

function createDeathEffect(enemy) {
    const scene = enemy.scene;

    const explosion = scene.add.circle(enemy.x, enemy.y, 20, 0xffff00, 0.8); // Larger explosion for bigger sprites
    explosion.setDepth(25);

    scene.tweens.add({
        targets: explosion,
        scaleX: 3,
        scaleY: 3,
        alpha: 0,
        duration: 600,
        ease: 'Power2.easeOut',
        onComplete: () => {
            explosion.destroy();
        }
    });

    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const distance = Phaser.Math.Between(20, 40);

        const sparkX = enemy.x + Math.cos(angle) * distance;
        const sparkY = enemy.y + Math.sin(angle) * distance;

        const spark = scene.add.circle(enemy.x, enemy.y, 6, 0xffd700, 1); // Larger sparks for bigger sprites
        spark.setDepth(26);

        scene.tweens.add({
            targets: spark,
            x: sparkX,
            y: sparkY,
            scaleX: 0,
            scaleY: 0,
            duration: Phaser.Math.Between(400, 800),
            ease: 'Power2.easeOut',
            onComplete: () => {
                spark.destroy();
            }
        });
    }
}
