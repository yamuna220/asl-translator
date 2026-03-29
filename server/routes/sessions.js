const { Router } = require('express');
const { body, param } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const { list, create, getOne, update } = require('../controllers/sessionController');

const router = Router();

router.use(authMiddleware);

router.get('/', list);

router.post(
  '/',
  [
    body('type').isIn(['live', 'mock']),
    body('durationSeconds').optional().isNumeric(),
    body('wordsDetected').optional().isNumeric(),
    body('role').optional().isString(),
    body('transcript').optional().isString(),
    body('interviewerText').optional().isString(),
    body('simplifiedText').optional().isString(),
    body('metadata').optional().isObject(),
  ],
  create
);

router.get('/:id', [param('id').isMongoId()], getOne);

router.patch(
  '/:id',
  [
    param('id').isMongoId(),
    body('durationSeconds').optional().isNumeric(),
    body('wordsDetected').optional().isNumeric(),
    body('transcript').optional().isString(),
    body('interviewerText').optional().isString(),
    body('simplifiedText').optional().isString(),
    body('metadata').optional().isObject(),
    body('role').optional().isString(),
  ],
  update
);

module.exports = router;
