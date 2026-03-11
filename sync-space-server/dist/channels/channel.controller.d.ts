import { Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';
import { User } from '../entities/user.entity';
export declare class ChannelController {
    private channelRepo;
    private userRepo;
    constructor(channelRepo: Repository<Channel>, userRepo: Repository<User>);
    createChannel(req: any, title: string): Promise<Channel>;
    listChannels(): Promise<Channel[]>;
    getChannelInfo(id: string): Promise<Channel>;
}
