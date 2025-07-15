import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryDto {
  @ApiProperty({
    description: 'The query message to process',
    minLength: 3,
    maxLength: 250,
    example:
      'How many people in the Engineering department does Company X currently have?',
  })
  @IsString()
  @MinLength(3, {
    message: 'Query must be at least 3 characters long',
  })
  @MaxLength(250, {
    message: 'Query cannot exceed 250 characters',
  })
  @Matches(/^[a-zA-Z0-9\s\[\](),.?!-]+$/, {
    message: 'Query contains invalid characters',
  })
  message: string;
}
