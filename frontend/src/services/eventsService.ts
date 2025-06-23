import api from './api';

const getEvents = async () => {
  const response = await api.get('/events');
  return response.data;
};

const getEventById = async (id: string) => {
  const response = await api.get(`/events/${id}`);
  return response.data;
};

const createEvent = async (eventData: any) => {
  const response = await api.post('/events', eventData);
  return response.data;
};

const updateEvent = async (id: string, eventData: any) => {
  const response = await api.put(`/events/${id}`, eventData);
  return response.data;
};

const deleteEvent = async (id: string) => {
  await api.delete(`/events/${id}`);
};

const eventsService = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};

export default eventsService;
