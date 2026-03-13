import { UploadService } from './upload.service';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    uploadFile(file: Express.Multer.File): {
        url: string;
        filename: string;
        originalname: string;
        mimetype: string;
        size: number;
    };
}
