import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function PlaceholderPage({
  title,
  description,
  milestone,
}: {
  title: string
  description: string
  milestone: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">Planned for {milestone}.</p>
      </CardContent>
    </Card>
  )
}
