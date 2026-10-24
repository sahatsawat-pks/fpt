import { redirect } from "next/navigation";

export default function RestrictPage() {
  redirect("/restrict/question-archive");
}
