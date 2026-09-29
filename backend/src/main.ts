import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const swagger = new DocumentBuilder()
    .setTitle('HR Management System')
    .setDescription(
      'REST API for a role-based HR Management System — attendance tracking, multi-level leave approval (Manager → HR), task management, automated payroll calculation, and real-time notifications. Endpoints are secured via JWT stored in an httpOnly cookie; use the login endpoint below, then authorize automatically for protected routes.',
    )
    .addServer(process.env.SERVER_URL_DOMAIN as string)
    .setVersion('1.0')
    .addCookieAuth('token', { type: 'apiKey', in: 'cookie', name: 'token' })
    .setContact('Mahmoud Mostafa', 'https://mahmoud-elshahat.vercel.app', '')
    .build();
  const documentation = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('swagger', app, documentation);

  await app.listen(process.env.PORT ?? 2215);
}
void bootstrap();
