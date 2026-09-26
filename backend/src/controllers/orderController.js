const db = require('../config/db');

const TAX_RATE = 0.0825;
const NEXT_STATUS = {
  placed: 'confirmed',
  confirmed: 'preparing',
  preparing: 'out_for_delivery',
  out_for_delivery: 'delivered'
};

async function createOrder(req, res, next) {
  const client = await db.pool.connect();
  try {
    const { restaurantId, addressId, items, paymentMethod, notes } = req.body;

    if (!restaurantId || !Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'restaurantId and at least one item are required' });
    }

    const restaurantRes = await client.query('SELECT * FROM restaurants WHERE id = $1', [restaurantId]);
    const restaurant = restaurantRes.rows[0];
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const itemIds = items.map((i) => i.menuItemId);
    const menuItemsRes = await client.query(
      'SELECT id, name, price FROM menu_items WHERE id = ANY($1::uuid[]) AND restaurant_id = $2',
      [itemIds, restaurantId]
    );
    const menuById = Object.fromEntries(menuItemsRes.rows.map((m) => [m.id, m]));

    let subtotal = 0;
    const lineItems = items.map((i) => {
      const menuItem = menuById[i.menuItemId];
      if (!menuItem) {
        const err = new Error(`Menu item ${i.menuItemId} is not available at this restaurant`);
        err.status = 400;
        throw err;
      }
      const quantity = Math.max(1, Number(i.quantity) || 1);
      subtotal += Number(menuItem.price) * quantity;
      return { ...menuItem, quantity };
    });

    const deliveryFee = Number(restaurant.delivery_fee);
    const tax = Number((subtotal * TAX_RATE).toFixed(2));
    const total = Number((subtotal + deliveryFee + tax).toFixed(2));

    await client.query('BEGIN');

    const orderRes = await client.query(
      `INSERT INTO orders (user_id, restaurant_id, address_id, subtotal, delivery_fee, tax, total, payment_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.sub, restaurantId, addressId || null, subtotal.toFixed(2), deliveryFee, tax, total, paymentMethod || 'card', notes || null]
    );
    const order = orderRes.rows[0];

    for (const li of lineItems) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, name, price, quantity)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, li.id, li.name, li.price, li.quantity]
      );
    }
    await client.query(
      'INSERT INTO order_status_history (order_id, status) VALUES ($1, $2)',
      [order.id, 'placed']
    );

    await client.query('COMMIT');
    res.status(201).json({ order: { ...order, items: lineItems } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function listOrders(req, res, next) {
  try {
    const result = await db.query(
      `SELECT o.*, r.name AS restaurant_name, r.image_url AS restaurant_image
       FROM orders o JOIN restaurants r ON r.id = o.restaurant_id
       WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
      [req.user.sub]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const { id } = req.params;
    const orderRes = await db.query(
      `SELECT o.*, r.name AS restaurant_name FROM orders o
       JOIN restaurants r ON r.id = o.restaurant_id
       WHERE o.id = $1 AND o.user_id = $2`,
      [id, req.user.sub]
    );
    if (!orderRes.rows.length) return res.status(404).json({ error: 'Order not found' });

    const itemsRes = await db.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    const historyRes = await db.query(
      'SELECT status, created_at FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC',
      [id]
    );

    res.json({ order: orderRes.rows[0], items: itemsRes.rows, history: historyRes.rows });
  } catch (err) {
    next(err);
  }
}

// Demo/ops endpoint to advance an order through its lifecycle (placed -> ... -> delivered).
async function advanceOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const orderRes = await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [id, req.user.sub]);
    const order = orderRes.rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const next_status = NEXT_STATUS[order.status];
    if (!next_status) {
      return res.status(400).json({ error: `Order is already ${order.status}` });
    }

    await db.query('UPDATE orders SET status = $1, updated_at = now() WHERE id = $2', [next_status, id]);
    await db.query('INSERT INTO order_status_history (order_id, status) VALUES ($1, $2)', [id, next_status]);

    res.json({ status: next_status });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, listOrders, getOrder, advanceOrderStatus };
