const express = require('express');
const http = require('http'); // Use http to ping localhost
const https = require('https');
const nodemailer = require('nodemailer');
const rfs = require('rotating-file-stream');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3000; // Use the PORT environment variable or default to 3000

app.get('/', (req, res) => {
    res.send('Server is up and running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startPing(); // Start pinging once the server is up
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.USER,
        pass: process.env.PASSWORD
    }
});

function sendAlert(message) {
    const mailOptions = {
        from: process.env.USER,
        to: process.env.USER,
        subject: 'Ping Failure Alert',
        text: message
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(`Failed to send alert email: ${error.message}`);
        }
    });
}

const logDirectory = path.join(__dirname, 'log');
const logStream = rfs.createStream('ping_failures.log', {
    interval: '1d',
    size: '10M',
    path: logDirectory
});

function logFailure(message) {
    const logMessage = `${new Date().toISOString()} - ${message}\n`;
    logStream.write(logMessage);
}

function pingGraphQLServer() {
    const data = JSON.stringify({
        query: `
            query getAllUsers {
                getAllUsers {
                    userID
                }
            }
        `
    });

    const options = {
        hostname: 'aramco-gql.onrender.com',
        path: '/query',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
            responseBody += chunk;
        });

        res.on('end', () => {
            if (res.statusCode !== 200) {
                const errorMessage = `Ping to GraphQL server failed with status code: ${res.statusCode}`;
                logFailure(errorMessage);
                sendAlert(errorMessage);
            }
        });
    });

    req.on('error', (e) => {
        const errorMessage = `Ping to GraphQL server failed: ${e.message}`;
        logFailure(errorMessage);
        sendAlert(errorMessage);
    });

    req.write(data);
    req.end();
}

function pingSelf() {
    const selfUrl = `localhost:${PORT}`;

    http.get(`http://${selfUrl}`, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
            responseBody += chunk;
        });

        res.on('end', () => {
            if (res.statusCode !== 200) {
                const errorMessage = `Self-ping failed with status code: ${res.statusCode}`;
                logFailure(errorMessage);
                sendAlert(errorMessage);
            }
        });
    }).on('error', (e) => {
        const errorMessage = `Self-ping failed: ${e.message}`;
        logFailure(errorMessage);
        sendAlert(errorMessage);
    });
}

function startPing() {
    setInterval(() => {
        pingGraphQLServer();
        pingSelf();
    }, 60 * 1000);

    console.log('Ping script started.');
}
