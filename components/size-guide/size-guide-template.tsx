"use client";

import Image from "next/image";
import mensShirtSizeGuide from "@/size guide/shirt size guide.jpeg";
import mensSuitSizeGuide from "@/size guide/mens size guide for pent coat.jpeg";
import waistcoatSizeGuide from "@/size guide/waistcoat size chart.jpeg";
import womensReadywearSizeGuide from "@/size guide/Ladies Measurement.jpeg";
import {
  getSizeGuideTemplate,
  SIZE_GUIDE_TEMPLATES,
  type SizeGuideTemplateKey,
} from "@/lib/size-guide";

const templateImages = {
  "mens-shirt": mensShirtSizeGuide,
  "mens-suit": mensSuitSizeGuide,
  waistcoat: waistcoatSizeGuide,
  "womens-readywear": womensReadywearSizeGuide,
} satisfies Record<SizeGuideTemplateKey, typeof mensShirtSizeGuide>;

export function SizeGuideTemplateImage({
  templateKey,
  priority = false,
}: {
  templateKey: SizeGuideTemplateKey;
  priority?: boolean;
}) {
  const template = getSizeGuideTemplate(templateKey);

  return (
    <figure className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-white">
        <Image
          src={templateImages[templateKey]}
          alt={`${template.title} size chart`}
          priority={priority}
          sizes="(max-width: 768px) 100vw, 760px"
          className="h-auto w-full"
        />
      </div>
      <figcaption className="text-sm text-muted-foreground">
        {template.description}
      </figcaption>
    </figure>
  );
}

export function SizeGuideTemplateGallery() {
  return (
    <div className="space-y-10">
      {SIZE_GUIDE_TEMPLATES.map((template, index) => (
        <section key={template.key} aria-labelledby={`size-guide-${template.key}`}>
          <h2 id={`size-guide-${template.key}`} className="mb-4 text-2xl font-semibold">
            {template.title}
          </h2>
          <SizeGuideTemplateImage templateKey={template.key} priority={index === 0} />
        </section>
      ))}
    </div>
  );
}
