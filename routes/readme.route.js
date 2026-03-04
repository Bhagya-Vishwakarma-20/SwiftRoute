const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const router = express.Router();

const readmePath = path.join(__dirname, '..', 'Readme.md');
const readmeHTML = marked(fs.readFileSync(readmePath, 'utf-8'));

router.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SwiftRoute</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #24292e; }
                pre { background: #f6f8fa; padding: 1rem; border-radius: 6px; overflow-x: auto; }
                code { background: #f6f8fa; padding: 0.2em 0.4em; border-radius: 3px; font-size: 85%; }
                pre code { background: none; padding: 0; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #dfe2e5; padding: 8px 12px; text-align: left; }
                th { background: #f6f8fa; }
                img { max-width: 100%; }
                h1, h2, h3 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
            </style>
        </head>
        <body>${readmeHTML}</body>
        </html>
    `);
});

module.exports = router;
