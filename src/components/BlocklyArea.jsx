import React from 'react';
import Editor from '@monaco-editor/react';

const BlocklyArea = ({
  blocklyRef,
  blocklyLoaded,
  runCode,
  gameState,
  isRunning,
  isGameOver,
  onDebugToggle,
  debugMode,
  currentLevel,
  codeValidation,
  blocklyJavaScriptReady,
  textCode,
  handleTextCodeChange
}) => {
  return (
    <div className="flex flex-col h-full">

      {/* Blockly Workspace - ปรับขนาดตาม textcode */}
      <div
        ref={blocklyRef}
        className="bg-white shadow-inner blockly-workspace"
        style={{
          // ลดความสูงของ workspace เล็กน้อยเมื่อต้องแสดง textcode ในส่วนปุ่มด้านล่าง
          height: currentLevel?.textcode
            ? "calc(100vh - 400px)"  // เพิ่มพื้นที่สำหรับ textcode
            : "calc(100vh - 180px)",
          width: "100%",
          border: "2px dashed rgba(255,255,255,0.08)"
        }}
      />

      {/* Control Buttons - Compact and prominent */}
      <div className="flex flex-col h-[340px] bg-stone-900 border-t border-gray-600 shadow-lg overflow-y-auto">
        <div className="space-y-1 p-2">
          {currentLevel?.textcode && (
            <div className="border-t border-gray-600 bg-gray-900/95 p-3 mb-2">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-blue-300">📝 Text Code</h3>
                  <p className="text-xs text-gray-400">เขียนโค้ดที่สอดคล้องกับบล็อกด้านบน</p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">JavaScript Code:</label>
                  <div className="border border-gray-600 rounded overflow-hidden">
                    <Editor
                      height="200px"
                      defaultLanguage="javascript"
                      value={textCode}
                      onChange={(value) => handleTextCodeChange(value || '')}
                      theme="vs-dark"
                      onMount={(editor, monaco) => {
                        // เพิ่ม custom functions สำหรับเกม
                        monaco.languages.typescript.javascriptDefaults.addExtraLib(`
                            // Game Functions
                            declare function moveForward(): Promise<void>;
                            declare function turnLeft(): Promise<void>;
                            declare function turnRight(): Promise<void>;
                            declare function hit(): Promise<void>;
                            declare function collectCoin(): Promise<void>;
                            declare function rescuePerson(): Promise<void>;
                            declare function pushNode(): Promise<void>;
                            declare function popNode(): Promise<void>;
                            
                            // Condition Functions
                            declare function foundMonster(): boolean;
                            declare function canMoveForward(): boolean;
                            declare function nearPit(): boolean;
                            declare function atGoal(): boolean;
                            declare function hasPerson(): boolean;
                            declare function hasTreasure(): boolean;
                            declare function hasCoin(): boolean;
                            
                            // Loop Functions
                            declare function forEachCoin(callback: () => Promise<void>): Promise<void>;
                            
                            // Variables
                            declare var coins: number;
                            declare var hp: number;
                            declare var score: number;
                          `, 'file:///game-functions.d.ts');

                        // เพิ่ม auto-completion แบบ dynamic
                        monaco.languages.registerCompletionItemProvider('javascript', {
                          provideCompletionItems: (model, position) => {
                            const word = model.getWordUntilPosition(position);
                            const range = {
                              startLineNumber: position.lineNumber,
                              endLineNumber: position.lineNumber,
                              startColumn: word.startColumn,
                              endColumn: word.endColumn,
                            };

                            const gameFunctions = [
                              { label: 'moveForward', kind: monaco.languages.CompletionItemKind.Function, insertText: 'moveForward()', detail: 'เดินไปข้างหน้า', documentation: 'เดินไปข้างหน้าหนึ่งก้าว', range },
                              { label: 'turnLeft', kind: monaco.languages.CompletionItemKind.Function, insertText: 'turnLeft()', detail: 'เลี้ยวซ้าย', documentation: 'หมุนตัวไปทางซ้าย 90 องศา', range },
                              { label: 'turnRight', kind: monaco.languages.CompletionItemKind.Function, insertText: 'turnRight()', detail: 'เลี้ยวขวา', documentation: 'หมุนตัวไปทางขวา 90 องศา', range },
                              { label: 'hit', kind: monaco.languages.CompletionItemKind.Function, insertText: 'hit()', detail: 'โจมตีศัตรู', documentation: 'โจมตีศัตรูที่อยู่ข้างหน้า', range },
                              { label: 'collectCoin', kind: monaco.languages.CompletionItemKind.Function, insertText: 'collectCoin()', detail: 'เก็บเหรียญ', documentation: 'เก็บเหรียญที่อยู่ตำแหน่งปัจจุบัน', range },
                              { label: 'rescuePerson', kind: monaco.languages.CompletionItemKind.Function, insertText: 'rescuePerson()', detail: 'ช่วยคน', documentation: 'ช่วยคนที่ติดอยู่', range },
                              { label: 'pushNode', kind: monaco.languages.CompletionItemKind.Function, insertText: 'pushNode()', detail: 'เพิ่มตำแหน่งใน stack', documentation: 'เพิ่มตำแหน่งปัจจุบันใน stack', range },
                              { label: 'popNode', kind: monaco.languages.CompletionItemKind.Function, insertText: 'popNode()', detail: 'ลบตำแหน่งจาก stack', documentation: 'ลบตำแหน่งล่าสุดจาก stack', range },
                              { label: 'foundMonster', kind: monaco.languages.CompletionItemKind.Function, insertText: 'foundMonster()', detail: 'ตรวจสอบว่ามีศัตรู', documentation: 'คืนค่า true ถ้ามีศัตรูอยู่ข้างหน้า', range },
                              { label: 'canMoveForward', kind: monaco.languages.CompletionItemKind.Function, insertText: 'canMoveForward()', detail: 'ตรวจสอบว่าสามารถเดินได้', documentation: 'คืนค่า true ถ้าสามารถเดินไปข้างหน้าได้', range },
                              { label: 'nearPit', kind: monaco.languages.CompletionItemKind.Function, insertText: 'nearPit()', detail: 'ตรวจสอบว่าอยู่ใกล้หลุม', documentation: 'คืนค่า true ถ้าอยู่ใกล้หลุม', range },
                              { label: 'atGoal', kind: monaco.languages.CompletionItemKind.Function, insertText: 'atGoal()', detail: 'ตรวจสอบว่าถึงเป้าหมาย', documentation: 'คืนค่า true ถ้าถึงเป้าหมายแล้ว', range },
                              { label: 'hasPerson', kind: monaco.languages.CompletionItemKind.Function, insertText: 'hasPerson()', detail: 'ตรวจสอบว่ามีคน', documentation: 'คืนค่า true ถ้ามีคนที่ต้องการช่วย', range },
                              { label: 'hasTreasure', kind: monaco.languages.CompletionItemKind.Function, insertText: 'hasTreasure()', detail: 'ตรวจสอบว่ามีสมบัติ', documentation: 'คืนค่า true ถ้ามีสมบัติในตำแหน่งปัจจุบัน', range },
                              { label: 'hasCoin', kind: monaco.languages.CompletionItemKind.Function, insertText: 'hasCoin()', detail: 'ตรวจสอบว่ามีเหรียญ', documentation: 'คืนค่า true ถ้ามีเหรียญในตำแหน่งปัจจุบัน', range },
                              { label: 'forEachCoin', kind: monaco.languages.CompletionItemKind.Function, insertText: 'forEachCoin(async () => {\n  \n})', detail: 'วนลูปเหรียญทั้งหมด', documentation: 'วนลูปเหรียญทั้งหมดในด่าน', range }
                            ];

                            const currentWord = word.word.toLowerCase();
                            const filteredFunctions = gameFunctions.filter(func => func.label.toLowerCase().startsWith(currentWord));

                            return { suggestions: filteredFunctions, incomplete: false };
                          },
                          triggerCharacters: ['.', '(']
                        });
                      }}
                      options={{
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                        lineNumbers: 'on',
                        renderLineHighlight: 'line',
                        cursorStyle: 'line',
                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                        suggestOnTriggerCharacters: true,
                        quickSuggestions: true,
                        parameterHints: { enabled: true }
                      }}
                    />
                  </div>
                </div>

                <div className={`p-2 rounded border ${!blocklyJavaScriptReady ? 'bg-yellow-900/50 border-yellow-500 text-yellow-300' : codeValidation.isValid ? 'bg-green-900/50 border-green-500 text-green-300' : 'bg-red-900/50 border-red-500 text-red-300'}`}>
                  <div className="flex items-center gap-2">
                    {!blocklyJavaScriptReady ? (
                      <>
                        <span className="text-yellow-400">⏳</span>
                        <span className="text-xs font-medium">กำลังรอให้ระบบพร้อมใช้งาน...</span>
                      </>
                    ) : codeValidation.isValid ? (
                      <>
                        <span className="text-green-400">✅</span>
                        <span className="text-xs font-medium">Code ถูกต้อง!</span>
                      </>
                    ) : (
                      <>
                        <span className="text-red-400">❌</span>
                        <span className="text-xs font-medium">Code ไม่ตรงกับ Blocks</span>
                      </>
                    )}
                  </div>
                  {codeValidation.message && <div className="text-xs mt-1 opacity-90">{codeValidation.message}</div>}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              console.log("Run button clicked!");
              console.log("runCode function:", typeof runCode);
              console.log("Button disabled state:", {
                gameState,
                blocklyLoaded,
                isRunning,
                isGameOver,
                disabled: gameState === "running" || !blocklyLoaded || isRunning || isGameOver
              });
              runCode();
            }}
            disabled={
              gameState === "running" ||
              !blocklyLoaded ||
              isRunning ||
              isGameOver ||
              (currentLevel?.textcode && !blocklyJavaScriptReady) ||
              (currentLevel?.textcode && !codeValidation?.isValid)
            }
            className="w-full bg-green-500 hover:from-green-600 hover:to-green-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-3 py-1 rounded-lg font-semibold transition-all duration-200 hover:scale-105 disabled:hover:scale-100 shadow-lg disabled:shadow-md text-xs"
          >
            {gameState === "running" ? "กำลังทำงาน..." : "เริ่มเกม"}
          </button>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => window.location.reload()}
              className="bg-red-500 hover:from-red-600 hover:to-red-700 text-white px-2 py-1 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg text-xs"
            >
              🔄 รีเซ็ต
            </button>
            <button
              onClick={onDebugToggle}
              className={`px-2 py-1 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg text-xs ${debugMode
                ? "bg-yellow-500  hover:from-yellow-600 hover:to-yellow-700 text-black"
                : "bg-gray-500 hover:from-gray-600 hover:to-gray-700 text-white"
                }`}
            >
              {debugMode ? "Debug ON" : "Debug OFF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlocklyArea;