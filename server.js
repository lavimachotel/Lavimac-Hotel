// Move this file to the client directory for accessibility
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Welcome to Lavimac Royal Hotel Management System');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
