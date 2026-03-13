import { Controller, Post, Body, UseGuards, Request, Get, Param, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Channel } from '../entities/channel.entity';
import { AuthGuard } from '../auth/auth.guard';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
import { Drawing } from '../entities/drawing.entity';

@Controller('channels')
@UseGuards(AuthGuard)
export class ChannelController {
  constructor(
    @InjectRepository(Channel) private channelRepo: Repository<Channel>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Drawing) private drawingRepo: Repository<Drawing>,
  ) {}

  @Post()
  async createChannel(@Request() req, @Body('title') title: string) {
    const user = await this.userRepo.findOne({ where: { id: req.user.sub } });
    if (!user) throw new Error('User not found');

    const channel = this.channelRepo.create({
      title,
      host: user,
      is_active: true,
    });
    
    await this.channelRepo.save(channel);
    return channel;
  }

  @Get()
  async listChannels() {
    return this.channelRepo.find({
      where: { is_active: true },
      relations: ['host'],
      select: ['id', 'title', 'created_at', 'host'],
    });
  }

  @Get(':id')
  async getChannelInfo(@Param('id') id: string) {
    return this.channelRepo.findOne({
      where: { id },
      relations: ['host', 'participants', 'participants.user'],
    });
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') channelId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? parseInt(limit, 10) : 50;
    
    // 기본 조건: 특정 채널
    const whereCondition: any = { channel: { id: channelId } };
    
    // 커서가 지정된 경우 (커서는 이전 메시지의 created_at이 기준이 됨)
    // 혹은 cursor 값을 id로 받아서 해당 id의 생성 시간을 조회 후 필터하는 방법도 있지만,
    // 성능을 위해 프론트에서 커서로 마지막 메시지의 시간(timestamp/ISO 문자열)이나 ID를 넘길 수 있습니다.
    // 여기서는 cursor를 ID로 받아 해당 메시지를 찾고, 그 created_at 기준으로 과거를 조회합니다.
    if (cursor) {
      const cursorMessage = await this.messageRepo.findOne({ where: { id: cursor } });
      if (cursorMessage) {
        whereCondition.created_at = LessThan(cursorMessage.created_at);
      }
    }

    const messages = await this.messageRepo.find({
      where: whereCondition,
      relations: ['sender'],
      order: { created_at: 'DESC' }, // 최신부터 조회
      take: take + 1, // 다음 페이지 유무 확인을 위해 1개 더 조회
    });

    let hasNextPage = false;
    if (messages.length > take) {
      hasNextPage = true;
      messages.pop(); // 초과분 제거
    }

    // 클라이언트 표시를 위해 다시 오름차순(과거->최신)으로 정렬할지, 아니면 프론트가 처리할지 결정
    // 무한스크롤 시 프론트가 이전 대화를 앞에 붙일 것이므로 DESC 그대로 주거나 ASC로 줌.
    // ASC로 정렬해서 응답 (사용자 경험상 아래로 갈수록 최신)
    messages.reverse();

    const nextCursor = hasNextPage && messages.length > 0 ? messages[0].id : null;

    return {
      messages: messages.map(msg => ({
        id: msg.id,
        sender: { id: msg.sender.id, email: msg.sender.email },
        content: msg.content,
        type: msg.message_type,
        created_at: msg.created_at,
      })),
      nextCursor,
      hasNextPage,
    };
  }

  @Get(':id/drawings')
  async getDrawings(@Param('id') channelId: string) {
    const drawing = await this.drawingRepo.findOne({ where: { channel_id: channelId } });
    return drawing ? drawing.history : [];
  }

  @Post(':id/drawings')
  async updateDrawings(@Param('id') channelId: string, @Body('history') history: any[]) {
    let drawing = await this.drawingRepo.findOne({ where: { channel_id: channelId } });
    if (!drawing) {
      drawing = this.drawingRepo.create({ channel_id: channelId, history });
    } else {
      drawing.history = history;
    }
    await this.drawingRepo.save(drawing);
    return { success: true };
  }
}
