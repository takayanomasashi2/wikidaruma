import NextAuth from "next-auth";
import { authOptions } from "../authOptions"; // ✅ authOptions を分離したファイルからインポート

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
