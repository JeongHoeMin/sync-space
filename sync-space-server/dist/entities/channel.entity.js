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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Channel = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const channel_participant_entity_1 = require("./channel-participant.entity");
const message_entity_1 = require("./message.entity");
let Channel = class Channel {
};
exports.Channel = Channel;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Channel.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Channel.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Channel.prototype, "is_active", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Channel.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.hosted_channels),
    (0, typeorm_1.JoinColumn)({ name: 'host_id' }),
    __metadata("design:type", user_entity_1.User)
], Channel.prototype, "host", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => channel_participant_entity_1.ChannelParticipant, (participant) => participant.channel),
    __metadata("design:type", Array)
], Channel.prototype, "participants", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => message_entity_1.Message, (message) => message.channel),
    __metadata("design:type", Array)
], Channel.prototype, "messages", void 0);
exports.Channel = Channel = __decorate([
    (0, typeorm_1.Entity)('channels')
], Channel);
//# sourceMappingURL=channel.entity.js.map