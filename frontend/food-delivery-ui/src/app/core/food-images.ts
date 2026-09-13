import { FoodItem, Restaurant } from './models';

/**
 * Dish/restaurant imagery is derived on the client - the backend has no image
 * field. We map each dish to keyword-matched stock photography (LoremFlickr,
 * pinned per item id so the picture is stable across reloads), and fall back to
 * an inline SVG tile if the photo fails to load, so a card never shows a broken
 * image. A restaurant's thumbnail is its signature (first) menu item's photo.
 */

// Best-match keywords for the specific seeded dishes (lower-cased name -> query).
const NAME_KEYWORDS: Record<string, string> = {
  'butter chicken': 'butter,chicken',
  'chicken biryani': 'biryani',
  'paneer butter masala': 'paneer,curry',
  'paneer tikka': 'paneer,tikka',
  'dal tadka': 'dal,lentil',
  'tandoori roti': 'roti',
  'garlic naan': 'naan',
  'gulab jamun': 'indian,sweet',
  'mango lassi': 'lassi',
  'masala dosa': 'dosa',
  'idli sambar': 'idli',
  'filter coffee': 'coffee',
  'medu vada': 'vada',
  'rava kesari': 'dessert',
  'margherita pizza': 'pizza',
  'pepperoni pizza': 'pepperoni,pizza',
  'penne arrabbiata': 'pasta',
  'garlic bread': 'garlic,bread',
  'tiramisu': 'tiramisu',
  'hakka noodles': 'noodles',
  'chilli chicken': 'fried,chicken',
  'veg fried rice': 'fried,rice',
  'dim sum platter': 'dumpling',
  'honey chilli potato': 'potato',
  'classic cheeseburger': 'cheeseburger',
  'crispy chicken burger': 'chicken,burger',
  'loaded fries': 'fries',
  'veggie burger': 'burger',
  'chocolate milkshake': 'milkshake',
};

// Fallback keyword by menu category when the exact dish isn't mapped.
const CATEGORY_KEYWORDS: Record<string, string> = {
  'main course': 'curry',
  'rice': 'rice',
  'breads': 'bread',
  'starters': 'appetizer',
  'beverages': 'drink',
  'breakfast': 'breakfast',
  'desserts': 'dessert',
  'pizza': 'pizza',
  'pasta': 'pasta',
  'burgers': 'burger',
  'sides': 'fries',
};

function keywordsFor(name: string, category: string): string {
  const byName = NAME_KEYWORDS[name.trim().toLowerCase()];
  if (byName) return byName;
  const byCategory = CATEGORY_KEYWORDS[category.trim().toLowerCase()];
  return byCategory ?? 'food';
}

/** Keyword-matched photo for a dish, pinned to its id so it stays stable. */
export function foodImageUrl(item: FoodItem): string {
  const kw = encodeURIComponent(keywordsFor(item.name, item.category));
  return `https://loremflickr.com/600/400/${kw}?lock=${item.id}`;
}

/** Thumbnail for a restaurant: its signature (first available) item's photo. */
export function restaurantImageUrl(restaurant: Restaurant, items: FoodItem[]): string {
  const signature = items.find(i => i.restaurantId === restaurant.id && i.available)
    ?? items.find(i => i.restaurantId === restaurant.id);
  if (signature) return foodImageUrl(signature);
  const kw = encodeURIComponent(restaurant.cuisineType.split(/\s+/)[0].toLowerCase() || 'food');
  return `https://loremflickr.com/600/400/${kw},food?lock=${restaurant.id}`;
}

/** Inline SVG tile used when a photo fails to load - never a broken image. */
export function fallbackImage(label: string): string {
  const letter = (label || '?').trim().charAt(0).toUpperCase() || '?';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#f7c59f"/><stop offset="1" stop-color="#d9480f"/>` +
    `</linearGradient></defs>` +
    `<rect width="600" height="400" fill="url(#g)"/>` +
    `<text x="50%" y="50%" font-family="system-ui,sans-serif" font-size="180" font-weight="700" ` +
    `fill="rgba(255,255,255,0.92)" text-anchor="middle" dominant-baseline="central">${letter}</text>` +
    `</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** (error) handler helper: swap a broken photo for the SVG tile, once. */
export function swapToFallback(event: Event, label: string): void {
  const img = event.target as HTMLImageElement;
  const fallback = fallbackImage(label);
  if (img.src !== fallback) {
    img.src = fallback;
  }
}
