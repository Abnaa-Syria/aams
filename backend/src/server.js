const http = require('http');
const app = require('./app');
const config = require('./config');
const prisma = require('./config/database');
const { initSocket } = require('./socket');
const fs = require('fs');
const path = require('path');
const { initCronJobs } = require('./cron');

async function main() {
  try {
    if (config.storage.driver === 's3') {
      const { bucket, publicBaseUrl } = config.storage.s3;
      if (!bucket || !publicBaseUrl) {
        throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET and S3_PUBLIC_BASE_URL');
      }
    } else {
      const uploadRoot = path.resolve(__dirname, '..', config.upload.dir);
      if (!fs.existsSync(uploadRoot)) {
        fs.mkdirSync(uploadRoot, { recursive: true });
      }
    }

    await prisma.$connect();
    console.log('Database connected successfully');

    // Create raw HTTP server so Socket.io can share the same port
    const httpServer = http.createServer(app);

    // Attach Socket.io
    initSocket(httpServer);

    // Initialize background automation workers
    initCronJobs();

    httpServer.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Swagger docs: http://localhost:${config.port}/api-docs`);
      console.log(`Socket.io:    ws://localhost:${config.port}`);
      console.log(`Environment:  ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();
