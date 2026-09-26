const express = require('express');
const { listRestaurants, getRestaurant } = require('../controllers/restaurantController');

const router = express.Router();

router.get('/', listRestaurants);
router.get('/:id', getRestaurant);

module.exports = router;
