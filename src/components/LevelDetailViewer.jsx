import React, { useState } from 'react';

const LevelDetailViewer = ({ levelData, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!levelData) return null;

  const { level, enabledBlocks, patterns, victoryConditions, guides, weaponImages } = levelData;

  console.log('ข้อมูล: ',levelData)

  const tabs = [
    { id: 'overview', label: 'ภาพรวม' },
    { id: 'blocks', label: 'Blocks' },
    { id: 'patterns', label: 'Patterns' },
    { id: 'victory', label: 'เงื่อนไขชนะ' },
    { id: 'guides', label: 'คำแนะนำ' },
    { id: 'weapons', label: 'อาวุธ' },
    { id: 'json', label: 'JSON' }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Level Information */}
      <div className="bg-white p-6 rounded-xl border border-gray-700 shadow-sm">
        <h3 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
          ข้อมูล Level
        </h3>
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
            <span className="font-semibold text-black">ชื่อ:</span>
            <p className="text-gray-900 font-medium mt-1">{level.level_name || 'ไม่ระบุ'}</p>
          </div>
          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
            <span className="font-semibold text-black">หมวดหมู่:</span>
            <p className="text-gray-900 font-medium mt-1">{level.category_name || 'ไม่ระบุ'}</p>
          </div>
          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
            <span className="font-semibold text-black">ความยาก:</span>
            <p className="text-gray-900 font-medium mt-1">
              {level.difficulty || 'ไม่ระบุ'} (Level {level.difficulty_level || 'ไม่ระบุ'})
            </p>
          </div>
          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
            <span className="font-semibold text-black">Text Code:</span>
            <p className="text-gray-900 font-medium mt-1">
              <span className={`px-2 py-1 rounded text-xs ${level.textcode ? 'bg-gray-600 text-gray-200' : 'bg-gray-800 text-gray-400'
                }`}>
                {level.textcode ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </span>
            </p>
          </div>
          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
            <span className="font-semibold text-black">Nodes:</span>
            <p className="text-gray-900 font-medium mt-1">
              {typeof level.nodes === 'string' ? JSON.parse(level.nodes).length : level.nodes?.length || 0} จุด
            </p>
          </div>
          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
            <span className="font-semibold text-black">Edges:</span>
            <p className="text-gray-900 font-medium mt-1">
              {typeof level.edges === 'string' ? JSON.parse(level.edges).length : level.edges?.length || 0} เส้นทาง
            </p>
          </div>
          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
            <span className="font-semibold text-black">Start Node:</span>
            <p className="text-gray-900 font-medium mt-1">
              {level.start_node_id !== null && level.start_node_id !== undefined
                ? level.start_node_id
                : 'ไม่ระบุ'}
            </p>
          </div>
          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
            <span className="font-semibold text-black">Goal Node:</span>
            <p className="text-gray-900 font-medium mt-1">{level.goal_node_id || 'ไม่ระบุ'}</p>
          </div>
        </div>
        <div className="mt-6 bg-gray-100 p-3 rounded-lg border border-gray-200">
          <span className="font-semibold text-black">คำอธิบาย:</span>
          <p className="text-gray-900 font-medium mt-1">
            {level.description || 'ไม่มีคำอธิบาย'}
          </p>
        </div>
      </div>

      {/* Level Structure */}
      <div className="bg-white p-6 rounded-xl border border-gray-700 shadow-sm">
        <h3 className="text-xl font-bold text-black mb-4 flex items-center gap-2">
          โครงสร้าง Level
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-black mb-2 flex items-center gap-2">
              Monsters:
            </h4>
            <div className="text-lg font-bold text-gray-900">
              {typeof level.monsters === 'string' ? JSON.parse(level.monsters).length : level.monsters?.length || 0} ตัว
            </div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-black mb-2 flex items-center gap-2">
              Obstacles:
            </h4>
            <div className="text-lg font-bold text-gray-900">
              {typeof level.obstacles === 'string' ? JSON.parse(level.obstacles).length : level.obstacles?.length || 0} ตัว
            </div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-black mb-2 flex items-center gap-2">
              Coins:
            </h4>
            <div className="text-lg font-bold text-gray-900">
              {typeof level.coin_positions === 'string' ? JSON.parse(level.coin_positions).length : level.coin_positions?.length || 0} เหรียญ
            </div>
          </div>
          <div className="bg-gray-100 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-black mb-2 flex items-center gap-2">
              People:
            </h4>
            <div className="text-lg font-bold text-gray-900">
              {typeof level.people === 'string' ? JSON.parse(level.people).length : level.people?.length || 0} คน
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBlocks = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        Enabled Blocks
      </h3>
      {enabledBlocks.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl">
          <div className="text-lg">ไม่มี blocks ที่เปิดใช้งาน</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {enabledBlocks.map((block, idx) => (
            <div key={block.block_id ?? block.block_key ?? `enabled-block-${idx}`} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg">{block.block_name}</h4>
                  <p className="text-gray-700 mt-2">{block.description}</p>
                  <div className="flex gap-6 mt-3 text-sm">
                    <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full font-medium">
                      Key: {block.block_key}
                    </span>
                    <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full font-medium">
                      Category: {block.category}
                    </span>
                    <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full font-medium">
                      Type: {block.blockly_type}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <span className={`px-3 py-2 rounded-lg text-sm font-bold ${block.is_available ? 'bg-gray-200 text-gray-800 border border-gray-200' : 'bg-gray-200 text-gray-800 border border-gray-200'
                    }`}>
                    {block.is_available ? 'ใช้งานได้' : 'ปิดใช้งาน'}
                  </span>
                </div>
              </div>
              {block.syntax_example && (
                <div className="mt-4 p-3 bg-gray-900 text-gray-100 rounded-lg font-mono text-sm border border-gray-300">
                  <div className="text-gray-400 text-xs mb-1">Syntax Example:</div>
                  {block.syntax_example}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderPatterns = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        Patterns
      </h3>
      {patterns.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
          <div className="text-lg">ไม่มี patterns</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {patterns.map((pattern, idx) => (
            <div key={pattern.pattern_id ?? pattern.pattern_name ?? `pattern-${idx}`} className="bg-white p-5 rounded-xl border border-purple-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-xl">{pattern.pattern_name}</h4>
                  <p className="text-gray-700 mt-2">{pattern.description}</p>
                </div>
                <div className="text-right ml-4">
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold ${pattern.pattern_type_id === 1 ? 'bg-gray-200 text-gray-800 border-2 border-gray-300' :
                    pattern.pattern_type_id === 2 ? 'bg-gray-200 text-gray-800 border-2 border-gray-300' :
                      'bg-gray-200 text-gray-800 border-2 border-gray-300'
                    }`}>
                    {pattern.pattern_type?.type_name || 'Unknown Type'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <span className="font-semibold text-gray-700">Pattern Type:</span>
                  <p className="text-gray-700 mt-1">{pattern.pattern_type?.description || 'Unknown description'}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-100">
                  <span className="font-semibold text-gray-700">Quality:</span>
                  <p className="text-gray-700 mt-1 font-medium">{pattern.pattern_type?.quality_level || 'N/A'}</p>
                </div>
                {pattern.weapon_name && (
                  <>
                    <div className="bg-white p-3 rounded-lg border border-gray-100">
                      <span className="font-semibold text-gray-700">Weapon:</span>
                      <p className="text-gray-700 mt-1 font-medium">{pattern.weapon_name}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-100">
                      <span className="font-semibold text-gray-700">Power:</span>
                      <p className="text-gray-700 mt-1 font-medium">{pattern.combat_power}</p>
                    </div>
                  </>
                )}
              </div>

              {pattern.xmlpattern && (
                <div className="mt-4 p-4 bg-gray-900 text-gray-200 rounded-lg font-mono text-sm border border-gray-300">
                  <div className="text-gray-400 text-xs mb-2 font-bold">XML Pattern:</div>
                  <pre className="whitespace-pre-wrap">{pattern.xmlpattern}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderVictoryConditions = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        Victory Conditions
      </h3>
      {victoryConditions.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
          <div className="text-lg">ไม่มีเงื่อนไขชนะ</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {victoryConditions.map((condition, idx) => (
            <div key={condition.victory_condition_id ?? `victory-${idx}`} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-xl">{condition.type}</h4>
                  <p className="text-gray-700 mt-2">{condition.description}</p>
                  <div className="mt-4 p-3 bg-gray-900 text-gray-100 rounded-lg font-mono text-sm border border-gray-300">
                    <div className="text-gray-400 text-xs mb-1 font-bold">Check Condition:</div>
                    <div className="text-gray-100 font-medium">{condition.check}</div>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold ${condition.is_available ? 'bg-gray-200 text-gray-800 border-2 border-gray-300' : 'bg-gray-200 text-gray-800 border-2 border-gray-300'
                    }`}>
                    {condition.is_available ? 'ใช้งานได้' : 'ปิดใช้งาน'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderGuides = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        Guides
      </h3>
      {guides.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
          <div className="text-lg">ไม่มีคำแนะนำ</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {guides.map((guide, idx) => (
            <div key={guide.guide_id ?? guide.title ?? `guide-${idx}`} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-xl">{guide.title}</h4>
                  <p className="text-gray-700 mt-2">{guide.description}</p>
                  <div className="flex gap-6 mt-3 text-sm">
                    <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full font-medium">
                      Order: {guide.display_order}
                    </span>
                    <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full font-medium">
                      Created: {new Date(guide.created_at).toLocaleDateString('th-TH')}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <span className={`px-4 py-2 rounded-lg text-sm font-bold ${guide.is_active ? 'bg-gray-200 text-gray-800 border-2 border-gray-300' : 'bg-gray-200 text-gray-800 border-2 border-gray-300'
                    }`}>
                    {guide.is_active ? 'ใช้งานได้' : 'ปิดใช้งาน'}
                  </span>
                </div>
              </div>
              {guide.guide_image && (
                <div className="mt-4">
                  <img
                    src={guide.guide_image}
                    alt={guide.title}
                    className="max-w-full h-40 object-cover rounded-lg border border-gray-300 shadow-sm"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderWeapons = () => {
    // รวม weapons จาก patterns และ weapon images
    const weapons = patterns
      .filter(p => p.weapon && p.weapon.weapon_id) // 🔥 เช็ค p.weapon แทน
      .map(p => ({
        weapon_id: p.weapon.weapon_id,              // 🔥 เข้าถึงผ่าน p.weapon
        weapon_key: p.weapon.weapon_key,
        weapon_name: p.weapon.weapon_name,
        description: p.weapon.description,          // 🔥 ไม่ใช่ weapon_description
        combat_power: p.weapon.combat_power,
        emoji: p.weapon.emoji,
        weapon_type: p.weapon.weapon_type,
        images: weaponImages.filter(wi => wi.weapon_id === p.weapon.weapon_id)
      }));

    // ลบ duplicates
    const uniqueWeapons = weapons.filter((weapon, index, self) =>
      index === self.findIndex(w => w.weapon_id === weapon.weapon_id)
    );

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          Weapons ({uniqueWeapons.length}) {/* 🔥 เพิ่มจำนวนเพื่อ debug */}
        </h3>
        {uniqueWeapons.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
            <div className="text-lg">ไม่มีอาวุธ</div>
            {/* 🔥 เพิ่ม debug info */}
            <div className="text-sm mt-2">
              Patterns: {patterns.length},
              With weapon: {patterns.filter(p => p.weapon).length}
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {uniqueWeapons.map((weapon) => (
              <div key={weapon.weapon_id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-xl flex items-center gap-2">
                      {weapon.emoji && <span className="text-2xl">{weapon.emoji}</span>}
                      {weapon.weapon_name}
                    </h4>
                    <p className="text-gray-700 mt-2">{weapon.description}</p>
                    <div className="flex gap-6 mt-3 text-sm">
                      <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full font-medium">
                        Key: {weapon.weapon_key}
                      </span>
                      <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full font-medium">
                        Type: {weapon.weapon_type}
                      </span>
                      <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full font-medium">
                        Power: {weapon.combat_power}
                      </span>
                    </div>
                  </div>
                </div>

                {weapon.images.length > 0 && (
                  <div className="mt-4">
                    <h5 className="font-bold text-gray-800 mb-3">
                      Weapon Images ({weapon.images.length}):
                    </h5>
                    <div className="grid grid-cols-4 gap-3">
                      {weapon.images.map((image, imgIdx) => (
                        <div key={image.file_id ?? `${weapon.weapon_id}-img-${imgIdx}`} className="text-center">
                          <img
                            src={image.path_file}
                            alt={`${weapon.weapon_name} - Frame ${image.frame}`}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-gray-300 shadow-sm"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="text-xs text-gray-600 mt-1 font-medium">
                            Frame {image.frame}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderJson = () => (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        JSON Data
      </h3>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">ข้อมูลทั้งหมดของด่าน:</h4>
          <p className="text-gray-600 text-sm">
            ข้อมูล JSON ทั้งหมดของด่านนี้ รวมถึง level, blocks, patterns, victory conditions, guides และ weapon images
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
          <pre className="text-gray-100 text-sm font-mono whitespace-pre-wrap">
            {JSON.stringify(levelData, null, 2)}
          </pre>
        </div>

        <div className="mt-4 flex gap-4">
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(levelData, null, 2));
              alert('คัดลอก JSON ไปยัง clipboard แล้ว!');
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all font-medium"
          >
            คัดลอก JSON
          </button>

          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(levelData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `level-${level.level_id}-${level.level_name || 'data'}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all font-medium"
          >
            ดาวน์โหลด JSON
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h5 className="font-semibold text-gray-800 mb-2">สถิติข้อมูล:</h5>
            <div className="space-y-1 text-sm text-gray-600">
              <div>Level ID: {level.level_id}</div>
              <div>Blocks: {enabledBlocks.length}</div>
              <div>Patterns: {patterns.length}</div>
              <div>Victory Conditions: {victoryConditions.length}</div>
              <div>Guides: {guides.length}</div>
              <div>Weapon Images: {weaponImages.length}</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h5 className="font-semibold text-gray-800 mb-2">ข้อมูลสำคัญ:</h5>
            <div className="space-y-1 text-sm text-gray-600">
              <div>ชื่อ: {level.level_name}</div>
              <div>หมวดหมู่: {level.category_name}</div>
              <div>ความยาก: {level.difficulty}</div>
              <div>Text Code: {level.textcode ? 'เปิด' : 'ปิด'}</div>
              <div>Nodes: {typeof level.nodes === 'string' ? JSON.parse(level.nodes).length : level.nodes?.length || 0}</div>
              <div>Edges: {typeof level.edges === 'string' ? JSON.parse(level.edges).length : level.edges?.length || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'blocks': return renderBlocks();
      case 'patterns': return renderPatterns();
      case 'victory': return renderVictoryConditions();
      case 'guides': return renderGuides();
      case 'weapons': return renderWeapons();
      case 'json': return renderJson();
      default: return renderOverview();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      {/* Backdrop: use the same subtle backdrop as GuidePopup (light dim + blur) */}
      <div className="absolute inset-0 bg-black-900/5 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-black rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header - Fixed height */}
        <div className="flex-none flex justify-between items-center p-6 border-b border-gray-800 bg-gray-950">
          <h2 className="text-2xl font-bold text-gray-200 flex items-center gap-3">
            รายละเอียด Level: {level.level_name}
          </h2>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-800 text-gray-200 rounded-lg hover:bg-gray-700 transition-all font-medium border border-gray-700 hover:border-gray-600 shadow-sm"
          >
            ปิด
          </button>
        </div>

        {/* Tabs - Fixed height */}
        <div className="flex-none border-b border-gray-900 bg-gray-950">
          <div className="flex gap-2 p-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 rounded-lg text-sm font-bold transition-all transform hover:scale-105 ${activeTab === tab.id
                  ? 'bg-gray-900 text-gray-200 shadow-lg border border-gray-600'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-800 border border-gray-700 hover:border-gray-600'
                  }`}
              >
                <span className="text-lg mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content - Flexible height with scroll */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelDetailViewer;
