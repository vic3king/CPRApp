import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

export function QueryDocs() {
  return applyDecorators(
    ApiOperation({ summary: 'Query the database with natural language' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The natural language query',
            example: 'How many people work at cloudinary?',
          },
        },
      },
    }),
    ApiResponse({
      status: 200,
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'The original query message',
          },
          response: {
            type: 'string',
            description: 'The AI generated response',
          },
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: 'Something went wrong',
    }),
  );
}
