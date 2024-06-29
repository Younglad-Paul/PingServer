const https = require('https');
const nodemailer = require('nodemailer');
const rfs = require('rotating-file-stream');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

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
        } else {
            console.log('Alert email sent: ' + info.response);
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

    console.log('Pinging GraphQL server: https://aramco-gql.onrender.com/query'); 

    const req = https.request(options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
            responseBody += chunk;
        });

        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('Ping to GraphQL server successful!', responseBody);
            } else {
                const errorMessage = `Ping to GraphQL server failed with status code: ${res.statusCode}`;
                console.log(errorMessage, responseBody);
                logFailure(errorMessage);
                sendAlert(errorMessage);
            }
        });
    });

    req.on('error', (e) => {
        const errorMessage = `Ping to GraphQL server failed: ${e.message}`;
        console.error(errorMessage);
        logFailure(errorMessage);
        sendAlert(errorMessage);
    });

    req.write(data);
    req.end();
}

function pingSelf() {
    const selfUrl = 'pingserver-httn.onrender.com';
    
    console.log(`Pinging self: https://${selfUrl}`);
    
    https.get(`https://${selfUrl}`, (res) => {
        if (res.statusCode === 200) {
            console.log('Self-ping successful!');
        } else {
            const errorMessage = `Self-ping failed with status code: ${res.statusCode}`;
            console.log(errorMessage);
            logFailure(errorMessage);
            sendAlert(errorMessage);
        }
    }).on('error', (e) => {
        const errorMessage = `Self-ping failed: ${e.message}`;
        console.error(errorMessage);
        logFailure(errorMessage);
        sendAlert(errorMessage);
    });
}

setInterval(() => {
    pingGraphQLServer();
    pingSelf();
}, 60 * 1000);

console.log('Ping script started.');
