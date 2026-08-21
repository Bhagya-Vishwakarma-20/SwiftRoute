// Concurrent load generator for GET /url/:code. No dependencies.
//
// The app runs with `trust proxy` enabled, so req.ip — and therefore the
// sliding-window rate limiter bucket — comes from X-Forwarded-For. Each
// simulated client sends its own X-Forwarded-For, which is what makes it
// possible to model many users from one machine.
//
// Usage: node loadtest/run.js [--vus 50] [--duration 30] [--ips 50]
//                             [--url http://localhost:3000] [--code <fixed>]

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const args = require('./args');

const opts = args({
    vus: 50,
    duration: 30,
    url: 'http://localhost:3000',
    ips: null,
    code: null
});

const vus = Number(opts.vus);
const durationMs = Number(opts.duration) * 1000;
const ipCount = Number(opts.ips ?? vus);
const target = new URL(opts.url);

const codes = (() => {
    if (opts.code) return [opts.code];

    const file = path.join(__dirname, 'codes.json');
    if (!fs.existsSync(file)) {
        console.error('no codes.json — run `node loadtest/seed.js` first, or pass --code');
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
})();

// keepAlive so we measure the service, not TCP handshakes
const agent = new http.Agent({ keepAlive: true, maxSockets: vus, maxFreeSockets: vus });

const clientIp = (n) => `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}`;

const state = {
    latencies: [],
    status: {},
    errors: {},
    deadline: 0
};

const request = (code, ip) => new Promise((resolve, reject) => {
    const req = http.request({
        agent,
        hostname: target.hostname,
        port: target.port || 80,
        path: `/url/${code}`,
        method: 'GET',
        headers: { 'x-forwarded-for': ip, 'user-agent': 'swiftroute-loadtest' }
    }, (res) => {
        res.resume();
        res.on('end', () => resolve(res.statusCode));
    });

    req.on('error', reject);
    req.end();
});

// rotated per request, not per VU, so --ips is independent of --vus
let ipCursor = 0;

const vu = async () => {
    while (Date.now() < state.deadline) {
        const ip = clientIp(ipCursor++ % ipCount);
        const code = codes[Math.floor(Math.random() * codes.length)];
        const start = performance.now();

        try {
            const status = await request(code, ip);
            state.latencies.push(performance.now() - start);
            state.status[status] = (state.status[status] || 0) + 1;
        } catch (err) {
            const key = err.code || err.message;
            state.errors[key] = (state.errors[key] || 0) + 1;
        }
    }
};

const percentile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

const report = (elapsedMs) => {
    const sorted = state.latencies.sort((a, b) => a - b);
    const total = sorted.length + Object.values(state.errors).reduce((a, b) => a + b, 0);
    const fixed = (n) => n.toFixed(2);

    console.log(`\n${vus} VUs / ${ipCount} client IPs / ${(elapsedMs / 1000).toFixed(1)}s`);
    console.log(`requests  ${total}  (${fixed(total / (elapsedMs / 1000))} req/s)`);

    console.log('\nstatus');
    for (const [code, n] of Object.entries(state.status).sort()) {
        console.log(`  ${code}  ${n}  ${fixed((n / total) * 100)}%`);
    }

    if (Object.keys(state.errors).length) {
        console.log('\nerrors');
        for (const [key, n] of Object.entries(state.errors)) console.log(`  ${key}  ${n}`);
    }

    if (sorted.length) {
        console.log('\nlatency (ms)');
        console.log(`  p50   ${fixed(percentile(sorted, 0.5))}`);
        console.log(`  p90   ${fixed(percentile(sorted, 0.9))}`);
        console.log(`  p95   ${fixed(percentile(sorted, 0.95))}`);
        console.log(`  p99   ${fixed(percentile(sorted, 0.99))}`);
        console.log(`  max   ${fixed(sorted[sorted.length - 1])}`);
    }
};

const run = async () => {
    console.log(`hitting ${target.origin}/url/:code with ${codes.length} code(s)`);

    const start = Date.now();
    state.deadline = start + durationMs;

    let last = 0;
    const tick = setInterval(() => {
        const done = state.latencies.length;
        console.log(`  ${((Date.now() - start) / 1000).toFixed(0)}s  ${done - last} req/s`);
        last = done;
    }, 1000);

    await Promise.all(Array.from({ length: vus }, () => vu()));

    clearInterval(tick);
    report(Date.now() - start);
    agent.destroy();
};

run();
