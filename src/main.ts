import { startLocalServer } from './app.bootstrap';

async function bootstrap() {
  await startLocalServer();
}

void bootstrap();
