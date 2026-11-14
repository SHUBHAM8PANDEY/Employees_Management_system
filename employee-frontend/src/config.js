// CRA proxies same-origin API and Socket.IO requests to the local backend in development.
export const API_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
