// src/pages/AdminPage.jsx
import React, { useState, useEffect } from 'react';
// AdminPage.jsx - Using real API instead of mock data

const AdminPage = () => {
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [levels, setLevels] = useState([]);
  const [allBlocks, setAllBlocks] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentLevelData, setCurrentLevelData] = useState(null);
  const [enabledBlocks, setEnabledBlocks] = useState({});
  const [goodPatterns, setGoodPatterns] = useState([]);
  const [newPattern, setNewPattern] = useState({ name: "", keywords: [], weaponKey: "" });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedLevel) {
      loadLevelData(selectedLevel);
    }
  }, [selectedLevel]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load levels from API
      const levelsResponse = await fetch('http://localhost:4000/api/levels');
      if (levelsResponse.ok) {
        const levelsData = await levelsResponse.json();
        if (levelsData.success) {
          setLevels(levelsData.data);
        }
      }
      
      // Load blocks from API
      const blocksResponse = await fetch('http://localhost:4000/api/blocks');
      if (blocksResponse.ok) {
        const blocksData = await blocksResponse.json();
        if (blocksData.success) {
          setAllBlocks(blocksData.data);
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadLevelData = async (levelId) => {
    try {
      const response = await fetch(`http://localhost:4000/api/levels/${levelId}`);
      if (response.ok) {
        const levelData = await response.json();
        if (levelData.success) {
          setCurrentLevelData(levelData.data);
          
          // Set enabled blocks
          const enabledBlocksObj = {};
          levelData.data.enabled_blocks.forEach(block => {
            enabledBlocksObj[block.block_id] = block.is_enabled;
          });
          setEnabledBlocks(enabledBlocksObj);
          
          // Set good patterns
          setGoodPatterns(levelData.data.level_patterns || []);
        }
      }
    } catch (err) {
      console.error("Error loading level data:", err);
    }
  };

  const handleBlockToggle = async (blockId) => {
    try {
      const newEnabledState = !enabledBlocks[blockId];
      
      // Update block state via API
      const response = await fetch(`http://localhost:4000/api/levels/${selectedLevel}/blocks/${blockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_enabled: newEnabledState }),
      });
      
      if (response.ok) {
        setEnabledBlocks(prev => ({
          ...prev,
          [blockId]: newEnabledState,
        }));
      }
    } catch (err) {
      console.error("Error updating block:", err);
    }
  };

  const handleAddPattern = async () => {
    if (!newPattern.name || !newPattern.keywords || newPattern.keywords.length === 0 || !newPattern.weaponKey) {
      alert("กรุณากรอกข้อมูล Pattern ให้ครบ");
      return;
    }

    const updatedPatterns = [...goodPatterns, { ...newPattern }];
    
    try {
      const response = await fetch(`http://localhost:4000/api/levels/${selectedLevel}/patterns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPattern),
      });
      
      if (response.ok) {
        setGoodPatterns(updatedPatterns);
        setNewPattern({ name: "", keywords: [], weaponKey: "" });
      }
    } catch (err) {
      console.error("Error adding pattern:", err);
    }
  };

  const handleDeletePattern = async (index) => {
    const updatedPatterns = goodPatterns.filter((_, i) => i !== index);
    
    try {
      const response = await fetch(`http://localhost:4000/api/levels/${selectedLevel}/patterns/${index}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setGoodPatterns(updatedPatterns);
      }
    } catch (err) {
      console.error("Error deleting pattern:", err);
    }
  };

  const addKeywordToPattern = (keyword) => {
    setNewPattern(prev => ({
      ...prev,
      keywords: [...(prev.keywords || []), keyword]
    }));
  };

  const removeKeywordFromPattern = (index) => {
    setNewPattern(prev => ({
      ...prev,
      keywords: (prev.keywords || []).filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-center">⏳ กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">⚙️ Admin Dashboard</h1>
          <p className="text-gray-400">จัดการด่านและข้อมูลเกม</p>
        </div>

        {/* Level Selection */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🎯 เลือกด่าน</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {levels.map((level) => (
              <div
                key={level.id}
                onClick={() => setSelectedLevel(level.id)}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedLevel === level.id
                    ? "bg-blue-600 border-2 border-blue-400"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <h3 className="font-semibold">{level.name}</h3>
                <p className="text-sm text-gray-300">{level.description}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-gray-600 rounded text-xs">
                  {level.difficulty}
                </span>
              </div>
            ))}
          </div>
        </div>

        {currentLevelData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Level Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">📊 ข้อมูลด่าน</h2>
              <div className="space-y-3">
                <div>
                  <strong>ชื่อ:</strong> {currentLevelData.name}
                </div>
                <div>
                  <strong>คำอธิบาย:</strong> {currentLevelData.description}
                </div>
                <div>
                  <strong>ความยาก:</strong> {currentLevelData.difficulty}
                </div>
                <div>
                  <strong>จุดเริ่มต้น:</strong> Node {currentLevelData.startNodeId}
                </div>
                <div>
                  <strong>เป้าหมาย:</strong> Node {currentLevelData.goalNodeId}
                </div>
                <div>
                  <strong>จำนวน Node:</strong> {currentLevelData.nodes.length}
                </div>
                <div>
                  <strong>จำนวน Monster:</strong> {currentLevelData.monsters?.length || 0}
                </div>
                <div>
                  <strong>จำนวน Obstacles:</strong> {currentLevelData.obstacles?.length || 0}
                </div>
              </div>
            </div>

            {/* Blocks Management */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">🧩 จัดการ Blocks</h2>
              <div className="space-y-4">
                {Object.entries({
                  movement: "การเคลื่อนที่",
                  logic: "ตรรกะ",
                  conditions: "เงื่อนไข",
                  loops: "ลูป",
                }).map(([categoryId, categoryName]) => {
                  const blocksInCategory = Object.entries(allBlocks).filter(
                    ([blockId, block]) => block.category === categoryId
                  );

                  return (
                    <div key={categoryId} className="border border-gray-600 rounded p-3">
                      <h3 className="font-semibold text-blue-300 mb-2">{categoryName}</h3>
                      <div className="space-y-2">
                        {blocksInCategory.map(([blockId, blockInfo]) => (
                          <div key={blockId} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id={blockId}
                              checked={enabledBlocks[blockId] || false}
                              onChange={() => handleBlockToggle(blockId)}
                              className="w-4 h-4"
                            />
                            <label htmlFor={blockId} className="flex-1 text-sm">
                              <span className="font-medium">{blockInfo.name}</span>
                              <span className="text-gray-400 ml-2">- {blockInfo.description}</span>
                            </label>
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                enabledBlocks[blockId]
                                  ? "bg-green-600 text-white"
                                  : "bg-gray-600 text-gray-300"
                              }`}
                            >
                              {enabledBlocks[blockId] ? "เปิด" : "ปิด"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Pattern Management */}
        {currentLevelData && (
          <div className="bg-gray-800 rounded-lg p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">🎯 จัดการ Patterns</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Current Patterns */}
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">Patterns ปัจจุบัน</h3>
                {goodPatterns.length === 0 ? (
                  <div className="text-gray-400">ยังไม่มี Patterns</div>
                ) : (
                  <div className="space-y-3">
                    {goodPatterns.map((pattern, index) => (
                      <div key={index} className="p-3 bg-green-900 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{pattern.name}</span>
                          <button
                            onClick={() => handleDeletePattern(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            ❌ ลบ
                          </button>
                        </div>
                        <div className="text-sm text-gray-300">
                          <div><strong>อาวุธ:</strong> {pattern.weaponKey}</div>
                          <div><strong>Keywords:</strong> {pattern.keywords ? pattern.keywords.join(" → ") : "ไม่มี"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Pattern */}
              <div>
                <h3 className="text-lg font-semibold text-blue-400 mb-3">เพิ่ม Pattern ใหม่</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-gray-300 mb-1">ชื่อ Pattern:</label>
                    <input
                      type="text"
                      value={newPattern.name}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                      placeholder="เช่น: เส้นทางตรง"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-1">อาวุธ:</label>
                    <select
                      value={newPattern.weaponKey}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, weaponKey: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded"
                    >
                      <option value="">เลือกอาวุธ</option>
                      <option value="stick">Stick</option>
                      <option value="knife">Knife</option>
                      <option value="sword">Sword</option>
                      <option value="shield">Shield</option>
                      <option value="magic_sword">Magic Sword</option>
                      <option value="golden_sword">Golden Sword</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 mb-1">Keywords:</label>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(newPattern.keywords || []).map((keyword, index) => (
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
                    className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-medium"
                  >
                    เพิ่ม Pattern
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded font-semibold"
          >
            ← กลับไปหน้าเกม
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
