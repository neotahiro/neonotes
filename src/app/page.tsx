import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function Home() {
  // The middleware already blocks signed-out visitors; this is a second check.
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { name, email, image } = session.user;
  return <AppShell user={{ name: name ?? "You", email: email ?? "", image: image ?? null }} />;
}
