import { v2 as cloudinary } from 'cloudinary';
import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient} from '@prisma/client/extension';

const prisma=new PrismaClient()

(async function() {
    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
})();

export async function POST(req: NextRequest) {
    const authResult = await auth(); // Ensure to pass the request to auth and await it
    const userId = authResult.userId; // Now you can access userId

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File || null;
        const title=formData.get('title') as string || null;
        const description=formData.get('description') as string || null;
        const originalSize=formData.get('originalSize') as string || null;

        if (!file) {
            return NextResponse.json({ error: "No file" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream({resource_type: "video", folder: "video-upload",transformation: [{quality: "auto", format: "mp4"}] }, (error, result) => {
                if (error) {
                    return reject(error);
                } else {
                    resolve(result);
                }
            });
            uploadStream.end(buffer);
        });
        const video=await prisma.video.create({
            data: {
                title: title,
                description: description,
                publicId: result.public_id,
                originalSize: originalSize,
                compressedSize: result.bytes,
                duration: result.duration,
                userId: userId
            }
        })
        return NextResponse.json({ message: "Image uploaded successfully", userId }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
}