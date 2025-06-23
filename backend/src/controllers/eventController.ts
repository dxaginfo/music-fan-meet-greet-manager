import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// @desc    Get all events
// @route   GET /api/events
// @access  Public
const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    include: {
      artist: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              profileImageUrl: true,
            },
          },
        },
      },
      organizer: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      eventDate: 'asc',
    },
  });

  res.json(events);
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: {
      artist: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              profileImageUrl: true,
            },
          },
        },
      },
      organizer: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      tickets: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  res.json(event);
});

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Artist, Manager, Admin)
const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    artistId,
    location,
    isVirtual,
    eventDate,
    startTime,
    endTime,
    capacity,
    status,
  } = req.body;

  // Validate input
  if (!title || !description || !artistId || !eventDate || !startTime || !endTime || !capacity) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  // Create event
  const event = await prisma.event.create({
    data: {
      title,
      description,
      artistId,
      organizerId: req.user?.id as string,
      location,
      isVirtual: isVirtual || false,
      eventDate: new Date(eventDate),
      startTime,
      endTime,
      capacity: parseInt(capacity.toString()),
      status: status || 'draft',
    },
  });

  // Notify connected clients about the new event
  req.io.emit('eventCreated', event);

  res.status(201).json(event);
});

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private (Event Owner, Admin)
const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
  });

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Check if user is authorized to update the event
  if (req.user?.role !== 'admin' && event.organizerId !== req.user?.id && event.artistId !== req.user?.id) {
    res.status(403);
    throw new Error('Not authorized to update this event');
  }

  // Update event
  const updatedEvent = await prisma.event.update({
    where: { id: req.params.id },
    data: req.body,
  });

  // Notify connected clients about the updated event
  req.io.to(`event:${updatedEvent.id}`).emit('eventUpdated', updatedEvent);

  res.json(updatedEvent);
});

// @desc    Delete an event
// @route   DELETE /api/events/:id
// @access  Private (Event Owner, Admin)
const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
  });

  if (!event) {
    res.status(404);
    throw new Error('Event not found');
  }

  // Check if user is authorized to delete the event
  if (req.user?.role !== 'admin' && event.organizerId !== req.user?.id) {
    res.status(403);
    throw new Error('Not authorized to delete this event');
  }

  // Delete associated records first (due to foreign key constraints)
  await prisma.$transaction([
    prisma.queue.deleteMany({ where: { eventId: req.params.id } }),
    prisma.ticket.deleteMany({ where: { eventId: req.params.id } }),
    prisma.media.deleteMany({ where: { eventId: req.params.id } }),
    prisma.event.delete({ where: { id: req.params.id } }),
  ]);

  // Notify connected clients about the deleted event
  req.io.emit('eventDeleted', req.params.id);

  res.json({ message: 'Event removed' });
});

export { getEvents, getEventById, createEvent, updateEvent, deleteEvent };
