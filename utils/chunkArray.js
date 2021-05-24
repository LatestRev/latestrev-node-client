function chunkArray(items, chunkSize) {
    const res = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        res.push(chunk);
    }
    return res;
}

module.exports = chunkArray;
