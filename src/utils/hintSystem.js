// src/utils/hintSystem.js
// ระบบคำใบ้ block ถัดไป (XML-based)

/**
 * หาคำใบ้ block ถัดไปตาม pattern ที่กำลังสร้าง
 * @param {Object} workspace - Blockly workspace
 * @param {Array} goodPatterns - patterns ที่ดีของด่าน
 * @returns {Object} คำใบ้และข้อมูลที่เกี่ยวข้อง
 */
export function getNextBlockHint(workspace, goodPatterns) {
  console.log("🔍 getNextBlockHint called with:", {
    workspace: !!workspace,
    goodPatterns: goodPatterns?.length || 0,
    goodPatternsData: goodPatterns
  });

  if (!workspace || !goodPatterns || goodPatterns.length === 0) {
    console.log("❌ Early return: missing workspace or goodPatterns");
    return {
      hint: "วาง blocks เพื่อเริ่มต้น",
      showHint: false,
      currentStep: 0,
      totalSteps: 0,
      progress: 0
    };
  }

  // 🎯 เรียงลำดับ patterns ตาม pattern_type_id จากน้อยไปมาก (1 = ดีที่สุด)
  const sortedPatterns = [...goodPatterns].sort((a, b) => {
    const typeA = a.pattern_type_id || 999;
    const typeB = b.pattern_type_id || 999;
    return typeA - typeB;
  });

  console.log("🔍 Patterns sorted by pattern_type_id:", sortedPatterns.map(p => ({
    name: p.name,
    pattern_type_id: p.pattern_type_id
  })));

  const currentXml = getWorkspaceXml(workspace);
  console.log("🔍 Current XML from workspace:", currentXml ? "XML found" : "No XML");

  if (!currentXml) {
    console.log("❌ No XML found, returning loading message");
    return {
      hint: "กำลังโหลด workspace...",
      showHint: false,
      currentStep: 0,
      totalSteps: 0,
      progress: 0
    };
  }

  // หา pattern ที่ตรงกับที่กำลังสร้างมากที่สุด (จาก sorted patterns)
  let bestMatch = null;
  let bestMatchScore = 0;

  console.log("🔍 Starting pattern matching with", sortedPatterns.length, "patterns");

  sortedPatterns.forEach((pattern, index) => {
    console.log(`🔍 Checking pattern ${index + 1}: ${pattern.name} (type_id: ${pattern.pattern_type_id})`);
    console.log(`🔍 Pattern XML:`, pattern.xmlpattern?.substring(0, 100) + "...");

    const score = calculateXmlMatchScore(currentXml, pattern.xmlpattern);
    console.log(`🔍 Pattern ${pattern.name} score:`, score);

    if (score > bestMatchScore) {
      bestMatchScore = score;
      bestMatch = pattern;
      console.log(`✅ New best match: ${pattern.name} (type_id: ${pattern.pattern_type_id}) with score ${score}`);
    }
  });

  console.log("🔍 Final best match:", {
    pattern: bestMatch?.name,
    pattern_type_id: bestMatch?.pattern_type_id,
    score: bestMatchScore
  });

  // คำนวณ pattern percentage (ใช้ sorted patterns)
  const patternPercentage = calculatePatternMatchPercentage(workspace, sortedPatterns);
  console.log("🔍 Pattern percentage result:", patternPercentage);

  if (!bestMatch || bestMatchScore === 0) {
    return {
      hint: "ลองเริ่มต้นด้วย move_forward",
      showHint: true,
      currentStep: 0,
      totalSteps: sortedPatterns[0]?.hints?.length || 0,
      progress: 0,
      patternName: null,
      patternPercentage: patternPercentage.percentage,
      bestPattern: patternPercentage.bestPattern
    };
  }

  // หาขั้นตอนปัจจุบันจาก hints
  const currentStep = findCurrentStep(currentXml, bestMatch);
  const totalSteps = bestMatch.hints?.length || 0;
  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  console.log(`🔍 Current step calculation:`, {
    currentStep,
    totalSteps,
    progress,
    patternName: bestMatch.name,
    hasHints: !!bestMatch.hints,
    hintsLength: bestMatch.hints?.length
  });

  // หาคำใบ้สำหรับขั้นตอนปัจจุบัน (ไม่ใช่ขั้นตอนถัดไป)
  let nextHint = "เสร็จแล้ว!";
  let showHint = true;

  if (currentStep > 0 && currentStep <= totalSteps) {
    // แสดง hint จาก step ปัจจุบัน (currentStep - 1)
    const hintData = bestMatch.hints[currentStep - 1];
    console.log(`🔍 Getting hint for step ${currentStep - 1}:`, hintData);

    // รองรับรูปแบบ hint ใหม่
    if (hintData.content) {
      // รูปแบบใหม่: มี content object
      nextHint = hintData.content.question || hintData.content.suggestion || "ลองทำขั้นตอนถัดไป";
      console.log(`✅ Using new format hint: "${nextHint}"`);
    } else {
      // รูปแบบเก่า: มี hint string ตรงๆ
      nextHint = hintData.hint || "ลองทำขั้นตอนถัดไป";
      console.log(`✅ Using old format hint: "${nextHint}"`);
    }
  } else if (currentStep === 0) {
    // ยังไม่ได้เริ่มต้น - แสดง hint แรกของ pattern
    if (bestMatch.hints && bestMatch.hints.length > 0) {
      const firstHint = bestMatch.hints[0];
      if (firstHint.content) {
        nextHint = firstHint.content.question || firstHint.content.suggestion || "ลองเริ่มต้นด้วย move_forward";
      } else {
        nextHint = firstHint.hint || "ลองเริ่มต้นด้วย move_forward";
      }
    } else {
      nextHint = "ลองเริ่มต้นด้วย move_forward";
    }
    showHint = true;
  } else if (currentStep > totalSteps) {
    nextHint = `🎉 Pattern "${bestMatch.name}" เสร็จสมบูรณ์!`;
    showHint = true;
  } else {
    nextHint = "Pattern เสร็จแล้ว! ลองกด Run ดู";
    showHint = false;
  }

  // หา hint data สำหรับขั้นตอนปัจจุบัน
  let currentHintData = null;
  if (currentStep > 0 && currentStep <= totalSteps) {
    // ขั้นตอนที่กำลังทำ
    currentHintData = bestMatch.hints[currentStep - 1];
  } else if (currentStep === 0 && bestMatch.hints && bestMatch.hints.length > 0) {
    // ขั้นตอนเริ่มต้น - แสดง hint แรก
    currentHintData = bestMatch.hints[0];
  }


  return {
    hint: nextHint,
    showHint,
    currentStep,
    totalSteps,
    progress,
    patternName: bestMatch.name,
    isComplete: currentStep >= totalSteps,
    matchScore: bestMatchScore,
    hintData: currentHintData, // เพิ่ม hint data สำหรับ UI ใหม่
    patternPercentage: patternPercentage.percentage,
    bestPattern: patternPercentage.bestPattern
  };
}

/**
 * ดึง XML structure จาก workspace
 */
function getWorkspaceXml(workspace) {
  console.log("🔍 getWorkspaceXml called with:", {
    workspace: !!workspace,
    workspaceType: typeof workspace,
    hasBlockly: !!window.Blockly,
    hasBlocklyXml: !!window.Blockly?.Xml,
    hasWorkspaceToDom: !!window.Blockly?.Xml?.workspaceToDom
  });

  if (!workspace) {
    console.warn("⚠️ workspace is undefined in getWorkspaceXml");
    return null;
  }

  if (!window.Blockly || !window.Blockly.Xml) {
    console.warn("⚠️ Blockly.Xml is not ready yet");
    return null;
  }

  try {
    const xml = window.Blockly.Xml.workspaceToDom(workspace);
    console.log("🔍 XML converted successfully:", xml ? "XML DOM created" : "No XML DOM");
    return xml;
  } catch (err) {
    console.error("⚠️ Error converting workspace to XML:", err);
    return null;
  }
}


/**
 * คำนวณคะแนนความตรงกันของ XML pattern
 */
function calculateXmlMatchScore(currentXml, targetXmlString) {
  console.log("🔍 calculateXmlMatchScore called with:", {
    currentXml: !!currentXml,
    targetXmlString: targetXmlString?.substring(0, 100) + "..."
  });

  if (!currentXml || !targetXmlString) {
    console.log("❌ Missing XML data, returning 0");
    return 0;
  }

  try {
    const parser = new DOMParser();
    const targetXml = parser.parseFromString(targetXmlString, 'text/xml');
    console.log("🔍 Target XML parsed successfully");

    // เปรียบเทียบ structure
    const score = compareXmlStructure(currentXml, targetXml);
    console.log("🔍 XML comparison score:", score);
    return score;
  } catch (error) {
    console.error("Error parsing XML:", error);
    return 0;
  }
}

/**
 * เปรียบเทียบ XML structure แบบ recursive
 */
function compareXmlStructure(currentNode, targetNode, depth = 0) {
  console.log(`${'  '.repeat(depth)}🔍 compareXmlStructure depth ${depth}`);

  let score = 0;
  const maxDepth = 10; // ป้องกัน infinite loop

  if (depth > maxDepth) {
    console.log(`${'  '.repeat(depth)}❌ Max depth reached, returning 0`);
    return score;
  }

  // เช็ค block type ตรงกันหรือไม่
  const currentBlocks = currentNode.querySelectorAll(':scope > block');
  const targetBlocks = targetNode.querySelectorAll(':scope > block');

  console.log(`${'  '.repeat(depth)}🔍 Found ${currentBlocks.length} current blocks, ${targetBlocks.length} target blocks`);

  const minLength = Math.min(currentBlocks.length, targetBlocks.length);

  for (let i = 0; i < minLength; i++) {
    const currentType = currentBlocks[i].getAttribute('type');
    const targetType = targetBlocks[i].getAttribute('type');

    console.log(`${'  '.repeat(depth)}🔍 Block ${i}: ${currentType} vs ${targetType}`);

    if (currentType === targetType) {
      score += 10; // คะแนนสำหรับ block ที่ตรง
      console.log(`${'  '.repeat(depth)}✅ Block types match! Score: ${score}`);

      // เช็ค nested blocks ข้างใน (เช่น if, repeat, while)
      const currentStatement = currentBlocks[i].querySelector('statement');
      const targetStatement = targetBlocks[i].querySelector('statement');

      if (currentStatement && targetStatement) {
        console.log(`${'  '.repeat(depth)}🔍 Checking statement blocks...`);
        score += compareXmlStructure(currentStatement, targetStatement, depth + 1);
      }

      // เช็ค next blocks
      const currentNext = currentBlocks[i].querySelector(':scope > next');
      const targetNext = targetBlocks[i].querySelector(':scope > next');

      if (currentNext && targetNext) {
        console.log(`${'  '.repeat(depth)}🔍 Checking next blocks...`);
        score += compareXmlStructure(currentNext, targetNext, depth + 1);
      }
    } else {
      console.log(`${'  '.repeat(depth)}❌ Block types don't match, stopping comparison`);
      break; // ถ้า block ไม่ตรงกัน หยุดเช็ค
    }
  }

  console.log(`${'  '.repeat(depth)}🔍 Final score at depth ${depth}: ${score}`);
  return score;
}

/**
 * หาขั้นตอนปัจจุบันจาก hints
 */
function findCurrentStep(currentXml, pattern) {
  if (!pattern.hints || pattern.hints.length === 0) return 0;

  try {
    const parser = new DOMParser();
    let currentStep = 0;

    console.log(`🔍 Finding current step for pattern: ${pattern.name}`);
    console.log(`📄 Current XML:`, new XMLSerializer().serializeToString(currentXml));

    // วิเคราะห์ structure ปัจจุบัน
    const currentAnalysis = analyzeXmlStructure(currentXml);
    console.log(`🔍 Current structure analysis:`, currentAnalysis);

    for (let i = 0; i < pattern.hints.length; i++) {
      const hintXml = pattern.hints[i].xmlCheck;
      if (!hintXml) continue;

      const targetXml = parser.parseFromString(hintXml, 'text/xml');

      const hintText = pattern.hints[i].content?.question || pattern.hints[i].content?.suggestion || `Step ${i + 1}`;
      console.log(`\n🔍 Checking step ${i}: ${hintText}`);
      console.log(`📄 Target XML:`, hintXml);

      // วิเคราะห์ target structure
      const targetAnalysis = analyzeXmlStructure(targetXml);
      console.log(`🔍 Target structure analysis:`, targetAnalysis);

      // ใช้ flexible matching
      console.log(`🔍 Checking if step ${i} XML matches current workspace...`);
      const matches = isXmlStructureMatch(currentXml, targetXml);
      console.log(`🔍 Step ${i} match result:`, matches);

      if (matches) {
        currentStep = i + 1; // ขั้นตอนถัดไป
        console.log(`✅ Step ${i} matches! Current step is now ${currentStep}`);
      } else {
        console.log(`❌ Step ${i} doesn't match. Stopping here.`);
        break; // หยุดที่ขั้นตอนแรกที่ไม่ตรง
      }
    }

    console.log(`\n🎯 Final current step: ${currentStep} / ${pattern.hints.length}`);
    return currentStep;
  } catch (error) {
    console.error("Error finding current step:", error);
    return 0;
  }
}

/**
 * คำนวณเปอร์เซ็นต์การตรงกับ pattern
 */
export function calculatePatternMatchPercentage(workspace, goodPatterns) {
  console.log("🔍 calculatePatternMatchPercentage called:");
  console.log("  - workspace:", !!workspace);
  console.log("  - goodPatterns:", goodPatterns?.length || 0);

  if (!workspace || !goodPatterns || goodPatterns.length === 0) {
    console.log("  - No workspace or patterns, returning 0%");
    return { percentage: 0, bestPattern: null, matchedBlocks: 0, totalBlocks: 0 };
  }

  // 🎯 เรียงลำดับ patterns ตาม pattern_type_id จากน้อยไปมาก (1 = ดีที่สุด)
  const sortedPatterns = [...goodPatterns].sort((a, b) => {
    const typeA = a.pattern_type_id || 999;
    const typeB = b.pattern_type_id || 999;
    return typeA - typeB;
  });

  console.log("🔍 Patterns sorted by pattern_type_id:", sortedPatterns.map(p => ({
    name: p.name,
    pattern_type_id: p.pattern_type_id
  })));

  const currentXml = getWorkspaceXml(workspace);
  console.log("  - currentXml:", currentXml);

  if (!currentXml) {
    console.log("  - No current XML, returning 0%");
    return { percentage: 0, bestPattern: null, matchedBlocks: 0, totalBlocks: 0 };
  }

  let bestMatch = null;
  let bestPercentage = 0;
  let bestMatchedBlocks = 0;
  let bestTotalBlocks = 0;

  for (const pattern of sortedPatterns) {
    console.log(`🔍 Checking pattern: ${pattern.name} (type_id: ${pattern.pattern_type_id})`);
    console.log(`  - xmlPattern:`, pattern.xmlpattern);

    if (!pattern.xmlpattern) {
      console.log(`  - No xmlPattern, skipping`);
      continue;
    }

    try {
      const parser = new DOMParser();
      const targetXml = parser.parseFromString(pattern.xmlpattern, 'text/xml');

      // วิเคราะห์ structure ของทั้งสอง
      const currentAnalysis = analyzeXmlStructure(currentXml);
      const targetAnalysis = analyzeXmlStructure(targetXml);

      console.log(`  - currentAnalysis:`, currentAnalysis);
      console.log(`  - targetAnalysis:`, targetAnalysis);

      // คำนวณเปอร์เซ็นต์การตรงกัน
      const currentBlocks = currentAnalysis.length;
      const targetBlocks = targetAnalysis.length;

      console.log(`  - currentBlocks: ${currentBlocks}, targetBlocks: ${targetBlocks}`);

      if (targetBlocks === 0) {
        console.log(`  - No target blocks, skipping`);
        continue;
      }

      // นับ blocks ที่ตรงกัน
      // นับ blocks ที่ตรงกัน
      let matchedBlocks = 0;
      let hasUnmatchedBlock = false; // เพิ่ม flag เพื่อตรวจสอบว่ามี block ที่ไม่ตรงหรือไม่
      const minBlocks = Math.min(currentBlocks, targetBlocks);

      for (let i = 0; i < minBlocks; i++) {
        if (currentAnalysis[i] && targetAnalysis[i] &&
          currentAnalysis[i].type === targetAnalysis[i].type) {
          matchedBlocks++;
        } else {
          hasUnmatchedBlock = true; // พบ block ที่ไม่ตรง
          break; // หยุดเมื่อเจอ block ที่ไม่ตรง
        }
      }

      // ถ้ามี block ที่ไม่ตรง ให้คิด percentage เป็น 0
      // เพื่อไม่ให้ pattern ที่ไม่ตรงแล้วมาแข่งกับ pattern ที่ตรง
      let percentage;
      if (hasUnmatchedBlock) {
        percentage = 0;
        console.log(`  - Pattern mismatch detected, setting percentage to 0%`);
      } else {
        percentage = Math.round((matchedBlocks / targetBlocks) * 100);
      }

      console.log(`  - matchedBlocks: ${matchedBlocks}, hasUnmatchedBlock: ${hasUnmatchedBlock}, percentage: ${percentage}%`);

      // 🎯 เลือก pattern แรกที่มี percentage > 0 (เพราะเรียงตาม type_id แล้ว)
      // หรือเลือก pattern ที่มี percentage สูงกว่าและ type_id ดีกว่า
      if (percentage > 0 && !bestMatch) {
        // เลือก pattern แรกที่ match (เพราะเรียงตาม type_id แล้ว)
        console.log(`  - First match! percentage: ${percentage}%, type_id: ${pattern.pattern_type_id}`);
        bestPercentage = percentage;
        bestMatch = pattern;
        bestMatchedBlocks = matchedBlocks;
        bestTotalBlocks = targetBlocks;
      } else if (percentage > bestPercentage) {
        // อัปเดตถ้า percentage สูงกว่าและ type_id เท่ากันหรือดีกว่า
        const currentTypeId = pattern.pattern_type_id || 999;
        const bestTypeId = bestMatch?.pattern_type_id || 999;

        if (currentTypeId <= bestTypeId) {
          console.log(`  - Better match! percentage: ${percentage}%, type_id: ${pattern.pattern_type_id}`);
          bestPercentage = percentage;
          bestMatch = pattern;
          bestMatchedBlocks = matchedBlocks;
          bestTotalBlocks = targetBlocks;
        }
      }
    } catch (error) {
      console.error("Error calculating pattern match:", error);
    }
  }

  console.log("🔍 Final result:", {
    percentage: bestPercentage,
    bestPattern: bestMatch?.name,
    bestPatternWeaponKey: bestMatch?.weaponKey,
    matchedBlocks: bestMatchedBlocks,
    totalBlocks: bestTotalBlocks
  });

  return {
    percentage: bestPercentage,
    bestPattern: bestMatch,
    matchedBlocks: bestMatchedBlocks,
    totalBlocks: bestTotalBlocks
  };
}

/**
 * ตรวจสอบว่า pattern ตรงกับ XML เฉลยหรือไม่
 */
export function checkPatternMatch(workspace, goodPatterns) {
  console.log("🔍 checkPatternMatch called");

  // 🎯 เรียงลำดับ patterns ตาม pattern_type_id จากน้อยไปมาก (1 = ดีที่สุด)
  const sortedPatterns = [...goodPatterns].sort((a, b) => {
    const typeA = a.pattern_type_id || 999;
    const typeB = b.pattern_type_id || 999;
    return typeA - typeB;
  });

  console.log("🔍 Patterns sorted by pattern_type_id:", sortedPatterns.map(p => ({
    name: p.name,
    pattern_type_id: p.pattern_type_id
  })));

  const currentXml = getWorkspaceXml(workspace);
  console.log("📄 current XML:", new XMLSerializer().serializeToString(currentXml));
  console.log("🔍 sortedPatterns:", sortedPatterns);

  // ตรวจสอบ xmlPattern โดยตรงก่อน (ไม่ต้องพึ่ง hints) - ใช้ sorted patterns
  for (const pattern of sortedPatterns) {
    console.log(`🔍 Checking exact match for pattern: ${pattern.name} (type_id: ${pattern.pattern_type_id})`);
    if (pattern.xmlpattern && checkExactXmlMatch(currentXml, pattern.xmlpattern)) {
      console.log("🔍 EXACT MATCH FOUND with xmlPattern!");
      return {
        matched: true,
        pattern: pattern,
        weaponKey: pattern.weaponKey
      };
    }
  }

  // ถ้าไม่มี xmlPattern หรือไม่ตรง ให้ตรวจสอบแบบ hints - ใช้ sorted patterns
  for (const pattern of sortedPatterns) {
    console.log(`🔍 Checking hints match for pattern: ${pattern.name} (type_id: ${pattern.pattern_type_id})`);
    const currentStep = findCurrentStep(currentXml, pattern);
    const totalSteps = pattern.hints?.length || 0;

    // ถ้ายังไม่ครบทุกขั้น ไม่ต้องเช็ค exact match
    if (currentStep < totalSteps) continue;

    if (checkExactXmlMatch(currentXml, pattern.xmlpattern)) {
      console.log("🔍 EXACT MATCH FOUND with hints!");
      return {
        matched: true,
        pattern: pattern,
        weaponKey: pattern.weaponKey
      };
    }
  }

  console.log("🔍 NO EXACT MATCH FOUND");
  return {
    matched: false,
    pattern: null,
    weaponKey: null
  };
}

/**
 * เช็คว่า XML ตรงกันแบบ exact หรือไม่
 */
function checkExactXmlMatch(currentXml, targetXmlString) {
  if (!currentXml || !targetXmlString) return false;

  try {
    const parser = new DOMParser();
    const targetXml = parser.parseFromString(targetXmlString, 'text/xml');

    return isXmlStructureEqual(currentXml, targetXml);
  } catch (error) {
    console.error("Error checking exact match:", error);
    return false;
  }
}

/**
 * เปรียบเทียบ XML structure แบบยืดหยุ่น (flexible matching)
 */
function isXmlStructureMatch(currentXml, targetXml, depth = 0) {
  if (!currentXml || !targetXml) {
    console.log(`${'  '.repeat(depth)}❌ One of the nodes is null`);
    return false;
  }

  const indent = '  '.repeat(depth);

  // ดึง blocks แรกของแต่ละ XML
  const currentBlocks = currentXml.querySelectorAll(':scope > block');
  const targetBlocks = targetXml.querySelectorAll(':scope > block');

  if (currentBlocks.length === 0 || targetBlocks.length === 0) {
    console.log(`${indent}❌ One of the XMLs has no blocks`);
    return false;
  }

  console.log(`${indent}🔍 Checking first blocks: ${currentBlocks[0]?.getAttribute('type')} vs ${targetBlocks[0]?.getAttribute('type')}`);

  // เปรียบเทียบ block แรก
  const currentFirstBlock = currentBlocks[0];
  const targetFirstBlock = targetBlocks[0];

  const currentType = currentFirstBlock.getAttribute('type');
  const targetType = targetFirstBlock.getAttribute('type');

  if (currentType !== targetType) {
    console.log(`${indent}❌ First block types don't match: ${currentType} vs ${targetType}`);
    return false;
  }

  // เช็ค next blocks แบบ recursive
  const currentNext = currentFirstBlock.querySelector(':scope > next');
  const targetNext = targetFirstBlock.querySelector(':scope > next');

  if (targetNext && !currentNext) {
    console.log(`${indent}❌ Target has next block but current doesn't`);
    return false;
  }

  if (targetNext && currentNext) {
    console.log(`${indent}🔍 Checking next blocks recursively...`);
    return isXmlStructureMatch(currentNext, targetNext, depth + 1);
  }

  // เช็ค statement blocks
  const currentStatement = currentFirstBlock.querySelector('statement');
  const targetStatement = targetFirstBlock.querySelector('statement');

  if (targetStatement && !currentStatement) {
    console.log(`${indent}❌ Target has statement but current doesn't`);
    return false;
  }

  if (targetStatement && currentStatement) {
    console.log(`${indent}🔍 Checking statement blocks...`);
    if (!isXmlStructureMatch(currentStatement, targetStatement, depth + 1)) {
      return false;
    }
  }

  // เช็ค value blocks
  const currentValues = currentFirstBlock.querySelectorAll('value');
  const targetValues = targetFirstBlock.querySelectorAll('value');

  if (targetValues.length > 0) {
    console.log(`${indent}🔍 Checking ${targetValues.length} value blocks...`);

    for (let i = 0; i < targetValues.length; i++) {
      const targetValue = targetValues[i];
      const currentValue = currentValues[i];

      if (!currentValue) {
        console.log(`${indent}❌ Missing value block ${i}`);
        return false;
      }

      const targetValueBlock = targetValue.querySelector('block');
      const currentValueBlock = currentValue.querySelector('block');

      if (targetValueBlock && !currentValueBlock) {
        console.log(`${indent}❌ Missing block in value ${i}`);
        return false;
      }

      if (targetValueBlock && currentValueBlock) {
        const targetValueType = targetValueBlock.getAttribute('type');
        const currentValueType = currentValueBlock.getAttribute('type');

        if (targetValueType !== currentValueType) {
          console.log(`${indent}❌ Value block ${i} types don't match: ${currentValueType} vs ${targetValueType}`);
          return false;
        }
      }
    }
  }

  console.log(`${indent}✅ Structure matches at depth ${depth}`);
  return true;
}

/**
 * เปรียบเทียบ XML structure แบบ exact พร้อม debug logging
 */
function isXmlStructureEqual(node1, node2, depth = 0) {
  if (!node1 || !node2) {
    console.log(`${'  '.repeat(depth)}❌ One of the nodes is null`);
    return false;
  }

  const indent = '  '.repeat(depth);

  // เช็ค blocks ทั้งหมด
  const blocks1 = node1.querySelectorAll(':scope > block');
  const blocks2 = node2.querySelectorAll(':scope > block');

  console.log(`${indent}🔍 Comparing ${blocks1.length} vs ${blocks2.length} blocks`);

  if (blocks1.length !== blocks2.length) {
    console.log(`${indent}❌ Different number of blocks: ${blocks1.length} vs ${blocks2.length}`);
    return false;
  }

  for (let i = 0; i < blocks1.length; i++) {
    const type1 = blocks1[i].getAttribute('type');
    const type2 = blocks2[i].getAttribute('type');

    console.log(`${indent}🔍 Block ${i}: ${type1} vs ${type2}`);

    if (type1 !== type2) {
      console.log(`${indent}❌ Block types don't match: ${type1} vs ${type2}`);
      return false;
    }

    // เช็ค statement blocks (blocks ข้างใน if, repeat, etc.)
    const statement1 = blocks1[i].querySelector('statement');
    const statement2 = blocks2[i].querySelector('statement');

    console.log(`${indent}🔍 Statement blocks: ${statement1 ? 'present' : 'missing'} vs ${statement2 ? 'present' : 'missing'}`);

    if ((statement1 && !statement2) || (!statement1 && statement2)) {
      console.log(`${indent}❌ Statement blocks mismatch`);
      return false;
    }

    if (statement1 && statement2) {
      console.log(`${indent}🔍 Checking statement content...`);
      if (!isXmlStructureEqual(statement1, statement2, depth + 1)) {
        console.log(`${indent}❌ Statement content doesn't match`);
        return false;
      }
    }

    // เช็ค value blocks (condition ใน if, จำนวนรอบใน repeat)
    const values1 = blocks1[i].querySelectorAll('value');
    const values2 = blocks2[i].querySelectorAll('value');

    console.log(`${indent}🔍 Value blocks: ${values1.length} vs ${values2.length}`);

    if (values1.length !== values2.length) {
      console.log(`${indent}❌ Different number of value blocks: ${values1.length} vs ${values2.length}`);
      return false;
    }

    for (let j = 0; j < values1.length; j++) {
      const valueBlock1 = values1[j].querySelector('block');
      const valueBlock2 = values2[j].querySelector('block');

      console.log(`${indent}🔍 Value ${j}: ${valueBlock1?.getAttribute('type') || 'missing'} vs ${valueBlock2?.getAttribute('type') || 'missing'}`);

      if ((valueBlock1 && !valueBlock2) || (!valueBlock1 && valueBlock2)) {
        console.log(`${indent}❌ Value block ${j} presence mismatch`);
        return false;
      }

      if (valueBlock1 && valueBlock2) {
        const valueType1 = valueBlock1.getAttribute('type');
        const valueType2 = valueBlock2.getAttribute('type');

        if (valueType1 !== valueType2) {
          console.log(`${indent}❌ Value block ${j} types don't match: ${valueType1} vs ${valueType2}`);
          return false;
        }
      }
    }

    // เช็ค next blocks
    const next1 = blocks1[i].querySelector(':scope > next');
    const next2 = blocks2[i].querySelector(':scope > next');

    console.log(`${indent}🔍 Next blocks: ${next1 ? 'present' : 'missing'} vs ${next2 ? 'present' : 'missing'}`);

    if ((next1 && !next2) || (!next1 && next2)) {
      console.log(`${indent}❌ Next blocks mismatch`);
      return false;
    }

    if (next1 && next2) {
      console.log(`${indent}🔍 Checking next content...`);
      if (!isXmlStructureEqual(next1, next2, depth + 1)) {
        console.log(`${indent}❌ Next content doesn't match`);
        return false;
      }
    }
  }

  console.log(`${indent}✅ All blocks match at depth ${depth}`);
  return true;
}

/**
 * วิเคราะห์ XML structure แบบละเอียด
 */
export function analyzeXmlStructure(xml) {
  if (!xml) return "No XML provided";

  const blocks = xml.querySelectorAll('block');
  const analysis = [];

  blocks.forEach((block, index) => {
    const type = block.getAttribute('type');
    const blockInfo = {
      index,
      type,
      hasStatement: !!block.querySelector('statement'),
      hasValue: !!block.querySelector('value'),
      hasNext: !!block.querySelector(':scope > next')
    };

    // วิเคราะห์ statement blocks
    if (blockInfo.hasStatement) {
      const statementBlocks = block.querySelectorAll('statement block');
      blockInfo.statementBlocks = Array.from(statementBlocks).map(b => b.getAttribute('type'));
    }

    // วิเคราะห์ value blocks
    if (blockInfo.hasValue) {
      const valueBlocks = block.querySelectorAll('value block');
      blockInfo.valueBlocks = Array.from(valueBlocks).map(b => b.getAttribute('type'));
    }

    analysis.push(blockInfo);
  });

  return analysis;
}

/**
 * ตรวจสอบว่า text code ตรงกับ blocks หรือไม่
 */
export function validateTextCode(textCode, workspace) {
  try {
    if (!textCode.trim()) {
      return {
        isValid: false,
        message: "กรุณาเขียนโค้ด"
      };
    }

    // ตรวจสอบว่า workspace มีอยู่และมี blocks
    if (!workspace || !workspace.getAllBlocks || workspace.getAllBlocks().length === 0) {
      return {
        isValid: false,
        message: "ไม่มี blocks ใน workspace"
      };
    }

    // ตรวจสอบว่า Blockly มีอยู่
    if (!window.Blockly) {
      console.warn("Blockly ไม่พร้อมใช้งาน");
      return {
        isValid: false,
        message: "ระบบแปลงโค้ดยังไม่พร้อมใช้งาน"
      };
    }

    // แสดงข้อมูล blocks ที่วางไว้
    console.log("📦 Blocks in workspace:");
    const allBlocks = workspace.getAllBlocks();
    allBlocks.forEach((block, index) => {
      console.log(`Block ${index}:`, {
        type: block.type,
        id: block.id,
        nextConnection: block.nextConnection ? "has next" : "no next",
        previousConnection: block.previousConnection ? "has previous" : "no previous"
      });
    });

    // แปลง blocks เป็นโครงสร้างที่เข้าใจได้
    const blockStructure = convertBlocksToStructure(allBlocks);
    console.log("🏗️ Block structure:", blockStructure);

    // แปลง text code เป็นโครงสร้างที่เข้าใจได้
    const codeStructure = convertTextCodeToStructure(textCode);
    console.log("🏗️ Code structure:", codeStructure);

    // เปรียบเทียบโครงสร้าง
    const isValid = compareStructures(blockStructure, codeStructure);
    console.log("🔍 Structure comparison result:", isValid);

    if (isValid) {
      return {
        isValid: true,
        message: "โค้ดตรงกับ blocks แล้ว!"
      };
    } else {
      return {
        isValid: false,
        message: "โค้ดไม่ตรงกับ blocks ที่วางไว้"
      };
    }

  } catch (error) {
    console.error("Error validating text code:", error);
    return {
      isValid: false,
      message: `เกิดข้อผิดพลาดในการตรวจสอบโค้ด: ${error.message}`
    };
  }
}

/**
 * แปลง blocks เป็นโครงสร้างที่เข้าใจได้
 */
function convertBlocksToStructure(blocks) {
  // หา root block (block ที่ไม่มี previous connection ที่เชื่อมต่อกับ block อื่น)
  const rootBlock = blocks.find(block => {
    // ไม่มี previous connection หรือ previous connection ไม่เชื่อมต่อกับ block อื่น
    const hasNoPrevious = !block.previousConnection;
    const hasUnconnectedPrevious = block.previousConnection && !block.previousConnection.targetBlock();

    // ไม่ใช่ value block
    const isNotValueBlock = !block.outputConnection &&
      block.type !== 'found_monster' &&
      block.type !== 'can_move_forward' &&
      block.type !== 'can_turn_left' &&
      block.type !== 'can_turn_right';

    return (hasNoPrevious || hasUnconnectedPrevious) && isNotValueBlock;
  });

  if (!rootBlock) {
    console.log("❌ No root block found, trying alternative method...");

    // วิธีสำรอง: หา block แรกที่ไม่ใช่ value block
    const alternativeRoot = blocks.find(block =>
      !block.outputConnection &&
      block.type !== 'found_monster' &&
      block.type !== 'can_move_forward' &&
      block.type !== 'can_turn_left' &&
      block.type !== 'can_turn_right'
    );

    if (alternativeRoot) {
      console.log("🎯 Alternative root block found:", alternativeRoot.type);
      return convertBlocksToStructureFromRoot(alternativeRoot);
    }

    console.log("❌ No suitable root block found");
    return [];
  }

  console.log("🎯 Root block found:", rootBlock.type);
  return convertBlocksToStructureFromRoot(rootBlock);
}

/**
 * แปลง blocks เป็นโครงสร้างจาก root block
 */
function convertBlocksToStructureFromRoot(rootBlock) {
  const structure = [];
  let currentBlock = rootBlock;

  while (currentBlock) {
    const blockInfo = {
      type: currentBlock.type,
      hasNext: !!currentBlock.nextConnection
    };

    // ตรวจสอบ statement blocks (เช่น if block)
    if (currentBlock.getInputTargetBlock) {
      const doBlock = currentBlock.getInputTargetBlock('DO');
      if (doBlock) {
        console.log(`🔍 Found statement block in ${currentBlock.type}:`, doBlock.type);
        blockInfo.statement = convertBlocksToStructureFromRoot(doBlock);
      }
    }

    // ตรวจสอบ value blocks (เช่น condition)
    if (currentBlock.getInputTargetBlock) {
      const conditionBlock = currentBlock.getInputTargetBlock('CONDITION');
      if (conditionBlock) {
        console.log(`🔍 Found condition block in ${currentBlock.type}:`, conditionBlock.type);
        blockInfo.condition = {
          type: conditionBlock.type
        };
      }
    }

    structure.push(blockInfo);
    console.log(`📝 Added block to structure:`, blockInfo);

    // ไปยัง block ถัดไป
    if (currentBlock.nextConnection && currentBlock.nextConnection.targetBlock()) {
      currentBlock = currentBlock.nextConnection.targetBlock();
    } else {
      currentBlock = null;
    }
  }

  return structure;
}

/**
 * แปลง text code เป็นโครงสร้างที่เข้าใจได้
 * รองรับบล็อกทั้งหมดที่มีใน database
 */
function convertTextCodeToStructure(textCode) {
  const lines = textCode.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('//'));
  const structure = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ===== MOVEMENT BLOCKS =====
    if (line.includes('await moveForward()')) {
      structure.push({ type: 'move_forward', hasNext: true });
    } 
    else if (line.includes('await turnLeft()')) {
      structure.push({ type: 'turn_left', hasNext: true });
    } 
    else if (line.includes('await turnRight()')) {
      structure.push({ type: 'turn_right', hasNext: true });
    } 
    else if (line.includes('await hit()')) {
      structure.push({ type: 'hit', hasNext: true });
    }
    
    // ===== COIN BLOCKS =====
    else if (line.includes('await collectCoin()')) {
      structure.push({ type: 'collect_coin', hasNext: true });
    }
    
    // ===== PERSON RESCUE BLOCKS =====
    else if (line.includes('await rescuePerson()')) {
      structure.push({ type: 'rescue_person', hasNext: true });
    }
    else if (line.includes('await rescuePersonAtNode(')) {
      const match = line.match(/rescuePersonAtNode\((\d+)\)/);
      const nodeId = match ? parseInt(match[1]) : 0;
      structure.push({ 
        type: 'rescue_person_at_node', 
        hasNext: true,
        nodeId: nodeId
      });
    }
    
    // ===== CONDITION BLOCKS =====
    else if (line.includes('if (foundMonster())')) {
      structure.push(parseIfBlock(lines, i, 'found_monster'));
      i = skipIfBlock(lines, i);
    }
    else if (line.includes('if (canMoveForward())')) {
      structure.push(parseIfBlock(lines, i, 'can_move_forward'));
      i = skipIfBlock(lines, i);
    }
    else if (line.includes('if (nearPit())')) {
      structure.push(parseIfBlock(lines, i, 'near_pit'));
      i = skipIfBlock(lines, i);
    }
    else if (line.includes('if (atGoal())')) {
      structure.push(parseIfBlock(lines, i, 'at_goal'));
      i = skipIfBlock(lines, i);
    }
    else if (line.includes('if (hasPerson())')) {
      structure.push(parseIfBlock(lines, i, 'has_person'));
      i = skipIfBlock(lines, i);
    }
    else if (line.includes('if (hasTreasure())')) {
      structure.push(parseIfBlock(lines, i, 'has_treasure'));
      i = skipIfBlock(lines, i);
    }
    else if (line.includes('if (haveCoin())')) {
      structure.push(parseIfBlock(lines, i, 'has_coin'));
      i = skipIfBlock(lines, i);
    }
    
    // ===== IF-ELSE BLOCKS =====
    else if (line.startsWith('if (') && !line.includes('foundMonster') && !line.includes('canMove')) {
      const hasElse = checkIfHasElse(lines, i);
      if (hasElse) {
        structure.push(parseIfElseBlock(lines, i));
      } else {
        structure.push(parseIfOnlyBlock(lines, i));
      }
      i = skipIfBlock(lines, i);
    }
    
    // ===== LOOP BLOCKS =====
    else {
      // Support `repeat(n) { ... }` syntax (user-friendly repeat)
      const repeatMatch = line.match(/repeat\s*\(\s*(\d+)\s*\)\s*\{/);
      if (repeatMatch) {
        const times = parseInt(repeatMatch[1], 10);
        structure.push(parseLoopBlock(lines, i, 'repeat', times));
        i = skipLoopBlock(lines, i);
        continue;
      }
      // More flexible for-loop detection: support `let|const|var`, any iterator name, `<` or `<=`, and numeric limit
      const forHeaderMatch = line.match(/for\s*\(\s*(?:let|const|var)\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*(<|<=)\s*(\d+)\s*;/);
      if (forHeaderMatch) {
        const varName = forHeaderMatch[1];
        const start = parseInt(forHeaderMatch[2], 10);
        const operator = forHeaderMatch[3];
        const limit = parseInt(forHeaderMatch[4], 10);
        // Calculate how many iterations the for-loop will run when bounds are numeric
        const times = operator === '<' ? Math.max(0, limit - start) : Math.max(0, limit - start + 1);
        structure.push(parseLoopBlock(lines, i, 'repeat', times));
        i = skipLoopBlock(lines, i);
        continue;
      }
      else if (line.includes('while (')) {
      const match = line.match(/while \((.*?)\)/);
      const condition = match ? match[1] : '';
      structure.push(parseLoopBlock(lines, i, 'while_loop', null, condition));
      i = skipLoopBlock(lines, i);
    }
    }
    // Note: other for-index patterns (e.g., <= with different formatting) will be covered by the flexible regex above
  }

  return structure;
}

/**
 * Parse if block with condition
 */
function parseIfBlock(lines, startIndex, conditionType) {
  const ifBlock = { 
    type: 'if_only', 
    hasNext: true,
    condition: { type: conditionType }
  };

  // หา statement blocks ข้างใน if
  const statementBlocks = [];
  let braceCount = 0;
  let foundOpenBrace = false;

  for (let j = startIndex; j < lines.length; j++) {
    const currentLine = lines[j];

    if (currentLine.includes('{')) {
      braceCount++;
      foundOpenBrace = true;
    }
    if (currentLine.includes('}')) {
      braceCount--;
    }

    if (foundOpenBrace && braceCount > 0 && j > startIndex) {
      // Parse statements inside if block
      if (currentLine.includes('await moveForward()')) {
        statementBlocks.push({ type: 'move_forward', hasNext: true });
      } else if (currentLine.includes('await hit()')) {
        statementBlocks.push({ type: 'hit', hasNext: true });
      } else if (currentLine.includes('await turnLeft()')) {
        statementBlocks.push({ type: 'turn_left', hasNext: true });
      } else if (currentLine.includes('await turnRight()')) {
        statementBlocks.push({ type: 'turn_right', hasNext: true });
      } else if (currentLine.includes('await collectCoin()')) {
        statementBlocks.push({ type: 'collect_coin', hasNext: true });
      } else if (currentLine.includes('await rescuePerson()')) {
        statementBlocks.push({ type: 'rescue_person', hasNext: true });
      }
    }

    if (foundOpenBrace && braceCount === 0) {
      break;
    }
  }

  ifBlock.statement = statementBlocks;
  return ifBlock;
}

/**
 * Parse if-else block
 */
function parseIfElseBlock(lines, startIndex) {
  const ifElseBlock = { 
    type: 'if_else', 
    hasNext: true
  };

  // Parse condition
  const conditionMatch = lines[startIndex].match(/if \((.*?)\)/);
  ifElseBlock.condition = conditionMatch ? conditionMatch[1] : '';

  // Parse if statements
  const ifStatements = [];
  const elseStatements = [];
  let braceCount = 0;
  let foundElse = false;
  let foundOpenBrace = false;

  for (let j = startIndex; j < lines.length; j++) {
    const currentLine = lines[j];

    if (currentLine.includes('{')) {
      braceCount++;
      foundOpenBrace = true;
    }
    if (currentLine.includes('}')) {
      braceCount--;
    }

    if (currentLine.includes('else') && braceCount === 0) {
      foundElse = true;
      continue;
    }

    if (foundOpenBrace && braceCount > 0 && j > startIndex) {
      const statement = parseStatement(currentLine);
      if (statement) {
        if (foundElse) {
          elseStatements.push(statement);
        } else {
          ifStatements.push(statement);
        }
      }
    }

    if (foundOpenBrace && braceCount === 0 && foundElse) {
      break;
    }
  }

  ifElseBlock.ifStatements = ifStatements;
  ifElseBlock.elseStatements = elseStatements;
  return ifElseBlock;
}

/**
 * Parse if-only block
 */
function parseIfOnlyBlock(lines, startIndex) {
  const ifBlock = { 
    type: 'if_only', 
    hasNext: true
  };

  // Parse condition
  const conditionMatch = lines[startIndex].match(/if \((.*?)\)/);
  ifBlock.condition = conditionMatch ? conditionMatch[1] : '';

  // Parse statements
  const statements = [];
  let braceCount = 0;
  let foundOpenBrace = false;

  for (let j = startIndex; j < lines.length; j++) {
    const currentLine = lines[j];

    if (currentLine.includes('{')) {
      braceCount++;
      foundOpenBrace = true;
    }
    if (currentLine.includes('}')) {
      braceCount--;
    }

    if (foundOpenBrace && braceCount > 0 && j > startIndex) {
      // Support nested control structures inside loops (if / if-else / other loops)
      if (currentLine.startsWith('if (')) {
        // Determine if it's an if-else or if-only and parse accordingly
        const hasElse = checkIfHasElse(lines, j);
        const parsedIf = hasElse ? parseIfElseBlock(lines, j) : parseIfOnlyBlock(lines, j);
        statements.push(parsedIf);
        // Skip the inner if block lines
        j = skipIfBlock(lines, j);
        continue;
      }

      // Fallback to single-statement parsing (moveForward, hit, turn, etc.)
      const statement = parseStatement(currentLine);
      if (statement) {
        statements.push(statement);
      }
    }

    if (foundOpenBrace && braceCount === 0) {
      break;
    }
  }

  ifBlock.statement = statements;
  return ifBlock;
}

/**
 * Parse loop block (repeat/while)
 */
function parseLoopBlock(lines, startIndex, loopType, times = null, condition = null) {
  const loopBlock = { 
    type: loopType, 
    hasNext: true
  };

  if (times !== null) {
    loopBlock.times = times;
  }
  if (condition !== null) {
    loopBlock.condition = condition;
  }

  // Parse statements inside loop
  const statements = [];
  let braceCount = 0;
  let foundOpenBrace = false;

  for (let j = startIndex; j < lines.length; j++) {
    const currentLine = lines[j];

    if (currentLine.includes('{')) {
      braceCount++;
      foundOpenBrace = true;
    }
    if (currentLine.includes('}')) {
      braceCount--;
    }

    if (foundOpenBrace && braceCount > 0 && j > startIndex) {
      // Support nested control structures inside loops (if / if-else / other loops)
      if (currentLine.startsWith('if (')) {
        const hasElse = checkIfHasElse(lines, j);
        const parsedIf = hasElse ? parseIfElseBlock(lines, j) : parseIfOnlyBlock(lines, j);
        statements.push(parsedIf);
        // Skip inner if block
        j = skipIfBlock(lines, j);
        continue;
      }

      // Nested repeat(n) { ... }
      const nestedRepeat = currentLine.match(/repeat\s*\(\s*(\d+)\s*\)\s*\{/);
      if (nestedRepeat) {
        const nestedTimes = parseInt(nestedRepeat[1], 10);
        statements.push(parseLoopBlock(lines, j, 'repeat', nestedTimes));
        j = skipLoopBlock(lines, j);
        continue;
      }

      // Nested for(...) with numeric bounds
      const nestedFor = currentLine.match(/for\s*\(\s*(?:let|const|var)\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*(<|<=)\s*(\d+)\s*;/);
      if (nestedFor) {
        const nestedStart = parseInt(nestedFor[2], 10);
        const nestedOp = nestedFor[3];
        const nestedLimit = parseInt(nestedFor[4], 10);
        const nestedTimes = nestedOp === '<' ? Math.max(0, nestedLimit - nestedStart) : Math.max(0, nestedLimit - nestedStart + 1);
        statements.push(parseLoopBlock(lines, j, 'repeat', nestedTimes));
        j = skipLoopBlock(lines, j);
        continue;
      }

      // Nested while(...) { ... }
      const nestedWhile = currentLine.match(/while\s*\((.*?)\)/);
      if (nestedWhile && currentLine.includes('{')) {
        const nestedCond = nestedWhile[1];
        statements.push(parseLoopBlock(lines, j, 'while_loop', null, nestedCond));
        j = skipLoopBlock(lines, j);
        continue;
      }

      // Fallback to single-statement parsing (moveForward, hit, turn, etc.)
      const statement = parseStatement(currentLine);
      if (statement) {
        statements.push(statement);
      }
    }

    if (foundOpenBrace && braceCount === 0) {
      break;
    }
  }

  loopBlock.statement = statements;
  return loopBlock;
}

/**
 * Parse for-index block
 */
function parseForIndexBlock(lines, startIndex, varName, from, to) {
  const forBlock = { 
    type: 'for_index', 
    hasNext: true,
    variable: varName,
    from: from,
    to: to
  };

  // Parse statements inside for loop
  const statements = [];
  let braceCount = 0;
  let foundOpenBrace = false;

  for (let j = startIndex; j < lines.length; j++) {
    const currentLine = lines[j];

    if (currentLine.includes('{')) {
      braceCount++;
      foundOpenBrace = true;
    }
    if (currentLine.includes('}')) {
      braceCount--;
    }

    if (foundOpenBrace && braceCount > 0 && j > startIndex) {
      const statement = parseStatement(currentLine);
      if (statement) {
        statements.push(statement);
      }
    }

    if (foundOpenBrace && braceCount === 0) {
      break;
    }
  }

  forBlock.statement = statements;
  return forBlock;
}

/**
 * Parse single statement
 */
function parseStatement(line) {
  if (line.includes('await moveForward()')) {
    return { type: 'move_forward', hasNext: true };
  } else if (line.includes('await turnLeft()')) {
    return { type: 'turn_left', hasNext: true };
  } else if (line.includes('await turnRight()')) {
    return { type: 'turn_right', hasNext: true };
  } else if (line.includes('await hit()')) {
    return { type: 'hit', hasNext: true };
  } else if (line.includes('await collectCoin()')) {
    return { type: 'collect_coin', hasNext: true };
  } else if (line.includes('await rescuePerson()')) {
    return { type: 'rescue_person', hasNext: true };
  }
  return null;
}

/**
 * ตรวจสอบว่า if block มี else หรือไม่
 */
function checkIfHasElse(lines, startIndex) {
  let braceCount = 0;
  let foundOpenBrace = false;

  for (let j = startIndex; j < lines.length; j++) {
    const currentLine = lines[j];

    if (currentLine.includes('{')) {
      braceCount++;
      foundOpenBrace = true;
    }
    if (currentLine.includes('}')) {
      braceCount--;
    }

    if (foundOpenBrace && braceCount === 0) {
      // Check if next line is else
      if (j + 1 < lines.length && lines[j + 1].includes('else')) {
        return true;
      }
      return false;
    }
  }
  return false;
}

/**
 * ข้าม if block
 */
function skipIfBlock(lines, startIndex) {
  let braceCount = 0;
  let foundOpenBrace = false;

  for (let j = startIndex; j < lines.length; j++) {
    const currentLine = lines[j];

    if (currentLine.includes('{')) {
      braceCount++;
      foundOpenBrace = true;
    }
    if (currentLine.includes('}')) {
      braceCount--;
    }

    if (foundOpenBrace && braceCount === 0) {
      // Check if next line is else
      if (j + 1 < lines.length && lines[j + 1].includes('else')) {
        // Skip else block too
        return skipElseBlock(lines, j + 1);
      }
      return j;
    }
  }
  return startIndex;
}

/**
 * ข้าม else block
 */
function skipElseBlock(lines, startIndex) {
  let braceCount = 0;
  let foundOpenBrace = false;

  for (let j = startIndex; j < lines.length; j++) {
    const currentLine = lines[j];

    if (currentLine.includes('{')) {
      braceCount++;
      foundOpenBrace = true;
    }
    if (currentLine.includes('}')) {
      braceCount--;
    }

    if (foundOpenBrace && braceCount === 0) {
      return j;
    }
  }
  return startIndex;
}

/**
 * ข้าม loop block
 */
function skipLoopBlock(lines, startIndex) {
  let braceCount = 0;
  let foundOpenBrace = false;

  for (let j = startIndex; j < lines.length; j++) {
    const currentLine = lines[j];

    if (currentLine.includes('{')) {
      braceCount++;
      foundOpenBrace = true;
    }
    if (currentLine.includes('}')) {
      braceCount--;
    }

    if (foundOpenBrace && braceCount === 0) {
      return j;
    }
  }
  return startIndex;
}

/**
 * เปรียบเทียบโครงสร้าง blocks และ code
 */
function compareStructures(blockStructure, codeStructure) {
  if (blockStructure.length !== codeStructure.length) {
    console.log("❌ Different lengths:", blockStructure.length, "vs", codeStructure.length);
    return false;
  }

  for (let i = 0; i < blockStructure.length; i++) {
    const block = blockStructure[i];
    const code = codeStructure[i];

    if (block.type !== code.type) {
      console.log(`❌ Different types at ${i}:`, block.type, "vs", code.type);
      return false;
    }

    // ตรวจสอบ statement blocks
    if (block.statement && code.statement) {
      if (!compareStructures(block.statement, code.statement)) {
        console.log(`❌ Different statements at ${i}`);
        return false;
      }
    } else if (block.statement !== code.statement) {
      console.log(`❌ Different statement presence at ${i}`);
      return false;
    }

    // ตรวจสอบ condition blocks
    if (block.condition && code.condition) {
      if (block.condition.type !== code.condition.type) {
        console.log(`❌ Different conditions at ${i}:`, block.condition.type, "vs", code.condition.type);
        return false;
      }
    } else if (block.condition !== code.condition) {
      console.log(`❌ Different condition presence at ${i}`);
      return false;
    }
  }

  console.log("✅ Structures match!");
  return true;
}

/**
 * แสดงผลรางวัลแบบ real-time
 */
export function showRealTimeReward(scene, weaponData, patternName) {
  if (!scene || !weaponData) return;

  // สร้างข้อความรางวัล
  const rewardText = scene.add.text(600, 200,
    `🎁 ได้รับรางวัล!\n${weaponData.name}\nPattern: ${patternName}`,
    {
      fontSize: '24px',
      fill: '#FFD700',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center'
    }
  ).setOrigin(0.5);

  // เอฟเฟกต์การแสดงผล
  rewardText.setScale(0);
  scene.tweens.add({
    targets: rewardText,
    scaleX: 1,
    scaleY: 1,
    duration: 500,
    ease: 'Back.easeOut'
  });

  // หายไปหลังจาก 3 วินาที
  scene.time.delayedCall(3000, () => {
    scene.tweens.add({
      targets: rewardText,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        rewardText.destroy();
      }
    });
  });
}