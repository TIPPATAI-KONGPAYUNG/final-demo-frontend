import Phaser from "phaser"

const createVampireAnims = (anims) => {
    anims.create({
            key: 'vampire-idle',
            frames: anims.generateFrameNames('vampire', {
                prefix: 'enemies-vampire_idle-',
                start: 0,
                end: 5,
                suffix: '.png'
            }),
            repeat: -1,
            frameRate: 13
        });
        anims.create({
            key: 'vampire-movement',
            frames: anims.generateFrameNames('vampire', {
                prefix: 'enemies-vampire_movement-',
                start: 7,
                end: 5,
                suffix: '.png'
            }),
            repeat: -1,
            frameRate: 10
        });
        anims.create({
            key: 'vampire-attack',
            frames: anims.generateFrameNames('vampire', {
                prefix: 'enemies-vampire_attack-',
                start: 0,
                end: 15,
                suffix: '.png'
            }),
            repeat: -1,
            frameRate: 10
        });
        anims.create({
            key: 'vampire-death',
            frames: anims.generateFrameNames('vampire', {
                prefix: 'enemies-vampire_death-',
                start: 0,
                end: 13,
                suffix: '.png'
            }),
            repeat: -1,
            frameRate: 10
        });
        anims.create({
            key: 'vampire-take_damage',
            frames: anims.generateFrameNames('vampire', {
                prefix: 'enemies-vampire_take_damage-',
                start: 0,
                end: 4,
                suffix: '.png'
            }),
            repeat: -1,
            frameRate: 10
        });
}

export {
    createVampireAnims
}