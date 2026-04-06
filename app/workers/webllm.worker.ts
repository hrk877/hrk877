import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Hook up an MLCEngine to a web worker
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
