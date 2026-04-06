const { CreateMLCEngine } = require("@mlc-ai/web-llm");

async function test() {
  try {
    const engine = await CreateMLCEngine("gemma-4-E2B-it-q4f16_1-MLC", {
      appConfig: {
        model_list: [
          {
            model_id: "gemma-4-E2B-it-q4f16_1-MLC",
            model: "https://huggingface.co/welcoma/gemma-4-E2B-it-q4f16_1-MLC/resolve/main/",
            model_lib: "https://huggingface.co/welcoma/gemma-4-E2B-it-q4f16_1-MLC/resolve/main/libs/gemma-4-E2B-it-q4f16_1-MLC-webgpu.wasm"
          }
        ]
      }
    });
    console.log("Success");
  } catch (e) {
    console.log("Detailed Error:");
    console.log(e);
    console.log(JSON.stringify(e, Object.getOwnPropertyNames(e)));
  }
}
test();
