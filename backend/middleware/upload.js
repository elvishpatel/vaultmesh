import multer from 'multer';
import env from '../config/env.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    // Block executable files
    const blocked = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll'];
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (blocked.includes(`.${ext}`)) {
      return cb(new Error(`File type .${ext} is not allowed`), false);
    }
    cb(null, true);
  },
});

export default upload;
