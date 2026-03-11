import { User } from './user.entity';
import { Channel } from './channel.entity';
export declare enum MessageType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    FILE = "FILE"
}
export declare class Message {
    id: string;
    message_type: MessageType;
    content: string;
    created_at: Date;
    channel: Channel;
    sender: User;
}
