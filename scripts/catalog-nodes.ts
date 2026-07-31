/**
 * Reviewed, idempotent CatalogNode bootstrap and config/DB validator.
 *
 * This script intentionally has no Product, Category, FabricType, or
 * ProductCatalogAssignment write path. Run it through `tsx`; see
 * scripts/catalog-nodes.md for the operator workflow and acknowledgements.
 */

import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  catalogMenu,
  sortByMenuOrder,
  type MenuDepartment,
  type MenuLeaf,
  type MenuSection,
  type MenuVisualCard,
} from "../lib/navigation/catalog-menu";

const MANIFEST_VERSION = 1;
const APPLY_ACKNOWLEDGEMENT =
  "I_ACKNOWLEDGE_CATALOGNODE_ONLY_WRITES";
const DISPOSABLE_ACKNOWLEDGEMENT =
  "I_CONFIRM_THIS_DATABASE_IS_DISPOSABLE";
const CREATE_DEFAULTS = {
  isActive: true,
  isVisible: false,
  indexable: false,
} as const;
const TRANSACTION_MAX_WAIT_MS = 15_000;
// Interactive transactions require a persistent direct connection (not a pooler).
// 120 s gives ample headroom for 142 sequential upserts over a remote DB.
const TRANSACTION_TIMEOUT_MS = 120_000;

/**
 * Department roots are deliberately explicit. Never derive these paths from
 * department labels or IDs.
 */
const DEPARTMENT_ROOT_PATHS: Record<MenuDepartment["id"], string> = {
  women: "/women",
  men: "/men",
  "fragrance-beauty": "/fragrance-beauty",
  teens: "/teens",
};

type CatalogNodeType = "department" | "section" | "leaf";

type CatalogNodeManifestEntry = {
  id: string;
  parentId: string | null;
  nodeType: CatalogNodeType;
  label: string;
  slug: string;
  path: string;
  displayOrder: number;
};

type ExistingCatalogNode = {
  id: string;
  parentId: string | null;
  nodeType: string;
  label: string;
  slug: string;
  path: string;
  displayOrder: number;
  isActive: boolean;
};

type StructuralField =
  | "parentId"
  | "nodeType"
  | "label"
  | "slug"
  | "path"
  | "displayOrder";

type StructuralChange = {
  field: StructuralField;
  from: string | number | null;
  to: string | number | null;
};

type BootstrapAction =
  | {
      action: "create";
      id: string;
      path: string;
    }
  | {
      action: "update";
      id: string;
      path: string;
      changes: StructuralChange[];
    }
  | {
      action: "unchanged";
      id: string;
      path: string;
    };

type BootstrapConflict = {
  id: string;
  path: string;
  reason: string;
};

type CliMode = "plan" | "bootstrap" | "validate";

type CliOptions = {
  mode: CliMode;
  apply: boolean;
  confirmDisposable: boolean;
  reviewedPlan: string | null;
  help: boolean;
};

const STRUCTURAL_FIELDS: readonly StructuralField[] = [
  "parentId",
  "nodeType",
  "label",
  "slug",
  "path",
  "displayOrder",
];

const PRESERVED_ON_RERUN = [
  "isActive",
  "isVisible",
  "indexable",
  "description",
  "bannerImage",
  "bannerAlt",
  "featuredContent",
  "seoTitle",
  "seoDescription",
  "canonicalOverride",
] as const;

/**
 * This policy is part of the database-plan review hash. Any change to the
 * declared write behavior invalidates an operator's previous approval.
 */
const BOOTSTRAP_WRITE_POLICY = {
  model: "CatalogNode",
  operation: "parent-first deterministic-ID upsert",
  createDefaults: CREATE_DEFAULTS,
  updateFields: STRUCTURAL_FIELDS,
  preservedFields: PRESERVED_ON_RERUN,
  deletesRows: false,
  touchesOtherModels: false,
  transactionIsolation: "Serializable",
  transactionMaxWaitMs: TRANSACTION_MAX_WAIT_MS,
  transactionTimeoutMs: TRANSACTION_TIMEOUT_MS,
} as const;

function stableNodeId(
  nodeType: CatalogNodeType,
  contextualConfigId: string,
): string {
  return `catalog:${nodeType}:${contextualConfigId}`;
}

/**
 * The slug is copied from the final segment of an already explicit href. It is
 * never generated from a label.
 */
function explicitPathSegment(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function validateExplicitPath(
  path: string,
  context: string,
  departmentRoot: string,
  issues: string[],
): void {
  if (!path.startsWith("/")) {
    issues.push(`${context}: href must start with "/": ${path}`);
  }

  if (
    path === "/" ||
    path.endsWith("/") ||
    path.includes("?") ||
    path.includes("#") ||
    path.includes("\\") ||
    path.includes("//") ||
    /\s/.test(path)
  ) {
    issues.push(`${context}: href is not a canonical catalog path: ${path}`);
  }

  if (path !== departmentRoot && !path.startsWith(`${departmentRoot}/`)) {
    issues.push(
      `${context}: href must remain under explicit root ${departmentRoot}: ${path}`,
    );
  }

  const segments = path.split("/").slice(1);
  if (
    segments.some(
      (segment) =>
        segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    issues.push(`${context}: href contains an invalid path segment: ${path}`);
  }
}

function isVisibleActiveLeaf(item: MenuLeaf): boolean {
  return (
    item.visibility === "visible" &&
    item.status === "active" &&
    !item.comingSoon
  );
}

function isVisibleActiveCard(card: MenuVisualCard): boolean {
  return (
    card.visibility === "visible" &&
    card.status === "active" &&
    !card.comingSoon
  );
}

function buildCatalogManifest(): {
  entries: CatalogNodeManifestEntry[];
  visibleActiveConfigPaths: string[];
} {
  const entries: CatalogNodeManifestEntry[] = [];
  const visibleActiveConfigPaths = new Set<string>();
  const issues: string[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();

  const addEntry = (
    entry: CatalogNodeManifestEntry,
    context: string,
    departmentRoot: string,
  ): void => {
    validateExplicitPath(entry.path, context, departmentRoot, issues);

    if (ids.has(entry.id)) {
      issues.push(`${context}: duplicate stable node ID ${entry.id}`);
    }
    if (paths.has(entry.path)) {
      issues.push(`${context}: duplicate canonical path ${entry.path}`);
    }

    ids.add(entry.id);
    paths.add(entry.path);
    entries.push(entry);
  };

  const validateCard = (
    card: MenuVisualCard,
    context: string,
    departmentRoot: string,
  ): void => {
    if (card.href !== null) {
      validateExplicitPath(card.href, context, departmentRoot, issues);
    }

    if (isVisibleActiveCard(card)) {
      if (card.href === null) {
        issues.push(`${context}: visible active card must have an explicit href`);
      } else {
        visibleActiveConfigPaths.add(card.href);
      }
    }
  };

  for (const department of sortByMenuOrder(catalogMenu)) {
    const departmentRoot = DEPARTMENT_ROOT_PATHS[department.id];
    const departmentId = stableNodeId("department", department.id);

    addEntry(
      {
        id: departmentId,
        parentId: null,
        nodeType: "department",
        label: department.label,
        slug: explicitPathSegment(departmentRoot),
        path: departmentRoot,
        displayOrder: department.order,
      },
      `department ${department.id}`,
      departmentRoot,
    );
    visibleActiveConfigPaths.add(departmentRoot);

    for (const card of sortByMenuOrder(department.visualCards)) {
      validateCard(
        card,
        `department card ${card.id}`,
        departmentRoot,
      );
    }

    for (const section of sortByMenuOrder(department.sections)) {
      addSection(
        department,
        section,
        departmentId,
        departmentRoot,
        entries,
        ids,
        paths,
        visibleActiveConfigPaths,
        issues,
      );
    }
  }

  for (const path of visibleActiveConfigPaths) {
    if (!paths.has(path)) {
      issues.push(
        `visible active config href has no structural CatalogNode: ${path}`,
      );
    }
  }

  if (issues.length > 0) {
    throw new Error(
      `Catalog menu cannot produce a safe manifest:\n- ${issues.join("\n- ")}`,
    );
  }

  return {
    entries,
    visibleActiveConfigPaths: [...visibleActiveConfigPaths].sort(),
  };
}

function addSection(
  department: MenuDepartment,
  section: MenuSection,
  departmentId: string,
  departmentRoot: string,
  entries: CatalogNodeManifestEntry[],
  ids: Set<string>,
  paths: Set<string>,
  visibleActiveConfigPaths: Set<string>,
  issues: string[],
): void {
  const sectionContext = `section ${section.id}`;

  if (section.href === null) {
    const routedLeaves = section.groups.flatMap((group) =>
      group.items.filter((item) => item.href !== null),
    );
    if (routedLeaves.length > 0) {
      issues.push(
        `${sectionContext}: cannot parent routed leaves without an explicit section href`,
      );
    }
    for (const card of sortByMenuOrder(section.visualCards)) {
      validateSectionCard(
        card,
        sectionContext,
        departmentRoot,
        visibleActiveConfigPaths,
        issues,
      );
    }
    return;
  }

  validateExplicitPath(section.href, sectionContext, departmentRoot, issues);
  if (!section.href.startsWith(`${departmentRoot}/`)) {
    issues.push(
      `${sectionContext}: section href must be below ${departmentRoot}`,
    );
  }

  const sectionId = stableNodeId("section", section.id);
  addManifestEntry(
    {
      id: sectionId,
      parentId: departmentId,
      nodeType: "section",
      label: section.label,
      slug: explicitPathSegment(section.href),
      path: section.href,
      displayOrder: section.order,
    },
    sectionContext,
    departmentRoot,
    entries,
    ids,
    paths,
    issues,
  );
  // Sections are always rendered by the current config shape.
  visibleActiveConfigPaths.add(section.href);

  let flattenedLeafOrder = 0;
  for (const group of sortByMenuOrder(section.groups)) {
    // Groups are presentation-only: no canonical URL is invented for them.
    for (const item of sortByMenuOrder(group.items)) {
      const itemContext = `leaf ${item.id} in group ${group.id}`;

      if (item.href === null) {
        if (isVisibleActiveLeaf(item)) {
          issues.push(
            `${itemContext}: visible active leaf must have an explicit href`,
          );
        }
        continue;
      }

      validateExplicitPath(item.href, itemContext, departmentRoot, issues);
      if (!item.href.startsWith(`${section.href}/`)) {
        issues.push(
          `${itemContext}: leaf href must be below its explicit section path ${section.href}`,
        );
      }

      flattenedLeafOrder += 1;
      addManifestEntry(
        {
          id: stableNodeId("leaf", item.id),
          parentId: sectionId,
          nodeType: "leaf",
          label: item.label,
          slug: explicitPathSegment(item.href),
          path: item.href,
          // Flattening retains configured group/item ordering without
          // persisting a group node or inventing a group URL.
          displayOrder: flattenedLeafOrder,
        },
        itemContext,
        departmentRoot,
        entries,
        ids,
        paths,
        issues,
      );

      if (isVisibleActiveLeaf(item)) {
        visibleActiveConfigPaths.add(item.href);
      }
    }
  }

  for (const card of sortByMenuOrder(section.visualCards)) {
    validateSectionCard(
      card,
      sectionContext,
      departmentRoot,
      visibleActiveConfigPaths,
      issues,
    );
  }
}

function addManifestEntry(
  entry: CatalogNodeManifestEntry,
  context: string,
  departmentRoot: string,
  entries: CatalogNodeManifestEntry[],
  ids: Set<string>,
  paths: Set<string>,
  issues: string[],
): void {
  validateExplicitPath(entry.path, context, departmentRoot, issues);

  if (ids.has(entry.id)) {
    issues.push(`${context}: duplicate stable node ID ${entry.id}`);
  }
  if (paths.has(entry.path)) {
    issues.push(`${context}: duplicate canonical path ${entry.path}`);
  }

  ids.add(entry.id);
  paths.add(entry.path);
  entries.push(entry);
}

function validateSectionCard(
  card: MenuVisualCard,
  sectionContext: string,
  departmentRoot: string,
  visibleActiveConfigPaths: Set<string>,
  issues: string[],
): void {
  const context = `${sectionContext} card ${card.id}`;
  if (card.href !== null) {
    validateExplicitPath(card.href, context, departmentRoot, issues);
  }
  if (isVisibleActiveCard(card)) {
    if (card.href === null) {
      issues.push(`${context}: visible active card must have an explicit href`);
    } else {
      visibleActiveConfigPaths.add(card.href);
    }
  }
}

function manifestReviewHash(entries: CatalogNodeManifestEntry[]): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        manifestVersion: MANIFEST_VERSION,
        entries,
      }),
    )
    .digest("hex");
}

function databasePlanReviewHash(
  currentManifestReviewHash: string,
  plan: {
    actions: BootstrapAction[];
    conflicts: BootstrapConflict[];
  },
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        manifestVersion: MANIFEST_VERSION,
        manifestReviewHash: currentManifestReviewHash,
        writePolicy: BOOTSTRAP_WRITE_POLICY,
        actions: plan.actions,
        conflicts: plan.conflicts,
      }),
    )
    .digest("hex");
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    mode: "plan",
    apply: false,
    confirmDisposable: false,
    reviewedPlan: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }
    if (argument === "--apply") {
      options.apply = true;
      continue;
    }
    if (argument === "--confirm-disposable") {
      options.confirmDisposable = true;
      continue;
    }
    if (argument === "--mode") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--mode requires a value");
      }
      options.mode = parseMode(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("--mode=")) {
      options.mode = parseMode(argument.slice("--mode=".length));
      continue;
    }
    if (argument === "--reviewed-plan") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--reviewed-plan requires a SHA-256 value");
      }
      options.reviewedPlan = value;
      index += 1;
      continue;
    }
    if (argument.startsWith("--reviewed-plan=")) {
      options.reviewedPlan = argument.slice("--reviewed-plan=".length);
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (options.apply && options.mode !== "bootstrap") {
    throw new Error("--apply is valid only with --mode=bootstrap");
  }

  return options;
}

function parseMode(value: string): CliMode {
  if (value === "plan" || value === "bootstrap" || value === "validate") {
    return value;
  }
  throw new Error(`Unsupported mode "${value}"`);
}

function printHelp(): void {
  console.log(`CatalogNode bootstrap and validator

Usage:
  npx tsx scripts/catalog-nodes.ts
  npx tsx scripts/catalog-nodes.ts --mode=bootstrap
  npx tsx scripts/catalog-nodes.ts --mode=bootstrap --apply --reviewed-plan=<db-plan-sha256>
  npx tsx scripts/catalog-nodes.ts --mode=validate --confirm-disposable

Modes:
  plan       Validate config and print the deterministic manifest; no DB access.
  bootstrap  Compare the manifest with CatalogNode; dry-run unless --apply.
  validate   Compare visible active config hrefs with active DB paths; read-only.

Required environment acknowledgements:
  Apply:      CATALOG_BOOTSTRAP_APPLY=${APPLY_ACKNOWLEDGEMENT}
  Validation: CATALOG_DISPOSABLE_DATABASE=${DISPOSABLE_ACKNOWLEDGEMENT}
`);
}

function requireDatabaseUrl(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for database-backed modes");
  }
}

function requireApplyAcknowledgements(options: CliOptions): void {
  if (!options.apply) {
    return;
  }

  if (process.env.CATALOG_BOOTSTRAP_APPLY !== APPLY_ACKNOWLEDGEMENT) {
    throw new Error(
      `Apply refused. Set CATALOG_BOOTSTRAP_APPLY=${APPLY_ACKNOWLEDGEMENT}`,
    );
  }
  if (
    options.reviewedPlan === null ||
    !/^[a-f0-9]{64}$/.test(options.reviewedPlan)
  ) {
    throw new Error(
      "Apply refused. --reviewed-plan must be the exact database-plan SHA-256 from a bootstrap dry-run.",
    );
  }
}

function requireDisposableAcknowledgements(options: CliOptions): void {
  if (!options.confirmDisposable) {
    throw new Error(
      "Validation refused. Pass --confirm-disposable after verifying the target.",
    );
  }
  if (
    process.env.CATALOG_DISPOSABLE_DATABASE !==
    DISPOSABLE_ACKNOWLEDGEMENT
  ) {
    throw new Error(
      `Validation refused. Set CATALOG_DISPOSABLE_DATABASE=${DISPOSABLE_ACKNOWLEDGEMENT}`,
    );
  }
}

function structuralChanges(
  existing: ExistingCatalogNode,
  desired: CatalogNodeManifestEntry,
): StructuralChange[] {
  const changes: StructuralChange[] = [];
  for (const field of STRUCTURAL_FIELDS) {
    if (existing[field] !== desired[field]) {
      changes.push({
        field,
        from: existing[field],
        to: desired[field],
      });
    }
  }
  return changes;
}

async function createBootstrapPlan(
  prisma: Prisma.TransactionClient,
  entries: CatalogNodeManifestEntry[],
): Promise<{
  actions: BootstrapAction[];
  conflicts: BootstrapConflict[];
}> {
  const existing = await prisma.catalogNode.findMany({
    where: {
      OR: [
        { id: { in: entries.map((entry) => entry.id) } },
        { path: { in: entries.map((entry) => entry.path) } },
      ],
    },
    select: {
      id: true,
      parentId: true,
      nodeType: true,
      label: true,
      slug: true,
      path: true,
      displayOrder: true,
      isActive: true,
    },
  });

  const existingById = new Map(existing.map((node) => [node.id, node]));
  const existingByPath = new Map(
    existing.map((node) => [node.path, node]),
  );
  const actions: BootstrapAction[] = [];
  const conflicts: BootstrapConflict[] = [];

  for (const desired of entries) {
    const idMatch = existingById.get(desired.id);
    const pathMatch = existingByPath.get(desired.path);

    if (!idMatch && pathMatch) {
      conflicts.push({
        id: desired.id,
        path: desired.path,
        reason: `path is already owned by non-manifest ID ${pathMatch.id}`,
      });
      continue;
    }
    if (idMatch && pathMatch && idMatch.id !== pathMatch.id) {
      conflicts.push({
        id: desired.id,
        path: desired.path,
        reason: `stable ID and target path resolve to different rows (${idMatch.id}, ${pathMatch.id})`,
      });
      continue;
    }
    if (!idMatch) {
      actions.push({
        action: "create",
        id: desired.id,
        path: desired.path,
      });
      continue;
    }

    const changes = structuralChanges(idMatch, desired);
    if (changes.length === 0) {
      actions.push({
        action: "unchanged",
        id: desired.id,
        path: desired.path,
      });
    } else {
      actions.push({
        action: "update",
        id: desired.id,
        path: desired.path,
        changes,
      });
    }
  }

  return { actions, conflicts };
}

async function applyBootstrapPlan(
  prisma: PrismaClient,
  entries: CatalogNodeManifestEntry[],
  currentManifestReviewHash: string,
  reviewedDatabasePlanHash: string,
): Promise<number> {
  return prisma.$transaction(
    async (transaction) => {
      const transactionalPlan = await createBootstrapPlan(
        transaction,
        entries,
      );
      const transactionalPlanHash = databasePlanReviewHash(
        currentManifestReviewHash,
        transactionalPlan,
      );

      if (transactionalPlan.conflicts.length > 0) {
        throw new Error(
          "Apply refused because the transactional recheck found stable-ID/path conflicts.",
        );
      }
      if (transactionalPlanHash !== reviewedDatabasePlanHash) {
        throw new Error(
          "Apply refused because the transactional database plan differs from the reviewed dry-run.",
        );
      }

      const changedIds = new Set(
        transactionalPlan.actions
          .filter((action) => action.action !== "unchanged")
          .map((action) => action.id),
      );

      // Manifest order is department -> section -> leaf, so every parent
      // exists before a newly created child is connected.
      for (const entry of entries) {
        if (!changedIds.has(entry.id)) {
          continue;
        }

        await transaction.catalogNode.upsert({
          where: { id: entry.id },
          create: {
            ...entry,
            ...CREATE_DEFAULTS,
          },
          update: {
            parentId: entry.parentId,
            nodeType: entry.nodeType,
            label: entry.label,
            slug: entry.slug,
            path: entry.path,
            displayOrder: entry.displayOrder,
            // Deliberately preserve activity/publication, visibility, SEO,
            // and content fields already managed by an operator.
          },
        });
      }

      return changedIds.size;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: TRANSACTION_MAX_WAIT_MS,
      timeout: TRANSACTION_TIMEOUT_MS,
    },
  );
}

async function runPlanMode(
  entries: CatalogNodeManifestEntry[],
  visibleActiveConfigPaths: string[],
  currentManifestReviewHash: string,
): Promise<void> {
  console.log(
    JSON.stringify(
      {
        mode: "plan",
        databaseAccess: false,
        manifestVersion: MANIFEST_VERSION,
        manifestReviewHash: currentManifestReviewHash,
        counts: {
          nodes: entries.length,
          visibleActiveConfigPaths: visibleActiveConfigPaths.length,
        },
        createDefaults: CREATE_DEFAULTS,
        preservedOnRerun: PRESERVED_ON_RERUN,
        hierarchyNote:
          "Menu groups are presentation-only; routed leaves are parented directly to their routed section.",
        entries,
        visibleActiveConfigPaths,
      },
      null,
      2,
    ),
  );
}

async function runBootstrapMode(
  options: CliOptions,
  entries: CatalogNodeManifestEntry[],
  currentManifestReviewHash: string,
): Promise<void> {
  requireDatabaseUrl();
  requireApplyAcknowledgements(options);

  // Interactive transactions require a real persistent connection.
  // PgBouncer (pooler) does not support them, so we always prefer DIRECT_URL.
  const bootstrapUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const prisma = new PrismaClient({
    log: ["error"],
    datasources: { db: { url: bootstrapUrl } },
  });
  try {
    const plan = await createBootstrapPlan(prisma, entries);
    const currentDatabasePlanReviewHash = databasePlanReviewHash(
      currentManifestReviewHash,
      plan,
    );
    const counts = {
      create: plan.actions.filter((item) => item.action === "create").length,
      update: plan.actions.filter((item) => item.action === "update").length,
      unchanged: plan.actions.filter(
        (item) => item.action === "unchanged",
      ).length,
      conflicts: plan.conflicts.length,
    };

    console.log(
      JSON.stringify(
        {
          mode: "bootstrap",
          dryRun: !options.apply,
          manifestReviewHash: currentManifestReviewHash,
          databasePlanReviewHash: currentDatabasePlanReviewHash,
          writePolicy: BOOTSTRAP_WRITE_POLICY,
          counts,
          conflicts: plan.conflicts,
          actions: plan.actions,
        },
        null,
        2,
      ),
    );

    if (plan.conflicts.length > 0) {
      throw new Error(
        "Bootstrap refused because stable-ID/path conflicts require operator review.",
      );
    }

    if (options.apply) {
      const catalogNodeWrites = await applyBootstrapPlan(
        prisma,
        entries,
        currentManifestReviewHash,
        options.reviewedPlan!,
      );
      console.log(
        JSON.stringify({
          applied: true,
          databasePlanReviewHash: options.reviewedPlan,
          catalogNodeWrites,
          otherTableWrites: 0,
        }),
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function runValidationMode(
  options: CliOptions,
  visibleActiveConfigPaths: string[],
): Promise<void> {
  requireDatabaseUrl();
  requireDisposableAcknowledgements(options);

  const validateUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  const prisma = new PrismaClient({
    log: ["error"],
    datasources: { db: { url: validateUrl } },
  });
  try {
    const databaseNodes = await prisma.catalogNode.findMany({
      select: {
        path: true,
        isActive: true,
        isVisible: true,
      },
      orderBy: { path: "asc" },
    });
    const expected = new Set(visibleActiveConfigPaths);
    const activeVisiblePaths = new Set(
      databaseNodes
        .filter((node) => node.isActive && node.isVisible)
        .map((node) => node.path),
    );
    const activeInvisiblePaths = databaseNodes
      .filter((node) => node.isActive && !node.isVisible)
      .map((node) => node.path);
    const missingActiveVisibleDatabasePaths =
      visibleActiveConfigPaths.filter(
        (path) => !activeVisiblePaths.has(path),
      );
    const configuredPathsActiveButInvisible = activeInvisiblePaths.filter(
      (path) => expected.has(path),
    );
    const databaseOnlyActiveVisiblePaths = [...activeVisiblePaths].filter(
      (path) => !expected.has(path),
    );

    console.log(
      JSON.stringify(
        {
          mode: "validate",
          readOnly: true,
          disposableEnvironmentConfirmed: true,
          ok: missingActiveVisibleDatabasePaths.length === 0,
          counts: {
            visibleActiveConfigPaths: expected.size,
            activeVisibleDatabasePaths: activeVisiblePaths.size,
            activeInvisibleDatabasePaths: activeInvisiblePaths.length,
          },
          missingActiveVisibleDatabasePaths,
          configuredPathsActiveButInvisible,
          activeInvisibleDatabasePaths: activeInvisiblePaths,
          databaseOnlyActiveVisiblePaths,
          databaseOnlyNote:
            "Extra active+visible DB paths are reported for review but do not satisfy or invalidate another configured href.",
          stagedNodeNote:
            "Active but invisible paths are reported separately because bootstrap intentionally stages new nodes this way; they are not link-ready.",
        },
        null,
        2,
      ),
    );

    if (missingActiveVisibleDatabasePaths.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const { entries, visibleActiveConfigPaths } = buildCatalogManifest();
  const reviewHash = manifestReviewHash(entries);

  if (options.mode === "plan") {
    await runPlanMode(entries, visibleActiveConfigPaths, reviewHash);
    return;
  }
  if (options.mode === "bootstrap") {
    await runBootstrapMode(options, entries, reviewHash);
    return;
  }
  await runValidationMode(options, visibleActiveConfigPaths);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[catalog-nodes] ${message}`);
  process.exitCode = 1;
});
