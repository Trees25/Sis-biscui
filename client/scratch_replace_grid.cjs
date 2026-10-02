const fs = require('fs');
const file = 'f:/Proyectos/Biscui/client/src/components/modals/OrderDetailModal.jsx';
let content = fs.readFileSync(file, 'utf8');
const startIndex = content.indexOf('                <div className="items-selection-grid"');
const endIndex = content.indexOf('                <button className="btn btn-success" onClick={handleConfirmReceive}');
if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find block');
    process.exit(1);
}
const oldBlock = content.substring(startIndex, endIndex);
content = content.replace(oldBlock, '\n');
fs.writeFileSync(file, content);
console.log('Replaced successfully');
