import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

export const setupSwaggerDocs = (app: INestApplication) => {
  const config = new DocumentBuilder()
    .setTitle('Test API')
    .setDescription('Test API Description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
};
