const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    try {
        // manually read .env.local
        const envPath = path.resolve(__dirname, '.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const apiKeyLine = envFile.split('\n').find(line => line.startsWith('GEMINI_API_KEY='));

        if (!apiKeyLine) {
            console.error("GEMINI_API_KEY not found in .env.local");
            return;
        }

        const apiKey = apiKeyLine.split('=')[1].trim();

        // Use REST API to list models to be sure
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();

        console.log("Available Models:", JSON.stringify(data, null, 2));
        fs.writeFileSync('models_v2.json', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
