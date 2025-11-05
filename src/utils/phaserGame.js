// src/utils/phaserGame.js
// Phaser Game Functions
import Phaser from "phaser";
import {
  getCurrentGameState,
  setCurrentGameState,
  getPlayerHp,
  setPlayerHp as setGlobalPlayerHp,
  getWeaponData,
  calculateDamage,
  checkObstacleCollisionWithRadius,
  updateWeaponPosition
} from './gameUtils';

// Import new utility functions
import {
  playIdle,
} from '../phaser/utils/playerAnimation';

import {
  moveToPosition
} from '../phaser/utils/playerMovement';
import {
  checkPlayerInRange,
} from '../phaser/utils/enemyBehavior';

import {
  isDefeat,
} from '../phaser/utils/enemyUtils';

// Game functions (outside of scene)
export function drawLevel(scene) {
  if (!scene.levelData) return;

  // 🎨 วาด Background Image ก่อน
  console.log('🎨 Drawing background image...');
  if (scene.textures.exists('bg')) {
    const bg = scene.add.image(600, 450, 'bg');
    bg.setDisplaySize(scene.scale.width, scene.scale.height);
    bg.setPosition(scene.scale.width / 2, scene.scale.height / 2);
    // อันเก่าที่แก้ไข
    // bg.setDisplaySize(1000, 900); // ขนาดเต็ม canvas
    // bg.setDepth(0); // วางไว้ข้างหลังสุด
    console.log('✅ Background image drawn successfully');
  } else {
    console.warn('⚠️ Background texture "bg" not found!');
  }

  const graphics = scene.add.graphics();
  graphics.setDepth(1);
  graphics.lineStyle(3, 0xffff00);

  // Draw edges
  if (Array.isArray(scene.levelData.edges)) {
    scene.levelData.edges.forEach((edge) => {
      const fromNode = scene.levelData.nodes.find((n) => n.id === edge.from);
      const toNode = scene.levelData.nodes.find((n) => n.id === edge.to);
      if (fromNode && toNode) {
        const line = new Phaser.Geom.Line(fromNode.x, fromNode.y, toNode.x, toNode.y);
        graphics.strokeLineShape(line);
      }
    });
  }

  // Draw nodes
  if (Array.isArray(scene.levelData.nodes)) {
    scene.levelData.nodes.forEach((node) => {
      const isStart = node.id === scene.levelData.startNodeId;
      const isGoal = node.id === scene.levelData.goalNodeId;

      if (isStart) {
        graphics.fillStyle(0x00ff00, 1); // Green for start
      } else if (isGoal) {
        graphics.fillStyle(0xffd700, 1); // Gold for goal
      } else {
        graphics.fillStyle(0x0077ff, 1); // Blue for normal nodes
      }

      graphics.fillCircle(node.x, node.y, 15);

      // Add node labels (ย้ายไปข้างล่างวงกลม)
      const label = scene.add.text(node.x, node.y + 25, `${node.id}`, {
        fontSize: '12px',
        fill: '#ffffff',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      });
      label.setOrigin(0.5, 0.5);
      label.setDepth(2); // วาง label ข้างหน้าทุกอย่าง
    });
  }

  // Store graphics reference
  scene.levelGraphics = graphics;
}

export function setupObstacles(scene) {
  console.log("setupObstacles called - obstacles:", !!scene.levelData.obstacles, "count:", scene.levelData.obstacles?.length);

  // เริ่มต้น obstacles array เสมอ
  scene.obstacles = [];

  if (!scene.levelData.obstacles || scene.levelData.obstacles.length === 0) {
    console.log("No obstacles in level data - creating empty obstacles array");
    return;
  }

  scene.levelData.obstacles.forEach((obstacle, index) => {
    console.log(`Processing obstacle ${index}:`, obstacle.type, "points:", obstacle.points?.length);

    // ตรวจสอบว่า obstacle และ points มีอยู่จริง
    if (!obstacle || !obstacle.points || obstacle.points.length < 3) {
      console.warn(`Skipping obstacle ${index} - missing data or insufficient points:`, obstacle);
      return;
    }

    if (obstacle.type === "pit") {
      console.log("Setting up pit obstacle with points:", obstacle.points);

      // ตรวจสอบว่า points[0] มีอยู่จริง
      if (!obstacle.points[0] || typeof obstacle.points[0].x === 'undefined' || typeof obstacle.points[0].y === 'undefined') {
        console.warn(`Skipping pit obstacle ${index} - invalid first point:`, obstacle.points[0]);
        return;
      }

      // Draw pit
      scene.levelGraphics.fillStyle(0x000000, 0.8);
      scene.levelGraphics.beginPath();
      scene.levelGraphics.moveTo(obstacle.points[0].x, obstacle.points[0].y);

      for (let i = 1; i < obstacle.points.length; i++) {
        // ตรวจสอบว่า point มีอยู่จริง
        if (obstacle.points[i] && typeof obstacle.points[i].x !== 'undefined' && typeof obstacle.points[i].y !== 'undefined') {
          scene.levelGraphics.lineTo(obstacle.points[i].x, obstacle.points[i].y);
        }
      }
      scene.levelGraphics.closePath();
      scene.levelGraphics.fillPath();

      // Border
      scene.levelGraphics.lineStyle(3, 0x8b4513);
      scene.levelGraphics.strokePath();

      scene.obstacles.push({
        type: "pit",
        points: obstacle.points,
      });

      console.log("Pit obstacle added to scene.obstacles, total count:", scene.obstacles.length);
    }
  });

  console.log("setupObstacles completed - scene.obstacles count:", scene.obstacles.length);
}

export function setupCoins(scene) {
  if (!scene.levelData.coinPositions) return;

  scene.coins = [];

  // Reset all coins to not collected
  scene.levelData.coinPositions.forEach(coinData => {
    coinData.collected = false;
  });

  scene.levelData.coinPositions.forEach((coinData, index) => {
    // Use pixel coordinates directly
    const worldX = coinData.x;
    const worldY = coinData.y;

    // Create coin sprite
    const coinSprite = scene.add.circle(worldX, worldY, 12, 0xffd700, 1);
    coinSprite.setStrokeStyle(3, 0xffaa00);
    coinSprite.setDepth(5);

    // Add coin value text
    const valueText = scene.add.text(worldX, worldY, coinData.value.toString(), {
      fontSize: '10px',
      color: '#000000',
      fontStyle: 'bold'
    });
    valueText.setOrigin(0.5);
    valueText.setDepth(6);

    // Add glow effect
    const glowCircle = scene.add.circle(worldX, worldY, 18, 0xffd700, 0.3);
    glowCircle.setDepth(4);

    // Set coin properties
    coinSprite.setData('collected', false);
    coinSprite.setData('value', coinData.value);
    coinSprite.setData('id', coinData.id);
    coinSprite.setData('valueText', valueText);
    coinSprite.setData('glow', glowCircle);

    // Add pulsing animation
    scene.tweens.add({
      targets: [coinSprite, glowCircle],
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    scene.coins.push({
      id: coinData.id,
      sprite: coinSprite,
      value: coinData.value,
      collected: false,
      x: coinData.x,
      y: coinData.y
    });
  });

  console.log(`Setup ${scene.coins.length} coins`);
}

// Function to setup people in the scene
export function setupPeople(scene) {
  if (!scene.levelData.people) return;

  scene.people = [];

  scene.levelData.people.forEach((personData) => {
    // ใช้ตำแหน่งเดิมของคน (บน node) และขยับลงมา 10 พิกเซล
    const personX = personData.x;
    const personY = personData.y + 10;

    // Create person sprite as green rectangle (เล็กลงจาก 30x30 เป็น 20x20)
    const person = scene.add.rectangle(personX, personY, 20, 20, 0x00ff00);
    person.setStrokeStyle(2, 0xffffff);
    person.setDepth(10);

    // Add person data
    person.setData({
      nodeId: personData.nodeId,
      personName: personData.personName,
      rescued: false
    });

    // Create person name label
    const nameLabel = scene.add.text(personX, personY - 20, personData.personName, {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 3, y: 1 }
    });
    nameLabel.setOrigin(0.5, 0.5);
    nameLabel.setDepth(11);

    // Create rescue effect
    const rescueEffect = scene.add.circle(personX, personY, 25, 0x00ff00, 0.3);
    rescueEffect.setStrokeStyle(1, 0x00ff00);
    rescueEffect.setDepth(9);
    rescueEffect.setVisible(false);

    // Store references
    person.nameLabel = nameLabel;
    person.rescueEffect = rescueEffect;
    person.setData('rescueEffect', rescueEffect);

    scene.people.push(person);
  });

  console.log(`Setup ${scene.people.length} people`);
}

// Function to setup treasures in the scene
export function setupTreasures(scene) {
  if (!scene.levelData.treasures) return;

  scene.treasures = [];

  scene.levelData.treasures.forEach((treasureData) => {
    // ใช้ตำแหน่งเดิมของสมบัติ
    const treasureX = treasureData.x;
    const treasureY = treasureData.y;

    // Create treasure sprite as diamond shape
    const treasure = scene.add.polygon(treasureX, treasureY, [
      0, -15,  // top
      10, 0,   // right
      0, 15,   // bottom
      -10, 0   // left
    ], 0xffd700, 1);
    treasure.setStrokeStyle(3, 0xffaa00);
    treasure.setDepth(8);

    // Add treasure data
    treasure.setData({
      nodeId: treasureData.nodeId,
      treasureName: treasureData.name,
      collected: false,
      id: treasureData.id
    });

    // Create treasure name label
    const nameLabel = scene.add.text(treasureX, treasureY - 25, treasureData.name, {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#000000',
      padding: { x: 3, y: 1 }
    });
    nameLabel.setOrigin(0.5, 0.5);
    nameLabel.setDepth(9);

    // Create glow effect
    const glowEffect = scene.add.circle(treasureX, treasureY, 25, 0xffd700, 0.3);
    glowEffect.setStrokeStyle(2, 0xffd700);
    glowEffect.setDepth(7);

    // Add pulsing animation
    scene.tweens.add({
      targets: [treasure, glowEffect],
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Store references
    treasure.nameLabel = nameLabel;
    treasure.glowEffect = glowEffect;
    treasure.setData('glowEffect', glowEffect);

    scene.treasures.push(treasure);
  });

  console.log(`Setup ${scene.treasures.length} treasures`);
}

// Function to update person display
export function updatePersonDisplay(scene) {
  if (!scene.people || !scene.levelData || !scene.levelData.people) return;

  scene.people.forEach((person) => {
    const nodeId = person.getData('nodeId');
    const personData = scene.levelData.people.find(p => p.nodeId === nodeId);
    const rescued = personData ? personData.rescued : false;

    if (rescued) {
      // Hide person when rescued
      person.setVisible(false);
      if (person.nameLabel) {
        person.nameLabel.setVisible(false);
      }
      if (person.rescueEffect) {
        person.rescueEffect.setVisible(false);
      }
    } else {
      // Show person when not rescued
      person.setVisible(true);
      if (person.nameLabel) {
        person.nameLabel.setVisible(true);
      }
      if (person.rescueEffect) {
        person.rescueEffect.setVisible(true);
      }
    }
  });
}

// Function to update treasure display
export function updateTreasureDisplay(scene) {
  if (!scene.treasures || !scene.levelData || !scene.levelData.treasures) return;

  scene.treasures.forEach((treasure) => {
    const nodeId = treasure.getData('nodeId');
    const treasureData = scene.levelData.treasures.find(t => t.nodeId === nodeId);
    const collected = treasureData ? treasureData.collected : false;

    if (collected) {
      // Hide treasure when collected
      treasure.setVisible(false);
      if (treasure.nameLabel) {
        treasure.nameLabel.setVisible(false);
      }
      if (treasure.glowEffect) {
        treasure.glowEffect.setVisible(false);
      }
    } else {
      // Show treasure when not collected
      treasure.setVisible(true);
      if (treasure.nameLabel) {
        treasure.nameLabel.setVisible(true);
      }
      if (treasure.glowEffect) {
        treasure.glowEffect.setVisible(true);
      }
    }
  });
}

// Function to rescue person at position
export function rescuePersonAtPosition(scene, playerX, playerY) {
  if (!scene.people) return false;

  const rescueRange = 50; // Range to rescue person

  for (let person of scene.people) {
    if (person.getData('rescue')) continue; // Already rescued

    const distance = Phaser.Math.Distance.Between(playerX, playerY, person.x, person.y);

    if (distance <= rescueRange) {
      // Rescue the person
      person.setData('rescue', true);

      // Show rescue effect
      const rescueEffect = person.getData('rescueEffect');
      if (rescueEffect) {
        rescueEffect.setVisible(true);
        scene.tweens.add({
          targets: rescueEffect,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: 500,
          ease: "Power2",
          onComplete: () => {
            rescueEffect.setVisible(false);
            rescueEffect.setScale(1);
            rescueEffect.setAlpha(1);
          }
        });
      }

      // Hide person
      person.setVisible(false);
      if (person.nameLabel) {
        person.nameLabel.setVisible(false);
      }

      console.log(`Rescued ${person.getData('personName')} at node ${person.getData('nodeId')}`);
      return true;
    }
  }

  return false;
}

export function collectCoinByPlayer(scene, playerX, playerY) {
  if (!scene.coins) {
    console.log("No coins array found in scene");
    return false;
  }

  console.log(`=== PLAYER COIN COLLECTION DEBUG ===`);
  console.log(`Player position: (${playerX}, ${playerY})`);
  console.log(`Total coins: ${scene.coins.length}`);

  // Show available coins
  const availableCoins = scene.coins.filter(c => !c.collected);
  console.log('Available coins:', availableCoins.map(c => ({ id: c.id, x: c.x, y: c.y, value: c.value })));

  // Find all coins within range and sort by distance
  const coinsInRange = [];

  for (let coin of scene.coins) {
    if (!coin.collected) {
      // Check if player is close enough to the coin (within 100 pixels)
      const distance = Math.sqrt(
        Math.pow(playerX - coin.x, 2) + Math.pow(playerY - coin.y, 2)
      );

      console.log(`Coin ${coin.id} (${coin.value} points) at (${coin.x}, ${coin.y}), distance: ${distance.toFixed(2)}, can collect: ${distance <= 100}`);

      if (distance <= 100) {
        coinsInRange.push({ coin, distance });
      }
    }
  }

  // Sort coins by distance (closest first)
  coinsInRange.sort((a, b) => a.distance - b.distance);

  // Collect all coins in range
  for (let { coin, distance } of coinsInRange) {
    // Mark coin as collected
    coin.collected = true;

    // Hide coin sprite and related elements
    coin.sprite.setVisible(false);
    const valueText = coin.sprite.getData('valueText');
    const glow = coin.sprite.getData('glow');
    if (valueText) valueText.setVisible(false);
    if (glow) glow.setVisible(false);

    // Add to player coins
    // Note: This will be handled by the calling function
    console.log(`Coin ${coin.value} collected, should be added to player coins`);

    // Show collection effect
    showCoinCollectionEffect(scene, coin.sprite.x, coin.sprite.y, coin.value);

    console.log(`🎯 Collecting coin ${coin.id} (${coin.value} points) at distance ${distance.toFixed(2)}!`);
  }

  // Return true if any coins were collected
  return coinsInRange.length > 0;

  console.log("No coin to collect at current position");
  return false;
}

export function showCoinCollectionEffect(scene, x, y, value) {
  // Create collection effect
  const effect = scene.add.text(x, y, `+${value}`, {
    fontSize: '16px',
    color: '#ffd700',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2
  });
  effect.setOrigin(0.5);
  effect.setDepth(20);

  // Animate collection effect
  scene.tweens.add({
    targets: effect,
    y: y - 30,
    alpha: 0,
    scaleX: 1.5,
    scaleY: 1.5,
    duration: 1000,
    ease: 'Power2.easeOut',
    onComplete: () => effect.destroy()
  });

  // Create sparkle effect
  for (let i = 0; i < 6; i++) {
    const sparkle = scene.add.circle(x, y, 3, 0xffd700, 1);
    sparkle.setDepth(19);

    const angle = (i / 6) * Math.PI * 2;
    const distance = 20;

    scene.tweens.add({
      targets: sparkle,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 600,
      onComplete: () => sparkle.destroy()
    });
  }
}

export function haveCoinAtPosition(scene, playerX, playerY) {
  if (!scene.coins) {
    console.log("haveCoinAtPosition: No coins array found in scene");
    return false;
  }

  console.log(`haveCoinAtPosition: Checking coins for player at (${playerX}, ${playerY})`);

  const result = scene.coins.some(coin => {
    if (coin.collected) return false;

    // Check if player is close enough to the coin (within 100 pixels)
    const distance = Math.sqrt(
      Math.pow(playerX - coin.x, 2) + Math.pow(playerY - coin.y, 2)
    );

    console.log(`haveCoinAtPosition: Coin ${coin.value} at (${coin.x}, ${coin.y}), distance: ${distance.toFixed(2)}`);

    return distance <= 1000;
  });

  console.log(`haveCoinAtPosition result: ${result}`);
  return result;
}

export function setupMonsters(scene) {
  if (!scene.levelData.monsters) return;

  scene.monsters = [];

  scene.levelData.monsters.forEach((monsterData, index) => {
    const startPos = monsterData.patrol[0];

    // Create vampire sprite instead of circle
    const monsterSprite = scene.add.sprite(startPos.x, startPos.y, 'vampire');
    monsterSprite.setScale(1.8); // Increase sprite size
  // store default scale so reset/utility functions can preserve it
  monsterSprite.setData('defaultScale', 1.8);
    monsterSprite.setDepth(8);

    // Create glow effect - larger to match bigger sprite
    const glowCircle = scene.add.circle(startPos.x, startPos.y, 35, 0xff0000, 0.2);
    glowCircle.setDepth(7);

    // Set monster properties for new utility functions
    monsterSprite.isDefeated = false;
    monsterSprite.currentHealth = monsterData.hp || 50;
    monsterSprite.maxHealth = monsterData.hp || 50;
    monsterSprite.detectionRange = monsterData.detectionRange || 60;
    monsterSprite.attackRange = monsterData.detectionRange || 60;
    monsterSprite.attackDamage = monsterData.damage || 60;
    monsterSprite.attackRange = monsterData.detectionRange || 60;
    monsterSprite.attackCooldownTime = 2000; // 2 seconds
    monsterSprite.lastAttackTime = 0;

    // Create health bar - larger to match bigger sprite
    const healthBarBg = scene.add.rectangle(startPos.x, startPos.y - 40, 50, 6, 0x000000, 0.8);
    healthBarBg.setDepth(9);
    const healthBar = scene.add.rectangle(startPos.x, startPos.y - 40, 50, 6, 0x00ff00, 1);
    healthBar.setDepth(10);
    healthBar.setOrigin(0, 0.5);

    monsterSprite.setData('healthBar', healthBar);
    monsterSprite.setData('healthBarBg', healthBarBg);
    monsterSprite.setData('health', monsterSprite.currentHealth);
    monsterSprite.setData('defeated', false);

    const monster = {
      id: monsterData.id,
      sprite: monsterSprite,
      glow: glowCircle,
      data: {
        ...monsterData,
        currentPatrolIndex: 0,
        isChasing: false,
        name: monsterData.name || 'Vampire',
        maxHp: monsterData.hp || 50
      },
    };

    // Play idle animation
    monsterSprite.anims.play('vampire-idle', true);

    scene.monsters.push(monster);
  });
}

export function drawPlayer(scene) {
  const startNode = scene.levelData.nodes.find((n) => n.id === scene.levelData.startNodeId);
  if (startNode) {
    // Create player sprite instead of circle
    scene.player = scene.add.sprite(startNode.x, startNode.y, 'player');
    scene.player.setScale(1.8); // Increase sprite size
    scene.player.setDepth(8);

    // Set player properties for new utility functions
    scene.player.directions = ['right', 'down', 'left', 'up'];
    scene.player.directionIndex = 0;
    scene.player.currentNodeIndex = scene.levelData.startNodeId;
    scene.player.mapConfig = { tileSize: 32 }; // Default tile size
    scene.player.mapImage = null; // Will be set if needed

    // Create player arrow for direction indication - larger to match bigger sprite
    scene.playerArrow = scene.add.triangle(
      startNode.x + 30,
      startNode.y,
      0,
      15,
      12,
      -8,
      -12,
      -8,
      0x00ff00
    );
    scene.playerArrow.setDepth(15);

    // Play idle animation
    playIdle(scene.player);

    updatePlayerArrow(scene);
  }
}

// HP and weapon display functions removed - now handled in bottom UI

export function updatePlayer(scene, nodeId, direction) {
  console.log("updatePlayer called with nodeId:", nodeId, "direction:", direction);
  const targetNode = scene.levelData.nodes.find((n) => n.id === nodeId);
  console.log("Target node found:", !!targetNode, "Player exists:", !!scene.player);

  if (targetNode && scene.player) {
    console.log("Moving player from", scene.player.x, scene.player.y, "to", targetNode.x, targetNode.y);

    // Update player direction
    scene.player.directionIndex = direction;

    // Use new movement function with animation
    moveToPosition(scene.player, targetNode.x, targetNode.y).then(() => {
      console.log("moveToPosition completed");
      // Update player node index
      scene.player.currentNodeIndex = nodeId;

      // Play idle animation after movement
      playIdle(scene.player);

      // Update arrow position
      updatePlayerArrow(scene, targetNode.x, targetNode.y, direction);

      // Check win condition
      if (nodeId === scene.levelData.goalNodeId) {
        setTimeout(() => {
          setCurrentGameState({ goalReached: true });
        }, 300);
      }
    });

    // Reset player appearance (in case it was affected by pit fall)
    scene.player.alpha = 1;
    scene.player.setScale(1.8);
  } else {
    console.log("Cannot update player - missing targetNode or player");
  }
}

// New function for movement with real-time collision detection
export function movePlayerWithCollisionDetection(scene, fromNode, toNode) {
  return new Promise((resolve) => {
    const startX = fromNode.x;
    const startY = fromNode.y;
    const endX = toNode.x;
    const endY = toNode.y;

    const distance = Phaser.Math.Distance.Between(startX, startY, endX, endY);
    const duration = Math.max(800, distance * 2);

    let hitObstacle = false;
    let stopX = endX;
    let stopY = endY;

    const moveTween = scene.tweens.add({
      targets: [scene.player, scene.playerBorder],
      x: endX,
      y: endY,
      duration: duration,
      ease: 'Linear',
      onUpdate: () => {
        updateWeaponPosition(scene);
        if (checkObstacleCollisionWithRadius(scene, scene.player.x, scene.player.y, 20)) {
          if (!hitObstacle) {
            hitObstacle = true;
            stopX = scene.player.x;
            stopY = scene.player.y;

            moveTween.stop();

            scene.tweens.add({
              targets: [scene.player, scene.playerBorder],
              x: stopX - (endX - startX) * 0.1,
              y: stopY - (endY - startY) * 0.1,
              duration: 200,
              ease: 'Back.easeOut',
              yoyo: true,
              onComplete: () => {
                resolve({
                  success: false,
                  hitObstacle: true,
                  stopX: stopX,
                  stopY: stopY
                });
              }
            });
          }
        }
      },
      onComplete: () => {
        if (!hitObstacle) {
          const currentState = getCurrentGameState();
          updatePlayerArrow(scene, endX, endY, currentState.direction);
          // Weapon icon position update removed - now only shown in bottom UI
          resolve({
            success: true,
            hitObstacle: false,
            stopX: endX,
            stopY: endY
          });
        }
      }
    });
  });
}

// Function to create pit fall effect
export function createPitFallEffect(scene) {
  console.log("Creating pit fall effect");

  if (!scene.player) return;

  // Create falling animation
  scene.tweens.add({
    targets: [scene.player, scene.playerBorder],
    y: scene.player.y + 50,
    alpha: 0.3,
    scaleX: 0.8,
    scaleY: 0.8,
    duration: 1000,
    ease: 'Power2',
    onComplete: () => {
      // Keep player in pit position for Game Over
      scene.tweens.add({
        targets: [scene.player, scene.playerBorder],
        alpha: 0.5,
        scaleX: 0.6,
        scaleY: 0.6,
        duration: 500,
        ease: 'Power2'
      });
    }
  });

  // Create splash effect
  const splash = scene.add.circle(scene.player.x, scene.player.y, 30, 0x000000, 0.6);
  scene.tweens.add({
    targets: splash,
    scaleX: 2,
    scaleY: 2,
    alpha: 0,
    duration: 800,
    ease: 'Power2',
    onComplete: () => {
      splash.destroy();
    }
  });
}

// Function to show Game Over screen
export function showGameOver(scene) {
  if (scene.gameOverTriggered) return;
  scene.gameOverTriggered = true;

  console.log('Player died!');

  scene.isExecuting = false;
  scene.isPaused = false;

  const gameOverText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY - 50,
    'GAME OVER', {
    fontSize: '48px',
    color: '#ff0000',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 4
  });
  gameOverText.setOrigin(0.5);
  gameOverText.setDepth(200);
  gameOverText.setScrollFactor(0);

  // Update hint text if it exists
  if (scene.hintText) {
    scene.hintText.setText('Game Over! Press R to reset and try again!');
  }

  scene.tweens.add({
    targets: gameOverText,
    scaleX: 1.1,
    scaleY: 1.1,
    duration: 1000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  const darkOverlay = scene.add.rectangle(scene.cameras.main.centerX, scene.cameras.main.centerY,
    scene.cameras.main.width, scene.cameras.main.height, 0x000000, 0.7);
  darkOverlay.setDepth(199);
  darkOverlay.setScrollFactor(0);

  // Store references for cleanup
  scene.gameOverText = gameOverText;
  scene.gameOverOverlay = darkOverlay;

  scene.gameWon = false;
}

// Function to clear Game Over screen
export function clearGameOverScreen(scene) {
  if (scene.gameOverText) {
    scene.gameOverText.destroy();
    scene.gameOverText = null;
  }
  if (scene.gameOverOverlay) {
    scene.gameOverOverlay.destroy();
    scene.gameOverOverlay = null;
  }
  scene.gameOverTriggered = false;
}

// Function to show Victory screen
export function showVictory(scene, victoryType = 'normal') {
  const victoryText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY - 50,
    'VICTORY!', {
    fontSize: '48px',
    color: '#ffff00',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 4
  });
  victoryText.setOrigin(0.5);
  victoryText.setDepth(200);
  victoryText.setScrollFactor(0);

  let subtitleText;
  if (victoryType === 'rescue') {
    subtitleText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY + 10,
      'All people rescued and goal reached!', {
      fontSize: '24px',
      color: '#00ff00',
      fontStyle: 'bold'
    });
  } else {
    subtitleText = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY + 10,
      'All enemies defeated and goal reached!', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
  }
  subtitleText.setOrigin(0.5);
  subtitleText.setDepth(200);
  subtitleText.setScrollFactor(0);

  scene.tweens.add({
    targets: victoryText,
    scaleX: 1.2,
    scaleY: 1.2,
    duration: 1000,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut'
  });

  scene.tweens.add({
    targets: subtitleText,
    alpha: 0.5,
    duration: 1500,
    yoyo: true,
    repeat: -1
  });

  // เพิ่มเอฟเฟกต์พิเศษสำหรับด่านช่วยคน
  if (victoryType === 'rescue') {
    // แสดงข้อความพิเศษสำหรับการช่วยคน
    const rescueMessage = scene.add.text(scene.cameras.main.centerX, scene.cameras.main.centerY + 50,
      '🎉 Mission Accomplished! 🎉', {
      fontSize: '20px',
      color: '#00ff00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    });
    rescueMessage.setOrigin(0.5);
    rescueMessage.setDepth(200);
    rescueMessage.setScrollFactor(0);

    // เอฟเฟกต์พิเศษสำหรับการช่วยคน
    scene.time.addEvent({
      delay: 300,
      callback: () => createRescueEffect(scene),
      repeat: 8
    });
  } else {
    // เอฟเฟกต์ปกติ
    scene.time.addEvent({
      delay: 500,
      callback: () => createFirework(scene),
      repeat: 10
    });
  }
}

// Function to create rescue effect
export function createRescueEffect(scene) {
  const x = Phaser.Math.Between(100, scene.cameras.main.width - 100);
  const y = Phaser.Math.Between(100, scene.cameras.main.height - 100);

  // สร้างเอฟเฟกต์หัวใจสีเขียว
  for (let i = 0; i < 8; i++) {
    const heart = scene.add.text(x, y, '💚', {
      fontSize: '24px'
    });
    heart.setDepth(199);
    heart.setScrollFactor(0);

    const angle = (i / 8) * Math.PI * 2;
    const distance = Phaser.Math.Between(60, 120);

    scene.tweens.add({
      targets: heart,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 1200,
      ease: 'Power2.easeOut',
      onComplete: () => heart.destroy()
    });
  }

  // สร้างเอฟเฟกต์ดาวสีเขียว
  for (let i = 0; i < 6; i++) {
    const star = scene.add.text(x, y, '⭐', {
      fontSize: '20px'
    });
    star.setDepth(199);
    star.setScrollFactor(0);

    const angle = (i / 6) * Math.PI * 2;
    const distance = Phaser.Math.Between(40, 80);

    scene.tweens.add({
      targets: star,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 1000,
      ease: 'Power2.easeOut',
      onComplete: () => star.destroy()
    });
  }
}

// Function to create firework effect
export function createFirework(scene) {
  const x = Phaser.Math.Between(100, scene.cameras.main.width - 100);
  const y = Phaser.Math.Between(100, scene.cameras.main.height - 100);

  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
  const color = Phaser.Utils.Array.GetRandom(colors);

  for (let i = 0; i < 12; i++) {
    const particle = scene.add.circle(x, y, 3, color);
    particle.setDepth(199);
    particle.setScrollFactor(0);

    const angle = (i / 12) * Math.PI * 2;
    const distance = Phaser.Math.Between(50, 100);

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      duration: 1000,
      onComplete: () => particle.destroy()
    });
  }
}

export function updatePlayerArrow(scene, x = null, y = null, direction = null) {
  console.log("updatePlayerArrow called with direction:", direction);
  if (!scene.playerArrow || !scene.player) {
    console.log("Cannot update arrow - missing playerArrow or player");
    return;
  }

  const playerX = x !== null ? x : scene.player.x;
  const playerY = y !== null ? y : scene.player.y;
  const currentState = getCurrentGameState();
  const dir = direction !== null ? direction : currentState.direction;

  console.log("Updating arrow - player position:", playerX, playerY, "direction:", dir);

  const directionOffsets = [
    { x: 30, y: 0, rotation: Math.PI / 2 }, // right - adjusted for bigger sprite
    { x: 0, y: 30, rotation: Math.PI }, // down - adjusted for bigger sprite
    { x: -30, y: 0, rotation: -Math.PI / 2 }, // left - adjusted for bigger sprite
    { x: 0, y: -30, rotation: 0 }, // up - adjusted for bigger sprite
  ];

  const offset = directionOffsets[dir];

  scene.tweens.add({
    targets: scene.playerArrow,
    x: playerX + offset.x,
    y: playerY + offset.y,
    rotation: offset.rotation,
    duration: 300,
    ease: "Power2",
  });
}

export function startBattle(scene, monster, setPlayerHp, setIsGameOver, setCurrentHint, isPlayerAttack = false) {
  return new Promise((resolve) => {
    // Check if monster is already defeated or currently in battle
    if (monster.data.defeated || monster.data.inBattle) {
      resolve();
      return;
    }

    // Set battle flag to prevent multiple battles
    monster.data.inBattle = true;

    console.log("Battle started - HP before:", getPlayerHp());

    const flash = scene.add.circle(scene.player.x, scene.player.y, 30, 0xffffff, 0.8);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 400,
      onComplete: () => {
        flash.destroy();

        const currentState = getCurrentGameState();
        const weaponData = currentState.weaponData || getWeaponData(currentState.weaponKey || 'stick');

        // ✅ เพิ่ม log เพื่อดูข้อมูล weapon ทั้งหมด
        console.log("🔍 Full weaponData:", weaponData);
        console.log("🔍 weaponData keys:", Object.keys(weaponData || {}));
        console.log("🔍 currentState.weaponKey:", currentState.weaponKey);

        const monsterDamage = monster.data.damage || 25;
        const finalDamage = calculateDamage(monsterDamage, weaponData);

        console.log("🗡️ Monster Attack Details:", {
          monsterDamage,
          weaponKey: currentState.weaponKey || 'stick',
          weaponDefense: weaponData?.combat_power || 0,
          finalDamage,
          hpBefore: getPlayerHp()
        });

        // Monster attacks first (unless already defeated)
        if (!monster.data.defeated) {
          // Apply damage to player
          if (finalDamage > 0) {
            const oldHp = getPlayerHp();
            const newHp = Math.max(0, oldHp - finalDamage);

            // Update module-level canonical HP
            try {
              setGlobalPlayerHp(newHp);
            } catch (err) {
              console.warn('Failed to set global player HP:', err);
            }

            // Update shared game state
            try {
              setCurrentGameState({ playerHP: newHp });
            } catch (err) {
              console.warn('Failed to set current game state playerHP:', err);
            }

            // Update React UI setter if provided
            try {
              if (typeof setPlayerHp === 'function') setPlayerHp(newHp);
            } catch (err) {
              console.warn('Failed to call React setPlayerHp:', err);
            }

            // Notify global hook
            try { if (window.setPlayerHp) window.setPlayerHp(newHp); } catch (err) { }

            console.log(`✅ HP change: ${oldHp} -> ${newHp} (damage: ${finalDamage})`);
          } else {
            console.log(`🛡️ Attack blocked! Weapon defense: ${weaponData?.combat_power || 0}`);
          }

          // Show floating damage number (or blocked text)
          try {
            const scenePlayer = scene.player;
            if (scenePlayer) {
              const dmgTextStr = finalDamage > 0 ? `-${finalDamage}` : 'Blocked!';
              const dmgColor = finalDamage > 0 ? '#ff4444' : '#00ff00';
              const damageText = scene.add.text(scenePlayer.x, scenePlayer.y - 40, dmgTextStr, {
                fontSize: '20px',
                color: dmgColor,
                stroke: '#000000',
                strokeThickness: 2,
                fontStyle: 'bold'
              }).setOrigin(0.5);
              damageText.setDepth(60);

              scene.tweens.add({
                targets: damageText,
                y: scenePlayer.y - 70,
                alpha: 0,
                duration: 500,
                ease: 'Cubic.easeOut',
                onComplete: () => { if (damageText) damageText.destroy(); }
              });
            }
          } catch (err) {
            console.warn('Failed to show damage text:', err);
          }
        }

        // Then player attacks monster (if player initiated attack)
        if (isPlayerAttack) {
          // Player attacks monster - Monster dies in 1 hit
          monster.data.hp = 0;
          monster.data.defeated = true;
          console.log(`💀 Player defeats monster in 1 hit!`);

          // Visual feedback for monster taking damage
          scene.tweens.add({
            targets: monster.sprite,
            tint: 0xff0000,
            duration: 200,
            yoyo: true,
            onComplete: () => {
              // Monster defeated
              monster.sprite.setTint(0x333333);
              monster.glow.setVisible(false);

              // Clean up combat UI
              cleanupMonsterUI(scene, monster);
            }
          });
        }

        // Reset battle flag
        monster.data.inBattle = false;

        // ✅ ใช้ finalDamage ที่คำนวณแล้ว (ไม่ต้องคำนวณซ้ำ)
        const effectColor = !monster.data.defeated && finalDamage === 0 ? 0x00ff00 :
          !monster.data.defeated && finalDamage < 10 ? 0xffff00 : 0xff0000;

        scene.tweens.add({
          targets: [scene.player, scene.playerBorder],
          tint: effectColor,
          duration: 120,
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            // Show battle result
            if (getPlayerHp() <= 0) {
              setCurrentGameState({ isGameOver: true });
              setShowProgressModal(true);
              setCurrentHint("💀 Game Over! HP หมดแล้ว");
              showGameOver(scene);
            } else if (monster.data.defeated) {
              setCurrentHint(`💀 ชนะ ${monster.data.name}! (เหลือ ${getPlayerHp()} HP)`);
            } else {
              if (finalDamage === 0) {
                setCurrentHint(`🛡️ สู้ ${monster.data.name}! อาวุธป้องกันได้! (เหลือ ${getPlayerHp()} HP)`);
              } else {
                setCurrentHint(`⚔️ สู้ ${monster.data.name}! โดน ${finalDamage} damage (เหลือ ${getPlayerHp()} HP)`);
              }
            }
            resolve();
          },
        });
      },
    });
  });
}

// Combat UI System for Adventure Game Style
export function updateCombatUI(scene, monster, distance) {
  const combatRange = 120; // Distance to show combat UI
  const warningRange = 80;  // Distance to show warning
  const dangerRange = 50;   // Distance for danger state

  // Remove existing combat UI if too far
  if (distance > combatRange) {
    hideCombatUI(scene, monster);
    return;
  }

  // Show combat UI based on distance
  if (distance <= combatRange) {
    showCombatUI(scene, monster, distance, warningRange, dangerRange);
  }
}

// Function to update all combat UIs and manage multiple enemies
export function updateAllCombatUIs(scene) {
  if (!scene.monsters || !scene.player) return;

  // Find all nearby enemies
  const nearbyEnemies = [];

  scene.monsters.forEach((monster) => {
    if (isDefeat(monster.sprite) || monster.data?.defeated || monster.sprite.getData('defeated') || monster.isDefeated) return;

    const distance = Phaser.Math.Distance.Between(
      scene.player.x, scene.player.y,
      monster.sprite.x, monster.sprite.y
    );

    if (distance <= 120) { // Combat range
      nearbyEnemies.push({ monster, distance });
    }
  });

  // Sort by distance (closest first)
  nearbyEnemies.sort((a, b) => a.distance - b.distance);

  // Show UI for closest enemy only (or multiple if very close)
  nearbyEnemies.forEach((enemyData, index) => {
    if (index === 0 || enemyData.distance <= 60) {
      updateCombatUI(scene, enemyData.monster, enemyData.distance);
    } else {
      hideCombatUI(scene, enemyData.monster);
    }
  });
}

export function showCombatUI(scene, monster, distance, warningRange, dangerRange) {
  // Remove existing UI first
  hideCombatUI(scene, monster);

  // Determine UI state based on distance
  let uiState = 'safe';
  let uiColor = 0x00ff00; // Green
  let borderColor = 0x00aa00;

  if (distance <= dangerRange) {
    uiState = 'danger';
    uiColor = 0xff0000; // Red
    borderColor = 0xaa0000;
  } else if (distance <= warningRange) {
    uiState = 'warning';
    uiColor = 0xffaa00; // Orange
    borderColor = 0xaa6600;
  }

  // Create combat UI container
  const uiContainer = scene.add.container(0, 0);
  uiContainer.setDepth(100);
  monster.combatUI = uiContainer;

  // Background panel with rounded corners effect
  const panelWidth = 200;
  const panelHeight = 90;
  const panelX = scene.cameras.main.width - panelWidth - 10;
  const panelY = 50; // เพิ่มระยะห่างจากด้านบน

  // Main background
  const background = scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, uiColor, 0.85);
  background.setStrokeStyle(3, borderColor);
  uiContainer.add(background);

  // Add subtle gradient effect
  const gradient = scene.add.rectangle(panelX, panelY - 15, panelWidth - 10, 2, 0xffffff, 0.3);
  uiContainer.add(gradient);

  // Enemy name
  const enemyName = scene.add.text(panelX, panelY - 20, `🧛 ${monster.data.name || 'Vampire'}`, {
    fontSize: '14px',
    color: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2
  });
  enemyName.setOrigin(0.5);
  uiContainer.add(enemyName);

  // Distance indicator with icon
  const distanceIcon = scene.add.text(panelX - 70, panelY - 5, '📏', {
    fontSize: '12px'
  });
  distanceIcon.setOrigin(0.5);
  uiContainer.add(distanceIcon);

  const distanceText = scene.add.text(panelX - 40, panelY - 5, `${Math.round(distance)}px`, {
    fontSize: '12px',
    color: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 1
  });
  distanceText.setOrigin(0, 0.5);
  uiContainer.add(distanceText);

  // Status text with enhanced styling
  let statusText = '';
  let statusColor = '#ffffff';
  let statusIcon = '';

  if (uiState === 'danger') {
    statusText = 'IN COMBAT RANGE!';
    statusColor = '#ff0000';
    statusIcon = '⚔️';
  } else if (uiState === 'warning') {
    statusText = 'APPROACHING!';
    statusColor = '#ffaa00';
    statusIcon = '⚠️';
  } else {
    statusText = 'DETECTED';
    statusColor = '#00ff00';
    statusIcon = '👁️';
  }

  const statusIconText = scene.add.text(panelX - 70, panelY + 10, statusIcon, {
    fontSize: '14px'
  });
  statusIconText.setOrigin(0.5);
  uiContainer.add(statusIconText);

  const status = scene.add.text(panelX - 40, panelY + 10, statusText, {
    fontSize: '10px',
    color: statusColor,
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 1
  });
  status.setOrigin(0, 0.5);
  uiContainer.add(status);

  // Health bar for enemy with icon
  const healthIcon = scene.add.text(panelX - 70, panelY + 25, '❤️', {
    fontSize: '10px'
  });
  healthIcon.setOrigin(0.5);
  uiContainer.add(healthIcon);

  const healthBarBg = scene.add.rectangle(panelX - 20, panelY + 25, 100, 6, 0x000000, 0.8);
  healthBarBg.setStrokeStyle(1, 0xffffff);
  uiContainer.add(healthBarBg);

  const currentHealth = monster.data.hp || monster.sprite.currentHealth || 3;
  const maxHealth = monster.data.maxHp || monster.sprite.maxHealth || 3;
  const healthPercentage = Math.max(0, currentHealth / maxHealth);

  // Health bar color based on percentage
  let healthBarColor = 0x00ff00; // Green
  if (healthPercentage <= 0.3) {
    healthBarColor = 0xff0000; // Red
  } else if (healthPercentage <= 0.6) {
    healthBarColor = 0xffaa00; // Orange
  }

  const healthBar = scene.add.rectangle(panelX - 70, panelY + 25, 100 * healthPercentage, 6, healthBarColor, 1);
  healthBar.setOrigin(0, 0.5);
  uiContainer.add(healthBar);

  // Health text
  const healthText = scene.add.text(panelX + 40, panelY + 25, `${currentHealth}/${maxHealth}`, {
    fontSize: '9px',
    color: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 1
  });
  healthText.setOrigin(0.5);
  uiContainer.add(healthText);

  // Enemy level/danger indicator
  const enemyLevel = monster.data.level || 1;
  const levelText = scene.add.text(panelX + 70, panelY - 20, `Lv.${enemyLevel}`, {
    fontSize: '10px',
    color: '#ffff00',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 1
  });
  levelText.setOrigin(0.5);
  uiContainer.add(levelText);

  // Attack power indicator
  const attackPower = monster.data.damage || 25;
  const attackIcon = scene.add.text(panelX - 70, panelY + 40, '⚔️', {
    fontSize: '9px'
  });
  attackIcon.setOrigin(0.5);
  uiContainer.add(attackIcon);

  const attackText = scene.add.text(panelX - 40, panelY + 40, `${attackPower}`, {
    fontSize: '9px',
    color: '#ff6666',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 1
  });
  attackText.setOrigin(0, 0.5);
  uiContainer.add(attackText);

  // Add pulsing effect for danger state
  if (uiState === 'danger') {
    scene.tweens.add({
      targets: background,
      alpha: 0.6,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // Add screen shake effect for danger (ลดความสั่นลงอีก)
    // scene.cameras.main.shake(30, 0.002);
  }

  // Add warning effect for warning state
  if (uiState === 'warning') {
    scene.tweens.add({
      targets: background,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }
}

export function hideCombatUI(scene, monster) {
  if (monster.combatUI) {
    monster.combatUI.destroy();
    monster.combatUI = null;
  }
}

// Function to clean up combat UI when monster is defeated
export function cleanupMonsterUI(scene, monster) {
  hideCombatUI(scene, monster);

  // Hide health bars
  const healthBar = monster.sprite.getData('healthBar');
  const healthBarBg = monster.sprite.getData('healthBarBg');
  if (healthBar) healthBar.setVisible(false);
  if (healthBarBg) healthBarBg.setVisible(false);

  // Hide glow effect
  if (monster.glow) {
    monster.glow.setVisible(false);
  }
}

export function updateMonsters(scene, delta, isRunning, setPlayerHp, setIsGameOver, setCurrentHint) {
  if (!scene.monsters) return;

  // Update combat UIs for all nearby enemies
  updateAllCombatUIs(scene);

  scene.monsters.forEach((monster) => {
    // ตรวจสอบว่าศัตรูตายแล้วหรือไม่
    if (isDefeat(monster.sprite) || monster.data?.defeated || monster.sprite.getData('defeated') || monster.isDefeated) return;

    const distToPlayer = Phaser.Math.Distance.Between(
      scene.player.x,
      scene.player.y,
      monster.sprite.x,
      monster.sprite.y
    );

    // Update combat UI based on distance (handled by updateAllCombatUIs)

    // Check if should start chasing
    if (distToPlayer < monster.data.detectionRange && !monster.data.isChasing) {
      monster.data.isChasing = true;
      monster.glow.setFillStyle(0xff6600, 0.4);
      monster.sprite.anims.play('vampire-movement', true);
    } else if (distToPlayer > monster.data.detectionRange && monster.data.isChasing) {
      // Player moved out of detection range - stop chasing (do NOT insta-kill)
      monster.data.isChasing = false;
      monster.glow.setFillStyle(0xff0000, 0.2);
      monster.sprite.anims.play('vampire-idle', true);
      // continue to next monster
      return;
    }

    if (monster.data.isChasing) {
      const angle = Phaser.Math.Angle.Between(
        monster.sprite.x,
        monster.sprite.y,
        scene.player.x,
        scene.player.y
      );
      const speed = 120 * (delta / 1000);
      monster.sprite.x += Math.cos(angle) * speed;
      monster.sprite.y += Math.sin(angle) * speed;
      monster.glow.x = monster.sprite.x;
      monster.glow.y = monster.sprite.y;

      // Update health bar position - adjusted for bigger sprite
      const healthBar = monster.sprite.getData('healthBar');
      const healthBarBg = monster.sprite.getData('healthBarBg');
      if (healthBar) {
        healthBar.x = monster.sprite.x;
        healthBar.y = monster.sprite.y - 40;
      }
      if (healthBarBg) {
        healthBarBg.x = monster.sprite.x;
        healthBarBg.y = monster.sprite.y - 40;
      }

      checkPlayerInRange(monster.sprite);

      // After moving, check distance again and trigger battle only if close enough
      const distAfterMove = Phaser.Math.Distance.Between(
        monster.sprite.x,
        monster.sprite.y,
        scene.player.x,
        scene.player.y
      );

      const attackRange = monster.data.attackRange || 30;
      if (distAfterMove <= attackRange && !monster.data.inBattle) {
        // startBattle will handle damage and game over logic; don't await here to keep update loop responsive
        startBattle(scene, monster, setPlayerHp, setIsGameOver, setCurrentHint, false).catch(err => {
          console.error('Error starting battle:', err);
        });
      }
    } else {
      // Normal patrol behavior
      const target = monster.data.patrol[monster.data.currentPatrolIndex];
      const distToTarget = Phaser.Math.Distance.Between(
        monster.sprite.x,
        monster.sprite.y,
        target.x,
        target.y
      );

      if (distToTarget < 5) {
            monster.data.currentPatrolIndex = (monster.data.currentPatrolIndex + 1) % monster.data.patrol.length;
            return;  // Added return to prevent extra movement after reaching target
      } else {
        const angle = Phaser.Math.Angle.Between(
          monster.sprite.x,
          monster.sprite.y,
          target.x,
          target.y
        );

        const speed = 40 * (delta / 1000);
        monster.sprite.x += Math.cos(angle) * speed;
        monster.sprite.y += Math.sin(angle) * speed;
        monster.glow.x = monster.sprite.x;
        monster.glow.y = monster.sprite.y;

        // Update health bar position - adjusted for bigger sprite
        const healthBar = monster.sprite.getData('healthBar');
        const healthBarBg = monster.sprite.getData('healthBarBg');
        if (healthBar) {
          healthBar.x = monster.sprite.x;
          healthBar.y = monster.sprite.y - 40;
        }
        if (healthBarBg) {
          healthBarBg.x = monster.sprite.x;
          healthBarBg.y = monster.sprite.y - 40;
        }
          }
        }
      });
    }
