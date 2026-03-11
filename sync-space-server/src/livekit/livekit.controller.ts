import { Controller, Post, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { AuthGuard } from '../auth/auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';

@Controller('livekit')
@UseGuards(AuthGuard)
export class LiveKitController {
  constructor(
    @InjectRepository(Channel) private channelRepo: Repository<Channel>,
  ) {}

  @Post('token')
  async getToken(@Request() req, @Body('channelId') channelId: string) {
    if (!channelId) {
      throw new HttpException('channelId is required', HttpStatus.BAD_REQUEST);
    }

    const channel = await this.channelRepo.findOne({ where: { id: channelId } });
    if (!channel) {
      throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
    }

    const participantIdentity = req.user.email;
    const roomName = channelId;

    // TODO: 환경변수 분리
    const apiKey = 'devkey';
    const apiSecret = 'secret';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    return { token: await at.toJwt() };
  }
}
