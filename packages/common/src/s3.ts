import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

export class S3 {
    private readonly client: S3Client

    constructor(region: string) {
        this.client = new S3Client({ region: region })
    }

    async upload(bucket: string, key: string, body: string, contentType: string, noCache: boolean = false) {
        await this.client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: body,
                // default is application/octet-stream which makes browser to download instead of opening
                ContentType: contentType,
                CacheControl: noCache ? "no-cache" : undefined,
            }),
        )
    }

    async uploadJson(bucket: string, key: string, data: any, noCache: boolean = false) {
        await this.upload(bucket, key, JSON.stringify(data, null, 2), "application/json", noCache)
    }

    async download(bucket: string, key: string) {
        const response = await this.client.send(
            new GetObjectCommand({
                Bucket: bucket,
                Key: key,
            }),
        )
        return (await this.streamToString(response.Body)) as string
    }

    private streamToString(stream: any) {
        return new Promise((resolve, reject) => {
            const chunks: any[] = []
            stream.on("data", (chunk: any) => chunks.push(chunk))
            stream.on("error", reject)
            stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
        })
    }
}
