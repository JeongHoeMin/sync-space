import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveKitController } from './livekit.controller';
import { LivekitService } from './livekit.service';
import { Channel } from '../entities/channel.entity';
import { ChannelParticipant } from '../entities/channel-participant.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Channel, ChannelParticipant, User])],
  controllers: [LiveKitController],
  providers: [LivekitService],
})
export class LivekitModule {}
