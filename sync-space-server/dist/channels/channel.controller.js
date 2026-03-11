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
exports.ChannelController = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const channel_entity_1 = require("../entities/channel.entity");
const auth_guard_1 = require("../auth/auth.guard");
const user_entity_1 = require("../entities/user.entity");
const message_entity_1 = require("../entities/message.entity");
let ChannelController = class ChannelController {
    constructor(channelRepo, userRepo, messageRepo) {
        this.channelRepo = channelRepo;
        this.userRepo = userRepo;
        this.messageRepo = messageRepo;
    }
    async createChannel(req, title) {
        const user = await this.userRepo.findOne({ where: { id: req.user.sub } });
        if (!user)
            throw new Error('User not found');
        const channel = this.channelRepo.create({
            title,
            host: user,
            is_active: true,
        });
        await this.channelRepo.save(channel);
        return channel;
    }
    async listChannels() {
        return this.channelRepo.find({
            where: { is_active: true },
            relations: ['host'],
            select: ['id', 'title', 'created_at', 'host'],
        });
    }
    async getChannelInfo(id) {
        return this.channelRepo.findOne({
            where: { id },
            relations: ['host', 'participants', 'participants.user'],
        });
    }
    async getMessages(channelId, cursor, limit) {
        const take = limit ? parseInt(limit, 10) : 50;
        const whereCondition = { channel: { id: channelId } };
        if (cursor) {
            const cursorMessage = await this.messageRepo.findOne({ where: { id: cursor } });
            if (cursorMessage) {
                whereCondition.created_at = (0, typeorm_2.LessThan)(cursorMessage.created_at);
            }
        }
        const messages = await this.messageRepo.find({
            where: whereCondition,
            relations: ['sender'],
            order: { created_at: 'DESC' },
            take: take + 1,
        });
        let hasNextPage = false;
        if (messages.length > take) {
            hasNextPage = true;
            messages.pop();
        }
        messages.reverse();
        const nextCursor = hasNextPage && messages.length > 0 ? messages[0].id : null;
        return {
            messages: messages.map(msg => ({
                id: msg.id,
                sender: { id: msg.sender.id, email: msg.sender.email },
                content: msg.content,
                type: msg.message_type,
                created_at: msg.created_at,
            })),
            nextCursor,
            hasNextPage,
        };
    }
};
exports.ChannelController = ChannelController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)('title')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ChannelController.prototype, "createChannel", null);
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChannelController.prototype, "listChannels", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChannelController.prototype, "getChannelInfo", null);
__decorate([
    (0, common_1.Get)(':id/messages'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('cursor')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ChannelController.prototype, "getMessages", null);
exports.ChannelController = ChannelController = __decorate([
    (0, common_1.Controller)('channels'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, typeorm_1.InjectRepository)(channel_entity_1.Channel)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(message_entity_1.Message)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ChannelController);
//# sourceMappingURL=channel.controller.js.map