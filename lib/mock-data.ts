import {
  ActionItem,
  ApplicationItem,
  BellSchedule,
  Category,
  EventItem,
  NewsItem,
  RatingItem,
  ScheduleLesson,
  SchoolClass,
  Teacher
} from "./types";

export const schoolClasses: SchoolClass[] = [
  { id: "5a", name: "5А", teacher: "Иванова Е. А." },
  { id: "6b", name: "6Б", teacher: "Смирнов П. Н." },
  { id: "7v", name: "7В", teacher: "Кузнецова А. И." },
  { id: "8a", name: "8А", teacher: "Орлов Д. С." },
  { id: "9b", name: "9Б", teacher: "Морозова Н. В." },
  { id: "10a", name: "10А", teacher: "Соколова И. Р." },
  { id: "11b", name: "11Б", teacher: "Петров А. Л." }
];

export const teachers: Teacher[] = [
  { id: "ivanova", name: "Иванова Е. А.", subject: "Русский язык" },
  { id: "smirnov", name: "Смирнов П. Н.", subject: "Математика" },
  { id: "kuznetsova", name: "Кузнецова А. И.", subject: "Проектная деятельность" },
  { id: "orlov", name: "Орлов Д. С.", subject: "Информатика" }
];

export const classes = schoolClasses.map((item) => item.name);
export const teacherNames = teachers.map((item) => item.name);
export const days = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница"];

export const categories: Category[] = [
  { id: "school", title: "Школьное событие" },
  { id: "contest", title: "Конкурс" },
  { id: "action", title: "Акция" },
  { id: "sport", title: "Спорт" },
  { id: "media", title: "Медиа" },
  { id: "navigators", title: "Навигаторы детства" },
  { id: "cdi", title: "ЦДИ" }
];

export const news: NewsItem[] = [
  {
    id: "n1",
    slug: "media-marathon-win",
    date: "2026-05-28",
    title: "Команда школы №46 победила в городском медиамарафоне",
    text: "Ученики подготовили серию коротких репортажей о школьных инициативах и получили первое место.",
    className: "8А",
    category: "Медиа",
    tags: ["PRo46", "город", "команда"],
    photo: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
    author: "PRo46",
    status: "published",
    pinned: true,
    favorite: true
  },
  {
    id: "n2",
    slug: "engineering-summer",
    date: "2026-05-27",
    title: "Открыта запись на летнюю инженерную смену",
    text: "В программе робототехника, проектирование, дизайн презентаций и защита командных проектов.",
    className: "7В",
    category: "Конкурс",
    tags: ["заявки", "лето", "инженерия"],
    photo: "https://images.unsplash.com/photo-1581092921461-7d65ca45393a?auto=format&fit=crop&w=1200&q=80",
    author: "Учебная часть",
    status: "published",
    favorite: true
  },
  {
    id: "n3",
    slug: "kind-week",
    date: "2026-05-25",
    title: "Неделя добрых дел стартует в понедельник",
    text: "Классы готовят волонтерские проекты и пополняют общий рейтинг социальной активности.",
    className: "Все",
    category: "Навигаторы детства",
    tags: ["волонтерство", "рейтинг"],
    photo: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80",
    author: "Совет старшеклассников",
    status: "published"
  },
  {
    id: "n4",
    slug: "cdi-ideas",
    date: "2026-05-22",
    title: "ЦДИ собирает идеи для школьных инициатив",
    text: "Центр детских инициатив открывает прием предложений для нового сезона школьных проектов.",
    className: "Все",
    category: "ЦДИ",
    tags: ["инициативы", "самоуправление"],
    photo: "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=1200&q=80",
    author: "ЦДИ",
    status: "published"
  }
];

export const events: EventItem[] = [
  {
    id: "e1",
    slug: "project-festival",
    date: "2026-06-03",
    startDate: "2026-06-03",
    endDate: "2026-06-03",
    time: "14:30",
    title: "Фестиваль проектных идей",
    type: "event",
    category: "Школьное событие",
    place: "Актовый зал",
    description: "Защита учебных проектов и открытая выставка прототипов.",
    participants: "7-10 классы",
    owner: "Кузнецова А. И.",
    status: "planned",
    cover: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    tags: ["проекты", "выставка"],
    acceptApplications: false,
    applicationFields: [],
    applicationButtonText: "Подать заявку"
  },
  {
    id: "e2",
    slug: "school-podcasts",
    date: "2026-06-07",
    startDate: "2026-06-07",
    endDate: "2026-06-07",
    time: "10:00",
    title: "Конкурс школьных подкастов",
    type: "contest",
    category: "Медиа",
    place: "Медиацентр",
    description: "Прием работ до 5 июня, финальная запись проходит очно.",
    participants: "5-11 классы",
    owner: "PRo46",
    status: "active",
    cover: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1200&q=80",
    tags: ["PRo46", "подкасты", "конкурс"],
    acceptApplications: true,
    applicationDeadline: "2026-06-05",
    applicationFields: ["student", "className", "mentor", "nomination", "contact", "workUrl", "comment", "consent"],
    applicationButtonText: "Подать заявку"
  },
  {
    id: "e3",
    slug: "clean-yard",
    date: "2026-06-12",
    startDate: "2026-06-12",
    endDate: "2026-06-12",
    time: "12:00",
    title: "Акция «Чистый двор»",
    type: "action",
    category: "Навигаторы детства",
    place: "Школьный двор",
    description: "Командная экологическая акция с начислением рейтинговых баллов.",
    participants: "Все классы",
    owner: "Совет школы",
    status: "planned",
    cover: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80",
    tags: ["экология", "волонтерство"],
    acceptApplications: true,
    applicationDeadline: "2026-06-10",
    applicationFields: ["student", "className", "mentor", "contact", "comment", "consent"],
    applicationButtonText: "Принять участие"
  }
];

export const actions: ActionItem[] = [
  {
    ...events[1],
    id: "a-podcast",
    deadline: "2026-06-05",
    target: "Команды 5-11 классов"
  },
  {
    ...events[2],
    id: "a-yard",
    deadline: "2026-06-10",
    target: "Классные команды"
  }
];

export const rating: RatingItem[] = [
  { className: "8А", points: 460, place: 1, activity: 94, wins: 8, media: 82, volunteering: 76, comment: "Сильная проектная неделя" },
  { className: "10А", points: 438, place: 2, activity: 87, wins: 7, media: 91, volunteering: 65, comment: "Лидер медиаактивности" },
  { className: "7В", points: 421, place: 3, activity: 85, wins: 6, media: 73, volunteering: 84, comment: "Лучший волонтерский рост" },
  { className: "9Б", points: 390, place: 4, activity: 77, wins: 5, media: 66, volunteering: 71, comment: "Стабильная динамика" }
];

export const lessons: ScheduleLesson[] = days.flatMap((day, dayIndex) =>
  classes.slice(0, 5).flatMap((className, classIndex) =>
    [1, 2, 3, 4, 5, 6].map((number) => ({
      className,
      day,
      number,
      subject: ["Математика", "Русский язык", "История", "Физика", "Английский язык", "Информатика"][
        (number + dayIndex + classIndex) % 6
      ],
      teacher: teacherNames[(number + classIndex) % teacherNames.length],
      room: `${200 + number + classIndex}`
    }))
  )
);

export const bells: BellSchedule[] = [
  { lesson: 1, start: "08:30", end: "09:10", break: "10 мин" },
  { lesson: 2, start: "09:20", end: "10:00", break: "15 мин" },
  { lesson: 3, start: "10:15", end: "10:55", break: "15 мин" },
  { lesson: 4, start: "11:10", end: "11:50", break: "10 мин" },
  { lesson: 5, start: "12:00", end: "12:40", break: "10 мин" },
  { lesson: 6, start: "12:50", end: "13:30", break: "10 мин" }
];

export const applications: ApplicationItem[] = [
  {
    id: "app-1",
    applicationId: "app-1",
    eventId: "e2",
    eventTitle: "Конкурс школьных подкастов",
    eventType: "contest",
    createdAt: "2026-05-29",
    contest: "Конкурс школьных подкастов",
    className: "8А",
    student: "Мария Белова",
    mentor: "Иванова Е. А.",
    nomination: "Интервью",
    contact: "maria@example.com",
    workUrl: "https://example.com/work",
    comment: "Готова финальная версия",
    consent: true,
    status: "new"
  }
];

export const pro46Projects = ["Школьный подкаст", "Фоторепортаж недели", "Видеоафиша событий"];
export const pro46Members = ["фотографы", "репортеры", "копирайтеры", "технари"];
