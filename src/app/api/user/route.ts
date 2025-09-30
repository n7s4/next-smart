import {NextRequest} from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {

    // const {username, password}: { username: string; password: string } =
    //     await request.json();
    const username = "testuser";
    const password = "testpassword";
    if (!username || !password) {
        return new Response(JSON.stringify({error: "No username or password provided"}), {
            status: 400,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
    const user = await prisma.user.create({
        data: {
            username,
            password,
        },
    })
    return new Response(JSON.stringify({user}), {
        status: 201,
        headers: {
            "Content-Type": "application/json",
        },
    });


}