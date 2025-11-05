// src/components/LevelGame.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Phaser from "phaser";
import ProgressModal from './ProgressModal';
import * as Blockly from "blockly/core";
import "blockly/blocks";
import "blockly/javascript";
import { javascriptGenerator } from "blockly/javascript";
import { Editor } from '@monaco-editor/react';

const API_URL = process.env.REACT_APP_API_URL;

window.Blockly = Blockly;
// Import utilities and data
import {
  setCurrentScene,
  setLevelData,
  getCurrentGameState,
  setCurrentGameState,
  getPlayerHp,
  resetPlayerHp,
  loadWeaponsData,
  getWeaponData,
  getWeaponsData,
  nearPit as checkNearPit,
  toggleDebugMode,
  getPlayerCoins,
  addCoinToPlayer,
  clearPlayerCoins,
  swapPlayerCoins,
  comparePlayerCoins,
  getPlayerCoinValue,
  getPlayerCoinCount,
  arePlayerCoinsSorted,
  getRescuedPeople,
  clearRescuedPeople,
  resetAllPeople,
  allPeopleRescued,
  getStack,
  pushToStack,
  popFromStack,
  isStackEmpty,
  getStackCount,
  hasTreasureAtNode,
  collectTreasure,
  isTreasureCollected,
  clearStack,
  checkVictoryConditions,
  generateVictoryHint,
  displayPlayerWeapon
} from '../utils/gameUtils';
import { getNextBlockHint, checkPatternMatch, showRealTimeReward, validateTextCode, calculatePatternMatchPercentage } from '../utils/hintSystem';
import {
  isInCombat,
  preloadAllWeaponEffects,
  showEffectWeaponFixed
} from '../utils/combatSystem';
import {
  drawLevel,
  setupObstacles,
  setupMonsters,
  setupCoins,
  setupPeople,
  setupTreasures,
  drawPlayer,
  updateMonsters,
  updatePlayer,
  updatePlayerArrow,
  createPitFallEffect,
  showGameOver,
  showVictory,
  clearGameOverScreen,
  movePlayerWithCollisionDetection,
} from '../utils/phaserGame';
import { haveEnemy, hitEnemyWithDamage } from '../phaser/utils/playerCombat';
import { resetEnemy } from '../phaser/utils/enemyUtils';
import { createCharacterAnims } from '../anims/PlayerAnims';
import { createVampireAnims } from '../anims/EnemyAnims';
import { createToolboxConfig, defineAllBlocks, collectCoin, haveCoin, getCoinCount, getCoinValue, swapCoins, compareCoins, isSorted, ensureStandardBlocks, ensureCommonVariables, initializeImprovedVariableHandling, rescuePersonAtNode, hasPerson, personRescued, getPersonCount, moveToNode, pushNode, popNode, keepItem, hasTreasure, treasureCollected, stackEmpty, stackCount } from '../utils/blocklyUtils';

// Import components
import GameArea from './GameArea';
import BlocklyArea from './BlocklyArea';
import GameWithGuide from './GameWithGuide';

const LevelGame = () => {
  const { levelId } = useParams();
  const navigate = useNavigate();

  // Suppress Blockly deprecation warnings globally for this component
  useEffect(() => {
    const originalConsoleWarn = console.warn;
    console.warn = function (...args) {
      const message = args.join(' ');
      if (message.includes('getAllVariables was deprecated') ||
        message.includes('Use Blockly.Workspace.getVariableMap().getAllVariables instead') ||
        message.includes('Blockly.Workspace.getAllVariables was deprecated')) {
        // Suppress this specific deprecation warning
        return;
      }
      originalConsoleWarn.apply(console, args);
    };

    // Cleanup function to restore original console.warn
    return () => {
      console.warn = originalConsoleWarn;
    };
  }, []);

  // Inject global CSS for Blockly highlights to ensure it's visible (some Blockly DOMs are outside React root)
  useEffect(() => {
    try {
      const styleId = 'blockly-highlight-global-styles';
      if (document.getElementById(styleId)) return;
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
  .blockly-highlight-border {
    filter: drop-shadow(0 0 6px rgba(0, 255, 0, 0.8)) !important;
    transition: all 150ms ease-in-out !important;
  }
  .blockly-highlight-border .blocklyPath,
  .blockly-highlight-border path {
    stroke: #00ff00 !important;
    stroke-width: 2px !important;
    stroke-linejoin: round !important;
  }
  .blockly-highlight-border .blocklyOutline,
  .blockly-highlight-border .blocklyPath {
    stroke: #00ff00 !important;
  }
  .blockly-highlight-border .blocklyText,
  .blockly-highlight-border text {
    fill: #ffffff !important;
  }
  .blockly-highlight-border rect,
  .blockly-highlight-border .blocklyPath {
    opacity: 1 !important;
  }
`;

      document.head.appendChild(style);
    } catch (e) {
      console.warn('Could not inject global blockly highlight styles:', e);
    }
  }, []);

  const gameRef = useRef(null);
  const blocklyRef = useRef(null);
  const workspaceRef = useRef(null);
  const phaserGameRef = useRef(null);
  // Overlays created as a visual fallback when SVG/CSS highlighting is insufficient
  const highlightOverlaysRef = useRef({});

  const [gameState, setGameState] = useState("loading");
  const [currentHint, setCurrentHint] = useState("กำลังโหลดข้อมูลด่าน...");
  const [blocklyLoaded, setBlocklyLoaded] = useState(false);

  // Progress tracking state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const gameStartTime = useRef(null);

  // State for API data
  const [currentLevel, setCurrentLevel] = useState(null);
  const [enabledBlocks, setEnabledBlocks] = useState({});
  const [allBlocks, setAllBlocks] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Game state
  const [playerNodeId, setPlayerNodeId] = useState(0);
  const [playerDirection, setPlayerDirection] = useState(0);
  const [playerHpState, setPlayerHp] = useState(100);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  // Simplified weapon tracking
  const [currentWeaponData, setCurrentWeaponData] = useState(null);
  const [patternFeedback, setPatternFeedback] = useState("วาง blocks เพื่อดูผลลัพธ์");
  const [partialWeaponKey, setPartialWeaponKey] = useState(null);
  const [earnedWeaponKey, setEarnedWeaponKey] = useState(null);

  // Hint system state
  const [hintData, setHintData] = useState({
    hint: "วาง blocks เพื่อเริ่มต้น",
    showHint: false,
    currentStep: 0,
    totalSteps: 0,
    progress: 0
  });

  // Score system state
  const [finalScore, setFinalScore] = useState(null);

  // Hint open / count state
  const [hintOpen, setHintOpen] = useState(false);
  const [hintOpenCount, setHintOpenCount] = useState(0);
  const hintOpenAtStepRef = useRef(null);

  // Ensure finalScore is set when game is over (so UI can display 0)
  useEffect(() => {
    if (isGameOver && !finalScore) {
      setFinalScore({ totalScore: 0, stars: 0 });
    }
  }, [isGameOver, finalScore]);


  // Combat system state
  const [inCombatMode, setInCombatMode] = useState(false);

  // ระบบคะแนน: คำนวณคะแนนเมื่อผ่านด่าน
  function calculateFinalScore(isGameOver, patternTypeId, hintOpens = 0) {
    if (isGameOver) {
      return { totalScore: 0, stars: 0, pattern_bonus_score: 0 };
    }

    const bestScore = 60;
    let pattern_bonus_score = 0;

    // คำนวณโบนัสตามระดับคุณภาพของ pattern
    // pattern_type_id: 1 = ดี (40 คะแนน), 2 = ปานกลาง (20 คะแนน)
    if (patternTypeId === 1) pattern_bonus_score = 40;
    else if (patternTypeId === 2) pattern_bonus_score = 20;

    // Subtract hint penalty: 5 points per hint open
    const hintPenalty = Math.max(0, (hintOpens || 0)) * 5;
    let totalScore = bestScore + pattern_bonus_score - hintPenalty;
    if (totalScore < 0) totalScore = 0;

    // กำหนดดาว (stars) ตามคะแนน
    let stars = 1;
    if (totalScore >= 90) stars = 3;
    else if (totalScore >= 50) stars = 2;
    else if (totalScore >= 1) stars = 1;

    return { totalScore, stars, pattern_bonus_score };
  }

  // Person rescue state
  const [rescuedPeople, setRescuedPeople] = useState([]);

  // Sync combat state with combat system
  useEffect(() => {
    const interval = setInterval(() => {
      setInCombatMode(isInCombat());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // เพิ่ม useEffect นี้เข้าไปในโค้ด
  useEffect(() => {
    // ตรวจสอบ HP = 0 และแสดง Progress Modal
    if (playerHpState <= 0 && !isGameOver && !showProgressModal) {
      console.log("HP = 0 detected, showing game over modal");

      setIsGameOver(true);
      setGameState("gameOver");

      // คำนวณเวลาที่ใช้
      if (gameStartTime.current) {
        const endTime = Date.now();
        setTimeSpent(Math.floor((endTime - gameStartTime.current) / 1000));
      }

      setGameResult('gameover');
      setShowProgressModal(true);

      // แสดง Game Over screen
      const currentState = getCurrentGameState();
      if (currentState.currentScene) {
        showGameOver(currentState.currentScene);
      }
    }
  }, [playerHpState, isGameOver, showProgressModal]);

  // Sync rescued people state
  useEffect(() => {
    const interval = setInterval(() => {
      const currentRescued = getRescuedPeople();
      setRescuedPeople(currentRescued);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Admin pattern management
  const [goodPatterns, setGoodPatterns] = useState([]);

  // Debug mode state
  const [debugMode, setDebugMode] = useState(false);

  // Text code editor state
  const [textCode, setTextCode] = useState("");
  const [codeValidation, setCodeValidation] = useState({ isValid: false, message: "" });
  const [blocklyJavaScriptReady, setBlocklyJavaScriptReady] = useState(false);

  // Visual Guide System
  const [highlightedBlocks, setHighlightedBlocks] = useState([]);

  // Visual Guide Functions
  const highlightBlocks = (blockTypes) => {
    if (!workspaceRef.current || !blockTypes || blockTypes.length === 0) {
      setHighlightedBlocks([]);
      return;
    }

    clearHighlights();

    const workspace = workspaceRef.current;

    let flyoutWorkspace = null;
    try {
      const flyout = workspace.getFlyout && workspace.getFlyout();
      if (flyout && typeof flyout.getWorkspace === 'function') {
        flyoutWorkspace = flyout.getWorkspace();
      }
    } catch (e) {
      console.warn('⚠️ Could not get flyout workspace:', e);
    }

    // ✅ ดึง block จากเมนู flyout (menu ให้เลือก block)
    const flyoutBlocks = flyoutWorkspace && flyoutWorkspace.getAllBlocks
      ? flyoutWorkspace.getAllBlocks(false)
      : [];

    const applyHighlightToBlock = (block) => {
      const tryApply = (attempt = 1) => {
        try {
          const svgRoot = block.getSvgRoot && block.getSvgRoot();
          if (svgRoot) {
            svgRoot.classList.add('blockly-highlight-border');
            svgRoot.setAttribute('data-blockly-highlight', 'true');

            // ✅ ปรับความบางของเส้น highlight
            const shapeEls = svgRoot.querySelectorAll('path, rect, polygon, circle, ellipse');
            if (shapeEls && shapeEls.length > 0) {
              shapeEls.forEach(el => {
                try {
                  el.style.stroke = '#00ff00';
                  el.style.strokeWidth = '1.6px'; // ✅ เส้นบางลง
                  el.style.strokeLinejoin = 'round';
                  el.style.strokeLinecap = 'round';
                  el.style.filter = 'drop-shadow(0 0 3px rgba(0,255,0,0.6))';
                  el.setAttribute('data-blockly-highlight', 'true');
                } catch { }
              });
            } else {
              svgRoot.style.filter = 'drop-shadow(0 0 3px rgba(0,255,0,0.6))';
            }

            // ✅ วาด overlay แบบบางสุด
            const rect = svgRoot.getBoundingClientRect && svgRoot.getBoundingClientRect();
            if (rect && rect.width > 2 && rect.height > 2) {
              const overlayId = `blockly-highlight-overlay-${block.id}`;
              document.getElementById(overlayId)?.remove();

              const overlay = document.createElement('div');
              overlay.id = overlayId;
              overlay.setAttribute('data-blockly-highlight-overlay', 'true');
              overlay.style.position = 'fixed';
              overlay.style.left = `${rect.left - 2}px`;
              overlay.style.top = `${rect.top - 2}px`;
              overlay.style.width = `${rect.width + 4}px`;
              overlay.style.height = `${rect.height + 4}px`;
              overlay.style.border = '1.5px solid #00ff00';
              overlay.style.borderRadius = '4px';
              overlay.style.boxShadow = '0 0 6px rgba(0,255,0,0.6)';
              overlay.style.pointerEvents = 'none';
              overlay.style.zIndex = '2147483647';
              overlay.style.transition = 'opacity 150ms ease-in-out';
              overlay.style.opacity = '0.85';
              document.body.appendChild(overlay);
              highlightOverlaysRef.current[block.id] = overlay;
            }
            return true;
          }

          // fallback
          if (block.svgPath_) {
            block.svgPath_.classList.add('blockly-highlight-border');
            block.svgPath_.style.stroke = '#00ff00';
            block.svgPath_.style.strokeWidth = '1.6px';
            block.svgPath_.style.filter = 'drop-shadow(0 0 3px rgba(0,255,0,0.6))';
            block.svgPath_.setAttribute('data-blockly-highlight', 'true');
            return true;
          }

          if (attempt < 4) {
            setTimeout(() => tryApply(attempt + 1), 120);
            return false;
          }

          console.warn('⚠️ Could not apply highlight to block after retries:', { type: block.type, id: block.id });
          return false;
        } catch (err) {
          console.warn('Error applying highlight to block:', err, { type: block.type, id: block.id });
          return false;
        }
      };

      tryApply(1);
    };

    // ✅ Highlight เฉพาะ block ใน flyout เท่านั้น
    flyoutBlocks.forEach(block => {
      if (blockTypes.includes(block.type)) applyHighlightToBlock(block);
    });

    setHighlightedBlocks(blockTypes);
  };



  const clearHighlights = () => {
    if (!workspaceRef.current) {
      return;
    }

    const workspace = workspaceRef.current;

    // Clear highlights from main workspace blocks
    try {
      const allBlocks = workspace.getAllBlocks ? workspace.getAllBlocks(false) : [];
      allBlocks.forEach(block => {
        try {
          const svgGroup = block.getSvgRoot && block.getSvgRoot();
          if (svgGroup) {
            svgGroup.classList.remove('blockly-highlight-border');
            svgGroup.removeAttribute('data-blockly-highlight');
          }
          if (block.svgPath_) {
            try { block.svgPath_.classList.remove('blockly-highlight-border'); } catch (e) { }
          }
        } catch (err) {
          // ignore per-block errors
        }
      });
    } catch (err) {
      console.warn('Error clearing highlights from main workspace:', err);
    }

    // Clear highlights from flyout/toolbox
    try {
      const flyout = workspace.getFlyout && workspace.getFlyout();
      const flyoutWorkspace = flyout && flyout.getWorkspace ? flyout.getWorkspace() : null;
      const flyoutBlocks = flyoutWorkspace && flyoutWorkspace.getAllBlocks ? flyoutWorkspace.getAllBlocks(false) : [];
      flyoutBlocks.forEach(block => {
        try {
          const svgGroup = block.getSvgRoot && block.getSvgRoot();
          if (svgGroup) {
            svgGroup.classList.remove('blockly-highlight-border');
            svgGroup.removeAttribute('data-blockly-highlight');
          }
          if (block.svgPath_) {
            try { block.svgPath_.classList.remove('blockly-highlight-border'); } catch (e) { }
          }
        } catch (err) { }
      });
    } catch (err) {
      // ignore
    }

    // DOM fallback clear
    const domHighlighted = document.querySelectorAll('[data-blockly-highlight="true"], .blockly-highlight-border');
    domHighlighted.forEach(el => {
      try { el.classList.remove('blockly-highlight-border'); } catch (e) { }
      try { el.removeAttribute('data-blockly-highlight'); } catch (e) { }
    });

    // Remove overlay fallbacks
    try {
      const overlays = document.querySelectorAll('[data-blockly-highlight-overlay="true"]');
      overlays.forEach(o => {
        try { o.remove(); } catch (e) { }
      });
      highlightOverlaysRef.current = {};
    } catch (e) {
      // ignore
    }

    setHighlightedBlocks([]);
  };


  // Handle text code changes
  const handleTextCodeChange = (newCode) => {
    setTextCode(newCode);

    // ตรวจสอบ validation เมื่อมีการเปลี่ยนแปลง (เฉพาะเมื่อ Blockly.JavaScript พร้อม)
    if (currentLevel?.textcode && workspaceRef.current && blocklyLoaded && blocklyJavaScriptReady) {
      try {
        console.log("🔍 Calling validateTextCode...");
        const validation = validateTextCode(newCode, workspaceRef.current);
        console.log("🔍 Validation result:", validation);
        setCodeValidation(validation);
      } catch (error) {
        console.error("Error in handleTextCodeChange:", error);
        setCodeValidation({
          isValid: false,
          message: "เกิดข้อผิดพลาดในการตรวจสอบโค้ด"
        });
      }
    } else if (currentLevel?.textcode && !blocklyJavaScriptReady) {
      // แสดงข้อความรอเมื่อ Blockly.JavaScript ยังไม่พร้อม
      setCodeValidation({
        isValid: false,
        message: "กำลังรอให้ระบบพร้อมใช้งาน..."
      });
    }
  };

  // เริ่มจับเวลาเมื่อเริ่มเกม
  useEffect(() => {
    if (gameState === "running") {
      gameStartTime.current = Date.now();
    }
  }, [gameState]);

  // ตรวจสอบ code validation เมื่อ blocks เปลี่ยนแปลง (สำหรับด่านที่มี textcode: true)
  useEffect(() => {
    if (currentLevel?.textcode && workspaceRef.current && blocklyLoaded && blocklyJavaScriptReady && textCode) {
      try {
        const validation = validateTextCode(textCode, workspaceRef.current);
        setCodeValidation(validation);
      } catch (error) {
        console.error("Error in useEffect validation:", error);
        setCodeValidation({
          isValid: false,
          message: "เกิดข้อผิดพลาดในการตรวจสอบโค้ด"
        });
      }
    }
  }, [currentLevel?.textcode, textCode, blocklyLoaded, blocklyJavaScriptReady]);

  // Reset textCode และ validation เมื่อเปลี่ยนด่าน
  useEffect(() => {
    setTextCode("");
    setCodeValidation({ isValid: false, message: "" });
    setBlocklyJavaScriptReady(false);
  }, [levelId]);

  // Load data on component mount
  useEffect(() => {
    console.log("Component mounted, loading initial data");
    loadInitialData();
  }, []);

  // Load level data when levelId changes
  useEffect(() => {
    console.log("LevelId changed:", levelId);

    // Cleanup previous game and workspace when changing levels
    if (phaserGameRef.current) {
      try {
        console.log("Destroying previous Phaser game...");
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      } catch (error) {
        console.warn("Error destroying Phaser game on level change:", error);
      }
    }

    if (workspaceRef.current) {
      try {
        console.log("Disposing previous Blockly workspace...");
        workspaceRef.current.dispose();
        workspaceRef.current = null;
      } catch (error) {
        console.warn("Error disposing Blockly workspace on level change:", error);
      }
    }

    // Reset game state
    setGameState("loading");
    setCurrentHint("กำลังโหลดข้อมูลด่าน...");
    setIsRunning(false);
    setIsCompleted(false);
    setIsGameOver(false);

    if (levelId && !isNaN(parseInt(levelId))) {
      // Add delay to ensure cleanup is complete
      setTimeout(() => {
        loadLevelData(parseInt(levelId));
      }, 100);
    } else {
      setError("Level ID ไม่ถูกต้อง");
    }
  }, [levelId]);

  // Initialize Blockly and Phaser after data is loaded
  useEffect(() => {
    console.log("Checking initialization conditions:", {
      loading,
      allBlocksLength: Object.keys(allBlocks).length,
      currentLevel: !!currentLevel,
      enabledBlocksLength: Object.keys(enabledBlocks).length
    });

    if (!loading && Object.keys(allBlocks).length > 0 && currentLevel && Object.keys(enabledBlocks).length > 0) {
      console.log("All conditions met, initializing Blockly and Phaser");
      const timer = setTimeout(() => {
        initBlocklyAndPhaser();

        // รอให้ Blockly.JavaScript โหลดเสร็จ
        setTimeout(() => {
          setBlocklyLoaded(true);
          console.log("🔍 Blockly loaded set to true");

          // ตรวจสอบว่า Blockly.JavaScript พร้อมใช้งาน
          const checkBlocklyJavaScript = () => {
            console.log("🔍 Checking Blockly.JavaScript availability:");
            console.log("window.Blockly:", !!window.Blockly);
            console.log("window.Blockly.JavaScript:", !!window.Blockly?.JavaScript);
            console.log("window.Blockly.JavaScript.workspaceToCode:", !!window.Blockly?.JavaScript?.workspaceToCode);
            console.log("typeof workspaceToCode:", typeof window.Blockly?.JavaScript?.workspaceToCode);

            // ตรวจสอบหลายวิธี
            const hasWorkspaceToCode = window.Blockly?.JavaScript?.workspaceToCode;
            const hasGenerator = window.Blockly?.Generator;

            if (hasWorkspaceToCode && typeof hasWorkspaceToCode === 'function') {
              console.log("✅ Blockly.JavaScript.workspaceToCode พร้อมใช้งาน");
              setBlocklyJavaScriptReady(true);
              return true;
            } else if (hasGenerator && typeof hasGenerator === 'function') {
              console.log("✅ Blockly.Generator พร้อมใช้งาน (จะใช้แทน)");
              setBlocklyJavaScriptReady(true);
              return true;
            } else {
              console.warn("⚠️ Blockly.JavaScript ยังไม่พร้อมใช้งาน");
              setBlocklyJavaScriptReady(false);
              return false;
            }
          };

          // ตรวจสอบครั้งแรก
          if (!checkBlocklyJavaScript()) {
            // ลองอีกครั้งหลังจาก 500ms
            setTimeout(() => {
              if (!checkBlocklyJavaScript()) {
                // ลองอีกครั้งหลังจาก 1 วินาที
                setTimeout(() => {
                  if (!checkBlocklyJavaScript()) {
                    // ลองอีกครั้งหลังจาก 2 วินาที
                    setTimeout(() => {
                      checkBlocklyJavaScript();
                    }, 2000);
                  }
                }, 1000);
              }
            }, 500);
          }

          // ทดสอบการทำงานของ validateTextCode หลังจาก 3 วินาที
          setTimeout(() => {
            if (workspaceRef.current && blocklyLoaded) {
              console.log("🧪 Testing validateTextCode with sample code...");
              try {
                const testCode = "await moveForward();";
                const testResult = validateTextCode(testCode, workspaceRef.current);
                console.log("🧪 Test result:", testResult);
              } catch (error) {
                console.error("🧪 Test error:", error);
              }
            }
          }, 3000);

          setGameState("ready");
          setCurrentHint("โหลดข้อมูลเสร็จแล้ว! ลาก blocks มาเรียงกัน");

          // Set default weapon
          const defaultWeaponKey = currentLevel.defaultWeaponKey || "stick";
          const defaultWeaponData = getWeaponData(defaultWeaponKey);
          setCurrentWeaponData(defaultWeaponData);
          setCurrentGameState({
            weaponKey: defaultWeaponKey,
            weaponData: defaultWeaponData
          });
        }, 300); // รอ 300ms เพื่อให้ Blockly.JavaScript โหลดเสร็จ
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [loading, allBlocks, currentLevel, enabledBlocks]);

  // Create enabledBlocks when both allBlocks and currentLevel are available
  useEffect(() => {
    if (Object.keys(allBlocks).length > 0 && currentLevel) {
      console.log("Creating enabledBlocks from allBlocks and currentLevel (normalize)");
      // raw could be array of strings or array of objects (with block_key) or nested { block: { block_key } }
      const raw = Array.isArray(currentLevel.enabledBlocks) ? currentLevel.enabledBlocks : [];

      const specifiedKeys = raw.map(item => {
        if (!item) return null;
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
          // common shapes
          if (item.block_key) return item.block_key;
          if (item.block && item.block.block_key) return item.block.block_key;
          // in some endpoints you may get { block: { block_key } } or full block object
          if (item.block && typeof item.block === 'string') return item.block;
        }
        return null;
      }).filter(Boolean);

      const specifiedSet = new Set(specifiedKeys);
      const enableAllWhenEmpty = specifiedKeys.length === 0;

      const enabledBlocksObj = {};
      Object.keys(allBlocks).forEach((blockId) => {
        enabledBlocksObj[blockId] = enableAllWhenEmpty ? true : specifiedSet.has(blockId);
      });

      console.log("specifiedKeys:", specifiedKeys);
      console.log("enabledBlocksObj created:", enabledBlocksObj);
      setEnabledBlocks(enabledBlocksObj);
    }
  }, [allBlocks, currentLevel]);

  // Update toolbox when enabled blocks change
  useEffect(() => {
    if (blocklyLoaded && Object.keys(enabledBlocks).length > 0) {
      updateToolbox();
    }
  }, [enabledBlocks, blocklyLoaded]);

  // Real-time pattern analysis with hints
  useEffect(() => {
    console.log("🔍 Pattern analysis useEffect triggered:", {
      hasWorkspace: !!workspaceRef.current,
      goodPatternsLength: goodPatterns.length,
      goodPatterns: goodPatterns
    });

    if (!workspaceRef.current || goodPatterns.length === 0) {
      console.log("❌ Pattern analysis early return - missing workspace or patterns");
      return;
    }

    const workspace = workspaceRef.current;

    const analyzePattern = () => {
      console.log("🔍 Analyzing pattern with goodPatterns:", goodPatterns);

      // ตรวจสอบว่า scene พร้อมใช้งาน
      const currentState = getCurrentGameState();
      if (!currentState.currentScene || !currentState.currentScene.load || !currentState.currentScene.player || !currentState.currentScene.add || !currentState.currentScene.textures) {
        console.log("🔍 Scene not ready, skipping pattern analysis");
        return;
      }
      console.log("🔍 GoodPatterns details:", goodPatterns.map(p => ({
        name: p.name,
        xmlPattern: p.xmlPattern?.substring(0, 50) + "...",
        hints: p.hints,
        hintsCount: p.hints?.length || 0
      })));

      console.log("🔍 Calling getNextBlockHint with:", {
        workspace: !!workspace,
        goodPatterns: goodPatterns.length,
        goodPatternsData: goodPatterns
      });

      const hintInfo = getNextBlockHint(workspace, goodPatterns);
      console.log("🔍 Hint info from getNextBlockHint:", hintInfo);

      // Debug: ดู hints ที่ถูกใช้ใน hint system
      if (hintInfo.patternName) {
        const usedPattern = goodPatterns.find(p => p.name === hintInfo.patternName);
        if (usedPattern) {
          console.log("🔍 Used pattern for hints:", {
            name: usedPattern.name,
            hints: usedPattern.hints,
            currentStep: hintInfo.currentStep,
            totalSteps: hintInfo.totalSteps
          });
        }
      }

      // คำนวณเปอร์เซ็นต์การตรงกับ pattern
      const patternPercentage = calculatePatternMatchPercentage(workspace, goodPatterns);
      console.log("🔍 Pattern percentage:", patternPercentage);

      // อัปเดต hintInfo ด้วยข้อมูล pattern percentage
      const updatedHintInfo = {
        ...hintInfo,
        patternPercentage: patternPercentage.percentage,
        patternName: patternPercentage.bestPattern?.name || "ไม่มี pattern ที่ตรง",
        matchedBlocks: patternPercentage.matchedBlocks,
        totalBlocks: patternPercentage.totalBlocks,
        showPatternProgress: true,
        bestPattern: patternPercentage.bestPattern // เพิ่ม bestPattern เพื่อแสดงรูปอาวุธ
      };

      setHintData(updatedHintInfo);

      const patternMatch = checkPatternMatch(workspace, goodPatterns);
      console.log("🔍 Pattern match result:", patternMatch);

      if (patternMatch.matched) {
        // Exact match → แสดง weapon ของ pattern
        console.log("🎉 EXACT MATCH FOUND! Updating weapon to:", patternMatch.weaponKey);
        const weaponData = getWeaponData(patternMatch.weaponKey);
        setCurrentWeaponData(weaponData);
        setPatternFeedback(`🎉 Perfect Pattern: ${patternMatch.pattern.name}`);
        setCurrentGameState({
          weaponKey: patternMatch.weaponKey,
          weaponData: weaponData,
          patternTypeId: patternMatch.pattern.pattern_type_id
        });
        console.log("🔍 Setting weapon in game state:", {
          weaponKey: patternMatch.weaponKey,
          weaponData: weaponData,
          patternTypeId: patternMatch.pattern.pattern_type_id
        });
        const currentScene = getCurrentGameState().currentScene;
        if (currentScene && currentScene.load && typeof currentScene.load.image === 'function' && currentScene.player && currentScene.add && currentScene.textures) {
          try {
            displayPlayerWeapon(patternMatch.weaponKey, currentScene);
          } catch (error) {
            console.warn("Error displaying weapon:", error);
          }
        }

        setPartialWeaponKey(null);

      } else {
        // Partial match หรือ No match → แสดง default weapon
        console.log("🔍 No exact match, using default weapon");
        const currentState = getCurrentGameState();
        const defaultWeaponKey = currentState.levelData?.defaultWeaponKey || "stick";
        const defaultWeaponData = getWeaponData(defaultWeaponKey);

        setPartialWeaponKey(patternMatch.partial ? patternMatch.weaponKey : null);
        setCurrentWeaponData(defaultWeaponData);
        setPatternFeedback(
          hintInfo.progress > 0 ? `⚠️ ไม่ตรง Pattern ใดๆ` : "วาง blocks เพื่อดูผลลัพธ์"
        );
        setCurrentGameState({ weaponKey: defaultWeaponKey, weaponData: defaultWeaponData });

        const currentScene = currentState.currentScene;
        if (currentScene && currentScene.load && typeof currentScene.load.image === 'function' && currentScene.player && currentScene.add && currentScene.textures) {
          try {
            displayPlayerWeapon(defaultWeaponKey, currentScene);
          } catch (error) {
            console.warn("Error displaying weapon:", error);
          }
        }
      }
    };

    workspace.addChangeListener(analyzePattern);
    analyzePattern(); // run once on mount

    return () => {
      if (workspace.removeChangeListener) workspace.removeChangeListener(analyzePattern);
    };
  }, [blocklyLoaded, goodPatterns, workspaceRef.current]);

  // Auto-close hint when the user has progressed past the step that was open when they opened the hint
  useEffect(() => {
    if (!hintOpen) return;
    const currentStep = hintData?.currentStep || 0;
    const openedAt = hintOpenAtStepRef.current || 0;
    // If the workspace progressed (currentStep increased) then close the hint and clear highlights
    if (currentStep > openedAt) {
      setHintOpen(false);
      clearHighlights();
    }
  }, [hintData?.currentStep, hintOpen]);

  // Debug: log hintOpen changes
  useEffect(() => {
    console.log('🔔 hintOpen state changed:', hintOpen, 'hintOpenCount:', hintOpenCount, 'hintOpenAtStep:', hintOpenAtStepRef.current);
  }, [hintOpen, hintOpenCount]);

  // Visual Guide System - ใช้ hint system เดียวกันกับ content
  useEffect(() => {
    console.log("🔥 Visual Guide useEffect triggered for level:", currentLevel?.id);

    if (!currentLevel || !currentLevel.goodPatterns || !workspaceRef.current || !blocklyLoaded) {
      console.log("❌ Visual Guide requirements not met");
      return;
    }

    console.log("✅ Visual Guide requirements met");

    const workspace = workspaceRef.current;
    const goodPatterns = currentLevel.goodPatterns;

    // ใช้ hint system เดียวกันกับ content แต่หา hint ของ step ปัจจุบัน
    const updateVisualGuide = () => {
      console.log('🔍 updateVisualGuide called - hintOpen:', hintOpen, 'hintData.currentStep:', hintData?.currentStep);

      // ถ้า hint ไม่ได้เปิด ไม่ต้อง update visual guide
      if (!hintOpen) {
        console.log('🔍 updateVisualGuide - hint not open, skipping');
        return;
      }

      const hintInfo = getNextBlockHint(workspace, goodPatterns);

      // หา hint ของ step ที่ตรงกับ XML ปัจจุบัน
      let currentHintData = null;


      if (hintInfo.showHint && hintInfo.currentStep > 0) {
        // ใช้ hint ของ step ปัจจุบัน (currentStep - 1)
        const pattern = goodPatterns.find(p => p.name === hintInfo.patternName);
        if (pattern && pattern.hints && pattern.hints[hintInfo.currentStep - 1]) {
          currentHintData = pattern.hints[hintInfo.currentStep - 1];
        }
      } else if (hintInfo.showHint && hintInfo.currentStep === 0) {
        // ใช้ hint แรกของ pattern เมื่อ currentStep === 0
        const pattern = goodPatterns.find(p => p.name === hintInfo.patternName);

        if (pattern && pattern.hints && pattern.hints[0]) {
          currentHintData = pattern.hints[0];
        }
      } else {
        // ใช้ hint จาก hintInfo.hintData เมื่อมี
        if (hintInfo.hintData) {
          currentHintData = hintInfo.hintData;
        }
      }

      // ตรวจสอบว่ามี hint ที่มี visualGuide หรือไม่
      // Highlight only when user explicitly opened the hint (toggle)
      console.log('🔍 updateVisualGuide - currentHintData:', !!currentHintData, 'hasVisualGuide:', !!currentHintData?.visualGuide?.highlightBlocks);

      if (currentHintData?.visualGuide?.highlightBlocks) {
        console.log('🔍 updateVisualGuide - calling highlightBlocks with:', currentHintData.visualGuide.highlightBlocks);
        highlightBlocks(currentHintData.visualGuide.highlightBlocks);
      } else if (hintInfo.hintData?.visualGuide?.highlightBlocks) {
        // fallback to hintInfo.hintData if pattern lookup didn't yield pattern hints
        console.log('🔍 updateVisualGuide - fallback using hintInfo.hintData.highlightBlocks:', hintInfo.hintData.visualGuide.highlightBlocks);
        highlightBlocks(hintInfo.hintData.visualGuide.highlightBlocks);
      } else {
        console.log('🔍 updateVisualGuide - no highlightBlocks found');
      }

      // Update current weapon only for exact match (100% pattern)
      if (hintInfo.bestPattern && hintInfo.bestPattern.weaponKey && hintInfo.patternPercentage === 100) {
        console.log("🔍 Exact pattern match found, updating current weapon:", {
          weaponKey: hintInfo.bestPattern.weaponKey,
          patternName: hintInfo.bestPattern.name,
          patternTypeId: hintInfo.bestPattern.pattern_type_id,
          percentage: hintInfo.patternPercentage
        });

        // รอ weapons data โหลดเสร็จก่อน
        const weaponsData = getWeaponsData();
        console.log("🔍 Weapons data status:", !!weaponsData);

        if (weaponsData) {
          const newWeaponData = getWeaponData(hintInfo.bestPattern.weaponKey);
          console.log("🔍 Updating weapon from exact pattern match:", {
            weaponKey: hintInfo.bestPattern.weaponKey,
            weaponData: newWeaponData,
            patternName: hintInfo.bestPattern.name,
            patternTypeId: hintInfo.bestPattern.pattern_type_id
          });
          setCurrentWeaponData(newWeaponData);
          setCurrentGameState({
            weaponKey: hintInfo.bestPattern.weaponKey,
            weaponData: newWeaponData
          });
        } else {
          console.log("🔍 Weapons data not loaded yet, skipping weapon update");
          // ลองโหลด weapons data อีกครั้ง
          console.log("🔍 Attempting to reload weapons data...");
          loadWeaponsData().then(result => {
            if (result) {
              console.log("🔍 Weapons data reloaded, updating weapon...");
              const newWeaponData = getWeaponData(hintInfo.bestPattern.weaponKey);
              setCurrentWeaponData(newWeaponData);
              setCurrentGameState({
                weaponKey: hintInfo.bestPattern.weaponKey,
                weaponData: newWeaponData
              });
            }
          });
        }
      } else {
        console.log("🔍 No weapon update - not exact match:", {
          hasBestPattern: !!hintInfo.bestPattern,
          hasWeaponKey: !!hintInfo.bestPattern?.weaponKey,
          percentage: hintInfo.patternPercentage
        });
      }
    };

    // รันครั้งแรก (หลัง delay เล็กน้อย)
    setTimeout(updateVisualGuide, 500);

    // เพิ่ม listener สำหรับ real-time updates - แต่จะทำงานก็ต่อเมื่อ hint เปิดอยู่
    const handleWorkspaceChange = () => {
      if (hintOpen) {
        console.log("🔄 Workspace changed - updating visual guide...");
        updateVisualGuide();
      }
    };

    workspace.addChangeListener(handleWorkspaceChange);

    // Cleanup - อย่าลบ highlights ที่นี่ เพราะอาจมี useEffect อื่นจัดการอยู่
    return () => {
      console.log("🧹 Cleaning up Visual Guide useEffect");
      if (workspace.removeChangeListener) {
        workspace.removeChangeListener(handleWorkspaceChange);
      }
    };
  }, [currentLevel, workspaceRef.current, blocklyLoaded, hintOpen]);

  // Debug useEffect - ดูว่า dependencies เปลี่ยนหรือไม่
  useEffect(() => {
    console.log("🔄 Dependencies changed:", {
      currentLevelId: currentLevel?.id,
      hasWorkspace: !!workspaceRef.current,
      blocklyLoaded
    });
  }, [currentLevel, workspaceRef.current, blocklyLoaded]);

  // Debug currentLevel changes
  useEffect(() => {
    if (currentLevel) {
      console.log("📊 currentLevel loaded:", {
        id: currentLevel.id,
        name: currentLevel.name,
        hasGuides: !!currentLevel.guides,
        guidesLength: currentLevel.guides?.length || 0
      });
    }
  }, [currentLevel, workspaceRef.current, blocklyLoaded]);

  // Debug - ตรวจสอบว่า Visual Guide useEffect ทำงานหรือไม่
  useEffect(() => {
    console.log("🔥 Component mounted/updated - Visual Guide should work");
    console.log("🔥 Current state:", {
      currentLevel: !!currentLevel,
      workspace: !!workspaceRef.current,
      blocklyLoaded
    });
  });

  // Cleanup Phaser game and Blockly workspace on unmount
  useEffect(() => {
    return () => {
      if (phaserGameRef.current) {
        try {
          phaserGameRef.current.destroy(true);
        } catch (error) {
          console.warn("Error destroying Phaser game:", error);
        }
      }
      if (workspaceRef.current) {
        try {
          workspaceRef.current.dispose();
        } catch (error) {
          console.warn("Error disposing Blockly workspace:", error);
        }
        workspaceRef.current = null;
      }
    };
  }, []);

  // API Functions
  const loadInitialData = async () => {
    try {
      console.log("Loading initial data...");
      setLoading(true);
      setCurrentHint("📡 กำลังโหลดข้อมูลจาก API...");

      // โหลดข้อมูลอาวุธก่อนและรอให้เสร็จ
      console.log("🔍 Loading weapons data...");
      const weaponsResult = await loadWeaponsData();
      if (!weaponsResult) {
        throw new Error("Failed to load weapons data");
      }
      console.log("✅ Weapons data loaded successfully");

      const response = await fetch(`${API_URL}/api/game-data`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Game data response:", data);

      if (data.success) {
        // แปลง blocks array เป็น object keyed by block_key
        const blocksObj = {};
        data.data.blocks.forEach(block => {
          blocksObj[block.block_key] = block;
        });
        setAllBlocks(blocksObj);
        setCurrentHint("✅ โหลดข้อมูลพื้นฐานเสร็จแล้ว");
      } else {
        throw new Error(data.message || 'Failed to load game data');
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError("ไม่สามารถโหลดข้อมูลได้: " + err.message);
      setCurrentHint("❌ เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const loadLevelData = async (levelId) => {
    try {
      console.log("Loading level data for levelId:", levelId);
      setCurrentHint("📡 กำลังโหลดข้อมูลด่าน...");

      const response = await fetch(`${API_URL}/api/demo/play-level/${levelId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Level data response:", data);

      if (data.success && data.data) {
        const levelData = data.data;

        // แปลงข้อมูลจาก API ให้ตรงกับโครงสร้างที่ component คาดหวัง
        // ดึงข้อมูล victory conditions จาก API
        let victoryConditions = [];
        try {
          const victoryResponse = await fetch(`${API_URL}/api/levels/${levelId}/victory-conditions`);
          if (victoryResponse.ok) {
            const victoryData = await victoryResponse.json();
            if (victoryData.success) {
              victoryConditions = victoryData.data;
              console.log("🔍 Loaded victory conditions from API:", victoryConditions);
            }
          }
        } catch (error) {
          console.warn("Failed to load victory conditions from API:", error);
        }

        // ดึงข้อมูล guides จาก API
        let guides = [];
        try {
          const guidesResponse = await fetch(`${API_URL}/api/levels/${levelId}/guides`);
          if (guidesResponse.ok) {
            const guidesData = await guidesResponse.json();
            if (guidesData.success) {
              guides = guidesData.data;
              console.log("🔍 Loaded guides from API:", guides);
            }
          }
        } catch (error) {
          console.warn("Failed to load guides from API:", error);
        }

        const formattedLevelData = {
          id: levelData.level_id,
          name: levelData.level_name,
          description: levelData.description,
          difficulty: levelData.difficulty,
          background_image: levelData.background_image,
          startNodeId: levelData.start_node_id,
          goalNodeId: levelData.goal_node_id,
          nodes: levelData.nodes || [],
          edges: levelData.edges || [],
          monsters: levelData.monsters || [],
          obstacles: levelData.obstacles || [],
          coinPositions: levelData.coin_positions || [],
          people: levelData.people || [],
          treasures: levelData.treasures || [],
          enabledBlocks: levelData.enabled_blocks || [],
          victoryConditions: victoryConditions, // เพิ่ม victory conditions จาก API
          guides: guides, // เพิ่ม guides จาก API
          defaultWeaponKey: "stick", // ใช้ default weapon
          goodPatterns: (levelData.patterns || []).map(pattern => {
            console.log("🔍 Processing pattern:", pattern);
            return {
              ...pattern,
              // แปลง field names ให้ตรงกับที่ hint system คาดหวัง
              name: pattern.pattern_name,
              xmlPattern: pattern.xmlpattern, // แปลง xmlpattern เป็น xmlPattern
              weaponKey: pattern.weapon?.weapon_key || `weapon_${pattern.weapon_id}`,
              // แปลง hints จาก string เป็น JSON object
              hints: (() => {
                console.log(`🔍 Converting hints for pattern ${pattern.pattern_name}:`, {
                  originalHints: pattern.hints,
                  hintsType: typeof pattern.hints,
                  isArray: Array.isArray(pattern.hints)
                });

                if (typeof pattern.hints === 'string' && pattern.hints.trim()) {
                  try {
                    const parsed = JSON.parse(pattern.hints);
                    console.log(`✅ Parsed JSON hints for ${pattern.pattern_name}:`, parsed);
                    return parsed;
                  } catch (e) {
                    console.warn('Failed to parse hints JSON:', e);
                    return [];
                  }
                } else if (Array.isArray(pattern.hints)) {
                  // แปลง PowerShell object เป็น JSON object
                  const converted = pattern.hints.map((hint, index) => {
                    console.log(`🔍 Converting hint ${index + 1}:`, {
                      original: hint,
                      step: hint.step,
                      content: hint.content,
                      visualGuide: hint.visualGuide
                    });

                    return {
                      step: hint.step,
                      hintType: hint.hintType,
                      difficulty: hint.difficulty,
                      content: typeof hint.content === 'object' ? hint.content : {},
                      visualGuide: typeof hint.visualGuide === 'object' ? {
                        highlightBlocks: Array.isArray(hint.visualGuide.highlightBlocks)
                          ? hint.visualGuide.highlightBlocks
                          : []
                      } : {},
                      xmlCheck: hint.xmlCheck
                    };
                  });

                  console.log(`✅ Converted hints for ${pattern.pattern_name}:`, converted);
                  return converted;
                }
                console.log(`❌ No valid hints found for ${pattern.pattern_name}`);
                return [];
              })()
            };
          }).filter((pattern, index, self) =>
            // ลบ patterns ที่ซ้ำกันโดยใช้ pattern_id
            index === self.findIndex(p => p.pattern_id === pattern.pattern_id)
          ),
          goalType: levelData.goal_type || "ถึงเป้าหมาย",
          textcode: levelData.textcode || false
        };

        console.log("🔍 Final formattedLevelData:", formattedLevelData);
        console.log("🔍 Final goodPatterns:", formattedLevelData.goodPatterns);

        setLevelData(formattedLevelData);
        setCurrentLevel(formattedLevelData);

        setGoodPatterns(formattedLevelData.goodPatterns);

        console.log("📦 Patterns from API:", formattedLevelData.goodPatterns);
        formattedLevelData.goodPatterns.forEach(p => {
          console.log(`Pattern: ${p.name}`);
          console.log(`  - xmlPattern:`, p.xmlPattern?.substring(0, 50));
          console.log(`  - pattern_type_id:`, p.pattern_type_id);
          console.log(`  - weaponKey:`, p.weaponKey);
          console.log(`  - hints:`, p.hints?.length, "steps");
        });
        console.log("🔍 Loaded goodPatterns:", formattedLevelData.goodPatterns);
        console.log("🔍 Pattern names:", formattedLevelData.goodPatterns.map(p => p.name));
        console.log("🔍 Pattern weapon keys:", formattedLevelData.goodPatterns.map(p => p.weaponKey));
        console.log("🔍 Pattern hints:", formattedLevelData.goodPatterns.map(p => ({
          name: p.name,
          hints: p.hints,
          hintsLength: p.hints?.length || 0,
          xmlPattern: p.xmlPattern?.substring(0, 100) + "..."
        })));

        // Debug: ดู hints แต่ละ step อย่างละเอียด
        formattedLevelData.goodPatterns.forEach((pattern, index) => {
          console.log(`🔍 Pattern ${index + 1} (${pattern.name}) hints:`, pattern.hints);
          if (pattern.hints && pattern.hints.length > 0) {
            pattern.hints.forEach((hint, hintIndex) => {
              console.log(`  🔍 Hint ${hintIndex + 1}:`, {
                step: hint.step,
                hintType: hint.hintType,
                content: hint.content,
                visualGuide: hint.visualGuide,
                xmlCheck: hint.xmlCheck
              });
            });
          } else {
            console.log(`  ❌ No hints found for pattern ${pattern.name}`);
          }
        });

        setCurrentHint(`📍 โหลดด่าน "${formattedLevelData.name}" เสร็จแล้ว`);

        // Reset game state for new level
        setCurrentGameState({
          currentNodeId: formattedLevelData.startNodeId,
          direction: 0,
          goalReached: false,
          moveCount: 0,
          isGameOver: false,
          weaponKey: formattedLevelData.defaultWeaponKey || "stick",
          weaponData: getWeaponData(formattedLevelData.defaultWeaponKey || "stick"),
          levelData: formattedLevelData
        });

        resetPlayerHp(setPlayerHp);

        setPlayerNodeId(formattedLevelData.startNodeId);
        setPlayerDirection(0);
        setPlayerHp(100);
        setIsCompleted(false);
        setIsGameOver(false);
        const weaponKey = formattedLevelData.defaultWeaponKey || "stick";
        const weaponData = getWeaponData(weaponKey);
        setCurrentWeaponData(weaponData);
        setPatternFeedback("วาง blocks เพื่อดูผลลัพธ์");
      } else {
        throw new Error(data.message || 'Failed to load level data');
      }
    } catch (err) {
      console.error('Error loading level data:', err);
      setError("ไม่สามารถโหลดข้อมูลด่านได้: " + err.message);
    }
  };

  // Debug mode toggle function
  const handleDebugToggle = () => {
    const newDebugMode = toggleDebugMode();
    setDebugMode(newDebugMode);
    setCurrentHint(newDebugMode ? "🐛 Debug Mode: ON - แสดง Hitbox" : "🐛 Debug Mode: OFF");
  };

  const initBlocklyAndPhaser = () => {
    console.log("initBlocklyAndPhaser called");
    console.log("blocklyRef.current:", !!blocklyRef.current);
    console.log("enabledBlocks:", enabledBlocks);
    console.log("enabledBlocks length:", Object.keys(enabledBlocks).length);

    if (!blocklyRef.current || Object.keys(enabledBlocks).length === 0) {
      console.log("Early return - missing ref or no enabled blocks");
      return;
    }

    // Deprecation warnings are now handled globally in useEffect

    // Add delay to ensure DOM is ready
    setTimeout(() => {
      try {
        // Clean up existing workspace first
        if (workspaceRef.current) {
          console.log("Disposing existing workspace...");
          try {
            workspaceRef.current.dispose();
          } catch (disposeError) {
            console.warn("Error disposing workspace:", disposeError);
          }
          workspaceRef.current = null;
        }

        // Clear the container and ensure it's ready
        if (blocklyRef.current) {
          blocklyRef.current.innerHTML = '';
          // Ensure the container is properly attached to DOM
          if (!blocklyRef.current.parentNode) {
            console.error("Blockly container is not attached to DOM!");
            return;
          }
        }

        // Initialize improved variable handling
        initializeImprovedVariableHandling();

        // Ensure standard blocks are available
        ensureStandardBlocks();

        // Define all blocks first
        defineAllBlocks();

        // Initialize Blockly
        const toolbox = createToolboxConfig(enabledBlocks);
        console.log("Toolbox created:", toolbox);

        const workspaceConfig = {
          toolbox,
          collapse: true,
          comments: true,
          disable: true,
          maxBlocks: Infinity,
          trashcan: true,
          horizontalLayout: false,
          toolboxPosition: "start",
          css: true,
          media: "https://blockly-demo.appspot.com/static/media/",
          rtl: false,
          scrollbars: true,
          sounds: false,
          oneBasedIndex: true,
          // Enable variable management
          variables: true,
          grid: {
            spacing: 20,
            length: 3,
            colour: "#ccc",
            snap: true,
          },
          zoom: {
            controls: true,
            wheel: true,
            startScale: 0.8,
            maxScale: 3,
            minScale: 0.3,
            scaleSpeed: 1.2,
          },
        };

        console.log("Creating Blockly workspace...");
        const workspace = Blockly.inject(blocklyRef.current, workspaceConfig);
        console.log("Blockly workspace created:", workspace);
        workspaceRef.current = workspace;
        console.log("🔍 workspaceRef.current set to:", !!workspaceRef.current);

        // Set up Variable Manager for variable renaming
        if (workspace.getVariableMap) {
          const variableMap = workspace.getVariableMap();
          if (variableMap) {
            console.log("Variable Map available:", variableMap);
          }
        }

        // Ensure common variables exist
        ensureCommonVariables(workspace);

        // Add error handler for workspace
        workspace.addChangeListener((event) => {
          if (event.type === Blockly.Events.ERROR) {
            console.warn("Blockly error event:", event);
          }
        });

        // Add variable management - simplified
        workspace.addChangeListener((event) => {
          if (event.type === Blockly.Events.BLOCK_CREATE || event.type === Blockly.Events.BLOCK_CHANGE) {
            // Ensure variables exist when blocks are created or changed
            const block = workspace.getBlockById(event.blockId);
            if (block && block.getField) {
              const varField = block.getField('VAR');
              if (varField && varField.getValue) {
                const varName = varField.getValue();
                const variable = workspace.getVariable(varName);
                if (!variable) {
                  console.log(`Creating variable: ${varName}`);
                  try {
                    workspace.createVariable(varName);
                  } catch (error) {
                    console.error(`Failed to create variable ${varName}:`, error);
                  }
                }
              }
            }
          }
        });

        // Initialize Phaser
        console.log("Initializing Phaser game...");
        initPhaserGame();

        // Trigger pattern analysis setup after workspace is created
        console.log("🔍 Workspace created, triggering pattern analysis setup");

        // Force re-evaluation of pattern analysis useEffect
        setTimeout(() => {
          console.log("🔍 Forcing pattern analysis setup after workspace creation");
        }, 50);
      } catch (error) {
        console.error("Error initializing workspace:", error);
        setCurrentHint("❌ เกิดข้อผิดพลาดในการสร้าง workspace");
      }
    }, 100); // 100ms delay to ensure DOM is ready
  };

  const updateToolbox = () => {
    if (!workspaceRef.current) return;
    try {
      const newToolbox = createToolboxConfig(enabledBlocks);
      workspaceRef.current.updateToolbox(newToolbox);
    } catch (error) {
      console.warn("Error updating toolbox:", error);
    }
  };

  const initPhaserGame = () => {
    console.log("initPhaserGame called");
    console.log("gameRef.current:", !!gameRef.current);
    console.log("currentLevel:", !!currentLevel);
    console.log("phaserGameRef.current:", !!phaserGameRef.current);

    if (!gameRef.current || !currentLevel) {
      console.log("Early return - missing gameRef or currentLevel");
      return;
    }

    // Prevent creating multiple games
    if (phaserGameRef.current) {
      console.log("Phaser game already exists, destroying first...");
      try {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      } catch (error) {
        console.warn("Error destroying existing Phaser game:", error);
      }
    }

    class GameScene extends Phaser.Scene {
      preload() {
        // this.load.image(
        //   "bg",
        //   "data:image/svg+xml;base64;" +
        //     btoa(`
        //   <svg width="1200" height="700" xmlns="http://www.w3.org/2000/svg">
        //     <rect width="1200" height="700" fill="#2d5a2d"/>
        //     <rect x="40" y="40" width="1120" height="620" fill="#4a7c59"/>
        //   </svg>
        // `)
        // );

        const backgroundPath = currentLevel?.background_image;
        console.log('Loading background image from:', backgroundPath);
        console.log('Current level data:', currentLevel);

        // เพิ่ม error handler
        this.load.on('loaderror', (file) => {
          console.error('❌ Failed to load file:', file.key, 'from:', file.src);
        });

        // เพิ่ม success handler
        this.load.on('filecomplete', (key) => {
          console.log('✅ File loaded successfully:', key);
        });

        this.load.image('bg', backgroundPath);

        // Load player sprites - using only regular player
        this.load.atlas('player', '/characters/player.png', '/characters/player.json');

        // Load enemy sprites
        this.load.atlas('vampire', '/enemies/vampire.png', '/enemies/vampire.json');

        this.load.image('weapon_stick', '/weapons/stick.png');

        // Load weapon effects
        this.load.image('effect_stick-1', '/weapons_effect/stick-1.png');

      }

      create() {
        console.log("Phaser scene create() called");
        setCurrentScene(this);
        this.levelData = currentLevel;

        // Create animations
        createCharacterAnims(this.anims);
        createVampireAnims(this.anims);

        // Preload effects แล้วค่อยสร้างเกม
        preloadAllWeaponEffects(this).then(() => {
          console.log("All weapon effects preloaded, setting up game...");
          this.setupGame();
        });
      }

      setupGame() {
        drawLevel(this);
        drawPlayer(this);
        setupMonsters(this);
        setupObstacles(this);
        setupCoins(this);
        setupPeople(this);
        setupTreasures(this);

        const currentState = getCurrentGameState();
        console.log("Current scene set in game state:", !!currentState.currentScene);

        // Add keyboard input for restart
        this.input.keyboard.on('keydown-R', () => {
          if (getCurrentGameState().isGameOver) {
            handleRestartGame();
          }
        });
      }

      update(time, delta) {
        const currentState = getCurrentGameState();
        if (currentState.isGameOver || currentState.goalReached) return;

        updateMonsters(this, delta, isRunning, setPlayerHp, setIsGameOver, setCurrentHint);
      }
    }

    const config = {
      type: Phaser.AUTO,
      width: 1200,
      height: 900,
      backgroundColor: "#222222",
      parent: gameRef.current,
      scene: GameScene,
      audio: {
        disableWebAudio: true
      }
    };

    if (phaserGameRef.current) {
      phaserGameRef.current.destroy(true);
    }

    console.log("Creating Phaser game with config:", config);
    phaserGameRef.current = new Phaser.Game(config);
    console.log("Phaser game created:", phaserGameRef.current);
  };

  const runCode = async () => {
    console.log("runCode function called!");
    console.log("workspaceRef.current:", !!workspaceRef.current);
    console.log("phaserGameRef.current:", !!phaserGameRef.current);
    console.log("getCurrentGameState().currentScene:", !!getCurrentGameState().currentScene);

    if (!workspaceRef.current || !phaserGameRef.current || !getCurrentGameState().currentScene) {
      console.log("System not ready - early return");
      setCurrentHint("❌ ระบบยังไม่พร้อม");
      return;
    }

    // เช็ค code validation สำหรับด่านที่มี textcode: true
    if (currentLevel?.textcode && !blocklyJavaScriptReady) {
      setCurrentHint("❌ ระบบแปลงโค้ดยังไม่พร้อมใช้งาน กรุณารอสักครู่");
      return;
    }

    if (currentLevel?.textcode && !codeValidation.isValid) {
      setCurrentHint(`❌ ${codeValidation.message}`);
      return;
    }

    setIsRunning(true);
    setGameState("running");
    setIsCompleted(false);
    setIsGameOver(false);
    setCurrentHint("🏃 กำลังเรียกใช้โปรแกรม...");

    // Start timing the attempt
    gameStartTime.current = Date.now();
    setAttempts(prev => prev + 1);

    // Reset to start position และ sync HP
    setCurrentGameState({
      currentNodeId: currentLevel.startNodeId,
      direction: 0,
      goalReached: false,
      moveCount: 0,
      isGameOver: false,
      playerCoins: [] // ล้างเหรียญที่เก็บไว้
    });

    // IMPORTANT: Reset HP และ sync กับ React state
    resetPlayerHp(setPlayerHp);
    console.log("Game reset - HP set to:", getPlayerHp());

    // ล้างเหรียญที่เก็บไว้
    clearPlayerCoins();
    console.log("Game reset - Coins cleared");

    // ล้างข้อมูลคนที่ช่วยแล้ว
    clearRescuedPeople();
    setRescuedPeople([]);
    await resetAllPeople();
    console.log("Game reset - Rescued people cleared");

    // ล้างข้อมูล stack และสมบัติ
    clearStack();
    console.log("Game reset - Stack and treasure cleared");

    // อัปเดตการแสดงผลสมบัติหลังจาก reset
    if (getCurrentGameState().currentScene) {
      import('../utils/phaserGame').then(({ updateTreasureDisplay }) => {
        updateTreasureDisplay(getCurrentGameState().currentScene);
      });
    }

    // รีเซ็ตเหรียญในเกมให้กลับมาแสดง
    if (getCurrentGameState().currentScene) {
      // รีเซ็ตเหรียญที่เก็บไว้แล้วให้กลับมาแสดง
      if (getCurrentGameState().currentScene.coins) {
        getCurrentGameState().currentScene.coins.forEach(coin => {
          coin.collected = false;
          coin.sprite.setVisible(true);
          const valueText = coin.sprite.getData('valueText');
          const glow = coin.sprite.getData('glow');
          if (valueText) valueText.setVisible(true);
          if (glow) glow.setVisible(true);
        });
        console.log("Game reset - Coins reset in scene (showing all coins)");
      }

      // รีเซ็ตคนที่ถูกช่วยไว้ให้กลับมาแสดง
      if (getCurrentGameState().currentScene.people) {
        getCurrentGameState().currentScene.people.forEach(person => {
          person.setVisible(true);
          if (person.nameLabel) {
            person.nameLabel.setVisible(true);
          }
          if (person.rescueEffect) {
            person.rescueEffect.setVisible(true);
          }
        });
        console.log("Game reset - People reset in scene (showing all people)");
      }

      // รีเซ็ตสมบัติที่เก็บไว้ให้กลับมาแสดง
      if (getCurrentGameState().currentScene.treasures) {
        getCurrentGameState().currentScene.treasures.forEach(treasure => {
          treasure.setVisible(true);
          if (treasure.nameLabel) {
            treasure.nameLabel.setVisible(true);
          }
          if (treasure.glowEffect) {
            treasure.glowEffect.setVisible(true);
          }
        });
        console.log("Game reset - Treasures reset in scene (showing all treasures)");
      }
    }

    // Reset monsters state using new utility functions
    if (getCurrentGameState().currentScene && getCurrentGameState().currentScene.monsters) {
      getCurrentGameState().currentScene.monsters.forEach(monster => {
        monster.data.defeated = false;
        monster.data.inBattle = false;
        monster.data.isChasing = false;
        monster.data.lastAttackTime = null;
        monster.data.hp = 3;

        // Use new utility function to reset enemy
        resetEnemy(monster.sprite, monster.sprite.x, monster.sprite.y);
        monster.glow.setVisible(true);
        monster.glow.setFillStyle(0xff0000, 0.2);
        monster.sprite.anims.play('vampire-idle', true);
      });
    }

    setPlayerNodeId(currentLevel.startNodeId);
    setPlayerDirection(0);

    // Update player position in Phaser (HP bar now handled in bottom UI)
    if (getCurrentGameState().currentScene) {
      updatePlayer(getCurrentGameState().currentScene, currentLevel.startNodeId, 0);
    }

    const code = javascriptGenerator.workspaceToCode(workspaceRef.current);

    if (!code.trim()) {
      setCurrentHint("❌ ไม่มี blocks! ลาก blocks มาจาก toolbox");
      setGameState("ready");
      setIsRunning(false);
      return;
    }

    console.log("Generated code:", code);
    console.log("Starting HP:", getPlayerHp());
    console.log("Current scene available:", !!getCurrentGameState().currentScene);
    console.log("Current game state:", getCurrentGameState());

    // รอให้ผู้เล่นกลับไปตำแหน่งแรกก่อน แล้วค่อยรันโค้ด
    setCurrentHint("🔄 กำลังเตรียมเกม...");
    await new Promise(resolve => setTimeout(resolve, 1000)); // รอ 1 วินาที

    try {
      console.log("Creating AsyncFunction with code:", code);
      const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
      const execFunction = new AsyncFunction(
        "moveForward", "turnLeft", "turnRight", "hit", "foundMonster", "canMoveForward", "nearPit", "atGoal",
        "collectCoin", "haveCoin", "getCoinCount", "getCoinValue", "swapCoins", "compareCoins", "isSorted",
        "getPlayerCoins", "addCoinToPlayer", "clearPlayerCoins", "swapPlayerCoins", "comparePlayerCoins",
        "getPlayerCoinValue", "getPlayerCoinCount", "arePlayerCoinsSorted",
        "rescuePersonAtNode", "hasPerson", "personRescued", "getPersonCount", "allPeopleRescued",
        "getStack", "pushToStack", "popFromStack", "isStackEmpty", "getStackCount", "hasTreasureAtNode", "collectTreasure", "isTreasureCollected", "clearStack",
        "pushNode", "popNode", "keepItem", "hasTreasure", "treasureCollected", "stackEmpty", "stackCount",
        "moveToNode",
        code
      );

      console.log("Executing function...");

      // Add timeout to prevent infinite loops - longer timeout for loop blocks
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Execution timeout - possible infinite loop")), 30000); // 30 seconds timeout
      });

      // Add execution counter to detect infinite loops - higher limit for loop blocks
      let executionCount = 0;
      const maxExecutions = 5000; // Maximum number of function calls - increased for loops

      // Wrap functions to count executions
      const wrappedMoveToNode = async (nodeId) => {
        executionCount++;
        if (executionCount > maxExecutions) {
          throw new Error("Too many executions - possible infinite loop");
        }
        return await moveToNode(nodeId);
      };


      await Promise.race([
        execFunction(
          moveForward, turnLeft, turnRight, hit, foundMonster, canMoveForward, nearPit, atGoal,
          collectCoin, haveCoin, getCoinCount, getCoinValue, swapCoins, compareCoins, isSorted,
          getPlayerCoins, addCoinToPlayer, clearPlayerCoins, swapPlayerCoins, comparePlayerCoins,
          getPlayerCoinValue, getPlayerCoinCount, arePlayerCoinsSorted,
          rescuePersonAtNode, hasPerson, personRescued, getPersonCount, allPeopleRescued,
          getStack, pushToStack, popFromStack, isStackEmpty, getStackCount, hasTreasureAtNode, collectTreasure, isTreasureCollected, clearStack,
          pushNode, popNode, keepItem, hasTreasure, treasureCollected, stackEmpty, stackCount,
          wrappedMoveToNode
        ),
        timeoutPromise
      ]);
      console.log("Function execution completed");

      const finalState = getCurrentGameState();
      console.log("Final state after execution:", finalState);

      // ตรวจสอบเงื่อนไขการผ่านด่านตาม victoryConditions
      console.log("🔍 CHECKING VICTORY CONDITIONS FOR LEVEL 8");
      console.log("🔍 Current Level ID:", currentLevel.id);
      console.log("🔍 Victory Conditions:", currentLevel.victoryConditions);

      const victoryResult = checkVictoryConditions(currentLevel.victoryConditions, currentLevel);
      const levelCompleted = victoryResult.completed;
      const completionMessage = victoryResult.message;

      console.log("🔍 VICTORY RESULT:", victoryResult);
      console.log("🔍 LEVEL COMPLETED:", levelCompleted);
      console.log("🔍 COMPLETION MESSAGE:", completionMessage);

      if (!levelCompleted) {
        // แสดง hint สำหรับเงื่อนไขที่ยังไม่สำเร็จ
        const hintMessage = generateVictoryHint(victoryResult.failedConditions, currentLevel);
        if (hintMessage) {
          setCurrentHint(hintMessage);
        }
      }

      if (levelCompleted) {
        setIsCompleted(true);
        setGameState("completed");

        // ระบบคะแนน: ใช้ patternTypeId จาก finalState ถ้าไม่มีให้ fallback หาใน goodPatterns
        let patternTypeId = finalState.patternTypeId;
        if (!patternTypeId && goodPatterns && goodPatterns.length > 0) {
          // หา pattern ที่ match 100% (หรือใกล้เคียงที่สุด)
          const bestPattern = goodPatterns.find(p => p.pattern_type_id);
          if (bestPattern) patternTypeId = bestPattern.pattern_type_id;
        }
        if (!patternTypeId) patternTypeId = 0;
        const scoreData = calculateFinalScore(finalState.isGameOver, patternTypeId, hintOpenCount);
        setFinalScore(scoreData);

        const weaponInfo = finalState.weaponData;
        if (completionMessage) {
          setCurrentHint(`${completionMessage} (${weaponInfo?.name || ''}) - คะแนน: ${scoreData.totalScore} ⭐${scoreData.stars}`);
        }

        // แสดง Victory screen
        if (getCurrentGameState().currentScene) {
          const victoryType = currentLevel.goalType === "ช่วยคน" ? 'rescue' : 'normal';
          showVictory(getCurrentGameState().currentScene, victoryType);
        }

        // Calculate time spent and show progress modal
        if (gameStartTime.current) {
          const endTime = Date.now();
          setTimeSpent(Math.floor((endTime - gameStartTime.current) / 1000));
        }
        setGameResult('victory');
        setShowProgressModal(true);
      } else if (!finalState.isGameOver) {
        setGameState("ready");
        if (finalState.moveCount >= finalState.maxMoves) {
          setCurrentHint("⏰ หมดเวลา! ลองใช้ลูปหรือลดจำนวนคำสั่ง");
        } else {
          setCurrentHint("🤔 ยังไม่ถึงเป้าหมาย ลองเพิ่มหรือแก้ไข blocks");
        }
      }
    } catch (error) {
      setGameState("ready");

      // Even if there's a timeout, check victory conditions
      console.log("🔍 EXECUTION ERROR - Checking victory conditions anyway");
      const finalState = getCurrentGameState();
      console.log("Final state after error:", finalState);

      // ตรวจสอบเงื่อนไขการผ่านด่านแม้เมื่อเกิด error
      console.log("🔍 CHECKING VICTORY CONDITIONS AFTER ERROR");
      console.log("🔍 Current Level ID:", currentLevel.id);
      console.log("🔍 Victory Conditions:", currentLevel.victoryConditions);

      const victoryResult = checkVictoryConditions(currentLevel.victoryConditions, currentLevel);
      const levelCompleted = victoryResult.completed;
      const completionMessage = victoryResult.message;

      console.log("🔍 VICTORY RESULT AFTER ERROR:", victoryResult);
      console.log("🔍 LEVEL COMPLETED AFTER ERROR:", levelCompleted);

      if (levelCompleted) {
        setIsCompleted(true);
        setGameState("completed");

        // ระบบคะแนน: ใช้ patternTypeId จาก finalState ถ้าไม่มีให้ fallback หาใน goodPatterns
        let patternTypeId = finalState.patternTypeId;
        if (!patternTypeId && goodPatterns && goodPatterns.length > 0) {
          // หา pattern ที่ match 100% (หรือใกล้เคียงที่สุด)
          const bestPattern = goodPatterns.find(p => p.pattern_type_id);
          if (bestPattern) patternTypeId = bestPattern.pattern_type_id;
        }
        if (!patternTypeId) patternTypeId = 0;
        const scoreData = calculateFinalScore(finalState.isGameOver, patternTypeId, hintOpenCount);
        setFinalScore(scoreData);

        const weaponInfo = finalState.weaponData;
        if (completionMessage) {
          setCurrentHint(`${completionMessage} (${weaponInfo?.name || ''}) - คะแนน: ${scoreData.totalScore} ⭐${scoreData.stars}`);
        }

        // แสดง Victory screen
        if (getCurrentGameState().currentScene) {
          const victoryType = currentLevel.goalType === "ช่วยคน" ? 'rescue' : 'normal';
          showVictory(getCurrentGameState().currentScene, victoryType);
        }
      } else {
        if (error.message.includes("infinite loop") || error.message.includes("timeout")) {
          setCurrentHint("❌ เกิด infinite loop - โค้ดรันไม่หยุด กรุณาเพิ่มเงื่อนไขหยุดการทำงาน");
        } else if (error.message.includes("undefined")) {
          setCurrentHint("❌ ตัวแปรไม่ได้ถูกกำหนดค่า - กรุณาใช้ block 'ตั้งค่า' เพื่อกำหนดค่าตัวแปร");
        } else {
          setCurrentHint(`💥 ${error.message}`);
        }
      }

      console.error("Execution error:", error);
    }

    setIsRunning(false);
  };

  // Game action functions for Blockly
  async function moveForward() {
    const currentState = getCurrentGameState();
    if (currentState.goalReached || currentState.moveCount >= currentState.maxMoves || currentState.isGameOver) return true;

    // ไม่ต้องตรวจสอบ combat mode เพราะใช้ระบบใหม่แล้ว

    console.log("moveForward called - current node:", currentState.currentNodeId, "direction:", currentState.direction);

    setCurrentGameState({ moveCount: currentState.moveCount + 1 });

    const currentNode = currentLevel.nodes.find((n) => n.id === currentState.currentNodeId);
    if (!currentNode) {
      throw new Error(`ไม่พบ Node ${currentState.currentNodeId}`);
    }

    const connectedNodes = currentLevel.edges
      .filter((edge) => edge.from === currentState.currentNodeId || edge.to === currentState.currentNodeId)
      .map((edge) => (edge.from === currentState.currentNodeId ? edge.to : edge.from))
      .map((nodeId) => currentLevel.nodes.find((n) => n.id === nodeId))
      .filter((node) => node);

    let targetNode = null;
    const directions = [
      { x: 1, y: 0, symbol: "→" }, // right
      { x: 0, y: 1, symbol: "↓" }, // down
      { x: -1, y: 0, symbol: "←" }, // left
      { x: 0, y: -1, symbol: "↑" }, // up
    ];
    const dirVector = directions[currentState.direction];

    for (let node of connectedNodes) {
      const dx = node.x - currentNode.x;
      const dy = node.y - currentNode.y;

      // คำนวณมุมของเส้นทาง
      const angle = Math.atan2(dy, dx);
      // คำนวณมุมของทิศทางที่หันหน้า
      const dirAngle = Math.atan2(dirVector.y, dirVector.x);

      // หาความแตกต่างของมุม
      let angleDiff = Math.abs(angle - dirAngle);
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      // ถ้ามุมต่างกันไม่เกิน 90 องศา (π/2) ถือว่าเป็นทิศทางเดียวกัน
      if (angleDiff < Math.PI / 2) {
        targetNode = node;
        break;
      }
    }

    if (!targetNode) {
      throw new Error(
        `ไม่สามารถเดินไปทาง ${directions[currentState.direction].symbol} จาก Node ${currentState.currentNodeId} ได้`
      );
    }

    console.log("Moving from node", currentNode.id, "to node", targetNode.id);

    await new Promise((resolve) => setTimeout(resolve, 300));

    // ใช้ระบบการตรวจจับการชนแบบ real-time เหมือนใน exe.txt
    if (getCurrentGameState().currentScene) {
      const moveResult = await movePlayerWithCollisionDetection(
        getCurrentGameState().currentScene,
        currentNode,
        targetNode
      );

      if (moveResult.hitObstacle) {
        console.log("Player fell into pit! Movement stopped.");

        // สร้างเอฟเฟกต์การตกหลุม
        createPitFallEffect(getCurrentGameState().currentScene);

        // แสดง Game Over screen
        setTimeout(() => {
          showGameOver(getCurrentGameState().currentScene);
          setCurrentGameState({
            isGameOver: true
          });
          setIsGameOver(true);
          setGameState("gameOver");
          setShowProgressModal(true);

          // Calculate time spent and show progress modal for game over
          if (gameStartTime.current) {
            const endTime = Date.now();
            setTimeSpent(Math.floor((endTime - gameStartTime.current) / 1000));
          }
          setGameResult('gameover');
          setShowProgressModal(true);
        }, 1500);

        return false;
      }

      if (moveResult.success) {
        const goalReached = targetNode.id === currentLevel.goalNodeId;
        console.log('moveForward goalReached check:', goalReached, 'targetNode.id:', targetNode.id, 'goalNodeId:', currentLevel.goalNodeId);
        setCurrentGameState({
          currentNodeId: targetNode.id,
          goalReached: goalReached
        });

        setPlayerNodeId(targetNode.id);

      }
    } else {
      // Fallback สำหรับกรณีที่ไม่มี scene
      const goalReached = targetNode.id === currentLevel.goalNodeId;
      console.log('moveForward fallback goalReached check:', goalReached, 'targetNode.id:', targetNode.id, 'goalNodeId:', currentLevel.goalNodeId);
      setCurrentGameState({
        currentNodeId: targetNode.id,
        goalReached: goalReached
      });

      setPlayerNodeId(targetNode.id);

      // อัพเดท player position ใน Phaser
      if (getCurrentGameState().currentScene) {
        console.log("Updating player position in Phaser to node", targetNode.id);
        updatePlayer(getCurrentGameState().currentScene, targetNode.id, currentState.direction);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
    return false;
  }

  async function hit() {
    const currentState = getCurrentGameState();
    if (currentState.goalReached || currentState.isGameOver) return;

    console.log("Hit function called(levelGame.jsx)");

    const scene = currentState.currentScene;
    if (!scene || !scene.player) return;

    // หา monster ที่ใกล้ที่สุด
    let nearestMonster = null;
    let nearestDistance = Infinity;

    if (scene.monsters && scene.monsters.length > 0) {
      scene.monsters.forEach((monster) => {
        if (monster.data.defeated || monster.sprite?.getData('defeated') || monster.isDefeated) return;

        const distance = Phaser.Math.Distance.Between(
          scene.player.x, scene.player.y,
          monster.sprite.x, monster.sprite.y
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestMonster = monster;
        }
      });
    }

    if (!nearestMonster) {
      setCurrentHint("❌ ไม่มีศัตรูในระยะโจมตี");
      return;
    }

    console.log("Found nearest monster:", nearestMonster);

    // โจมตีศัตรูโดยตรง
    const success = hitEnemyWithDamage(scene.player, 50);
    if (success) {
      console.log("Successfully hit enemy");

      // แสดง weapon effect
      const currentState = getCurrentGameState();
      const weaponData = getWeaponData(currentState.weaponKey || 'stick');
      const weaponSprite = scene.player; // ใช้ player sprite เป็น weapon sprite

      // เรียก showEffectWeaponFixed เพื่อแสดง effect
      console.log("แอฟเฟกต์อาวุธ:", currentState.weaponKey || 'stick');
      showEffectWeaponFixed(nearestMonster, 50, currentState.weaponKey || 'stick', weaponSprite);

      // รอให้ animation เสร็จก่อนเดินต่อ (killEnemy ใช้ 800ms)
      await new Promise((resolve) => setTimeout(resolve, 900));

      // ตรวจสอบว่า monster ตายแล้วหรือไม่
      if (nearestMonster.data?.defeated || nearestMonster.sprite?.getData('defeated')) {
        console.log("Monster defeated, continuing game");
        setCurrentHint("⚔️ ศัตรูตายแล้ว! เดินต่อได้");
      }
    } else {
      console.log("Failed to hit enemy");
      setCurrentHint("❌ โจมตีไม่สำเร็จ");
    }

    console.log("Hit function completed");
  }


  async function turnLeft() {
    const currentState = getCurrentGameState();
    if (currentState.goalReached || currentState.moveCount >= currentState.maxMoves || currentState.isGameOver) return;

    // ไม่ต้องตรวจสอบ combat mode เพราะใช้ระบบใหม่แล้ว

    console.log("turnLeft called - current direction:", currentState.direction);

    await new Promise((resolve) => setTimeout(resolve, 300));
    const newDirection = (currentState.direction + 3) % 4;
    setCurrentGameState({ direction: newDirection });
    setPlayerDirection(newDirection);

    console.log("Turning left - new direction:", newDirection);

    // อัพเดท player direction ใน Phaser
    if (getCurrentGameState().currentScene) {
      console.log("Updating player arrow in Phaser");
      updatePlayerArrow(getCurrentGameState().currentScene, null, null, newDirection);
    } else {
      console.log("No current scene available for arrow update");
    }
  }

  async function turnRight() {
    const currentState = getCurrentGameState();
    if (currentState.goalReached || currentState.moveCount >= currentState.maxMoves || currentState.isGameOver) return;

    // ไม่ต้องตรวจสอบ combat mode เพราะใช้ระบบใหม่แล้ว

    console.log("turnRight called - current direction:", currentState.direction);

    await new Promise((resolve) => setTimeout(resolve, 300));
    const newDirection = (currentState.direction + 1) % 4;
    setCurrentGameState({ direction: newDirection });
    setPlayerDirection(newDirection);

    console.log("Turning right - new direction:", newDirection);

    // อัพเดท player direction ใน Phaser
    if (getCurrentGameState().currentScene) {
      console.log("Updating player arrow in Phaser");
      updatePlayerArrow(getCurrentGameState().currentScene, null, null, newDirection);
    } else {
      console.log("No current scene available for arrow update");
    }
  }

  // Condition functions
  function foundMonster() {
    // Use new combat system to check for monsters
    if (getCurrentGameState().currentScene && getCurrentGameState().currentScene.player) {
      const player = getCurrentGameState().currentScene.player;
      return haveEnemy(player);
    }
    return false;
  }

  function canMoveForward() {
    // Implementation would check if movement is possible
    return true;
  }

  function nearPit() {
    console.log("LevelGame nearPit function called");
    // Use the imported checkNearPit function from gameUtils
    const result = checkNearPit();
    console.log("LevelGame nearPit result:", result);
    return result;
  }

  function atGoal() {
    const currentState = getCurrentGameState();
    return currentState.currentNodeId === currentLevel.goalNodeId;
  }

  const handleBackToMapSelection = () => {
    navigate('/mapselection');
  };

  const handleNextLevel = () => {
    const nextLevelId = parseInt(levelId) + 1;
    navigate(`/mapselection/${nextLevelId}`);
  };

  const handleRestartGame = () => {
    console.log("Restarting game...");

    // Clear Game Over screen
    if (getCurrentGameState().currentScene) {
      clearGameOverScreen(getCurrentGameState().currentScene);
    }

    // Reset game state
    setCurrentGameState({
      currentNodeId: currentLevel.startNodeId,
      direction: 0,
      goalReached: false,
      moveCount: 0,
      isGameOver: false
    });

    // Reset player position
    setPlayerNodeId(currentLevel.startNodeId);
    setPlayerDirection(0);

    // Reset HP
    resetPlayerHp(setPlayerHp);

    // Clear collected coins
    clearPlayerCoins();

    // Reset game status
    setIsCompleted(false);
    setIsGameOver(false);
    setGameState("ready");
    setCurrentHint("🔄 เกมเริ่มใหม่แล้ว! ลองใหม่อีกครั้ง");

    // Update player position in Phaser
    if (getCurrentGameState().currentScene) {
      updatePlayer(getCurrentGameState().currentScene, currentLevel.startNodeId, 0);
    }

    updatePlayerWeaponDisplay();

    // Reset monsters if they exist using new utility functions
    if (getCurrentGameState().currentScene && getCurrentGameState().currentScene.monsters) {
      getCurrentGameState().currentScene.monsters.forEach(monster => {
        monster.data.defeated = false;
        monster.data.inBattle = false;
        monster.data.isChasing = false;
        monster.data.lastAttackTime = null;
        monster.data.hp = 3;

        // Use new utility function to reset enemy
        resetEnemy(monster.sprite, monster.sprite.x, monster.sprite.y);
        monster.glow.setVisible(true);
        monster.glow.setFillStyle(0xff0000, 0.2);
        monster.sprite.anims.play('vampire-idle', true);
      });
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">❌</div>
          <p className="text-white text-lg mb-4">{error}</p>
          <button
            onClick={handleBackToMapSelection}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            กลับไปเลือกด่าน
          </button>
        </div>
      </div>
    );
  }

  if (!currentLevel) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">กำลังโหลดด่าน...</p>
        </div>
      </div>
    );
  }


  return (
    <GameWithGuide levelData={currentLevel} levelName={currentLevel?.name || `ด่าน ${levelId}`}>
      {/* CSS for Blockly highlight */}
      <style>
        {`
          .blockly-highlight-border {
            filter: drop-shadow(0 0 8px #00ff00) !important;
          }
          .blockly-highlight-border .blocklyPath {
            stroke: #00ff00 !important;
            stroke-width: 3px !important;
          }
          .blockly-highlight-border .blocklyText {
            fill: #ffffff !important;
          }
        `}
      </style>

      <div className="flex h-screen bg-black text-white overflow-hidden">
        {/* Game Area - 65% ของหน้าจอ */}
        <div className="w-[65%] flex flex-col p-2">
          <GameArea
            gameRef={gameRef}
            levelData={currentLevel}
            playerNodeId={playerNodeId}
            playerDirection={playerDirection}
            playerHpState={playerHpState}
            isCompleted={isCompleted}
            isGameOver={isGameOver}
            currentWeaponData={currentWeaponData}
            currentHint={currentHint}
            hintData={hintData}
            hintOpen={hintOpen}
            onToggleHint={() => {
              console.log('🔔 onToggleHint called - hintOpen currently:', hintOpen, 'hintData.currentStep:', hintData?.currentStep);
              if (!hintOpen) {
                // opening
                setHintOpen(true);
                setHintOpenCount(c => c + 1);
                hintOpenAtStepRef.current = hintData?.currentStep || 0;
                console.log('🔔 Hint opened at step', hintOpenAtStepRef.current, 'new count:', hintOpenCount + 1);

                // Immediately compute hint info and attempt to highlight (in case visual guide effect timing misses)
                try {
                  const ws = workspaceRef.current;
                  const hp = getNextBlockHint(ws, goodPatterns);
                  console.log('🔔 onToggleHint - getNextBlockHint result:', hp);
                  const blocksToHighlight = hp?.hintData?.visualGuide?.highlightBlocks || hp?.hintData?.visualGuide?.highlightBlocks || hp?.patternName && (() => {
                    // fallback: try find pattern by name and use its first hint visualGuide
                    const p = goodPatterns.find(pp => pp.name === hp.patternName);
                    return p?.hints?.[hp.currentStep > 0 ? hp.currentStep - 1 : 0]?.visualGuide?.highlightBlocks;
                  })();
                  console.log('🔔 onToggleHint - blocksToHighlight:', blocksToHighlight);
                  if (Array.isArray(blocksToHighlight) && blocksToHighlight.length > 0) {
                    highlightBlocks(blocksToHighlight);
                  } else {
                    console.log('🔔 onToggleHint - no visualGuide.highlightBlocks found');
                  }
                } catch (e) {
                  console.warn('🔔 onToggleHint fallback failed:', e);
                }
              } else {
                // closing
                setHintOpen(false);
                clearHighlights();
                console.log('🔔 Hint closed');
              }
            }}
            hintOpenCount={hintOpenCount}
            playerCoins={getCurrentGameState().playerCoins || []}
            rescuedPeople={rescuedPeople}
            finalScore={finalScore}
            inCombatMode={inCombatMode}
            blocklyJavaScriptReady={blocklyJavaScriptReady}
            showScore={true}
          />
        </div>

        {/* Blockly Area - 35% ของหน้าจอ */}
        <div className="w-[35%] border-l border-black flex flex-col bg-gray-800/50 backdrop-blur-sm overflow-hidden">
          {/* Level Header - Simplified */}
          <div className="bg-stone-900 p-4  shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {currentLevel?.name || `ด่าน ${levelId}`}
                </h2>
              </div>
            </div>
          </div>

          <BlocklyArea
            blocklyRef={blocklyRef}
            blocklyLoaded={blocklyLoaded}
            runCode={runCode}
            gameState={gameState}
            isRunning={isRunning}
            isGameOver={isGameOver}
            onDebugToggle={handleDebugToggle}
            debugMode={debugMode}
            currentLevel={currentLevel}
            codeValidation={codeValidation}
            blocklyJavaScriptReady={blocklyJavaScriptReady}
            textCode={textCode}
            handleTextCodeChange={setTextCode}
          />

        </div>
      </div>

      {/* Progress Modal */}
      <ProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        gameResult={gameResult}
        levelData={currentLevel}
        attempts={attempts}
        timeSpent={timeSpent}
        blocklyXml={workspaceRef.current ? Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspaceRef.current)) : null}
        textCodeContent={currentLevel?.textcode ? textCode || '' : null}
        finalScore={finalScore}
        hp_remaining={playerHpState}
      />
    </GameWithGuide>
  );
};

export default LevelGame;