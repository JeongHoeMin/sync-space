import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';
import { AuthGuard } from '../auth/auth.guard';
import { User } from '../entities/user.entity';

@Controller('channels')
@UseGuards(AuthGuard)
export class ChannelController {
  constructor(
    @InjectRepository(Channel) private channelRepo: Repository<Channel>,
    @InjectRepository(User) private userRepo: Repository<User>,
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
}
