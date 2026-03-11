import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';
import { ChannelParticipant } from '../entities/channel-participant.entity';
import { Message, MessageType } from '../entities/message.entity';
import { User } from '../entities/user.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    @InjectRepository(Channel) private channelRepo: Repository<Channel>,
    @InjectRepository(ChannelParticipant) private participantRepo: Repository<ChannelParticipant>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) throw new Error('Unauthorized');
      
      const payload = this.jwtService.verify(token, { secret: 'super_secret_dev_key' });
      client.data.user = payload; // { sub: id, email }
      console.log(`Client connected: ${client.id} (User: ${payload.email})`);
    } catch (e) {
      console.error('Socket connection error:', e.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // 추가: 퇴장 처리 로직 (DB 참여자 목록 업데이트 등) 필요시 구현
  }

  @SubscribeMessage('join_channel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = client.data.user.sub;
    const channelId = data.channelId;
    
    // 1. 채널 존재 여부 확인
    const channel = await this.channelRepo.findOne({ where: { id: channelId } });
    if (!channel) return { error: 'Channel not found' };

    const user = await this.userRepo.findOne({ where: { id: userId } });

    // 2. 참여자 저장 (중복 체크 생략)
    const existing = await this.participantRepo.findOne({ where: { channel: { id: channelId }, user: { id: userId } } });
    if (!existing) {
      const participant = this.participantRepo.create({ channel, user });
      await this.participantRepo.save(participant);
    }

    // 3. 소켓 룸 입장
    client.join(channelId);
    console.log(`User ${userId} joined channel ${channelId}`);

    // 4. 기존 사용자들에게 입장 알림
    this.server.to(channelId).emit('user_joined', { userId, email: client.data.user.email });

    // 5. 과거 메시지 전송 (최대 50개)
    const messages = await this.messageRepo.find({
      where: { channel: { id: channelId } },
      relations: ['sender'],
      order: { created_at: 'ASC' },
      take: 50, // 필요시 페이징 구현
    });

    const historyMessages = messages.map(msg => ({
      id: msg.id,
      sender: { id: msg.sender.id, email: msg.sender.email },
      content: msg.content,
      type: msg.message_type,
      created_at: msg.created_at,
    }));

    client.emit('channel_history', { messages: historyMessages });

    return { success: true };
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; content: string; type?: MessageType },
  ) {
    const userId = client.data.user.sub;
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const channel = await this.channelRepo.findOne({ where: { id: data.channelId } });

    if (!user || !channel) return { error: 'Invalid user or channel' };

    const message = this.messageRepo.create({
      channel,
      sender: user,
      content: data.content,
      message_type: data.type || MessageType.TEXT,
    });

    const savedMessage = await this.messageRepo.save(message);

    this.server.to(data.channelId).emit('receive_message', {
      id: savedMessage.id,
      sender: { id: user.id, email: user.email },
      content: savedMessage.content,
      type: savedMessage.message_type,
      created_at: savedMessage.created_at,
    });
  }
}
