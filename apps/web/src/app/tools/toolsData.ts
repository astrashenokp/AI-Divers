import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Compass,
  Globe2,
  MessageSquare,
  NotebookPen,
  PackageCheck,
  Route,
  Search,
  ShoppingBag,
  ShieldCheck,
  Tags,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ToolDomain = "education" | "tourism" | "ecommerce" | "general";

export type ToolItem = {
  name: string;
  description: string;
  requiresConfirmation?: boolean;
  icon: LucideIcon;
};

export type ToolCategory = {
  title: string;
  description: string;
  domain: ToolDomain;
  maxSteps: number;
  icon: LucideIcon;
  tools: ToolItem[];
};

export const toolCategories: ToolCategory[] = [
  {
    title: "Освіта",
    description:
      "Інструменти для навчальних асистентів, пояснень і пошуку знань.",
    domain: "education",
    maxSteps: 10,
    icon: BookOpen,
    tools: [
      {
        name: "course_search",
        description:
          "Шукає навчальні курси за темою, навичкою або рівнем складності.",
        icon: Search,
      },
      {
        name: "course_info",
        description:
          "Повертає детальну інформацію про курс, програму, вимоги й результат навчання.",
        icon: BookOpen,
      },
      {
        name: "save_progress",
        description:
          "Зберігає прогрес студента після уроку, тесту або важливого кроку.",
        requiresConfirmation: true,
        icon: CheckCircle2,
      },
    ],
  },
  {
    title: "Туризм",
    description:
      "Інструменти для маршрутів, подорожей, місць і рекомендацій.",
    domain: "tourism",
    maxSteps: 10,
    icon: Compass,
    tools: [
      {
        name: "hotel_search",
        description:
          "Шукає готелі в місті за датами заїзду, виїзду та кількістю гостей.",
        icon: Compass,
      },
      {
        name: "itinerary_plan",
        description:
          "Складає план подорожі для міста або країни з урахуванням інтересів.",
        icon: Route,
      },
      {
        name: "get_weather",
        description: "Повертає прогноз погоди для міста на кілька днів.",
        icon: Clock3,
      },
    ],
  },
  {
    title: "E-commerce (Продажі)",
    description:
      "Інструменти для товарів, замовлень, продажів і клієнтських запитів.",
    domain: "ecommerce",
    maxSteps: 8,
    icon: ShoppingBag,
    tools: [
      {
        name: "product_search",
        description:
          "Шукає товари в каталозі магазину за назвою, ключовими словами або категорією.",
        icon: Search,
      },
      {
        name: "order_status",
        description:
          "Перевіряє статус, трекінг і очікувану доставку замовлення.",
        icon: PackageCheck,
      },
      {
        name: "check_price",
        description:
          "Перевіряє поточну ціну, знижку і наявність конкретного товару.",
        icon: Tags,
      },
    ],
  },
  {
    title: "Інше",
    description:
      "Загальні інструменти для задач, які не входять в основні категорії.",
    domain: "general",
    maxSteps: 6,
    icon: MessageSquare,
    tools: [
      {
        name: "get_current_time",
        description:
          "Повертає поточну дату й час для потрібного часового поясу.",
        icon: Clock3,
      },
      {
        name: "search_web",
        description:
          "Шукає актуальну інформацію в інтернеті, коли відповідь може змінюватися з часом.",
        icon: Globe2,
      },
      {
        name: "save_note",
        description:
          "Зберігає важливу нотатку або факт для поточної сесії користувача.",
        requiresConfirmation: true,
        icon: NotebookPen,
      },
      {
        name: "http_request",
        description:
          "Виконує запит до зовнішнього публічного API з runtime guardrails.",
        requiresConfirmation: true,
        icon: ShieldCheck,
      },
    ],
  },
];

export function getToolCategory(domain: string) {
  return toolCategories.find((category) => category.domain === domain);
}
