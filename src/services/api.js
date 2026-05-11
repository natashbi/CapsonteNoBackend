// This module now delegates to the real backend API.
// All previous localStorage logic has been replaced — data lives in PostgreSQL
// via the wecare-backend Express server (http://localhost:3001).
export { api } from './api-backend.js';
