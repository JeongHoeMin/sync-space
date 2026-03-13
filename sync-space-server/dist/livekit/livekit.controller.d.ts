import { LivekitService } from './livekit.service';
export declare class LiveKitController {
    private readonly livekitService;
    constructor(livekitService: LivekitService);
    getToken(req: any, channelId: string): Promise<{
        token: string;
    }>;
    handleWebhook(req: any, authHeader: string): Promise<{
        success: boolean;
    }>;
}
