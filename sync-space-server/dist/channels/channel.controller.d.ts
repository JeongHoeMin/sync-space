import { Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
export declare class ChannelController {
    private channelRepo;
    private userRepo;
    private messageRepo;
    constructor(channelRepo: Repository<Channel>, userRepo: Repository<User>, messageRepo: Repository<Message>);
    createChannel(req: any, title: string): Promise<Channel>;
    listChannels(): Promise<Channel[]>;
    getChannelInfo(id: string): Promise<Channel>;
    getMessages(channelId: string, cursor?: string, limit?: string): Promise<{
        messages: {
            id: string;
            sender: {
                id: string;
                email: string;
            };
            content: string;
            type: import("../entities/message.entity").MessageType;
            created_at: Date;
        }[];
        nextCursor: string;
        hasNextPage: boolean;
    }>;
}
