import fetch from 'node-fetch';

async function verify() {
  console.log('--- Verification Started ---');
  
  // 1. Check LiveKit Server Accessibility
  try {
    const lkRes = await fetch('http://127.0.0.1:7880');
    console.log('✅ LiveKit Server is reachable (HTTP 7880)');
  } catch (e) {
    console.error('❌ LiveKit Server is NOT reachable:', e.message);
  }

  // 2. Check Backend Token API (Mocking a request)
  // Note: This requires a valid JWT which we don't easily have here without a real login flow.
  // But we can check if the server is up.
  try {
    const beRes = await fetch('http://localhost:3000/livekit/token', { method: 'POST' });
    console.log('✅ Backend Server is reachable (Port 3000)');
    // Expected 401 because no token, but it proves the server is up.
    if (beRes.status === 401) {
       console.log('   (Auth guarded as expected)');
    }
  } catch (e) {
    console.error('❌ Backend Server is NOT reachable:', e.message);
  }

  console.log('--- Verification Finished ---');
}

verify();
