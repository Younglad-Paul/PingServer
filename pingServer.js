const https = require('https');

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
                console.log(`Ping to GraphQL server failed with status code: ${res.statusCode}`, responseBody);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Ping to GraphQL server failed: ${e.message}`);
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
            console.log(`Self-ping failed with status code: ${res.statusCode}`);
        }
    }).on('error', (e) => {
        console.error(`Self-ping failed: ${e.message}`);
    });
}

setInterval(() => {
    pingGraphQLServer();
    pingSelf();
}, 60 * 1000);

console.log('Ping script started.');
