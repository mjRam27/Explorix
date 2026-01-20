const BASE_URL = 'http://192.168.0.34:8000';

export async function sendChat(messages: any[]) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  return res.json();
}
