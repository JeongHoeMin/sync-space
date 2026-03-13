import { Controller, Post, Body, UseGuards, Request, Headers, Req } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { LivekitService } from './livekit.service';

@Controller('livekit')
@UseGuards(AuthGuard)
export class LiveKitController {
  constructor(private readonly livekitService: LivekitService) {}

  @UseGuards(AuthGuard)
  @Post('token')
  async getToken(@Request() req, @Body('channelId') channelId: string) {
    const participantIdentity = req.user.email;
    const userId = req.user.sub;
    return this.livekitService.generateToken(channelId, participantIdentity, userId);
  }

  @Post('webhook')
  async handleWebhook(@Req() req: any, @Headers('Authorization') authHeader: string) {
    const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    return this.livekitService.processWebhook(bodyString, authHeader);
  }
}
