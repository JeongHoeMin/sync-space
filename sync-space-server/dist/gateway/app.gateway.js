"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const channel_entity_1 = require("../entities/channel.entity");
const channel_participant_entity_1 = require("../entities/channel-participant.entity");
const message_entity_1 = require("../entities/message.entity");
const user_entity_1 = require("../entities/user.entity");
let AppGateway = class AppGateway {
    constructor(jwtService, channelRepo, participantRepo, messageRepo, userRepo) {
        this.jwtService = jwtService;
        this.channelRepo = channelRepo;
        this.participantRepo = participantRepo;
        this.messageRepo = messageRepo;
        this.userRepo = userRepo;
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
            if (!token)
                throw new Error('Unauthorized');
            const payload = this.jwtService.verify(token, { secret: 'super_secret_dev_key' });
            client.data.user = payload;
            console.log(`Client connected: ${client.id} (User: ${payload.email})`);
        }
        catch (e) {
            console.error('Socket connection error:', e.message);
            client.disconnect();
        }
    }
    async handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
        const user = client.data.user;
        const channelId = client.data.channelId;
        if (user && channelId) {
            this.server.to(channelId).emit('user_disconnected', { userId: user.sub, email: user.email });
            console.log(`User ${user.email} disconnected from channel ${channelId}`);
            try {
                await this.participantRepo.delete({
                    channel: { id: channelId },
                    user: { id: user.sub }
                });
            }
            catch (e) {
                console.error('Failed to remove participant on disconnect:', e.message);
            }
        }
    }
    async handleJoinChannel(client, data) {
        const userId = client.data.user.sub;
        const channelId = data.channelId;
        client.data.channelId = channelId;
        const channel = await this.channelRepo.findOne({ where: { id: channelId } });
        if (!channel)
            return { error: 'Channel not found' };
        const user = await this.userRepo.findOne({ where: { id: userId } });
        const existing = await this.participantRepo.findOne({ where: { channel: { id: channelId }, user: { id: userId } } });
        if (!existing) {
            const participant = this.participantRepo.create({ channel, user });
            await this.participantRepo.save(participant);
        }
        client.join(channelId);
        console.log(`User ${userId} joined channel ${channelId}`);
        this.server.to(channelId).emit('user_joined', { userId, email: client.data.user.email });
        const messages = await this.messageRepo.find({
            where: { channel: { id: channelId } },
            relations: ['sender'],
            order: { created_at: 'ASC' },
            take: 50,
        });
        const historyMessages = messages.map(msg => ({
            id: msg.id,
            sender: { id: msg.sender.id, email: msg.sender.email },
            content: msg.content,
            type: msg.message_type,
            created_at: msg.created_at,
        }));
        client.emit('channel_history', { messages: historyMessages });
        return { success: true };
    }
    async handleMessage(client, data) {
        const userId = client.data.user.sub;
        const user = await this.userRepo.findOne({ where: { id: userId } });
        const channel = await this.channelRepo.findOne({ where: { id: data.channelId } });
        if (!user || !channel)
            return { error: 'Invalid user or channel' };
        const message = this.messageRepo.create({
            channel,
            sender: user,
            content: data.content,
            message_type: data.type || message_entity_1.MessageType.TEXT,
        });
        const savedMessage = await this.messageRepo.save(message);
        this.server.to(data.channelId).emit('receive_message', {
            id: savedMessage.id,
            sender: { id: user.id, email: user.email },
            content: savedMessage.content,
            type: savedMessage.message_type,
            created_at: savedMessage.created_at,
            tempId: data.tempId,
        });
    }
};
exports.AppGateway = AppGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AppGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_channel'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleJoinChannel", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_message'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleMessage", null);
exports.AppGateway = AppGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __param(1, (0, typeorm_1.InjectRepository)(channel_entity_1.Channel)),
    __param(2, (0, typeorm_1.InjectRepository)(channel_participant_entity_1.ChannelParticipant)),
    __param(3, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __param(4, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AppGateway);
//# sourceMappingURL=app.gateway.js.map