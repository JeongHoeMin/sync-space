import { User } from './user.entity';
import { ChannelParticipant } from './channel-participant.entity';
import { Message } from './message.entity';
export declare class Channel {
    id: string;
    title: string;
    is_active: boolean;
    created_at: Date;
    host: User;
    participants: ChannelParticipant[];
    messages: Message[];
}
