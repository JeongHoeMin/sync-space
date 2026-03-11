import { Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';
export declare class LivekitService {
    private channelRepo;
    constructor(channelRepo: Repository<Channel>);
    generateToken(channelId: string, participantIdentity: string): Promise<{
        token: string;
    }>;
}
