"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const app_gateway_1 = require("./gateway/app.gateway");
const channel_controller_1 = require("./channels/channel.controller");
const livekit_controller_1 = require("./livekit/livekit.controller");
const user_entity_1 = require("./entities/user.entity");
const channel_entity_1 = require("./entities/channel.entity");
const channel_participant_entity_1 = require("./entities/channel-participant.entity");
const message_entity_1 = require("./entities/message.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: 'localhost',
                port: 5432,
                username: 'syncspace',
                password: 'syncspace_password',
                database: 'syncspace_dev',
                entities: [user_entity_1.User, channel_entity_1.Channel, channel_participant_entity_1.ChannelParticipant, message_entity_1.Message],
                synchronize: true,
            }),
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, channel_entity_1.Channel, channel_participant_entity_1.ChannelParticipant, message_entity_1.Message]),
            auth_module_1.AuthModule,
        ],
        controllers: [app_controller_1.AppController, channel_controller_1.ChannelController, livekit_controller_1.LiveKitController],
        providers: [app_service_1.AppService, app_gateway_1.AppGateway],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map