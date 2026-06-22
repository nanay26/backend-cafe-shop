import type { IncomingMessage, ServerResponse } from 'http';
import { getNestApp } from '../src/app.bootstrap';

let expressHandler: ((req: IncomingMessage, res: ServerResponse) => void) | null =
  null;

async function getExpressHandler() {
  if (!expressHandler) {
    const app = await getNestApp();
    expressHandler = app.getHttpAdapter().getInstance();
  }

  return expressHandler;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const expressApp = await getExpressHandler();
  return expressApp(req, res);
}
