import { FoodItem, Restaurant } from './models';

/**
 * Dish/restaurant imagery is derived on the client - the backend has no image field.
 * Each seeded dish is mapped to a curated, dish-accurate photo hosted on Wikimedia Commons'
 * CDN (upload.wikimedia.org - reliable, freely licensed). Unmapped dishes fall back to a
 * representative photo for their category, and any image that fails to load is swapped for an
 * inline SVG tile, so a card never shows a broken image. A restaurant's thumbnail is its
 * signature (first) menu item's photo, or a photo representative of its cuisine.
 *
 * (The previous LoremFlickr keyword service was retired - it began returning HTTP 500, which is
 * why every card had fallen back to the letter tile.)
 */

// Exact dish name (lower-cased) -> curated photo of that dish.
const DISH_IMAGES: Record<string, string> = {
  'butter chicken': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Butter_Chicken_%26_Butter_Naan_-_Home_-_Chandigarh_-_India_-_0006.jpg/960px-Butter_Chicken_%26_Butter_Naan_-_Home_-_Chandigarh_-_India_-_0006.jpg',
  'chicken biryani': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/%22Hyderabadi_Dum_Biryani%22.jpg/960px-%22Hyderabadi_Dum_Biryani%22.jpg',
  'paneer butter masala': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Paneer_butter_masala_2.jpg/960px-Paneer_butter_masala_2.jpg',
  'paneer tikka': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Paneer_tikka.jpg/960px-Paneer_tikka.jpg',
  'dal tadka': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Punjabi_style_Dal_Makhani.jpg/960px-Punjabi_style_Dal_Makhani.jpg',
  'tandoori roti': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/2020-05-08_19_34_28_Chapati_being_made_in_a_pan_in_the_Franklin_Farm_section_of_Oak_Hill%2C_Fairfax_County%2C_Virginia.jpg/960px-2020-05-08_19_34_28_Chapati_being_made_in_a_pan_in_the_Franklin_Farm_section_of_Oak_Hill%2C_Fairfax_County%2C_Virginia.jpg',
  'garlic naan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Annapurna_Naan.jpg/960px-Annapurna_Naan.jpg',
  'gulab jamun': 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Gulab-jamun-wallpaper-1.jpg',
  'mango lassi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Mango_lassi_at_Everest_Dine_in_November_2022.jpg/960px-Mango_lassi_at_Everest_Dine_in_November_2022.jpg',
  'masala dosa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Masala_Dosa_2023.jpg/960px-Masala_Dosa_2023.jpg',
  'idli sambar': 'https://upload.wikimedia.org/wikipedia/commons/1/11/Idli_Sambar.JPG',
  'filter coffee': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Filter_kaapi.JPG/960px-Filter_kaapi.JPG',
  'medu vada': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Medu_Vada.JPG/960px-Medu_Vada.JPG',
  'rava kesari': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/KEsari_baat.jpg/960px-KEsari_baat.jpg',
  'margherita pizza': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Neapolitan_pizza_at_Trappica_%2848701940197%29.jpg/960px-Neapolitan_pizza_at_Trappica_%2848701940197%29.jpg',
  'pepperoni pizza': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Pepperoni_Pizza_%2829204589095%29.jpg/960px-Pepperoni_Pizza_%2829204589095%29.jpg',
  'penne arrabbiata': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Penne_Arrabbiata.jpg/960px-Penne_Arrabbiata.jpg',
  'garlic bread': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Garlicbread.jpg/960px-Garlicbread.jpg',
  'tiramisu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Tiramisu_-_Raffaele_Diomede.jpg/960px-Tiramisu_-_Raffaele_Diomede.jpg',
  'hakka noodles': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Tasty_hakka_noodles_image.jpg/960px-Tasty_hakka_noodles_image.jpg',
  'chilli chicken': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Chicken_Chilli.JPG/960px-Chicken_Chilli.JPG',
  'veg fried rice': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Vegetable_fried_rice_from_Kerala.jpg/960px-Vegetable_fried_rice_from_Kerala.jpg',
  'dim sum platter': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Chinese_DimSum_%289023590541%29.jpg/960px-Chinese_DimSum_%289023590541%29.jpg',
  'honey chilli potato': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Honey_chilli_potato_2.jpg/960px-Honey_chilli_potato_2.jpg',
  'classic cheeseburger': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Cheeseburger.jpg/960px-Cheeseburger.jpg',
  'crispy chicken burger': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Argentine_chicken_burger_sandwich_with_lettuce%2C_tomato%2C_fried_egg%2C_and_mozzarella_cheese_on_Don_Yeyo_bun_-_Front_view.jpg/960px-Argentine_chicken_burger_sandwich_with_lettuce%2C_tomato%2C_fried_egg%2C_and_mozzarella_cheese_on_Don_Yeyo_bun_-_Front_view.jpg',
  'loaded fries': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Shake_shack_cheese_fries.jpg/960px-Shake_shack_cheese_fries.jpg',
  'veggie burger': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/%D7%94%D7%9E%D7%91%D7%95%D7%A8%D7%92%D7%A8_%D7%98%D7%91%D7%A2%D7%95%D7%A0%D7%99.jpg/960px-%D7%94%D7%9E%D7%91%D7%95%D7%A8%D7%92%D7%A8_%D7%98%D7%91%D7%A2%D7%95%D7%A0%D7%99.jpg',
  'chocolate milkshake': 'https://upload.wikimedia.org/wikipedia/commons/a/a8/Chocolate_milkshake.jpg',
};

// Representative photo per menu category, for a dish not in the map above.
const CATEGORY_IMAGES: Record<string, string> = {
  'main course': DISH_IMAGES['butter chicken'],
  'rice': DISH_IMAGES['chicken biryani'],
  'breads': DISH_IMAGES['garlic naan'],
  'starters': DISH_IMAGES['paneer tikka'],
  'beverages': DISH_IMAGES['mango lassi'],
  'breakfast': DISH_IMAGES['masala dosa'],
  'desserts': DISH_IMAGES['gulab jamun'],
  'pizza': DISH_IMAGES['margherita pizza'],
  'pasta': DISH_IMAGES['penne arrabbiata'],
  'burgers': DISH_IMAGES['classic cheeseburger'],
  'sides': DISH_IMAGES['loaded fries'],
};

// Representative photo per cuisine, for a restaurant with no menu items yet.
const CUISINE_IMAGES: Record<string, string> = {
  'north indian': DISH_IMAGES['butter chicken'],
  'south indian': DISH_IMAGES['masala dosa'],
  'italian': DISH_IMAGES['margherita pizza'],
  'chinese': DISH_IMAGES['hakka noodles'],
  'american': DISH_IMAGES['classic cheeseburger'],
  'fast food': DISH_IMAGES['classic cheeseburger'],
};

const GENERIC_FOOD = DISH_IMAGES['butter chicken'];

/** Dish-accurate photo for a menu item (exact name, else category, else a generic food photo). */
export function foodImageUrl(item: FoodItem): string {
  return DISH_IMAGES[item.name.trim().toLowerCase()]
    ?? CATEGORY_IMAGES[item.category.trim().toLowerCase()]
    ?? GENERIC_FOOD;
}

/** Thumbnail for a restaurant: its signature (first available) item's photo, else its cuisine's. */
export function restaurantImageUrl(restaurant: Restaurant, items: FoodItem[]): string {
  const signature = items.find(i => i.restaurantId === restaurant.id && i.available)
    ?? items.find(i => i.restaurantId === restaurant.id);
  if (signature) return foodImageUrl(signature);
  return CUISINE_IMAGES[restaurant.cuisineType.trim().toLowerCase()] ?? GENERIC_FOOD;
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
