import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../public');
const modelsDir = path.join(publicDir, 'models');
const jsDir = path.join(publicDir, 'js');

// Create directories if they don't exist
if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });
if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`Already exists: ${path.basename(dest)}`);
      return resolve();
    }
    
    console.log(`Downloading: ${url}...`);
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Saved: ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const models = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

async function main() {
  console.log('Downloading face-api.min.js...');
  await downloadFile(
    'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js',
    path.join(jsDir, 'face-api.min.js')
  );

  console.log('\\nDownloading face-api.js models...');
  for (const model of models) {
    await downloadFile(`${BASE_URL}${model}`, path.join(modelsDir, model));
  }
  
  console.log('\\nAll downloads completed successfully!');
}

main().catch(console.error);
