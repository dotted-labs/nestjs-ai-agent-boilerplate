import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('NestJS AI Agent API')
    .setDescription('API documentation for the NestJS AI Agent boilerplate')
    .setVersion('1.0')
    .addTag('Agent')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(configService.get('PORT') ?? 3000);
}

bootstrap();
