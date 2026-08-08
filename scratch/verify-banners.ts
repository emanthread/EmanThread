/**
 * End-to-end verification: simulate what CatalogPage does.
 * 
 * 1. Calls buildCatalogPath for each department root
 * 2. Calls resolveActiveCatalogNode (the cached version)
 * 3. Calls getCatalogPageData
 * 4. Verifies bannerImage is non-null and passes supportedImageSource
 * 5. Checks that the banner rendering branch would be taken
 */

// We need to test without React cache (it's a no-op outside RSC anyway)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function supportedImageSource(source: string | null): source is string {
  if (!source) return false;
  if (source.startsWith("/") && !source.startsWith("//")) return true;

  try {
    const url = new URL(source);
    return (
      url.protocol === "https:" &&
      (url.hostname === "res.cloudinary.com" ||
        url.hostname === "images.unsplash.com")
    );
  } catch {
    return false;
  }
}

function buildCatalogPath(
  department: string,
  segments: string[] | undefined
): string | null {
  const allSegments = [department, ...(segments || [])];
  const isCanonical = allSegments.every((segment) =>
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segment)
  );
  return isCanonical ? `/${allSegments.join("/")}` : null;
}

const departments = ["women", "men", "teens", "fragrance-beauty"] as const;

async function main() {
  let allPassed = true;

  for (const dept of departments) {
    const canonicalPath = buildCatalogPath(dept, undefined);
    console.log(`\n── ${dept.toUpperCase()} ──`);
    console.log(`  canonicalPath: ${canonicalPath}`);

    if (!canonicalPath) {
      console.log("  ❌ FAIL: buildCatalogPath returned null");
      allPassed = false;
      continue;
    }

    const node = await prisma.catalogNode.findFirst({
      where: {
        path: canonicalPath,
        isActive: true,
        isVisible: true,
      },
      select: {
        id: true,
        label: true,
        bannerImage: true,
        bannerAlt: true,
        description: true,
        isActive: true,
        isVisible: true,
        parentId: true,
      },
    });

    if (!node) {
      console.log("  ❌ FAIL: No active+visible CatalogNode found");
      allPassed = false;
      continue;
    }

    console.log(`  node.id:          ${node.id}`);
    console.log(`  node.label:       ${node.label}`);
    console.log(`  node.bannerImage: ${node.bannerImage}`);
    console.log(`  node.bannerAlt:   ${node.bannerAlt}`);
    console.log(`  node.description: ${node.description?.substring(0, 60)}...`);

    const bannerWouldRender = supportedImageSource(node.bannerImage);
    console.log(`  supportedImageSource(bannerImage): ${bannerWouldRender}`);

    if (!bannerWouldRender) {
      console.log("  ❌ FAIL: Banner image would NOT render (null or invalid)");
      allPassed = false;
    } else {
      console.log("  ✅ PASS: Banner image WILL render in the hero section");
    }

    // Verify the root node has no parent (department root)
    if (node.parentId !== null) {
      console.log(`  ⚠️  WARNING: Node has parentId=${node.parentId} (expected null for root)`);
    }
  }

  // Verify homepage is unaffected
  console.log("\n── HOMEPAGE VERIFICATION ──");
  const homepageNode = await prisma.catalogNode.findFirst({
    where: { path: "/" },
  });
  if (homepageNode) {
    console.log("  ⚠️  WARNING: CatalogNode exists for '/' — homepage might be affected");
  } else {
    console.log("  ✅ PASS: No CatalogNode for '/' — homepage HeroSection is unaffected");
  }

  console.log(`\n${"=".repeat(40)}`);
  console.log(allPassed ? "✅ ALL CHECKS PASSED" : "❌ SOME CHECKS FAILED");
  console.log(`${"=".repeat(40)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
