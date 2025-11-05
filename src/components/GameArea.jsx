// src/components/GameArea.jsx
import React, { useState } from 'react';
import { directions } from '../utils/gameUtils';
import LevelDetailViewer from './LevelDetailViewer';

const API_URL = process.env.REACT_APP_API_URL;

const GameArea = ({
  gameRef,
  levelData,
  playerNodeId,
  playerDirection,
  playerHpState,
  isCompleted,
  isGameOver,
  currentWeaponData,
  currentHint,
  hintData,
  hintOpen,
  onToggleHint,
  hintOpenCount,
  finalScore,
  inCombatMode,
  playerCoins = [],
  rescuedPeople = [],
}) => {
  const [viewerData, setViewerData] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  const closeDetail = () => setViewerData(null);

  // Open detail: try to fetch full level details from API, otherwise use adapter fallback
  const openDetail = async () => {
    // If we already have viewer data, just show it
    if (viewerData) return;

    const adapter = () => ({
      level: levelData || {},
      enabledBlocks: levelData?.enabledBlocks || levelData?.enabled_blocks || [],
      patterns: levelData?.patterns || levelData?.goodPatterns || [],
      victoryConditions: levelData?.victoryConditions || levelData?.victory_conditions || [],
      guides: levelData?.guides || [],
      weaponImages: levelData?.weaponImages || []
    });

    // If level has an id, try fetching full details used by Admin
    const levelId = levelData?.id || levelData?.level_id || levelData?.level?.id;
    if (!levelId) {
      setViewerData(adapter());
      return;
    }

    setViewerLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/levels/${levelId}/full-details`);
      const json = await res.json();
      if (json && json.success && json.data) {
        setViewerData(json.data);
      } else if (json && json.data) {
        // sometimes API returns data without success flag
        setViewerData(json.data);
      } else {
        setViewerData(adapter());
      }
    } catch (err) {
      console.warn('Failed to fetch full level details:', err);
      setViewerData(adapter());
    } finally {
      setViewerLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto relative">
      {/* Game Header - Compact */}
      <div className="mb-2 text-center">
        <h1 className="text-xl font-bold mb-1 gradient-text">
          Code Awakens
        </h1>
      </div>

      {/* Phaser Game - Main container with relative positioning */}
      <div className="flex-1 flex justify-center items-center relative">
        <div
          ref={gameRef}
          className="phaser-canvas pulse-glow"
        />


        {/* Compact Bottom UI Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800">
          {/* Top Row - Compact Info */}
          <div className="flex items-center justify-between text-sm p-2">
            {/* Left Side - Health (Shorter) */}
            <div className="flex items-center gap-3">
              {/* Health Bar - Shorter */}
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-gray-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-300 transition-all duration-300"
                    style={{ width: `${playerHpState}%` }}
                  ></div>
                </div>
                <span className="text-gray-300 font-bold text-xs">❤️ {playerHpState}/100</span>
              </div>

              {/* Weapon Info - Compact */}
              {currentWeaponData && (
                <div className="bg-gray-800 px-2 py-1 rounded border border-gray-700">
                  <span className="text-white font-semibold text-xs">
                    {currentWeaponData.name}
                  </span>
                </div>
              )}
            </div>

            {/* Center - Game Status */}
            <div className="flex items-center gap-3">
              {isGameOver ? (
                <span className="text-white font-bold">Game Over!</span>
              ) : isCompleted ? (
                <span className="text-white font-bold">Victory</span>
              ) : inCombatMode ? (
                <span className="text-white font-bold animate-pulse">COMBAT</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-xs">
                    GOAL: {levelData?.goalType === "ถึงเป้าหมาย"
                      ? `Node ${levelData?.goalNodeId}`
                      : levelData?.goalType === "เรียงเหรียญ"
                        ? "เรียงเหรียญ"
                        : levelData?.goalType === "ช่วยคน"
                          ? "ช่วยคน"
                          : levelData?.goalType === "หาของ"
                            ? "หาของ"
                            : `Node ${levelData?.goalNodeId}`}
                  </span>
                  <div className="bg-gray-700/50 px-2 py-1 rounded text-xs">
                    {playerNodeId} {directions[playerDirection].symbol}
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Pattern Progress Bar and Weapon */}
            <div className="flex items-center gap-2">
              {/* Progress Bar Section */}
              <div className="flex items-center gap-2">
                {hintData && hintData.showPatternProgress ? (
                  <>
                    <div className="text-xs text-gray-300">
                      {hintData.matchedBlocks || 0}/{hintData.totalBlocks || 0}
                    </div>
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${(hintData.patternPercentage || 0) === 100
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : (hintData.patternPercentage || 0) >= 50
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                              : 'bg-gradient-to-r from-red-500 to-pink-500'
                          }`}
                        style={{ width: `${hintData.patternPercentage || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-300 max-w-20 truncate">
                      {hintData.patternName || "ไม่มี pattern"}
                    </span>
                    <span className="point-xs text-gray-400">
                      {hintData.patternPercentage || 0}%
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-gray-400">วาง blocks เพื่อดู progress</span>
                )}
              </div>

              {/* Best Pattern Weapon Display */}
              {(() => {
                const bestWeaponPattern = levelData?.goodPatterns?.find(pattern => pattern.pattern_type_id === 1);
                const bestPattern = hintData?.bestPattern;

                if (bestWeaponPattern) {
                  let progressPercentage = 0;
                  const isMatchingBestPattern = bestPattern?.pattern_id === bestWeaponPattern?.pattern_id ||
                    bestPattern?.name === bestWeaponPattern?.name;

                  if (isMatchingBestPattern) {
                    progressPercentage = hintData.patternPercentage || hintData.progress || 0;
                  } else if (bestPattern?.pattern_type_id === 2) {
                    progressPercentage = 66;
                  }

                  return (
                    <div className="flex items-center gap-1 bg-green-900/20 rounded-lg px-2 py-1 border border-green-600/30">
                      <div className="relative w-6 h-6 bg-gray-800 rounded overflow-hidden flex items-center justify-center">
                        <img
                          src={`/weapons/${bestWeaponPattern.weaponKey || bestWeaponPattern.weapon?.weapon_key || 'stick'}.png`}
                          alt={bestWeaponPattern.weaponKey || bestWeaponPattern.weapon?.weapon_key || 'stick'}
                          className="absolute w-5 h-5 object-contain filter brightness-50 grayscale"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div
                          className="absolute inset-0 overflow-hidden flex items-center justify-center"
                          style={{
                            clipPath: `polygon(0 ${100 - progressPercentage}%, 100% ${100 - progressPercentage}%, 100% 100%, 0% 100%)`
                          }}
                        >
                          <img
                            src={`/weapons/${bestWeaponPattern.weaponKey || bestWeaponPattern.weapon?.weapon_key || 'stick'}.png`}
                            alt={bestWeaponPattern.weaponKey || bestWeaponPattern.weapon?.weapon_key || 'stick'}
                            className="w-5 h-5 object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      </div>
                      <span className="text-green-400 text-xs">⭐</span>
                      <span className="text-xs text-gray-300">{progressPercentage}%</span>
                    </div>
                  );
                } else {
                  const bestPattern = levelData?.goodPatterns?.find(pattern => pattern.pattern_type_id === 1);
                  if (bestPattern) {
                    return (
                      <div className="flex items-center gap-1 bg-green-900/20 rounded-lg px-2 py-1 border border-green-600/30">
                        <div className="relative w-6 h-6 bg-gray-800 rounded overflow-hidden flex items-center justify-center">
                          <img
                            src={`/weapons/${bestPattern.weaponKey || bestPattern.weapon?.weapon_key || 'stick'}.png`}
                            alt={bestPattern.weaponKey || bestPattern.weapon?.weapon_key || 'stick'}
                            className="absolute w-5 h-5 object-contain filter brightness-50 grayscale"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div
                            className="absolute inset-0 overflow-hidden flex items-center justify-center"
                            style={{ clipPath: `polygon(0 100%, 100% 100%, 100% 100%, 0% 100%)` }}
                          >
                            <img
                              src={`/weapons/${bestPattern.weaponKey || bestPattern.weapon?.weapon_key || 'stick'}.png`}
                              alt={bestPattern.weaponKey || bestPattern.weapon?.weapon_key || 'stick'}
                              className="w-5 h-5 object-contain"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        </div>
                        <span className="text-green-400 text-xs">⭐</span>
                        <span className="text-xs text-gray-300">0%</span>
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </div>
          </div>


          {/* Bottom Row - Hints and Additional Info */}
          <div className="px-3 pb-2">
            {/* Current Hint */}
              <div className="bg-gray-900 p-2 rounded-lg border border-gray-800 mb-2">
              <strong className="text-gray-300 text-sm">คำใบ้:</strong>
              <span className="text-gray-300 ml-1 text-sm">{currentHint}</span>

              {/* Hint Content - Detailed Hints */}
              {hintData && hintData.showHint && hintData.hintData && hintData.hintData.content && (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {hintOpen && (
                      <div className="mt-2 space-y-1">
                        {/* คำถามหลัก */}
                        {hintData.hintData.content.question && (
                          <div className="text-xs text-gray-300 font-medium">
                            {hintData.hintData.content.question}
                          </div>
                        )}

                        {/* คำแนะนำ */}
                        {hintData.hintData.content.suggestion && (
                          <div className="text-xs text-white bg-white/5 p-1 rounded border-l-2 border-white/20">
                            {hintData.hintData.content.suggestion}
                          </div>
                        )}

                        {/* Visual Guide */}
                        {hintData.hintData.visualGuide && hintData.hintData.visualGuide.highlightBlocks && (
                          <div className="text-xs text-white/70">
                            Blocks: {hintData.hintData.visualGuide.highlightBlocks.join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="ml-2">
                    <button
                      onClick={onToggleHint}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-medium shadow-sm"
                    >
                      {hintOpen ? 'ปิดคำใบ้' : 'เปิดคำใบ้'}
                    </button>
                    <div className="text-xs text-gray-400 mt-1 text-right">
                      เปิดคำใบ้: {hintOpenCount} ครั้ง (-5 คะแนน/ครั้ง)
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Additional Info Row */}
            <div className="flex gap-2">
              {/* ดูข้อมูล ปุ่ม */}
              <div>
                <button
                  onClick={openDetail}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium shadow-sm"
                    >
                      ดูข้อมูล
                    </button>
                  </div>
                  {/* Solution */}
                  {levelData?.solution && (
                    <div className="flex-1 p-2 bg-gray-900 rounded border border-gray-800">
                      <strong className="text-gray-300 text-xs">วิธีผ่านด่าน:</strong>
                      <div className="text-gray-400 text-xs mt-1">{levelData.solution}</div>
                    </div>
                  )}              {/* Coin Display - Compact */}
              {playerCoins.length > 0 && (
                <div className="flex-1 p-2 bg-gray-900 rounded border border-gray-800">
                  <div className="text-gray-300 font-bold text-xs mb-1">
                    🪙 เหรียญ ({playerCoins.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {playerCoins.slice(0, 5).map((coin, index) => (
                      <div
                        key={`coin-${coin.id}-${index}`}
                        className="bg-gray-800 px-1 py-0.5 rounded text-xs text-gray-300 border border-gray-700"
                        title={`เหรียญที่ตำแหน่ง ${index + 1}: ${coin.value} points`}
                      >
                        {coin.value}
                      </div>
                    ))}
                    {playerCoins.length > 5 && <span className="text-xs text-white/60">+{playerCoins.length - 5}</span>}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    รวม: {playerCoins.reduce((sum, coin) => sum + coin.value, 0)} points
                  </div>
                </div>
              )}

              {/* People Rescue Display - Compact */}
              {levelData?.goalType === "ช่วยคน" && (
                <div className="flex-1 p-2 bg-gray-900 rounded border border-gray-800">
                  <div className="text-gray-300 font-bold text-xs mb-1">
                    🆘 คน ({rescuedPeople.length}/{levelData?.people?.length || 0})
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    {levelData.people?.slice(0, 3).map((person, index) => {
                      const isRescued = rescuedPeople.some(rescued => rescued.nodeId === person.nodeId);
                      return (
                        <div
                          key={`person-${person.id}`}
                          className={`px-1 py-0.5 rounded border text-center ${isRescued
                            ? 'bg-gray-800 text-gray-300 border-gray-700'
                            : 'bg-gray-950 text-gray-500 border-gray-800'
                            }`}
                          title={`${person.personName} ที่ Node ${person.nodeId}`}
                        >
                          {isRescued ? '✅' : '❌'}
                        </div>
                      );
                    })}
                    {levelData.people && levelData.people.length > 3 && (
                      <div className="text-xs text-white/60 text-center">
                        +{levelData.people.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Final Score Display */}
            {(finalScore && (isGameOver || isCompleted)) && (
              <div className="mt-2 p-2 bg-gray-900 rounded border border-gray-800">
                <div className="text-gray-300 font-bold text-sm">
                  🏆 คะแนน: {finalScore.totalScore} ⭐{finalScore.stars}
                </div>
                {(finalScore.hpScore !== undefined || finalScore.patternBonus !== undefined) && (
                  <div className="text-xs text-gray-500">
                    HP: {finalScore.hpScore ?? '-'} + Pattern: {finalScore.patternBonus ?? '-'}
                  </div>
                )}
                {finalScore.message && (
                  <div className="text-xs text-gray-400">
                    {finalScore.message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Level Detail Viewer Modal */}
      {viewerData && (
        <LevelDetailViewer
          levelData={viewerData}
          onClose={closeDetail}
        />
      )}
    </div>
  );
};

export default GameArea;
