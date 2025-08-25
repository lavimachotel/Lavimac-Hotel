const http = require('http');

console.log('Checking if the React application is running...');

// Check React app on port 3000
http.get('http://localhost:3000', (res) => {
  console.log(`React app response status: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    console.log('Success! React application is running.');
  } else {
    console.log(`Error: React application returned status code ${res.statusCode}`);
  }
}).on('error', (err) => {
  console.error('Error connecting to React app:', err.message);
}); 