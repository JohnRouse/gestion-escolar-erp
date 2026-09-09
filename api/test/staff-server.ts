import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { requireStaffTestDatabase } from './staff-fixture';

async function main() {
  requireStaffTestDatabase();
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app
    .getHttpAdapter()
    .get(
      '/__staff_test_isolated',
      (_req: unknown, res: { json: (body: unknown) => void }) => {
        res.json({ database: 'staff_v1_test', port: 33316 });
      },
    );
  await app.listen(33317, '127.0.0.1');
}
void main();
