import express from 'express';
import {
  getQueueByEvent,
  updateQueueItemStatus,
  reorderQueueItem,
} from '../controllers/queueController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/event/:eventId', protect, getQueueByEvent);
router.patch('/:id/status', protect, updateQueueItemStatus);
router.patch('/:id/position', protect, reorderQueueItem);

export default router;
