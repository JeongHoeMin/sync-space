import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AppGateway } from './gateway/app.gateway';
import { ChannelController } from './channels/channel.controller';
import { LiveKitController } from './livekit/livekit.controller';
import { User } from './entities/user.entity';
import { Channel } from './entities/channel.entity';
import { ChannelParticipant } from './entities/channel-participant.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'syncspace',
      password: 'syncspace_password',
      database: 'syncspace_dev',
      entities: [User, Channel, ChannelParticipant, Message],
      synchronize: true, // 개발 중 자동 스키마 동기화 (프로덕션에서는 막아야 함)
    }),
    AuthModule,
  ],
  controllers: [AppController, ChannelController, LiveKitController],
  providers: [AppService, AppGateway],
})
export class AppModule {}
