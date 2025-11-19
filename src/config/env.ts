const SERVER_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_VERSION = import.meta.env.VITE_API_VERSION || 'v1';

export const ENV = {
    APP_NAME: import.meta.env.VITE_APP_NAME || 'React Shadcn Template',
    APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
    APP_URL: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    SERVER_URL,
    API_VERSION,
    API_URL: `${SERVER_URL}/api/${API_VERSION}`,
    API_ENDPOINT: `/api/${API_VERSION}`,
};
