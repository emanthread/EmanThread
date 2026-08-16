"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ProductCatalogAssignmentSection,
  serializeCatalogAssignments,
  type CatalogAssignmentDraft,
} from "@/components/admin/product-catalog-assignment-section";
import {
  ProductCommerceProfileSection,
  emptyCommerceProfileDraft,
  serializeCommerceProfile,
  type CommerceProfileDraft,
} from "@/components/admin/product-commerce-profile-section";
import { adminFetch } from "@/lib/admin-fetch";
import type { AdminProduct } from "@/lib/admin-store";
import type { ProductKind } from "@/lib/data";
import {
  classifyCatalogNode,
  classificationForProductKind,
  defaultCommerceSettingsForClassification,
  defaultOptionLabelForKind,
  isProductEditorFieldRequired,
  isProductEditorFieldVisible,
  normalizeCatalogCompatibilityFields,
  type CatalogProductClassification,
} from "@/lib/catalog-product-classification";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import {
  colorPickerValue,
  isValidHexColor,
  normalizeHexColorInput,
} from "@/lib/color-hex";
import { cn } from "@/lib/utils";
import { useAdminUnsavedChanges } from "@/components/admin/unsaved-changes-context";

const BADGES = ["NEW", "TRENDING", "HOT", "LIMITED", "FEATURED"] as const;

type ProductEditorProps = {
  productId?: string;
  duplicateFromId?: string;
};

type EditorErrors = Partial<
  Record<
    | "classification"
    | "name"
    | "sku"
    | "slug"
    | "price"
    | "originalPrice"
    | "fabricType"
    | "color"
    | "colorHex"
    | "description"
    | "images"
    | "stockQuantity"
    | "lowStockThreshold"
    | "commerce",
    string
  >
>;

function emptyProduct(): AdminProduct {
  return {
    id: "",
    name: "",
    sku: "",
    slug: "",
    price: 0,
    originalPrice: undefined,
    fabricType: "",
    color: "",
    colorHex: "",
    images: [],
    videoUrl: undefined,
    badge: undefined,
    inStock: false,
    stockQuantity: 0,
    lowStockThreshold: 5,
    description: "",
    longDescription: "",
    metaTitle: "",
    metaDescription: "",
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold">{children}</h2>;
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "");
}

export function ProductEditor({ productId, duplicateFromId }: ProductEditorProps) {
  const router = useRouter();
  const { setHasUnsavedChanges } = useAdminUnsavedChanges();
  const isEdit = Boolean(productId);
  const isDuplicate = Boolean(!productId && duplicateFromId);
  const sourceProductId = productId || duplicateFromId;
  const catalogEnabled = FEATURE_FLAGS.CATALOG_ADMIN_ASSIGNMENTS_V1;
  const commerceEnabled = FEATURE_FLAGS.COMMERCE_PROFILE_V1;

  const [product, setProduct] = useState<AdminProduct>(emptyProduct());
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [fabricTypes, setFabricTypes] = useState<
    { id: string; name: string; isActive: boolean }[]
  >([]);
  const [pageLoading, setPageLoading] = useState(Boolean(sourceProductId));
  const [pageLoadError, setPageLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [seoOpen, setSeoOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<EditorErrors>({});
  const [serverSaveError, setServerSaveError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<CatalogAssignmentDraft[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(Boolean(sourceProductId) && catalogEnabled);
  const [assignmentLoadError, setAssignmentLoadError] = useState<string | null>(null);
  const [primaryCatalogPath, setPrimaryCatalogPath] = useState<string | null>(null);
  const [initialCatalogProductKind, setInitialCatalogProductKind] =
    useState<ProductKind | null>(null);
  const [classification, setClassification] =
    useState<CatalogProductClassification | null>(null);

  const [commerceProfile, setCommerceProfile] = useState<CommerceProfileDraft>(
    emptyCommerceProfileDraft()
  );
  const [commerceLoading, setCommerceLoading] = useState(Boolean(sourceProductId) && commerceEnabled);
  const [commerceLoadError, setCommerceLoadError] = useState<string | null>(null);
  const [, setCommerceProfileExists] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setPageLoading(Boolean(sourceProductId));
      setPageLoadError(null);
      setOptionsLoading(true);
      try {
        const requests: Promise<Response>[] = [
          adminFetch("/api/admin/categories", { signal: controller.signal }),
          adminFetch("/api/admin/fabric-types?active=true", { signal: controller.signal }),
        ];
        if (sourceProductId) {
          requests.push(
            adminFetch(`/api/admin/products/${encodeURIComponent(sourceProductId)}`, {
              signal: controller.signal,
            })
          );
        }
        const [categoryResponse, fabricResponse, productResponse] = await Promise.all(requests);
        const [categoryData, fabricData, productData] = await Promise.all([
          categoryResponse.json().catch(() => null),
          fabricResponse.json().catch(() => null),
          productResponse?.json().catch(() => null),
        ]);
        if (!categoryResponse.ok || !Array.isArray(categoryData)) {
          throw new Error(categoryData?.error || "Failed to load product categories");
        }
        if (!fabricResponse.ok || !Array.isArray(fabricData)) {
          throw new Error(fabricData?.error || "Failed to load fabric types");
        }
        if (productResponse && !productResponse.ok) {
          throw new Error(productData?.error || "Failed to load product");
        }
        setCategories(categoryData);
        setFabricTypes(fabricData);
        if (productData) {
          const loaded = productData as AdminProduct;
          setProduct(
            isDuplicate
              ? {
                  ...loaded,
                  id: "",
                  name: `Copy of ${loaded.name}`,
                  sku: `${loaded.sku}-${Date.now()
                    .toString(36)
                    .toUpperCase()
                    .slice(-6)}`,
                  slug: "",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : loaded
          );
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        const message =
          error instanceof Error ? error.message : "Failed to load product editor";
        setPageLoadError(message);
        toast.error(message);
      } finally {
        setOptionsLoading(false);
        setPageLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [isDuplicate, loadAttempt, sourceProductId]);

  useEffect(() => {
    if (catalogEnabled || commerceLoading) return;
    setClassification((current) =>
      current?.productKind === commerceProfile.productKind
        ? current
        : classificationForProductKind(commerceProfile.productKind)
    );
  }, [catalogEnabled, commerceLoading, commerceProfile.productKind]);

  useEffect(() => {
    if (!isDirty || saving) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [isDirty, saving]);

  useEffect(() => {
    setHasUnsavedChanges(isDirty && !saving);
    return () => setHasUnsavedChanges(false);
  }, [isDirty, saving, setHasUnsavedChanges]);

  const updateProduct = <K extends keyof AdminProduct>(field: K, value: AdminProduct[K]) => {
    setIsDirty(true);
    setServerSaveError(null);
    setProduct((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field as keyof EditorErrors];
      return next;
    });
  };

  const updateColorHex = (value: string) => {
    const normalized = normalizeHexColorInput(value);
    updateProduct("colorHex", normalized);
    setErrors((current) => ({
      ...current,
      colorHex:
        normalized && !isValidHexColor(normalized)
          ? "Enter a 6-digit hex color, for example #0088CC"
          : undefined,
    }));
  };

  const updateStockQuantity = (stockQuantity: number) => {
    setIsDirty(true);
    setServerSaveError(null);
    setProduct((current) => ({
      ...current,
      stockQuantity,
      inStock: stockQuantity > 0,
    }));
    setErrors((current) => ({ ...current, stockQuantity: undefined }));
  };

  const applyPrimaryCatalogPath = (
    path: string | null,
    reason: "initial" | "selection",
    productKind?: ProductKind | null
  ) => {
    setPrimaryCatalogPath(path);
    if (reason === "initial" && productKind) {
      setInitialCatalogProductKind(productKind);
    }
    if (reason === "selection") setServerSaveError(null);
    const nextClassification = classifyCatalogNode({ path, productKind });
    setClassification(nextClassification);
    setErrors((current) => ({ ...current, classification: undefined }));
    if (!nextClassification || reason === "initial") return;
    setIsDirty(true);

    const productKindChanged =
      commerceProfile.productKind !== nextClassification.productKind;
    if (productKindChanged && (commerceProfile.variants.length > 0 || commerceProfile.options.length > 0)) {
      toast.info(
        "Selling options were cleared because the product type changed"
      );
    }

    setCommerceProfile((current) => {
      const defaults = defaultCommerceSettingsForClassification(nextClassification);
      const previousDefault = defaultOptionLabelForKind(current.productKind);
      return {
        ...current,
        ...defaults,
        optionLabel:
          !current.optionLabel || current.optionLabel === previousDefault
            ? defaults.optionLabel
            : current.optionLabel,
        sizeGuideUrl:
          isProductEditorFieldVisible(
            nextClassification.editorSchema.fields.sizeGuide
          )
            ? current.sizeGuideUrl
            : "",
        variants: productKindChanged ? [] : current.variants,
        options: productKindChanged ? [] : current.options,
      };
    });

    setProduct((current) => ({
      ...current,
      categoryId: undefined,
      fabricType: isProductEditorFieldVisible(
        nextClassification.editorSchema.fields.fabric
      )
        ? current.fabricType
        : "",
      color: isProductEditorFieldVisible(
        nextClassification.editorSchema.fields.color
      )
        ? current.color
        : "",
      colorHex: isProductEditorFieldVisible(
        nextClassification.editorSchema.fields.color
      )
        ? current.colorHex
        : "",
    }));
  };

  const selectedClassification =
    classification || classificationForProductKind(commerceProfile.productKind);
  const selectedEditorSchema = selectedClassification.editorSchema;
  const classificationReady = !catalogEnabled || Boolean(classification);
  const usesVariantInventory =
    commerceEnabled &&
    classificationReady &&
    (selectedEditorSchema.inventorySource === "variant" ||
      commerceProfile.requiresSelection);
  const hasUnstitchedColorVariants =
    selectedClassification.productKind === "UNSTITCHED_FABRIC" &&
    (commerceProfile.options.some((option) => option.type === "COLOR") ||
      commerceProfile.variants.length > 0);

  const contextualTags = useMemo(
    () =>
      classificationReady
        ? selectedClassification.suggestedTags.filter(
            (tag) => !product.tags.includes(tag)
          )
        : [],
    [classificationReady, product.tags, selectedClassification.suggestedTags]
  );

  const addTag = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setIsDirty(true);
    setServerSaveError(null);
    setProduct((current) => ({
      ...current,
      tags: Array.from(new Set([...current.tags, clean])),
    }));
    setTagInput("");
  };

  const upload = async (file: File, resourceType: "image" | "video") => {
    const setUploading = resourceType === "image" ? setUploadingImage : setUploadingVideo;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("resourceType", resourceType);
    try {
      const response = await adminFetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Upload failed");
      if (resourceType === "image") {
        setIsDirty(true);
        setServerSaveError(null);
        setProduct((current) => ({ ...current, images: [...current.images, data.url] }));
        setErrors((current) => ({ ...current, images: undefined }));
      } else {
        setIsDirty(true);
        setServerSaveError(null);
        setProduct((current) => ({ ...current, videoUrl: data.url }));
      }
      toast.success(resourceType === "image" ? "Image uploaded" : "Video uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const uploadVariantImage = async (file: File): Promise<string> => {
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("resourceType", "image");
    try {
      const response = await adminFetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Upload failed");
      setIsDirty(true);
      setServerSaveError(null);
      toast.success("Color image uploaded");
      return String(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
      return "";
    } finally {
      setUploadingImage(false);
    }
  };

  const validate = (): EditorErrors => {
    const next: EditorErrors = {};
    if (catalogEnabled && (!primaryCatalogPath || !classification || assignments.length === 0)) {
      next.classification = "Choose a department and product category";
    }
    if (!product.name.trim()) next.name = "Enter a product name";
    if (!product.sku.trim()) next.sku = "Enter a product code (SKU)";
    if (!Number.isFinite(product.price) || product.price <= 0) {
      next.price = "Price must be greater than 0";
    }
    if (
      product.originalPrice !== undefined &&
      (!Number.isFinite(product.originalPrice) || product.originalPrice <= product.price)
    ) {
      next.originalPrice = "Compare-at price must be greater than the selling price";
    }
    if (
      product.slug.trim() &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.slug.trim())
    ) {
      next.slug = "Use lowercase letters, numbers, and single hyphens";
    }
    if (
      isProductEditorFieldRequired(selectedEditorSchema.fields.fabric) &&
      !product.fabricType.trim()
    ) {
      next.fabricType = "Choose a fabric type";
    }
    if (
      isProductEditorFieldRequired(selectedEditorSchema.fields.color) &&
      !(hasUnstitchedColorVariants
        ? commerceProfile.variants[0]?.label.trim()
        : product.color.trim())
    ) {
      next.color = "Enter the product color";
    }
    if (
      isProductEditorFieldVisible(selectedEditorSchema.fields.color) &&
      ((hasUnstitchedColorVariants
        ? commerceProfile.variants[0]?.label.trim()
        : product.color.trim()) ||
        (hasUnstitchedColorVariants
          ? commerceProfile.variants[0]?.colorHex.trim()
          : product.colorHex.trim())) &&
      !isValidHexColor(
        hasUnstitchedColorVariants
          ? commerceProfile.variants[0]?.colorHex.trim() || ""
          : product.colorHex.trim()
      )
    ) {
      next.colorHex = "Enter a 6-digit hex color, for example #0088CC";
    }
    if (!product.description.trim()) next.description = "Enter a short description";
    if (product.images.length === 0) next.images = "Add at least one product image";
    if (!usesVariantInventory && (!Number.isInteger(product.stockQuantity) || product.stockQuantity < 0)) {
      next.stockQuantity = "Stock must be a whole number of 0 or more";
    }
    if (!Number.isInteger(product.lowStockThreshold) || product.lowStockThreshold < 1) {
      next.lowStockThreshold = "Low-stock alert must be a whole number of 1 or more";
    }
    return next;
  };

  const focusFirstError = (nextErrors: EditorErrors) => {
    const first = Object.keys(nextErrors)[0];
    if (!first) return;
    if (first === "slug") setSeoOpen(true);
    const id = first === "classification" ? "catalog-department" : first;
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  };

  const save = async () => {
    setServerSaveError(null);
    if (uploadingImage || uploadingVideo) {
      toast.error("Wait for uploads to finish before saving");
      return;
    }
    if (assignmentLoadError || commerceLoadError) {
      toast.error(assignmentLoadError || commerceLoadError || "Reload the editor and try again");
      return;
    }
    if (sourceProductId && (assignmentsLoading || commerceLoading)) {
      toast.error("Wait for existing product settings to finish loading");
      return;
    }

    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      focusFirstError(nextErrors);
      toast.error("Review the highlighted fields");
      return;
    }

    let serializedAssignments;
    let serializedCommerce;
    if (catalogEnabled) {
      try {
        serializedAssignments = serializeCatalogAssignments(assignments);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Check catalog placements";
        setErrors((current) => ({ ...current, classification: message }));
        toast.error(message);
        requestAnimationFrame(() =>
          document.getElementById("catalog-department")?.focus()
        );
        return;
      }
    }
    try {
      const invalidPriceOption = commerceProfile.variants.find(
        (variant) =>
          product.price + Number(variant.priceAdjustment || "0") <= 0
      );
      if (commerceEnabled && invalidPriceOption) {
        throw new Error("Every option's final price must be greater than 0");
      }
      serializedCommerce = commerceEnabled
        ? serializeCommerceProfile({
            ...commerceProfile,
            variants: isEdit
              ? commerceProfile.variants
              : commerceProfile.variants.map(({ id: _id, ...variant }) => variant),
            options: isEdit
              ? commerceProfile.options
              : commerceProfile.options.map(({ id: _id, ...option }) => ({
                  ...option,
                  values: option.values.map(({ id: _valueId, ...value }) => value),
                })),
            productKind: selectedClassification.productKind,
            stitchingEligible:
              selectedEditorSchema.fields.stitching.mode !== "hidden" &&
              commerceProfile.stitchingEligible,
          })
        : undefined;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Check selling options";
      setErrors((current) => ({ ...current, commerce: message }));
      toast.error(message);
      requestAnimationFrame(() =>
        document.getElementById("commerce-section")?.focus()
      );
      return;
    }

    const firstColorVariant = commerceProfile.options
      .find((option) => option.type === "COLOR" || option.type === "SHADE")
      ?.values.find((value) => value.isActive) ||
      (hasUnstitchedColorVariants ? commerceProfile.variants[0] : undefined);
    const compatibility = normalizeCatalogCompatibilityFields(selectedClassification, {
      ...product,
      ...(firstColorVariant
        ? { color: firstColorVariant.label, colorHex: "swatchHex" in firstColorVariant ? firstColorVariant.swatchHex : firstColorVariant.colorHex }
        : {}),
    });
    const matchingCategory = categories.find(
      (category) =>
        normalizeName(category.name) === normalizeName(compatibility.fabricType)
    );

    setSaving(true);
    try {
      const response = await adminFetch("/api/admin/products/editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          expectedUpdatedAt: productId ? product.updatedAt : undefined,
          product: {
            ...product,
            ...compatibility,
            categoryId: product.categoryId || matchingCategory?.id,
            badge: product.badge?.toUpperCase(),
          },
          assignments: serializedAssignments,
          commerceProfile: serializedCommerce,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const message = result?.error || "Failed to save product";
        const field = typeof result?.field === "string" ? result.field : "";
        const productField = field.startsWith("product.")
          ? field.slice("product.".length)
          : "";
        const editorField =
          field.startsWith("assignments")
            ? "classification"
            : field.startsWith("commerceProfile")
              ? "commerce"
              : productField;
        if (editorField) {
          const fieldErrors = { [editorField]: message } as EditorErrors;
          setErrors((current) => ({ ...current, ...fieldErrors }));
          focusFirstError(fieldErrors);
        }
        throw new Error(message);
      }
      toast.success(isEdit ? "Product updated" : "Product created");
      setIsDirty(false);
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save product";
      setServerSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const fatalLoadError =
    pageLoadError || assignmentLoadError || commerceLoadError;
  if (fatalLoadError) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>The product editor could not be loaded safely</AlertTitle>
          <AlertDescription>{fatalLoadError}</AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={() => {
              if (pageLoadError) {
                setLoadAttempt((current) => current + 1);
              } else {
                window.location.reload();
              }
            }}
          >
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/products">Back to products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const saveDisabled = saving || uploadingImage || uploadingVideo;
  return (
    <form
      className="mx-auto max-w-4xl space-y-6 pb-24"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div>
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2">
            <Link href="/admin/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Products
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">
            {isEdit ? "Edit product" : isDuplicate ? "Duplicate product" : "Add product"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with the category. Only details relevant to this product will appear.
          </p>
        </div>
      </div>

      {(Object.values(errors).some(Boolean) || serverSaveError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>This product is not ready to save</AlertTitle>
          <AlertDescription>
            {serverSaveError ||
              "Review the highlighted fields below. Everything you entered is still here."}
          </AlertDescription>
        </Alert>
      )}

      {catalogEnabled ? (
        <>
          <ProductCatalogAssignmentSection
            productId={isDuplicate && !commerceEnabled ? undefined : sourceProductId}
            assignments={assignments}
            onChange={(nextAssignments) => {
              setAssignments(nextAssignments);
              if (!assignmentsLoading) setIsDirty(true);
              setServerSaveError(null);
              setErrors((current) => ({
                ...current,
                classification: undefined,
              }));
            }}
            onLoadingChange={setAssignmentsLoading}
            onLoadError={setAssignmentLoadError}
            saveError={errors.classification}
            onPrimaryPathChange={applyPrimaryCatalogPath}
            onEstablishedProductKindLoad={setInitialCatalogProductKind}
            allowedPrimaryProductKinds={
              commerceEnabled
                ? undefined
                : [
                    initialCatalogProductKind ||
                      "UNSTITCHED_FABRIC",
                  ]
            }
          />
          <FieldError message={errors.classification} />
        </>
      ) : (
        <Card>
          <CardHeader>
            <SectionHeading>Product classification</SectionHeading>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={product.categoryId} onValueChange={(value) => updateProduct("categoryId", value)}>
                <SelectTrigger><SelectValue placeholder={optionsLoading ? "Loading…" : "Choose category"} /></SelectTrigger>
                <SelectContent>{categories.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {isProductEditorFieldVisible(selectedEditorSchema.fields.fabric) && (
              <div className="space-y-2">
                <Label>
                  {selectedEditorSchema.fields.fabric.label}{" "}
                  {isProductEditorFieldRequired(selectedEditorSchema.fields.fabric)
                    ? "*"
                    : "(optional)"}
                </Label>
                <Select value={product.fabricType} onValueChange={(value) => updateProduct("fabricType", value)}>
                  <SelectTrigger><SelectValue placeholder="Choose fabric" /></SelectTrigger>
                  <SelectContent>{fabricTypes.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><SectionHeading>Basics</SectionHeading></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Product name *</Label>
              <Input id="name" value={product.name} onChange={(event) => updateProduct("name", event.target.value)} aria-invalid={Boolean(errors.name)} autoFocus={!catalogEnabled} />
              <FieldError message={errors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">Product code (SKU) *</Label>
              <Input id="sku" value={product.sku} onChange={(event) => updateProduct("sku", event.target.value)} aria-invalid={Boolean(errors.sku)} />
              <FieldError message={errors.sku} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Short description *</Label>
            <Input id="description" value={product.description} onChange={(event) => updateProduct("description", event.target.value)} aria-invalid={Boolean(errors.description)} placeholder="A clear one-line summary for product cards" />
            <FieldError message={errors.description} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><SectionHeading>Photos and video</SectionHeading></CardHeader>
        <CardContent className="space-y-4">
          <div id="images" tabIndex={-1} className="space-y-2">
            <Label>Product images *</Label>
            <div className="flex flex-wrap gap-3">
              {product.images.map((source, index) => (
                <div key={`${source}-${index}`} className="group relative h-28 w-28 overflow-hidden rounded-lg border bg-muted">
                  <Image src={source} alt={`Product image ${index + 1}`} fill sizes="112px" className="object-cover" />
                  <button type="button" aria-label={`Remove product image ${index + 1}`} onClick={() => { setIsDirty(true); setProduct((current) => ({ ...current, images: current.images.filter((_, itemIndex) => itemIndex !== index) })); }} className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive opacity-100 shadow-sm sm:opacity-0 sm:group-hover:opacity-100">
                    <X className="h-4 w-4" />
                  </button>
                  {index === 0 && <Badge className="absolute bottom-1 left-1">Cover</Badge>}
                </div>
              ))}
              {product.images.length < 10 && (
                <label htmlFor="product-image-upload" className={cn("flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:border-primary hover:text-foreground", uploadingImage && "pointer-events-none opacity-60")}>
                  {uploadingImage ? <Loader2 className="mb-2 h-5 w-5 animate-spin" /> : <ImageIcon className="mb-2 h-5 w-5" />}
                  Add images
                </label>
              )}
              <input id="product-image-upload" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploadingImage || product.images.length >= 10} onChange={async (event) => {
                const files = Array.from(event.target.files || []).slice(0, 10 - product.images.length);
                for (const file of files) await upload(file, "image");
                event.target.value = "";
              }} />
            </div>
            <FieldError message={errors.images} />
          </div>

          <div className="space-y-2">
            <Label>Product video (optional)</Label>
            {product.videoUrl ? (
              <div className="relative w-fit">
                <video src={product.videoUrl} className="h-28 w-48 rounded-lg border bg-muted object-cover" muted />
                <button type="button" aria-label="Remove product video" onClick={() => updateProduct("videoUrl", undefined)} className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive shadow-sm"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <label htmlFor="product-video-upload" className={cn("flex h-20 w-48 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground hover:border-primary hover:text-foreground", uploadingVideo && "pointer-events-none opacity-60")}>
                {uploadingVideo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Video className="mr-2 h-4 w-4" />}
                Add video
              </label>
            )}
            <input id="product-video-upload" className="sr-only" type="file" accept="video/mp4,video/webm" disabled={uploadingVideo} onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file, "video");
              event.target.value = "";
            }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><SectionHeading>Price and inventory</SectionHeading></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="price">Price (PKR) *</Label>
              <Input id="price" type="number" min="0" value={product.price || ""} onChange={(event) => updateProduct("price", Number(event.target.value))} aria-invalid={Boolean(errors.price)} />
              <FieldError message={errors.price} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="originalPrice">Compare-at price</Label>
              <Input id="originalPrice" type="number" min="0" value={product.originalPrice || ""} onChange={(event) => updateProduct("originalPrice", event.target.value ? Number(event.target.value) : undefined)} aria-invalid={Boolean(errors.originalPrice)} />
              <FieldError message={errors.originalPrice} />
            </div>
            <div className="space-y-2">
              <Label>Badge</Label>
              <Select value={product.badge?.toUpperCase() || "none"} onValueChange={(value) => updateProduct("badge", value === "none" ? undefined : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="none">No badge</SelectItem>{BADGES.map((badge) => <SelectItem key={badge} value={badge}>{badge.charAt(0) + badge.slice(1).toLocaleLowerCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          {usesVariantInventory ? (
            <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
              Inventory is tracked per {selectedEditorSchema.options.label.toLocaleLowerCase()} in
              Selling options below. The product total is calculated automatically.
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="stockQuantity">Stock quantity *</Label>
              <Input id="stockQuantity" type="number" min="0" step="1" value={product.stockQuantity} onChange={(event) => updateStockQuantity(Number.parseInt(event.target.value || "0", 10))} aria-invalid={Boolean(errors.stockQuantity)} />
              <FieldError message={errors.stockQuantity} />
            </div>
          )}
          <div className="space-y-2 sm:max-w-sm">
            <Label htmlFor="lowStockThreshold">
              Low-stock alert {usesVariantInventory ? "(total)" : ""} *
            </Label>
            <Input id="lowStockThreshold" type="number" min="1" step="1" value={product.lowStockThreshold} onChange={(event) => updateProduct("lowStockThreshold", Number.parseInt(event.target.value || "0", 10))} aria-invalid={Boolean(errors.lowStockThreshold)} />
            <FieldError message={errors.lowStockThreshold} />
          </div>
          {!usesVariantInventory && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={product.inStock} onCheckedChange={(value) => updateProduct("inStock", value === true)} />
              Available for sale
            </label>
          )}
        </CardContent>
      </Card>

      {classificationReady &&
        (isProductEditorFieldVisible(selectedEditorSchema.fields.fabric) ||
          isProductEditorFieldVisible(selectedEditorSchema.fields.color)) && (
        <Card>
          <CardHeader><SectionHeading>Product details</SectionHeading></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {isProductEditorFieldVisible(selectedEditorSchema.fields.fabric) && (
              <div className="space-y-2">
                <Label htmlFor="fabricType">
                  {selectedEditorSchema.fields.fabric.label}{" "}
                  {isProductEditorFieldRequired(selectedEditorSchema.fields.fabric)
                    ? "*"
                    : "(optional)"}
                </Label>
                <Select value={product.fabricType} onValueChange={(value) => updateProduct("fabricType", value)}>
                  <SelectTrigger id="fabricType" aria-invalid={Boolean(errors.fabricType)}><SelectValue placeholder={optionsLoading ? "Loading…" : "Choose fabric or material"} /></SelectTrigger>
                  <SelectContent>{fabricTypes.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}</SelectContent>
                </Select>
                <FieldError message={errors.fabricType} />
              </div>
            )}
            {isProductEditorFieldVisible(selectedEditorSchema.fields.color) && !hasUnstitchedColorVariants && (
              <div className="space-y-3 sm:col-span-2">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_3rem] sm:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="color">
                      {selectedEditorSchema.fields.color.label} name{" "}
                      {isProductEditorFieldRequired(selectedEditorSchema.fields.color)
                        ? "*"
                        : "(optional)"}
                    </Label>
                    <Input
                      id="color"
                      value={product.color}
                      onChange={(event) => updateProduct("color", event.target.value)}
                      placeholder="e.g. Royal blue"
                      aria-invalid={Boolean(errors.color)}
                    />
                    <FieldError message={errors.color} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colorHex">Hex code</Label>
                    <Input
                      id="colorHex"
                      value={product.colorHex}
                      onChange={(event) => updateColorHex(event.target.value)}
                      placeholder="#0088CC"
                      maxLength={7}
                      spellCheck={false}
                      autoCapitalize="characters"
                      aria-invalid={Boolean(errors.colorHex)}
                      aria-describedby={errors.colorHex ? "colorHex-error" : undefined}
                      className="font-mono uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colorHexPicker" className="sr-only">
                      {selectedEditorSchema.fields.color.label} picker
                    </Label>
                    <input
                      id="colorHexPicker"
                      type="color"
                      aria-label={`${selectedEditorSchema.fields.color.label} picker`}
                      value={colorPickerValue(product.colorHex)}
                      onChange={(event) => updateColorHex(event.target.value)}
                      className="h-10 w-12 cursor-pointer rounded border p-1"
                    />
                  </div>
                </div>
                <div id="colorHex-error">
                  <FieldError message={errors.colorHex} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {commerceEnabled && classificationReady && (
        <>
          <fieldset
            disabled={Boolean(sourceProductId) && commerceLoading}
            aria-busy={Boolean(sourceProductId) && commerceLoading}
            className="min-w-0 disabled:opacity-60"
          >
            <ProductCommerceProfileSection
              productId={sourceProductId}
              draft={commerceProfile}
              onChange={(nextProfile) => {
                if (!isDuplicate) {
                  setCommerceProfile(nextProfile);
                  return;
                }
                const duplicateProfile = {
                  ...nextProfile,
                  options: nextProfile.options.map(({ id: _id, ...option }) => ({
                    ...option,
                    values: option.values.map(({ id: _valueId, ...value }) => ({
                      ...value,
                    })),
                  })),
                  variants: nextProfile.variants.map(
                    ({ id: _id, ...variant }) => ({
                      ...variant,
                      sku: "",
                      images: [],
                    })
                  ),
                };
                setCommerceProfile(
                  catalogEnabled
                    ? duplicateProfile
                    : {
                        ...duplicateProfile,
                        productKind: "UNSTITCHED_FABRIC",
                        stitchingEligible: true,
                        requiresSelection: false,
                        optionLabel: defaultOptionLabelForKind(
                          "UNSTITCHED_FABRIC"
                        ),
                        sizeGuideUrl: "",
                        options: [],
                        variants: [],
                      }
                );
              }}
              onUserChange={(nextProfile) => {
                setCommerceProfile(nextProfile);
                setIsDirty(true);
                setServerSaveError(null);
                setErrors((current) => ({
                  ...current,
                  commerce: undefined,
                }));
              }}
              onProfilePresenceChange={setCommerceProfileExists}
              onLoadingChange={setCommerceLoading}
              onLoadError={setCommerceLoadError}
              saveError={errors.commerce}
              classification={selectedClassification}
              showProductType={!catalogEnabled}
              productTypeLocked={!catalogEnabled}
              onUploadVariantImage={uploadVariantImage}
            />
          </fieldset>
          {sourceProductId && commerceLoading && (
            <p className="text-sm text-muted-foreground" role="status">
              Loading existing selling options...
            </p>
          )}
          <FieldError message={errors.commerce} />
        </>
      )}

      <Card>
        <CardHeader><SectionHeading>Description and tags</SectionHeading></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="longDescription">Full description</Label>
            <Textarea id="longDescription" value={product.longDescription || ""} onChange={(event) => updateProduct("longDescription", event.target.value)} rows={5} placeholder="Materials, fit, care, scent notes, benefits, or anything else customers should know" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tagInput">Tags</Label>
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}<button type="button" aria-label={`Remove ${tag} tag`} onClick={() => updateProduct("tags", product.tags.filter((item) => item !== tag))}><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input id="tagInput" value={tagInput} onChange={(event) => setTagInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(tagInput); } }} placeholder="Type a tag" />
              <Button type="button" variant="outline" onClick={() => addTag(tagInput)}>Add</Button>
            </div>
            {contextualTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {contextualTags.map((tag) => <Button key={tag} type="button" size="sm" variant="ghost" className="h-7" onClick={() => addTag(tag)}><Plus className="mr-1 h-3 w-3" />{tag}</Button>)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <details
        className="rounded-xl border bg-card"
        open={seoOpen}
        onToggle={(event) => setSeoOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none px-5 py-4 font-semibold">
          SEO (optional)
          <span className="ml-2 text-sm font-normal text-muted-foreground">Uses product details by default</span>
        </summary>
        <div className="space-y-4 border-t p-5">
          <div className="space-y-2"><Label htmlFor="slug">URL slug</Label><Input id="slug" value={product.slug} onChange={(event) => updateProduct("slug", event.target.value)} placeholder="Generated from SKU when empty" aria-invalid={Boolean(errors.slug)} /><FieldError message={errors.slug} /></div>
          <div className="space-y-2"><Label htmlFor="metaTitle">Meta title</Label><Input id="metaTitle" value={product.metaTitle || ""} onChange={(event) => updateProduct("metaTitle", event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="metaDescription">Meta description</Label><Textarea id="metaDescription" value={product.metaDescription || ""} onChange={(event) => updateProduct("metaDescription", event.target.value)} rows={3} /></div>
        </div>
      </details>

      <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="h-4 w-4" />
          Category, product details, and selling options are saved together.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/admin/products">Cancel</Link></Button>
          <Button type="submit" disabled={saveDisabled}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {saving ? "Saving…" : "Save product"}
          </Button>
        </div>
      </div>
    </form>
  );
}
