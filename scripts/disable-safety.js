const fs = require('fs');
const path = require('path');

// Read the chat routes file
const chatRoutesPath = path.join(__dirname, '../server/routes/chat.js');
let content = fs.readFileSync(chatRoutesPath, 'utf8');

// Replace all safety check conditions to be much more lenient
content = content.replace(
  /if \(safetyCheck\.flagged\) \{/g,
  'if (safetyCheck.flagged && safetyCheck.confidence > 0.95) {'
);

// Write back the file
fs.writeFileSync(chatRoutesPath, content);

console.log('✅ Safety checks disabled - only extremely suspicious content will be flagged');
console.log('🔄 Please restart the server for changes to take effect');