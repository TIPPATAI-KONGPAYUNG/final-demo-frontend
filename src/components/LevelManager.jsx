import React, { useState, useEffect } from 'react';
import LevelEditor from './LevelEditor';
import LevelDetailViewer from './LevelDetailViewer';

const API_URL = import.meta.env.VITE_API_URL;

const LevelManager = ({ gameRef = null }) => {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [viewingLevel, setViewingLevel] = useState(null);

  // Load levels on component mount
  useEffect(() => {
    loadLevels();
  }, []);

  const loadLevels = async () => {
    try {
      setLoading(true);
      setError(null);

      // โหลดข้อมูลจาก API
      const response = await fetch(`${API_URL}/api/levels`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();

      if (result.success) {
        // แปลงข้อมูลจาก API ให้ตรงกับ format ที่ component ต้องการ
        const formattedLevels = result.data.map(level => {
          // Parse JSON strings safely
          const parseJsonSafely = (jsonString) => {
            if (!jsonString) return [];
            if (typeof jsonString === 'string') {
              try {
                return JSON.parse(jsonString);
              } catch (e) {
                console.warn('Failed to parse JSON:', jsonString);
                return [];
              }
            }
            return jsonString || [];
          };

          return {
            id: level.level_id,
            name: level.level_name,
            description: level.description,
            difficulty: level.difficulty || (level.difficulty_level === 1 ? 'ง่าย' : level.difficulty_level === 2 ? 'ปานกลาง' : 'ยาก'),
            levelTypeId: level.category_id,
            textcode: level.textcode,
            nodes: parseJsonSafely(level.nodes),
            edges: parseJsonSafely(level.edges),
            startNodeId: level.start_node_id,
            goalNodeId: level.goal_node_id,
            monsters: parseJsonSafely(level.monsters),
            obstacles: parseJsonSafely(level.obstacles),
            coinPositions: parseJsonSafely(level.coin_positions),
            people: parseJsonSafely(level.people),
            treasures: parseJsonSafely(level.treasures),
            createdAt: level.created_at,
            updatedAt: level.updated_at
          };
        });

        setLevels(formattedLevels);
        console.log('Total levels loaded from API:', formattedLevels.length);
        console.log('Sample level data:', formattedLevels[0]); // Debug first level
      } else {
        throw new Error(result.message);
      }

    } catch (err) {
      setError('Failed to load levels from API');
      console.error('Error loading levels:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLevel = async (levelId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ที่จะลบ level นี้?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/levels/${levelId}`, {
        method: 'DELETE',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      const result = await response.json();

      if (result.success) {
        setLevels(prev => prev.filter(level => level.id !== levelId));
        alert('ลบ level สำเร็จ!');
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการลบ level');
      console.error('Error deleting level:', err);
    }
  };

  const handleEditLevel = async (level) => {
    try {
      // ดึงข้อมูล level พร้อมข้อมูลที่เกี่ยวข้องทั้งหมด
      const response = await fetch(`${API_URL}/api/levels/${level.id}/full-details`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();

      if (result.success) {
        setViewingLevel(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error loading full level details:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล level');
    }
  };

  const handleViewLevel = async (level) => {
    try {
      // ดึงข้อมูล level พร้อมข้อมูลที่เกี่ยวข้องทั้งหมด
      const response = await fetch(`${API_URL}/api/levels/${level.id}/full-details`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json'
        }
      });
      const result = await response.json();

      if (result.success) {
        setViewingLevel(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error loading full level details:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล level');
    }
  };

  const closeViewer = () => {
    setViewingLevel(null);
  };

  const handleDuplicateLevel = async (level) => {
    try {
      const newLevelData = {
        level_name: `${level.name} (Copy)`,
        description: level.description,
        difficulty_level: parseInt(level.difficulty) || 1,
        category_id: level.levelTypeId,
        textcode: level.textcode,
        nodes: JSON.stringify(level.nodes),
        edges: JSON.stringify(level.edges),
        start_node_id: level.startNodeId,
        goal_node_id: level.goalNodeId,
        monsters: JSON.stringify(level.monsters),
        obstacles: JSON.stringify(level.obstacles),
        coin_positions: JSON.stringify([]),
        people: JSON.stringify([]),
        treasures: JSON.stringify([]),
        background_image: null
      };

      const response = await fetch(`${API_URL}/api/levels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'  // เพิ่มบรรทัดนี้
        },
        body: JSON.stringify(newLevelData)
      });

      const result = await response.json();

      if (result.success) {
        // แปลงข้อมูลจาก API response
        const formattedNewLevel = {
          id: result.data.level_id,
          name: result.data.level_name,
          description: result.data.description,
          difficulty: result.data.difficulty_level,
          levelTypeId: result.data.category_id,
          textcode: result.data.textcode,
          nodes: typeof result.data.nodes === 'string' ? JSON.parse(result.data.nodes) : result.data.nodes || [],
          edges: typeof result.data.edges === 'string' ? JSON.parse(result.data.edges) : result.data.edges || [],
          startNodeId: result.data.start_node_id,
          goalNodeId: result.data.goal_node_id,
          monsters: typeof result.data.monsters === 'string' ? JSON.parse(result.data.monsters) : result.data.monsters || [],
          obstacles: typeof result.data.obstacles === 'string' ? JSON.parse(result.data.obstacles) : result.data.obstacles || [],
          createdAt: result.data.created_at,
          updatedAt: result.data.updated_at
        };

        setLevels(prev => [formattedNewLevel, ...prev]);
        alert('คัดลอก level สำเร็จ!');
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการคัดลอก level');
      console.error('Error duplicating level:', err);
    }
  };

  // Filter levels based on search and difficulty
  const filteredLevels = levels.filter(level => {
    const matchesSearch = level.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = selectedDifficulty === 'all' || level.difficulty === selectedDifficulty;
    return matchesSearch && matchesDifficulty;
  });

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyText = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'ง่าย';
      case 'medium': return 'ปานกลาง';
      case 'hard': return 'ยาก';
      default: return 'ไม่ระบุ';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="text-gray-600">⏳ กำลังโหลดข้อมูล levels...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            📚 จัดการ Levels
          </h2>
          <p className="text-gray-600 mt-1">จัดการและดูรายละเอียดของ levels ทั้งหมดในระบบ</p>
        </div>
        <button
          onClick={loadLevels}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-medium shadow-sm"
        >
          🔄 รีเฟรช
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
          <div className="text-red-800 font-semibold">❌ {error}</div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 ค้นหาและกรองข้อมูล</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">ค้นหา Level</label>
            <input
              type="text"
              placeholder="🔍 ค้นหา level..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-all"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">ความยาก</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-all"
            >
              <option value="all">ทุกความยาก</option>
              <option value="easy">🟢 ง่าย</option>
              <option value="medium">🟡 ปานกลาง</option>
              <option value="hard">🔴 ยาก</option>
            </select>
          </div>
        </div>
      </div>

      {/* Level Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl text-center border border-blue-300 shadow-sm">
          <div className="text-3xl font-bold text-blue-700">{levels.length}</div>
          <div className="text-sm font-medium text-blue-800 mt-1">📚 Total Levels</div>
        </div>
        <div className="bg-white p-6 rounded-xl text-center border border-green-300 shadow-sm">
          <div className="text-3xl font-bold text-green-700">
            {levels.filter(l => l.difficulty === 'easy').length}
          </div>
          <div className="text-sm font-medium text-green-800 mt-1">🟢 Easy Levels</div>
        </div>
        <div className="bg-white to-yellow-200 p-6 rounded-xl text-center border border-yellow-300 shadow-sm">
          <div className="text-3xl font-bold text-yellow-700">
            {levels.filter(l => l.difficulty === 'medium').length}
          </div>
          <div className="text-sm font-medium text-yellow-800 mt-1">🟡 Medium Levels</div>
        </div>
        <div className="bg-red-100 p-6 rounded-xl text-center border border-red-300 shadow-sm">
          <div className="text-3xl font-bold text-red-700">
            {levels.filter(l => l.difficulty === 'hard').length}
          </div>
          <div className="text-sm font-medium text-red-800 mt-1">🔴 Hard Levels</div>
        </div>
      </div>

      {/* Level List */}
      {filteredLevels.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            {searchQuery || selectedDifficulty !== 'all'
              ? 'ไม่พบ level ที่ตรงกับเงื่อนไข'
              : 'ยังไม่มี level ในระบบ'}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredLevels.map((level) => (
            <div
              key={level.id}
              className="border-2 rounded-xl p-6 transition-all border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-xl font-bold text-gray-800">
                      {level.name}
                    </h3>
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${getDifficultyColor(level.difficulty)} border-2 border-opacity-50`}>
                      {getDifficultyText(level.difficulty)}
                    </span>
                    <span className="text-sm text-gray-500 font-medium">
                      ID: {level.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">📝 คำอธิบาย:</span> {level.description || 'ไม่มีคำอธิบาย'}
                    </div>
                    <div>
                      <span className="font-medium">🏷️ หมวดหมู่:</span> {level.levelTypeId || 'ไม่ระบุ'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">📍 Nodes:</span> {level.nodes?.length || 0}
                    </div>
                    <div>
                      <span className="font-medium">🔗 Edges:</span> {level.edges?.length || 0}
                    </div>
                    <div>
                      <span className="font-medium">👹 Monsters:</span> {level.monsters?.length || 0}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">🧱 Obstacles:</span> {level.obstacles?.length || 0}
                    </div>
                    <div>
                      <span className="font-medium">🪙 Coins:</span> {level.coinPositions?.length || 0}
                    </div>
                    <div>
                      <span className="font-medium">👥 People:</span> {level.people?.length || 0}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">💎 Treasures:</span> {level.treasures?.length || 0}
                    </div>
                    <div>
                      <span className="font-medium">💻 Text Code:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${level.textcode ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {level.textcode ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">📅 สร้างเมื่อ:</span> {level.createdAt ? new Date(level.createdAt).toLocaleDateString('th-TH') : 'ไม่ระบุ'}
                    </div>
                  </div>

                </div>

                <div className="flex flex-col gap-3 ml-6">
                  <button
                    onClick={() => handleEditLevel(level)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all text-sm font-medium shadow-sm"
                  >
                    📊 ดูรายละเอียด
                  </button>

                  <button
                    onClick={() => handleViewLevel(level)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all text-sm font-medium shadow-sm"
                  >
                    👁️ Viewer
                  </button>

                  <button
                    onClick={() => handleDuplicateLevel(level)}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all text-sm font-medium shadow-sm"
                  >
                    📋 คัดลอก
                  </button>

                  <button
                    onClick={() => handleDeleteLevel(level.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all text-sm font-medium shadow-sm"
                  >
                    🗑️ ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Level Detail Viewer Modal */}
      {viewingLevel && (
        <LevelDetailViewer
          levelData={viewingLevel}
          onClose={closeViewer}
        />
      )}
    </div>
  );
};

export default LevelManager;
