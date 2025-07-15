import {
  Controller,
  Body,
  Post,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { QueryService } from './query.service';
import { QueryDto } from './query.dto';
import { QueryDocs } from '@common/decorators';

@Controller('query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @QueryDocs()
  @Post()
  async processQuery(@Body() queryDto: QueryDto) {
    try {
      const result = await this.queryService.processQuery(queryDto);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Query processing failed';
      throw new HttpException(
        {
          success: false,
          message: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
