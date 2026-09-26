const db = require('../config/db');

async function listRestaurants(req, res, next) {
  try {
    const { cuisine, q } = req.query;
    const clauses = [];
    const params = [];

    if (cuisine) {
      params.push(cuisine);
      clauses.push(`cuisine ILIKE $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      clauses.push(`name ILIKE $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await db.query(
      `SELECT id, name, description, cuisine, image_url, rating, eta_minutes,
              delivery_fee, min_order, is_open
       FROM restaurants ${where}
       ORDER BY rating DESC, name ASC`,
      params
    );
    res.json({ restaurants: result.rows });
  } catch (err) {
    next(err);
  }
}

async function getRestaurant(req, res, next) {
  try {
    const { id } = req.params;
    const restaurantRes = await db.query('SELECT * FROM restaurants WHERE id = $1', [id]);
    if (!restaurantRes.rows.length) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const categoriesRes = await db.query(
      'SELECT id, name, sort_order FROM menu_categories WHERE restaurant_id = $1 ORDER BY sort_order',
      [id]
    );
    const itemsRes = await db.query(
      `SELECT id, category_id, name, description, price, image_url, is_veg, is_available
       FROM menu_items WHERE restaurant_id = $1 AND is_available = true ORDER BY sort_order`,
      [id]
    );

    const menu = categoriesRes.rows.map((cat) => ({
      ...cat,
      items: itemsRes.rows.filter((item) => item.category_id === cat.id)
    }));

    const uncategorized = itemsRes.rows.filter((item) => !item.category_id);
    if (uncategorized.length) {
      menu.push({ id: null, name: 'More items', items: uncategorized });
    }

    res.json({ restaurant: restaurantRes.rows[0], menu });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRestaurants, getRestaurant };
