// Mock API for Level Management
// In production, this would connect to your actual backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Mock data storage (in production, this would be a database)
let mockLevels = [
  {
    id: 1,
    name: "Level 1 - Beginner",
    difficulty: "easy",
    data: {
      nodes: [
        { id: 1, x: 100, y: 100, type: 'normal' },
        { id: 2, x: 300, y: 200, type: 'normal' }
      ],
      edges: [
        { from: 1, to: 2 }
      ]
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
  },
  {
    id: 2,
    name: "Level 2 - Intermediate",
    difficulty: "medium",
    data: {
      nodes: [
        { id: 1, x: 150, y: 150, type: 'normal' },
        { id: 2, x: 250, y: 150, type: 'normal' },
        { id: 3, x: 350, y: 250, type: 'normal' },
        { id: 4, x: 200, y: 300, type: 'normal' }
      ],
      edges: [
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 }
      ]
    },
    createdAt: "2024-01-02T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z"
  }
];

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const levelApi = {
  // Get all levels
  async getAllLevels() {
    await delay(500); // Simulate network delay
    return {
      success: true,
      data: mockLevels,
      message: "Levels retrieved successfully"
    };
  },

  // Get level by ID
  async getLevelById(id) {
    await delay(300);
    const level = mockLevels.find(l => l.id === parseInt(id));
    
    if (!level) {
      return {
        success: false,
        data: null,
        message: "Level not found"
      };
    }

    return {
      success: true,
      data: level,
      message: "Level retrieved successfully"
    };
  },

  // Create new level
  async createLevel(levelData) {
    await delay(800); // Simulate longer processing time for creation
    
    // Validate input
    if (!levelData.data || !levelData.data.nodes || levelData.data.nodes.length === 0) {
      return {
        success: false,
        data: null,
        message: "Invalid level data: must contain at least one node"
      };
    }

    // Generate new ID
    const newId = Math.max(...mockLevels.map(l => l.id), 0) + 1;
    
    // Create new level
    const newLevel = {
      id: newId,
      name: levelData.name || `Level ${newId}`,
      difficulty: levelData.difficulty || this.calculateDifficulty(levelData.data),
      data: levelData.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockLevels.push(newLevel);

    return {
      success: true,
      data: newLevel,
      message: "Level created successfully"
    };
  },

  // Update existing level
  async updateLevel(id, levelData) {
    await delay(600);
    
    const levelIndex = mockLevels.findIndex(l => l.id === parseInt(id));
    
    if (levelIndex === -1) {
      return {
        success: false,
        data: null,
        message: "Level not found"
      };
    }

    // Update level
    mockLevels[levelIndex] = {
      ...mockLevels[levelIndex],
      ...levelData,
      id: parseInt(id), // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    return {
      success: true,
      data: mockLevels[levelIndex],
      message: "Level updated successfully"
    };
  },

  // Delete level
  async deleteLevel(id) {
    await delay(400);
    
    const levelIndex = mockLevels.findIndex(l => l.id === parseInt(id));
    
    if (levelIndex === -1) {
      return {
        success: false,
        data: null,
        message: "Level not found"
      };
    }

    const deletedLevel = mockLevels.splice(levelIndex, 1)[0];

    return {
      success: true,
      data: deletedLevel,
      message: "Level deleted successfully"
    };
  },

  // Calculate difficulty based on level data
  calculateDifficulty(levelData) {
    const nodeCount = levelData.nodes?.length || 0;
    const edgeCount = levelData.edges?.length || 0;
    
    if (nodeCount <= 3 && edgeCount <= 2) return 'easy';
    if (nodeCount <= 6 && edgeCount <= 5) return 'medium';
    return 'hard';
  },

  // Get levels by difficulty
  async getLevelsByDifficulty(difficulty) {
    await delay(300);
    const filteredLevels = mockLevels.filter(l => l.difficulty === difficulty);
    
    return {
      success: true,
      data: filteredLevels,
      message: `Levels with difficulty '${difficulty}' retrieved successfully`
    };
  },

  // Search levels by name
  async searchLevels(query) {
    await delay(400);
    const filteredLevels = mockLevels.filter(l => 
      l.name.toLowerCase().includes(query.toLowerCase())
    );
    
    return {
      success: true,
      data: filteredLevels,
      message: `Search results for '${query}'`
    };
  }
};

// Export individual functions for convenience
export const {
  getAllLevels,
  getLevelById,
  createLevel,
  updateLevel,
  deleteLevel,
  getLevelsByDifficulty,
  searchLevels
} = levelApi;

export default levelApi;
