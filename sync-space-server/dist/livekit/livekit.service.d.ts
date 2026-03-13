import { Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';
import { ChannelParticipant } from '../entities/channel-participant.entity';
import { User } from '../entities/user.entity';
export declare class LivekitService {
    private channelRepo;
    private participantRepo;
    private userRepo;
    constructor(channelRepo: Repository<Channel>, participantRepo: Repository<ChannelParticipant>, userRepo: Repository<User>);
    generateToken(channelId: string, participantIdentity: string, userId: string): Promise<{
        token: string;
    }>;
    processWebhook(bodyString: string, authHeader: string): Promise<{
        success: boolean;
    }>;
}
