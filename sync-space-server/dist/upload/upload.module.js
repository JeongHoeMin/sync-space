"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const crypto = require("crypto");
const upload_controller_1 = require("./upload.controller");
const upload_service_1 = require("./upload.service");
let UploadModule = class UploadModule {
};
exports.UploadModule = UploadModule;
exports.UploadModule = UploadModule = __decorate([
    (0, common_1.Module)({
        imports: [
            platform_express_1.MulterModule.register({
                storage: (0, multer_1.diskStorage)({
                    destination: './uploads',
                    filename: (req, file, cb) => {
                        const uniqueSuffix = crypto.randomUUID() + (0, path_1.extname)(file.originalname);
                        cb(null, uniqueSuffix);
                    },
                }),
                limits: {
                    fileSize: 20 * 1024 * 1024,
                },
                fileFilter: (req, file, cb) => {
                    const allowedTypes = [
                        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                        'application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/x-zip'
                    ];
                    if (!allowedTypes.includes(file.mimetype)) {
                        return cb(new common_1.HttpException('지원하지 않는 파일 형식입니다', common_1.HttpStatus.UNSUPPORTED_MEDIA_TYPE), false);
                    }
                    cb(null, true);
                },
            }),
        ],
        controllers: [upload_controller_1.UploadController],
        providers: [upload_service_1.UploadService],
    })
], UploadModule);
//# sourceMappingURL=upload.module.js.map