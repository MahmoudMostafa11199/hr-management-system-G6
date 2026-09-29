import { Injectable } from '@nestjs/common';
import { unlink } from 'fs/promises';

@Injectable()
export class UploadsService {
  getFileUrl(file: Express.Multer.File): string {
    return file.path.replace(/\\/g, '/');
  }

  async deleteFile(path: string): Promise<void> {
    try {
      await unlink(path);

      //
    } catch (err) {
      console.error(err);
    }
  }
}
