-- Sample data for local/dev testing
INSERT INTO restaurants (id, name, description, cuisine, image_url, rating, eta_minutes, delivery_fee, min_order) VALUES
 (gen_random_uuid(), 'Basil & Fire', 'Wood-fired pizza and slow-braised Italian classics', 'Italian', '', 4.7, 25, 2.99, 12.00),
 (gen_random_uuid(), 'Golden Wok', 'Fast, fragrant Sichuan and Cantonese favorites', 'Chinese', '', 4.5, 30, 1.99, 10.00),
 (gen_random_uuid(), 'Spice Route', 'Home-style North & South Indian curries', 'Indian', '', 4.8, 35, 2.49, 15.00);

-- Categories + items for the first restaurant
DO $$
DECLARE r_id UUID;
DECLARE c_starters UUID;
DECLARE c_mains UUID;
BEGIN
  SELECT id INTO r_id FROM restaurants WHERE name = 'Basil & Fire';
  INSERT INTO menu_categories (id, restaurant_id, name, sort_order) VALUES (gen_random_uuid(), r_id, 'Starters', 1) RETURNING id INTO c_starters;
  INSERT INTO menu_categories (id, restaurant_id, name, sort_order) VALUES (gen_random_uuid(), r_id, 'Mains', 2) RETURNING id INTO c_mains;

  INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_veg) VALUES
   (r_id, c_starters, 'Bruschetta al Pomodoro', 'Grilled sourdough, vine tomato, basil, garlic', 7.50, true),
   (r_id, c_starters, 'Burrata', 'Creamy burrata, heirloom tomato, basil oil', 10.00, true),
   (r_id, c_mains, 'Margherita Pizza', 'San Marzano tomato, fior di latte, basil', 13.00, true),
   (r_id, c_mains, 'Tagliatelle al Ragu', 'Slow-braised beef ragu, parmesan, egg pasta', 16.50, false);
END $$;
