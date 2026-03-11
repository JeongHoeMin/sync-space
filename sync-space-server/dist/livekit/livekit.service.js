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
exports.LivekitService = void 0;
const common_1 = require("@nestjs/common");
const livekit_server_sdk_1 = require("livekit-server-sdk");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const channel_entity_1 = require("../entities/channel.entity");
let LivekitService = class LivekitService {
    constructor(channelRepo) {
        this.channelRepo = channelRepo;
    }
    async generateToken(channelId, participantIdentity) {
        if (!channelId) {
            throw new common_1.HttpException('channelId is required', common_1.HttpStatus.BAD_REQUEST);
        }
        const channel = await this.channelRepo.findOne({ where: { id: channelId } });
        if (!channel) {
            throw new common_1.HttpException('Channel not found', common_1.HttpStatus.NOT_FOUND);
        }
        const roomName = channelId;
        const apiKey = 'devkey';
        const apiSecret = 'secret';
        const at = new livekit_server_sdk_1.AccessToken(apiKey, apiSecret, {
            identity: participantIdentity,
        });
        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
        });
        return { token: await at.toJwt() };
    }
};
exports.LivekitService = LivekitService;
exports.LivekitService = LivekitService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(channel_entity_1.Channel)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], LivekitService);
//# sourceMappingURL=livekit.service.js.map