// src/components/PatternManager.jsx
import React from 'react';
import { getWeaponData } from '../utils/gameUtils';
// PatternManager.jsx - No longer using mock data

const PatternManager = ({
  currentWeaponData,
  patternFeedback,
  goodPatterns,
  allBlocks,
  newPattern,
  setNewPattern,
  handleAddPattern,
  handleDeletePattern,
  addKeywordToPattern,
  removeKeywordFromPattern
}) => {
  return (
    <div className="bg-gray-800 border-t border-gray-600 p-4">
      <h3 className="text-md font-semibold text-yellow-400 mb-3">🎯 Pattern Management</h3>
      
      {/* Current weapon status */}
      <div className="mb-3 p-2 bg-blue-900 rounded text-sm">
        <strong>สถานะปัจจุบัน:</strong> {currentWeaponData?.name} (Power: {currentWeaponData?.power})
      </div>
      
      <div className="mb-3 p-2 bg-gray-700 rounded text-sm">
        {patternFeedback}
      </div>

      {/* Good patterns list */}
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-green-400 mb-2">Good Patterns (ตรงแล้วได้อาวุธดี)</h4>
        {goodPatterns.length === 0 ? (
          <div className="text-gray-400 text-xs">ยังไม่มี Good Patterns</div>
        ) : (
          <div className="space-y-2">
            {goodPatterns.map((pattern, index) => (
              <div key={index} className="p-2 bg-green-900 rounded text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{pattern.name}</span>
                  <div className="flex items-center space-x-2">
                    <span>{getWeaponData(pattern.weaponKey).name}</span>
                    <button
                      onClick={() => handleDeletePattern(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ❌
                    </button>
                  </div>
                </div>
                <div className="text-gray-300 mt-1">
                  Keywords: {pattern.keywords.join(" → ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new pattern */}
      <div className="border-t border-gray-600 pt-3">
        <h4 className="text-sm font-semibold text-blue-400 mb-2">เพิ่ม Pattern ใหม่</h4>
        
        <div className="space-y-2 text-xs">
          <div>
            <label className="block text-gray-300 mb-1">ชื่อ Pattern:</label>
            <input
              type="text"
              value={newPattern.name}
              onChange={(e) => setNewPattern(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded"
              placeholder="เช่น: เส้นทางตรง"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-1">อาวุธ:</label>
            <select
              value={newPattern.weaponKey}
              onChange={(e) => setNewPattern(prev => ({ ...prev, weaponKey: e.target.value }))}
              className="w-full px-2 py-1 bg-gray-700 text-white rounded"
            >
              <option value="">เลือกอาวุธ</option>
              {[
                { key: "stick", name: "Stick" },
                { key: "knife", name: "Knife" },
                { key: "sword", name: "Sword" },
                { key: "shield", name: "Shield" },
                { key: "magic_sword", name: "Magic Sword" },
                { key: "golden_sword", name: "Golden Sword" }
              ].map((weapon) => (
                <option key={weapon.key} value={weapon.key}>
                  {weapon.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-gray-300 mb-1">Keywords:</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {newPattern.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="bg-blue-600 px-2 py-1 rounded cursor-pointer"
                  onClick={() => removeKeywordFromPattern(index)}
                >
                  {keyword} ❌
                </span>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-1">
              {Object.keys(allBlocks).map(blockId => (
                <button
                  key={blockId}
                  onClick={() => addKeywordToPattern(blockId)}
                  className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded text-xs"
                >
                  + {blockId}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleAddPattern}
            className="w-full bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-white font-medium"
          >
            เพิ่ม Pattern
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatternManager;
