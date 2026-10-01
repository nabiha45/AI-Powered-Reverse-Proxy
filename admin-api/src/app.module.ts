import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { BlocksController } from './blocks.controller';

@Module({
  controllers: [RequestsController,BlocksController],
})
export class AppModule {}