// Minimal --key value parser shared by the loadtest scripts.
module.exports = (defaults) => {
    const parsed = { ...defaults };

    for (let i = 2; i < process.argv.length; i += 2) {
        const key = process.argv[i].replace(/^--/, '');
        parsed[key] = process.argv[i + 1];
    }

    return parsed;
};
