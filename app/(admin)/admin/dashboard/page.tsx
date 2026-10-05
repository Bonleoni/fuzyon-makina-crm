import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Dashboard placeholder — içerik sonraki haftalarda gelecek.
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <Card className="max-w-xl bg-white">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Fuzyon Makina İhracat CRM</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600">
            Hoşgeldiniz, Dashboard yakında...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
