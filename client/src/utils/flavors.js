export const flavorGroups = {
  'Dulces de leche': ['Chocotorta', 'Dulce de Leche Biscui', 'Rogel', 'Granizado', 'Coco crunch'],
  'Chocolate': ['Chocolate con almendras', 'Marquise', 'Alfajor', 'Black', 'Patagonia', 'Blanco con maracuyá', 'Dubai'],
  'Cremas': ['Frutilla condensada', 'Coquitas', 'Mascarpone', 'Tiramisú', 'Lemon pie', 'Oreo', 'Menta granizada', 'Snickers', 'Caramel Macchiato', 'Tramontana', 'Cinnamon roll', 'Vainilla french', 'Oreo sin TACC', 'Granizado'],
  'Sin gluten': ['Oreo sin TACC (Sin Gluten)', 'Granizado (Sin Gluten)', 'Frutilla condensada (Sin Gluten)', 'Mascarpone (Sin Gluten)', 'Pistacho (Sin Gluten)', 'Banana split (Sin Gluten)', 'Sambayon (Sin Gluten)'],
  'Frutales al agua': ['Limonada', 'Frutilla citrica', 'Durazno y kiwi', 'Pasion frutal']
};

export const getFlavorName = (fullName) => {
  if (!fullName) return '';
  return fullName
    .replace(/^Vasqueta /, '')
    .replace(/^Balde /, '')
    .replace(/ \(5-6kg\)$/, '')
    .replace(/ \(4kg\)$/, '')
    .replace(/ \(8kg\)$/, '')
    .replace(/ 5k$/, '')
    .replace(/ 10k$/, '')
    .replace(/ \(5k\)$/, '')
    .replace(/ \(10k\)$/, '')
    .replace(/ 5L$/i, '')
    .replace(/ 10L$/i, '')
    .replace(/ \(5L\)$/i, '')
    .replace(/ \(10L\)$/i);
};

export const getFlavorGroup = (fullName) => {
  const flavor = getFlavorName(fullName);
  for (const [group, flavorsList] of Object.entries(flavorGroups)) {
    if (flavorsList.includes(flavor)) {
      return group;
    }
  }
  return 'Otros';
};
