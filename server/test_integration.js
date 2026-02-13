// Using built-in fetch (Node 18+)

const BASE_URL = 'http://localhost:3000/api';
const EMAIL = `test_${Date.now()}@example.com`;
const PASSWORD = 'password123';

async function runTests() {
    console.log('Starting Integration Tests...');
    let token = '';
    let userId = '';
    let taskId = '';

    // 1. Register
    console.log('\n--- 1. Testing Registration ---');
    try {
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        if (res.status !== 201) {
            const text = await res.text();
            throw new Error(`Registration failed: ${res.status} ${text}`);
        }

        const data = await res.json();
        console.log('✅ Registration SUCCESS:', data);
        token = data.token;
        userId = data.userId;
    } catch (e) {
        console.error('❌ Registration FAILED:', e.message);
        process.exit(1);
    }

    // 2. Login (Optional, since register returns token, but good to test)
    console.log('\n--- 2. Testing Login ---');
    try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        if (!res.ok) throw new Error(`Login failed: ${res.status}`);
        const data = await res.json();
        console.log('✅ Login SUCCESS. Token received.');
        // Update token just in case
        token = data.token;
    } catch (e) {
        console.error('❌ Login FAILED:', e.message);
    }

    // 3. Get Game State
    console.log('\n--- 3. Testing Get Game State ---');
    try {
        const res = await fetch(`${BASE_URL}/game/state`, {
            headers: { 'x-auth-token': token }
        });

        if (!res.ok) throw new Error(`Get State failed: ${res.status}`);
        const data = await res.json();
        console.log('✅ Get State SUCCESS.');
        console.log('   Character:', data.character ? data.character.name : 'MISSING');
        console.log('   Stats:', data.character.stats);
    } catch (e) {
        console.error('❌ Get State FAILED:', e.message);
    }

    // 4. Create Task
    console.log('\n--- 4. Testing Create Task ---');
    try {
        const res = await fetch(`${BASE_URL}/game/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify({
                title: 'Test Integration Task',
                difficulty: 'EASY',
                deadline: new Date(Date.now() + 86400000).toISOString()
            })
        });

        if (res.status !== 201) throw new Error(`Create Task failed: ${res.status}`);
        const data = await res.json();
        console.log('✅ Create Task SUCCESS:', data.id);
        taskId = data.id;
    } catch (e) {
        console.error('❌ Create Task FAILED:', e.message);
    }

    // 5. Complete Task
    console.log('\n--- 5. Testing Complete Task ---');
    if (taskId) {
        try {
            const res = await fetch(`${BASE_URL}/game/tasks/${taskId}/complete`, {
                method: 'POST',
                headers: {
                    'x-auth-token': token
                }
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Complete Task failed: ${res.status} ${text}`);
            }
            const data = await res.json();
            console.log('✅ Complete Task SUCCESS. Rewards:', data.rewards);
        } catch (e) {
            console.error('❌ Complete Task FAILED:', e.message);
        }
    } else {
        console.log('⚠️ Skipping Complete Task (No task created)');
    }

    console.log('\n--- Integration Tests Completed ---');
}

runTests();
