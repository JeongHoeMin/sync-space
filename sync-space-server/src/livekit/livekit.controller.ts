import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { LivekitService } from './livekit.service';

@Controller('livekit')
@UseGuards(AuthGuard)
export class LiveKitController {
  constructor(private readonly livekitService: LivekitService) {}

  @Post('token')
  async getToken(@Request() req, @Body('channelId') channelId: string) {
    const participantIdentity = req.user.email;
    return this.livekitService.generateToken(channelId, participantIdentity);
  }
}
