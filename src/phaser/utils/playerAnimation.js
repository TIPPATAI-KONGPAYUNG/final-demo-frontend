export function playIdle(player) {
    const dir = player.directions[player.directionIndex];
    
    try {
        if (dir === 'left' || dir === 'right') {
            player.anims.play('stand-side', true);
            player.setFlipX(dir === 'left');
        } else {
            player.anims.play('stand-' + dir, true);
            player.setFlipX(false);
        }
    } catch (error) {
        console.warn(`Animation not found for direction:`, dir);
        player.setFlipX(dir === 'left');
    }
}

export function playAttack(player) {
    const dir = player.directions[player.directionIndex];
    
    try {
        if (dir === 'left' || dir === 'right') {
            player.anims.play('actack-side', true);
            player.setFlipX(dir === 'left');
        } else {
            player.anims.play('actack-' + dir, true);
            player.setFlipX(false);
        }

        player.once('animationcomplete', () => {
            playIdle(player);
        });
    } catch (error) {
        console.warn(`Attack animation not found for direction:`, dir);
        player.setFlipX(dir === 'left');
    }
}

export function playWalk(player) {
    const dir = player.directions[player.directionIndex];
    
    try {
        if (dir === 'left' || dir === 'right') {
            player.anims.play('walk-side', true);
            player.setFlipX(dir === 'left');
        } else {
            player.anims.play('walk-' + dir, true);
            player.setFlipX(false);
        }
    } catch (error) {
        console.warn(`Walk animation not found for direction:`, dir);
        player.setFlipX(dir === 'left');
    }
}
