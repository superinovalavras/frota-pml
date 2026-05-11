import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface Props {
  titulo: string;
  descricao?: string;
}

export function PagePlaceholder({ titulo, descricao }: Props) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-1">{titulo}</h1>
      {descricao && (
        <p className="text-muted-foreground mb-6">{descricao}</p>
      )}
      <Card>
        <CardContent className="flex items-center gap-4 py-10">
          <Construction className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Tela em construção</p>
            <p className="text-sm text-muted-foreground">
              Esta página será implementada nas próximas etapas da Fase 1.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
