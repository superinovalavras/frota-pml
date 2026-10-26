import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CalendarDays,
  Car,
  IdCard,
  BarChart3,
  Shield,
  Megaphone,
  DoorOpen,
} from "lucide-react";
import type { Perfil } from "@/lib/mock/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  perfis: Perfil[];
}

export const navItems: NavItem[] = [
  {
    href: "/portaria",
    label: "Portaria",
    icon: DoorOpen,
    // Observador: só a portaria (e o Master, para acompanhar/testar).
    perfis: ["master", "portaria"],
  },
  {
    href: "/agenda",
    label: "Agenda",
    icon: Calendar,
    perfis: ["master", "gestor", "servidor", "motorista"],
  },
  {
    href: "/agendamentos",
    label: "Agendamentos",
    icon: CalendarDays,
    perfis: ["master", "gestor", "servidor", "motorista"],
  },
  {
    href: "/veiculos",
    label: "Veículos",
    icon: Car,
    perfis: ["master", "gestor", "servidor"],
  },
  {
    href: "/motoristas",
    label: "Motoristas",
    icon: IdCard,
    perfis: ["master", "gestor"],
  },
  {
    href: "/avisos",
    label: "Avisos",
    icon: Megaphone,
    perfis: ["master", "gestor", "servidor", "motorista"],
  },
  {
    href: "/relatorios",
    label: "Relatórios",
    icon: BarChart3,
    perfis: ["master", "gestor"],
  },
  {
    href: "/admin",
    label: "Administração",
    icon: Shield,
    perfis: ["master"],
  },
];

export function navItemsParaPerfil(perfil: Perfil): NavItem[] {
  return navItems.filter((item) => item.perfis.includes(perfil));
}

/**
 * Rota inicial ("casa") de cada perfil. A portaria é observador e não tem
 * acesso à Agenda — então cai no painel dela. Os demais vão para a Agenda.
 */
export function rotaInicialParaPerfil(perfil: Perfil): string {
  return perfil === "portaria" ? "/portaria" : "/agenda";
}
