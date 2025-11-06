import React from 'react';

const ProgressModal = ({ isOpen, onClose, gameResult, levelData, attempts, timeSpent, blocklyXml, textCodeContent, finalScore , hp_remaining}) => {
  // ตัวอย่างข้อมูลที่จะเก็บใน JSON
  const userProgressExample = {
    user_id: 1,
    level_id: levelData?.id,
    status: gameResult === 'victory' ? 'completed' : 'in_progress',
    attempts_count: attempts,
    blockly_code: blocklyXml, // XML จาก workspace
    text_code: levelData?.textcode ? textCodeContent : null, // โค้ดจาก Monaco Editor ถ้าเป็นโหมด textcode
    execution_time: timeSpent,
    // `best_score` should represent the total score the player earned (includes pattern bonus)
    best_score: finalScore?.totalScore ?? (gameResult === 'victory' ? 60 : 0),
    pattern_bonus_score: finalScore?.pattern_bonus_score || 0, // จะคำนวณจากการตรวจสอบ pattern
    is_correct: gameResult === 'victory',
    stars_earned: finalScore?.stars ?? (gameResult === 'victory' ? 3 : 0),
    first_attempt: null, // จะถูกเซ็ตเมื่อบันทึกครั้งแรก
    last_attempt: new Date().toISOString(),
    completed_at: gameResult === 'victory' ? new Date().toISOString() : null,
    hp_remaining:  hp_remaining ?? 0
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      {/* Subtle backdrop with blur to match GuidePopup and LevelDetailViewer */}
      <div className="absolute inset-0 bg-black-900/5 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />

      <div className="relative bg-black p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto transform transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {gameResult === 'victory' ? 'Victory Progress' : 'Game Over'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Level Info & Status */}
          <div className="bg-white p-4 rounded">
            <h3 className="font-bold text-gray-800 mb-2">Level Progress</h3>
            <div className="text-gray-600">
              <p>Level ID: {userProgressExample.level_id}</p>
              <p>Status: {userProgressExample.status}</p>
              <p>Correct Solution: {userProgressExample.is_correct ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {/* Score Details */}
          <div className="bg-white p-4 rounded">
            <h3 className="font-bold text-gray-800 mb-2">Score Details</h3>
            <div className="text-gray-600">
              <p>Stars: {'⭐'.repeat(userProgressExample.stars_earned)}</p>
              <p>Score: {userProgressExample.best_score}</p>
              <p>Pattern Bonus: {userProgressExample.pattern_bonus_score}</p>
              <p>Total Score: {finalScore?.totalScore ?? (userProgressExample.best_score + userProgressExample.pattern_bonus_score)}</p>
            </div>
          </div>

          {/* Attempt Details */}
          <div className="bg-white p-4 rounded">
            <h3 className="font-bold text-gray-800 mb-2">Attempt Information</h3>
            <div className="text-gray-600">
              <p>Attempts: {userProgressExample.attempts_count}</p>
              <p>Execution Time: {userProgressExample.execution_time}s</p>
              <p>Last Attempt: {new Date(userProgressExample.last_attempt).toLocaleString()}</p>
              {userProgressExample.completed_at && (
                <p>Completed: {new Date(userProgressExample.completed_at).toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Code Details */}
          <div className="bg-white p-4 rounded">
            <h3 className="font-bold text-gray-800 mb-2">Code Information</h3>
            <div className="text-gray-600">
              <p>Text Mode: {levelData?.textcode ? 'Yes' : 'No'}</p>
              <p>HP Remaining: {userProgressExample.hp_remaining}</p>
              
              {/* Blockly XML Preview */}
              <div className="mt-2">
                <p className="font-bold">Blockly XML:</p>
                <div className="bg-gray-950 text-gray-100 p-2 rounded mt-1 text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                  {userProgressExample.blockly_code ? (
                    userProgressExample.blockly_code.length > 100 
                      ? userProgressExample.blockly_code.substring(0, 1000)
                      : userProgressExample.blockly_code
                  ) : 'No Blockly code available'}
                </div>
              </div>
              
              {/* Text Code Preview (if available) */}
              {levelData?.textcode && userProgressExample.text_code && (
                <div className="mt-2">
                  <p className="font-bold">Text Code:</p>
                  <div className="bg-gray-950 text-gray-100 p-2 rounded mt-1 text-xs font-mono overflow-x-auto max-h-32 overflow-y-auto">
                    {userProgressExample.text_code.length > 100 
                      ? userProgressExample.text_code.substring(0, 1000)
                      : userProgressExample.text_code}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Raw JSON Preview */}
          <div className="bg-gray-900 p-4 rounded">
            <h3 className="font-bold text-gray-400 mb-2">JSON Structure Preview</h3>
            <pre className="text-xs text-gray-300 overflow-x-auto">
              {JSON.stringify(userProgressExample, null, 2)}
            </pre>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProgressModal;