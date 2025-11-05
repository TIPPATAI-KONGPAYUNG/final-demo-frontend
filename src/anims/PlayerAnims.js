import Phaser from "phaser";

const createCharacterAnims = (anims) => {

    anims.create({
        key: 'stand-down',
        frames: anims.generateFrameNames('player', {
            prefix: 'player-',
            start: 0,
            end: 5,
            suffix: '.png'
        }),
        repeat: -1,
        frameRate: 13
    });
    anims.create({
        key: 'stand-side',
        frames: anims.generateFrameNames('player', {
            prefix: 'player-',
            start: 6,
            end: 11,
            suffix: '.png'
        }),
        repeat: -1,
        frameRate: 13
    });
    anims.create({
        key: 'stand-up',
        frames: anims.generateFrameNames('player', {
            prefix: 'player-',
            start: 12,
            end: 17,
            suffix: '.png'
        }),
        repeat: -1,
        frameRate: 13
    });

    anims.create({
        key: 'walk-down',
        frames: anims.generateFrameNames('player', {
            prefix: 'player-',
            start: 18,
            end: 23,
            suffix: '.png'
        }),
        repeat: -1,
        frameRate: 13
    });
    anims.create({
        key: 'walk-side',
        frames: anims.generateFrameNames('player', {
            prefix: 'player-',
            start: 24,
            end: 29,
            suffix: '.png'
        }),
        repeat: -1,
        frameRate: 13
    });
    anims.create({
        key: 'walk-up',
        frames: anims.generateFrameNames('player', {
            prefix: 'player-',
            start: 30,
            end: 35,
            suffix: '.png'
        }),
        repeat: -1,
        frameRate: 13
    });
    anims.create({
        key: 'actack-down',
        frames: anims.generateFrameNames('player', {
            prefix: 'player-',
            start: 36,
            end: 39,
            suffix: '.png'
        }),
        repeat: -1,
        frameRate: 13
    });
    anims.create({
        key: 'actack-side',
        frames: anims.generateFrameNames('player', {
            prefix: 'player-',
            start: 40,
            end: 43,
            suffix: '.png'
        }),
        frameRate: 13
    });
    anims.create({
        key: 'actack-up',
        frames: anims.generateFrameNames('player', {
            prefix: 'player-',
            start: 44,
            end: 47,
            suffix: '.png'
        }),
        frameRate: 13
    });
    anims.create({
        key: 'die',
        frames: anims.generateFrameNames('player', {
            prefix: 'player-',
            start: 48,
            end: 50,
            suffix: '.png'
        }),
        frameRate: 13
    });

    // Normal player animations removed - using only regular player animations
    // Player sprite mode switching removed - using only regular player

    console.log('Character animations created - using regular player only');
};

export function playWalk(player) {
    if (!player.anims) return;
    
    const direction = player.getCurrentDirection ? player.getCurrentDirection() : 'down';
    
    const animKey = `walk-${direction}`;
    
    if (player.scene.anims.exists(animKey)) {
        player.anims.play(animKey, true);
    }
}

export function playIdle(player) {
    if (!player.anims) return;
    
    const direction = player.getCurrentDirection ? player.getCurrentDirection() : 'down';
    
    const animKey = `stand-${direction}`;
    
    if (player.scene.anims.exists(animKey)) {
        player.anims.play(animKey, true);
    }
}



export {
    createCharacterAnims
}