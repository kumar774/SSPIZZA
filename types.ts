export type CategoryType = 'Veg' | 'Non-Veg' | 'Drinks' | 'Dessert';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: CategoryType;
  isBestseller?: boolean;
  rating?: number;
  votes?: number;
  available?: boolean;
}

export interface ThemeSettings {
  headerColor?: string;
  footerColor?: string;
  headerText?: string;
  footerText?: string;
  logoUrl?: string;
  // New CMS Fields
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string; // Overrides banner if specific for hero
  primaryColor?: string;
}

export interface TaxSettings {
  gstPercentage: number;
  serviceChargePercentage: number;
  applyTax: boolean;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisine: string[];
  rating: number;
  deliveryTime: string;
  bannerImage: string;
  logo: string;
  location: string;
  contact?: string;
  openingHours?: string;
  menu: MenuItem[];
  theme?: ThemeSettings;
  taxSettings?: TaxSettings;
  socialMedia?: SocialLinks;
  whatsappNumber?: string;
  receiptFooter?: string;
  upiId?: string; // New field for Payments
  defaultDeliveryCharge?: number; // New field for Delivery
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  total: number;
}

export type OrderStatus = 'Pending' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled';
export type OrderType = 'Dine-in' | 'Takeaway' | 'Delivery' | 'Online' | 'POS';
export type PaymentStatus = 'Pending' | 'Paid';
export type PaymentMethod = 'Cash' | 'Online' | 'Card';

export interface Order {
  id: string;
  restaurantId: string;
  items: CartItem[];
  total: number;
  subtotal?: number;
  discount?: number;
  deliveryCharge?: number;
  status: OrderStatus;
  orderType: OrderType;
  source?: 'Reception' | 'Online';
  orderSource?: string;
  customerName?: string;
  customerPhone?: string;
  tableNo?: string;
  createdAt: string; 
  // Payment Tracking
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  taxDetails?: any;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
}