export function checkPlayerInRange(enemy) {
    // ตรวจสอบว่าศัตรูตายแล้วหรือไม่
    if (enemy.isDefeated || enemy.data?.defeated) return;

    const scene = enemy.scene;
    if (scene.isPaused || scene.gameOverTriggered) {
        return;
    }

    if (!scene.players) return;

    const player = scene.players;
    const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, player.x, player.y);

    // ตรวจสอบว่าเข้าใกล้ศัตรูหรือไม่
    if (distance <= enemy.detectionRange) {
        const { initiateCombat, isInCombat } = require('../../utils/combatSystem');

        // **เริ่ม combat mode เฉพาะครั้งแรก**
        if (!isInCombat()) {
            console.log("🎯 Initiating combat mode!");
            initiateCombat(player, enemy);
        }

        // **โจมตีเฉพาะเมื่อผ่าน cooldown**
        if (canAttack(enemy)) {
            attackPlayer(enemy, player);
        }
    }
}

export function canAttack(enemy) {
    const now = Date.now();
    const cooldownPassed = (now - enemy.lastAttackTime) >= enemy.attackCooldownTime;
    
    if (!cooldownPassed) {
        console.log(`⏰ Enemy cooldown: ${enemy.attackCooldownTime - (now - enemy.lastAttackTime)}ms remaining`);
    }
    
    return cooldownPassed;
}

export function attackPlayer(enemy, player) {
    const scene = enemy.scene;
    if (enemy.isDefeated || scene.isPaused || scene.gameOverTriggered) return;

    // ตรวจสอบ cooldown
    if (!canAttack(enemy)) {
        console.log("⏰ Enemy attack on cooldown");
        return;
    }

    enemy.lastAttackTime = Date.now();

    console.log("⚔️ Enemy attacking player!");

    // **เล่น attack animation ก่อน**
    if (enemy.anims && enemy.anims.currentAnim) {
        enemy.anims.play('vampire-attack', true);
    }

    playAttackAnimation(enemy);
    createAttackEffect(enemy);

    // **รอให้ animation เสร็จ (500ms) ก่อนทำดาเมจ**
    scene.time.delayedCall(500, () => {
        // ตรวจสอบอีกครั้งว่า game ยังไม่จบ
        if (scene.isPaused || scene.gameOverTriggered) return;

        // ใช้ระบบป้องกันใหม่
        const { defendFromEnemy } = require('./playerCombat');
        const actualDamage = defendFromEnemy(player, enemy.attackDamage);

        console.log(`💥 Damage dealt: ${actualDamage}`);

        if (player.takeDamage && actualDamage > 0) {
            player.takeDamage(actualDamage);
        }

        scene.cameras.main.shake(200, 0.01);

        scene.events.emit('enemyAttackedPlayer', {
            enemy: enemy,
            damage: enemy.attackDamage,
            actualDamage: actualDamage,
            playerHealth: player.getData('health') || 100
        });

        // **กลับไป idle animation หลังโจมตีเสร็จ**
        scene.time.delayedCall(200, () => {
            if (enemy.anims && !enemy.isDefeated) {
                enemy.anims.play('vampire-idle', true);
            }
        });
    });
}

function playAttackAnimation(enemy) {
    enemy.setTint(0xff6666);

    enemy.scene.time.delayedCall(300, () => {
        enemy.clearTint();
    });

    enemy.scene.tweens.add({
        targets: enemy,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 150,
        yoyo: true,
        ease: 'Power2'
    });
}

function createAttackEffect(enemy) {
    const scene = enemy.scene;

    // **แสดงข้อความ "ATTACK!"**
    const attackText = scene.add.text(enemy.x, enemy.y - 40, 'ATTACK!', {
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 3
    });
    attackText.setOrigin(0.5);
    attackText.setDepth(30);

    scene.tweens.add({
        targets: attackText,
        y: enemy.y - 70,
        alpha: 0,
        duration: 1000,
        ease: 'Power2.easeOut',
        onComplete: () => {
            attackText.destroy();
        }
    });

    const attackCircle = scene.add.circle(enemy.x, enemy.y, 35, 0xff4444, 0.6);
    attackCircle.setDepth(25);

    scene.tweens.add({
        targets: attackCircle,
        scaleX: 2,
        scaleY: 2,
        alpha: 0,
        duration: 400,
        ease: 'Power2.easeOut',
        onComplete: () => {
            attackCircle.destroy();
        }
    });

    createSparkEffect(enemy);
}

function createSparkEffect(enemy) {
    const scene = enemy.scene;

    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const distance = 25;

        const sparkX = enemy.x + Math.cos(angle) * distance;
        const sparkY = enemy.y + Math.sin(angle) * distance;

        const spark = scene.add.circle(sparkX, sparkY, 5, 0xffaa00, 0.8); // Larger sparks for bigger sprites
        spark.setDepth(26);

        scene.tweens.add({
            targets: spark,
            x: sparkX + Math.cos(angle) * 15,
            y: sparkY + Math.sin(angle) * 15,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 300,
            ease: 'Power2.easeOut',
            onComplete: () => {
                spark.destroy();
            }
        });
    }
}
