import { User } from './user.entity';
import { Channel } from './channel.entity';
export declare class ChannelParticipant {
    id: string;
    channel: Channel;
    user: User;
    joined_at: Date;
}
