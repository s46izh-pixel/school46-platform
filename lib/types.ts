export type UserRole = "admin" | "news_editor" | "event_manager" | "class_teacher" | "viewer";

export type NewsStatus = "draft" | "published" | "archived";
export type EventStatus = "planned" | "active" | "finished";
export type ApplicationStatus = "new" | "accepted" | "revision" | "rejected" | "sent";

export type SchoolClass = {
  id: string;
  name: string;
  teacher: string;
};

export type Teacher = {
  id: string;
  name: string;
  subject: string;
};

export type Category = {
  id: string;
  title: string;
};

export type Tag = {
  id: string;
  title: string;
};

export type NewsItem = {
  id: string;
  date: string;
  title: string;
  text: string;
  className: string;
  category: string;
  tags: string[];
  photo: string;
  author: string;
  status: NewsStatus;
  pinned?: boolean;
  favorite?: boolean;
  slug: string;
};

export type EventItem = {
  id: string;
  date: string;
  startDate: string;
  endDate?: string;
  time: string;
  title: string;
  type: "event" | "contest" | "action";
  category: string;
  place: string;
  description: string;
  participants: string;
  owner: string;
  status: EventStatus;
  cover: string;
  tags: string[];
  acceptApplications: boolean;
  applicationDeadline?: string;
  applicationFields: string[];
  applicationButtonText: string;
  link?: string;
  slug: string;
};

export type ActionItem = EventItem & {
  deadline: string;
  target: string;
};

export type RatingItem = {
  className: string;
  points: number;
  place: number;
  activity: number;
  wins: number;
  media: number;
  volunteering: number;
  comment: string;
  fields?: Array<{
    title: string;
    value: string;
  }>;
};

export type RatingSheetColumn = {
  id: string;
  title: string;
  month: string;
};

export type RatingSheetRow = {
  id: string;
  cells: string[];
};

export type RatingSheet = {
  columns: RatingSheetColumn[];
  rows: RatingSheetRow[];
  months: string[];
};

export type ScheduleLesson = {
  className: string;
  day: string;
  number: number;
  subject: string;
  teacher: string;
  room: string;
};

export type BellSchedule = {
  lesson: number;
  start: string;
  end: string;
  break: string;
};

export type ApplicationItem = {
  id: string;
  applicationId: string;
  eventId: string;
  eventTitle: string;
  eventType: EventItem["type"];
  createdAt: string;
  contest: string;
  className: string;
  student: string;
  mentor: string;
  nomination: string;
  contact: string;
  workUrl: string;
  comment: string;
  consent: boolean;
  status: ApplicationStatus;
};

export type UserPreferences = {
  selectedClass: string;
  selectedTeacher: string;
  theme: "light" | "dark";
  design: "silver" | "classic" | "sky" | "mint" | "sakura" | "graphite" | "aurora";
  userName: string;
  groupName: string;
  rtx4k: boolean;
  favoriteSections: string[];
  defaultSchedule: "class" | "teacher";
  cardView: "compact" | "expanded";
  lastSection: string;
};
