const fs = require('fs');
const path = require('path');

async function listAllModels() {
    try {
        const envPath = path.resolve(__dirname, '.env.local');
        const envFile = fs.readFileSync(envPath, 'utf8');
        const apiKeyLine = envFile.split('\n').find(line => line.startsWith('GEMINI_API_KEY='));

        if (!apiKeyLine) {
            console.error("GEMINI_API_KEY not found");
            return;
        }

        const apiKey = apiKeyLine.split('=')[1].trim();
        let allModels = [];
        let nextPageToken = null;

        do {
            let url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`;
            if (nextPageToken) {
                url += `&pageToken=${nextPageToken}`;
            }

            const res = await fetch(url);
            const data = await res.json();

            if (data.models) {
                allModels = allModels.concat(data.models);
            }

            nextPageToken = data.nextPageToken;
        } while (nextPageToken);

        console.log(`Found ${allModels.length} models.`);
        const modelNames = allModels.map(m => m.name);
        console.log("Model Names:", JSON.stringify(modelNames, null, 2));
        fs.writeFileSync('models_all.json', JSON.stringify(allModels, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

listAllModels();
