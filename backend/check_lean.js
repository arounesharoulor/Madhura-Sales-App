const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'controllers');
const files = fs.readdirSync(controllersDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(controllersDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Simple regex to add .lean() before .sort or at the end of find/populate chains
    // A better approach is to find all occurrences of:
    // .find(...) or .populate(...) or .sort(...) and ensure .lean() is added
    // But since it's a bit complex, let's just do a manual replacement if needed.
    
    // Actually, replacing `.sort({ createdAt: -1 });` with `.sort({ createdAt: -1 }).lean();`
    // is a good start. Also `.populate(...);` to `.populate(...).lean();`
    // Let's just do it manually for safety or carefully with regex.

    const matches = content.match(/\.find\([^)]*\)(?:\.populate\([^)]*\))*(?:\.sort\([^)]*\))*(?!.*\.lean\(\))/g);
    if (matches) {
      console.log(`Found missing lean() in ${file}`);
    }
  }
});
