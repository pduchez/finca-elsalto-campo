import { redirect } from "next/navigation";

// La app arranca directo en la pantalla de campo de Emerson.
export default function Home() {
  redirect("/campo");
}
