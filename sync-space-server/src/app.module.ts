import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UploadModule } from './upload/upload.module';
import { AppGateway } from './gateway/app.gateway';
import { SessionModule } from './gateway/session.module';
import { ChannelController } from './channels/channel.controller';
import { LivekitModule } from './livekit/livekit.module';
import { User } from './entities/user.entity';
import { Channel } from './entities/channel.entity';
import { ChannelParticipant } from './entities/channel-participant.entity';
import { Message } from './entities/message.entity';
import { Drawing } from './entities/drawing.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER || 'syncspace',
      password: process.env.DB_PASS || 'syncspace_password',
      database: process.env.DB_NAME || 'syncspace_dev',
      entities: [User, Channel, ChannelParticipant, Message, Drawing],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Channel, ChannelParticipant, Message, Drawing]),
    AuthModule,
    LivekitModule,
    UploadModule,
    SessionModule,
  ],
  controllers: [AppController, ChannelController],
  providers: [AppService, AppGateway],
})
export class AppModule {}
