import { redirect } from "next/navigation";

/** Ana sayfa — kullanıcıyı giriş ekranına yönlendirir. */
export default function HomePage() {
  redirect("/login");
}
