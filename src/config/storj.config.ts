import { exec } from "child_process";
import { Readable } from "stream";
import { promisify } from "util";
import { BadRequestException } from "../common/utils/catch-errors";

const execAsync = promisify(exec);

export async function uploadAndGetUrl(
  buffer: Buffer,
  filename: string,
  bucket: string,
  existingPath?: string
): Promise<string> {
  let destinationPath: string;
  
  if (existingPath) {
    // Use existing path to overwrite
    destinationPath = `sj://${bucket}/${existingPath}`;
  } else {
    // Generate unique filename for new uploads
    const fileExt = filename.split('.').pop() || '';
    const uniqueFilename = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 8)}.${fileExt}`.replace(/\s+/g, '-');
    destinationPath = `sj://${bucket}/${uniqueFilename}`;
  }

  const stream = Readable.from(buffer);
  try {
    // Upload to Storj using stdin stream
    await streamToUplinkExec(stream, destinationPath);

    // Generate shareable URL
    const shareCmd = `uplink share --url --not-after=none ${destinationPath}`;
    const { stdout } = await execAsync(shareCmd);

    // Extract URL from uplink output
    const url = stdout
      .split("URL       : ")[1]
      .split("\n")[0]
      .trim()
      .replace("/s/", "/raw/");

    return url;
  } catch (error: any) {
    throw new BadRequestException(`Upload failed: ${error.message}`);
  }
}

async function streamToUplinkExec(
  stream: Readable,
  destination: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const uplinkProcess = exec(
      `uplink cp -p 8 --parallelism-chunk-size 128M - "${destination}"`,
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new BadRequestException(
              `Upload failed: ${error.message}\n${stderr}`
            )
          );
        } else {
          resolve();
        }
      }
    );

    // Pipe stream to process stdin
    if (uplinkProcess.stdin) {
      stream.pipe(uplinkProcess.stdin);
    } else {
      reject(new BadRequestException("Failed to access process stdin"));
    }
  });
}
