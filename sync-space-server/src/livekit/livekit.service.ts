import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { AccessToken, WebhookReceiver } from 'livekit-server-sdk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';
import { ChannelParticipant } from '../entities/channel-participant.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class LivekitService {
  constructor(
    @InjectRepository(Channel) private channelRepo: Repository<Channel>,
    @InjectRepository(ChannelParticipant) private participantRepo: Repository<ChannelParticipant>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async generateToken(channelId: string, participantIdentity: string, userId: string) {
    if (!channelId || !userId) {
      throw new HttpException('channelId is required', HttpStatus.BAD_REQUEST);
    }

    const channel = await this.channelRepo.findOne({ 
      where: { id: channelId },
      relations: ['host'] 
    });
    if (!channel) {
      throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
    }

    const roomName = channelId;
    // livekit.yaml에 설정된 키와 반드시 일치해야 함
    const apiKey = 'devkey';
    const apiSecret = 'secret';

    console.log(`[LK_TOKEN] Generating token for Room: ${roomName}, Identity: ${participantIdentity}`);
    console.log(`[LK_TOKEN] Using API Key: ${apiKey} (Hardcoded for dev)`);

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
    });

    const isHost = channel.host && channel.host.id === userId;

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true, // TODO: 추후 일반 참여자/읽기 전용 등 세부 권한 나눌 때 isHost 활용. (우선 모두 publish 가능하도록 유지)
      canSubscribe: true,
      canPublishData: true,
    });

    return { token: await at.toJwt() };
  }

  async processWebhook(bodyString: string, authHeader: string) {
    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
    
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    try {
      const event = await receiver.receive(bodyString, authHeader);
      
      console.log(`LiveKit Webhook Received: ${event.event} for room ${event.room?.name}`);

      if (event.event === 'participant_left') {
        const channelId = event.room?.name;
        const participantIdentity = event.participant?.identity;

        if (channelId && participantIdentity) {
          // identity가 email이므로 user DB 조회가 필요함
          const user = await this.userRepo.findOne({ where: { email: participantIdentity } });
          if (user) {
            await this.participantRepo.delete({
              channel: { id: channelId },
              user: { id: user.id }
            });
            console.log(`Webhook: Removed user ${participantIdentity} from channel ${channelId}`);
          }
        }
      }

      return { success: true };
    } catch (e) {
      console.error('Webhook error:', e);
      throw new HttpException('Invalid webhook signature', HttpStatus.UNAUTHORIZED);
    }
  }
}
