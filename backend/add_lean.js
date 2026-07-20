const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'controllers');
const files = fs.readdirSync(controllersDir);

files.forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(controllersDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace instances where we fetch lists of documents to add .lean()
    
    // Pattern: .sort({ ... });
    // Replace with: .sort({ ... }).lean();
    // Only if it doesn't already have lean() and is part of a find chain.
    let newContent = content.replace(/(\.find\([^)]*\)[^;]*\.sort\([^)]*\));/g, (match, p1) => {
        if (!p1.includes('.lean()')) {
            return p1 + '.lean();';
        }
        return match;
    });

    // Pattern: .populate(...);
    newContent = newContent.replace(/(\.find\([^)]*\)[^;]*\.populate\([^)]*\));/g, (match, p1) => {
        if (!p1.includes('.lean()') && !p1.includes('.sort')) {
            return p1 + '.lean();';
        }
        return match;
    });
    
    // Pattern: .find(...);
    newContent = newContent.replace(/(await [A-Z][a-zA-Z]+\.find\([^)]*\));/g, (match, p1) => {
        if (!p1.includes('.lean()') && !p1.includes('.populate') && !p1.includes('.sort')) {
            return p1 + '.lean();';
        }
        return match;
    });

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Updated ${file} with .lean()`);
    }
}
});
