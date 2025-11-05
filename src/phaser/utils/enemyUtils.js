export function isDefeat(enemy) {
    return enemy.isDefeated || enemy.getData('defeated') || enemy.data?.defeated;
}

export function resetEnemy(enemy, x, y) {
    enemy.setPosition(x, y);
    enemy.currentHealth = enemy.maxHealth;
    enemy.isDefeated = false;
    enemy.lastAttackTime = 0;

    enemy.setData('health', enemy.maxHealth);
    enemy.setData('defeated', false);

    enemy.setVisible(true);
    enemy.setAlpha(1);
    // Respect any default scale stored on the sprite (set when created)
    const defaultScale = enemy.getData('defaultScale') ?? 1;
    enemy.setScale(defaultScale);
    enemy.setRotation(0);
    enemy.clearTint();

    const healthBar = enemy.getData('healthBar');
    const healthBarBg = enemy.getData('healthBarBg');
    if (healthBar) {
        healthBar.setVisible(true);
        // ensure health bar scale matches enemy visual scale if needed
        healthBar.scaleX = defaultScale;
        healthBar.setFillStyle(0x00ff00);
    }
    if (healthBarBg) {
        healthBarBg.setVisible(true);
    }

}

// Note: attack setter helpers removed because they were unused across the codebase.
// If you need to set these at runtime, set the properties directly on the enemy object, e.g.:
// enemy.attackDamage = 25; enemy.attackRange = 80; enemy.attackCooldownTime = 1000;
