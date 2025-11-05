// src/components/AdminPanel.jsx
import React, { useState, useRef, useEffect } from 'react';
import LevelEditor from './LevelEditor';
import LevelManager from './LevelManager';

const API_URL = import.meta.env.VITE_API_URL;

const AdminPanel = ({
  loading = false,
  showAdminPanel = true,
  setShowAdminPanel = () => { },
  allBlocks = {},
  enabledBlocks = {},
  handleBlockToggle = () => { }
}) => {
  const [activeAdminTab, setActiveAdminTab] = useState('levels'); // เริ่มต้นที่ levels tab
  const [activeLevelTab, setActiveLevelTab] = useState('editor');
  const [blocksData, setBlocksData] = useState({});
  const [levelsTypesData, setLevelsTypesData] = useState([]);

  // สร้าง gameRef เพื่อใช้ Canvas เดียวกันกับหน้าเล่นเกม
  const gameRef = useRef(null);

  const categories = {
    movement: "การเคลื่อนที่",
    logic: "ตรรกะ",
    conditions: "เงื่อนไข",
    loops: "ลูป",
  };

  // Load data from API
  useEffect(() => {
    loadBlocksData();
    loadLevelsTypesData();
  }, []);

  const loadBlocksData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/blocks`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();

      if (result.success) {
        const blocksMap = {};
        result.data.forEach(block => {
          blocksMap[block.block_key] = {
            name: block.block_name,
            description: block.description,
            category: block.category
          };
        });
        setBlocksData(blocksMap);
      }
    } catch (error) {
      console.error('Error loading blocks:', error);
    }
  };

  const loadLevelsTypesData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/level-types`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();

      if (result.success) {
        setLevelsTypesData(result.data);
      }
    } catch (error) {
      console.error('Error loading level types:', error);
    }
  };

  // Function to handle level saving
  const handleSaveLevel = async (levelData) => {
    try {
      console.log('Saving level data:', levelData);

      const response = await fetch(`${API_URL}/api/levels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'  // เพิ่มบรรทัดนี้
        },
        body: JSON.stringify({
          level_name: levelData.level_name || `Custom Level - ${new Date().toLocaleDateString()}`,
          description: levelData.description || "Custom level created from editor",
          difficulty_level: 2,
          category_id: levelData.category_id || 1,
          textcode: false,
          nodes: JSON.stringify(levelData.nodes || []),
          edges: JSON.stringify(levelData.edges || []),
          start_node_id: levelData.startNodeId || null,
          goal_node_id: levelData.goalNodeId || null,
          monsters: JSON.stringify([]),
          obstacles: JSON.stringify([]),
          coin_positions: JSON.stringify([]),
          people: JSON.stringify([]),
          treasures: JSON.stringify([]),
          background_image: null
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('Level saved successfully:', result.data);
        return result.data;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error saving level:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border-t border-gray-600 p-4">
        <div className="text-center text-gray-400">⏳ กำลังโหลดข้อมูล API...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Canvas element สำหรับใช้ร่วมกัน */}
      <div ref={gameRef} style={{ display: 'none' }}></div>
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-yellow-400">⚙️ Admin Panel</h1>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors"
            >
              🏠 กลับหน้าแรก
            </button>
            <button
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
            >
              {showAdminPanel ? "ซ่อน" : "แสดง"}
            </button>
          </div>
        </div>

        {showAdminPanel && (
          <div>
            {/* Admin Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                className={`px-4 py-2 rounded text-sm font-semibold transition-all ${activeAdminTab === 'blocks'
                    ? 'bg-yellow-500 text-gray-800'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                onClick={() => setActiveAdminTab('blocks')}
              >
                🧩 จัดการ Blocks
              </button>
              <button
                className={`px-4 py-2 rounded text-sm font-semibold transition-all ${activeAdminTab === 'levels'
                    ? 'bg-yellow-500 text-gray-800'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                onClick={() => setActiveAdminTab('levels')}
              >
                🎮 จัดการ Levels
              </button>
            </div>

            {/* Blocks Management Tab */}
            {activeAdminTab === 'blocks' && (
              <div className="space-y-4">
                {Object.entries(categories).map(([categoryId, categoryName]) => {
                  const blocksInCategory = Object.entries(blocksData).filter(
                    ([blockId, block]) => block.category === categoryId
                  );

                  return (
                    <div key={categoryId} className="bg-gray-700 p-3 rounded">
                      <h4 className="font-semibold text-blue-300 mb-2">{categoryName}</h4>
                      <div className="space-y-2">
                        {blocksInCategory.map(([blockId, blockInfo]) => (
                          <div key={blockId} className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id={blockId}
                              checked={enabledBlocks[blockId] || false}
                              onChange={() => handleBlockToggle(blockId)}
                              className="w-4 h-4"
                              disabled={loading}
                            />
                            <label htmlFor={blockId} className="flex-1 text-sm">
                              <span className="font-medium">{blockInfo.name}</span>
                              <span className="text-gray-400 ml-2">- {blockInfo.description}</span>
                            </label>
                            <span
                              className={`text-xs px-2 py-1 rounded ${enabledBlocks[blockId]
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
            )}

            {/* Level Management Tab */}
            {activeAdminTab === 'levels' && (
              <div>
                {/* Level Sub-tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    className={`px-4 py-2 rounded text-sm font-semibold transition-all ${activeLevelTab === 'editor'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    onClick={() => setActiveLevelTab('editor')}
                  >
                    ✏️ สร้าง Level ใหม่
                  </button>
                  <button
                    className={`px-4 py-2 rounded text-sm font-semibold transition-all ${activeLevelTab === 'manage'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    onClick={() => setActiveLevelTab('manage')}
                  >
                    📚 จัดการ Levels
                  </button>
                </div>

                {/* Level Editor */}
                {activeLevelTab === 'editor' && (
                  <LevelEditor
                    onSaveLevel={handleSaveLevel}
                    gameRef={gameRef}
                    levelsTypesData={levelsTypesData}
                  />
                )}

                {/* Level Manager */}
                {activeLevelTab === 'manage' && (
                  <LevelManager gameRef={gameRef} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
