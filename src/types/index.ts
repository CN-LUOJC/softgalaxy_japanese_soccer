export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  sizes: string[];
  category: string;
  images: string[];
  description: string;
  isNew?: boolean;
  isOnSale?: boolean;
  inStock: boolean;
  brand: string;
  season?: string;
  material?: string;
  club?: string;
  league?: string;
  tags?: string[];
}

export interface CartItem {
  id: string;
  product: Product;
  size: string;
  quantity: number;
}

export interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, size: string, quantity: number) => void;
  removeItem: (id: string, size: string) => void;
  updateQuantity: (id: string, size: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export interface FilterOptions {
  category: string;
  priceRange: [number, number];
  size: string;
  brand: string;
}

export interface ChainMeta {
  id: number;
  name: string;
  currency: string;
  explorerUrl: string;
  isTestnet: boolean;
}

export interface CheckoutFormData {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface StripeCheckoutSession {
  id: string;
  url: string;
}
