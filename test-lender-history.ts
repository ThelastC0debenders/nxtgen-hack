import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:5001/api', withCredentials: true });
async function test() {
  const loginRes = await api.post('/auth/login', { email: 'lendor@gmail.com', password: '0987654321', role: 'LENDER' });
  const cookie = loginRes.headers['set-cookie']?.[0];
  console.log('Login successful. Role:', loginRes.data.role, 'UserId:', loginRes.data.userId);
  try {
    const histRes = await api.get('/invoices/history', { headers: { Cookie: cookie } });
    console.log('History fetched! Data count:', histRes.data.data.length);
    console.log(histRes.data.data);
  } catch (err) {
    console.error('History fetch failed:', err.response?.data || err.message);
  }
}
test();
