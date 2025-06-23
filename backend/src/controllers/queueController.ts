import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// @desc    Get queue for an event
// @route   GET /api/queue/event/:eventId
// @access  Private (Event Staff)
const getQueueByEvent = asyncHandler(async (req: Request, res: Response) => {
  const { eventId } = req.params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Check if user is authorized to view the queue
  const isAuthorized =
    req.user?.role === 'admin' || event.organizerId === req.user?.id || event.artistId === req.user?.id;

  if (!isAuthorized) {
    res.status(403);
    throw new Error('Not authorized to view this queue');
  }

  const queue = await prisma.queue.findMany({
    where: { eventId },
    orderBy: { position: 'asc' },
    include: {
      ticket: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true,
            },
          },
        },
      },
    },
  });

  // Transform the data for easier client consumption
  const formattedQueue = queue.map((item) => ({
    id: item.id,
    eventId: item.eventId,
    ticketId: item.ticketId,
    position: item.position,
    status: item.status,
    checkInTime: item.checkInTime,
    startTime: item.startTime,
    endTime: item.endTime,
    user: {
      id: item.ticket.user.id,
      firstName: item.ticket.user.firstName,
      lastName: item.ticket.user.lastName,
      profileImageUrl: item.ticket.user.profileImageUrl,
    },
  }));

  res.json(formattedQueue);
});

// @desc    Update queue item status
// @route   PATCH /api/queue/:id/status
// @access  Private (Event Staff)
const updateQueueItemStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const queueItem = await prisma.queue.findUnique({
    where: { id },
    include: { event: true },
  });

  if (!queueItem) {
    res.status(404);
    throw new Error('Queue item not found');
  }

  // Check if user is authorized to update the queue
  const isAuthorized =
    req.user?.role === 'admin' ||
    queueItem.event.organizerId === req.user?.id ||
    queueItem.event.artistId === req.user?.id;

  if (!isAuthorized) {
    res.status(403);
    throw new Error('Not authorized to update this queue');
  }

  // Update timestamps based on status
  let updateData: any = { status };

  if (status === 'in_progress') {
    updateData.startTime = new Date();
  } else if (status === 'completed' || status === 'no_show') {
    updateData.endTime = new Date();
  }

  const updatedQueueItem = await prisma.queue.update({
    where: { id },
    data: updateData,
    include: {
      ticket: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true,
            },
          },
        },
      },
    },
  });

  // Format the response
  const formattedQueueItem = {
    id: updatedQueueItem.id,
    eventId: updatedQueueItem.eventId,
    ticketId: updatedQueueItem.ticketId,
    position: updatedQueueItem.position,
    status: updatedQueueItem.status,
    checkInTime: updatedQueueItem.checkInTime,
    startTime: updatedQueueItem.startTime,
    endTime: updatedQueueItem.endTime,
    user: {
      id: updatedQueueItem.ticket.user.id,
      firstName: updatedQueueItem.ticket.user.firstName,
      lastName: updatedQueueItem.ticket.user.lastName,
      profileImageUrl: updatedQueueItem.ticket.user.profileImageUrl,
    },
  };

  // Notify connected clients about the queue update
  req.io.to(`event:${updatedQueueItem.eventId}`).emit('queueUpdated', formattedQueueItem);

  res.json(formattedQueueItem);
});

// @desc    Reorder queue item
// @route   PATCH /api/queue/:id/position
// @access  Private (Event Staff)
const reorderQueueItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { position } = req.body;

  const queueItem = await prisma.queue.findUnique({
    where: { id },
    include: { event: true },
  });

  if (!queueItem) {
    res.status(404);
    throw new Error('Queue item not found');
  }

  // Check if user is authorized to reorder the queue
  const isAuthorized =
    req.user?.role === 'admin' ||
    queueItem.event.organizerId === req.user?.id ||
    queueItem.event.artistId === req.user?.id;

  if (!isAuthorized) {
    res.status(403);
    throw new Error('Not authorized to reorder this queue');
  }

  // Get all queue items for this event
  const allQueueItems = await prisma.queue.findMany({
    where: { eventId: queueItem.eventId },
    orderBy: { position: 'asc' },
  });

  // Calculate new positions
  const newPositions = allQueueItems.map((item) => {
    if (item.id === id) {
      return { id: item.id, position };
    }

    if (item.position === position) {
      return { id: item.id, position: queueItem.position };
    }

    return { id: item.id, position: item.position };
  });

  // Update positions in database
  const updates = newPositions.map((item) =>
    prisma.queue.update({
      where: { id: item.id },
      data: { position: item.position },
    })
  );

  await prisma.$transaction(updates);

  // Get updated queue
  const updatedQueue = await prisma.queue.findMany({
    where: { eventId: queueItem.eventId },
    orderBy: { position: 'asc' },
    include: {
      ticket: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true,
            },
          },
        },
      },
    },
  });

  // Format the response
  const formattedQueue = updatedQueue.map((item) => ({
    id: item.id,
    eventId: item.eventId,
    ticketId: item.ticketId,
    position: item.position,
    status: item.status,
    checkInTime: item.checkInTime,
    startTime: item.startTime,
    endTime: item.endTime,
    user: {
      id: item.ticket.user.id,
      firstName: item.ticket.user.firstName,
      lastName: item.ticket.user.lastName,
      profileImageUrl: item.ticket.user.profileImageUrl,
    },
  }));

  // Notify connected clients about the queue reordering
  req.io.to(`event:${queueItem.eventId}`).emit('queueReordered', formattedQueue);

  res.json(formattedQueue);
});

export { getQueueByEvent, updateQueueItemStatus, reorderQueueItem };
