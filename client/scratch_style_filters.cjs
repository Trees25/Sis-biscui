const fs = require('fs');
const file = 'f:/Proyectos/Biscui/client/src/views/sucursal/BranchInventoryCheckView.jsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = `<div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>`;
const endStr = `</select>\n        </div>`;
const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
  const block = content.substring(startIndex, endIndex);
  const replacement = `<div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Buscar:</span>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. Chocolate..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 200px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>Categoría:</span>
            <select
              className="form-control"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas las Categorías</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>`;
  content = content.replace(block, replacement);
  fs.writeFileSync(file, content);
  console.log('Successfully styled filters');
} else {
  console.log('Failed to find block');
}
