const fs = require('fs');
const file = 'f:/Proyectos/Biscui/client/src/App.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('AdminAuditView')) {
    content = content.replace(
        "import AdminProjectionsView from './views/admin/AdminProjectionsView';",
        "import AdminProjectionsView from './views/admin/AdminProjectionsView';\nimport AdminAuditView from './views/admin/AdminAuditView';"
    );
}
if (!content.includes('BranchInventoryCheckView')) {
    content = content.replace(
        "import BranchConsumptionView from './views/sucursal/BranchConsumptionView';",
        "import BranchConsumptionView from './views/sucursal/BranchConsumptionView';\nimport BranchInventoryCheckView from './views/sucursal/BranchInventoryCheckView';"
    );
}

fs.writeFileSync(file, content);
console.log('Imports added successfully');
