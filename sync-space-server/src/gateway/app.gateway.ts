import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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
import { SessionService } from './session.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private sessionService: SessionService,
    @InjectRepository(Channel) private channelRepo: Repository<Channel>,
    @InjectRepository(ChannelParticipant) private participantRepo: Repository<ChannelParticipant>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  /** Socket.IO Server 초기화 완료 시 SessionService에 레퍼런스 전달 */
  afterInit(server: Server) {
    this.sessionService.setServer(server);
    console.log('[AppGateway] Server initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) throw new Error('Unauthorized');
      
      const payload = this.jwtService.verify(token, { secret: 'super_secret_dev_key' });
      client.data.user = payload; // { sub: id, email }

      // 소켓 등록 (kick은 하지 않음 - 사용자당 소켓 여러 개 가능)
      this.sessionService.registerSocket(payload.email, client.id);
      console.log(`Client connected: ${client.id} (User: ${payload.email})`);
    } catch (e) {
      console.error('Socket connection error:', e.message);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    const user = client.data.user;
    const channelId = client.data.channelId;

    // 세션 맵에서 제거
    if (user?.email) {
      this.sessionService.removeSocket(user.email, client.id);
    }

    if (user && channelId) {
      this.server.to(channelId).emit('user_disconnected', { userId: user.sub, email: user.email });
      console.log(`User ${user.email} disconnected from channel ${channelId}`);

      try {
        await this.participantRepo.delete({ 
          channel: { id: channelId }, 
          user: { id: user.sub } 
        });
      } catch (e) {
        console.error('Failed to remove participant on disconnect:', e.message);
      }
    }
  }

  @SubscribeMessage('join_channel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = client.data.user.sub;
    const channelId = data.channelId;
    
    client.data.channelId = channelId;
    
    const channel = await this.channelRepo.findOne({ where: { id: channelId } });
    if (!channel) return { error: 'Channel not found' };

    const user = await this.userRepo.findOne({ where: { id: userId } });

    const existing = await this.participantRepo.findOne({ where: { channel: { id: channelId }, user: { id: userId } } });
    if (!existing) {
      const participant = this.participantRepo.create({ channel, user });
      await this.participantRepo.save(participant);
    }

    client.join(channelId);
    console.log(`User ${userId} joined channel ${channelId}`);

    this.server.to(channelId).emit('user_joined', { userId, email: client.data.user.email });

    const messages = await this.messageRepo.find({
      where: { channel: { id: channelId } },
      relations: ['sender'],
      order: { created_at: 'ASC' },
      take: 50,
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
    @MessageBody() data: { channelId: string; content: string; type?: MessageType; tempId?: string },
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
      tempId: data.tempId,
    });
  }
}
