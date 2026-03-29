const { Router } = require('express');
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { simplify, feedback, generateQuestion } = require('../controllers/aiController');

const router = Router();

router.use(authMiddleware);

router.post('/simplify', [body('question').isString().trim().isLength({ min: 1 })], simplify);

router.post(
  '/feedback',
  [
    body('words').isArray({ min: 0 }),
    body('words.*').optional().isString(),
    body('role').optional().isString(),
  ],
  feedback
);

router.post(
  '/generate-question',
  [
    body('role').isString().trim().isLength({ min: 1 }),
    body('difficulty').isString().trim().isLength({ min: 1 }),
  ],
  generateQuestion
);

module.exports = router;
