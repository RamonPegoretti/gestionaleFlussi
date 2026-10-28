import { getAuth } from "@/lib/auth";

async function handler(req: Request) {
  return (await getAuth()).handler(req);
}

export { handler as GET, handler as POST };
