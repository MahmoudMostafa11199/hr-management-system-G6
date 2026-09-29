import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';

export function multerOptions(folder: string) {
  const path = `./uploads/${folder}`;

  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }

  return {
    storage: diskStorage({
      destination: path,
      filename: (req, file, cb) => {
        const prefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${prefix}-${file.originalname}`);
      },
    }),

    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (allowedMimes.includes(file.mimetype as string)) cb(null, true);
      else cb(new BadRequestException('File type not allowed'), false);
    },

    limits: { fileSize: 1024 * 1024 * 5 },
  };
}
