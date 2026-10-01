import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { BlocksController } from './blocks.controller';
import { StatsController } from './stats_controller';

@Module({
  controllers: [RequestsController, BlocksController, StatsController],
})
export class AppModule {}
