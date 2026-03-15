
export const COLORS = {
  sage: "#6e7568",
  cream: "#FBF7EF",
  espresso: "#26150B",
  rust: "#763417", // New Brand Color
  burgundy: "#462b2c",
  sageLight: "#8a9384",
  creamDark: "#EDE8DC",
};

// Credit Packages available for purchase
export const CREDIT_PACKAGES = [
  {
    id: 'credits-1',
    name: 'Single Session',
    credits: 1,
    price: 150,
    bonusCredits: 0,
    description: 'Perfect for trying out a single class',
    isActive: true,
    sortOrder: 1
  },
  {
    id: 'credits-3',
    name: '3-Class Pack',
    credits: 3,
    price: 990,
    bonusCredits: 0,
    description: 'Save R60 - Great for getting started',
    isActive: true,
    sortOrder: 2
  },
  {
    id: 'credits-5',
    name: '5-Class Pack',
    credits: 5,
    price: 1500,
    bonusCredits: 1,
    description: 'Save R250 - Get 1 bonus class!',
    isActive: true,
    sortOrder: 3
  },
  {
    id: 'credits-10',
    name: '10-Class Pack',
    credits: 10,
    price: 2800,
    bonusCredits: 2,
    description: 'Save R700 - Best value! 2 bonus classes',
    isActive: true,
    sortOrder: 4
  }
];

// App Configuration Constants
export const DEFAULT_CLASS_CAPACITY = 15;
export const MIN_CANCEL_HOURS = 24;
