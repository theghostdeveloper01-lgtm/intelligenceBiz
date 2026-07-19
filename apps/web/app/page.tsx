import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/tenant";

export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/inbox" : "/login");
}
