import { Channel } from './channel.entity';
import { ChannelParticipant } from './channel-participant.entity';
import { Message } from './message.entity';
export declare class User {
    id: string;
    email: string;
    password_hash: string;
    created_at: Date;
    updated_at: Date;
    hosted_channels: Channel[];
    participations: ChannelParticipant[];
    messages: Message[];
}
