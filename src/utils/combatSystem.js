// src/utils/combatSystem.js
// ระบบ Combat Mode และ Turn-based Combat

import { getCurrentGameState, getWeaponData, setCurrentGameState } from './gameUtils';
import { getPlayerWeaponSprite } from './gameUtils';

// Combat state management
let combatState = {
  isInCombat: false,
  currentEnemy: null,
  playerTurn: true,
  combatQueue: [],
  combatResults: [],
  isCombatResolved: false,
  combatWinner: null, // 'player' or 'enemy'
  combatPaused: false
};


/**
 * เริ่มต้น Combat Mode เมื่อเข้าใกล้ศัตรู
 */
export function initiateCombat(player, enemy) {
  if (combatState.isInCombat) return;

  console.log('Initiating combat with enemy:', enemy);

  combatState = {
    isInCombat: true,
    currentEnemy: enemy,
    playerTurn: true,
    combatQueue: [],
    combatResults: [],
    isCombatResolved: false,
    combatWinner: null,
    combatPaused: false
  };

  // แสดง UI Combat Mode
  showCombatUI();

  // หยุดการเคลื่อนที่ของศัตรู
  if (enemy.sprite) {
    enemy.sprite.body?.setVelocity?.(0, 0); // ปลอดภัย ถ้ามี physics body
    enemy.sprite.anims?.play('vampire-idle', true);
  }

  // แสดงข้อความเริ่มต้นการต่อสู้
  showCombatMessage(`⚔️ เริ่มการต่อสู้กับ ${enemy.name || 'ศัตรู'}!`);

  // ไม่หยุดการทำงานของเกมเพื่อให้เล่นได้ต่อเนื่อง
  // pauseGameExecution();

  return combatState;
}

/**
 * จบ Combat Mode
 */
export function endCombat(winner = null) {
  console.log('Ending combat, winner:', winner);

  combatState = {
    isInCombat: false,
    currentEnemy: null,
    playerTurn: true,
    combatQueue: [],
    combatResults: [],
    isCombatResolved: true,
    combatWinner: winner,
    combatPaused: false
  };

  // ซ่อน UI Combat Mode
  hideCombatUI();

  // แสดงผลการต่อสู้
  if (winner === 'player') {
    showCombatMessage(`🎉 คุณชนะ! ศัตรูตายแล้ว`);
  } else if (winner === 'enemy') {
    showCombatMessage(`💀 คุณแพ้! เกมจบ`);
  }

  // ไม่ต้องเริ่มการทำงานต่อเพราะไม่ได้หยุดไว้
  // resumeGameExecution();

  return combatState;
}

/**
 * ตรวจสอบว่าอยู่ในโหมดต่อสู้หรือไม่
 */
export function isInCombat() {
  return combatState.isInCombat; // หรือเช็ค playerTurn ด้วย?
}

/**
 * รับคำสั่งโจมตีจาก Blockly
 */
export function executePlayerAttack() {
  console.log("executePlayerAttack called");
  if (!combatState.isInCombat || !combatState.playerTurn) {
    console.log('Not in combat or not player turn');
    return false;
  }

  const currentState = getCurrentGameState();
  const weaponData = currentState.weaponData || getWeaponData('stick');

  const damage = calculateAttackDamage(weaponData, currentState.weaponKey);
  console.log(`Player attacks for ${damage} damage`);

  // 🚀 ยิง effect projectile จาก player → enemy
  const scene = currentState.currentScene;
  const enemy = combatState.currentEnemy;
  if (scene && enemy?.sprite) {
    const projectileTexture = `weapon_${currentState.weaponKey}` || 'weapon_stick';
    const effect = scene.add.image(scene.player.x, scene.player.y, projectileTexture);
    effect.setScale(0.3);
    effect.setDepth(30);

    scene.tweens.add({
      targets: effect,
      x: enemy.sprite.x,
      y: enemy.sprite.y,
      duration: 400, // ความเร็ว projectile
      onComplete: () => {
        effect.destroy();

        // 💥 ตอนนี้ค่อยทำ damage จริง
        const enemyDefeated = attackEnemy(enemy, damage, currentState.weaponKey || 'stick');
        showAttackResult('player', damage, enemyDefeated);

        if (enemyDefeated) {
          endCombat('player');
        } else {
          combatState.playerTurn = false;
          scheduleEnemyAttack();
        }
      }
    });
  }

  return true;
}


/**
 * กำหนดการโจมตีของศัตรู
 */
function scheduleEnemyAttack() {
  setTimeout(() => {
    if (!combatState.isInCombat) return;

    executeEnemyAttack();
  }, 1000); // ศัตรูโจมตีหลังจาก 1 วินาที
}

/**
 * ศัตรูโจมตี
 */
function executeEnemyAttack() {
  if (!combatState.isInCombat || combatState.playerTurn) return;

  const enemy = combatState.currentEnemy;
  const enemyDamage = enemy.data?.damage || 20;

  console.log(`Enemy attacks for ${enemyDamage} damage`);

  // คำนวณความเสียหายที่ผู้เล่นจะได้รับ (รวมการป้องกัน)
  const actualDamage = calculatePlayerDamage(enemyDamage);

  // แสดงผลการโจมตีของศัตรู
  showAttackResult('enemy', actualDamage, false);

  // ลด HP ของผู้เล่น
  if (actualDamage > 0) {
    reducePlayerHP(actualDamage);
  }

  // เปลี่ยนเป็นตาของผู้เล่น
  combatState.playerTurn = true;

  // ตรวจสอบว่าเกมจบหรือไม่
  if (getCurrentGameState().isGameOver) {
    endCombat('enemy');
  }
}

/**
 * คำนวณความเสียหายจากการโจมตีของผู้เล่น
 */
function calculateAttackDamage(weaponData, weaponKey) {
  if (!weaponData) return 50; // ความเสียหายพื้นฐาน

  let baseDamage = weaponData.power * 10;

  // โบนัสจาก pattern ที่ใช้
  const patternBonus = getPatternBonus(weaponKey);
  baseDamage += patternBonus;

  return baseDamage;
}

/**
 * คำนวณความเสียหายที่ผู้เล่นจะได้รับ
 */
function calculatePlayerDamage(enemyDamage) {
  const currentState = getCurrentGameState();
  const weaponData = currentState.weaponData;

  if (!weaponData) return enemyDamage;

  const defense = weaponData.defense || 0;
  return Math.max(0, enemyDamage - defense);
}


/**
 * โจมตีศัตรู
 */

export function attackEnemy(enemy, damage, weaponKey) {
  const scene = getCurrentGameState().currentScene;
  if (!scene || !enemy.sprite) return false;

  const player = scene.player;
  if (!player) return false;

  const weaponSprite = getPlayerWeaponSprite();
  const currentWeaponKey = getCurrentGameState().weaponKey || 'stick';

  // ใช้ฟังก์ชันที่แก้ไขแล้ว
  showEffectWeaponFixed(enemy, damage, currentWeaponKey, weaponSprite);

  // ส่วนที่เหลือเหมือนเดิม
  enemy.data.hp = Math.max(0, (enemy.data.hp || 3) - damage);
  if (enemy.data.hp <= 0) {
    enemy.data.defeated = true;
    showEnemyDefeat(enemy);
    return true;
  }
  return false;
}
export function showEffectWeaponFixed(enemy, damage, weaponKey = 'stick', weaponSprite, effectType = '') {
  console.log(`🔍 showEffectWeaponFixed called with weaponKey: ${weaponKey}`);

  if (!weaponSprite) {
    console.warn("No weapon sprite, cannot show effect:", weaponKey);
    return;
  }

  const scene = getCurrentGameState().currentScene;
  if (!scene || !enemy?.sprite) return;

  const currentWeaponKey = getCurrentGameState().weaponKey || 'stick';
  const actualWeaponKey = weaponKey === currentWeaponKey ? weaponKey : currentWeaponKey;

  console.log("🎯 Effect path decision for weapon:", actualWeaponKey);

  // ⭐ ข้าม single sprite check - ไปตรง multi-frame
  // const effectTextureKey = `effect_${actualWeaponKey}`;
  // if (scene.textures.exists(effectTextureKey)) {
  //   console.log(`✅ Using SINGLE sprite path`);
  //   createSingleSpriteEffect(scene, weaponSprite, effectTextureKey);
  //   return;
  // }

  const texturePrefix = `effect_${actualWeaponKey}${effectType ? `_${effectType}` : ''}`;
  const firstFrameKey = `${texturePrefix}-1`;
  console.log(`🔍 Checking first frame: ${firstFrameKey} - exists: ${scene.textures.exists(firstFrameKey)}`);

  if (!scene.textures.exists(firstFrameKey)) {
    console.log(`⚠️  No multi-frame textures found, using fallback`);
    showFallbackEffect(scene, weaponSprite);
    return;
  }

  console.log(`✅ Using MULTI-FRAME path`);

  // ใช้วิธีเก่า (multiple frames) ถ้ามี
  console.log(`Using legacy multi-frame effect for ${actualWeaponKey}`);
  const spawnEffect = () => {
    const validFrames = [];
    let consecutiveFailures = 0;

    for (let i = 1; i <= 10; i++) {
      const frameKey = `${texturePrefix}-${i}`;

      if (!scene.textures.exists(frameKey)) {
        break;
      }

      const texture = scene.textures.get(frameKey);
      const source = texture?.source[0];

      const isValid = source &&
        source.image &&
        source.image.complete &&
        source.image.naturalWidth > 0 &&
        source.image.naturalHeight > 0 &&
        source.width > 0 &&
        source.height > 0 &&
        source.isLoaded !== false;

      if (isValid) {
        validFrames.push(frameKey);
        consecutiveFailures = 0;
        console.log(`✓ Valid: ${frameKey} (${source.width}x${source.height})`);
      } else {
        consecutiveFailures++;
        if (consecutiveFailures >= 2) {
          break;
        }
      }
    }

    if (validFrames.length === 0) {
      console.warn("❌ No valid texture frames found, using fallback");
      showFallbackEffect(scene, weaponSprite);
      return;
    }

    createCanvasBasedEffect(scene, weaponSprite, validFrames, actualWeaponKey);
  };

  spawnEffect();
}

function createSingleSpriteEffect(scene, weaponSprite, textureKey) {
  console.log(`Creating single sprite effect: ${textureKey}`);

  const offsetX = weaponSprite.width * weaponSprite.scaleX * 0.5 + 10;
  // shift down to compensate larger player scale
  const offsetY = 3;

  // ตรวจสอบ texture
  if (!scene.textures.exists(textureKey)) {
    console.warn(`Single sprite texture ${textureKey} not found`);
    showFallbackEffect(scene, weaponSprite);
    return;
  }

  const texture = scene.textures.get(textureKey);
  const source = texture.source[0];

  if (!source?.image?.complete || source.image.naturalWidth <= 0) {
    console.warn(`Single sprite texture not ready`);
    showFallbackEffect(scene, weaponSprite);
    return;
  }

  console.log(`Single sprite validated: ${textureKey} (${source.width}x${source.height})`);

  // สร้าง effect sprite
  const effect = scene.add.image(
    weaponSprite.x + offsetX,
    weaponSprite.y + offsetY,
    textureKey
  );

  effect.setScale(0.5);
  effect.setDepth(weaponSprite.depth + 1);

  console.log(`Single sprite effect created`);

  // แทนที่จะเล่น frame animation ให้ใช้ tween animation
  scene.tweens.add({
    targets: effect,
    scaleX: { from: 0.3, to: 0.8 },
    scaleY: { from: 0.3, to: 0.8 },
    alpha: { from: 0.8, to: 0 },
    angle: { from: 0, to: 45 },
    duration: 400,
    ease: 'Power2',
    onComplete: () => {
      effect.destroy();
      console.log(`Single sprite effect completed`);
    }
  });

  // เพิ่ม secondary animation
  scene.tweens.add({
    targets: effect,
    scaleX: { from: 0.5, to: 0.7 },
    scaleY: { from: 0.5, to: 0.7 },
    duration: 200,
    yoyo: true,
    ease: 'Sine.easeInOut'
  });
}

function loadSingleSpriteEffect(scene, weaponSprite, weaponKey) {
  const textureKey = `effect_${weaponKey}`;
  const url = `/weapons_effect/${weaponKey}.png`;

  console.log(`Loading single sprite effect: ${textureKey} from ${url}`);

  // ตรวจสอบว่าไฟล์มีจริงหรือไม่ก่อนโหลด
  checkImageExistsSafe(url).then(exists => {
    if (exists) {
      scene.load.image(textureKey, url);

      scene.load.once('complete', () => {
        console.log(`Single sprite loaded: ${textureKey}`);
        // รอให้ texture พร้อมแล้วค่อยสร้าง effect
        scene.time.delayedCall(100, () => {
          createSingleSpriteEffect(scene, weaponSprite, textureKey);
        });
      });

      scene.load.once('loaderror', (fileObj) => {
        console.error(`Failed to load single sprite:`, fileObj.key);
        showFallbackEffect(scene, weaponSprite);
      });

      scene.load.start();
    } else {
      console.warn(`Single sprite file ${url} not found, using fallback`);
      showFallbackEffect(scene, weaponSprite);
    }
  });
}

function createCanvasBasedEffect(scene, weaponSprite, validFrames, weaponKey) {
  console.log(`🔍 DEEP DEBUG: Creating texture effect for ${weaponKey}`);

  const offsetX = weaponSprite.width * weaponSprite.scaleX * 0.5 + 10;
  // shift down to compensate larger player scale
  const offsetY = 3;
  const firstFrameKey = validFrames[0];

  if (!scene.textures.exists(firstFrameKey)) {
    console.warn(`First frame ${firstFrameKey} doesn't exist, using fallback`);
    showFallbackEffect(scene, weaponSprite);
    return;
  }

  const texture = scene.textures.get(firstFrameKey);
  const source = texture.source[0];

  if (!source?.image?.complete || source.image.naturalWidth <= 0) {
    console.warn(`First frame texture not ready, using fallback`);
    showFallbackEffect(scene, weaponSprite);
    return;
  }

  // *** EXTREME PIXEL DEBUG ***
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = Math.min(source.image.naturalWidth, 10);
    canvas.height = Math.min(source.image.naturalHeight, 10);

    ctx.drawImage(source.image, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let colorCount = {};
    for (let i = 0; i < pixels.length; i += 4) {
      const rgba = `${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3]}`;
      colorCount[rgba] = (colorCount[rgba] || 0) + 1;
    }

    console.log(`🎨 PIXEL ANALYSIS:`, colorCount);

    const isAllBlack = Object.keys(colorCount).every(color =>
      color === '0,0,0,255' || color === '0,0,0,0'
    );

    if (isAllBlack) {
      console.error(`❌ TEXTURE IS ALL BLACK! Using fallback effect instead`);
      showFallbackEffect(scene, weaponSprite);
      return;
    }

    console.log(`✅ Pixel validation passed - texture has colors`);

  } catch (error) {
    console.error(`❌ Pixel validation failed:`, error);
    showFallbackEffect(scene, weaponSprite);
    return;
  }

  console.log(`✅ Using validated texture effect: ${firstFrameKey} (${source.width}x${source.height})`);

  // *** สร้าง effect แต่มี debug background ***
  const effect = scene.add.image(
    weaponSprite.x + offsetX,
    weaponSprite.y + offsetY,
    firstFrameKey
  );

  effect.setScale(0.5);
  effect.setDepth(weaponSprite.depth + 10); // เพิ่ม depth มากขึ้น
  effect.setAlpha(0);

  // *** เพิ่ม debug border ชัดๆ ***
  const debugBorder = scene.add.graphics();
  debugBorder.lineStyle(3, 0xFF0000, 1); // เส้นแดงชัดๆ
  debugBorder.strokeRect(
    effect.x - (effect.width * effect.scaleX) / 2 - 2,
    effect.y - (effect.height * effect.scaleY) / 2 - 2,
    effect.width * effect.scaleX + 4,
    effect.height * effect.scaleY + 4
  );
  debugBorder.setDepth(effect.depth + 1);

  console.log(`🔴 Debug border created at depth ${debugBorder.depth}`);
  console.log(`🖼️  Effect created at (${effect.x}, ${effect.y}) with depth ${effect.depth}`);

  // Immediate show (no delay)
  effect.setAlpha(1);

  console.log(`📊 RENDER STATE CHECK:`, {
    effectVisible: effect.visible,
    effectAlpha: effect.alpha,
    effectDepth: effect.depth,
    effectTexture: effect.texture?.key,
    sceneChildren: scene.children.length,
    rendererType: scene.renderer.type
  });

  // Force render update
  scene.sys.displayList.queueDepthSort();
  if (scene.renderer.gl) {
    scene.renderer.flush();
  }

  // Animate frames
  animateTextureFrames(scene, effect, validFrames, debugBorder);
}

// Debug effect function removed - not needed in production

function animateTextureFrames(scene, effect, validFrames, debugBorder = null) {
  let frameIndex = 0;

  const nextFrame = () => {
    if (frameIndex < validFrames.length && effect && effect.active) {
      const frameKey = validFrames[frameIndex];

      if (scene.textures.exists(frameKey)) {
        const texture = scene.textures.get(frameKey);
        const source = texture.source[0];

        if (source?.image?.complete && source.image.naturalWidth > 0) {
          effect.setTexture(frameKey);
          console.log(`Frame ${frameIndex + 1}/${validFrames.length}: ${frameKey}`);

          // Force render update after texture change
          scene.sys.displayList.queueDepthSort();
          if (scene.renderer.gl) {
            scene.renderer.flush();
          }
        } else {
          console.warn(`Frame ${frameKey} became invalid, stopping`);
          if (effect.active) effect.destroy();
          if (debugBorder?.active) debugBorder.destroy();
          return;
        }
      } else {
        console.warn(`Frame ${frameKey} no longer exists, stopping`);
        if (effect.active) effect.destroy();
        if (debugBorder?.active) debugBorder.destroy();
        return;
      }

      frameIndex++;

      if (frameIndex < validFrames.length) {
        scene.time.delayedCall(150, nextFrame); // เพิ่มเวลา frame duration
      } else {
        console.log(`Texture animation completed`);
        // Fade out
        scene.tweens.add({
          targets: [effect, debugBorder].filter(Boolean),
          alpha: { from: 1, to: 0 },
          duration: 200,
          onComplete: () => {
            if (effect?.active) effect.destroy();
            if (debugBorder?.active) debugBorder.destroy();
            console.log(`Texture effect destroyed with fade out`);
          }
        });
      }
    }
  };

  nextFrame();
}

export async function preloadAllWeaponEffects(scene) {
  const weaponsToPreload = [
    'stick', 'sword', 'golden_sword', 'bow', 'crossbow',
    'axe', 'hammer', 'dagger', 'spear', 'staff', 'magic_sword'
  ];

  console.log('Starting to preload all weapon effects...');

  const promises = weaponsToPreload.map(weapon => {
    return preloadWeaponEffectSafe(scene, weapon);
  });

  const results = await Promise.all(promises);
  const total = results.reduce((sum, count) => sum + count, 0);
  console.log(`Preloaded ${total} weapon effect frames total`);
  return total;
}

function showFallbackEffect(scene, weaponSprite) {
  console.log("Creating fallback effect");

  const offsetX = weaponSprite.width * weaponSprite.scaleX * 0.5 + 10;
  // shift down a few pixels to align with scaled player
  const offsetY = 3;

  // สร้าง effect ด้วย graphics แทน
  const effect = scene.add.graphics();
  effect.setPosition(weaponSprite.x + offsetX, weaponSprite.y + offsetY);
  effect.setDepth(weaponSprite.depth + 1);

  // วาด effect pattern
  effect.fillStyle(0xFFD700, 0.9); // สีทอง
  effect.fillCircle(0, 0, 20);

  effect.fillStyle(0xFFFFFF, 0.7); // สีขาว
  effect.fillCircle(0, 0, 15);

  effect.fillStyle(0xFFD700, 1); // สีทองตรงกลาง
  effect.fillCircle(0, 0, 8);

  // Animation
  scene.tweens.add({
    targets: effect,
    scaleX: { from: 0.3, to: 1.5 },
    scaleY: { from: 0.3, to: 1.5 },
    alpha: { from: 1, to: 0 },
    duration: 500,
    ease: 'Power2',
    onComplete: () => {
      effect.destroy();
      console.log("Fallback effect completed");
    }
  });
}

export async function preloadWeaponEffectSafe(scene, weaponKey, effectType = '') {
  console.log(`Safely preloading effect for weapon: ${weaponKey}${effectType ? ` (${effectType})` : ''}`);

  const texturePrefix = `effect_${weaponKey}${effectType ? `_${effectType}` : ''}`;
  const framesToLoad = [];

  // ตรวจสอบไฟล์ที่มีจริง
  for (let i = 1; i <= 20; i++) { // เพิ่มจำนวนสูงสุดเป็น 20
    let url;
    let frameKey;

    if (effectType) {
      url = `/weapons_effect/${weaponKey}-${i}-${effectType}.png`;
      frameKey = `${texturePrefix}-${i}`;
    } else {
      url = `/weapons_effect/${weaponKey}-${i}.png`;
      frameKey = `${texturePrefix}-${i}`;
    }

    if (!scene.textures.exists(frameKey)) {
      const exists = await checkImageExistsSafe(url);
      if (exists) {
        framesToLoad.push({ key: frameKey, url: url });
      } else {
        break; // หยุดเมื่อไม่เจอไฟล์
      }
    }
  }

  console.log(`Found ${framesToLoad.length} effect frames to preload`);

  if (framesToLoad.length === 0) {
    return 0;
  }

  // โหลดทั้งหมด
  framesToLoad.forEach(frame => {
    scene.load.image(frame.key, frame.url);
  });

  return new Promise((resolve, reject) => {
    if (scene.load.list.size === 0) {
      resolve(0);
      return;
    }

    const timeout = setTimeout(() => {
      console.warn(`Preload timeout for ${weaponKey}`);
      resolve(framesToLoad.length); // ไม่ reject แค่ resolve ไป
    }, 10000); // 10 วินาที timeout

    scene.load.once('complete', () => {
      clearTimeout(timeout);

      // ⭐ ตรวจสอบว่า texture พร้อมใช้งานจริงหรือไม่
      let validCount = 0;
      const checkLoadedTextures = () => {
        framesToLoad.forEach(frame => {
          if (scene.textures.exists(frame.key)) {
            const texture = scene.textures.get(frame.key);
            const source = texture.source[0];
            if (source?.image?.complete && source.image.naturalWidth > 0) {
              validCount++;
            }
          }
        });

        console.log(`Preloaded ${validCount}/${framesToLoad.length} valid textures for ${weaponKey}`);
        resolve(validCount);
      };

      // รอสักหน่อยให้ texture process เสร็จ
      scene.time.delayedCall(100, checkLoadedTextures);
    });

    scene.load.once('loaderror', (fileObj) => {
      clearTimeout(timeout);
      console.error(`Failed to preload:`, fileObj.key);
      resolve(framesToLoad.length); // ไม่ reject เพื่อไม่ให้หยุดทำงาน
    });

    scene.load.start();
  });
}

function checkImageExistsSafe(url) {
  return new Promise((resolve) => {
    const img = new Image();

    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      img.onabort = null;
    };

    img.onload = () => {
      cleanup();
      // ⭐ ตรวจสอบว่ารูปมีขนาดจริงหรือไม่
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    };

    img.onerror = () => {
      cleanup();
      resolve(false);
    };

    img.onabort = () => {
      cleanup();
      resolve(false);
    };

    // Timeout สั้นลง
    setTimeout(() => {
      cleanup();
      resolve(false);
    }, 2000);

    img.src = url;
  });
}

export function validateTextureState(scene, textureKey) {
  if (!scene.textures.exists(textureKey)) {
    return {
      exists: false,
      loaded: false,
      valid: false,
      error: 'Texture does not exist'
    };
  }

  const texture = scene.textures.get(textureKey);
  const source = texture.source[0];

  const result = {
    exists: true,
    loaded: source?.image?.complete === true,
    valid: false,
    width: source?.width || 0,
    height: source?.height || 0,
    naturalWidth: source?.image?.naturalWidth || 0,
    naturalHeight: source?.image?.naturalHeight || 0,
    hasImage: !!source?.image,
    error: null
  };

  // ตรวจสอบว่า valid หรือไม่
  if (result.loaded &&
    result.naturalWidth > 0 &&
    result.naturalHeight > 0 &&
    result.width > 0 &&
    result.height > 0) {
    result.valid = true;
  } else {
    result.error = 'Texture loaded but invalid dimensions';
  }

  return result;
}

// Debug functions removed - not needed in production

// Old preload function removed - replaced by preloadWeaponEffectSafe

// Helper function เช็คว่าไฟล์รูปมีจริงหรือไม่
function checkImageExists(url) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);

    setTimeout(() => resolve(false), 3000);

    img.src = url;
  });
}


/**
 * ลด HP ของผู้เล่น (พร้อมคำนวณ defense จาก weapon)
 */
function reducePlayerHP(baseDamage) {
  const currentState = getCurrentGameState();

  // ดึง weaponData เพื่อคำนวณ defense
  const weaponData = currentState.weaponData || getWeaponData('stick');
  const defense = weaponData.combat_power || 10; // default stick = 10

  // คำนวณ damage ที่แท้จริง
  const actualDamage = Math.max(0, baseDamage - defense);

  console.log(`🗡️ Monster Attack:`, {
    baseDamage,
    defense,
    actualDamage,
    weaponKey: currentState.weaponKey || 'stick'
  });

  const currentHP = currentState.playerHP || 100;
  const newHP = Math.max(0, currentHP - actualDamage);

  // อัปเดต HP ใน game state
  setCurrentGameState({ playerHP: newHP });

  // อัปเดต UI
  if (window.setPlayerHp) {
    window.setPlayerHp(newHP);
  }

  console.log(`Player HP: ${newHP}/100 (รับ damage: ${actualDamage})`);

  if (newHP <= 0) {
    // ผู้เล่นตาย
    setCurrentGameState({ isGameOver: true });
    if (window.setIsGameOver) {
      window.setIsGameOver(true);
    }
  }
}

/**
 * แสดงผลการโจมตี
 */
function showAttackResult(attacker, damage, targetDefeated) {
  const message = attacker === 'player'
    ? `⚔️ คุณโจมตี ${damage} damage${targetDefeated ? ' - ศัตรูตาย!' : ''}`
    : `👹 ศัตรูโจมตี ${damage} damage`;

  showCombatMessage(message);
}

/**
 * แสดงข้อความในโหมดต่อสู้
 */
function showCombatMessage(message) {
  // สร้างข้อความแสดงผล
  const scene = getCurrentGameState().currentScene;
  if (!scene) return;

  const combatText = scene.add.text(600, 100, message, {
    fontSize: '20px',
    fill: '#FFD700',
    stroke: '#000000',
    strokeThickness: 2,
    align: 'center'
  }).setOrigin(0.5);

  combatText.setDepth(50);

  // หายไปหลังจาก 2 วินาที
  scene.time.delayedCall(2000, () => {
    scene.tweens.add({
      targets: combatText,
      alpha: 0,
      duration: 500,
      onComplete: () => combatText.destroy()
    });
  });
}

/**
 * แสดงการตายของศัตรู
 */
function showEnemyDefeat(enemy) {
  const scene = getCurrentGameState().currentScene;
  if (!scene || !enemy.sprite) return;

  // เอฟเฟกต์การตาย
  scene.tweens.add({
    targets: enemy.sprite,
    alpha: 0,
    scaleX: 0.5,
    scaleY: 0.5,
    rotation: Math.PI * 2,
    duration: 800,
    ease: 'Back.easeIn',
    onComplete: () => {
      enemy.sprite.setVisible(false);
    }
  });

  // เอฟเฟกต์ระเบิด
  createDeathExplosion(scene, enemy.sprite.x, enemy.sprite.y);
}

/**
 * สร้างเอฟเฟกต์ระเบิด
 */
function createDeathExplosion(scene, x, y) {
  const colors = [0xff0000, 0xffa500, 0xffff00];

  for (let i = 0; i < 8; i++) {
    const particle = scene.add.circle(x, y, 5, Phaser.Utils.Array.GetRandom(colors));
    particle.setDepth(25);

    const angle = (i / 8) * Math.PI * 2;
    const distance = Phaser.Math.Between(30, 60);

    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 600,
      onComplete: () => particle.destroy()
    });
  }
}

/**
 * แสดง UI โหมดต่อสู้
 */
function showCombatUI() {
  const scene = getCurrentGameState().currentScene;
  if (!scene) return;

  // สร้าง UI background
  const combatUI = scene.add.rectangle(600, 50, 400, 80, 0x000000, 0.8);
  combatUI.setDepth(40);

  // ข้อความสถานะ
  const statusText = scene.add.text(600, 30, '⚔️ COMBAT MODE', {
    fontSize: '16px',
    fill: '#FF0000',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  statusText.setDepth(41);

  // ข้อความคำแนะนำ
  const hintText = scene.add.text(600, 50, 'ใช้คำสั่ง hit() เพื่อโจมตี', {
    fontSize: '14px',
    fill: '#FFFFFF'
  }).setOrigin(0.5);
  hintText.setDepth(41);

  // ข้อความตาของผู้เล่น
  const turnText = scene.add.text(600, 70, '🎯 ตาของคุณ', {
    fontSize: '14px',
    fill: '#00FF00',
    fontStyle: 'bold'
  }).setOrigin(0.5);
  turnText.setDepth(41);

  // เก็บ reference สำหรับอัปเดต
  combatState.combatUI = { combatUI, statusText, hintText, turnText };
}

/**
 * ซ่อน UI โหมดต่อสู้
 */
function hideCombatUI() {
  if (combatState.combatUI) {
    Object.values(combatState.combatUI).forEach(ui => {
      if (ui && ui.destroy) ui.destroy();
    });
    combatState.combatUI = null;
  }
}

/**
 * อัปเดต UI โหมดต่อสู้
 */
export function updateCombatUI() {
  if (!combatState.isInCombat || !combatState.combatUI) return;

  const { turnText } = combatState.combatUI;
  if (turnText) {
    turnText.setText(combatState.playerTurn ? '🎯 ตาของคุณ' : '👹 ตาของศัตรู');
    turnText.setFill(combatState.playerTurn ? '#00FF00' : '#FF0000');
  }
}

/**
 * ตรวจสอบว่าผู้เล่นสามารถใช้คำสั่งได้หรือไม่
 */
export function canExecuteCommand() {
  // ให้สามารถใช้คำสั่งได้เสมอ ยกเว้นเมื่อเกมจบหรือถึงเป้าหมายแล้ว
  return true;
}

/**
 * ตรวจสอบว่าต้องใช้คำสั่ง hit() หรือไม่
 */
export function requiresHitCommand() {
  return combatState.isInCombat && combatState.playerTurn;
}

/**
 * หยุดการทำงานของเกม (ใช้เมื่อเริ่มการต่อสู้)
 * ปัจจุบันปิดการใช้งานเพื่อไม่ให้เกมหยุดทำงาน
 */
function pauseGameExecution() {
  // combatState.combatPaused = true;
  console.log('Game execution pause disabled for better gameplay');
}

/**
 * เริ่มการทำงานของเกมต่อ (ใช้เมื่อจบการต่อสู้)
 */
function resumeGameExecution() {
  combatState.combatPaused = false;
  console.log('Game execution resumed after combat');
}

/**
 * ตรวจสอบว่าเกมถูกหยุดหรือไม่
 */
export function isGamePaused() {
  return combatState.combatPaused;
}

/**
 * ตรวจสอบว่าการต่อสู้จบแล้วหรือไม่
 */
export function isCombatResolved() {
  return combatState.isCombatResolved;
}

/**
 * รับผลการต่อสู้
 */
export function getCombatResult() {
  return {
    winner: combatState.combatWinner,
    resolved: combatState.isCombatResolved
  };
}
