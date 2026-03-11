import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { Channel } from '../entities/channel.entity';
import { ChannelParticipant } from '../entities/channel-participant.entity';
import { Message, MessageType } from '../entities/message.entity';
import { User } from '../entities/user.entity';
export declare class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private channelRepo;
    private participantRepo;
    private messageRepo;
    private userRepo;
    server: Server;
    constructor(jwtService: JwtService, channelRepo: Repository<Channel>, participantRepo: Repository<ChannelParticipant>, messageRepo: Repository<Message>, userRepo: Repository<User>);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handleJoinChannel(client: Socket, data: {
        channelId: string;
    }): Promise<{
        error: string;
        success?: undefined;
    } | {
        success: boolean;
        error?: undefined;
    }>;
    handleMessage(client: Socket, data: {
        channelId: string;
        content: string;
        type?: MessageType;
        tempId?: string;
    }): Promise<{
        error: string;
    }>;
}
