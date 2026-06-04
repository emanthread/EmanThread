const fs = require('fs');
const file = 'd:\\Eman Thread\\app\\account\\measurements\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import for UnifiedLayoutEngine
if (!content.includes('UnifiedLayoutEngine')) {
  content = content.replace(
    'import { useState, useEffect } from "react";',
    'import { useState, useEffect } from "react";\nimport { UnifiedLayoutEngine } from "@/components/measurements/UnifiedLayoutEngine";'
  );
}

const startStr = '{/* Main Form Body */}';
const endStr = '</div>\n        )}';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.log("Could not find bounds");
  process.exit(1);
}

const replacement = `{/* Main Form Body */}
            <UnifiedLayoutEngine 
              gender={gender}
              measurements={measurements as Record<string, string>}
              stylingPrefs={stylingPrefs}
              notes={notes}
              setM={setM}
              setS={setS}
              setNotes={setNotes}
              readOnly={false}
            />
          `;

const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync(file, newContent);
console.log("Updated page.tsx successfully");
