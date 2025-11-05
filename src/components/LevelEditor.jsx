import React, { useEffect, useRef, useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL;

const LevelEditor = ({ onSaveLevel, initialData = null, viewerMode = false, gameRef = null, levelsTypesData: propLevelsTypesData = [] }) => {
  // ใช้ gameRef จาก props หรือสร้างใหม่ถ้าไม่มี
  const editorRef = useRef(null);
  const viewerRef = useRef(null);
  const [activeTab, setActiveTab] = useState(viewerMode ? 'viewer' : 'editor');
  
  const [levelData, setLevelData] = useState({ 
    nodes: initialData?.nodes || [], 
    edges: initialData?.edges || [], 
    startNodeId: initialData?.startNodeId || null, 
    goalNodeId: initialData?.goalNodeId || null 
  });
  const [currentMode, setCurrentMode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [savedLevelData, setSavedLevelData] = useState(null);
  const [simulationActive, setSimulationActive] = useState(false);
  const [currentSimulationNode, setCurrentSimulationNode] = useState(0);
  const [simulationTimer, setSimulationTimer] = useState(0);
  const [phaserLoaded, setPhaserLoaded] = useState(false);
  const [selectedLevelType, setSelectedLevelType] = useState(1);
  const [levelsTypesData, setLevelsTypesData] = useState([]);
  const [levelName, setLevelName] = useState('');
  const [levelDescription, setLevelDescription] = useState('');
  
  // Use level types from props or load from API
  useEffect(() => {
    if (propLevelsTypesData.length > 0) {
      setLevelsTypesData(propLevelsTypesData);
      setSelectedLevelType(propLevelsTypesData[0].level_type_id);
    } else {
      loadLevelsTypesData();
    }
  }, [propLevelsTypesData]);

  const loadLevelsTypesData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/level-types`);
      const result = await response.json();
      
      if (result.success) {
        setLevelsTypesData(result.data);
        // Set default level type if available
        if (result.data.length > 0) {
          setSelectedLevelType(result.data[0].level_type_id);
        }
      }
    } catch (error) {
      console.error('Error loading level types:', error);
    }
  };
  
  // Use refs to store current state for event listeners
  const currentModeRef = useRef(currentMode);
  const levelDataRef = useRef(levelData);
  const selectedNodeRef = useRef(selectedNode);
  
  // Update refs when state changes
  useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  useEffect(() => {
    levelDataRef.current = levelData;
  }, [levelData]);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  // โหลดข้อมูลอัตโนมัติเมื่อมี initialData
  useEffect(() => {
    if (initialData && initialData.nodes && initialData.nodes.length > 0) {
      setSavedLevelData(JSON.parse(JSON.stringify(initialData)));
    }
  }, [initialData]);

  let editorGame = null;
  let viewerGame = null;
  let editorGraphics = null;
  let viewerGraphics = null;
  
  // ใช้ gameRef เดียวกันถ้ามี หรือใช้ ref ของตัวเอง
  const currentGameRef = gameRef || editorRef;
  const currentViewerRef = gameRef || viewerRef;
  let viewerTexts = [];

  // Helper Functions
  const addNode = (x, y) => {
    console.log('addNode called with:', x, y);
    console.log('Current levelData before adding node:', levelData);
    
    const nodeId = levelData.nodes.length + 1;
    const newNode = {
      id: nodeId,
      x: Math.round(x),
      y: Math.round(y),
      type: 'normal'
    };
    
    const newLevelData = {
      ...levelData,
      nodes: [...levelData.nodes, newNode]
    };
    
    console.log('Adding new node:', newNode);
    console.log('New level data:', newLevelData);
    setLevelData(newLevelData);
    
    // Force redraw after adding node
    setTimeout(() => {
      if (editorGraphics) {
        console.log('Force redraw after adding node');
        redrawEditor();
      }
    }, 100);
  };

  const findNodeAt = (x, y) => {
    const threshold = 20;
    return levelDataRef.current.nodes.find(node => 
      Math.abs(node.x - x) < threshold && 
      Math.abs(node.y - y) < threshold
    );
  };

  const handleNodeClick = (node) => {
    const currentModeValue = currentModeRef.current;
    
    if (currentModeValue === 'start') {
      const currentLevelData = levelDataRef.current;
      const newLevelData = {
        ...currentLevelData,
        startNodeId: node.id
      };
      console.log('Start node set to:', node.id);
      setLevelData(newLevelData);
      
      // Force redraw
      setTimeout(() => {
        if (editorGraphics) {
          console.log('Force redraw after setting start node');
          redrawEditor();
        }
      }, 100);
    } else if (currentModeValue === 'goal') {
      const currentLevelData = levelDataRef.current;
      const newLevelData = {
        ...currentLevelData,
        goalNodeId: node.id
      };
      console.log('Goal node set to:', node.id);
      setLevelData(newLevelData);
      
      // Force redraw
      setTimeout(() => {
        if (editorGraphics) {
          console.log('Force redraw after setting goal node');
          redrawEditor();
        }
      }, 100);
    }
  };

  const handleCanvasClick = (x, y) => {
    console.log('Canvas clicked at:', x, y, 'Current mode:', currentMode);
    
    // ตรวจสอบว่าคลิกที่ node หรือไม่
    const clickedNode = findNodeAt(x, y);
    
    if (clickedNode && (currentMode === 'start' || currentMode === 'goal')) {
      console.log('Setting', currentMode, 'node to:', clickedNode.id);
      handleNodeClick(clickedNode);
    } else if (currentMode === 'node') {
      console.log('Adding node...');
      addNode(x, y);
    } else if (currentMode === 'edge') {
      console.log('Handling edge click...');
      handleEdgeClick(x, y);
    } else if (currentMode === 'delete') {
      console.log('Handling delete...');
      handleDelete(x, y);
    } else {
      console.log('No mode selected');
    }
  };

  const handleEdgeClick = (x, y) => {
    const clickedNode = findNodeAt(x, y);
    
    if (!clickedNode) return;
    
    const currentSelectedNode = selectedNodeRef.current;
    
    if (!currentSelectedNode) {
      // First node selection
      console.log('Selecting first node:', clickedNode.id);
      setSelectedNode(clickedNode);
    } else {
      // Second node selection
      if (currentSelectedNode.id !== clickedNode.id) {
        console.log('Creating edge from', currentSelectedNode.id, 'to', clickedNode.id);
        addEdge(currentSelectedNode.id, clickedNode.id);
      } else {
        console.log('Cannot create edge to the same node');
      }
      setSelectedNode(null);
    }
  };

  const addEdge = (fromId, toId) => {
    const currentLevelData = levelDataRef.current;
    const exists = currentLevelData.edges.some(e => 
      (e.from === fromId && e.to === toId) || 
      (e.from === toId && e.to === fromId)
    );
    
    if (!exists) {
      const newEdge = { from: fromId, to: toId };
      const newLevelData = {
        ...currentLevelData,
        edges: [...currentLevelData.edges, newEdge]
      };
      console.log('Adding new edge:', newEdge);
      console.log('New level data:', newLevelData);
      setLevelData(newLevelData);
      
      // Force redraw
      setTimeout(() => {
        if (editorGraphics) {
          console.log('Force redraw after adding edge');
          redrawEditor();
        }
      }, 100);
    } else {
      console.log('Edge already exists');
    }
  };

  const handleDelete = (x, y) => {
    const clickedNode = findNodeAt(x, y);
    
    if (clickedNode) {
      const newLevelData = {
        ...levelData,
        nodes: levelData.nodes.filter(n => n.id !== clickedNode.id),
        edges: levelData.edges.filter(e => 
          e.from !== clickedNode.id && e.to !== clickedNode.id
        )
      };
      setLevelData(newLevelData);
    } else {
      const clickedEdge = findEdgeAt(x, y);
      if (clickedEdge) {
        const newLevelData = {
          ...levelData,
          edges: levelData.edges.filter(e => e !== clickedEdge)
        };
        setLevelData(newLevelData);
      }
    }
  };

  const findEdgeAt = (x, y) => {
    const threshold = 10;
    
    for (let edge of levelData.edges) {
      const fromNode = levelData.nodes.find(n => n.id === edge.from);
      const toNode = levelData.nodes.find(n => n.id === edge.to);
      
      if (!fromNode || !toNode) continue;
      
      const dist = distanceToLine(x, y, fromNode.x, fromNode.y, toNode.x, toNode.y);
      if (dist < threshold) return edge;
    }
    return null;
  };

  const distanceToLine = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const redrawEditor = () => {
    if (!editorGraphics) {
      console.log('Editor graphics not available');
      return;
    }
    
    editorGraphics.clear();
    
    // Grid
    editorGraphics.lineStyle(1, 0x4a5568, 0.3);
    for (let i = 0; i < 600; i += 50) {
      editorGraphics.lineBetween(i, 0, i, 400);
    }
    for (let i = 0; i < 400; i += 50) {
      editorGraphics.lineBetween(0, i, 600, i);
    }
    
    // Use current levelData from ref
    const currentLevelData = levelDataRef.current;
    console.log('Current levelData for redraw:', currentLevelData);
    
    // Edges
    editorGraphics.lineStyle(3, 0x48bb78, 1);
    currentLevelData.edges.forEach(edge => {
      const fromNode = currentLevelData.nodes.find(n => n.id === edge.from);
      const toNode = currentLevelData.nodes.find(n => n.id === edge.to);
      
      if (fromNode && toNode) {
        editorGraphics.lineBetween(fromNode.x, fromNode.y, toNode.x, toNode.y);
      }
    });
    
    // Nodes
    console.log('Drawing', currentLevelData.nodes.length, 'nodes');
    currentLevelData.nodes.forEach(node => {
      console.log('Drawing node:', node);
      const isSelected = selectedNodeRef.current && selectedNodeRef.current.id === node.id;
      const isStart = currentLevelData.startNodeId === node.id;
      const isGoal = currentLevelData.goalNodeId === node.id;
      
      // เงา
      editorGraphics.fillStyle(0x000000, 0.3);
      editorGraphics.fillCircle(node.x + 2, node.y + 2, 18);
      
      // สีของ node
      let nodeColor = 0x667eea; // สีน้ำเงิน default
      if (isStart) nodeColor = 0x10b981; // สีเขียว start
      else if (isGoal) nodeColor = 0xf59e0b; // สีเหลือง goal
      else if (isSelected) nodeColor = 0xfbbf24; // สีเหลืองอ่อน selected
      
      editorGraphics.fillStyle(nodeColor, 1);
      editorGraphics.fillCircle(node.x, node.y, 18);
      
      // ขอบ
      editorGraphics.lineStyle(3, 0xffffff, 1);
      editorGraphics.strokeCircle(node.x, node.y, 18);
    });
  };

  // Editor Scene
  const createEditor = (scene) => {
    try {
      if (!scene || !scene.add) {
        console.error('Scene is not properly initialized');
        return;
      }
      
      console.log('Creating editor graphics...');
      editorGraphics = scene.add.graphics();
      
      console.log('Adding pointer event listeners...');
      scene.input.on('pointerdown', (pointer) => {
        console.log('Pointer down event triggered:', pointer.x, pointer.y);
        console.log('Current mode at click time:', currentModeRef.current);
        
        // ตรวจสอบว่าคลิกที่ node หรือไม่
        const clickedNode = findNodeAt(pointer.x, pointer.y);
        
        if (clickedNode && (currentModeRef.current === 'start' || currentModeRef.current === 'goal')) {
          console.log('Setting', currentModeRef.current, 'node to:', clickedNode.id);
          handleNodeClick(clickedNode);
        } else if (currentModeRef.current === 'node') {
          console.log('Adding node...');
          // Create new node directly
          const nodeId = levelDataRef.current.nodes.length + 1;
          const newNode = {
            id: nodeId,
            x: Math.round(pointer.x),
            y: Math.round(pointer.y),
            type: 'normal'
          };
          
          const newLevelData = {
            ...levelDataRef.current,
            nodes: [...levelDataRef.current.nodes, newNode]
          };
          
          console.log('Adding new node:', newNode);
          console.log('New level data:', newLevelData);
          setLevelData(newLevelData);
          
          // Force redraw
          setTimeout(() => {
            if (editorGraphics) {
              console.log('Force redraw after adding node');
              redrawEditor();
            }
          }, 100);
        } else if (currentModeRef.current === 'edge') {
          console.log('Handling edge click...');
          handleEdgeClick(pointer.x, pointer.y);
        } else if (currentModeRef.current === 'delete') {
          console.log('Handling delete...');
          handleDelete(pointer.x, pointer.y);
        } else {
          console.log('No mode selected');
        }
      });
      
      scene.input.on('pointermove', (pointer) => {
        if (currentModeRef.current === 'delete') {
          const node = findNodeAt(pointer.x, pointer.y);
          scene.input.setDefaultCursor(node ? 'pointer' : 'default');
        }
      });
      
      console.log('Editor scene created successfully');
    } catch (error) {
      console.error('Error in createEditor:', error);
    }
  };

  const updateEditor = (scene) => {
    redrawEditor();
  };

  // Viewer Scene
  const createViewer = (scene) => {
    try {
      if (!scene || !scene.add) {
        console.error('Scene is not properly initialized');
        return;
      }
      
      viewerGraphics = scene.add.graphics();
      loadViewerData();
    } catch (error) {
      console.error('Error in createViewer:', error);
    }
  };

  const updateViewer = (scene) => {
    redrawViewer();
    
    if (simulationActive && savedLevelData && savedLevelData.nodes.length > 0) {
      setSimulationTimer(prev => {
        if (prev > 60) {
          setCurrentSimulationNode(prevNode => (prevNode + 1) % savedLevelData.nodes.length);
          return 0;
        }
        return prev + 1;
      });
    }
  };

  const redrawViewer = () => {
    if (!viewerGraphics) return;
    
    viewerGraphics.clear();
    
    // ล้าง texts
    viewerTexts.forEach(t => t.destroy());
    viewerTexts = [];
    
    if (!savedLevelData || savedLevelData.nodes.length === 0) {
      const text = viewerGraphics.scene.add.text(300, 200, 
        'ไม่มีข้อมูล Level\nกรุณาสร้างและบันทึกใน Editor', 
        {
          fontSize: '24px',
          fill: '#ffffff',
          align: 'center'
        }
      ).setOrigin(0.5);
      viewerTexts.push(text);
      return;
    }
    
    // Grid
    viewerGraphics.lineStyle(1, 0x4a5568, 0.2);
    for (let i = 0; i < 600; i += 50) {
      viewerGraphics.lineBetween(i, 0, i, 400);
    }
    for (let i = 0; i < 400; i += 50) {
      viewerGraphics.lineBetween(0, i, 600, i);
    }
    
    // Edges
    viewerGraphics.lineStyle(4, 0x3b82f6, 0.8);
    savedLevelData.edges.forEach(edge => {
      const fromNode = savedLevelData.nodes.find(n => n.id === edge.from);
      const toNode = savedLevelData.nodes.find(n => n.id === edge.to);
      
      if (fromNode && toNode) {
        viewerGraphics.lineBetween(fromNode.x, fromNode.y, toNode.x, toNode.y);
        
        // ลูกศร
        const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
        const arrowSize = 10;
        const mx = (fromNode.x + toNode.x) / 2;
        const my = (fromNode.y + toNode.y) / 2;
        
        viewerGraphics.fillStyle(0x3b82f6, 0.8);
        viewerGraphics.fillTriangle(
          mx + Math.cos(angle) * arrowSize,
          my + Math.sin(angle) * arrowSize,
          mx + Math.cos(angle + 2.5) * arrowSize,
          my + Math.sin(angle + 2.5) * arrowSize,
          mx + Math.cos(angle - 2.5) * arrowSize,
          my + Math.sin(angle - 2.5) * arrowSize
        );
      }
    });
    
    // Nodes
    savedLevelData.nodes.forEach((node, index) => {
      const isSimulated = simulationActive && index === currentSimulationNode;
      const nodeColor = isSimulated ? 0xfbbf24 : 0x10b981;
      const nodeSize = isSimulated ? 22 : 18;
      
      // เงา
      viewerGraphics.fillStyle(0x000000, 0.4);
      viewerGraphics.fillCircle(node.x + 3, node.y + 3, nodeSize);
      
      // Node
      viewerGraphics.fillStyle(nodeColor, 1);
      viewerGraphics.fillCircle(node.x, node.y, nodeSize);
      
      // ขอบ
      viewerGraphics.lineStyle(3, 0xffffff, 1);
      viewerGraphics.strokeCircle(node.x, node.y, nodeSize);
      
      // ID
      const text = viewerGraphics.scene.add.text(node.x, node.y, node.id, {
        fontSize: '14px',
        fill: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      viewerTexts.push(text);
      
      // Animation
      if (isSimulated) {
        viewerGraphics.lineStyle(2, 0xfbbf24, 0.5);
        viewerGraphics.strokeCircle(node.x, node.y, nodeSize + 10);
      }
    });
  };

  const loadViewerData = () => {
    // โหลดข้อมูลจาก initialData หรือ levelData ปัจจุบัน
    const dataToLoad = initialData || levelData;
    if (dataToLoad && dataToLoad.nodes.length > 0) {
      setSavedLevelData(JSON.parse(JSON.stringify(dataToLoad)));
    }
  };

  const setMode = (mode) => {
    console.log('setMode called with:', mode);
    console.log('Current mode before change:', currentMode);
    console.log('About to call setCurrentMode with:', mode);
    
    if (currentMode === mode) {
      setCurrentMode(null);
      setSelectedNode(null);
      console.log('Mode cleared');
    } else {
      setCurrentMode(mode);
      setSelectedNode(null);
      console.log('Mode set to:', mode);
    }
    
    // Verify the state change
    setTimeout(() => {
      console.log('Mode after timeout:', currentMode);
    }, 100);
  };

  const clearAll = () => {
    if (window.confirm('ต้องการล้างข้อมูลทั้งหมดหรือไม่?')) {
      setLevelData({ nodes: [], edges: [], startNodeId: null, goalNodeId: null });
      setSelectedNode(null);
      setCurrentMode(null);
    }
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(levelData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'level-data.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveLevel = async () => {
    if (!levelName.trim()) {
      alert('⚠️ กรุณาใส่ชื่อด่าน');
      return;
    }
    
    if (levelData.nodes.length === 0) {
      alert('⚠️ ไม่มีข้อมูลให้บันทึก กรุณาเพิ่ม Node อย่างน้อย 1 ตัว');
      return;
    }

    try {
      // เก็บข้อมูลใน memory ชั่วคราว
      setSavedLevelData(JSON.parse(JSON.stringify(levelData)));
      
      // หาประเภทด่านที่เลือก
      const selectedType = levelsTypesData.find(type => type.level_type_id === selectedLevelType);
      
      // สร้าง level ใหม่ผ่าน API
      const newLevel = {
        level_name: levelName || `${selectedType?.type_name || 'Custom'} Level - ${new Date().toLocaleDateString()}`,
        description: levelDescription || selectedType?.description || "Custom level created from Level Editor",
        difficulty_level: 2,
        category_id: selectedLevelType,
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
      };
      
      const response = await fetch(`${API_URL}/api/levels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLevel)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Level saved to database:', result.data);
        
        // แสดงข้อมูลที่บันทึกสำเร็จ
        alert(`✅ บันทึกสำเร็จ! ด่าน "${result.data.level_name}" ถูกเพิ่มลงในฐานข้อมูลแล้ว (ID: ${result.data.level_id})

📋 ข้อมูลที่บันทึก:
- ชื่อ: ${result.data.level_name}
- คำอธิบาย: ${result.data.description}
- ประเภท: ${selectedType?.type_name || 'ไม่ระบุ'}
- Nodes: ${levelData.nodes.length}
- Edges: ${levelData.edges.length}
- Start Node: ${levelData.startNodeId}
- Goal Node: ${levelData.goalNodeId}

💾 ข้อมูลถูกบันทึกในฐานข้อมูล

🔍 ตรวจสอบใน Level Manager เพื่อดูด่านที่สร้างใหม่`);
      } else {
        throw new Error(result.message);
      }
      
    } catch (error) {
      console.error('Error saving level:', error);
      alert('❌ เกิดข้อผิดพลาดในการบันทึก!');
    }
  };

  const toggleSimulation = () => {
    if (!savedLevelData || savedLevelData.nodes.length === 0) {
      alert('⚠️ ไม่มีข้อมูลให้จำลอง');
      return;
    }
    
    setSimulationActive(!simulationActive);
    setCurrentSimulationNode(0);
    setSimulationTimer(0);
  };

  // Force redraw when levelData changes
  useEffect(() => {
    if (editorGraphics) {
      console.log('LevelData changed, forcing redraw');
      redrawEditor();
    }
  }, [levelData]);

  // Debug currentMode changes
  useEffect(() => {
    console.log('currentMode state changed to:', currentMode);
  }, [currentMode]);


  // Initialize Phaser games
  useEffect(() => {
    const initializeGames = () => {
      if (typeof window !== 'undefined' && window.Phaser && window.Phaser.Game) {
        // Create scene classes properly
        class EditorScene extends window.Phaser.Scene {
          constructor() {
            super({ key: 'EditorScene' });
          }
          
          create() {
            createEditor(this);
          }
          
          update() {
            updateEditor(this);
          }
        }

        class ViewerScene extends window.Phaser.Scene {
          constructor() {
            super({ key: 'ViewerScene' });
          }
          
          create() {
            createViewer(this);
          }
          
          update() {
            updateViewer(this);
          }
        }

        const editorConfig = {
          type: window.Phaser.AUTO,
          width: gameRef ? 800 : 600,  // ลดขนาดให้เหมาะสมกับหน้าจอ
          height: gameRef ? 600 : 400,
          parent: currentGameRef.current,
          backgroundColor: '#2d3748',
          scene: EditorScene
        };

        const viewerConfig = {
          type: window.Phaser.AUTO,
          width: gameRef ? 800 : 600,
          height: gameRef ? 600 : 400,
          parent: currentViewerRef.current,
          backgroundColor: '#1a202c',
          scene: ViewerScene
        };

        if (activeTab === 'editor' && currentGameRef.current && !editorGame) {
          try {
            editorGame = new window.Phaser.Game(editorConfig);
            console.log('Editor game created successfully');
          } catch (error) {
            console.error('Error creating editor game:', error);
          }
        }

        if (activeTab === 'viewer' && currentViewerRef.current && !viewerGame) {
          try {
            viewerGame = new window.Phaser.Game(viewerConfig);
            console.log('Viewer game created successfully');
          } catch (error) {
            console.error('Error creating viewer game:', error);
          }
        }
      }
    };

    // Check if Phaser is already loaded
    if (typeof window !== 'undefined' && window.Phaser) {
      initializeGames();
    }

    return () => {
      if (editorGame) {
        editorGame.destroy(true);
        editorGame = null;
      }
      if (viewerGame) {
        viewerGame.destroy(true);
        viewerGame = null;
      }
    };
  }, [activeTab]);

  // Load Phaser script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Phaser) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/phaser/3.55.2/phaser.min.js';
      script.onload = () => {
        console.log('Phaser loaded successfully');
        setPhaserLoaded(true);
        // Force re-render to initialize games
        setTimeout(() => {
          if (activeTab === 'editor' && currentGameRef.current && !editorGame) {
            // Create scene classes properly
            class EditorScene extends window.Phaser.Scene {
              constructor() {
                super({ key: 'EditorScene' });
              }
              
              create() {
                createEditor(this);
              }
              
              update() {
                updateEditor(this);
              }
            }

            const editorConfig = {
              type: window.Phaser.AUTO,
              width: gameRef ? 800 : 600,
              height: gameRef ? 600 : 400,
              parent: currentGameRef.current,
              backgroundColor: '#2d3748',
              scene: EditorScene
            };
            try {
              editorGame = new window.Phaser.Game(editorConfig);
              console.log('Editor game created successfully after script load');
            } catch (error) {
              console.error('Error creating editor game after script load:', error);
            }
          }

          if (activeTab === 'viewer' && currentViewerRef.current && !viewerGame) {
            // Create scene classes properly
            class ViewerScene extends window.Phaser.Scene {
              constructor() {
                super({ key: 'ViewerScene' });
              }
              
              create() {
                createViewer(this);
              }
              
              update() {
                updateViewer(this);
              }
            }

            const viewerConfig = {
              type: window.Phaser.AUTO,
              width: gameRef ? 800 : 600,
              height: gameRef ? 600 : 400,
              parent: currentViewerRef.current,
              backgroundColor: '#1a202c',
              scene: ViewerScene
            };
            try {
              viewerGame = new window.Phaser.Game(viewerConfig);
              console.log('Viewer game created successfully after script load');
            } catch (error) {
              console.error('Error creating viewer game after script load:', error);
            }
          }
        }, 100);
      };
      script.onerror = () => {
        console.error('Failed to load Phaser script');
      };
      document.head.appendChild(script);

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, []);

  const getModeText = () => {
    console.log('getModeText called, currentMode:', currentMode);
    if (!currentMode) return 'โหมด: ไม่ได้เลือก';
    if (currentMode === 'node') return 'โหมด: เพิ่ม Node - คลิกบน Canvas';
    if (currentMode === 'edge') return selectedNode ? `เลือก Node ${selectedNode.id} แล้ว - คลิก Node ปลายทาง` : 'โหมด: เชื่อม Edge - เลือก Node 2 ตัว';
    if (currentMode === 'start') return 'โหมด: ตั้ง Node เริ่ม - คลิกที่ Node ที่ต้องการ';
    if (currentMode === 'goal') return 'โหมด: ตั้ง Node ปลาย - คลิกที่ Node ที่ต้องการ';
    if (currentMode === 'delete') return 'โหมด: ลบ - คลิกที่ Node หรือ Edge';
    return 'โหมด: ไม่ได้เลือก';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🎮 Level Editor & Viewer</h2>
        <p className="text-gray-600">สร้างและแสดงผล Level ของเกม</p>
      </div>
      
      {/* Tabs - ซ่อนใน viewer mode */}
      {!viewerMode && (
        <div className="flex justify-center gap-2 mb-6">
          <button
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'editor'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => setActiveTab('editor')}
          >
            ✏️ Editor
          </button>
          <button
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'viewer'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => setActiveTab('viewer')}
          >
            👁️ Viewer
          </button>
        </div>
      )}

      {activeTab === 'editor' && (
        <div className="flex gap-4 flex-wrap lg:flex-nowrap">
          {/* Game Canvas */}
          <div className="bg-gray-800 rounded-lg p-2 flex-shrink-0 w-full max-w-fit">
            {!phaserLoaded && typeof window !== 'undefined' && !window.Phaser ? (
              <div className={`${gameRef ? 'w-full max-w-[800px] h-[600px]' : 'w-[600px] h-[400px]'} flex items-center justify-center text-white`}>
                <div className="text-center">
                  <div className="text-lg mb-2">⏳ กำลังโหลด Level Editor...</div>
                  <div className="text-sm text-gray-400">กรุณารอสักครู่</div>
                </div>
              </div>
            ) : (
              <div ref={currentGameRef} id="game-container-editor"></div>
            )}
          </div>
          
          {/* Control Panel - ซ่อนใน viewer mode */}
          {!viewerMode && (
            <div className="w-80 space-y-4 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-800">🛠️ เครื่องมือแก้ไข</h3>
            {console.log('Rendering editor tab, currentMode:', currentMode)}
            
            {/* Stats */}
            <div className="flex justify-between bg-gray-100 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Nodes</div>
                <div className="text-2xl font-bold text-blue-600">{levelData.nodes.length}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600 mb-1">Edges</div>
                <div className="text-2xl font-bold text-blue-600">{levelData.edges.length}</div>
              </div>
            </div>
            
            {/* Level Information */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 ชื่อด่าน
                </label>
                <input
                  type="text"
                  value={levelName}
                  onChange={(e) => setLevelName(e.target.value)}
                  placeholder="ใส่ชื่อด่าน..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                />
                <div className="mt-1 text-xs text-gray-500">
                  ชื่อด่านที่ผู้เล่นจะเห็น
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📄 คำอธิบาย
                </label>
                <textarea
                  value={levelDescription}
                  onChange={(e) => setLevelDescription(e.target.value)}
                  placeholder="ใส่คำอธิบายด่าน..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white resize-none"
                />
                <div className="mt-1 text-xs text-gray-500">
                  คำอธิบายสั้นๆ เกี่ยวกับด่านนี้
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📋 ประเภทด่าน
                </label>
                <select
                  value={selectedLevelType}
                  onChange={(e) => setSelectedLevelType(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
                >
                  {levelsTypesData.map(type => (
                    <option key={type.level_type_id} value={type.level_type_id}>
                      {type.type_name} - {type.description}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-gray-500">
                  เลือกประเภทด่านที่ต้องการสร้าง
                </div>
              </div>
            </div>
            
            {/* Mode Indicator */}
            <div className={`p-3 rounded-lg text-center font-semibold ${
              currentMode ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {getModeText()}
            </div>
            
            {/* Control Buttons */}
            <div className="space-y-2">
              {console.log('Rendering Add Node button, currentMode:', currentMode)}
              <button
                className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                  currentMode === 'node'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
                onClick={() => {
                  console.log('Button clicked: Add Node');
                  setMode('node');
                }}
              >
                ➕ เพิ่ม Node
              </button>
              
              <button
                className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                  currentMode === 'edge'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
                onClick={() => {
                  console.log('Button clicked: Connect Edge');
                  setMode('edge');
                }}
              >
                🔗 เชื่อม Edge
              </button>
              
              <button
                className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                  currentMode === 'start'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
                onClick={() => setMode('start')}
              >
                🏁 ตั้ง Node เริ่ม
              </button>
              
              <button
                className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                  currentMode === 'goal'
                    ? 'bg-yellow-500 text-white shadow-lg'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
                onClick={() => setMode('goal')}
              >
                🎯 ตั้ง Node ปลาย
              </button>
              
              <button
                className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                  currentMode === 'delete'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
                onClick={() => setMode('delete')}
              >
                🗑️ ลบ Node/Edge
              </button>
              
              <button
                className="w-full py-2 px-4 rounded-lg font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                onClick={clearAll}
              >
                🧹 ล้างทั้งหมด
              </button>
              
              <button
                className="w-full py-2 px-4 rounded-lg font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-all"
                onClick={exportJSON}
              >
                💾 Export JSON
              </button>
              
              <button
                className="w-full py-2 px-4 rounded-lg font-semibold bg-green-500 text-white hover:bg-green-600 transition-all shadow-lg"
                onClick={saveLevel}
              >
                📤 บันทึกลง Database
              </button>
            </div>
            
            {/* JSON Output */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-3">
              <h4 className="font-semibold text-gray-800 mb-2">📋 ข้อมูล Level</h4>
              <div className="text-sm font-mono text-gray-700 max-h-48 overflow-y-auto">
                {JSON.stringify({
                  name: levelName || 'ยังไม่ระบุ',
                  description: levelDescription || 'ยังไม่ระบุ',
                  category_id: selectedLevelType,
                  nodes: levelData.nodes,
                  edges: levelData.edges,
                  startNodeId: levelData.startNodeId,
                  goalNodeId: levelData.goalNodeId
                }, null, 2)}
              </div>
            </div>
            
            {/* Level Info */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
              <h4 className="font-semibold text-blue-800 mb-2">📊 ข้อมูล Level:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div><strong>ชื่อ:</strong> {levelName || 'ยังไม่ระบุ'}</div>
                <div><strong>คำอธิบาย:</strong> {levelDescription || 'ยังไม่ระบุ'}</div>
                <div><strong>ประเภท:</strong> {levelsTypesData.find(t => t.level_type_id === selectedLevelType)?.type_name || 'ไม่ระบุ'}</div>
                <div><strong>Nodes:</strong> {levelData.nodes.length}</div>
                <div><strong>Edges:</strong> {levelData.edges.length}</div>
                <div><strong>Start Node:</strong> {levelData.startNodeId ? `Node ${levelData.startNodeId}` : 'ยังไม่ตั้ง'}</div>
                <div><strong>Goal Node:</strong> {levelData.goalNodeId ? `Node ${levelData.goalNodeId}` : 'ยังไม่ตั้ง'}</div>
              </div>
            </div>
          </div>
          )}
        </div>
      )}

      {activeTab === 'viewer' && (
        <div className="flex gap-4 flex-wrap lg:flex-nowrap">
          {/* Game Canvas */}
          <div className="bg-gray-800 rounded-lg p-2 flex-shrink-0 w-full max-w-fit">
            {!phaserLoaded && typeof window !== 'undefined' && !window.Phaser ? (
              <div className={`${gameRef ? 'w-full max-w-[800px] h-[600px]' : 'w-[600px] h-[400px]'} flex items-center justify-center text-white`}>
                <div className="text-center">
                  <div className="text-lg mb-2">⏳ กำลังโหลด Level Viewer...</div>
                  <div className="text-sm text-gray-400">กรุณารอสักครู่</div>
                </div>
              </div>
            ) : (
              <div ref={currentViewerRef} id="game-container-viewer"></div>
            )}
          </div>
          
          {/* Viewer Panel */}
          <div className="w-80 space-y-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-800">📊 ข้อมูล Level</h3>
            
            {(!initialData || initialData.nodes.length === 0) && (!savedLevelData || savedLevelData.nodes.length === 0) && levelData.nodes.length === 0 ? (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-center">
                <div className="text-yellow-800 font-semibold">
                  ⚠️ ยังไม่มีข้อมูล<br />กรุณาสร้างและบันทึก Level ใน Editor
                </div>
              </div>
            ) : (
              <>
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 text-center">
                  <div className="text-green-800 font-semibold">✅ โหลดข้อมูลสำเร็จ!</div>
                </div>
                
                {/* แสดงข้อมูล level */}
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📋 ข้อมูล Level</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div><strong>ชื่อ:</strong> {initialData?.name || 'ไม่ระบุ'}</div>
                    <div><strong>ประเภท:</strong> {initialData?.levelTypeId ? levelsTypesData.find(t => t.level_type_id === initialData.levelTypeId)?.type_name : 'ไม่ระบุ'}</div>
                    <div><strong>ความยาก:</strong> {initialData?.difficulty || 'ไม่ระบุ'}</div>
                    <div><strong>สร้างเมื่อ:</strong> {initialData?.createdAt ? new Date(initialData.createdAt).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">📈 สถิติ</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">จำนวน Nodes:</span>
                      <span className="font-bold text-gray-800">{(initialData || savedLevelData || levelData).nodes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">จำนวน Edges:</span>
                      <span className="font-bold text-gray-800">{(initialData || savedLevelData || levelData).edges.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Node:</span>
                      <span className="font-bold text-gray-800">
                        {(initialData || savedLevelData || levelData).startNodeId ? `Node ${(initialData || savedLevelData || levelData).startNodeId}` : 'ยังไม่ตั้ง'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Goal Node:</span>
                      <span className="font-bold text-gray-800">
                        {(initialData || savedLevelData || levelData).goalNodeId ? `Node ${(initialData || savedLevelData || levelData).goalNodeId}` : 'ยังไม่ตั้ง'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ความยาก:</span>
                      <span className="font-bold text-gray-800">
                        {initialData?.difficulty || ((initialData || savedLevelData || levelData).nodes.length < 5 ? 'ง่าย' : 
                         (initialData || savedLevelData || levelData).nodes.length < 10 ? 'ปานกลาง' : 'ยาก')}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* ซ่อนปุ่มเหล่านี้ใน viewer mode */}
                {!viewerMode && (
                  <div className="space-y-2">
                    <button
                      className="w-full py-2 px-4 rounded-lg font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all"
                      onClick={loadViewerData}
                    >
                      🔄 โหลดข้อมูลใหม่
                    </button>
                    
                    <button
                      className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                        simulationActive
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      }`}
                      onClick={toggleSimulation}
                    >
                      {simulationActive ? '⏸️ หยุดจำลอง' : '▶️ จำลองการเล่น'}
                    </button>
                  </div>
                )}
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">📝 รายละเอียด Nodes</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {(initialData || savedLevelData || levelData).nodes.map(node => (
                      <div key={node.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">Node {node.id}:</span>
                        <span className="font-bold text-gray-800">({node.x}, {node.y})</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">🔗 รายละเอียด Edges</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {(initialData || savedLevelData || levelData).edges.map((edge, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-600">Edge {index + 1}:</span>
                        <span className="font-bold text-gray-800">Node {edge.from} → Node {edge.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LevelEditor;