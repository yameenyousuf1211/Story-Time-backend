const multer = require("multer");
const { S3Client, PutObjectCommand, S3, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const uuid = require("uuid").v4;
const storage = multer.memoryStorage();

function config() {
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
    if (file.mimetype.split("/")[0] === "image") {
      cb(null, true);
    } else {
      cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"), false);
    }
  } catch (e) {
    console.log(e);
    // res.json(error("Server Error", e));
  }
};

// ["image", "jpeg"]

exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2000000, files: 4 },
});

exports.s3Uploadv3 = async (files, base64 = false) => {
  try {
    const s3client = new S3Client(config());
    let keys = [];
    let key = ''
    let buf;
    const params = files.map((file) => {
      if (base64) {
         buf = Buffer.from(file.replace(/^data:image\/\w+;base64,/, ""), 'base64')
      }
      key = `uploads/${uuid()}-${base64 ? '.png' : file.originalname}`;
      return {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: base64 ? buf : file.buffer,
        ContentEncoding: 'base64',
        ContentType: 'image/png'
      };
    });

    await Promise.all(
      params.map((param) => s3client.send(new PutObjectCommand(param)).then((v) => { console.log(v); keys.push(param.Key) }))
    );
    return keys;
  } catch (e) {
    console.log(e);
  }
};

exports.deleteImage = async (images) => {
  try {
    if (images.length != 0 && images[0] == null) return;
    const s3 = new S3Client(config());

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

