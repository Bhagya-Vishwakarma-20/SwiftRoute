// Creates short codes to redirect against. POST /url is not rate limited.
// Usage: node loadtest/seed.js [--count 500] [--url http://localhost:3000]

const fs = require('node:fs');
const path = require('node:path');

const args = require('./args');

const { count, url: base } = args({ count: 500, url: 'http://localhost:3000' });

const run = async () => {
    const codes = [];

    for (let i = 0; i < Number(count); i++) {
        const res = await fetch(`${base}/url`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ url: `https://example.com/target/${i}` })
        });

        if (!res.ok) {
            throw new Error(`seed failed at ${i}: ${res.status} ${await res.text()}`);
        }

        const { newUrl } = await res.json();
        codes.push(newUrl.split('/').pop());

        if ((i + 1) % 100 === 0) console.log(`seeded ${i + 1}/${count}`);
    }

    const out = path.join(__dirname, 'codes.json');
    fs.writeFileSync(out, JSON.stringify(codes, null, 2));
    console.log(`wrote ${codes.length} codes to ${out}`);
};

run().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
