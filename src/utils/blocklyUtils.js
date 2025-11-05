// src/utils/blocklyUtils.js
// Blockly Utility Functions
import * as Blockly from "blockly/core";
import "blockly/blocks";
import "blockly/javascript";
import { javascriptGenerator } from "blockly/javascript";

// Note: FieldVariable should work normally without custom error handling

// Note: Let Blockly handle its own error management

// ===== IMPROVED VARIABLE HANDLING =====

// Function to safely create/update variable field
function ensureVariableExists(block, fieldName, defaultName) {
  if (!block || !block.workspace) return;
  
  const field = block.getField(fieldName);
  if (!field) return;
  
  const varName = field.getValue() || defaultName;
  const workspace = block.workspace;
  
  // Check if variable exists, create if not
  const variableMap = workspace.getVariableMap();
  let variable = variableMap.getVariable(varName);
  if (!variable) {
    console.log(`Creating variable: ${varName}`);
    try {
      variable = variableMap.createVariable(varName);
      console.log('Variable created successfully:', variable);
    } catch (error) {
      console.error('Error creating variable:', error);
      return null;
    }
  }
  
  // Update field value to ensure consistency
  if (field.getValue() !== varName) {
    try {
    field.setValue(varName);
    } catch (error) {
      console.error('Error setting field value:', error);
    }
  }
  
  return variable;
}

// ===== IMPROVED FIELDVARIABLE HANDLING =====

// Simple FieldVariable handling - always use prompt
function improveFieldVariableHandling() {
  if (!Blockly.FieldVariable) return;
  
  // Override showEditor to always use prompt
  Blockly.FieldVariable.prototype.showEditor_ = function() {
    console.log('FieldVariable showEditor_ called');
    
    const currentValue = this.getValue() || 'variable';
    console.log('Current value:', currentValue);
    
    const newName = prompt("ใส่ชื่อตัวแปร:", currentValue);
    console.log('User entered:', newName);
    
    if (newName !== null && newName !== currentValue && newName.trim() !== '') {
      const cleanValue = newName.trim();
      console.log('Setting variable to:', cleanValue);
      
      try {
        // Ensure variable exists in workspace
        if (this.sourceBlock_ && this.sourceBlock_.workspace) {
          const workspace = this.sourceBlock_.workspace;
          let variable = workspace.getVariable(cleanValue);
          
          if (!variable) {
            console.log('Creating new variable:', cleanValue);
            variable = workspace.createVariable(cleanValue);
          }
          
          // Set the value using the variable ID
          this.setValue(variable.getId());
          console.log('Variable set successfully');
        } else {
          // Fallback: set value directly
          this.setValue(cleanValue);
        }
      } catch (error) {
        console.error('Error setting variable:', error);
        // Try direct setValue as fallback
        try {
          this.setValue(cleanValue);
        } catch (fallbackError) {
          console.error('Fallback setValue also failed:', fallbackError);
        }
      }
    }
  };
}

// Add error handling for MenuItem to prevent appendChild errors
if (Blockly.MenuItem && Blockly.MenuItem.prototype.createDom) {
  Blockly.MenuItem.prototype.createDom = function() {
    try {
      // Check if we have valid DOM context
      if (!document.body || !document.createElement) {
        console.warn("DOM not ready for MenuItem createDom");
        return this.createFallbackElement();
      }
      
      // Create a simple fallback element instead of using original method
      return this.createFallbackElement();
    } catch (error) {
      console.warn("Error in MenuItem createDom:", error);
      return this.createFallbackElement();
    }
  };
  
  // Add fallback element creation method
  Blockly.MenuItem.prototype.createFallbackElement = function() {
    const element = document.createElement('div');
    element.textContent = this.text_ || 'Menu Item';
    element.className = 'blocklyMenuItem';
    element.style.padding = '8px';
    element.style.cursor = 'pointer';
    element.style.backgroundColor = '#fff';
    element.style.border = '1px solid #ccc';
    element.style.borderRadius = '4px';
    element.style.margin = '2px';
    element.style.fontSize = '12px';
    
    // Add click handler
    element.addEventListener('click', () => {
      if (this.callback_) {
        this.callback_(this);
      }
    });
    
    return element;
  };
}

// Add error handling for Menu to prevent appendChild errors
if (Blockly.Menu && Blockly.Menu.prototype.render) {
  Blockly.Menu.prototype.render = function() {
    try {
      // Check if we have valid DOM context
      if (!document.body || !document.createElement) {
        console.warn("DOM not ready for Menu render");
        return this.createFallbackMenu();
      }
      
      // Create a simple fallback menu instead of using original method
      return this.createFallbackMenu();
    } catch (error) {
      console.warn("Error in Menu render:", error);
      return this.createFallbackMenu();
    }
  };
  
  // Add fallback menu creation method
  Blockly.Menu.prototype.createFallbackMenu = function() {
    const element = document.createElement('div');
    element.className = 'blocklyMenu';
    element.style.position = 'absolute';
    element.style.backgroundColor = 'white';
    element.style.border = '1px solid #ccc';
    element.style.borderRadius = '4px';
    element.style.padding = '5px';
    element.style.zIndex = '1000';
    element.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    element.style.minWidth = '120px';
    
    // Add menu items
    if (this.menuItems_ && this.menuItems_.length > 0) {
      this.menuItems_.forEach(item => {
        const itemElement = item.createDom();
        element.appendChild(itemElement);
      });
    } else {
      element.textContent = 'Menu';
    }
    
    return element;
  };
}

// Fix FieldDropdown to work properly for non-variable fields
if (Blockly.FieldDropdown && Blockly.FieldDropdown.prototype.showEditor_) {
  const originalShowEditor = Blockly.FieldDropdown.prototype.showEditor_;
  Blockly.FieldDropdown.prototype.showEditor_ = function() {
    // Skip dropdown for variable fields - let FieldVariable handle it
    if (this.sourceBlock_ && this.sourceBlock_.type && 
        (this.sourceBlock_.type.includes('variable') || this.sourceBlock_.type.includes('VAR'))) {
      console.log('Skipping dropdown for variable field');
      return;
    }
    
    try {
      // Check if DOM is ready
      if (!this.sourceBlock_ || !this.sourceBlock_.workspace || !document.body) {
        console.warn('FieldDropdown: DOM not ready, using fallback');
        this.showFallbackDropdown();
        return;
      }
      
      return originalShowEditor.call(this);
    } catch (error) {
      console.warn('Error in FieldDropdown.showEditor_:', error);
      this.showFallbackDropdown();
    }
  };
  
  // Add fallback dropdown editor
  Blockly.FieldDropdown.prototype.showFallbackDropdown = function() {
    const options = this.getOptions();
    if (!options || options.length === 0) {
      console.warn('No options available for dropdown');
      return;
    }
    
    const currentValue = this.getValue();
    const currentIndex = options.findIndex(option => option[1] === currentValue);
    const nextIndex = (currentIndex + 1) % options.length;
    const nextValue = options[nextIndex][1];
    const nextLabel = options[nextIndex][0];
    
    console.log(`Changing dropdown from ${currentValue} to ${nextValue} (${nextLabel})`);
    
    try {
      this.setValue(nextValue);
      if (this.sourceBlock_ && this.sourceBlock_.workspace && this.sourceBlock_.workspace.render) {
        this.sourceBlock_.workspace.render();
      }
    } catch (error) {
      console.error('Error setting dropdown value:', error);
    }
  };
}

// Add error handling for Gesture to prevent gesture errors
if (Blockly.Gesture && Blockly.Gesture.prototype.setStartField) {
  const originalSetStartField = Blockly.Gesture.prototype.setStartField;
  Blockly.Gesture.prototype.setStartField = function(field) {
    try {
      // Check if gesture is already started
      if (this.started_) {
        console.warn('Gesture already started, skipping setStartField');
        return;
      }
      return originalSetStartField.call(this, field);
    } catch (error) {
      console.warn('Error in Gesture.setStartField:', error);
      return;
    }
  };
}

// Function to ensure common variables exist in workspace
export function ensureCommonVariables(workspace) {
  if (!workspace) return;
  
  const commonVariables = ['i', 'j', 'k', 'coin', 'item', 'index', 'count', 'value'];
  
  const variableMap = workspace.getVariableMap();
  commonVariables.forEach(varName => {
    const variable = variableMap.getVariable(varName);
    if (!variable) {
      console.log(`Creating common variable: ${varName}`);
      variableMap.createVariable(varName);
    }
  });
}

// ===== INITIALIZATION FUNCTION =====

export function initializeImprovedVariableHandling() {
  // Apply improved FieldVariable handling
  improveFieldVariableHandling();
  
  // Ensure common variables exist
  console.log("Improved variable handling initialized");
}

// Add fallback blocks for missing standard blocks
export function ensureStandardBlocks() {
  // Ensure common variables exist
  if (typeof window !== 'undefined' && window.Blockly) {
    // This will be called when workspace is created
    console.log("Ensuring standard blocks and variables...");
  }
  
  
  // Create fallback for variables_get if missing
  if (!Blockly.Blocks['variables_get']) {
    console.warn('variables_get block not found, creating fallback...');
    try {
      Blockly.Blocks['variables_get'] = {
        init: function() {
          this.appendDummyInput()
            .appendField(new Blockly.FieldVariable("item"), "VAR");
          this.setOutput(true, null);
          this.setColour(330);
          this.setTooltip("Get variable value");
        }
      };
      
      javascriptGenerator.forBlock['variables_get'] = function(block) {
        const varName = javascriptGenerator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
        return [varName, javascriptGenerator.ORDER_ATOMIC];
      };
      
      console.log('Created fallback variables_get block');
    } catch (e) {
      console.error('Failed to create fallback variables_get block:', e);
    }
  }
  
  // Create fallback for variables_set if missing
  if (!Blockly.Blocks['variables_set']) {
    console.warn('variables_set block not found, creating fallback...');
    try {
      Blockly.Blocks['variables_set'] = {
        init: function() {
          this.appendDummyInput()
            .appendField("ตั้งค่า")
            .appendField(new Blockly.FieldVariable("item"), "VAR")
            .appendField("เป็น");
          this.appendValueInput("VALUE");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(330);
          this.setTooltip("Set variable value");
        }
      };
      
      javascriptGenerator.forBlock['variables_set'] = function(block) {
        const varName = javascriptGenerator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
        const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ASSIGNMENT) || '0';
        return `${varName} = ${value};\n`;
      };
      
      console.log('Created fallback variables_set block');
    } catch (e) {
      console.error('Failed to create fallback variables_set block:', e);
    }
  }
  
  // Create fallback for math_arithmetic if missing
  if (!Blockly.Blocks['math_arithmetic']) {
    console.warn('math_arithmetic block not found, creating fallback...');
    try {
      Blockly.Blocks['math_arithmetic'] = {
        init: function() {
          this.appendValueInput("A")
            .setCheck("Number");
          this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown([
              ["+", "ADD"],
              ["-", "MINUS"],
              ["×", "MULTIPLY"],
              ["÷", "DIVIDE"],
              ["%", "MODULO"]
            ]), "OP");
          this.appendValueInput("B")
            .setCheck("Number");
          this.setOutput(true, "Number");
          this.setColour(230);
          this.setTooltip("Basic arithmetic operations");
        }
      };
      
      javascriptGenerator.forBlock['math_arithmetic'] = function(block) {
        const a = javascriptGenerator.valueToCode(block, 'A', javascriptGenerator.ORDER_ATOMIC) || '0';
        const b = javascriptGenerator.valueToCode(block, 'B', javascriptGenerator.ORDER_ATOMIC) || '0';
        const operator = block.getFieldValue('OP');
        
        // Debug logging
        console.log('math_arithmetic - a:', a, 'b:', b, 'operator:', operator);
        
        let op;
        switch (operator) {
          case 'ADD': op = '+'; break;
          case 'MINUS': op = '-'; break;
          case 'MULTIPLY': op = '*'; break;
          case 'DIVIDE': op = '/'; break;
          case 'MODULO': op = '%'; break;
          default: op = '+';
        }
        
        const result = `(${a} ${op} ${b})`;
        console.log('math_arithmetic result:', result);
        return [result, javascriptGenerator.ORDER_ATOMIC];
      };
      
      console.log('Created fallback math_arithmetic block');
    } catch (e) {
      console.error('Failed to create fallback math_arithmetic block:', e);
    }
  }
  
  // math_number block is defined in the main blocks section
  
  // Create fallback for controls_repeat_ext if missing
  if (!Blockly.Blocks['controls_repeat_ext']) {
    console.warn('controls_repeat_ext block not found, creating fallback...');
    try {
      Blockly.Blocks['controls_repeat_ext'] = {
        init: function() {
          this.appendValueInput("TIMES")
            .setCheck("Number")
            .appendField("ทำซ้ำ");
          this.appendStatementInput("DO")
            .appendField("ครั้ง");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(120);
          this.setTooltip("Repeat block");
        }
      };
      
      javascriptGenerator.forBlock['controls_repeat_ext'] = function(block) {
        const times = javascriptGenerator.valueToCode(block, 'TIMES', javascriptGenerator.ORDER_ATOMIC) || '0';
        const branch = javascriptGenerator.statementToCode(block, 'DO');
        const code = `for (let i = 0; i < ${times}; i++) {\n${branch}}`;
        return code;
      };
      
      console.log('Created fallback controls_repeat_ext block');
    } catch (e) {
      console.error('Failed to create fallback controls_repeat_ext block:', e);
    }
  }
  
  // Create fallback for controls_whileUntil if missing
  if (!Blockly.Blocks['controls_whileUntil']) {
    console.warn('controls_whileUntil block not found, creating fallback...');
    try {
      Blockly.Blocks['controls_whileUntil'] = {
        init: function() {
          this.appendValueInput("BOOL")
            .setCheck("Boolean")
            .appendField("ทำซ้ำจนกว่า");
          this.appendStatementInput("DO")
            .appendField("ทำ");
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(120);
          this.setTooltip("While loop");
        }
      };
      
      javascriptGenerator.forBlock['controls_whileUntil'] = function(block) {
        const bool = javascriptGenerator.valueToCode(block, 'BOOL', javascriptGenerator.ORDER_NONE) || 'false';
        const branch = javascriptGenerator.statementToCode(block, 'DO');
        const code = `while (${bool}) {\n${branch}}`;
        return code;
      };
      
      console.log('Created fallback controls_whileUntil block');
    } catch (e) {
      console.error('Failed to create fallback controls_whileUntil block:', e);
    }
  }
}

import { 
  getCurrentGameState, 
  setCurrentGameState, 
  setLevelData,
  getWeaponData,
  calculateDamage,
  foundMonster,
  canMoveForward,
  nearPit,
  atGoal,
  getPlayerCoins,
  addCoinToPlayer,
  clearPlayerCoins,
  swapPlayerCoins,
  comparePlayerCoins,
  getPlayerCoinValue,
  getPlayerCoinCount,
  arePlayerCoinsSorted,
  getCurrentScene
} from './gameUtils';
import { movePlayerWithCollisionDetection, startBattle, collectCoinByPlayer, haveCoinAtPosition } from './phaserGame';

// Define all Blockly blocks
export function defineAllBlocks() {
  // Movement blocks
  Blockly.Blocks["move_forward"] = {
    init: function () {
      this.appendDummyInput().appendField("🔽 เดินไปข้างหน้า");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("เดินไปข้างหน้า 1 ช่อง (ตามทิศทางที่หัน)");
    },
  };

  Blockly.Blocks["turn_left"] = {
    init: function () {
      this.appendDummyInput().appendField("↪️ หันซ้าย");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("หันไปทางซ้าย");
    },
  };

  Blockly.Blocks["turn_right"] = {
    init: function () {
      this.appendDummyInput().appendField("↩️ หันขวา");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(280);
      this.setTooltip("หันไปทางขวา");
    },
  };

  Blockly.Blocks["hit"] = {
    init: function () {
      this.appendDummyInput().appendField("⚔️ โจมตี");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(0);
      this.setTooltip("โจมตี Monster ในระยะ");
    },
  };

  // Logic blocks
  Blockly.Blocks["if_else"] = {
    init: function () {
      this.appendValueInput("CONDITION")
        .setCheck("Boolean")
        .appendField("🔀 ถ้า");
      this.appendStatementInput("IF_DO")
        .appendField("แล้ว");
      this.appendStatementInput("ELSE_DO")
        .appendField("ไม่งั้น");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("เงื่อนไขแบบ if-else");
    },
  };

  Blockly.Blocks["if_only"] = {
    init: function () {
      this.appendValueInput("CONDITION")
        .setCheck("Boolean")
        .appendField("❓ ถ้า");
      this.appendStatementInput("DO")
        .appendField("แล้ว");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("เงื่อนไขแบบ if อย่างเดียว");
    },
  };


  // If return block
  Blockly.Blocks["if_return"] = {
    init: function () {
      this.appendValueInput("CONDITION")
        .setCheck("Boolean")
        .appendField("🔀 ถ้า");
      this.appendDummyInput()
        .appendField("แล้วออกจากฟังก์ชัน");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(210);
      this.setTooltip("ถ้าเงื่อนไขเป็นจริง ให้ออกจากฟังก์ชัน");
    },
  };

  // Logic comparison blocks
  Blockly.Blocks["logic_compare"] = {
    init: function () {
      this.appendValueInput("A")
        .setCheck(null);
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["=", "EQ"],
          ["≠", "NEQ"],
          ["<", "LT"],
          ["≤", "LTE"],
          [">", "GT"],
          ["≥", "GTE"]
        ]), "OP");
      this.appendValueInput("B")
        .setCheck(null);
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("เปรียบเทียบค่าสองค่า");
    },
  };

  Blockly.Blocks["logic_boolean"] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["จริง", "TRUE"],
          ["เท็จ", "FALSE"]
        ]), "BOOL");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("ค่าจริงหรือเท็จ");
    },
  };

  Blockly.Blocks["logic_negate"] = {
    init: function () {
      this.appendValueInput("BOOL")
        .setCheck("Boolean")
        .appendField("ไม่ใช่");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("กลับค่าจริง/เท็จ");
    },
  };

  Blockly.Blocks["logic_operation"] = {
    init: function () {
      this.appendValueInput("A")
        .setCheck("Boolean");
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["และ", "AND"],
          ["หรือ", "OR"]
        ]), "OP");
      this.appendValueInput("B")
        .setCheck("Boolean");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("การดำเนินการตรรกะ");
    },
  };

  // Math blocks
  Blockly.Blocks["math_number"] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldNumber("0"), "NUM");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("ตัวเลข");
    },
  };

  Blockly.Blocks["text"] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput(""), "TEXT");
      this.setOutput(true, "String");
      this.setColour(160);
      this.setTooltip("ข้อความ");
    },
  };

  // Condition blocks
  Blockly.Blocks["found_monster"] = {
    init: function () {
      this.appendDummyInput().appendField("👹 เจอ Monster");
      this.setOutput(true, "Boolean");
      this.setColour(330);
      this.setTooltip("ตรวจสอบว่าเจอ Monster หรือไม่");
    },
  };

  Blockly.Blocks["can_move_forward"] = {
    init: function () {
      this.appendDummyInput().appendField("🚶 เดินต่อได้");
      this.setOutput(true, "Boolean");
      this.setColour(330);
      this.setTooltip("ตรวจสอบว่าเดินไปข้างหน้าได้หรือไม่");
    },
  };

  Blockly.Blocks["near_pit"] = {
    init: function () {
      this.appendDummyInput().appendField("🕳️ ใกล้หลุม");
      this.setOutput(true, "Boolean");
      this.setColour(330);
      this.setTooltip("ตรวจสอบว่าใกล้หลุมหรือไม่");
    },
  };

  Blockly.Blocks["at_goal"] = {
    init: function () {
      this.appendDummyInput().appendField("🎯 ถึงเป้าหมาย");
      this.setOutput(true, "Boolean");
      this.setColour(330);
      this.setTooltip("ตรวจสอบว่าถึงเป้าหมายแล้วหรือไม่");
    },
  };

  // Loop blocks
  Blockly.Blocks["repeat"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🔄 ทำซ้ำ")
        .appendField(new Blockly.FieldNumber(3, 1, 10), "TIMES")
        .appendField("ครั้ง");
      this.appendStatementInput("DO").appendField("ทำ");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("ทำซ้ำตามจำนวนครั้งที่กำหนด");
    },
  };

  Blockly.Blocks["while_loop"] = {
    init: function () {
      this.appendValueInput("CONDITION")
        .setCheck("Boolean")
        .appendField("🔁 ทำซ้ำจนกว่า");
      this.appendStatementInput("DO")
        .appendField("จะเป็นเท็จ ทำ");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("ทำซ้ำจนกว่าเงื่อนไขจะเป็นเท็จ");
    },
  };

  // JavaScript generators
  javascriptGenerator.forBlock["move_forward"] = function (block) {
    return "await moveForward();\n";
  };

  javascriptGenerator.forBlock["turn_left"] = function (block) {
    return "await turnLeft();\n";
  };

  javascriptGenerator.forBlock["turn_right"] = function (block) {
    return "await turnRight();\n";
  };

  javascriptGenerator.forBlock["hit"] = function (block) {
    return "await hit();\n";
  };

  javascriptGenerator.forBlock["if_else"] = function (block) {
    const condition = javascriptGenerator.valueToCode(block, 'CONDITION', javascriptGenerator.ORDER_NONE) || 'false';
    const ifCode = javascriptGenerator.statementToCode(block, 'IF_DO');
    const elseCode = javascriptGenerator.statementToCode(block, 'ELSE_DO');
    return `if (${condition}) {\n${ifCode}} else {\n${elseCode}}\n`;
  };

  javascriptGenerator.forBlock["if_only"] = function (block) {
    const condition = javascriptGenerator.valueToCode(block, 'CONDITION', javascriptGenerator.ORDER_NONE) || 'false';
    const doCode = javascriptGenerator.statementToCode(block, 'DO');
    return `if (${condition}) {\n${doCode}}\n`;
  };


  javascriptGenerator.forBlock["if_return"] = function (block) {
    const condition = javascriptGenerator.valueToCode(block, 'CONDITION', javascriptGenerator.ORDER_NONE) || 'false';
    return `if (${condition}) {\n  return;\n}\n`;
  };

  // JavaScript generators for logic blocks
  javascriptGenerator.forBlock["logic_compare"] = function (block) {
    // Safely get values with proper fallbacks
    const a = javascriptGenerator.valueToCode(block, 'A', javascriptGenerator.ORDER_ATOMIC);
    const b = javascriptGenerator.valueToCode(block, 'B', javascriptGenerator.ORDER_ATOMIC);
    const operator = block.getFieldValue('OP');
    
    // Ensure we have valid values
    const valueA = (a && a.trim()) ? a : '0';
    const valueB = (b && b.trim()) ? b : '0';
    
    let op;
    switch (operator) {
      case 'EQ': op = '==='; break;
      case 'NEQ': op = '!=='; break;
      case 'LT': op = '<'; break;
      case 'LTE': op = '<='; break;
      case 'GT': op = '>'; break;
      case 'GTE': op = '>='; break;
      default: op = '===';
    }
    
    return [`(${valueA} ${op} ${valueB})`, javascriptGenerator.ORDER_ATOMIC];
  };

  javascriptGenerator.forBlock["logic_boolean"] = function (block) {
    const bool = block.getFieldValue('BOOL');
    return [`${bool === 'TRUE'}`, javascriptGenerator.ORDER_ATOMIC];
  };

  javascriptGenerator.forBlock["logic_negate"] = function (block) {
    const bool = javascriptGenerator.valueToCode(block, 'BOOL', javascriptGenerator.ORDER_LOGICAL_NOT) || 'false';
    return [`(!${bool})`, javascriptGenerator.ORDER_LOGICAL_NOT];
  };

  javascriptGenerator.forBlock["logic_operation"] = function (block) {
    const a = javascriptGenerator.valueToCode(block, 'A', javascriptGenerator.ORDER_LOGICAL_AND) || 'false';
    const b = javascriptGenerator.valueToCode(block, 'B', javascriptGenerator.ORDER_LOGICAL_AND) || 'false';
    const operator = block.getFieldValue('OP');
    
    const op = operator === 'AND' ? '&&' : '||';
    const order = operator === 'AND' ? javascriptGenerator.ORDER_LOGICAL_AND : javascriptGenerator.ORDER_LOGICAL_OR;
    
    return [`(${a} ${op} ${b})`, order];
  };

  javascriptGenerator.forBlock["math_number"] = function (block) {
    const num = block.getFieldValue('NUM');
    return [`${num}`, javascriptGenerator.ORDER_ATOMIC];
  };

  javascriptGenerator.forBlock["text"] = function (block) {
    const text = block.getFieldValue('TEXT');
    return [`"${text}"`, javascriptGenerator.ORDER_ATOMIC];
  };

  javascriptGenerator.forBlock["found_monster"] = function (block) {
    return ['foundMonster()', javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["can_move_forward"] = function (block) {
    return ['canMoveForward()', javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["near_pit"] = function (block) {
    return ['nearPit()', javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["at_goal"] = function (block) {
    return ['atGoal()', javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["repeat"] = function (block) {
    const times = block.getFieldValue('TIMES');
    const doCode = javascriptGenerator.statementToCode(block, 'DO');
    return `for (let i = 0; i < ${times}; i++) {\n${doCode}}\n`;
  };

  javascriptGenerator.forBlock["while_loop"] = function (block) {
    const condition = javascriptGenerator.valueToCode(block, 'CONDITION', javascriptGenerator.ORDER_NONE) || 'false';
    const doCode = javascriptGenerator.statementToCode(block, 'DO');
    return `while (${condition}) {\n${doCode}}\n`;
  };

  // ===== COIN COLLECTION BLOCKS =====
  
  Blockly.Blocks["collect_coin"] = {
    init: function () {
      this.appendDummyInput().appendField("🪙 เก็บเหรียญ");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(45);
      this.setTooltip("เก็บเหรียญที่อยู่ใน node เดียวกับตัวละคร");
    },
  };

  Blockly.Blocks["have_coin"] = {
    init: function () {
      this.appendDummyInput().appendField("🪙 มีเหรียญ");
      this.setOutput(true, "Boolean");
      this.setColour(45);
      this.setTooltip("ตรวจสอบว่ามีเหรียญอยู่ใน node เดียวกับตัวละครหรือไม่");
    },
  };

  // ===== COIN SORTING BLOCKS =====
  
  Blockly.Blocks["swap_coins"] = {
    init: function () {
      this.appendValueInput("INDEX1")
        .setCheck("Number")
        .appendField("🔄 สลับเหรียญที่ตำแหน่ง");
      this.appendValueInput("INDEX2")
        .setCheck("Number")
        .appendField("กับตำแหน่ง");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("สลับตำแหน่งเหรียญสองตำแหน่ง");
    },
  };

  Blockly.Blocks["compare_coins"] = {
    init: function () {
      this.appendValueInput("INDEX1")
        .setCheck("Number")
        .appendField("⚖️ เหรียญที่ตำแหน่ง");
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          [">", "GT"],
          ["<", "LT"],
          [">=", "GTE"],
          ["<=", "LTE"],
          ["=", "EQ"],
          ["≠", "NEQ"]
        ]), "OP");
      this.appendValueInput("INDEX2")
        .setCheck("Number")
        .appendField("เหรียญที่ตำแหน่ง");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("เปรียบเทียบค่าเหรียญสองตำแหน่ง");
    },
  };

  Blockly.Blocks["get_coin_value"] = {
    init: function () {
      this.appendValueInput("INDEX")
        .setCheck("Number")
        .appendField("💰 ค่าเหรียญที่ตำแหน่ง");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("ดูค่าเหรียญในตำแหน่งที่กำหนด");
    },
  };

  Blockly.Blocks["coin_count"] = {
    init: function () {
      this.appendDummyInput().appendField("🔢 จำนวนเหรียญทั้งหมด");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("จำนวนเหรียญที่เก็บมาได้");
    },
  };

  Blockly.Blocks["is_sorted"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("✅ เหรียญเรียงลำดับ")
        .appendField(new Blockly.FieldDropdown([
          ["น้อยไปมาก", "ASC"],
          ["มากไปน้อย", "DESC"]
        ]), "ORDER");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("ตรวจสอบว่าเหรียญเรียงลำดับถูกต้องหรือไม่");
    },
  };

  // ===== ADVANCED LOOP BLOCKS =====
  
  Blockly.Blocks["for_each_coin"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🔄 สำหรับแต่ละเหรียญ")
        .appendField(new Blockly.FieldVariable("coin"), "VAR");
      this.appendStatementInput("DO")
        .setCheck(null)
        .appendField("ทำ");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("วนลูปผ่านเหรียญที่เก็บมาทั้งหมด");
      
      // Ensure variable exists on creation
      this.setOnChange(this.onVariableChange.bind(this));
    },
    
    onVariableChange: function(event) {
      // Only handle relevant events
      if (!event || !this.workspace) return;
      
      if (event.type === Blockly.Events.BLOCK_CREATE && event.blockId === this.id) {
        // Block was just created
        setTimeout(() => {
          ensureVariableExists(this, 'VAR', 'coin');
        }, 10);
      } else if (event.type === Blockly.Events.BLOCK_CHANGE && event.blockId === this.id) {
        // Block was changed
        if (event.element === 'field' && event.name === 'VAR') {
          const newValue = event.newValue || 'coin';
          console.log('Variable changed to:', newValue);
          ensureVariableExists(this, 'VAR', newValue);
        }
      }
    }
  };

  Blockly.Blocks["for_index"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🔢 สำหรับ")
        .appendField(new Blockly.FieldVariable("i"), "VAR")
        .appendField("จาก")
        .appendField(new Blockly.FieldNumber(1, 0), "FROM")
        .appendField("ถึง")
        .appendField(new Blockly.FieldNumber(5, 0), "TO");
      this.appendStatementInput("DO")
        .setCheck(null)
        .appendField("ทำ");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("วนลูปด้วย index");
      
      // Ensure variable exists on creation
      this.setOnChange(this.onVariableChange.bind(this));
    },
    
    onVariableChange: function(event) {
      if (!event || !this.workspace) return;
      
      console.log('=== VARIABLE CHANGE EVENT ===');
      console.log('Event type:', event.type);
      console.log('Block ID:', event.blockId);
      console.log('This block ID:', this.id);
      console.log('Event element:', event.element);
      console.log('Event name:', event.name);
      console.log('Event newValue:', event.newValue);
      
      if (event.type === Blockly.Events.BLOCK_CREATE && event.blockId === this.id) {
        console.log('Block created, ensuring variable exists...');
        setTimeout(() => {
          ensureVariableExists(this, 'VAR', 'i');
        }, 10);
      } else if (event.type === Blockly.Events.BLOCK_CHANGE && event.blockId === this.id) {
        if (event.element === 'field' && event.name === 'VAR') {
          const newValue = event.newValue || 'i';
          console.log('Variable field changed to:', newValue);
          ensureVariableExists(this, 'VAR', newValue);
        }
      }
    }
  };

  Blockly.Blocks["for_loop_dynamic"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🔢 สำหรับ")
        .appendField(new Blockly.FieldVariable("i"), "VAR")
        .appendField("จาก");
      this.appendValueInput("FROM")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField("ถึง");
      this.appendValueInput("TO")
        .setCheck("Number");
      this.appendStatementInput("DO")
        .setCheck(null)
        .appendField("ทำ");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("วนลูปด้วยค่าเริ่มต้นและค่าสิ้นสุดที่คำนวณได้");
      
      this.setOnChange(this.onVariableChange.bind(this));
    },
    
    onVariableChange: function(event) {
      if (!event || !this.workspace) return;
      
      console.log('=== VARIABLE CHANGE EVENT ===');
      console.log('Event type:', event.type);
      console.log('Block ID:', event.blockId);
      console.log('This block ID:', this.id);
      console.log('Event element:', event.element);
      console.log('Event name:', event.name);
      console.log('Event newValue:', event.newValue);
      
      if (event.type === Blockly.Events.BLOCK_CREATE && event.blockId === this.id) {
        console.log('Block created, ensuring variable exists...');
        setTimeout(() => {
          ensureVariableExists(this, 'VAR', 'i');
        }, 10);
      } else if (event.type === Blockly.Events.BLOCK_CHANGE && event.blockId === this.id) {
        if (event.element === 'field' && event.name === 'VAR') {
          const newValue = event.newValue || 'i';
          console.log('Variable field changed to:', newValue);
          ensureVariableExists(this, 'VAR', newValue);
        }
      }
    }
  };

  // ===== MATH BLOCKS =====
  

  // Number input block
  Blockly.Blocks["math_number"] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldNumber(0), "NUM");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("ตัวเลข");
    },
  };

  // Math arithmetic block (like the one in the image)
  Blockly.Blocks["math_arithmetic"] = {
    init: function () {
      this.appendValueInput("A")
        .setCheck("Number");
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["+", "ADD"],
          ["-", "MINUS"],
          ["×", "MULTIPLY"],
          ["÷", "DIVIDE"],
          ["%", "MODULO"]
        ]), "OP");
      this.appendValueInput("B")
        .setCheck("Number");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("การคำนวณทางคณิตศาสตร์");
    },
  };

  // JavaScript generator for math_arithmetic block
  javascriptGenerator.forBlock["math_arithmetic"] = function (block) {
    // Safely get values with proper fallbacks
    const a = javascriptGenerator.valueToCode(block, 'A', javascriptGenerator.ORDER_ATOMIC);
    const b = javascriptGenerator.valueToCode(block, 'B', javascriptGenerator.ORDER_ATOMIC);
    const operator = block.getFieldValue('OP');
    
    // Ensure we have valid values
    const valueA = (a && a.trim()) ? a : '0';
    const valueB = (b && b.trim()) ? b : '0';
    
    let op;
    switch (operator) {
      case 'ADD': op = '+'; break;
      case 'MINUS': op = '-'; break;
      case 'MULTIPLY': op = '*'; break;
      case 'DIVIDE': op = '/'; break;
      case 'MODULO': op = '%'; break;
      default: op = '+';
    }
    
    return [`(${valueA} ${op} ${valueB})`, javascriptGenerator.ORDER_ATOMIC];
  };

  Blockly.Blocks["var_math"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🧮 คำนวณ")
        .appendField(new Blockly.FieldVariable("i"), "VAR")
        .appendField(new Blockly.FieldDropdown([
          ["+", "ADD"],
          ["-", "MINUS"],
          ["×", "MULTIPLY"],
          ["÷", "DIVIDE"]
        ]), "OP");
      this.appendValueInput("VALUE")
        .setCheck("Number")
        .appendField("กับ");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("การคำนวณทางคณิตศาสตร์");
      
      this.setOnChange(this.onVariableChange.bind(this));
    },
    
    onVariableChange: function(event) {
      if (!event || !this.workspace) return;
      
      if (event.type === Blockly.Events.BLOCK_CHANGE && event.blockId === this.id) {
        if (event.name === 'VAR') {
          ensureVariableExists(this, 'VAR', 'i');
        }
      }
    }
  };

  Blockly.Blocks["get_var_value"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("📊 ค่าของ")
        .appendField(new Blockly.FieldVariable("i"), "VAR");
      this.setOutput(true, "Number");
      this.setColour(330);
      this.setTooltip("ได้ค่าของตัวแปร");
      
      this.setOnChange(this.onVariableChange.bind(this));
    },
    
    onVariableChange: function(event) {
      if (!event || !this.workspace) return;
      
      console.log('=== VARIABLE CHANGE EVENT ===');
      console.log('Event type:', event.type);
      console.log('Block ID:', event.blockId);
      console.log('This block ID:', this.id);
      console.log('Event element:', event.element);
      console.log('Event name:', event.name);
      console.log('Event newValue:', event.newValue);
      
      if (event.type === Blockly.Events.BLOCK_CREATE && event.blockId === this.id) {
        console.log('Block created, ensuring variable exists...');
        setTimeout(() => {
          ensureVariableExists(this, 'VAR', 'i');
        }, 10);
      } else if (event.type === Blockly.Events.BLOCK_CHANGE && event.blockId === this.id) {
        if (event.element === 'field' && event.name === 'VAR') {
          const newValue = event.newValue || 'i';
          console.log('Variable field changed to:', newValue);
          ensureVariableExists(this, 'VAR', newValue);
        }
      }
    }
  };

  // ===== JAVASCRIPT GENERATORS FOR NEW BLOCKS =====
  
  javascriptGenerator.forBlock["collect_coin"] = function (block) {
    return 'await collectCoin();\n';
  };

  javascriptGenerator.forBlock["have_coin"] = function (block) {
    return ['haveCoin()', javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["swap_coins"] = function (block) {
    const index1 = javascriptGenerator.valueToCode(block, 'INDEX1', javascriptGenerator.ORDER_ATOMIC) || '0';
    const index2 = javascriptGenerator.valueToCode(block, 'INDEX2', javascriptGenerator.ORDER_ATOMIC) || '0';
    return `await swapCoins(${index1}, ${index2});\n`;
  };

  javascriptGenerator.forBlock["compare_coins"] = function (block) {
    const index1 = javascriptGenerator.valueToCode(block, 'INDEX1', javascriptGenerator.ORDER_ATOMIC) || '0';
    const index2 = javascriptGenerator.valueToCode(block, 'INDEX2', javascriptGenerator.ORDER_ATOMIC) || '0';
    const operator = block.getFieldValue('OP');
    return [`compareCoins(${index1}, ${index2}, '${operator}')`, javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["get_coin_value"] = function (block) {
    const index = javascriptGenerator.valueToCode(block, 'INDEX', javascriptGenerator.ORDER_ATOMIC) || '0';
    return [`getCoinValue(${index})`, javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["coin_count"] = function (block) {
    return ['getCoinCount()', javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["is_sorted"] = function (block) {
    const order = block.getFieldValue('ORDER');
    return [`isSorted('${order}')`, javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["for_each_coin"] = function (block) {
    const variable = javascriptGenerator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const branch = javascriptGenerator.statementToCode(block, 'DO');
    
    const code = `
    const coins = getPlayerCoins();
    for (let coinIndex = 0; coinIndex < coins.length; coinIndex++) {
        const ${variable} = coins[coinIndex];
        ${branch}
    }
    `;
    return code;
  };

  javascriptGenerator.forBlock["for_index"] = function (block) {
    const variable = javascriptGenerator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const from = block.getFieldValue('FROM');
    const to = block.getFieldValue('TO');
    const branch = javascriptGenerator.statementToCode(block, 'DO');
    
    const code = `
    for (let ${variable} = ${from}; ${variable} <= ${to}; ${variable}++) {
        ${branch}
    }
    `;
    return code;
  };

  javascriptGenerator.forBlock["for_loop_dynamic"] = function (block) {
    const variable = javascriptGenerator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const from = javascriptGenerator.valueToCode(block, 'FROM', javascriptGenerator.ORDER_ATOMIC) || '0';
    const to = javascriptGenerator.valueToCode(block, 'TO', javascriptGenerator.ORDER_ATOMIC) || '0';
    const branch = javascriptGenerator.statementToCode(block, 'DO');
    
    const code = `
    const fromValue = ${from};
    const toValue = ${to};
    for (let ${variable} = fromValue; ${variable} <= toValue; ${variable}++) {
        ${branch}
    }
    `;
    return code;
  };


  javascriptGenerator.forBlock["math_number"] = function (block) {
    const number = block.getFieldValue('NUM');
    return [number, javascriptGenerator.ORDER_ATOMIC];
  };


  javascriptGenerator.forBlock["var_math"] = function (block) {
    const variable = javascriptGenerator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    const operator = block.getFieldValue('OP');
    const value = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ATOMIC) || '0';
    
    let code;
    switch (operator) {
      case 'ADD':
        code = `${variable} + ${value}`;
        break;
      case 'MINUS':
        code = `${variable} - ${value}`;
        break;
      case 'MULTIPLY':
        code = `${variable} * ${value}`;
        break;
      case 'DIVIDE':
        code = `${variable} / ${value}`;
        break;
      default:
        code = `${variable}`;
    }
    
    return [code, javascriptGenerator.ORDER_ADDITIVE];
  };

  javascriptGenerator.forBlock["get_var_value"] = function (block) {
    const variable = javascriptGenerator.nameDB_.getName(block.getFieldValue('VAR'), Blockly.Names.NameType.VARIABLE);
    return [variable, javascriptGenerator.ORDER_ATOMIC];
  };

  // ===== PERSON RESCUE BLOCKS =====
  
  // Rescue person at specific node block
  Blockly.Blocks["rescue_person_at_node"] = {
    init: function () {
      this.appendValueInput("NODE_ID")
        .setCheck("Number")
        .appendField("🆘 ช่วยคนที่ node");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("ช่วยคนที่ node ที่กำหนด");
    },
  };

  // Has person block
  Blockly.Blocks["has_person"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("👤 มีคนที่ node นี้");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("ตรวจสอบว่ามีคนที่ node นี้หรือไม่");
    },
  };

  // Person rescued block
  Blockly.Blocks["person_rescued"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("✅ คนถูกช่วยแล้ว");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("ตรวจสอบว่าคนที่ node นี้ถูกช่วยแล้วหรือไม่");
    },
  };

  // Person count block
  Blockly.Blocks["person_count"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("📊 จำนวนคนที่ช่วยแล้ว");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("นับจำนวนคนที่ช่วยแล้ว");
    },
  };

  // All people rescued block
  Blockly.Blocks["all_people_rescued"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🎉 ช่วยคนทั้งหมดแล้ว");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("ตรวจสอบว่าช่วยคนทั้งหมดแล้วหรือไม่");
    },
  };

  // For each person block
  Blockly.Blocks["for_each_person"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🔄 สำหรับแต่ละคน");
      this.appendStatementInput("DO")
        .appendField("ทำ");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("วนลูปสำหรับแต่ละคนที่ต้องช่วย");
    },
  };

  // JavaScript generators for person rescue blocks
  javascriptGenerator.forBlock["rescue_person_at_node"] = function (block) {
    const nodeId = javascriptGenerator.valueToCode(block, 'NODE_ID', javascriptGenerator.ORDER_ATOMIC) || '0';
    return `await rescuePersonAtNode(${nodeId});\n`;
  };

  javascriptGenerator.forBlock["has_person"] = function (block) {
    return [`hasPerson()`, javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["person_rescued"] = function (block) {
    return [`personRescued()`, javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["person_count"] = function (block) {
    return [`getPersonCount()`, javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["all_people_rescued"] = function (block) {
    return [`allPeopleRescued()`, javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  javascriptGenerator.forBlock["for_each_person"] = function (block) {
    const statements = javascriptGenerator.statementToCode(block, 'DO');
    return `for (let i = 0; i < 10; i++) {\n${statements}\n}\n`;
  };

  // ===== COMPARISON BLOCKS =====
  
  // Math compare block
  Blockly.Blocks["math_compare"] = {
    init: function () {
      this.appendValueInput("A")
        .setCheck("Number")
        .appendField("เปรียบเทียบ");
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["=", "EQ"],
          ["≠", "NEQ"],
          ["<", "LT"],
          ["≤", "LTE"],
          [">", "GT"],
          ["≥", "GTE"]
        ]), "OP");
      this.appendValueInput("B")
        .setCheck("Number");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("เปรียบเทียบค่าตัวเลขสองค่า");
    },
  };

  // Logic compare block
  Blockly.Blocks["logic_compare"] = {
    init: function () {
      this.appendValueInput("A")
        .setCheck(null);
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["=", "EQ"],
          ["≠", "NEQ"],
          ["<", "LT"],
          ["≤", "LTE"],
          [">", "GT"],
          ["≥", "GTE"]
        ]), "OP");
      this.appendValueInput("B")
        .setCheck(null);
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("เปรียบเทียบค่าสองค่า");
    },
  };

  // Logic boolean block
  Blockly.Blocks["logic_boolean"] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["จริง", "TRUE"],
          ["เท็จ", "FALSE"]
        ]), "BOOL");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("ค่าจริงหรือเท็จ");
    },
  };

  // Logic negate block
  Blockly.Blocks["logic_negate"] = {
    init: function () {
      this.appendValueInput("BOOL")
        .setCheck("Boolean")
        .appendField("ไม่ใช่");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("กลับค่าจริง/เท็จ");
    },
  };

  // Logic operation block
  Blockly.Blocks["logic_operation"] = {
    init: function () {
      this.appendValueInput("A")
        .setCheck("Boolean");
      this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown([
          ["และ", "AND"],
          ["หรือ", "OR"]
        ]), "OP");
      this.appendValueInput("B")
        .setCheck("Boolean");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("การดำเนินการตรรกะ");
    },
  };

  // Math number block
  Blockly.Blocks["math_number"] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldNumber("0"), "NUM");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("ตัวเลข");
    },
  };

  // Text block
  Blockly.Blocks["text"] = {
    init: function () {
      this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput(""), "TEXT");
      this.setOutput(true, "String");
      this.setColour(160);
      this.setTooltip("ข้อความ");
    },
  };

  // ===== STACK BLOCKS =====
  
  // Push node block
  Blockly.Blocks["push_node"] = {
    init: function () {
      this.appendDummyInput().appendField("📚 Push Node");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(300);
      this.setTooltip("เก็บ node ปัจจุบันลงใน stack");
    },
  };

  // Pop node block
  Blockly.Blocks["pop_node"] = {
    init: function () {
      this.appendDummyInput().appendField("📖 Pop Node");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(300);
      this.setTooltip("ดึง node ออกจาก stack และเดินกลับไป");
    },
  };

  // Keep item block
  Blockly.Blocks["keep_item"] = {
    init: function () {
      this.appendDummyInput().appendField("💎 เก็บสมบัติ");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(300);
      this.setTooltip("เก็บสมบัติที่ node ปัจจุบัน");
    },
  };

  // Has treasure block
  Blockly.Blocks["has_treasure"] = {
    init: function () {
      this.appendDummyInput().appendField("💎 มีสมบัติ");
      this.setOutput(true, "Boolean");
      this.setColour(300);
      this.setTooltip("ตรวจสอบว่ามีสมบัติที่ node นี้หรือไม่");
    },
  };

  // Treasure collected block
  Blockly.Blocks["treasure_collected"] = {
    init: function () {
      this.appendDummyInput().appendField("✅ เก็บสมบัติแล้ว");
      this.setOutput(true, "Boolean");
      this.setColour(300);
      this.setTooltip("ตรวจสอบว่าสมบัติถูกเก็บแล้วหรือไม่");
    },
  };

  // Stack empty block
  Blockly.Blocks["stack_empty"] = {
    init: function () {
      this.appendDummyInput().appendField("📚 Stack ว่าง");
      this.setOutput(true, "Boolean");
      this.setColour(300);
      this.setTooltip("ตรวจสอบว่า stack ว่างหรือไม่");
    },
  };

  // Stack count block
  Blockly.Blocks["stack_count"] = {
    init: function () {
      this.appendDummyInput().appendField("🔢 จำนวนใน Stack");
      this.setOutput(true, "Number");
      this.setColour(300);
      this.setTooltip("จำนวน node ที่เก็บใน stack");
    },
  };

  // ===== FUNCTION BLOCKS =====
  
  // Function definition block
  Blockly.Blocks["function_definition"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🔧 ฟังก์ชัน")
        .appendField(new Blockly.FieldTextInput("myFunction"), "FUNCTION_NAME");
      
      // Add argument input
      this.appendValueInput("ARGUMENT")
        .setCheck("Number")
        .appendField("รับค่า");
      
      this.appendStatementInput("FUNCTION_BODY")
        .appendField("ทำ");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip("สร้างฟังก์ชันใหม่ที่รับค่าเป็น argument");
    },
  };

  // Function call block
  Blockly.Blocks["function_call"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("📞 เรียกฟังก์ชัน")
        .appendField(new Blockly.FieldTextInput("myFunction"), "FUNCTION_NAME");
      
      // Add argument input
      this.appendValueInput("ARGUMENT")
        .setCheck("Number")
        .appendField("ส่งค่า");
      
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(290);
      this.setTooltip("เรียกใช้ฟังก์ชันพร้อมส่งค่า argument");
    },
  };

  // Move to node block
  Blockly.Blocks["move_to_node"] = {
    init: function () {
      this.appendValueInput("NODE_ID")
        .setCheck("Number")
        .appendField("🎯 ไปที่ node");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
      this.setTooltip("เดินไปที่ node ที่กำหนด");
    },
  };

  // JavaScript generators for function blocks
  javascriptGenerator.forBlock["function_definition"] = function (block) {
    const functionName = block.getFieldValue('FUNCTION_NAME');
    const argument = javascriptGenerator.valueToCode(block, 'ARGUMENT', javascriptGenerator.ORDER_ATOMIC) || '0';
    const functionBody = javascriptGenerator.statementToCode(block, 'FUNCTION_BODY');
    return `async function ${functionName}(arg) {\n${functionBody}}\n`;
  };

  javascriptGenerator.forBlock["function_call"] = function (block) {
    const functionName = block.getFieldValue('FUNCTION_NAME');
    const argument = javascriptGenerator.valueToCode(block, 'ARGUMENT', javascriptGenerator.ORDER_ATOMIC) || '0';
    return `await ${functionName}(${argument});\n`;
  };

  javascriptGenerator.forBlock["move_to_node"] = function (block) {
    const nodeId = javascriptGenerator.valueToCode(block, 'NODE_ID', javascriptGenerator.ORDER_ATOMIC) || '0';
    return `await moveToNode(${nodeId});\n`;
  };

  // JavaScript generators for stack blocks
  javascriptGenerator.forBlock["push_node"] = function (block) {
    return `await pushNode();\n`;
  };

  javascriptGenerator.forBlock["pop_node"] = function (block) {
    return `await popNode();\n`;
  };

  javascriptGenerator.forBlock["keep_item"] = function (block) {
    return `keepItem();\n`;
  };

  javascriptGenerator.forBlock["has_treasure"] = function (block) {
    return [`hasTreasure()`, javascriptGenerator.ORDER_ATOMIC];
  };

  javascriptGenerator.forBlock["treasure_collected"] = function (block) {
    return [`treasureCollected()`, javascriptGenerator.ORDER_ATOMIC];
  };

  javascriptGenerator.forBlock["stack_empty"] = function (block) {
    return [`stackEmpty()`, javascriptGenerator.ORDER_ATOMIC];
  };

  javascriptGenerator.forBlock["stack_count"] = function (block) {
    return [`stackCount()`, javascriptGenerator.ORDER_ATOMIC];
  };

  // JavaScript generators for comparison blocks
  javascriptGenerator.forBlock["math_compare"] = function (block) {
    const a = javascriptGenerator.valueToCode(block, 'A', javascriptGenerator.ORDER_ATOMIC) || '0';
    const b = javascriptGenerator.valueToCode(block, 'B', javascriptGenerator.ORDER_ATOMIC) || '0';
    const operator = block.getFieldValue('OP');
    
    let op;
    switch (operator) {
      case 'EQ': op = '==='; break;
      case 'NEQ': op = '!=='; break;
      case 'LT': op = '<'; break;
      case 'LTE': op = '<='; break;
      case 'GT': op = '>'; break;
      case 'GTE': op = '>='; break;
      default: op = '===';
    }
    
    return [`(${a} ${op} ${b})`, javascriptGenerator.ORDER_ATOMIC];
  };

  javascriptGenerator.forBlock["logic_boolean"] = function (block) {
    const bool = block.getFieldValue('BOOL');
    return [`${bool === 'TRUE'}`, javascriptGenerator.ORDER_ATOMIC];
  };

  javascriptGenerator.forBlock["logic_negate"] = function (block) {
    const bool = javascriptGenerator.valueToCode(block, 'BOOL', javascriptGenerator.ORDER_LOGICAL_NOT) || 'false';
    return [`(!${bool})`, javascriptGenerator.ORDER_LOGICAL_NOT];
  };

  javascriptGenerator.forBlock["logic_operation"] = function (block) {
    const a = javascriptGenerator.valueToCode(block, 'A', javascriptGenerator.ORDER_LOGICAL_AND) || 'false';
    const b = javascriptGenerator.valueToCode(block, 'B', javascriptGenerator.ORDER_LOGICAL_AND) || 'false';
    const operator = block.getFieldValue('OP');
    
    const op = operator === 'AND' ? '&&' : '||';
    const order = operator === 'AND' ? javascriptGenerator.ORDER_LOGICAL_AND : javascriptGenerator.ORDER_LOGICAL_OR;
    
    return [`(${a} ${op} ${b})`, order];
  };

  javascriptGenerator.forBlock["math_number"] = function (block) {
    const num = block.getFieldValue('NUM');
    return [`${num}`, javascriptGenerator.ORDER_ATOMIC];
  };

  javascriptGenerator.forBlock["text"] = function (block) {
    const text = block.getFieldValue('TEXT');
    return [`"${text}"`, javascriptGenerator.ORDER_ATOMIC];
  };
}

// Create toolbox configuration
export function createToolboxConfig(enabledBlocks) {
  const categories = [];

  // Movement category
  const movementBlocks = [];
  if (enabledBlocks["move_forward"])
    movementBlocks.push({ kind: "block", type: "move_forward" });
  if (enabledBlocks["turn_left"])
    movementBlocks.push({ kind: "block", type: "turn_left" });
  if (enabledBlocks["turn_right"])
    movementBlocks.push({ kind: "block", type: "turn_right" });
  if (enabledBlocks["hit"])
    movementBlocks.push({ kind: "block", type: "hit" });

  if (movementBlocks.length > 0) {
    categories.push({
      kind: "category",
      name: "🚀 การเคลื่อนที่",
      categorystyle: "logic_category",
      contents: movementBlocks,
    });
  }

  // Logic category
  const logicBlocks = [];
  if (enabledBlocks["if_else"])
    logicBlocks.push({ kind: "block", type: "if_else" });
  if (enabledBlocks["if_only"])
    logicBlocks.push({ kind: "block", type: "if_only" });
  if (enabledBlocks["if_return"])
    logicBlocks.push({ kind: "block", type: "if_return" });
  if (enabledBlocks["logic_compare"])
    logicBlocks.push({ kind: "block", type: "logic_compare" });
  if (enabledBlocks["logic_boolean"])
    logicBlocks.push({ kind: "block", type: "logic_boolean" });
  if (enabledBlocks["logic_negate"])
    logicBlocks.push({ kind: "block", type: "logic_negate" });
  if (enabledBlocks["logic_operation"])
    logicBlocks.push({ kind: "block", type: "logic_operation" });

  if (logicBlocks.length > 0) {
    categories.push({
      kind: "category",
      name: "🧠 ตรรกะ",
      categorystyle: "procedure_category",
      contents: logicBlocks,
    });
  }

  // Conditions category
  const conditionBlocks = [];
  if (enabledBlocks["found_monster"])
    conditionBlocks.push({ kind: "block", type: "found_monster" });
  if (enabledBlocks["can_move_forward"])
    conditionBlocks.push({ kind: "block", type: "can_move_forward" });
  if (enabledBlocks["near_pit"])
    conditionBlocks.push({ kind: "block", type: "near_pit" });
  if (enabledBlocks["at_goal"])
    conditionBlocks.push({ kind: "block", type: "at_goal" });

  if (conditionBlocks.length > 0) {
    categories.push({
      kind: "category",
      name: "❓ เงื่อนไข",
      categorystyle: "math_category",
      contents: conditionBlocks,
    });
  }

  // Loops category
  const loopBlocks = [];
  if (enabledBlocks["repeat"])
    loopBlocks.push({ kind: "block", type: "repeat" });
  if (enabledBlocks["while_loop"])
    loopBlocks.push({ kind: "block", type: "while_loop" });
  if (enabledBlocks["for_each_coin"])
    loopBlocks.push({ kind: "block", type: "for_each_coin" });
  if (enabledBlocks["for_index"])
    loopBlocks.push({ kind: "block", type: "for_index" });
  if (enabledBlocks["for_loop_dynamic"])
    loopBlocks.push({ kind: "block", type: "for_loop_dynamic" });

  if (loopBlocks.length > 0) {
    categories.push({
      kind: "category",
      name: "🔄 ลูป",
      categorystyle: "loop_category",
      contents: loopBlocks,
    });
  }

  // Coins category
  const coinBlocks = [];
  if (enabledBlocks["collect_coin"])
    coinBlocks.push({ kind: "block", type: "collect_coin" });
  if (enabledBlocks["have_coin"])
    coinBlocks.push({ kind: "block", type: "have_coin" });

  if (coinBlocks.length > 0) {
    categories.push({
      kind: "category",
      name: "🪙 เหรียญ",
      categorystyle: "text_category",
      contents: coinBlocks,
    });
  }

  // Coin Sorting category
  const coinSortingBlocks = [];
  if (enabledBlocks["swap_coins"])
    coinSortingBlocks.push({ kind: "block", type: "swap_coins" });
  if (enabledBlocks["compare_coins"])
    coinSortingBlocks.push({ kind: "block", type: "compare_coins" });
  if (enabledBlocks["get_coin_value"])
    coinSortingBlocks.push({ kind: "block", type: "get_coin_value" });
  if (enabledBlocks["coin_count"])
    coinSortingBlocks.push({ kind: "block", type: "coin_count" });
  if (enabledBlocks["is_sorted"])
    coinSortingBlocks.push({ kind: "block", type: "is_sorted" });

  if (coinSortingBlocks.length > 0) {
    categories.push({
      kind: "category",
      name: "🔄 เรียงเหรียญ",
      categorystyle: "list_category",
      contents: coinSortingBlocks,
    });
  }

  // Math category
  const mathBlocks = [];
  if (enabledBlocks["math_number"])
    mathBlocks.push({ kind: "block", type: "math_number" });
  if (enabledBlocks["math_arithmetic"])
    mathBlocks.push({ kind: "block", type: "math_arithmetic" });
  if (enabledBlocks["math_compare"])
    mathBlocks.push({ kind: "block", type: "math_compare" });
  if (enabledBlocks["var_math"])
    mathBlocks.push({ kind: "block", type: "var_math" });
  if (enabledBlocks["get_var_value"])
    mathBlocks.push({ kind: "block", type: "get_var_value" });

  if (mathBlocks.length > 0) {
    categories.push({
      kind: "category",
      name: "🧮 คณิตศาสตร์",
      categorystyle: "math_category",
      contents: mathBlocks,
    });
  }

  // Person Rescue category
  const personRescueBlocks = [];
  if (enabledBlocks["rescue_person_at_node"]) personRescueBlocks.push({ kind: "block", type: "rescue_person_at_node" });
  if (enabledBlocks["has_person"]) personRescueBlocks.push({ kind: "block", type: "has_person" });
  if (enabledBlocks["person_rescued"]) personRescueBlocks.push({ kind: "block", type: "person_rescued" });
  if (enabledBlocks["person_count"]) personRescueBlocks.push({ kind: "block", type: "person_count" });
  if (enabledBlocks["all_people_rescued"]) personRescueBlocks.push({ kind: "block", type: "all_people_rescued" });
  if (enabledBlocks["for_each_person"]) personRescueBlocks.push({ kind: "block", type: "for_each_person" });

  if (personRescueBlocks.length > 0) {
    categories.push({
      kind: "category",
      name: "🆘 ช่วยคน",
      categorystyle: "text_category",
      contents: personRescueBlocks,
    });
  }

  // Stack category
  const stackBlocks = [];
  if (enabledBlocks["push_node"]) stackBlocks.push({ kind: "block", type: "push_node" });
  if (enabledBlocks["pop_node"]) stackBlocks.push({ kind: "block", type: "pop_node" });
  if (enabledBlocks["keep_item"]) stackBlocks.push({ kind: "block", type: "keep_item" });
  if (enabledBlocks["has_treasure"]) stackBlocks.push({ kind: "block", type: "has_treasure" });
  if (enabledBlocks["treasure_collected"]) stackBlocks.push({ kind: "block", type: "treasure_collected" });
  if (enabledBlocks["stack_empty"]) stackBlocks.push({ kind: "block", type: "stack_empty" });
  if (enabledBlocks["stack_count"]) stackBlocks.push({ kind: "block", type: "stack_count" });

  if (stackBlocks.length > 0) {
    categories.push({
      kind: "category",
      name: "📚 Stack",
      categorystyle: "procedure_category",
      contents: stackBlocks,
    });
  }

  // Function category
  const functionBlocks = [];
  if (enabledBlocks["function_definition"]) functionBlocks.push({ kind: "block", type: "function_definition" });
  if (enabledBlocks["function_call"]) functionBlocks.push({ kind: "block", type: "function_call" });
  if (enabledBlocks["move_to_node"]) functionBlocks.push({ kind: "block", type: "move_to_node" });

  if (functionBlocks.length > 0) {
    categories.push({
      kind: "category",
      name: "🔧 ฟังก์ชัน",
      categorystyle: "procedure_category",
      contents: functionBlocks,
    });
  }

  return {
    kind: "categoryToolbox",
    contents: categories,
  };
}

// Initialize Blockly workspace
export function initBlockly(containerRef, enabledBlocks) {
  if (!containerRef.current) return null;

  try {
    defineAllBlocks();
    const toolbox = createToolboxConfig(enabledBlocks);

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
      variableMap: true,
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

    const workspace = Blockly.inject(containerRef.current, workspaceConfig);
    return workspace;
  } catch (error) {
    console.error("Error initializing workspace:", error);
    throw new Error("เกิดข้อผิดพลาดในการสร้าง workspace");
  }
}


export async function turnLeft() {
  const currentState = getCurrentGameState();
  if (currentState.goalReached || currentState.moveCount >= currentState.maxMoves || currentState.isGameOver) return;
  await new Promise((resolve) => setTimeout(resolve, 300));
  setCurrentGameState({ direction: (currentState.direction + 3) % 4 });

  updatePlayerWeaponDisplay();
}

export async function turnRight() {
  const currentState = getCurrentGameState();
  if (currentState.goalReached || currentState.moveCount >= currentState.maxMoves || currentState.isGameOver) return;
  await new Promise((resolve) => setTimeout(resolve, 300));
  setCurrentGameState({ direction: (currentState.direction + 1) % 4 });

  updatePlayerWeaponDisplay();
}

// ===== COIN COLLECTION FUNCTIONS =====

export async function collectCoin() {
  const currentState = getCurrentGameState();
  if (currentState.goalReached || currentState.isGameOver) return;
  
  console.log("Collect coin function called");
  await new Promise((resolve) => setTimeout(resolve, 200));
  
  // Get current scene and player position
  const scene = getCurrentScene();
  
  if (scene && scene.player) {
    console.log(`collectCoin called - player at (${scene.player.x}, ${scene.player.y})`);
    const collected = collectCoinByPlayer(scene, scene.player.x, scene.player.y);
    
    if (collected) {
      // collectCoinByPlayer already handled the collection and marking
      // We need to add all collected coins to player coins
      const playerX = scene.player.x;
      const playerY = scene.player.y;
      
      console.log("=== FINDING COLLECTED COINS ===");
      console.log("Player position:", { x: playerX, y: playerY });
      console.log("All coins:", scene.coins.map(c => ({ id: c.id, value: c.value, collected: c.collected, x: c.x, y: c.y })));
      
      // Find all coins that were just collected (within 100 pixels)
      const collectedCoins = scene.coins.filter(coin => {
        if (!coin.collected) return false; // ถูกเก็บแล้ว
        
        const distance = Math.sqrt(
          Math.pow(playerX - coin.x, 2) + Math.pow(playerY - coin.y, 2)
        );
        
        console.log(`Checking coin ${coin.id} (${coin.value}): collected=${coin.collected}, distance=${distance.toFixed(2)}, within range=${distance <= 100}`);
        
        // Only consider coins that are close enough to be collected in this call
        return distance <= 100;
      });
      
      // If no coins found by distance, look for recently collected coins not in inventory
      if (collectedCoins.length === 0) {
        console.log("No coins found by distance, looking for recently collected coins...");
        const recentlyCollected = scene.coins.filter(coin => {
          if (!coin.collected) return false;
          
          // Check if this coin is already in player inventory
          const existingCoins = getPlayerCoins();
          const alreadyInInventory = existingCoins.some(playerCoin => playerCoin.id === coin.id);
          
          console.log(`Coin ${coin.id} (${coin.value}): collected=${coin.collected}, alreadyInInventory=${alreadyInInventory}`);
          return !alreadyInInventory;
        });
        
        collectedCoins.push(...recentlyCollected);
      }
      
      console.log("Found collected coins:", collectedCoins);
      
      // Add all collected coins to player inventory
      for (const collectedCoin of collectedCoins) {
        const existingCoins = getPlayerCoins();
        const alreadyCollected = existingCoins.some(coin => coin.id === collectedCoin.id);
        
        if (!alreadyCollected) {
          addCoinToPlayer({
            id: collectedCoin.id,
            value: collectedCoin.value,
            x: collectedCoin.x,
            y: collectedCoin.y
          });
          console.log(`Coin ${collectedCoin.value} added to player inventory!`);
        } else {
          console.log(`Coin ${collectedCoin.value} already collected, skipping...`);
        }
      }
      
      console.log("Coins collected successfully!");
    } else {
      console.log("No coin to collect at current position");
    }
  }
  
  await new Promise((resolve) => setTimeout(resolve, 300));
  console.log("Collect coin function completed");
}

export function haveCoin() {
  const currentState = getCurrentGameState();
  if (currentState.goalReached || currentState.isGameOver) return false;
  
  console.log("Have coin function called");
  
  // Get current scene and player position
  const scene = getCurrentScene();
  
  if (scene && scene.player) {
    console.log(`haveCoin called - player at (${scene.player.x}, ${scene.player.y})`);
    const hasCoin = haveCoinAtPosition(scene, scene.player.x, scene.player.y);
    console.log(`haveCoin result: ${hasCoin}`);
    return hasCoin;
  }
  
  return false;
}

// ===== COIN SORTING FUNCTIONS =====

export async function swapCoins(index1, index2) {
  const currentState = getCurrentGameState();
  if (currentState.goalReached || currentState.isGameOver) return;
  
  console.log(`Swap coins function called: ${index1} <-> ${index2}`);
  await new Promise((resolve) => setTimeout(resolve, 200));
  
  const success = swapPlayerCoins(index1, index2);
  if (success) {
    console.log(`Swapped coins at positions ${index1} and ${index2}`);
  }
  
  await new Promise((resolve) => setTimeout(resolve, 300));
}

export function compareCoins(index1, index2, operator) {
  return comparePlayerCoins(index1, index2, operator);
}

export function getCoinValue(index) {
  return getPlayerCoinValue(index);
}

export function getCoinCount() {
  return getPlayerCoinCount();
}

export function isSorted(order) {
  return arePlayerCoinsSorted(order);
}

// ===== PERSON RESCUE BLOCKS =====

// Import person rescue functions
import { 
  rescuePerson as gameRescuePerson,
  rescuePersonAtNode as gameRescuePersonAtNode,
  hasPerson as gameHasPerson,
  personRescued as gamePersonRescued,
  getPersonCount as gameGetPersonCount, 
  allPeopleRescued as gameAllPeopleRescued,
  getRescuedPeople as gameGetRescuedPeople,
  clearRescuedPeople as gameClearRescuedPeople,
  resetAllPeople as gameResetAllPeople
} from './gameUtils.js';

// Block definitions for person rescue
export function definePersonRescueBlocks() {

  // Has person block
  Blockly.Blocks["has_person"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("👤 มีคนที่ node นี้");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("ตรวจสอบว่ามีคนที่ node นี้หรือไม่");
    },
  };

  // Person rescued block
  Blockly.Blocks["person_rescued"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("✅ คนถูกช่วยแล้ว");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("ตรวจสอบว่าคนที่ node นี้ถูกช่วยแล้วหรือไม่");
    },
  };

  // Person count block
  Blockly.Blocks["person_count"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("📊 จำนวนคนที่ช่วยแล้ว");
      this.setOutput(true, "Number");
      this.setColour(230);
      this.setTooltip("นับจำนวนคนที่ช่วยแล้ว");
    },
  };

  // All people rescued block
  Blockly.Blocks["all_people_rescued"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🎉 ช่วยคนทั้งหมดแล้ว");
      this.setOutput(true, "Boolean");
      this.setColour(210);
      this.setTooltip("ตรวจสอบว่าช่วยคนทั้งหมดแล้วหรือไม่");
    },
  };

  // For each person block
  Blockly.Blocks["for_each_person"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("🔄 สำหรับแต่ละคน");
      this.appendStatementInput("DO")
        .appendField("ทำ");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip("วนลูปสำหรับแต่ละคนที่ต้องช่วย");
    },
  };
}

// JavaScript generators for person rescue blocks
export function definePersonRescueGenerators() {

  // Has person generator
  javascriptGenerator.forBlock["has_person"] = function (block) {
    return [`hasPerson()`, javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  // Person rescued generator
  javascriptGenerator.forBlock["person_rescued"] = function (block) {
    return [`personRescued()`, javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  // Person count generator
  javascriptGenerator.forBlock["person_count"] = function (block) {
    return [`getPersonCount()`, javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  // All people rescued generator
  javascriptGenerator.forBlock["all_people_rescued"] = function (block) {
    return [`allPeopleRescued()`, javascriptGenerator.ORDER_FUNCTION_CALL];
  };

  // For each person generator
  javascriptGenerator.forBlock["for_each_person"] = function (block) {
    const statements = javascriptGenerator.statementToCode(block, 'DO');
    return `for (let i = 0; i < 10; i++) {\n${statements}\n}\n`;
  };
}

// Export person rescue functions for use in generated code
export function rescuePerson() {
  return gameRescuePerson();
}

export function rescuePersonAtNode(nodeId) {
  return gameRescuePersonAtNode(nodeId);
}

export function hasPerson() {
  return gameHasPerson();
}

export function personRescued() {
  return gamePersonRescued();
}

export function getPersonCount() {
  return gameGetPersonCount();
}

export function allPeopleRescued() {
  return gameAllPeopleRescued();
}

export function getRescuedPeople() {
  return gameGetRescuedPeople();
}

export function clearRescuedPeople() {
  return gameClearRescuedPeople();
}

export function resetAllPeople() {
  return gameResetAllPeople();
}

// ===== MOVE TO NODE FUNCTION =====

// Import moveToNode function from playerMovement
import { moveToNode as phaserMoveToNode } from '../phaser/utils/playerMovement.js';

// Export moveToNode function for use in generated code
export async function moveToNode(targetNodeId) {
  const currentState = getCurrentGameState();
  if (!currentState.currentScene) {
    console.log("No current scene available");
    return false;
  }
  
  const player = currentState.currentScene.player;
  if (!player) {
    console.log("No player found");
    return false;
  }
  
  const result = await phaserMoveToNode(player, targetNodeId);
  
  // อัปเดต currentNodeId และ goalReached ใน game state
  if (result) {
    const levelData = currentState.levelData;
    const goalReached = targetNodeId === levelData.goalNodeId;
    
    setCurrentGameState({ 
      currentNodeId: targetNodeId,
      goalReached: goalReached
    });
    
    console.log(`Updated currentNodeId to: ${targetNodeId}`);
    console.log(`Updated goalReached to: ${goalReached} (goalNodeId: ${levelData.goalNodeId})`);
  }
  
  return result;
}

// ===== STACK OPERATIONS =====

// Import stack functions from gameUtils
import { 
  getStack as gameGetStack,
  pushToStack as gamePushToStack,
  popFromStack as gamePopFromStack,
  isStackEmpty as gameIsStackEmpty,
  getStackCount as gameGetStackCount,
  hasTreasureAtNode as gameHasTreasureAtNode,
  collectTreasure as gameCollectTreasure,
  isTreasureCollected as gameIsTreasureCollected,
  clearStack as gameClearStack
} from './gameUtils';

// Export stack functions for use in generated code
export function getStack() {
  return gameGetStack();
}

export async function pushNode() {
  const currentState = getCurrentGameState();
  const currentNodeId = currentState.currentNodeId;
  console.log(`Pushing node ${currentNodeId} to stack`);
  return await gamePushToStack(currentNodeId);
}

export async function popNode() {
  console.log("Popping node from stack");
  const nodeId = await gamePopFromStack();
  if (nodeId !== null) {
    // เดินไปที่ node ที่ pop ออกมา
    return await moveToNode(nodeId);
  }
  return false;
}

export function keepItem() {
  const currentState = getCurrentGameState();
  const currentNodeId = currentState.currentNodeId;
  console.log(`Collecting treasure at node ${currentNodeId}`);
  return gameCollectTreasure(currentNodeId);
}

export function hasTreasure() {
  const currentState = getCurrentGameState();
  const currentNodeId = currentState.currentNodeId;
  return gameHasTreasureAtNode(currentNodeId);
}

export function treasureCollected() {
  const currentState = getCurrentGameState();
  const currentNodeId = currentState.currentNodeId;
  return gameIsTreasureCollected(currentNodeId);
}

export function stackEmpty() {
  return gameIsStackEmpty();
}

export function stackCount() {
  return gameGetStackCount();
}

export function clearStack() {
  return gameClearStack();
}