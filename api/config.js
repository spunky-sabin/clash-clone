/**
 * Clash of Clans API Configuration
 * 
 * This file contains the configuration for the Clash of Clans API client.
 * The API key is securely stored here and used to authenticate requests.
 */

const API_CONFIG = {
    // Clash of Clans API Key
    apiKey: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6ImVlYWQxMjc3LWYyY2EtNDcxYy1iYjlkLTc2NzNkNTg5ZTAwMiIsImlhdCI6MTc2ODgwMjY3MSwic3ViIjoiZGV2ZWxvcGVyL2VjNTk2ZDI0LWI0N2YtOTkwNy05MzUzLWZiZWMxMGI3NjgwYiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjEwMy4xOTEuMTMxLjE5NSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.5V9tbuWQG-PYs80yEjr9CLTKtID9qYmtH5TUtsw3iw2tjtiOE8Cevz1wzo-Up9Ny2zm8Gf0U8Re-wGh4bJ5IRg',

    // API Base URL (used by the library internally)
    baseUrl: 'https://api.clashofclans.com/v1',

    // Rate limiting configuration
    rateLimit: {
        requestsPerSecond: 10,
        burstSize: 30
    }
};

module.exports = API_CONFIG;
