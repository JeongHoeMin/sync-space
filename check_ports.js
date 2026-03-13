const http = require('http');

function check(url, name) {
    return new Promise((resolve) => {
        const req = http.get(url, (res) => {
            console.log(`✅ ${name} is UP (Status: ${res.statusCode})`);
            resolve(true);
        }).on('error', (e) => {
            console.log(`❌ ${name} is DOWN (${e.message})`);
            resolve(false);
        });
        req.setTimeout(2000, () => {
            console.log(`❌ ${name} TIMEOUT`);
            req.abort();
            resolve(false);
        });
    });
}

async function main() {
    console.log('--- Network Connectivity Check ---');
    await check('http://127.0.0.1:7880', 'LiveKit Server');
    await check('http://localhost:3000', 'Backend Server');
}

main();
