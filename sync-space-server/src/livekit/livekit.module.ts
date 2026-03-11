import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveKitController } from './livekit.controller';
import { LivekitService } from './livekit.service';
import { Channel } from '../entities/channel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Channel])],
  controllers: [LiveKitController],
  providers: [LivekitService],
})
export class LivekitModule {}
