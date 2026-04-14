import { redirect } from "next/navigation";

/** Static marketing site lives in /public (synced from repo root files in docs/). */
export default function Home() {
  redirect("/index.html");
}
