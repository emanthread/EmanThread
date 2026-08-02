// Diagnostic script: check CatalogNode state in DB
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== CatalogNode Diagnostic ===\n');

  const total = await prisma.catalogNode.count();
  console.log(`Total CatalogNodes in DB: ${total}`);

  const active = await prisma.catalogNode.count({ where: { isActive: true } });
  const visible = await prisma.catalogNode.count({ where: { isVisible: true } });
  const activeAndVisible = await prisma.catalogNode.count({ where: { isActive: true, isVisible: true } });

  console.log(`  isActive = true:  ${active}`);
  console.log(`  isVisible = true: ${visible}`);
  console.log(`  isActive AND isVisible = true: ${activeAndVisible}`);

  // Show sample of top-level nodes (parentId = null)
  const topLevel = await prisma.catalogNode.findMany({
    where: { parentId: null },
    select: { id: true, label: true, path: true, isActive: true, isVisible: true, nodeType: true },
    orderBy: { displayOrder: 'asc' },
  });

  console.log('\n--- Top-level nodes (parentId = null) ---');
  for (const n of topLevel) {
    console.log(`  [${n.nodeType}] "${n.label}" | path: ${n.path} | isActive: ${n.isActive} | isVisible: ${n.isVisible}`);
  }

  // Show nodes that have the path starting with /women or /men
  console.log('\n--- Nodes with path starting /women ---');
  const womenNodes = await prisma.catalogNode.findMany({
    where: { path: { startsWith: '/women' } },
    select: { id: true, label: true, path: true, isActive: true, isVisible: true },
    orderBy: { path: 'asc' },
    take: 15,
  });
  for (const n of womenNodes) {
    console.log(`  "${n.label}" | ${n.path} | active:${n.isActive} visible:${n.isVisible}`);
  }

  console.log('\n--- Nodes with path starting /men ---');
  const menNodes = await prisma.catalogNode.findMany({
    where: { path: { startsWith: '/men' } },
    select: { id: true, label: true, path: true, isActive: true, isVisible: true },
    orderBy: { path: 'asc' },
    take: 15,
  });
  for (const n of menNodes) {
    console.log(`  "${n.label}" | ${n.path} | active:${n.isActive} visible:${n.isVisible}`);
  }

  // Check for nodes that are visible but whose parent is NOT visible (broken hierarchy)
  console.log('\n--- Checking for broken visibility hierarchies ---');
  const allNodes = await prisma.catalogNode.findMany({
    select: { id: true, parentId: true, label: true, path: true, isActive: true, isVisible: true },
  });
  const nodeMap = new Map(allNodes.map(n => [n.id, n]));
  const broken = allNodes.filter(n => {
    if (!n.parentId) return false; // root, skip
    const parent = nodeMap.get(n.parentId);
    if (!parent) return true; // orphan
    // If this node is visible & active, but parent isn't => broken
    return (n.isVisible && n.isActive) && (!parent.isVisible || !parent.isActive);
  });
  if (broken.length === 0) {
    console.log('  No broken hierarchies found.');
  } else {
    console.log(`  Found ${broken.length} nodes with broken parent chain:`);
    for (const n of broken.slice(0, 10)) {
      const parent = nodeMap.get(n.parentId);
      console.log(`    Child: "${n.label}" (${n.path}) active:${n.isActive} visible:${n.isVisible}`);
      console.log(`    Parent: "${parent ? parent.label : '?'}" active:${parent ? parent.isActive : '?'} visible:${parent ? parent.isVisible : '?'}`);
    }
  }

  // Count assignments
  const assignmentCount = await prisma.productCatalogAssignment.count();
  console.log(`\nTotal ProductCatalogAssignments: ${assignmentCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
