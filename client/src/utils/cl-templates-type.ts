import type { Template } from "@/types";

const clTemplates: Template[] = [
  {
    id: "aether",
    name: "Aether Professional",
    description: "A clean, minimalist template with a focus on typography and readability. Perfect for professionals who want to make a strong impression through elegant simplicity.",
    category: "Minimalist",
    theme: "elements",
    color: "from-gray-700 to-gray-900",
    icon: "🌪️",
    available: true,
    features: [
      "Clean, minimalist design",
      "Professional typography",
      "Optimized spacing",
      "ATS-friendly format"
    ]
  },
  {
    id: "aqua",
    name: "Aqua Modern",
    description: "A contemporary two-column design with a refreshing blue accent. Ideal for professionals in creative and technical fields who want a modern approach.",
    category: "Modern",
    theme: "elements",
    color: "from-blue-600 to-blue-800",
    icon: "💧",
    available: true,
    features: [
      "Two-column layout",
      "Modern visual hierarchy",
      "Blue accent design",
      "Creative formatting"
    ]
  },
  {
    id: "ignis",
    name: "Ignis Dynamic",
    description: "A bold template with warm accents and strong visual elements. Designed for dynamic professionals who want to stand out with energy and passion.",
    category: "Dynamic",
    theme: "elements",
    color: "from-orange-500 to-red-600",
    icon: "🔥",
    available: true,
    features: [
      "Bold visual elements",
      "Warm accent colors",
      "Dynamic layout",
      "High impact design"
    ]
  },
  {
    id: "terra",
    name: "Terra Classic",
    description: "A traditional yet elegant template with a professional layout. Perfect for conservative industries where classic presentation is valued.",
    category: "Classic",
    theme: "elements",
    color: "from-emerald-600 to-teal-700",
    icon: "🌍",
    available: true,
    features: [
      "Traditional layout",
      "Professional presentation",
      "Classic formatting",
      "Industry standard design"
    ]
  },
  {
    id: "ventus",
    name: "Ventus Elegant",
    description: "An elegant two-column design with sophisticated accents. Ideal for professionals seeking a refined presentation that balances modernity with tradition.",
    category: "Elegant",
    theme: "elements",
    color: "from-cyan-500 to-blue-600",
    icon: "💨",
    available: true,
    features: [
      "Two-column layout",
      "Elegant design elements",
      "Sophisticated accents",
      "Refined presentation"
    ]
  }
];

export default clTemplates;
