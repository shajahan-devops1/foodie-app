const express = require('express');
const { createOrder, listOrders, getOrder, advanceOrderStatus } = require('../controllers/orderController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/', createOrder);
router.get('/', listOrders);
router.get('/:id', getOrder);
router.post('/:id/advance', advanceOrderStatus);

module.exports = router;
