import { Database } from '@nozbe/watermelondb';
import Category from '../models/Category';

export interface DefaultCategory {
  name: string;
  icon: string;
  color: string;
  keywords: string[];
  sortOrder: number;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Food & Dining',
    icon: 'ForkKnife',
    color: '#F57C00',
    keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'dining', 'eat', 'meal', 'biryani', 'pizza', 'burger', 'dominos', 'mcdonalds', 'kfc', 'starbucks', 'chai', 'tea', 'coffee'],
    sortOrder: 1,
  },
  {
    name: 'Transport',
    icon: 'Car',
    color: '#1E88E5',
    keywords: ['uber', 'ola', 'rapido', 'irctc', 'railway', 'metro', 'bus', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'cab', 'auto', 'rickshaw', 'flight', 'airline'],
    sortOrder: 2,
  },
  {
    name: 'Shopping',
    icon: 'ShoppingCart',
    color: '#8E24AA',
    keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'shopping', 'mall', 'store', 'retail', 'clothing', 'shoes', 'electronics', 'furniture'],
    sortOrder: 3,
  },
  {
    name: 'Bills & Utilities',
    icon: 'Lightning',
    color: '#D32F2F',
    keywords: ['electricity', 'water', 'gas', 'phone', 'mobile', 'internet', 'wifi', 'broadband', 'jio', 'airtel', 'vi', 'bsnl', 'bill', 'recharge', 'dth', 'tata sky'],
    sortOrder: 4,
  },
  {
    name: 'Rent & EMI',
    icon: 'House',
    color: '#5D4037',
    keywords: ['rent', 'emi', 'loan', 'mortgage', 'housing', 'apartment', 'flat', 'home loan', 'car loan', 'personal loan', 'bajaj', 'hdfc loan'],
    sortOrder: 5,
  },
  {
    name: 'Health',
    icon: 'Heartbeat',
    color: '#00897B',
    keywords: ['hospital', 'doctor', 'medical', 'pharmacy', 'medicine', 'apollo', 'practo', 'medplus', 'netmeds', 'pharmeasy', 'gym', 'fitness', 'yoga', 'cult.fit'],
    sortOrder: 6,
  },
  {
    name: 'Education',
    icon: 'GraduationCap',
    color: '#1565C0',
    keywords: ['school', 'college', 'university', 'tuition', 'course', 'udemy', 'coursera', 'book', 'library', 'exam', 'coaching', 'byjus', 'unacademy'],
    sortOrder: 7,
  },
  {
    name: 'Entertainment',
    icon: 'FilmStrip',
    color: '#E91E63',
    keywords: ['movie', 'netflix', 'prime', 'hotstar', 'spotify', 'youtube', 'gaming', 'concert', 'theatre', 'bookmyshow', 'inox', 'pvr', 'subscription', 'disney'],
    sortOrder: 8,
  },
  {
    name: 'Groceries',
    icon: 'Basket',
    color: '#689F38',
    keywords: ['grocery', 'bigbasket', 'blinkit', 'zepto', 'instamart', 'dmart', 'reliance fresh', 'vegetables', 'fruits', 'milk', 'dairy', 'supermarket', 'kirana'],
    sortOrder: 9,
  },
  {
    name: 'Income',
    icon: 'CurrencyInr',
    color: '#2E7D32',
    keywords: ['salary', 'income', 'credit', 'refund', 'cashback', 'dividend', 'interest', 'bonus', 'freelance', 'payment received'],
    sortOrder: 10,
  },
  {
    name: 'Investments',
    icon: 'TrendUp',
    color: '#00695C',
    keywords: ['sip', 'mutual fund', 'stock', 'share', 'zerodha', 'groww', 'upstox', 'fd', 'fixed deposit', 'ppf', 'nps', 'gold', 'investment', 'trading'],
    sortOrder: 11,
  },
  {
    name: 'Others',
    icon: 'DotsThree',
    color: '#78909C',
    keywords: [],
    sortOrder: 12,
  },
];

export async function seedDefaultCategories(database: Database): Promise<void> {
  const categoriesCollection = database.get<Category>('categories');
  const existingCategories = await categoriesCollection.query().fetchCount();

  if (existingCategories > 0) {
    return; // Already seeded
  }

  await database.write(async () => {
    const batch = DEFAULT_CATEGORIES.map((cat) =>
      categoriesCollection.prepareCreate((record: Category) => {
        record.name = cat.name;
        record.icon = cat.icon;
        record.color = cat.color;
        record.budgetLimit = null as unknown as number;
        record.isDefault = true;
        record.parentCategoryId = null as unknown as string;
        record.keywords = JSON.stringify(cat.keywords);
        record.sortOrder = cat.sortOrder;
      }),
    );

    await database.batch(...batch);
  });
}
