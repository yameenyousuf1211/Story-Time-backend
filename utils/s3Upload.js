const multer = require("multer");
const { S3Client, PutObjectCommand, S3, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const uuid = require("uuid").v4;
const storage = multer.memoryStorage();

exports.config = () => {
  return {
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY,
      secretAccessKey: process.env.AWS_SECRET_KEY
    }
  }
};

const fileFilter = (req, file, cb) => {
  try {
    const fileType = file.mimetype.split("/")[0];
    const fileExtension = file.mimetype.split("/")[1];

    // Allow images, videos, and PDFs
    if (fileType === "image" || fileType === "video" || fileExtension === "pdf") {
      cb(null, true);
    } else {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"), false);
    }
  } catch (e) {
    console.log('fileFilter error: ', e);
  }
};


exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 30_000_000, files: 4 },  // 30MB
});

exports.s3Uploadv3 = async (files, base64 = false) => {
  try {
    const s3client = new S3Client(this.config());
    const uploadPromises = [];
    const keys = [];

    files.map((file) => {
      let key;
      let contentType;
      let body;

      if (base64) {
        // Extract MIME type if available, default to image/png for images
        const mimeMatch = file.match(/^data:(image\/\w+|video\/\w+);base64,/);
        contentType = mimeMatch ? mimeMatch[1] : 'image/png';
        body = Buffer.from(file.replace(/^data:image\/\w+;base64,|^data:video\/\w+;base64,/, ""), 'base64');
        key = `uploads/${uuid()}.${contentType.split('/')[1]}`;
      } else {
        // Use the MIME type and buffer directly for non-base64 files
        contentType = file.mimetype;
        body = file.buffer;
        const fileExtension = file.originalname.split('.').pop(); // get file extension
        key = `uploads/${uuid()}.${fileExtension}`;
      }

      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(base64 && { ContentEncoding: 'base64' }),
      };

      const uploadPromise = s3client.send(new PutObjectCommand(params));
      uploadPromises.push(uploadPromise);
      keys.push(key);
    });

    await Promise.all(uploadPromises);

    return keys;
  } catch (e) {
    console.log('Error uploading files:', e);
    throw e;
  }
};


exports.deleteImage = async (images) => {
  try {
    if (images.length != 0 && images[0] == null) return;
    const s3 = new S3Client(this.config());

    const params = images.map((file) => {
      console.log(file);
      return {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: file,
      };
    });

    return await Promise.all(
      params.map((param) => s3.send(new DeleteObjectCommand(param)))
    );
  } catch (e) {
    console.log(e);
  }
};

