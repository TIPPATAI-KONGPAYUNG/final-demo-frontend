// src/utils/gameUtils.js
import Phaser from 'phaser';
import { preloadWeaponEffectSafe as preloadWeaponEffect } from './combatSystem'

const API_URL = import.meta.env.VITE_API_URL;

// Global game variables
let currentScene = null;
let weaponsData = null; // เก็บข้อมูลอาวุธจาก API
let playerWeaponSprite = null;

// Export weaponsData for external access
export function getWeaponsData() {
  return weaponsData;
}

export function getCurrentScene() {
  return currentScene;
}
let currentGameState = {
  currentNodeId: 0,
  direction: 0,
  goalReached: false,
  moveCount: 0,
  maxMoves: 50,
  isGameOver: false,
  weapon: null,
  hasGoodWeapon: false,
  playerHP: 100,
  weaponKey: "stick",
  weaponData: null,
  playerCoins: [] // Array to store collected coins
};

let levelData = null;
let playerHp = 100;

// Debug mode variables
let debugMode = false;
let debugGraphics = null;

// Directions array
export const directions = [
  { x: 1, y: 0, symbol: "→" }, // right
  { x: 0, y: 1, symbol: "↓" }, // down
  { x: -1, y: 0, symbol: "←" }, // left
  { x: 0, y: -1, symbol: "↑" }, // up
];

// HP sync functions
export function resetPlayerHp(setPlayerHp) {
  playerHp = 100;
  if (setPlayerHp) setPlayerHp(100);
}

// ฟังก์ชันสำหรับโหลดข้อมูลอาวุธจาก API
export async function loadWeaponsData() {
  try {
    console.log("🔍 Loading weapons data from API...");
    const response = await fetch(`${API_URL}/api/weapons`, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'Content-Type': 'application/json'
          }
        });
    const result = await response.json();

    console.log("🔍 API response:", result);

    if (result.success) {
      // แปลง array เป็น object โดยใช้ weapon_key เป็น key
      weaponsData = {};
      result.data.forEach(weapon => {
        weaponsData[weapon.weapon_key] = {
          name: weapon.weapon_name,
          combat_power: weapon.combat_power,
          emoji: weapon.emoji, // ไม่มี defense ใน database
          weaponKey: weapon.weapon_key,
          weaponId: weapon.weapon_id,
          description: weapon.description,
          weaponType: weapon.weapon_type
        };
      });
      console.log("✅ Weapons data loaded from API:", weaponsData);
      console.log("✅ Available weapon keys:", Object.keys(weaponsData));
      return weaponsData;
    } else {
      console.error("Failed to load weapons:", result.message);
      return null;
    }
  } catch (error) {
    console.error("Error loading weapons:", error);
    return null;
  }
}

export function getWeaponData(weaponKey) {
  console.log("🔍 getWeaponData called with:", weaponKey);
  console.log("🔍 weaponsData available:", !!weaponsData);

  if (!weaponsData) {
    console.warn("Weapons data not loaded yet, returning default");
    // Return default weapon structure if API data not loaded yet
    return {
      name: "🏭 ไม้เท้าเก่า",
      power: 10,
      emoji: "🏭",
      combat_power: 0,
      weaponKey: "stick",
      weaponId: 1,
      description: "อาวุธพื้นฐาน",
      weaponType: "melee"
    };
  }

  const weaponData = weaponsData[weaponKey] || weaponsData["stick"];
  console.log("🔍 getWeaponData result:", weaponData);
  return weaponData;
}

// Calculate damage based on monster damage and weapon defense
export function calculateDamage(monsterDamage, weaponData) {
  // ✅ ถ้าไม่มี weaponData ให้ใช้ stick default (defense = 10)
  const defense = weaponData?.combat_power ?? 10;

  console.log(`Calculating damage: Monster Damage = ${monsterDamage}, Weapon Defense = ${defense}`, {
    weaponData,
    hasWeaponData: !!weaponData,
    combatPower: weaponData?.combat_power,
    weaponKey: weaponData?.weapon_key || 'unknown'
  });

  if (defense >= monsterDamage) {
    return 0; // Weapon strong enough to block all damage
  } else {
    return monsterDamage - defense; // Partial damage
  }
}

// Calculate final score and stars



// Helper functions for conditions
export function foundMonster() {
  if (!currentScene || !currentScene.monsters) return false;

  const playerX = currentScene.player.x;
  const playerY = currentScene.player.y;

  for (let monster of currentScene.monsters) {
    if (monster.data.defeated) continue;

    const distance = Phaser.Math.Distance.Between(
      playerX, playerY,
      monster.sprite.x, monster.sprite.y
    );

    // Monster detection range
    if (distance < 80) {
      return true;
    }
  }
  return false;
}

export function displayPlayerWeapon(weaponKey, scene) {
  console.log("displayPlayerWeapon called", weaponKey);

  // Initial scene validation
  if (!scene || !scene.player) {
    console.warn("Scene or player not ready");
    return;
  }

  const textureKey = `weapon_${weaponKey}`;

  const createAndAttach = () => {
    if (!scene || !scene.player || !scene.add) {
      console.warn("Scene not ready for sprite creation");
      return;
    }

    try {
      // ลบ sprite เก่าก่อน
      if (playerWeaponSprite) {
        playerWeaponSprite.destroy();
        playerWeaponSprite = null;
      }

      playerWeaponSprite = scene.add.image(0, 0, textureKey);
      playerWeaponSprite.setScale(1.5);
      playerWeaponSprite.setDepth(scene.player.depth + 1);
      updateWeaponPosition(scene);

      console.log(`✅ Weapon sprite created: ${weaponKey}`);

      // โหลด effect ของอาวุธนี้ด้วย
      if (scene.sys && !scene.sys.isDestroyed) {
        try {
          preloadWeaponEffect(scene, weaponKey);
        } catch (error) {
          console.warn("Error preloading weapon effect:", error);
        }
      }
    } catch (error) {
      console.warn("Error creating weapon sprite:", error);
    }
  };

  const waitForRenderer = (image, maxAttempts = 10, currentAttempt = 0) => {
    if (!scene || scene.sys?.isDestroyed) {
      console.warn("Scene was destroyed while waiting for renderer");
      return;
    }

    // Check if scene and renderer are ready
    if (scene.renderer?.gl || scene.renderer?.canvas) {
      try {
        if (!scene.textures.exists(textureKey)) {
          scene.textures.addImage(textureKey, image);
        }
        createAndAttach();
      } catch (error) {
        console.warn("Error adding texture after renderer ready:", error);
      }
      return;
    }

    // Retry with backoff if renderer not ready
    if (currentAttempt < maxAttempts) {
      console.log(`Waiting for renderer (attempt ${currentAttempt + 1}/${maxAttempts})...`);
      setTimeout(() => waitForRenderer(image, maxAttempts, currentAttempt + 1), 100 * (currentAttempt + 1));
    } else {
      console.warn("Renderer not available after maximum attempts");
    }
  };

  // Main texture loading logic
  if (!scene.textures.exists(textureKey)) {
    console.log(`Loading weapon texture: ${textureKey}`);
    const image = new Image();
    
    image.onload = () => {
      console.log(`Image loaded for ${textureKey}, checking renderer...`);
      waitForRenderer(image);
    };
    image.onerror = () => {
      console.warn(`Failed to load weapon image: ${weaponKey}`);
      // ใช้ default weapon แทน
      if (scene.textures.exists('weapon_stick')) {
        playerWeaponSprite = scene.add.image(0, 0, 'weapon_stick');
        playerWeaponSprite.setScale(1.5);
        playerWeaponSprite.setDepth(scene.player.depth + 1);
        updateWeaponPosition(scene);
      }
    };
    image.src = `/weapons/${weaponKey}.png`;
  } else {
    createAndAttach();
  }

  setCurrentGameState({
    hasGoodWeapon: true,
    weaponKey: weaponKey
  });
}


export function updateWeaponPosition(scene) {
  if (!playerWeaponSprite || !scene.player) return;

  const player = scene.player;
  const currentState = getCurrentGameState();
  const direction = currentState.direction || 0;

  // ประกาศตัวแปร offset ก่อน
  let offsetX = 0;
  let offsetY = 0;

  switch (direction) {
    case 0: offsetX = 20; break;  // right
    case 1: offsetY = 20; break;  // down
    case 2: offsetX = -20; break; // left
    case 3: offsetY = -20; break; // up
  }

  // หรือใช้ offset แบบ fix ที่คุณอยากได้
  offsetX = -2; // ซ้าย 15px
  // เพิ่มขึ้น 3px จากของเดิม เพื่อชดเชยการขยายตัวละคร
  offsetY = 19;  // ลง 19px (เดิม 16)

  playerWeaponSprite.setPosition(player.x + offsetX, player.y + offsetY);
  }

export function getPlayerWeaponSprite() {
  return playerWeaponSprite;
}

export function updatePlayerWeaponDisplay() {
  console.log("updatePlayerWeaponDisplay called");
  const currentState = getCurrentGameState();
  const scene = currentState.currentScene || null;

  // If a scene is available and a weapon sprite exists, update its position
  if (scene && playerWeaponSprite) {
    try {
      updateWeaponPosition(scene);
    } catch (err) {
      console.warn('Error updating weapon position:', err);
    }
    return;
  }

  // If no sprite exists but we have a weapon key, attempt to display it
  if (scene && currentState.weaponKey) {
    try {
      displayPlayerWeapon(currentState.weaponKey, scene);
    } catch (err) {
      console.warn('Error displaying player weapon during update:', err);
    }
  }
}


export function canMoveForward() {
  const currentNode = levelData.nodes.find((n) => n.id === currentGameState.currentNodeId);
  if (!currentNode) return false;

  const connectedNodes = levelData.edges
    .filter((edge) => edge.from === currentGameState.currentNodeId || edge.to === currentGameState.currentNodeId)
    .map((edge) => (edge.from === currentGameState.currentNodeId ? edge.to : edge.from))
    .map((nodeId) => levelData.nodes.find((n) => n.id === nodeId))
    .filter((node) => node);

  const dirVector = directions[currentGameState.direction];

  for (let node of connectedNodes) {
    const dx = node.x - currentNode.x;
    const dy = node.y - currentNode.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      if ((dirVector.x > 0 && dx > 0) || (dirVector.x < 0 && dx < 0)) {
        return true;
      }
    } else {
      if ((dirVector.y > 0 && dy > 0) || (dirVector.y < 0 && dy < 0)) {
        return true;
      }
    }
  }
  return false;
}

export function nearPit() {
  if (!currentScene || !currentScene.player) {
    return false;
  }

  const playerX = currentScene.player.x;
  const playerY = currentScene.player.y;

  const result = checkObstacleCollisionWithRadius(currentScene, playerX, playerY, 30);

  return result;
}

export function atGoal() {
  return currentGameState.currentNodeId === levelData.goalNodeId;
}

// Pattern analysis functions
export function extractBlockPattern(workspace) {
  const topBlocks = workspace.getTopBlocks(true);
  if (topBlocks.length === 0) {
    return [];
  }

  const pattern = [];
  let currentBlock = topBlocks[0];

  while (currentBlock) {
    pattern.push(currentBlock.type);
    currentBlock = currentBlock.getNextBlock();
  }

  return pattern;
}

export function findMatchingPattern(currentPattern, goodPatterns) {
  // Exact match first
  for (let pattern of goodPatterns) {
    if (arraysEqual(currentPattern, pattern.keywords)) {
      return pattern;
    }
  }
  return null;
}

export function arraysEqual(a, b) {
  return a.length === b.length && a.every((val, i) => val === b[i]);
}

// Collision detection functions
export function checkObstacleCollisionWithRadius(scene, x, y, radius) {
  if (!scene.obstacles) {
    return false;
  }

  for (let obstacle of scene.obstacles) {
    if (obstacle.type === "pit") {
      const collision = isCircleIntersectingPolygon(x, y, radius, obstacle.points);
      if (collision) {
        return true;
      }
    }
  }
  return false;
}

export function isCircleIntersectingPolygon(circleX, circleY, radius, polygon) {
  if (isPointInPolygon(circleX, circleY, polygon)) {
    return true;
  }

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const edge1 = polygon[i];
    const edge2 = polygon[j];

    const dist = distanceFromPointToLineSegment(circleX, circleY, edge1.x, edge1.y, edge2.x, edge2.y);

    if (dist <= radius) {
      return true;
    }
  }

  return false;
}

export function distanceFromPointToLineSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) {
    return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;

  return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
}

export function isPointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (
      polygon[i].y > y !== polygon[j].y > y &&
      x <
      ((polygon[j].x - polygon[i].x) * (y - polygon[i].y)) /
      (polygon[j].y - polygon[i].y) +
      polygon[i].x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

// Function to check if movement path intersects with obstacles
export function checkMovementCollision(scene, fromNode, toNode) {
  if (!scene || !scene.obstacles) {
    return false;
  }

  // First check if the destination node is inside an obstacle
  if (checkObstacleCollisionWithRadius(scene, toNode.x, toNode.y, 10)) {
    return true;
  }

  // Then check if the path from fromNode to toNode intersects with any obstacles
  const pathLength = Math.sqrt((toNode.x - fromNode.x) ** 2 + (toNode.y - fromNode.y) ** 2);
  const steps = Math.ceil(pathLength / 10); // Check every 10 pixels

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const checkX = fromNode.x + (toNode.x - fromNode.x) * t;
    const checkY = fromNode.y + (toNode.y - fromNode.y) * t;

    if (checkObstacleCollisionWithRadius(scene, checkX, checkY, 10)) {
      return true;
    }
  }

  return false;
}

// Game state management
export function setCurrentScene(scene) {
  currentScene = scene;
}

export function setLevelData(data) {
  levelData = data;
}

export function getCurrentGameState() {
  return {
    ...currentGameState,
    currentScene: currentScene
  };
}

export function setCurrentGameState(state) {
  currentGameState = { ...currentGameState, ...state };
}

export function getPlayerHp() {
  return playerHp;
}

export function setPlayerHp(hp) {
  playerHp = hp;
}

// Debug mode functions
export function toggleDebugMode() {
  debugMode = !debugMode;

  if (currentScene) {
    if (debugMode) {
      enableDebugVisuals();
    } else {
      disableDebugVisuals();
    }
  }

  return debugMode;
}

export function isDebugMode() {
  return debugMode;
}

function enableDebugVisuals() {
  if (!currentScene) return;

  // Create debug graphics layer
  debugGraphics = currentScene.add.graphics();
  debugGraphics.setDepth(1000); // Always on top

  // Draw player hitbox
  drawPlayerHitbox();

  // Draw obstacle hitboxes
  drawObstacleHitboxes();

  // Update debug visuals every frame
  currentScene.events.on('update', updateDebugVisuals);
}

function disableDebugVisuals() {
  if (debugGraphics) {
    debugGraphics.destroy();
    debugGraphics = null;
  }

  if (currentScene) {
    currentScene.events.off('update', updateDebugVisuals);
  }

  clearDebugLabels();
}

function drawPlayerHitbox() {
  if (!currentScene || !currentScene.player || !debugGraphics) return;

  // Draw player hitbox (circle) with better visibility
  debugGraphics.lineStyle(3, 0x00ff00, 1.0); // Thicker green outline
  debugGraphics.fillStyle(0x00ff00, 0.1); // More transparent fill
  debugGraphics.fillCircle(currentScene.player.x, currentScene.player.y, 20);
  debugGraphics.strokeCircle(currentScene.player.x, currentScene.player.y, 20);

  // Add label with better contrast
  const label = currentScene.add.text(
    currentScene.player.x,
    currentScene.player.y - 40,
    "Player Hitbox (r=20)",
    {
      fontSize: "11px",
      fill: "#ffffff",
      fontFamily: "Arial",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 2
    }
  );
  label.setOrigin(0.5);
  label.setDepth(1001);

  // Store label reference for cleanup
  if (!currentScene.debugLabels) currentScene.debugLabels = [];
  currentScene.debugLabels.push(label);
}

function drawObstacleHitboxes() {
  if (!currentScene || !currentScene.obstacles || !debugGraphics) return;

  currentScene.obstacles.forEach((obstacle, index) => {
    if (obstacle.type === "pit") {
      // Draw pit hitbox (polygon) with better visibility
      debugGraphics.lineStyle(3, 0xff0000, 1.0); // Thicker red outline
      debugGraphics.fillStyle(0xff0000, 0.1); // More transparent fill

      debugGraphics.beginPath();
      debugGraphics.moveTo(obstacle.points[0].x, obstacle.points[0].y);

      for (let i = 1; i < obstacle.points.length; i++) {
        debugGraphics.lineTo(obstacle.points[i].x, obstacle.points[i].y);
      }
      debugGraphics.closePath();
      debugGraphics.fillPath();
      debugGraphics.strokePath();

      // Add label with better contrast and positioning
      const centerX = obstacle.points.reduce((sum, p) => sum + p.x, 0) / obstacle.points.length;
      const centerY = obstacle.points.reduce((sum, p) => sum + p.y, 0) / obstacle.points.length;

      // Position label outside the pit area to avoid overlap
      const labelX = centerX;
      const labelY = centerY - 25; // Move up to avoid overlap

      const label = currentScene.add.text(
        labelX,
        labelY,
        `PIT ${index + 1}`,
        {
          fontSize: "11px",
          fill: "#ffffff",
          fontFamily: "Arial",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 2
        }
      );
      label.setOrigin(0.5);
      label.setDepth(1001);

      if (!currentScene.debugLabels) currentScene.debugLabels = [];
      currentScene.debugLabels.push(label);
    }
  });
}

function updateDebugVisuals() {
  if (!debugMode || !currentScene || !debugGraphics) return;

  // Clear previous debug visuals
  debugGraphics.clear();
  clearDebugLabels();

  // Redraw all debug visuals
  drawPlayerHitbox();
  drawObstacleHitboxes();
}

export function clearDebugLabels() {
  if (currentScene && currentScene.debugLabels) {
    currentScene.debugLabels.forEach(label => label.destroy());
    currentScene.debugLabels = [];
  }
}

// ===== COIN MANAGEMENT FUNCTIONS =====

export function getPlayerCoins() {
  return currentGameState.playerCoins || [];
}

export function addCoinToPlayer(coin) {
  const coins = [...(currentGameState.playerCoins || [])];
  coins.push(coin);
  setCurrentGameState({ playerCoins: coins });

  return coins;
}

export function clearPlayerCoins() {
  setCurrentGameState({ playerCoins: [] });
}

export function swapPlayerCoins(index1, index2) {
  const coins = [...(currentGameState.playerCoins || [])];
  const i1 = parseInt(index1) - 1; // Convert to 0-based index
  const i2 = parseInt(index2) - 1;

  if (i1 >= 0 && i1 < coins.length && i2 >= 0 && i2 < coins.length) {
    // Swap the coins
    const temp = coins[i1];
    coins[i1] = coins[i2];
    coins[i2] = temp;

    setCurrentGameState({ playerCoins: coins });
    return true;
  }
  return false;
}

export function comparePlayerCoins(index1, index2, operator) {
  const coins = currentGameState.playerCoins || [];
  const i1 = parseInt(index1) - 1; // Convert to 0-based index
  const i2 = parseInt(index2) - 1;

  if (i1 < 0 || i1 >= coins.length || i2 < 0 || i2 >= coins.length) {
    return false;
  }

  const value1 = coins[i1].value;
  const value2 = coins[i2].value;

  switch (operator) {
    case 'GT': return value1 > value2;
    case 'LT': return value1 < value2;
    case 'GTE': return value1 >= value2;
    case 'LTE': return value1 <= value2;
    case 'EQ': return value1 === value2;
    case 'NEQ': return value1 !== value2;
    default: return false;
  }
}

export function getPlayerCoinValue(index) {
  const coins = currentGameState.playerCoins || [];
  const i = parseInt(index) - 1; // Convert to 0-based index

  if (i < 0 || i >= coins.length) {
    return 0;
  }

  return coins[i].value;
}

export function getPlayerCoinCount() {
  return (currentGameState.playerCoins || []).length;
}

export function arePlayerCoinsSorted(order) {
  const coins = currentGameState.playerCoins || [];
  if (coins.length <= 1) return true;

  for (let i = 0; i < coins.length - 1; i++) {
    if (order === 'ASC') {
      if (coins[i].value > coins[i + 1].value) return false;
    } else { // DESC
      if (coins[i].value < coins[i + 1].value) return false;
    }
  }
  return true;
}

// ===== PERSON RESCUE SYSTEM =====

// เก็บข้อมูลคนที่ต้องช่วย
let rescuedPeople = [];

// ฟังก์ชันช่วยคน
export async function rescuePerson() {
  const currentState = getCurrentGameState();
  if (!currentState.currentScene) {
    console.log("No current scene available for rescue");
    return false;
  }

  const currentNodeId = currentState.currentNodeId;
  const levelData = currentState.levelData;

  if (!levelData || !levelData.people) {
    console.log("No level data or people available");
    return false;
  }

  const person = levelData.people.find(p => p.nodeId === currentNodeId);
  if (!person) {
    console.log(`No person at node ${currentNodeId}`);
    return false;
  }

  if (person.rescued) {
    console.log(`Person at node ${currentNodeId} already rescued`);
    return false;
  }

  // ช่วยคนสำเร็จ
  person.rescued = true;
  rescuedPeople.push({
    nodeId: currentNodeId,
    personName: person.personName,
    rescuedAt: Date.now()
  });

  console.log(`✅ ช่วย ${person.personName} ที่ node ${currentNodeId} สำเร็จ!`);

  // อัปเดต UI
  if (currentState.currentScene) {
    const { updatePersonDisplay } = await import('./phaserGame');
    updatePersonDisplay(currentState.currentScene);
  }

  return true;
}

// ฟังก์ชันช่วยคนที่ node ที่กำหนด
export async function rescuePersonAtNode(nodeId) {
  const currentState = getCurrentGameState();
  if (!currentState.currentScene) {
    console.log("No current scene available for rescue");
    return false;
  }

  const levelData = currentState.levelData;

  if (!levelData || !levelData.people) {
    console.log("No level data or people available");
    return false;
  }

  const person = levelData.people.find(p => p.nodeId === nodeId);
  if (!person) {
    console.log(`No person at node ${nodeId}`);
    return false;
  }

  if (person.rescued) {
    console.log(`Person at node ${nodeId} already rescued`);
    return false;
  }

  // ช่วยคนสำเร็จ
  person.rescued = true;
  rescuedPeople.push({
    nodeId: nodeId,
    personName: person.personName,
    rescuedAt: Date.now()
  });

  console.log(`✅ ช่วย ${person.personName} ที่ node ${nodeId} สำเร็จ!`);

  // อัปเดต UI
  if (currentState.currentScene) {
    const { updatePersonDisplay } = await import('./phaserGame');
    updatePersonDisplay(currentState.currentScene);
  }

  return true;
}

// ตรวจสอบว่ามีคนที่ node นี้หรือไม่
export function hasPerson() {
  const currentState = getCurrentGameState();
  if (!currentState.currentScene || !currentState.levelData) {
    return false;
  }

  const currentNodeId = currentState.currentNodeId;
  const person = currentState.levelData.people?.find(p => p.nodeId === currentNodeId && !p.rescued);

  return !!person;
}

// ตรวจสอบว่าคนที่ node นี้ถูกช่วยแล้วหรือไม่
export function personRescued() {
  const currentState = getCurrentGameState();
  if (!currentState.currentScene || !currentState.levelData) {
    return false;
  }

  const currentNodeId = currentState.currentNodeId;
  const person = currentState.levelData.people?.find(p => p.nodeId === currentNodeId);

  if (!person) {
    return false;
  }

  return person.rescued;
}

// นับจำนวนคนที่ช่วยแล้ว
export function getPersonCount() {
  return rescuedPeople.length;
}

// ตรวจสอบว่าช่วยคนทั้งหมดแล้วหรือไม่
export function allPeopleRescued() {
  const currentState = getCurrentGameState();
  if (!currentState.levelData || !currentState.levelData.people) {
    return false;
  }

  const totalPeople = currentState.levelData.people.length;
  const rescuedCount = rescuedPeople.length;

  console.log(`People rescued: ${rescuedCount}/${totalPeople}`);
  return rescuedCount >= totalPeople;
}

// รับรายชื่อคนที่ช่วยแล้ว
export function getRescuedPeople() {
  return [...rescuedPeople];
}

// ล้างข้อมูลคนที่ช่วยแล้ว (สำหรับ reset)
export function clearRescuedPeople() {
  rescuedPeople = [];
  console.log("Rescued people cleared");
}

// รีเซ็ตสถานะคนทั้งหมด
export async function resetAllPeople() {
  const currentState = getCurrentGameState();
  if (!currentState.levelData || !currentState.levelData.people) {
    return;
  }

  // รีเซ็ตสถานะ rescued ของทุกคน
  currentState.levelData.people.forEach(person => {
    person.rescued = false;
  });

  // ล้างข้อมูลคนที่ช่วยแล้ว
  clearRescuedPeople();

  // อัปเดต UI
  if (currentState.currentScene) {
    const { updatePersonDisplay } = await import('./phaserGame');
    updatePersonDisplay(currentState.currentScene);
  }

  console.log("All people reset to not rescued");
}

// ===== STACK OPERATIONS =====

// เก็บข้อมูล stack สำหรับเก็บ node ที่เดินผ่าน
let nodeStack = [];
let treasureCollected = false;

// ฟังก์ชันดึงข้อมูล stack
export function getStack() {
  return [...nodeStack];
}

// ฟังก์ชัน push node ลงใน stack
export async function pushToStack(nodeId) {
  nodeStack.push(nodeId);
  console.log(`Node ${nodeId} pushed to stack. Stack:`, nodeStack);
  await new Promise(resolve => setTimeout(resolve, 200));
  return true;
}

// ฟังก์ชัน pop node ออกจาก stack
export async function popFromStack() {
  if (nodeStack.length === 0) {
    console.log("Stack is empty, cannot pop");
    return null;
  }

  const nodeId = nodeStack.pop();
  console.log(`Node ${nodeId} popped from stack. Stack:`, nodeStack);
  await new Promise(resolve => setTimeout(resolve, 200));
  return nodeId;
}

// ฟังก์ชันตรวจสอบว่า stack ว่างหรือไม่
export function isStackEmpty() {
  return nodeStack.length === 0;
}

// ฟังก์ชันนับจำนวน node ใน stack
export function getStackCount() {
  return nodeStack.length;
}

// ฟังก์ชันตรวจสอบว่ามีสมบัติที่ node นี้หรือไม่
export function hasTreasureAtNode(nodeId) {
  const currentState = getCurrentGameState();
  if (!currentState.levelData || !currentState.levelData.treasures) {
    return false;
  }

  const treasure = currentState.levelData.treasures.find(t => t.nodeId === nodeId);
  return !!treasure && !treasure.collected;
}

// ฟังก์ชันเก็บสมบัติ
export function collectTreasure(nodeId) {
  const currentState = getCurrentGameState();
  console.log(`=== COLLECT TREASURE DEBUG ===`);
  console.log(`nodeId: ${nodeId}`);
  console.log(`levelData:`, !!currentState.levelData);
  console.log(`treasures:`, currentState.levelData?.treasures);

  if (!currentState.levelData || !currentState.levelData.treasures) {
    console.log("No levelData or treasures found");
    return false;
  }

  const treasure = currentState.levelData.treasures.find(t => t.nodeId === nodeId);
  console.log(`Found treasure:`, treasure);

  if (treasure && !treasure.collected) {
    treasure.collected = true;
    treasureCollected = true;
    setCurrentGameState({ treasureCollected: true });
    console.log(`✅ Treasure collected at node ${nodeId}: ${treasure.name}`);

    // อัปเดตการแสดงผลสมบัติ
    if (currentState.currentScene) {
      import('./phaserGame').then(({ updateTreasureDisplay }) => {
        updateTreasureDisplay(currentState.currentScene);
      });
    }

    return true;
  } else if (treasure && treasure.collected) {
    console.log(`Treasure at node ${nodeId} already collected`);
  } else {
    console.log(`No treasure found at node ${nodeId}`);
  }
  return false;
}

// ฟังก์ชันตรวจสอบว่าสมบัติถูกเก็บแล้วหรือไม่
export function isTreasureCollected(nodeId) {
  const currentState = getCurrentGameState();
  if (!currentState.levelData || !currentState.levelData.treasures) {
    return false;
  }

  const treasure = currentState.levelData.treasures.find(t => t.nodeId === nodeId);
  return treasure ? treasure.collected : false;
}

// ฟังก์ชันล้าง stack
export function clearStack() {
  nodeStack = [];
  treasureCollected = false;
  setCurrentGameState({ treasureCollected: false });

  // Reset treasure collected status in levelData
  const currentState = getCurrentGameState();
  if (currentState.levelData && currentState.levelData.treasures) {
    currentState.levelData.treasures.forEach(treasure => {
      treasure.collected = false;
    });
    console.log("Treasures reset in levelData");
  }

  console.log("Stack cleared");
}

// ===== MOVE TO NODE FUNCTION =====

// ฟังก์ชันเดินไปที่ node ที่กำหนด
export async function moveToNode(targetNodeId) {
  const currentState = getCurrentGameState();
  if (!currentState.currentScene || !currentState.levelData) {
    console.log("No current scene or level data available");
    return false;
  }

  const currentNodeId = currentState.currentNodeId;
  const levelData = currentState.levelData;

  // ตรวจสอบว่า target node มีอยู่หรือไม่
  const targetNode = levelData.nodes.find(node => node.id === targetNodeId);
  if (!targetNode) {
    console.log(`Target node ${targetNodeId} not found`);
    return false;
  }

  // ถ้าอยู่ที่ node เดียวกันแล้ว
  if (currentNodeId === targetNodeId) {
    console.log(`Already at node ${targetNodeId}`);
    return true;
  }

  // หาเส้นทางจาก current node ไป target node
  const path = findPath(currentNodeId, targetNodeId, levelData);
  if (!path || path.length === 0) {
    console.log(`No path found from node ${currentNodeId} to node ${targetNodeId}`);
    return false;
  }

  console.log(`Moving from node ${currentNodeId} to node ${targetNodeId} via path:`, path);

  // เดินตามเส้นทาง
  for (let i = 1; i < path.length; i++) {
    const nextNodeId = path[i];
    const success = await moveToNextNode(nextNodeId);
    if (!success) {
      console.log(`Failed to move to node ${nextNodeId}`);
      return false;
    }
    // รอสักครู่เพื่อให้การเคลื่อนที่ดูเป็นธรรมชาติ
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log(`Successfully moved to node ${targetNodeId}`);
  return true;
}

// ฟังก์ชันหาเส้นทางระหว่างสอง nodes (BFS)
function findPath(startNodeId, endNodeId, levelData) {
  const visited = new Set();
  const queue = [[startNodeId]];

  while (queue.length > 0) {
    const path = queue.shift();
    const currentNodeId = path[path.length - 1];

    if (currentNodeId === endNodeId) {
      return path;
    }

    if (visited.has(currentNodeId)) {
      continue;
    }

    visited.add(currentNodeId);

    // หา nodes ที่เชื่อมต่อกับ current node
    const connectedNodes = levelData.edges
      .filter(edge => edge.from === currentNodeId || edge.to === currentNodeId)
      .map(edge => edge.from === currentNodeId ? edge.to : edge.from)
      .filter(nodeId => !visited.has(nodeId));

    for (const nextNodeId of connectedNodes) {
      queue.push([...path, nextNodeId]);
    }
  }

  return null; // ไม่พบเส้นทาง
}

// ฟังก์ชันเดินไป node ถัดไป
async function moveToNextNode(nextNodeId) {
  const currentState = getCurrentGameState();
  const currentNodeId = currentState.currentNodeId;
  const levelData = currentState.levelData;

  const currentNode = levelData.nodes.find(node => node.id === currentNodeId);
  const nextNode = levelData.nodes.find(node => node.id === nextNodeId);

  if (!currentNode || !nextNode) {
    return false;
  }

  // คำนวณทิศทางที่ต้องหัน
  const dx = nextNode.x - currentNode.x;
  const dy = nextNode.y - currentNode.y;

  let targetDirection;
  if (Math.abs(dx) > Math.abs(dy)) {
    targetDirection = dx > 0 ? 0 : 2; // right or left
  } else {
    targetDirection = dy > 0 ? 1 : 3; // down or up
  }

  // หันไปทิศทางที่ถูกต้อง
  const currentDirection = currentState.direction;
  const directionDiff = (targetDirection - currentDirection + 4) % 4;

  for (let i = 0; i < directionDiff; i++) {
    await turnRight();
  }

  // เดินไปข้างหน้า
  await moveForward();

  return true;
}

// ฟังก์ชันหันขวา
async function turnRight() {
  const currentState = getCurrentGameState();
  if (currentState.goalReached || currentState.moveCount >= currentState.maxMoves || currentState.isGameOver) return;
  await new Promise(resolve => setTimeout(resolve, 300));
  setCurrentGameState({ direction: (currentState.direction + 1) % 4 });
}

// ===== VICTORY CONDITIONS SYSTEM =====

/**
 * ตรวจสอบเงื่อนไขชนะตาม victoryConditions ที่กำหนดใน level
 * @param {Array} victoryConditions - อาร์เรย์ของเงื่อนไขชนะ
 * @param {Object} levelData - ข้อมูลด่าน
 * @returns {Object} - ผลลัพธ์การตรวจสอบ { completed: boolean, message: string, failedConditions: Array }
 */
export function checkVictoryConditions(victoryConditions, levelData) {
  console.log("🔍 checkVictoryConditions called");
  console.log("🔍 victoryConditions:", victoryConditions);
  console.log("🔍 levelData.id:", levelData.id);

  if (!victoryConditions || victoryConditions.length === 0) {
    console.log("🔍 No victory conditions found");
    return {
      completed: false,
      message: "❌ ไม่มีเงื่อนไขชนะที่กำหนด",
      failedConditions: []
    };
  }

  const currentState = getCurrentGameState();
  console.log("🔍 Current state:", currentState);
  const failedConditions = [];
  let allCompleted = true;

  for (const condition of victoryConditions) {
    console.log("🔍 Checking condition:", condition.type);
    const result = checkSingleVictoryCondition(condition, currentState, levelData);
    console.log("🔍 Condition result:", result);

    if (!result.completed) {
      allCompleted = false;
      failedConditions.push({
        type: condition.type,
        description: condition.description,
        reason: result.reason
      });
    }
  }

  console.log("🔍 All completed:", allCompleted);
  console.log("🔍 Failed conditions:", failedConditions);

  if (allCompleted) {
    const descriptions = victoryConditions.map(c => c.description).join(" และ ");
    console.log("🔍 VICTORY! All conditions met");
    return {
      completed: true,
      message: `🎉 ยินดีด้วย! ${descriptions} สำเร็จ!`,
      failedConditions: []
    };
  } else {
    const failedDescriptions = failedConditions.map(fc => fc.description).join(", ");
    console.log("🔍 NOT VICTORY! Some conditions failed");
    return {
      completed: false,
      message: `❌ ยังไม่สำเร็จ: ${failedDescriptions}`,
      failedConditions
    };
  }
}

/**
 * ตรวจสอบเงื่อนไขชนะเดียว
 * @param {Object} condition - เงื่อนไขชนะ
 * @param {Object} currentState - สถานะปัจจุบันของเกม
 * @param {Object} levelData - ข้อมูลด่าน
 * @returns {Object} - ผลลัพธ์การตรวจสอบ { completed: boolean, reason: string }
 */
function checkSingleVictoryCondition(condition, currentState, levelData) {
  console.log(`=== Checking condition: ${condition.type} ===`);
  console.log(`=== Condition data from database:`, condition);

  switch (condition.type) {
    case "reach_goal":
      console.log("reach_goal - goalReached:", currentState.goalReached);
      console.log("reach_goal - currentNodeId:", currentState.currentNodeId);
      console.log("reach_goal - goalNodeId:", levelData.goalNodeId);
      return {
        completed: currentState.goalReached,
        reason: currentState.goalReached ? "" : "ยังไม่ถึงเป้าหมาย"
      };

    case "coins_sorted":
      const sortedPlayerCoins = getPlayerCoins();
      if (sortedPlayerCoins.length === 0) {
        return {
          completed: false,
          reason: "ยังไม่ได้เก็บเหรียญเลย"
        };
      }

      // ตรวจสอบว่าเหรียญเรียงจากน้อยไปมาก
      let isSorted = true;
      for (let i = 0; i < sortedPlayerCoins.length - 1; i++) {
        if (sortedPlayerCoins[i].value > sortedPlayerCoins[i + 1].value) {
          isSorted = false;
          break;
        }
      }

      return {
        completed: isSorted,
        reason: isSorted ? "" : "เหรียญยังไม่เรียงถูกต้อง"
      };

    case "all_people_rescued":
      const allRescued = allPeopleRescued();
      return {
        completed: allRescued,
        reason: allRescued ? "" : "ยังช่วยคนไม่ครบ"
      };

    case "treasure_collected":
      const treasureCollected = currentState.treasureCollected || false;
      return {
        completed: treasureCollected,
        reason: treasureCollected ? "" : "ยังไม่ได้เก็บสมบัติ"
      };

    case "back_to_start":
      const backToStart = currentState.currentNodeId === levelData.startNodeId;
      return {
        completed: backToStart,
        reason: backToStart ? "" : "ยังไม่กลับมาจุดเริ่มต้น"
      };

    case "all_monsters_defeated":
      const allMonstersDefeated = checkAllMonstersDefeated(levelData);
      return {
        completed: allMonstersDefeated,
        reason: allMonstersDefeated ? "" : "ยังฆ่า Monster ไม่หมด"
      };

    case "all_coins_collected":
      console.log("=== all_coins_collected condition check ===");
      const allCoinsCollected = checkAllCoinsCollected(levelData);
      const collectedPlayerCoins = getPlayerCoins();
      const totalCoins = levelData.coinPositions?.length || 0;
      console.log("all_coins_collected - playerCoins.length:", collectedPlayerCoins.length);
      console.log("all_coins_collected - totalCoins:", totalCoins);
      console.log("all_coins_collected - result:", allCoinsCollected);
      console.log("=== END all_coins_collected condition check ===");
      return {
        completed: allCoinsCollected,
        reason: allCoinsCollected ? "" : "ยังเก็บเหรียญไม่หมด"
      };

    default:
      return {
        completed: false,
        reason: `เงื่อนไขชนะไม่รู้จัก: ${condition.type}`
      };
  }
}

/**
 * สร้างข้อความ hint สำหรับเงื่อนไขที่ยังไม่สำเร็จ
 * @param {Array} failedConditions - เงื่อนไขที่ยังไม่สำเร็จ
 * @param {Object} levelData - ข้อมูลด่าน
 * @returns {string} - ข้อความ hint
 */
export function generateVictoryHint(failedConditions, levelData) {
  if (failedConditions.length === 0) {
    return "";
  }

  const hints = [];
  const currentState = getCurrentGameState();

  for (const failedCondition of failedConditions) {
    switch (failedCondition.type) {
      case "reach_goal":
        hints.push(`❌ ยังไม่ถึง Node ${levelData.goalNodeId}`);
        break;

      case "coins_sorted":
        const playerCoins = getPlayerCoins();
        if (playerCoins.length > 0) {
          const coinValues = playerCoins.map(c => c.value).join(', ');
          hints.push(`❌ เหรียญยังไม่เรียงถูกต้อง ลำดับปัจจุบัน: ${coinValues}`);
        } else {
          hints.push("❌ ยังไม่ได้เก็บเหรียญเลย");
        }
        break;

      case "all_people_rescued":
        const rescuedCount = getRescuedPeople().length;
        const totalPeople = levelData.people?.length || 0;
        hints.push(`❌ ยังช่วยคนไม่ครบ (${rescuedCount}/${totalPeople})`);
        break;

      case "treasure_collected":
        hints.push("❌ ยังไม่ได้เก็บสมบัติ");
        break;

      case "back_to_start":
        hints.push(`❌ ยังไม่กลับมาจุดเริ่มต้น (Node ${levelData.startNodeId})`);
        break;

      case "all_monsters_defeated":
        const defeatedCount = getDefeatedMonstersCount(levelData);
        const totalMonsters = levelData.monsters?.length || 0;
        hints.push(`❌ ยังฆ่า Monster ไม่หมด (${defeatedCount}/${totalMonsters})`);
        break;

      case "all_coins_collected":
        const collectedCount = getPlayerCoins().length;
        const totalCoins = levelData.coinPositions?.length || 0;
        hints.push(`❌ ยังเก็บเหรียญไม่หมด (${collectedCount}/${totalCoins})`);
        break;

      default:
        hints.push(`❌ ${failedCondition.description}: ${failedCondition.reason}`);
    }
  }

  return hints.join(" ");
}

/**
 * ตรวจสอบว่า Monster ทั้งหมดถูกฆ่าแล้วหรือไม่
 * @param {Object} levelData - ข้อมูลด่าน
 * @returns {boolean} - true ถ้า Monster ทั้งหมดถูกฆ่าแล้ว
 */
function checkAllMonstersDefeated(levelData) {
  if (!levelData.monsters || levelData.monsters.length === 0) {
    return true; // ไม่มี Monster = ผ่าน
  }

  return levelData.monsters.every(monster => monster.defeated === true);
}

/**
 * ตรวจสอบว่าเหรียญทั้งหมดถูกเก็บแล้วหรือไม่
 * @param {Object} levelData - ข้อมูลด่าน
 * @returns {boolean} - true ถ้าเหรียญทั้งหมดถูกเก็บแล้ว
 */
function checkAllCoinsCollected(levelData) {
  console.log("=== checkAllCoinsCollected DEBUG ===");
  console.log("levelData.coinPositions:", levelData.coinPositions);

  if (!levelData.coinPositions || levelData.coinPositions.length === 0) {
    console.log("checkAllCoinsCollected - no coins in level, returning true");
    return true; // ไม่มีเหรียญ = ผ่าน
  }

  const playerCoins = getPlayerCoins();
  const totalCoins = levelData.coinPositions.length;

  console.log("playerCoins:", playerCoins);
  console.log("playerCoins.length:", playerCoins.length);
  console.log("totalCoins:", totalCoins);
  console.log("coinPositions details:", levelData.coinPositions.map(c => ({ id: c.id, value: c.value, collected: c.collected })));

  // ตรวจสอบว่าเก็บเหรียญครบตามจำนวนที่กำหนดในด่าน
  const result = playerCoins.length >= totalCoins;
  console.log("checkAllCoinsCollected - result:", result);
  console.log("=== END checkAllCoinsCollected DEBUG ===");

  return result;
}

/**
 * นับจำนวน Monster ที่ถูกฆ่าแล้ว
 * @param {Object} levelData - ข้อมูลด่าน
 * @returns {number} - จำนวน Monster ที่ถูกฆ่าแล้ว
 */
function getDefeatedMonstersCount(levelData) {
  if (!levelData.monsters || levelData.monsters.length === 0) {
    return 0;
  }

  return levelData.monsters.filter(monster => monster.defeated === true).length;
}
