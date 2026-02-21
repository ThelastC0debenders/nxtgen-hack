import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5001/api', // Updated from 3000 to 5001 to match backend port
    withCredentials: true, // Send cookies with cross-domain requests
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
