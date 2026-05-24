export type Badge = "New" | "Trending" | "Hot" | "Limited" | "Featured";

export interface Product {
  id: string;
  name: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  description: string;
  longDescription: string;
  fabricType: "Cotton" | "Wash & Wear" | "Boski" | "Wool Blend" | "Khaddar";
  color: string;
  colorHex: string;
  images: string[];
  imageLabels?: string[];
  videoUrl?: string;
  tags?: string[];
  badge?: Badge;
  inStock: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  sku: string;
  metaTitle?: string;
  metaDescription?: string;
  rating?: number;
  reviewCount?: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  productCount: number;
}

export const categories: Category[] = [
  {
    id: "cotton",
    name: "Cotton",
    description: "Breathable comfort for every season",
    image:
      "/images/fabrics/cat_cotton_1776582727723.png",
    productCount: 24,
  },
  {
    id: "wash-wear",
    name: "Wash & Wear",
    description: "Effortless elegance, easy care",
    image:
      "/images/fabrics/hero_wash_1776582631696.png",
    productCount: 18,
  },
  {
    id: "boski",
    name: "Boski",
    description: "Luxurious silk-cotton blend",
    image:
      "/images/fabrics/hero_boski_1776582616605.png",
    productCount: 12,
  },
  {
    id: "wool-blend",
    name: "Wool Blend",
    description: "Premium warmth for winter",
    image:
      "/images/fabrics/cat_wool_1776583171222.png",
    productCount: 8,
  },
  {
    id: "khaddar",
    name: "Khaddar",
    description: "Traditional handwoven excellence",
    image:
      "/images/fabrics/promo_1776582682565.png",
    productCount: 15,
  },
];

export const products: Product[] = [
  {
    id: "1",
    name: "Royal Ivory Premium Wash & Wear",
    price: 4500,
    originalPrice: 5500,
    description:
      "Experience unparalleled comfort with our signature wash & wear fabric.",
    longDescription:
      "Crafted from the finest imported yarns, this premium wash & wear fabric offers the perfect balance of sophistication and practicality. The fabric features a subtle sheen that catches light beautifully, making it ideal for both formal occasions and everyday elegance. Machine washable and wrinkle-resistant, this fabric maintains its pristine appearance wash after wash.",
    fabricType: "Wash & Wear",
    color: "Ivory",
    colorHex: "#FFFFF0",
    images: [
      "/images/fabrics/cat_cotton_1776582727723.png",
      "/images/fabrics/hero_wash_1776582631696.png",
      "/images/fabrics/hero_boski_1776582616605.png",
    ],
    badge: "New",
    inStock: true,
    sku: "ET-WW-001",
  },
  {
    id: "2",
    name: "Midnight Black Cotton Suit",
    price: 3800,
    description:
      "Classic black cotton for the distinguished gentleman.",
    longDescription:
      "Our midnight black cotton suit fabric is woven from 100% premium Egyptian cotton, offering exceptional breathability and comfort. The deep, rich black color is achieved through a special dyeing process that ensures colorfastness and longevity. Perfect for formal events or creating a sophisticated everyday look.",
    fabricType: "Cotton",
    color: "Black",
    colorHex: "#1a1a1a",
    images: [
      "/images/fabrics/hero_banner_1_1776582592087.png",
      "/images/fabrics/cat_wool_1776583171222.png",
      "/images/fabrics/cat_cotton_1776582727723.png",
    ],
    badge: "Trending",
    inStock: true,
    sku: "ET-CT-002",
  },
  {
    id: "3",
    name: "Champagne Boski Silk Blend",
    price: 7500,
    originalPrice: 8500,
    description:
      "Luxurious silk-cotton blend for special occasions.",
    longDescription:
      "Indulge in the opulence of our Champagne Boski, a masterful blend of silk and cotton that drapes beautifully and feels incredible against the skin. The champagne hue adds a touch of understated luxury, making this fabric perfect for weddings, formal dinners, and celebratory occasions.",
    fabricType: "Boski",
    color: "Champagne",
    colorHex: "#F7E7CE",
    images: [
      "/images/fabrics/hero_boski_1776582616605.png",
      "/images/fabrics/hero_boski_1776582616605.png",
      "/images/fabrics/cat_cotton_1776582727723.png",
    ],
    badge: "Limited",
    inStock: true,
    sku: "ET-BK-003",
  },
  {
    id: "4",
    name: "Charcoal Grey Wool Blend",
    price: 6200,
    description:
      "Premium wool blend for the colder months.",
    longDescription:
      "Stay warm and stylish with our Charcoal Grey Wool Blend. This premium fabric combines the natural warmth of wool with the durability of synthetic fibers, creating a suit fabric that's both luxurious and practical. The charcoal grey color is versatile and sophisticated, suitable for business settings and formal occasions alike.",
    fabricType: "Wool Blend",
    color: "Charcoal Grey",
    colorHex: "#36454F",
    images: [
      "/images/fabrics/cat_wool_1776583171222.png",
      "/images/fabrics/cat_wool_1776583171222.png",
      "/images/fabrics/hero_wash_1776582631696.png",
    ],
    badge: "Hot",
    inStock: true,
    sku: "ET-WB-004",
  },
  {
    id: "5",
    name: "Camel Brown Khaddar",
    price: 4200,
    description:
      "Traditional handwoven khaddar in rich camel brown.",
    longDescription:
      "Embrace tradition with our handwoven Camel Brown Khaddar. Each piece is crafted by skilled artisans using time-honored techniques passed down through generations. The natural texture and warmth of khaddar make it perfect for winter wear, while the rich camel brown color adds an earthy sophistication to your wardrobe.",
    fabricType: "Khaddar",
    color: "Camel Brown",
    colorHex: "#C19A6B",
    images: [
      "/images/fabrics/promo_1776582682565.png",
      "/images/fabrics/promo_1776582682565.png",
      "/images/fabrics/hero_banner_1_1776582592087.png",
    ],
    inStock: true,
    sku: "ET-KD-005",
  },
  {
    id: "6",
    name: "Navy Blue Premium Cotton",
    price: 3600,
    description:
      "Timeless navy blue in premium cotton weave.",
    longDescription:
      "A wardrobe essential, our Navy Blue Premium Cotton offers the perfect foundation for both casual and formal attire. The rich navy hue is achieved through multiple dyeing processes for exceptional depth and colorfastness. Soft, breathable, and incredibly versatile.",
    fabricType: "Cotton",
    color: "Navy Blue",
    colorHex: "#000080",
    images: [
      "/images/fabrics/hero_banner_1_1776582592087.png",
      "/images/fabrics/hero_wash_1776582631696.png",
      "/images/fabrics/hero_wash_1776582631696.png",
    ],
    badge: "Trending",
    inStock: true,
    sku: "ET-CT-006",
  },
  {
    id: "7",
    name: "Pearl White Wash & Wear",
    price: 4800,
    description:
      "Pristine pearl white for summer elegance.",
    longDescription:
      "Our Pearl White Wash & Wear embodies summer sophistication. The fabric features a subtle luster that catches light beautifully while remaining completely wrinkle-resistant. Perfect for outdoor events, beach weddings, or simply looking effortlessly elegant in the warmer months.",
    fabricType: "Wash & Wear",
    color: "Pearl White",
    colorHex: "#F8F6F0",
    images: [
      "/images/fabrics/hero_wash_1776582631696.png",
      "/images/fabrics/cat_cotton_1776582727723.png",
      "/images/fabrics/cat_cotton_1776582727723.png",
    ],
    badge: "New",
    inStock: true,
    sku: "ET-WW-007",
  },
  {
    id: "8",
    name: "Emerald Green Boski",
    price: 7800,
    description:
      "Royal emerald green in luxurious boski fabric.",
    longDescription:
      "Make a statement with our Emerald Green Boski. This stunning fabric combines the richness of emerald green with the luxurious feel of silk-cotton blend. The color is inspired by the precious gemstone, offering depth and vibrancy that turns heads. Ideal for festive occasions and celebrations.",
    fabricType: "Boski",
    color: "Emerald Green",
    colorHex: "#50C878",
    images: [
      "/images/fabrics/hero_boski_1776582616605.png",
      "/images/fabrics/hero_boski_1776582616605.png",
      "/images/fabrics/hero_boski_1776582616605.png",
    ],
    badge: "Limited",
    inStock: true,
    sku: "ET-BK-008",
  },
  {
    id: "9",
    name: "Slate Grey Cotton",
    price: 3400,
    description:
      "Modern slate grey for contemporary style.",
    longDescription:
      "Our Slate Grey Cotton offers a modern take on traditional suiting. The sophisticated grey tone works seamlessly with any color palette, making it incredibly versatile for mixing and matching. Premium cotton weave ensures all-day comfort and breathability.",
    fabricType: "Cotton",
    color: "Slate Grey",
    colorHex: "#708090",
    images: [
      "/images/fabrics/hero_wash_1776582631696.png",
      "/images/fabrics/cat_cotton_1776582727723.png",
      "/images/fabrics/cat_cotton_1776582727723.png",
    ],
    inStock: true,
    sku: "ET-CT-009",
  },
  {
    id: "10",
    name: "Burgundy Wool Blend",
    price: 6500,
    originalPrice: 7200,
    description:
      "Rich burgundy wool blend for distinguished gentlemen.",
    longDescription:
      "Our Burgundy Wool Blend is for the gentleman who appreciates bold elegance. The deep, wine-inspired color speaks of confidence and sophistication. Combined with the warmth and drape of premium wool blend, this fabric creates suits that command attention while ensuring comfort.",
    fabricType: "Wool Blend",
    color: "Burgundy",
    colorHex: "#800020",
    images: [
      "/images/fabrics/cat_wool_1776583171222.png",
      "/images/fabrics/cat_wool_1776583171222.png",
      "/images/fabrics/promo_1776582682565.png",
    ],
    badge: "Hot",
    inStock: true,
    sku: "ET-WB-010",
  },
  {
    id: "11",
    name: "Off-White Khaddar",
    price: 4000,
    description:
      "Classic off-white handwoven khaddar.",
    longDescription:
      "The epitome of traditional elegance, our Off-White Khaddar is handwoven by master craftsmen using techniques perfected over generations. The natural off-white color showcases the beautiful texture of the weave, creating suits that are both timeless and contemporary.",
    fabricType: "Khaddar",
    color: "Off-White",
    colorHex: "#FAF9F6",
    images: [
      "/images/fabrics/promo_1776582682565.png",
      "/images/fabrics/hero_banner_1_1776582592087.png",
      "/images/fabrics/promo_1776582682565.png",
    ],
    badge: "New",
    inStock: true,
    sku: "ET-KD-011",
  },
  {
    id: "12",
    name: "Silver Mist Wash & Wear",
    price: 4600,
    description:
      "Elegant silver mist for subtle sophistication.",
    longDescription:
      "Our Silver Mist Wash & Wear captures the essence of understated luxury. The subtle silver tone adds a contemporary edge while maintaining classic appeal. Wrinkle-resistant and easy to care for, this fabric is perfect for the modern gentleman on the go.",
    fabricType: "Wash & Wear",
    color: "Silver Mist",
    colorHex: "#C0C0C0",
    images: [
      "/images/fabrics/hero_wash_1776582631696.png",
      "/images/fabrics/hero_wash_1776582631696.png",
      "/images/fabrics/cat_cotton_1776582727723.png",
    ],
    badge: "Trending",
    inStock: true,
    sku: "ET-WW-012",
  },
];

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductsByCategory(
  fabricType: Product["fabricType"]
): Product[] {
  return products.filter((p) => p.fabricType === fabricType);
}

export function getRelatedProducts(
  productId: string,
  limit: number = 4
): Product[] {
  const product = getProductById(productId);
  if (!product) return [];

  return products
    .filter((p) => p.id !== productId && p.fabricType === product.fabricType)
    .slice(0, limit);
}

export function formatPrice(price: number): string {
  return `PKR ${price.toLocaleString()}`;
}
