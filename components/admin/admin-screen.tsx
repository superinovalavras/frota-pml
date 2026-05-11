"use client";

import { useState } from "react";
import { Layers, Users, Building2, ShieldAlert } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { usePerfil } from "@/lib/perfil-context";
import { HierarquiaTab } from "./hierarquia-tab";
import { UsuariosTab } from "./usuarios-tab";
import { OrgaosTab } from "./orgaos-tab";

export function AdminScreen() {
  const { usuario } = usePerfil();
  const [aba, setAba] = useState("hierarquia");

  if (usuario.perfil !== "master") {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex items-center gap-4 py-10">
            <ShieldAlert className="size-8 text-destructive" />
            <div>
              <p className="font-medium">Acesso restrito</p>
              <p className="text-sm text-muted-foreground">
                Esta área é exclusiva do perfil Master.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Administração</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie a hierarquia de funções, os usuários e os órgãos da
          prefeitura.
        </p>
      </div>

      <Tabs value={aba} onValueChange={setAba} className="space-y-6">
        <TabsList className="h-auto p-1 flex-wrap">
          <TabsTrigger value="hierarquia" className="gap-2 px-3 sm:px-4 py-2">
            <Layers className="size-4" />
            <span className="hidden sm:inline">Hierarquia</span>
            <span className="sm:hidden">Hier.</span>
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2 px-3 sm:px-4 py-2">
            <Users className="size-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="orgaos" className="gap-2 px-3 sm:px-4 py-2">
            <Building2 className="size-4" />
            Órgãos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hierarquia">
          <HierarquiaTab />
        </TabsContent>
        <TabsContent value="usuarios">
          <UsuariosTab />
        </TabsContent>
        <TabsContent value="orgaos">
          <OrgaosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
