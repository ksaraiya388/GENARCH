import { redirect } from "next/navigation";

export default function ReportsAliasPage({
  params
}: {
  params: { year: string };
}): JSX.Element {
  redirect(`/updates/${params.year}`);
}
