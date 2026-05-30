const { z } = require("zod");

const featuredCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  image: z.string(),
  productCount: z.number().optional().default(0),
});

const arraySchema = z.array(featuredCategorySchema);

try {
  arraySchema.parse([
    {
      id: "",
      name: "New Category",
      description: "Description",
      image: "",
      productCount: 0,
    }
  ]);
  console.log("Parse successful");
} catch (e) {
  console.error("Parse failed:", e.errors);
}
