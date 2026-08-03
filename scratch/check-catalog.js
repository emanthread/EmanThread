const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const catalogNodes = await prisma.catalogNode.findMany({
    select: {
      id: true,
      label: true,
      nodeType: true,
      parentId: true,
      path: true,
    }
  });
  
  // build tree
  const nodeMap = {};
  catalogNodes.forEach(n => nodeMap[n.id] = { ...n, children: [] });
  const roots = [];
  
  catalogNodes.forEach(n => {
    if (n.parentId && nodeMap[n.parentId]) {
      nodeMap[n.parentId].children.push(nodeMap[n.id]);
    } else {
      roots.push(nodeMap[n.id]);
    }
  });
  
  console.log(JSON.stringify(roots, null, 2));
}

main().catch(e => {
  console.error(e);
}).finally(() => {
  prisma.$disconnect();
});
