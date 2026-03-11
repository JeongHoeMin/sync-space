import { Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';
export declare class LiveKitController {
    private channelRepo;
    constructor(channelRepo: Repository<Channel>);
    getToken(req: any, channelId: string): Promise<{
        token: string;
    }>;
}
