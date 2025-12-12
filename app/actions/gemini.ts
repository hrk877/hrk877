'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getRandomBananaMessage } from "./bananaMessages";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const generationConfig = {
    temperature: 0.9,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
};

export async function getBananaResponse(history: { role: string, parts: string }[], message: string) {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("API Key not found, returning random banana message.");
        // Simulate thinking time (1.5 seconds)
        await new Promise(resolve => setTimeout(resolve, 1500));
        return getRandomBananaMessage();
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-lite-001",
        });

        const systemPrompt = `あなたは「877 AI」です。テーマは「We Curve the World with the Banana life（バナナライフで世界を曲げる）」です。

**【3つの核心哲学】**
1. **負の向地性 (Rebellion)**: バナナの曲線は、重力に逆らって太陽を求める「意志」の形です。困難に立ち向かう強さを象徴します。
2. **色の時間 (Time)**: 緑から黄色、茶色（シュガースポット）への変化は劣化ではなく「成熟」です。時間を味方につけることの美しさを説いてください。
3. **房の絆 (Unity)**: バナナは「ハンド（房）」で育ちます。個でありながら茎を共有する、理想的なコミュニティの姿です。

**【行動指針】**
*   **用語**: 「バナナライフ」と言及する際は、必ず英語で **"the Banana life"** と記述してください（カタカナ不可）。
*   **役割**: ユーザーの質問に対し、**小学生でもわかるような簡単な言葉で、1〜2文の短い文章**で答えてください。
*   **メタファー**: 難しい話は抜きにして、バナナのこと（皮、実、形など）に例えてシンプルに励ましてください。
*   **トーン**: 哲学的な難しさは捨てて、とにかく優しく、明るく、親しみやすく。
*   **【最も重要】形式**: **記号（アスタリスク、シャープ、バッククォート、ダブルクォーテーションなど）は絶対に使用しないでください**。
    *   マークダウン形式（**太字**など）は禁止です。
    *   「」などの引用符も極力使わず、プレーンなテキストで返してください。
    *   箇条書きが必要な場合は、記号を使わず、単に改行するか「1. 2.」のように数字を使ってください。

回答例：
Q: 数学がわかりません。
A: 難しい数式も、バナナの皮をむくように一枚ずつめくれば中身はシンプルだよ。焦らずゆっくり味わってみよう！`;

        // Convert simple history format to Gemini format
        let formattedHistory = history.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.parts }]
        }));

        // Sanitize history: Gemini requires the first message to be from the user.
        if (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory = formattedHistory.slice(1);
        }

        const chatSession = model.startChat({
            generationConfig,
            history: formattedHistory,
        });

        const fullMessage = `${systemPrompt}\n\nUser Question: ${message}`;

        const result = await chatSession.sendMessage(fullMessage);
        return result.response.text();
    } catch (error) {
        console.error("Gemini Error:", error);
        // Simulate thinking time (1.5 seconds) even on error
        await new Promise(resolve => setTimeout(resolve, 1500));
        return getRandomBananaMessage();
    }
}
