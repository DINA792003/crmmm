import { redirect } from "next/navigation";

export default function EditReportRedirectPage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/reports/new?edit=${params.id}`);
}
